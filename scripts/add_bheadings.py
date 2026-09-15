import re, json
from collections import OrderedDict

txt = open('/tmp/plotto/plotto.txt', encoding='utf-8', errors='ignore').read()

grp_re = re.compile(r'^ConflictGroup\{(.+)\}$')
sub_re = re.compile(r'^ConflictSubGroup\{(.+)\}$')
b_re = re.compile(r'^B\{(\d+)\}\s+(.*)$')
c_re = re.compile(r'^Conflict\{(\d+)\}$')

cur = {'group': None, 'sub': None, 'bnum': None, 'bhead': None}
base_map = {}  # base conflict number (str) -> {b_number, b_heading}
for line in txt.splitlines():
    s = line.strip()
    m = grp_re.match(s)
    if m: cur['group'] = m.group(1).strip(); continue
    m = sub_re.match(s)
    if m: cur['sub'] = m.group(1).strip(); continue
    m = b_re.match(s)
    if m: cur['bnum'] = int(m.group(1)); cur['bhead'] = m.group(2).strip(); continue
    m = c_re.match(s)
    if m:
        base_map[m.group(1)] = {'b_number': cur['bnum'], 'b_heading': cur['bhead']}

d = json.load(open('/app/backend/data/plotto.json'))

def base_of(cid):
    m = re.match(r'^(\d+)', cid)
    return m.group(1) if m else cid

covered = 0
for c in d['conflicts']:
    mp = base_map.get(base_of(c['id']))
    if mp and mp['b_heading']:
        c['b_number'] = mp['b_number']
        c['b_heading'] = mp['b_heading']
        covered += 1
    else:
        c.pop('b_number', None)
        c['b_heading'] = None

print('conflicts:', len(d['conflicts']), 'covered:', covered, 'missing:', len(d['conflicts']) - covered)

tree = OrderedDict()
for c in d['conflicts']:
    tree.setdefault(c['category'], OrderedDict()).setdefault(c['subcategory'], OrderedDict()).setdefault(c.get('b_heading') or '(General)', 0)
    tree[c['category']][c['subcategory']][c.get('b_heading') or '(General)'] += 1

leaves = sum(len(bhs) for subs in tree.values() for bhs in subs.values())
print('B-heading leaves:', leaves)
print('--- Enterprise > Personal Limitations ---')
for bh, n in list(tree['Enterprise']['Personal Limitations'].items()):
    print(f'   {n:3}  {bh}')

json.dump(d, open('/app/backend/data/plotto.json', 'w'), ensure_ascii=False)
print('SAVED')
