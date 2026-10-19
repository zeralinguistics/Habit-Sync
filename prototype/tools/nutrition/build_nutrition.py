#!/usr/bin/env python3
"""Builds prototype/js/nutri-data.js (every food's nutrients per 100 g) and tools/nutrition/REPORT.md from
IFCT 2017 plus the recipes in recipes.py.

  python3 -I build_nutrition.py --ifct <folder of the unpacked @ifct2017/compositions package> [--old <old data.js>]
  python3 -I build_nutrition.py                    (re-uses ifct-subset.json, so the data package is not needed again)

Nothing here is a guess hidden in code: ingredient vectors come from IFCT (ingredients.py explains the few fixes),
recipes are plain text in recipes.py, and the report lists every dish next to the value the app used before.
"""
import json, os, re, sys, math
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
import ingredients as ING
import recipes as RC
from ingredients import COLS

args = sys.argv[1:]
def opt(name, default=None):
    return args[args.index(name) + 1] if name in args else default

SUBSET = os.path.join(HERE, 'ifct-subset.json')
ifct_dir = opt('--ifct')
import ifct as ifct_mod
rows_in = ifct_mod.load(ifct_dir) if ifct_dir else json.load(open(SUBSET, encoding='utf-8'))['rows']
lib = ING.build_lib(rows_in)
if ifct_dir:
    # keep the table rows the build used, so the repository can rebuild without the npm package
    used = sorted({m['code'] for m in lib.items.values() if 'code' in m})
    json.dump({'source': 'Indian Food Composition Tables 2017, NIN Hyderabad (ICMR). Open data package @ifct2017/compositions 2.0.9 (MIT licence). Values per 100 g edible portion, converted to the units the app uses (see ifct.py).',
               'rows': {c: rows_in[c] for c in used}}, open(SUBSET, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)

# ---- blends
for alias, (name, parts) in RC.BLENDS.items():
    lib.blend(alias, name, parts)

# ---- cooking retention (share of the vitamin that survives); minerals, macros and fibre are unchanged
RET = {
    'raw':   {},
    'steam': {'vc': .80, 'fo': .85, 'b1': .90, 'b2': .95, 'b6': .90, 'va': .95},
    'boil':  {'vc': .55, 'fo': .70, 'b1': .75, 'b2': .85, 'b3': .95, 'b6': .80, 'va': .90},
    'fry':   {'vc': .65, 'fo': .75, 'b1': .80, 'b2': .90, 'b3': .95, 'b6': .85, 'va': .90},
}

dish_by_name = {d['name']: d for d in RC.DISHES}
cache = {}
def parse_parts(s):
    out = []
    for p in s.split(','):
        p = p.strip()
        if not p: continue
        m = re.match(r'^(.*\S)\s+(\d*\.?\d+)$', p)
        out.append((m.group(1), float(m.group(2))))
    return out

def vec_of(ref):
    """per-100 g vector and tier of an ingredient alias or a 'dish:Name' reference"""
    if ref.startswith('dish:'):
        r = compute(ref[5:])
        return r['v'], r['tier']
    it = lib.items[ref]
    return it['v'], it['tier']

def compute(name):
    if name in cache: return cache[name]
    d = dish_by_name[name]
    parts = parse_parts(d['parts'])
    tot = {c: 0.0 for c in COLS}
    kc_by_tier = {'A': 0.0, 'B': 0.0, 'C': 0.0}
    for ref, g in parts:
        v, tier = vec_of(ref)
        for c in COLS:
            tot[c] += v[c] * g / 100.0
        kc_by_tier[tier] += v['k'] * g / 100.0
    per = {c: tot[c] / d['y'] * 100.0 for c in COLS}
    for c, f in RET[d['cook']].items():
        per[c] *= f
    ktot = sum(kc_by_tier.values()) or 1
    if len(parts) == 1 and parts[0][1] == 100 and not parts[0][0].startswith('dish:'):
        tier = lib.items[parts[0][0]]['tier']
    elif kc_by_tier['C'] / ktot > .3:
        tier = 'C'
    else:
        tier = 'B'
    r = {'v': {c: round(x, 3) for c, x in per.items()}, 'tier': tier, 'parts': parts, 'dish': d}
    cache[name] = r
    return r

foods = [compute(d['name']) for d in RC.DISHES]

# ---- checks
warnings = []
RANGES = [  # (regex, kcal per 100 g low, high)
    (r'^(Plain rice)$', 115, 140), (r'buttermilk', 8, 30), (r'^Dal pakwana', 150, 260), (r'^Dal |\bdal$|^Rasam|^Sambar|dal (fry|thadka|tadka)', 20, 125), (r'rice|pulao|biryani', 120, 215),
    (r'^Chapati|^Phulka|paratha', 220, 330), (r'sabji|dry|poriyal|salan', 55, 330), (r'curry|masala|kuruma|lababdar|roast|kolhapuri|fry$', 70, 260),
]
for f in foods:
    d, v = f['dish'], f['v']
    atw = 4 * v['p'] + 4 * v['c'] + 9 * v['f'] + 2 * v['fi']
    if v['k'] > 20 and abs(atw - v['k']) / v['k'] > .15:
        warnings.append('%s: kcal %.0f vs macros %.0f (Atwater) differ by %.0f%%' % (d['name'], v['k'], atw, 100 * (atw - v['k']) / v['k']))
    for rx, lo, hi in RANGES:
        if re.search(rx, d['name'], re.I):
            if not (lo <= v['k'] <= hi):
                warnings.append('%s: %.0f kcal per 100 g is outside the plausible %d to %d' % (d['name'], v['k'], lo, hi))
            break

# ---- the old values, for the cross-check report
old = {}   # name -> (kcal per 100 g, protein per 100 g, kcal per old serving, old serving grams)
oldp = opt('--old')
if oldp:
    txt = open(oldp, encoding='utf-8').read()
    def jsobj(name):
        m = re.search(r'const %s=\{(.*?)\};' % name, txt, re.S)
        return {k.strip("'"): float(v) for k, v in re.findall(r"('[^']+'|\w+):\s*(\d+(?:\.\d+)?)", m.group(1))}
    UGu, UGn = jsobj('UG'), jsobj('UGN')
    m = re.search(r'const RAW=`(.*?)`;', txt, re.S)
    for line in m.group(1).strip().split('\n'):
        a = line.split('|')
        ug = UGn.get(a[0]) or UGu.get(a[3]) or 100
        old[a[0]] = (float(a[1]) / ug * 100, float(a[2]) / ug * 100, float(a[1]), ug)

# ---- write the data file
def num(x):
    s = ('%.2f' % x).rstrip('0').rstrip('.')
    return s if s not in ('-0', '') else '0'
rows = []
for f in foods:
    d = f['dish']
    note = d['note']
    rows.append([d['name'], d['unit'], d['ug'], d['flags'], f['tier'], note, ','.join(num(f['v'][c]) for c in COLS)])
out = ['/* nutri-data.js: GENERATED by prototype/tools/nutrition/build_nutrition.py. Do not edit by hand.',
       '   Nutrients per 100 g of every food, from IFCT 2017 (NIN Hyderabad / ICMR) ingredients and the recipes in recipes.py.',
       '   Tier A = a row of IFCT or USDA used as is, B = a recipe built from IFCT rows, C = typical value (packs, restaurants). */',
       '(function(){const HS=window.HS=window.HS||{};',
       "HS.NUT_COLS='%s'.split(',');" % ','.join(COLS),
       'HS.NUT_ROWS=[']
for r in rows:
    out.append(' ' + json.dumps(r, ensure_ascii=False, separators=(',', ':')) + ',')
out.append('];')
out.append('})();')
open(os.path.join(ROOT, 'js', 'nutri-data.js'), 'w', encoding='utf-8').write('\n'.join(out) + '\n')

# ---- the report
ALIAS_OLD = {'Soya chunks, dry': 'Soya chunks (60 g)', 'Chicken breast, raw': 'Boiled chicken (100 g)'}
rep = ['# Nutrition cross-check', '',
       'Generated by `build_nutrition.py`. Every number in the app comes from IFCT 2017 (Indian Food Composition Tables, NIN Hyderabad / ICMR) rows plus the recipes in `recipes.py`.',
       'Tier A is a row used as is, B a recipe built from IFCT rows, C a typical value for packs and restaurants.',
       'Old = the rough estimate the app used before this update, converted to per 100 g so serving sizes do not matter.', '',
       '| Food | Serving | kcal / serving | Protein | Carbs | Fat | Fibre | Old kcal per 100 g | New kcal per 100 g | Change | Old protein per 100 g | New protein per 100 g | Tier |',
       '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|']
chg = []
for f in foods:
    d, v = f['dish'], f['v']
    s_ = d['ug'] / 100.0
    o = old.get(d['name']) or old.get(ALIAS_OLD.get(d['name'], ''))
    ok = op = dl = ''
    if o:
        ok, op = '%.0f' % o[0], '%.1f' % o[1]
        pct = (v['k'] - o[0]) / o[0] * 100 if o[0] else 0
        dl = '%+.0f%%' % pct
        chg.append((abs(pct), d['name'], o[0], v['k'], o[1], v['p']))
    rep.append('| %s | %d g %s | %.0f | %.1f | %.1f | %.1f | %.1f | %s | %.0f | %s | %s | %.1f | %s |' % (d['name'], d['ug'], d['unit'], v['k'] * s_, v['p'] * s_, v['c'] * s_, v['f'] * s_, v['fi'] * s_, ok, v['k'], dl, op, v['p'], f['tier']))
chg.sort(reverse=True)
rep += ['', '## Biggest corrections against the old estimates (per 100 g)', '', '| Food | Old kcal | New kcal | Old protein | New protein |', '|---|---:|---:|---:|---:|']
for x in chg[:25]:
    rep.append('| %s | %.0f | %.0f | %.1f | %.1f |' % (x[1], x[2], x[3], x[4], x[5]))
rep += ['', '## Data-quality notes from the build', ''] + ['* ' + n for n in lib.notes] + ['']
if warnings:
    rep += ['## Plausibility warnings', ''] + ['* ' + w for w in warnings] + ['']
open(os.path.join(HERE, 'REPORT.md'), 'w', encoding='utf-8').write('\n'.join(rep) + '\n')

print(len(foods), 'foods written; warnings:', len(warnings))
for w in warnings: print('WARN', w)
for n in lib.notes: print('NOTE', n)
