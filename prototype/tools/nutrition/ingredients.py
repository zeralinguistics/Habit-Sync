"""Ingredient library for the nutrition builder.

Every ingredient is a per-100 g nutrient vector with a provenance:
  IFCT   a row of the Indian Food Composition Tables 2017 (NIN Hyderabad / ICMR), read by ifct.py
  USDA   a standard reference value from USDA FoodData Central (SR Legacy), used only where IFCT has no row
  LABEL  a typical value from packaged-food labels (approximate; check your own pack)
  BLEND  a weighted mix of the above (for example "mixed vegetables")

Choices that matter, all written down here so they can be checked:
  * Energy: IFCT's own value is used when it agrees with its own conversion factors (17/37/17/8 kJ per g of
    protein/fat/available carbohydrate/fibre) within 12 %. A few rows of the open data package do not (IFCT leg
    chicken, the oils, which have no energy column), so those are recomputed from the macros.
  * Vitamin D: only animal foods count. IFCT lists large D2 values for some cereals, spices and seeds that no other
    source supports, and counting them would hide a real shortfall.
  * Vitamin B6 in a few rows is stored in micrograms in the data package (for example 140 for sardine, 4.4 for egg white);
    anything above 3 mg per 100 g is divided by 1000.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ifct as ifct_mod

COLS = ['k', 'p', 'c', 'f', 'fi', 'su', 'sf', 'ch', 'na', 'kk', 'ca', 'fe', 'mg', 'zn', 'ph', 'va', 'vc', 'vd', 've', 'vk', 'b1', 'b2', 'b3', 'b6', 'fo', 'n3']

# IFCT food groups whose vitamin D2/D3 values are not trusted (everything that is not an animal food or milk)
ANIMAL_GROUPS = set('LMNOPQRS')

def kcal_from_macros(v, fibre=None):
    """IFCT's conversion factors: 17 kJ per g protein, 37 fat, 17 available carbohydrate, 8 soluble fibre"""
    fib = v['fi'] if fibre is None else fibre
    kj = 17 * v['p'] + 37 * v['f'] + 17 * v['c'] + 8 * fib
    return kj / 4.184

class Lib:
    def __init__(self, rows):
        self.ifct = rows      # IFCT code -> {'name', 'v'} (per 100 g, in app units)
        self.items = {}      # alias -> {'v': vector, 'src': str, 'tier': 'A'|'C'|..., 'name': str}
        self.notes = []      # data-quality notes written during the build

    def _fix(self, code, v):
        v = dict(v)
        if code[0] not in ANIMAL_GROUPS:
            v['vd'] = 0.0
        if v['b6'] > 3:   # no food has more than about 2 mg per 100 g; larger values are micrograms stored as milligrams
            v['b6'] = round(v['b6'] / 1000, 4)
        # IFCT counts only soluble fibre as energy, so its printed energy is the one to trust when it agrees with that rule
        calc = kcal_from_macros(v, v.get('fs', 0))
        if v['k'] <= 0 or abs(v['k'] - calc) > max(8, 0.12 * calc):
            if calc > 0:
                self.notes.append('%s %s: the data package prints %.0f kcal but IFCT\'s own factors give %.0f; using %.0f' % (code, self.ifct[code]['name'], v['k'], calc, calc))
            v['k'] = round(calc, 2)
        v.pop('fs', None)
        return v

    def add_ifct(self, alias, code, override=None, src=None, name=None):
        base = self._fix(code, self.ifct[code]['v'])
        if override:
            base.update(override)
            base['k'] = round(kcal_from_macros(base), 2)   # a changed macro changes the energy
        self.items[alias] = {'v': base, 'src': src or ('IFCT 2017 ' + code), 'tier': 'A', 'name': name or self.ifct[code]['name'], 'code': code}

    def add_std(self, alias, name, vec, src, tier='C'):
        v = {c: 0.0 for c in COLS}
        v.update(vec)
        if 'k' not in vec:
            v['k'] = round(kcal_from_macros(v), 2)
        self.items[alias] = {'v': v, 'src': src, 'tier': tier, 'name': name}

    def blend(self, alias, name, parts, src='Blend of IFCT rows'):
        tot = sum(w for _, w in parts)
        v = {c: 0.0 for c in COLS}
        for a, w in parts:
            for c in COLS:
                v[c] += self.items[a]['v'][c] * w / tot
        self.items[alias] = {'v': {c: round(x, 4) for c, x in v.items()}, 'src': src, 'tier': 'A', 'name': name}

