import json, re, itertools
from collections import defaultdict

d = json.load(open('/app/backend/data/plotto.json'))
chars = [c['designation'] for c in d['characters']]
chmap = {c['designation']: c['description'] for c in d['characters']}
cf = d['conflicts']

# regex to find character symbols
syms_sorted = sorted(chars, key=len, reverse=True)
sym_re = re.compile(r'(?<![\w-])(' + '|'.join(re.escape(s) for s in syms_sorted) + r')(?![\w-])')

STOP = set('a an the of to in on and or but with without for from into is are was were be been being as at by his her he she him them they it its that this which who whom whose not no nor so if then than out up over under after before again once more most other some such only own same too very can will just against upon about'.split())

def summary(c):
    return c['permutations'][0]['description'] if c['permutations'] else ''

info = {}
for c in cf:
    s = summary(c)
    symset = set(sym_re.findall(s))
    toks = set(w for w in re.findall(r"[a-z]+", s.lower()) if w not in STOP and len(w) > 3)
    linked = set()
    for grp in c['lead_ups'] + c['carry_ons']:
        for l in grp['links']:
            linked.add(l['ref'])
    info[c['id']] = dict(id=c['id'], cat=c['category'], sub=c['subcategory'],
                         summary=s, syms=symset, toks=toks, linked=linked)

# candidate generation: index by symbol
by_sym = defaultdict(list)
for cid, v in info.items():
    for sm in v['syms']:
        by_sym[sm].append(cid)

pairs = set()
for sm, ids in by_sym.items():
    if sm in ('A', 'B', 'X'):  # too common to be meaningful alone
        continue
    if len(ids) > 400:
        continue
    for a, b in itertools.combinations(sorted(ids), 2):
        pairs.add((a, b))

scored = []
for a, b in pairs:
    va, vb = info[a], info[b]
    if b in va['linked'] or a in vb['linked']:
        continue  # already connected by Cook
    shared_syms = (va['syms'] & vb['syms']) - {'A', 'B', 'X'}
    if len(shared_syms) < 2:
        continue
    shared_toks = va['toks'] & vb['toks']
    union_toks = va['toks'] | vb['toks']
    jacc = len(shared_toks) / len(union_toks) if union_toks else 0
    if jacc < 0.12:
        continue
    cross = va['cat'] != vb['cat']  # cross-category = more likely "missed"
    score = len(shared_syms) * 3 + jacc * 20 + (2 if cross else 0)
    scored.append((score, a, b, shared_syms, shared_toks, cross))

scored.sort(reverse=True, key=lambda x: x[0])
top = scored[:40]

lines = []
lines.append('# Plotto — Candidate Plot Connections (for review)')
lines.append('')
lines.append('These are **algorithmically suggested** links between numbered conflicts that Cook did '
             '**not** already list as lead-ups/carry-ons of each other. They are ranked candidates for '
             'human review — not authoritative. Method: two conflicts are paired when they share **≥2 '
             'specific character symbols** (generic A/B/X excluded) and have **thematic keyword overlap '
             '(Jaccard ≥ 0.12)**; score = sharedSymbols×3 + overlap×20 + cross-category bonus.')
lines.append('')
lines.append(f'**Total candidates surfaced: {len(top)}** (from {len(scored)} that passed the thresholds).')
lines.append('')
for i, (score, a, b, ss, st, cross) in enumerate(top, 1):
    va, vb = info[a], info[b]
    syms_en = ', '.join(f'{s} ({chmap.get(s, s)})' for s in sorted(ss))
    lines.append(f'### {i}. #{a}  ⇄  #{b}   — score {score:.1f}{"  · cross-category" if cross else ""}')
    lines.append(f'- **#{a}** [{va["cat"]} › {va["sub"]}]: {va["summary"]}')
    lines.append(f'- **#{b}** [{vb["cat"]} › {vb["sub"]}]: {vb["summary"]}')
    lines.append(f'- Shared characters: {syms_en}')
    lines.append(f'- Shared themes: {", ".join(sorted(st)) or "—"}')
    lines.append('')

open('/app/frontend/public/plotto_connections.md', 'w').write('\n'.join(lines))
print('passed thresholds:', len(scored))
print('written top:', len(top))
print('file: /app/frontend/public/plotto_connections.md')
for score, a, b, ss, st, cross in top[:5]:
    print(f'  #{a} <-> #{b}  score={score:.1f} shared={sorted(ss)}')
