import json,urllib.request,urllib.error,time,collections
B='http://127.0.0.1:5080/api'
bank={q['id']:q for q in json.load(open('Data/questions.json'))}
def call(p,m='GET',body=None,h=None):
    r=urllib.request.Request(B+p,method=m,data=json.dumps(body).encode() if body is not None else None,headers={'Content-Type':'application/json',**(h or {})})
    try:
        with urllib.request.urlopen(r) as f: return f.status,json.loads(f.read() or 'null')
    except urllib.error.HTTPError as e:
        try: return e.code,json.loads(e.read())
        except: return e.code,None
def play(name,field,level,orbit,acc=1.0,delay=0.0):
    st,r=call('/sessions','POST',dict(name=name,field=field,level=level,orbit=orbit)); assert st==200,(st,r)
    sid=r['sessionId'];q=r['question'];ids=[];n=0;tot=q['total'];res=None
    while True:
        qq=bank[q['id']];ids.append(q['id'])
        assert sorted(q['o'])==sorted(qq['o']) and q['q']==qq['q']
        assert 'a' not in q and 'x' not in q
        right=q['o'].index(qq['o'][qq['a']])
        ch=right if (n%100)/100<acc else (right+1)%4
        if delay: time.sleep(delay)
        st,res=call(f'/sessions/{sid}/answer','POST',dict(index=q['index'],choice=ch)); assert st==200,(st,res)
        assert res['correctChoice']==right
        n+=1
        if res['final']: return ids,res
        q=res['next']
# 1) counts per level
for lv,exp in [(1,12),(2,15),(3,15)]:
    ids,res=play('اختبار','ai',lv,'idn'); assert len(ids)==exp==res['final']['total'],(lv,len(ids)); assert res['final']['correct']==exp
    print('level',lv,'ok',exp,'score',res['final']['score'])
# 2) randomness: 30 participants same cell → how different?
sets=[];orders=set()
for i in range(30):
    st,r=call('/sessions','POST',dict(name=f'p{i}',field='cyber',level=2,orbit='trt')); ids=[r['question']['id']]
    sets.append(frozenset(ids)); 
# first question distribution
cnt=collections.Counter(next(iter(s)) for s in sets); print('first-question variety among 30:',len(cnt))
full=[]
for i in range(8):
    ids,_=play(f'r{i}','ai',2,'jdg'); full.append(ids)
print('distinct sequences of 8:',len({tuple(x) for x in full}),'distinct sets:',len({frozenset(x) for x in full}))
mixsets=[play(f'm{i}','ai',3,'mix')[0] for i in range(4)]
print('mix orbits seen:',sorted({i.split('-')[0] for s in mixsets for i in s}))
# 3) guards
sid=call('/sessions','POST',dict(name='حارس',field='ai',level=1,orbit='pos'))[1]
q=sid['question']; print('bad index',call(f"/sessions/{sid['sessionId']}/answer",'POST',dict(index=5,choice=0))[0])
print('timeout/-1:',call(f"/sessions/{sid['sessionId']}/answer",'POST',dict(index=1,choice=-1))[1]['correct'])
print('replay index1:',call(f"/sessions/{sid['sessionId']}/answer",'POST',dict(index=1,choice=0))[0])
print('unknown sid',call('/sessions/zzz/answer','POST',dict(index=1,choice=0))[0])
for bad in [dict(name='',field='ai',level=1),dict(name='x',field='ai',level=1),dict(name='ok name',field='zzz',level=1),dict(name='ok name',field='ai',level=9),dict(name='ok name',field='ai',level=1,orbit='zz')]:
    print('invalid',call('/sessions','POST',bad)[0],end=' ')
print()
# 4) wrong answers scoring
ids,res=play('نصف','cyber',1,'idn',acc=.5); f=res['final']; print('half',f['correct'],'/',f['total'],f['score'])
print('lb',call('/leaderboard?limit=3')[1])
print('stats',call('/stats')[1])
print('admin no pin',call('/admin/summary')[0],'bad',call('/admin/summary',h={'X-Admin-Pin':'x'})[0])
s=call('/admin/summary',h={'X-Admin-Pin':'2026'})[1]; print({k:s[k] for k in ['rounds','participants','pct','avgScore','poolSize']}); print(s['byOrbit'])