def build_lib(rows):
    L = Lib(rows)
    A = L.add_ifct
    # ---- cereals and millets
    for a, c in [('rice', 'A015'), ('pboil', 'A014'), ('atta', 'A019'), ('maida', 'A018'), ('ragi', 'A010'), ('rava', 'A022'),
                 ('semiya', 'A023'), ('poha', 'A011'), ('maize', 'A006'), ('sweetcorn', 'A008'), ('bulgur', 'A021')]:
        A(a, c)
    # ---- pulses
    for a, c in [('toor', 'B021'), ('chanadal', 'B001'), ('chana', 'B002'), ('urad', 'B003'), ('uradw', 'B004'), ('moong', 'B010'), ('moongw', 'B011'),
                 ('masoor', 'B013'), ('rajma', 'B019'), ('lobia', 'B006'), ('peasdry', 'B017'), ('soyabean', 'B025')]:
        A(a, c)
    # ---- vegetables, fruit, seasoning
    for a, c in [('ashgourd', 'D001'), ('bhindi', 'D056'), ('cauli', 'D036'), ('potato', 'F006'), ('tomato', 'D075'), ('onion', 'G017'), ('spinach', 'C033'),
                 ('capsicum', 'D033'), ('carrot', 'F002'), ('peas', 'D061'), ('lauki', 'D007'), ('snakegourd', 'D070'), ('broadbean', 'D032'), ('brinjal', 'D031'),
                 ('babycorn', 'D042'), ('cucumber', 'D043'), ('pumpkin', 'D065'), ('frenchbean', 'D050'), ('cabbage', 'C015'), ('methi', 'C020'),
                 ('ivygourd', 'D054'), ('drumstick', 'D046'), ('coriander', 'G009'), ('curryleaf', 'G010'), ('mint', 'G016'), ('garlic', 'G011'), ('ginger', 'G014'),
                 ('greenchilli', 'G008'), ('redchilli', 'G022'), ('corianderseed', 'G024'), ('cumin', 'G025'), ('turmeric', 'G033'), ('pepper', 'G031'),
                 ('mustard', 'H013'), ('coconut', 'H007'), ('coconutdry', 'H006'), ('groundnut', 'H012'), ('cashew', 'H005'), ('almond', 'H001'), ('sesame', 'H011'),
                 ('tamarind', 'E064'), ('lemon', 'E033'), ('jaggery', 'I001'), ('coconutwater', 'K002'),
                 ('banana', 'E012'), ('papaya', 'E049'), ('watermelon', 'E065'), ('pineapple', 'E053'), ('apple', 'E001'), ('orange', 'E047'), ('grapes', 'E026'),
                 ('guava', 'E028'), ('mango', 'E036'), ('pomegranate', 'E055'), ('sapota', 'E060'), ('muskmelon', 'E045'), ('dates', 'E017'), ('raisins', 'E057'),
                 ('beetroot', 'F001'), ('sweetpotato', 'F013'), ('tapioca', 'F015'), ('mushroom', 'J001')]:
        A(a, c)
    # ---- dairy, eggs, meat, fish, fats
    A('milk_cow', 'L002'); A('paneer', 'L003'); A('khoa', 'L004')
    A('milk', 'L002', override={'f': 3.0, 'sf': 1.8}, src='IFCT 2017 L002 cow milk with fat set to 3 % (toned milk, as sold)', name='Milk, toned (3 % fat)')
    L.items['milk']['tier'] = 'A'
    A('egg', 'M001'); A('eggb', 'M004'); A('eggwb', 'M005'); A('eggw', 'M002'); A('eggy', 'M003'); A('omelet', 'M007')
    A('chbreast_raw', 'N003'); A('chthigh', 'N002')
    # IFCT lists leg chicken at 1605 kJ, which does not match its own protein and fat; energy is recomputed from the macros
    A('chleg', 'N001')
    L.blend('chcurry', 'Chicken, curry cut (leg and thigh, skinless, edible part)', [('chleg', 1), ('chthigh', 1)])
    for a, c in [('mackerel', 'P034'), ('sardine', 'P071'), ('seer', 'P087'), ('rohu', 'S006'), ('catla', 'S002'), ('tuna_raw', 'P084'), ('pomfret', 'P057')]:
        A(a, c)
    L.blend('fish_marine', 'Marine fish for curry (mackerel, sardine and seer fish in equal parts)', [('mackerel', 1), ('sardine', 1), ('seer', 1)])
    L.blend('fish_fresh', 'Freshwater fish for curry (rohu and catla in equal parts)', [('rohu', 1), ('catla', 1)])
    A('oil', 'T012', src='IFCT 2017 T012 sunflower oil (energy from fat, 37 kJ/g)'); A('ghee', 'T013'); A('coconutoil', 'T001')
    A('beef', 'O025')

    # ---- standard references for things IFCT does not list (macros, plus the minerals each source states)
    S = L.add_std
    USDA = 'USDA FoodData Central, SR Legacy'
    S('sugar', 'Sugar, white', {'k': 387, 'c': 99.98, 'su': 99.98}, USDA + ' "Sugars, granulated"', 'A')
    S('salt', 'Salt', {'k': 0, 'na': 38758}, USDA + ' "Salt, table"', 'A')
    S('water', 'Water', {'k': 0}, 'none', 'A')
    S('butter', 'Butter, salted', {'k': 717, 'p': 0.85, 'f': 81.1, 'sf': 51.4, 'ch': 215, 'na': 643, 'ca': 24, 'va': 684, 'vd': 1.5, 'n3': 0.3}, USDA + ' "Butter, salted"', 'A')
    S('cocoa', 'Cocoa powder, unsweetened', {'k': 228, 'p': 19.6, 'c': 13.8, 'f': 13.7, 'fi': 33.2, 'su': 1.8, 'sf': 8.1, 'na': 21, 'kk': 1524, 'ca': 128, 'fe': 13.9, 'mg': 499, 'zn': 6.8}, USDA + ' "Cocoa, dry powder, unsweetened"', 'A')
    S('icecream', 'Ice cream, vanilla', {'k': 207, 'p': 3.5, 'c': 23.6, 'f': 11, 'sf': 6.8, 'su': 21.2, 'ch': 44, 'na': 80, 'kk': 199, 'ca': 128, 'fe': 0.1, 'mg': 14, 'zn': 0.7, 'va': 118}, USDA + ' "Ice creams, vanilla"', 'C')
    S('softdrink', 'Soft drink, cola', {'k': 42, 'c': 10.6, 'su': 10.6, 'na': 4}, USDA + ' "Carbonated beverage, cola"', 'C')
    S('biscuit', 'Biscuit, glucose or marie (typical pack label)', {'k': 450, 'p': 7, 'c': 75, 'f': 13, 'fi': 2, 'su': 22, 'sf': 6, 'na': 350}, 'Typical glucose/marie biscuit pack label (approximate)', 'C')
    S('oats', 'Oats, rolled, dry', {'k': 389, 'p': 16.9, 'c': 55.7, 'f': 6.9, 'fi': 10.6, 'su': 1.0, 'sf': 1.2, 'na': 2, 'kk': 429, 'ca': 54, 'fe': 4.7, 'mg': 177, 'zn': 4.0, 'ph': 523, 'b1': 0.76, 'b2': 0.14, 'b3': 0.96, 'b6': 0.12, 'fo': 56}, USDA + ' "Oats"', 'C')
    S('lotus', 'Makhana (fox nut), plain', {'k': 332, 'p': 15.4, 'c': 51.0, 'f': 2.0, 'fi': 14.5, 'su': 0, 'na': 6, 'kk': 1368, 'ca': 163, 'fe': 3.0, 'mg': 210, 'zn': 5.0}, USDA + ' "Seeds, lotus seeds, dried"', 'C')
    S('soya_chunks', 'Soya chunks, dry (textured soy protein)', {'k': 345, 'p': 52, 'c': 20, 'f': 0.8, 'fi': 13, 'su': 0, 'sf': 0.2, 'na': 20, 'kk': 2000, 'ca': 350, 'fe': 14, 'mg': 270, 'zn': 4.5, 'ph': 650, 'b1': 0.7, 'b2': 0.3, 'b3': 2.5, 'b6': 0.5, 'fo': 300}, 'Typical soya-chunk pack label (protein 52 g, carbohydrate 33 g incl. fibre per 100 g); minerals scaled from IFCT soya bean', 'C')
    S('whey', 'Whey protein concentrate powder', {'k': 400, 'p': 80, 'c': 8, 'f': 5, 'su': 5, 'sf': 3, 'na': 300, 'ca': 400, 'kk': 600}, 'Typical whey concentrate label (80 g protein per 100 g)', 'C')
    S('plantprot', 'Plant protein powder (pea and rice), typical', {'k': 390, 'p': 76, 'c': 8, 'f': 5, 'fi': 4, 'su': 1, 'sf': 1, 'na': 350, 'ca': 100, 'fe': 5}, 'Typical plant protein powder label (about 76 g protein per 100 g); check your tub', 'C')
    S('proteinbar', 'Protein bar, typical (20 g protein per 60 g bar)', {'k': 400, 'p': 33.3, 'c': 36.7, 'f': 13.3, 'fi': 8.3, 'su': 8.3, 'sf': 5.5, 'na': 280, 'ca': 150}, 'Typical protein-bar pack label; check your brand and add it as a custom food', 'C')
    S('proteinbar_s', 'Protein bar, small (10 g protein per 40 g bar)', {'k': 400, 'p': 25, 'c': 45, 'f': 15, 'fi': 7.5, 'su': 15, 'sf': 6, 'na': 250, 'ca': 100}, 'Typical protein-bar pack label; check your brand and add it as a custom food', 'C')
    S('mayo', 'Mayonnaise', {'k': 680, 'p': 1.1, 'c': 0.6, 'f': 75, 'sf': 11.2, 'ch': 42, 'na': 635}, USDA + ' "Salad dressing, mayonnaise, regular"', 'C')
    S('tuna_can', 'Tuna, canned in water', {'p': 25.5, 'c': 0, 'f': 0.8, 'ch': 42, 'na': 247, 'kk': 237, 'ca': 11, 'fe': 1.4, 'mg': 27, 'zn': 0.6, 'vd': 2.3, 'n3': 0.28, 'b3': 13.3}, USDA + ' "Fish, tuna, light, canned in water, drained"', 'C')
    S('chbreast_lean', 'Chicken breast, skinless, trimmed (raw)', {'p': 22.5, 'c': 0, 'f': 2.6, 'sf': 0.6, 'ch': 73, 'na': 45, 'kk': 334, 'ca': 5, 'fe': 0.4, 'mg': 28, 'zn': 0.7, 'ph': 213, 'vd': 0.1, 'b1': 0.07, 'b2': 0.1, 'b3': 11.0, 'b6': 0.6, 'fo': 4}, USDA + ' "Chicken, broilers or fryers, breast, meat only, raw"; same cut as IFCT N003 but trimmed of visible fat', 'C')
    return L
