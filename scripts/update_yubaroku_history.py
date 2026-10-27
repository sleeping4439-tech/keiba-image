#!/usr/bin/env python3
"""Fetch race histories for explicitly mapped netkeiba horse IDs.
Runs only when manually dispatched; fails safely without overwriting existing feed.
"""
import json, re, sys, time, os
from urllib.parse import quote
from datetime import datetime, timezone
from pathlib import Path
import requests
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parents[1]
CONFIG=ROOT/'yubaroku'/'horse-sources.json'
OUTPUT=ROOT/'yubaroku'/'race-history.json'
REGISTRY=ROOT/'yubaroku'/'history-targets.json'
COURSES={'札幌','函館','福島','新潟','東京','中山','中京','京都','阪神','小倉','大井','川崎','船橋','浦和','園田','姫路','門別','盛岡','水沢','名古屋','笠松','金沢','高知','佐賀'}
HEADERS={'User-Agent':'Yubaroku personal history updater (contact repository owner; no bulk crawling)','Accept-Language':'ja-JP,ja;q=0.9'}
def clean(s): return re.sub(r'\s+',' ',str(s or '')).strip()
def header(s): return re.sub(r'\s+','',str(s or ''))
def get_html(session, horse_id):
    url=f'https://db.netkeiba.com/horse/result/{horse_id}/'
    response=session.get(url,headers=HEADERS,timeout=25)
    response.raise_for_status()
    response.encoding=response.apparent_encoding or response.encoding
    return response.text
def parse(html):
    soup=BeautifulSoup(html,'html.parser')
    table=soup.select_one('table.db_h_race_results')
    if not table: raise ValueError('Race result table not found (site layout/access may have changed)')
    headers=[header(th.get_text(' ',strip=True)) for th in table.select('thead th')]
    if not headers:
        first=table.find('tr')
        headers=[header(th.get_text(' ',strip=True)) for th in first.find_all(['th','td'])] if first else []
    def col(row,*names):
        for name in names:
            if header(name) in headers:
                index=headers.index(header(name))
                return clean(row[index]) if index<len(row) else ''
        return ''
    races=[]
    body_rows=table.select('tbody tr') or table.select('tr')[1:]
    for tr in body_rows:
        cells=[clean(td.get_text(' ',strip=True)) for td in tr.find_all('td',recursive=False)]
        if not cells:continue
        date=col(cells,'日付')
        match=re.match(r'^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$',date)
        if not match:continue
        date='-'.join([match[1],match[2].zfill(2),match[3].zfill(2)])
        name=col(cells,'レース名')
        if not name:continue
        venue=col(cells,'開催')
        course=next((x for x in sorted(COURSES,key=len,reverse=True) if x in venue),'')
        surface_dist=col(cells,'距離')
        match_dist=re.search(r'(芝|ダ|障)\s*(\d{3,4})',surface_dist)
        surface={'ダ':'ダート','芝':'芝','障':'障害'}.get(match_dist[1],'') if match_dist else ''
        distance=match_dist[2] if match_dist else ''
        races.append(dict(date=date,name=name[:100],course=course,surface=surface,distance=distance,
                          finish=col(cells,'着順'),time=col(cells,'タイム'),
                          last3f=col(cells,'上り','上がり'),positions=col(cells,'通過')))
    if not races:raise ValueError('No valid races parsed; refusing to overwrite data')
    return sorted(races,key=lambda r:r['date'],reverse=True)
def resolve_horse_id(session, name):
    """Resolve an exact horse name via netkeiba search; never guess among multiple IDs."""
    url='https://db.netkeiba.com/?pid=horse_list&word='+quote(name)
    response=session.get(url,headers=HEADERS,timeout=25)
    response.raise_for_status()
    response.encoding=response.apparent_encoding or response.encoding
    soup=BeautifulSoup(response.text,'html.parser')
    candidates=set()
    for a in soup.select('a[href*="/horse/"]'):
        href=a.get('href','')
        match=re.search(r'/horse/(?:result/)?(\d{10})/?',href)
        if match and clean(a.get_text(' ',strip=True))==name:
            candidates.add(match.group(1))
    if len(candidates)!=1:
        raise ValueError(f'Horse search returned {len(candidates)} exact IDs; manual ID confirmation required')
    return next(iter(candidates))

