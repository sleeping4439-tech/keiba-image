"""Collect JRA's published annual result PDFs. No guessed result URLs or values."""
import argparse, concurrent.futures, datetime as dt, hashlib, json, re, subprocess, tempfile, time, unicodedata
from pathlib import Path
from urllib.parse import urljoin
import fitz

TRACKS={'sapporo':'札幌','hakodate':'函館','fukushima':'福島','niigata':'新潟','tokyo':'東京','nakayama':'中山','chukyo':'中京','kyoto':'京都','hanshin':'阪神','kokura':'小倉'}
PARSER_VERSION=8
HEADER=re.compile(r'\d{5}(\d{1,2})月(\d{1,2})日.{0,15}?\(([^)]+)\)第(\d+)日第(\d+)競走')

def parse_pdf(content,source,expected_year,expected_track):
    with fitz.open(stream=content,filetype='pdf') as doc:
        text='\n'.join(page.get_text() for page in doc)
    text=re.sub(r'\s+','',unicodedata.normalize('NFKC',text))
    matches=list(HEADER.finditer(text)); races=[]; issues=[]
    if not matches: raise ValueError('race_headers_not_found')
    date=None; seen=set()
    for i,m in enumerate(matches):
        month,day,identity,meeting_day,number=m.groups()
        modern=re.fullmatch(r'(\d{4})年(\d+)('+ '|'.join(TRACKS.values())+r')',identity)
        era=re.fullmatch(r'(\d+)('+ '|'.join(TRACKS.values())+r')(\d+)',identity)
        if modern: year,meeting,track=modern.groups()
        elif era:
            era_year,track,meeting=era.groups();year=str(2018+int(era_year))
        else: raise ValueError('unrecognized_meeting_identity: '+identity)
        date=dt.date(int(year),int(month),int(day)).isoformat()
        if int(year)!=expected_year or track!=expected_track: raise ValueError('source_identity_mismatch')
        if number in seen: raise ValueError('duplicate_race_number')
        seen.add(number)
        section=text[m.end():matches[i+1].start() if i+1<len(matches) else len(text)]
        heading=section.split('本賞')[0]
        # Flat turf only: jumping races can also mention turf.
        if re.search(r'障害|ジャンプ|J・G',heading) or not re.search(r'\(芝[・･、,)]',heading): continue
        distance=re.search(r'([1-4],[0-9]{3})',heading)
        if not distance: issues.append({'number':int(number),'error':'distance_not_found'});continue
        distance=int(distance[1].replace(',',''))
        # Class eligibility comes before "除未勝利馬" conditions in higher classes.
        if '新馬' in heading: race_class='newcomer'
        elif re.search(r'3勝クラス|1600万(?:円)?以下',heading): race_class='3win'
        elif re.search(r'2勝クラス|1000万(?:円)?以下',heading): race_class='2win'
        elif re.search(r'1勝クラス|500万(?:円)?以下',heading): race_class='1win'
        elif re.search(r'オープン|\((?:GI{1,3}|L)\)|除未出走馬および未勝利馬|除未出走馬及び未勝利馬',heading): race_class='open'
        elif '未勝利' in heading: race_class='maiden'
        # Official eligibility specifies age only, without a wins/earnings restriction.
        elif re.search(r'[234]歳(?:以上)?[,;]',heading) and '負担重量' in heading: race_class='open'
        else: issues.append({'number':int(number),'error':'class_not_found','heading':heading[:180]});continue
        lap=re.search(r'ハロンタイム((?:\d{1,2}\.\d[―ー−–－-])+\d{1,2}\.\d)',section)
        if not lap: issues.append({'number':int(number),'error':'official_laps_not_found'});continue
        laps=[float(x) for x in re.findall(r'\d{1,2}\.\d',lap[1])]
        if len(laps)!=(distance+199)//200 or any(x<5 or x>30 for x in laps):
            issues.append({'number':int(number),'error':'invalid_lap_count'});continue
        winning=round(sum(laps),1)
        # Verify the measured lap total appears as a finish time, not just a course record.
        results=section.split('売得金')[0].split('中央レコード')[-1]
        finish_times=re.findall(r'\d:[0-5]\d\.\d' if winning>=60 else r'\d{2}\.\d',results)
        record_count=2+int('レースレコード' in results[:80])+int('参考記録' in results[:80])-results[:80].count('なし')
        winner_text=finish_times[record_count] if len(finish_times)>record_count else ''
        parts=winner_text.split(':')
        official_winner=(int(parts[0])*60+float(parts[1])) if len(parts)==2 else float(parts[0] or 0)
        verified=abs(official_winner-winning)<0.01
        if not verified:
            issues.append({'number':int(number),'error':'winning_time_not_verified','lapTotal':winning});continue
        final=re.search(r'上り(?:4F\d{2}\.\d[―ー−–－-])?3F(\d{2}\.\d)',section[lap.end():])
        last3f=float(final[1]) if final else None
        if last3f is not None and not 25<=last3f<=60: last3f=None
        if last3f is None: issues.append({'number':int(number),'error':'official_last3f_not_found'})
        races.append({'date':date,'track':track,'number':int(number),'surface':'芝','distance':distance,'raceClass':race_class,'winningSeconds':winning,'last3f':last3f,'sourceUrl':source})
    # Only use reviewed transcriptions for the exact PDF bytes inspected.
    reviewed_path=Path(__file__).with_name('historical-reviewed-records.json')
    reviewed=json.loads(reviewed_path.read_text()) if reviewed_path.exists() else []
    for correction in reviewed:
        if correction['sourceUrl']!=source: continue
        if correction['sha256']!=hashlib.sha256(content).hexdigest():
            issues.append({'error':'reviewed_source_changed'});continue
        for race in correction['races']:
            if str(race['number']) not in seen:
                if race['track']!=expected_track or not race['date'].startswith(str(expected_year)):raise ValueError('reviewed_identity_mismatch')
                races.append({**race,'sourcePage':correction['sourcePage'],'extraction':'visually_verified_pdf'})
                seen.add(str(race['number']))
    cancelled=set(re.findall(r'競走の中止第(\d+)競走',text))
    if len(seen|cancelled)!=12: issues.append({'error':'race_header_count','count':len(seen),'cancelled':sorted(cancelled)})
    return {'sourceUrl':source,'date':date,'track':expected_track,'raceHeaders':len(seen),'cancelledRaces':sorted(int(x) for x in cancelled),'races':races,'issues':issues,'sha256':hashlib.sha256(content).hexdigest()}

