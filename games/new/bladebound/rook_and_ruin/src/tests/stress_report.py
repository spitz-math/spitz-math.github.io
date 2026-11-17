import json,sys
f=sys.argv[1] if len(sys.argv)>1 else 'out/stress/batch.log'
n=w=0; bad=0
for l in open(f):
    l=l.strip()
    if not l.startswith('{'):
        if l!='DONE': print('??',l[:300]); bad+=1
        else: print('DONE')
        continue
    j=json.loads(l)
    if 'CRASH' in j: print('CRASH',j); bad+=1; continue
    n+=1; w+=1 if j['win'] else 0
    notes=[x for x in j['notes'] if not x.startswith('reload room')]
    print(j['cfg'].ljust(27),'WIN ' if j['win'] else 'lost',j['room'].ljust(7),str(j['time']).rjust(4)+'s','ls',str(j['lastT']).rjust(3),'score',str(j['score']).rjust(6),'hp',j['hp'].ljust(5),'q',j['an'],j['ok'],'rev',j['rev'],'end',j['endShown'],'rel',j['reloads'],'hits',j['hits'])
    if notes or j['errs']: print('     NOTES',notes,j['errs']); bad+=1
print(n,'runs',w,'wins',bad,'with notes')