def main():
    config=json.loads(CONFIG.read_text(encoding='utf-8'))
    entries=list(config.get('horses',[]))
    registry=json.loads(REGISTRY.read_text(encoding='utf-8')) if REGISTRY.exists() else {'names':[]}
    saved_names=[clean(x) for x in registry.get('names',[]) if clean(x)]
    raw_names=os.environ.get('YUBAROKU_HORSE_NAMES','')
    requested=[clean(x) for x in re.split(r'[,\n\r、]+',raw_names) if clean(x)]
    known_names={clean(e.get('name')) for e in entries}
    for name in dict.fromkeys(saved_names+requested):
        if name not in known_names:
            entries.append({'name':name})
            known_names.add(name)
    if requested:
        registry['names']=list(dict.fromkeys(saved_names+requested))
        REGISTRY.write_text(json.dumps(registry,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    if not entries: print('No configured horses; nothing to fetch');return
    existing=json.loads(OUTPUT.read_text(encoding='utf-8')) if OUTPUT.exists() else {'schemaVersion':1,'horses':[]}
    by_id={str(h.get('horseId')):h for h in existing.get('horses',[]) if h.get('horseId')}
    existing_by_name={clean(h.get('name')):str(h.get('horseId')) for h in by_id.values()}
    configured={clean(e.get('name')) for e in entries}
    for stored in by_id.values():
        if clean(stored.get('name')) not in configured:
            entries.append({'name':stored.get('name'),'horseId':stored.get('horseId')})
            configured.add(clean(stored.get('name')))
    # Bound each network request, not the number of horses in the user's database.
    # Rotate through the complete list across scheduled runs.
    batch_size=20
    offset=int(os.environ.get('YUBAROKU_BATCH_OFFSET',str((datetime.now(timezone.utc).isocalendar().week-1)*batch_size)) or '0')
    if len(entries)>batch_size:
        print(f'Processing {min(batch_size,len(entries))} of {len(entries)} horses at offset {offset}')
        entries=(entries[offset%len(entries):]+entries[:offset%len(entries)])[:batch_size]
    session=requests.Session()
    failures=[]
    status={clean(x.get('name')):x for x in existing.get('status',[]) if x.get('name')}
    for index,entry in enumerate(entries):
        horse_id=str(entry.get('horseId') or existing_by_name.get(clean(entry.get('name')),'') )
        name=clean(entry.get('name'))
        if not name or (horse_id and not re.fullmatch(r'\d{10}',horse_id)):
            failures.append(f'Invalid mapping: {entry}');continue
        try:
            if not horse_id:
                horse_id=resolve_horse_id(session,name)
                print(f'Resolved {name} to {horse_id}')
            html=get_html(session,horse_id)
            soup=BeautifulSoup(html,'html.parser')
            title=clean(soup.title.get_text(' ',strip=True)) if soup.title else ''
            if name not in title and name not in clean(soup.select_one('h1').get_text(' ',strip=True) if soup.select_one('h1') else ''):
                raise ValueError('Horse name mismatch; refusing to attribute races to wrong horse')
            races=parse(html)
            by_id[horse_id]={'horseId':horse_id,'name':name,'races':races}
            status[name]={'name':name,'state':'ok','raceCount':len(races),'checkedAt':datetime.now(timezone.utc).isoformat()}
            print(f'{name}: {len(races)} races')
        except Exception as exc:
            failures.append(f'{name}: {type(exc).__name__}: {exc}')
            status[name]={'name':name,'state':'error','reason':str(exc)[:160],'checkedAt':datetime.now(timezone.utc).isoformat()}
        if index<len(entries)-1:time.sleep(4)
    if not any(h.get('name') in [e.get('name') for e in entries] for h in by_id.values()):
        raise RuntimeError('No usable history. '+ '; '.join(failures))
    result={'schemaVersion':1,'updatedAt':datetime.now(timezone.utc).isoformat(),'horses':sorted(by_id.values(),key=lambda h:h['name']),'status':sorted(status.values(),key=lambda h:h['name'])}
    OUTPUT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    for error in failures:print('WARNING',error,file=sys.stderr)
    print(f'Completed: {len(entries)-len(failures)} succeeded, {len(failures)} failed; existing successful data was preserved')
if __name__=='__main__':main()