def download(url,path):
    p=subprocess.run(['curl','--fail','--silent','--show-error','--location','--max-time','45','--retry','2','--retry-delay','2',url,'-o',str(path)],capture_output=True,text=True)
    if p.returncode: raise RuntimeError('download_failed: '+p.stderr.strip()[-180:])
    return path.read_bytes()

def build(year,out,cache,limit=0):
    cache.mkdir(parents=True,exist_ok=True);out.mkdir(parents=True,exist_ok=True)
    index=f'https://www.jra.go.jp/datafile/seiseki/report/{year}.html'
    raw=download(index,cache/f'{year}.html')
    html=raw.decode('utf-8' if b'charset="utf-8"' in raw.lower() else 'cp932',errors='replace')
    paths=sorted(set(re.findall(r'href=[\"\']([^\"\']+/'+str(year)+r'-\d+[a-z]+\d+\.pdf)[\"\']',html)))
    if not paths: raise RuntimeError('annual_index_has_no_pdf_links')
    targets=[]
    for path in paths:
        slug=re.search(r'-\d+([a-z]+)\d+\.pdf',path)[1]
        if slug in TRACKS: targets.append((urljoin(index,path),TRACKS[slug]))
    if limit: targets=targets[:limit]
    previous_path=out/f'{year}.json'; previous={}
    if previous_path.exists():
        data=json.loads(previous_path.read_text())
        if data.get('parserVersion')==PARSER_VERSION:
            previous={x['sourceUrl']:x for x in data.get('documents',[]) if not x.get('error') and not x.get('issues')}
    def one(item):
        url,track=item
        if url in previous:return previous[url]
        dest=cache/url.rsplit('/',1)[-1]
        try:
            body=dest.read_bytes() if dest.exists() else download(url,dest)
            return parse_pdf(body,url,year,track)
        except Exception as e:return {'sourceUrl':url,'track':track,'error':str(e)}
    documents=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for i,doc in enumerate(pool.map(one,targets),1):
            documents.append(doc)
            if i%20==0:print(year,i,'/',len(targets),'PDFs',flush=True)
    data={'schemaVersion':1,'parserVersion':PARSER_VERSION,'year':year,'sourceIndex':index,'updatedAt':dt.datetime.now(dt.timezone.utc).isoformat(),'indexComplete':not limit,'expectedDocuments':len(paths),'documents':documents}
    previous_path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n')
    errors=[d for d in documents if d.get('error') or d.get('issues')]
    print(json.dumps({'year':year,'documents':len(documents),'races':sum(len(d.get('races',[])) for d in documents),'issues':len(errors),'examples':errors[:2]},ensure_ascii=False)[:4000],flush=True)
    if not any(d.get('races') for d in documents):raise RuntimeError('no_verified_turf_results')

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--year',type=int,required=True);p.add_argument('--out',type=Path,default=Path('data/historical'));p.add_argument('--cache',type=Path,default=Path('/tmp/jra-historical-pdfs'));p.add_argument('--limit',type=int,default=0);a=p.parse_args();build(a.year,a.out,a.cache,a.limit)
