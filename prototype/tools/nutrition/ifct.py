"""Reads the IFCT 2017 table (Indian Food Composition Tables, NIN Hyderabad / ICMR) from the open data package
@ifct2017/compositions (MIT licence; npm pack @ifct2017/compositions) and returns per-100 g nutrient vectors.

IFCT stores g per 100 g edible portion for everything (energy in kJ). We convert to the units the app shows:
  k kcal, p/c/f/fi/su/sf g, ch/na/kk/ca/fe/mg/zn/ph/vc/ve mg, va/vd/vk/fo ug, b1/b2/b3/b6 mg, n3 g
"""
import csv, os, sys

KJ_PER_KCAL = 4.184
# key -> (IFCT column(s), multiplier to the app's unit)
FIELDS = {
    'p':  (['protcnt'], 1), 'c': (['choavldf'], 1), 'f': (['fatce'], 1), 'fi': (['fibtg'], 1),
    'su': (['fsugar'], 1), 'sf': (['fasat'], 1), 'fs': (['fibsol'], 1),   # fs (soluble fibre) is only used to check energy
    'ch': (['cholc'], 1000), 'na': (['na'], 1000), 'kk': (['k'], 1000), 'ca': (['ca'], 1000), 'fe': (['fe'], 1000),
    'mg': (['mg'], 1000), 'zn': (['zn'], 1000), 'ph': (['p'], 1000), 'vc': (['vitc'], 1000),
    've': (['vite'], 1000),
    'vd': (['ergcal', 'chocal'], 1e6),
    'vk': (['vitk1', 'vitk2'], 1e6), 'fo': (['folsum'], 1e6),
    'b1': (['thia'], 1000), 'b2': (['ribf'], 1000), 'b3': (['nia'], 1000), 'b6': (['vitb6c'], 1000),
    'n3': (['f18d3n3', 'f20d5n3', 'f22d6n3', 'f22d5n3'], 1),
}

def load(pkg_dir):
    path = os.path.join(pkg_dir, 'index.csv')
    rows = list(csv.reader(open(path, encoding='utf-8')))
    codes = [h.split('; ')[1] if '; ' in h else h for h in rows[0]]
    ix = {c: i for i, c in enumerate(codes)}
    def num(r, c):
        if c not in ix: return 0.0
        v = r[ix[c]].strip()
        try: return float(v)
        except ValueError: return 0.0
    out = {}
    for r in rows[1:]:
        code = r[ix['code']]
        v = {'k': round(num(r, 'enerc') / KJ_PER_KCAL, 2)}
        for key, (cols, mul) in FIELDS.items():
            v[key] = round(sum(num(r, c) for c in cols) * mul, 4)
        # vitamin A as retinol activity equivalents: retinol + beta-carotene/12 + other provitamin carotenoids/24
        v['va'] = round((num(r, 'retol') * 1e6) + (num(r, 'cartb') * 1e6) / 12 + (num(r, 'carta') * 1e6 + num(r, 'cartg') * 1e6 + num(r, 'crypxb') * 1e6) / 24, 2)
        out[code] = {'name': r[ix['name']], 'v': v}
    return out

if __name__ == '__main__':
    d = load(sys.argv[1])
    for code in sys.argv[2:]:
        x = d[code]; print(code, x['name'], x['v'])
