"""Dish recipes. Every cooked dish is written as the raw ingredients that end up in 100 g of the finished dish
(y=100) or as a batch with its cooked weight (y=...). The builder adds the nutrient vectors of the ingredients and
divides by the cooked weight, then applies a cooking retention factor to the vitamins that cooking destroys.

Assumptions that move the numbers, stated once:
  * Mess cooking is moderately oily: about 3 to 4 g of oil per 100 g of gravy, 5 to 7 g per 100 g of dry sabzi,
    2 g in a dal tadka, 4 g in flavoured rice. Deep-fried items absorb the oil written in the recipe.
  * In chicken and fish curries the edible meat is about 40 % of the weight served (pieces plus gravy).
  * Rice triples in weight when cooked (100 g raw gives about 280 g), dal is cooked thin (about 12 g dry dal per 100 g, so a katori holds about 4 g of protein).
  * A "serving" is what one scoop of the mess counter gives, not what a recipe book says.
A dish is only as good as its recipe. The portion slider and the custom-food form exist for the days it is off.
"""

# virtual ingredients made of other ingredients (weights are relative)
BLENDS = {
    'mixveg':   ('Mixed vegetables (cauliflower, carrot, beans, peas)', [('cauli', .3), ('carrot', .25), ('frenchbean', .25), ('peas', .2)]),
    'salad':    ('Salad (cucumber, tomato, onion, carrot, cabbage)', [('cucumber', .4), ('tomato', .25), ('onion', .15), ('carrot', .15), ('cabbage', .05)]),
    'mixfruit': ('Mixed fruit (papaya, watermelon, pineapple, banana, apple)', [('papaya', .25), ('watermelon', .25), ('pineapple', .2), ('banana', .15), ('apple', .15)]),
    'masala':   ('Spice blend (coriander, chilli, cumin, turmeric, pepper)', [('corianderseed', .4), ('redchilli', .25), ('cumin', .15), ('turmeric', .1), ('pepper', .1)]),
    'base':     ('Onion-tomato gravy base with garlic and ginger', [('onion', .5), ('tomato', .35), ('garlic', .1), ('ginger', .05)]),
    'curd':     ('Curd made from toned milk', [('milk', 1)]),
    'dal_mix':  ('Dal mix (toor and moong)', [('toor', .6), ('moong', .4)]),
    'pulse_mix': ('Boiled pulse mix (whole moong, chana, lobia), raw weight', [('moongw', .4), ('chana', .4), ('lobia', .2)]),
}

# (name, unit, grams in one serving, parts, yield, cooking method, flags, note)   flags: s = sugar penalty, o = outside the mess
DISHES = []
def D(name, unit, ug, parts, y=100, cook='boil', flags='', note=''):
    DISHES.append(dict(name=name, unit=unit, ug=ug, parts=parts, y=y, cook=cook, flags=flags, note=note))

# ============================== breakfast ==============================
D('Idli', 'pc', 40, 'pboil 100, urad 33', y=330, cook='steam', note='Batter of 3 parts parboiled rice to 1 part urad dal, steamed')
D('Medu vada', 'pc', 50, 'urad 100, onion 8, greenchilli 2, curryleaf 1, oil 25, salt 1', y=190, cook='fry', note='Urad dal batter, deep fried; about 25 g oil absorbed per 100 g dal')
D('Sambar', 'katori', 150, 'toor 11, lauki 12, carrot 5, tomato 6, onion 6, tamarind 2, masala 1.5, oil 1.5, curryleaf .3, mustard .2, salt .5', note='Thin mess sambar with vegetables')
D('Coconut chutney', '2 tbsp', 30, 'coconut 45, chanadal 5, greenchilli 2, ginger 1, salt .5', cook='raw', note='Fresh coconut, roasted gram, chilli')
D('Dosa', 'pc', 90, 'rice 26, urad 7, oil 7.5, salt .5', cook='fry', note='Batter dosa cooked with a little oil (base for masala dosa)')
D('Potato masala', 'katori', 100, 'potato 40, onion 12, oil 5.5, mustard .3, curryleaf .5, turmeric .2, greenchilli 1, salt .5', cook='fry', note='Dosa filling')
D('Methi paratha', 'pc', 80, 'atta 52, methi 12, oil 8.5, salt .8', cook='fry', note='Whole-wheat flatbread with fenugreek leaves, shallow fried')
D('Pongal', 'katori', 150, 'rice 16, moong 8, ghee 4.5, cashew 1.5, pepper .3, cumin .3, ginger .5, salt .6', note='Ven pongal: rice and moong dal cooked soft with ghee')
D('Aloo matar sabji', 'katori', 150, 'potato 25, peas 8, onion 6, tomato 6, oil 4.5, masala 1.5, salt .5', cook='boil')
D('Masala dosa', 'pc', 180, 'dish:Dosa 62, dish:Potato masala 38', cook='fry', note='Dosa with potato filling')
D('Veg poha', 'plate', 200, 'poha 28, potato 8, onion 8, groundnut 2, peas 3, oil 3.5, curryleaf .3, turmeric .1, salt .5', cook='fry')
D('Coriander mint chutney', '2 tbsp', 30, 'coriander 25, mint 10, coconut 8, greenchilli 3, lemon 2, salt .5', cook='raw')
D('Kallappam', 'pc', 70, 'rice 33, coconut 10, sugar 2, salt .4', cook='steam', note='Fermented rice pancake')
D('Pakwan', 'pc', 30, 'maida 100, oil 25, salt 1', y=110, cook='fry', note='Crisp fried flatbread served with dal pakwana')
D('Dal pakwana', 'plate', 250, 'dish:Chana dal 80, dish:Pakwan 20', cook='fry', note='Chana dal with crisp pakwan')
D('Upma', 'plate', 200, 'rava 24, onion 6, carrot 3, peas 2, groundnut 1.5, oil 4.5, mustard .3, curryleaf .3, salt .6', cook='fry')
D('Vegetable stew', 'katori', 150, 'potato 12, carrot 6, frenchbean 4, peas 3, onion 4, coconut 10, ghee 1.5, ginger .5, salt .5', note='Kerala stew with coconut milk')
D('Aloo paratha', 'pc', 90, 'atta 40, potato 35, oil 10, masala 1, salt .8', cook='fry', note='Stuffed flatbread, shallow fried with oil')
D('Veg wheat upma', 'plate', 200, 'bulgur 22, onion 5, carrot 4, peas 3, frenchbean 3, oil 4, mustard .3, curryleaf .3, salt .6', cook='fry', note='Broken wheat (dalia) upma')
D('Curd', 'katori', 150, 'curd 100', cook='raw', note='Toned-milk curd')
D('Uttapam', 'pc', 120, 'rice 20, urad 5, onion 6, tomato 4, oil 4, salt .5', cook='fry')
D('Semeya', 'plate', 200, 'semiya 22, onion 5, carrot 3, peas 2, oil 4, mustard .3, curryleaf .3, salt .6', cook='fry', note='Vermicelli upma')
D('Pav', 'pc', 40, 'maida 62, butter 3, sugar 1.5, oil 1, salt 1', y=100, cook='raw', note='Soft white bread roll')
D('Bhaaji', 'katori', 150, 'potato 18, cauli 8, peas 6, tomato 10, onion 6, capsicum 3, butter 5, oil 2, masala 1.5, salt .6', note='Mashed vegetable bhaji for pav')
D('Ragi dosa', 'pc', 100, 'ragi 15, rice 8, urad 3, onion 4, oil 5, salt .5', cook='fry')
D('Red chutney', '2 tbsp', 30, 'coconut 20, redchilli 3, garlic 2, tamarind 2, onion 6, oil 1, salt .6', cook='raw')
D('Omelette', 'pc', 110, 'omelet 100', cook='fry', note='IFCT omelette (egg, oil, onion)')
D('Boiled egg', 'pc', 50, 'eggb 100', cook='raw')
D('Egg white', 'pc', 33, 'eggwb 100', cook='raw', note='Boiled egg white')
D('Chocos', 'bowl', 35, 'rice 50, atta 18, sugar 26, cocoa 4, salt 1, oil 1', cook='raw', flags='s', note='Chocolate cereal: pack labels say about 380 kcal per 100 g')
D('Corn flakes', 'bowl', 35, 'maize 90, sugar 7, salt 1.5', cook='raw', flags='s', note='Pack labels say about 360 kcal per 100 g')
D('Boiled pulses', 'katori', 100, 'pulse_mix 30, salt .4', note='Plain boiled whole moong, chana and lobia; 100 g cooked is about 30 g dry')
D('Banana', 'pc', 100, 'banana 100', cook='raw', note='Edible pulp, without the peel')
D('Papaya', 'cup', 150, 'papaya 100', cook='raw')
D('Watermelon', '2 cups', 300, 'watermelon 100', cook='raw')
D('Mixed fruits', 'katori', 150, 'mixfruit 100', cook='raw')
D('Bread', 'slice', 30, 'maida 64, sugar 2, oil 1.5, salt 1.2', y=100, cook='raw', note='White sandwich bread')
D('Bread, butter, jam', '2 slices', 80, 'dish:Bread 75, butter 7, sugar 11, mixfruit 7', cook='raw', flags='s', note='Two slices of bread with butter and jam')
D('Tea (sugar)', 'cup', 150, 'milk 40, water 55, sugar 5', cook='raw', flags='s', note='Milk tea with one teaspoon of sugar')
D('Tea (no sugar)', 'cup', 150, 'milk 40, water 60', cook='raw', note='Milk tea, no sugar')
D('Coffee (sugar)', 'cup', 150, 'milk 45, water 50, sugar 5', cook='raw', flags='s', note='Milk coffee with one teaspoon of sugar')
D('Coffee (no sugar)', 'cup', 150, 'milk 45, water 55', cook='raw', note='Milk coffee, no sugar')
D('Black tea or coffee', 'cup', 150, 'water 100', cook='raw', note='Black, no milk and no sugar: about 2 kcal')
D('Milk', 'glass', 200, 'milk 100', cook='raw', note='Toned milk, 3 % fat')
D('Veg salad', 'bowl', 70, 'salad 100', cook='raw')
D('Green salad', 'bowl', 70, 'salad 100', cook='raw')
D('Onion salad', 'bowl', 50, 'onion 85, lemon 3, redchilli .2, salt .3', cook='raw')
D('Pickle', 'tsp', 8, 'lemon 40, oil 24, redchilli 6, mustard 4, salt 14, turmeric .5, water 11.5', cook='raw', note='Achar is mostly oil and salt: watch the sodium')

# ============================== lunch and dinner staples ==============================
D('Chapati', 'pc', 40, 'atta 75, oil 1.5, salt .5', cook='fry', note='Plain whole-wheat chapati (a 40 g piece uses about 30 g flour)')
D('Phulka', 'pc', 30, 'atta 72, salt .5', cook='fry', note='Oil-free phulka')
D('Plain rice', 'katori', 150, 'rice 36', cook='boil', note='Boiled white rice (100 g raw gives about 280 g cooked)')
D('Pappad', 'pc', 10, 'urad 90, oil 10, salt 3', cook='fry', note='Roasted or fried urad pappad')
D('Fryums', 'handful', 25, 'rice 68, oil 28, salt 2', y=100, cook='fry', note='Fried snack wheels: mostly starch and oil')

# ---------- dals (cooked thin, about 10 g of dry dal per 100 g) ----------
D('Ash gourd dal', 'katori', 150, 'toor 11, ashgourd 20, onion 4, tomato 3, oil 2.2, masala 1, salt .5')
D('Palak dal', 'katori', 150, 'toor 12, spinach 15, onion 4, garlic 1, oil 2.2, masala 1, salt .5')
D('Dal tadka', 'katori', 150, 'toor 11, moong 3.5, onion 4, tomato 4, oil 2.3, garlic 1, masala 1, salt .5')
D('Bengal gram dal fry', 'katori', 150, 'chanadal 13, onion 5, tomato 5, oil 3, masala 1.2, salt .5', cook='fry')
D('Dal makkani', 'katori', 150, 'uradw 8, rajma 2.5, tomato 8, butter 3, ghee 1.5, milk 5, ginger .5, garlic 1, masala 1, salt .5', note='Black dal with butter and cream (milk used for the cream)')
D('Yellow dal', 'katori', 150, 'dal_mix 12, onion 3, tomato 3, oil 2, masala 1, salt .5')
D('Arhar dal', 'katori', 150, 'toor 13, onion 3, tomato 3, oil 2, masala 1, salt .5')
D('Masala dal', 'katori', 150, 'toor 8, chanadal 5, onion 5, tomato 5, oil 2.5, masala 1.2, salt .5')
D('Moong dal thadka', 'katori', 150, 'moong 12, onion 3, tomato 3, oil 2.3, garlic 1, masala 1, salt .5')
D('Chana dal', 'katori', 150, 'chanadal 13, onion 4, tomato 4, oil 2.5, masala 1, salt .5')
D('Tomato pappu', 'katori', 150, 'toor 11, tomato 20, onion 3, oil 2.2, tamarind 1, masala 1, salt .5')
D('Dal maharani', 'katori', 150, 'uradw 7, rajma 2.5, chanadal 2.5, tomato 8, butter 3.5, ghee 1.5, milk 8, ginger .5, garlic 1, masala 1, salt .5')
D('Rasam', 'katori', 150, 'toor 2, tomato 8, tamarind 2, garlic .5, oil .7, masala 1, curryleaf .3, salt .5', note='Thin rasam')

# ---------- dry vegetables (a serving is about 100 g) ----------
D('Broad beans aloo', 'katori', 100, 'broadbean 40, potato 30, onion 5, oil 5.5, masala 1, salt .5', cook='fry')
D('Alu gobhi dry', 'katori', 100, 'potato 30, cauli 45, tomato 5, onion 4, oil 5.5, masala 1, salt .5', cook='fry')
D('Guthi vangai', 'katori', 100, 'brinjal 60, groundnut 5, sesame 2, coconutdry 3, tamarind 2, oil 7, masala 1.5, salt .5', cook='fry', note='Stuffed brinjal in a nut and sesame masala')
D('Dum aloo banaras', 'katori', 100, 'potato 55, curd 8, oil 6, cashew 2, masala 1.5, salt .5', cook='fry')
D('Corn palak', 'katori', 100, 'sweetcorn 25, spinach 40, onion 5, butter 2, oil 3.5, garlic 1, masala 1, salt .5', cook='fry')
D('Kadai veg dry', 'katori', 100, 'capsicum 15, carrot 10, frenchbean 10, cauli 15, peas 8, tomato 10, onion 8, oil 6, masala 1.5, salt .5', cook='fry')
D('Honey chilli potato', 'katori', 100, 'potato 100, maida 10, oil 18, sugar 12, garlic 1, salt .8', y=100, cook='fry', flags='s', note='Fried potato tossed in a sweet chilli sauce')
D('Golden corn gobhi dry', 'katori', 100, 'sweetcorn 25, cauli 35, onion 4, oil 6, masala 1, salt .5', cook='fry')
D('Bhindi kurkure', 'katori', 100, 'bhindi 55, chanadal 10, rice 3, oil 14, masala 1.5, salt .5', y=100, cook='fry', note='Okra strips coated in gram flour and deep fried')
D('Snake gourd chenna dal dry', 'katori', 100, 'snakegourd 55, chanadal 10, coconut 5, oil 4.5, masala 1, salt .5', cook='fry')
D('Lowki tomatar', 'katori', 100, 'lauki 65, tomato 20, onion 4, oil 3.5, masala 1, salt .5')
D('Mix veg poriyal', 'katori', 100, 'mixveg 70, coconut 8, oil 3.5, mustard .3, curryleaf .3, salt .5', cook='fry')
D('Mirchi ka salan', 'katori', 100, 'capsicum 25, groundnut 8, sesame 4, coconutdry 3, tamarind 3, onion 6, oil 6, masala 1.5, salt .5', cook='fry', note='Chilli curry in a peanut and sesame gravy')
D('Chole masala', 'katori', 150, 'chana 20, onion 8, tomato 8, oil 4, masala 1.5, salt .5', note='Chickpea masala as a dinner side')
D('Aloo methi dry', 'katori', 100, 'potato 40, methi 25, oil 5.5, masala 1, salt .5', cook='fry')
D('Aalu bhindi', 'katori', 100, 'potato 25, bhindi 35, onion 5, oil 6, masala 1, salt .5', cook='fry')

# ---------- gravies ----------
D('Punjabi chole', 'katori', 150, 'chana 22, onion 10, tomato 12, oil 4, masala 1.5, salt .5')
D('Kadhi pakoda', 'katori', 150, 'curd 25, chanadal 12, onion 4, oil 5, masala 1, salt .5', note='Curd and gram flour kadhi with pakoras')
D('Veg kofta curry', 'katori', 150, 'potato 12, paneer 4, maida 2, oil 8, onion 8, tomato 8, cashew 2, masala 1.5, salt .5', note='Fried vegetable koftas in a gravy')
D('Rajma raseela', 'katori', 150, 'rajma 16, onion 8, tomato 10, oil 3.5, masala 1.2, salt .5')
D('Dondakai dum fry', 'katori', 100, 'ivygourd 70, oil 7, masala 1.5, salt .5', cook='fry')
D('Paneer lababdar', 'katori', 150, 'paneer 20, onion 10, tomato 12, cashew 3, butter 3, oil 3, masala 1.2, salt .5', note='Paneer in a rich tomato gravy; about 4 cubes')
D('Soya capsicum', 'katori', 150, 'soya_chunks 8, capsicum 20, onion 8, tomato 8, oil 4.5, masala 1.2, salt .5', note='Soya chunks counted dry before soaking')
D('Rajma masala', 'katori', 150, 'rajma 16, onion 8, tomato 10, oil 3.5, masala 1.2, salt .5')
D('Soya curry', 'katori', 150, 'soya_chunks 10, onion 8, tomato 10, oil 4, masala 1.2, salt .5', note='Soya chunks counted dry before soaking')
D('Besan gatte', 'katori', 150, 'chanadal 14, curd 20, oil 5, masala 1.2, salt .5', note='Gram-flour dumplings in a curd gravy')
D('Lobia masala', 'katori', 150, 'lobia 14, onion 8, tomato 10, oil 3.5, masala 1.2, salt .5')
D('Veg manchurian', 'katori', 150, 'cabbage 14, carrot 6, maida 7, oil 9, onion 4, garlic 1, sugar 1, salt 1, ginger .5', y=100, cook='fry', note='Deep-fried vegetable balls in a soy-chilli sauce')
D('Kadala curry', 'katori', 150, 'chana 16, coconut 4, onion 5, oil 3, masala 1.5, salt .5', note='Kerala black chickpea curry')
D('Mutter masala', 'katori', 150, 'peas 25, onion 8, tomato 10, oil 4.5, cashew 1, masala 1.5, salt .5')
D('White peas kuruma', 'katori', 150, 'peasdry 14, coconut 6, cashew 1, potato 8, onion 4, oil 3.5, masala 1.2, salt .5')
D('Peanut masala', 'katori', 150, 'groundnut 12, onion 8, tomato 8, coconut 4, oil 4, masala 1.2, salt .5')

# ---------- egg, fish, chicken, paneer (meat is about 40 % of what is served) ----------
D('Egg pepper roast', '2 eggs', 150, 'eggb 65, onion 12, oil 6.5, pepper 1, curryleaf .3, salt .5', cook='fry', note='Two boiled eggs roasted in an onion and pepper masala')
D('Egg tikka masala', '2 eggs', 200, 'eggb 45, onion 10, tomato 12, oil 4, butter 2, cashew 2, masala 1.2, salt .5', note='Two eggs in a tikka masala gravy')
D('Egg curry', '2 eggs', 170, 'eggb 50, onion 10, tomato 10, oil 4, coconut 2, masala 1.2, salt .5', note='Two eggs in a gravy')
D('Egg kolhapuri', '2 eggs', 200, 'eggb 45, onion 10, tomato 10, oil 5, coconutdry 3, redchilli 1, masala 1.2, salt .5', note='Two eggs in a spicy kolhapuri gravy')
D('Fish curry', 'piece', 150, 'fish_fresh 45, onion 8, tomato 8, tamarind 2, oil 3.5, masala 1.5, salt .5', note='Freshwater fish in gravy; about 45 g of fish in each 100 g served')
D('Fish curry (Nellore)', 'piece', 150, 'fish_fresh 45, onion 9, tomato 8, tamarind 3, oil 4, redchilli 1, masala 1.5, salt .5', note='Nellore chepala pulusu: tangy chilli-tamarind fish curry')
D('Kerala fish curry', 'piece', 150, 'fish_marine 45, coconut 6, onion 6, tomato 4, tamarind 2, oil 3.5, masala 1.5, salt .5', note='Marine fish (mackerel, sardine, seer) in a coconut gravy')
D('Kadai chicken', 'katori', 180, 'chcurry 40, onion 10, tomato 10, capsicum 6, oil 5, butter 1, curd 3, masala 1.5, salt .5', note='Chicken curry cut with bone removed from the weight')
D('Kadai paneer', 'katori', 150, 'paneer 22, capsicum 12, onion 10, tomato 12, oil 5, masala 1.5, salt .5')
D('Palak paneer', 'katori', 150, 'paneer 20, spinach 30, onion 6, tomato 5, butter 2.5, oil 3.5, garlic 1, masala 1, salt .5')
D('Pahdi chicken', 'katori', 180, 'chcurry 40, coriander 10, mint 4, greenchilli 3, onion 8, oil 4.5, curd 3, masala 1, salt .5')
D('Shahi paneer', 'katori', 150, 'paneer 20, onion 10, tomato 10, cashew 5, butter 3, oil 3, milk 5, masala 1, salt .5')
D('Chicken kolhapuri', 'katori', 180, 'chcurry 40, onion 10, tomato 8, coconutdry 4, redchilli 1.5, oil 5, masala 1.5, salt .5')
D('Paneer tikka masala', 'katori', 150, 'paneer 20, onion 10, tomato 12, capsicum 4, butter 3, oil 3, cashew 3, masala 1.5, salt .5')
D('Chicken tikka masala', 'katori', 180, 'chcurry 40, onion 10, tomato 12, butter 3, oil 3, cashew 3, curd 3, masala 1.5, salt .5')

# ---------- rice (a serving is about 250 g) ----------
D('Lemon rice', 'plate', 250, 'rice 31, oil 4, groundnut 2, lemon 2, mustard .3, curryleaf .3, turmeric .1, salt .6', cook='fry')
D('Curry leaves rice', 'plate', 250, 'rice 31, oil 4, curryleaf 3, chanadal 1, groundnut 1, mustard .3, salt .6', cook='fry')
D('Tomato rice', 'plate', 250, 'rice 31, tomato 14, onion 4, oil 4, masala 1, salt .6', cook='fry')
D('Ghee rice (pulao)', 'plate', 250, 'rice 31, ghee 4.5, onion 3, cashew 1, masala .5, salt .6', cook='fry')
D('Corn pulao', 'plate', 250, 'rice 30, sweetcorn 8, oil 4, onion 3, masala .5, salt .6', cook='fry')
D('Tamarind rice', 'plate', 250, 'rice 31, tamarind 5, oil 4.5, groundnut 2, chanadal 1, mustard .3, masala .8, salt .6', cook='fry')
D('Tawa pulao', 'plate', 250, 'rice 29, mixveg 10, onion 4, butter 3, oil 2.5, masala 1.5, salt .6', cook='fry', note='Mumbai-style pulao on a griddle with butter')
D('Basanti pulao', 'plate', 250, 'rice 31, ghee 3, sugar 2, raisins 1, cashew 1, masala .3, salt .6', cook='fry', note='Sweet yellow pulao')
D('Schezuan fried rice', 'plate', 250, 'rice 30, oil 5, mixveg 8, onion 3, garlic 1, redchilli .5, salt 1', cook='fry')
D('Veg biryani', 'plate', 300, 'rice 27, mixveg 15, oil 4.5, onion 6, curd 3, ghee 1, masala 1.5, salt .6', cook='fry')
D('Jeera rice', 'plate', 250, 'rice 31, ghee 2.5, oil 1.5, cumin .5, salt .6', cook='fry')
D('Hyd paneer dum biryani', 'plate', 300, 'rice 26, paneer 14, oil 5, onion 7, curd 3, ghee 1.5, masala 1.5, salt .6', cook='fry')
D('Hyd chicken dum biryani', 'plate', 300, 'rice 26, chcurry 20, oil 5, onion 7, curd 3, ghee 1.5, masala 1.5, salt .6', cook='fry', note='Chicken is about 20 g edible meat per 100 g of biryani')
D('Bhagara rice', 'plate', 250, 'rice 31, oil 4, onion 4, masala 1, cumin .3, salt .6', cook='fry')
D('Veg pulao', 'plate', 250, 'rice 30, mixveg 10, oil 4, onion 3, masala .8, salt .6', cook='fry')

# ---------- drinks, raitas, sweets ----------
D('Buttermilk', 'glass', 200, 'curd 25, water 74, salt .5', cook='raw', note='Thin mess chaas: one part curd to three parts water')
D('Jeera buttermilk', 'glass', 200, 'curd 25, water 74, cumin .3, salt .5', cook='raw')
D('Masala buttermilk', 'glass', 200, 'curd 25, water 73, greenchilli .5, ginger .3, coriander 1, cumin .3, salt .5', cook='raw')
D('Boondi raitha', 'katori', 150, 'curd 80, chanadal 4, oil 2.5, cumin .3, salt .5', cook='raw')
D('Onion cucumber raitha', 'katori', 150, 'curd 75, cucumber 10, onion 6, cumin .3, salt .5', cook='raw')
D('Halwa (dal/carrot)', 'katori', 100, 'carrot 20, moong 6, milk 12, sugar 16, ghee 10, khoa 4', cook='fry', flags='s', note='Average of carrot halwa and moong dal halwa')
D('Sweet boondi', 'handful', 40, 'chanadal 55, oil 11, sugar 33, water 1', y=100, cook='fry', flags='s')
D('Gulab jamun', 'pc', 40, 'khoa 100, maida 20, sugar 100, oil 10', y=245, cook='fry', flags='s', note='Fried khoa dough soaked in sugar syrup')
D('Ice-cream', 'pc', 80, 'icecream 100', cook='raw', flags='s', note='One mess cup of vanilla ice cream')
D('Semiya kheer', 'katori', 150, 'milk 65, semiya 8, sugar 10, ghee 1.5, cashew 1, raisins 1', cook='boil', flags='s')
D('Fruit custard', 'katori', 150, 'milk 70, maida 3, sugar 8, mixfruit 20', cook='boil', flags='s', note='Custard powder is mostly corn starch; maida stands in')
D('Balushahi', 'pc', 70, 'maida 100, ghee 35, curd 10, oil 20, sugar 90', y=240, cook='fry', flags='s', note='Fried dough in sugar syrup')

# ============================== staples you bring yourself (not on the mess menu) ==============================
D('Soya chunks, dry', 'serving', 60, 'soya_chunks 100', cook='raw', note='Weigh them dry, before soaking. 100 g dry becomes about 250 g boiled')
D('Soya chunks, boiled', 'serving', 150, 'soya_chunks 38, water 62', cook='raw', note='Boiled and squeezed; about 38 g dry weight per 100 g')
D('Chicken breast, cooked', 'serving', 100, 'chbreast_lean 137', y=100, cook='raw', note='Weigh it after cooking (boiled or grilled, no oil). Lean skinless breast loses about 27 % of its weight when cooked')
D('Chicken breast, raw', 'serving', 100, 'chbreast_lean 100', cook='raw', note='Weigh it before cooking. This is the value your old "Boiled chicken (100 g)" entries used')
D('Egg, whole, raw', 'pc', 50, 'egg 100', cook='raw')
D('Egg bhurji', 'serving', 150, 'egg 70, onion 12, tomato 6, oil 6, masala .5, salt .5', cook='fry', note='Scrambled eggs with onion and tomato (about 2 eggs)')
D('Egg fried', 'pc', 55, 'egg 90, oil 10, salt .5', cook='fry', note='One fried egg')
D('Paneer, plain', 'serving', 100, 'paneer 100', cook='raw', note='Fresh paneer, uncooked')
D('Plant protein powder (1 scoop)', 'scoop', 33, 'plantprot 100', cook='raw', note='A typical 33 g scoop gives about 25 g of protein. Brands differ: put the numbers from your tub in Settings, Protein backup')
D('Protein bar (20 g protein)', 'bar', 60, 'proteinbar 100', cook='raw', note='Typical 60 g bar. Brands differ: add yours as a custom food from its label')
D('Protein bar (10 g protein)', 'bar', 40, 'proteinbar_s 100', cook='raw', note='Typical 40 g bar. Brands differ: add yours as a custom food from its label')
D('Whey protein (1 scoop)', 'scoop', 30, 'whey 100', cook='raw', note='A 30 g scoop of whey concentrate. Check your tub')
D('Peanut butter', 'tbsp', 16, 'groundnut 100, oil 3, sugar 3, salt 1', y=95, cook='raw', note='Roasted peanuts ground with a little oil, sugar and salt')
D('Peanuts, roasted', 'handful', 30, 'groundnut 106', y=100, cook='raw', note='Roasting drives off about 5 % of the weight')
D('Almonds', 'handful', 20, 'almond 100', cook='raw')
D('Roasted chana', 'handful', 30, 'chana 100', cook='raw', note='Dry roasted chickpeas')
D('Makhana, roasted', 'cup', 20, 'lotus 100', cook='raw')
D('Dates', '2 dates', 16, 'dates 100', cook='raw', flags='s')
D('Oats with milk', 'bowl', 250, 'oats 16, milk 80', y=100, cook='boil', note='40 g oats cooked in 200 ml toned milk')
D('Tuna, canned', 'can', 100, 'tuna_can 100', cook='raw', note='Canned in water, drained')
D('Sattu drink', 'glass', 250, 'chanadal 10, water 88, salt .4, cumin .3, lemon 1', cook='raw', note='Roasted gram flour drink (gram dal stands in for sattu)')
D('Peanut chikki', 'pc', 25, 'groundnut 60, jaggery 40', cook='raw', flags='s')

# ============================== fruit and drinks ==============================
for _n, _a, _u, _g in [('Apple', 'apple', 'pc', 150), ('Orange', 'orange', 'pc', 130), ('Grapes', 'grapes', 'cup', 100), ('Guava', 'guava', 'pc', 100), ('Pineapple', 'pineapple', 'cup', 150),
                       ('Mango', 'mango', 'pc', 150), ('Pomegranate', 'pomegranate', 'katori', 100), ('Sapota (chikoo)', 'sapota', 'pc', 100), ('Muskmelon', 'muskmelon', 'cup', 150)]:
    D(_n, _u, _g, _a + ' 100', cook='raw', note='Edible portion, without peel or seeds')
D('Coconut water', 'glass', 250, 'coconutwater 100', cook='raw')
D('Fresh juice (with sugar)', 'glass', 250, 'mixfruit 70, sugar 6, water 24', cook='raw', flags='s')
D('Lime soda (sweet)', 'glass', 250, 'lemon 3, sugar 7, water 90', cook='raw', flags='s')
D('Sweet lassi', 'glass', 250, 'curd 80, sugar 10, water 10', cook='raw', flags='s')

# ============================== outside food (typical restaurant portions, approximate) ==============================
D('Shawarma (full)', 'pc', 250, 'maida 22, chthigh 30, mayo 7, salad 12, oil 4, garlic 1, salt 1', y=100, cook='fry', flags='o', note='Wrap bread, chicken, garlic mayo and salad; restaurant portions vary a lot')
D('Alfaham (half)', 'half', 380, 'chthigh 62, oil 4, mayo 3, masala 1.5, salt 1', y=100, cook='fry', flags='o', note='Half a grilled chicken (about 175 g of cooked meat) with a little mayo, without the bread or rice')
D('Shake', 'glass', 300, 'milk 60, banana 15, icecream 12, sugar 8, almond 1, water 4', cook='raw', flags='so', note='Thick shake with ice cream; sugar content varies by shop')
D('Parotta', 'pc', 100, 'maida 62, oil 14, sugar 1, salt 1', y=100, cook='fry', flags='o', note='Layered Kerala parotta, about 300 kcal each')
D('Beef fry', 'katori', 120, 'beef 55, coconut 8, onion 8, oil 7, masala 2, salt .6', cook='fry', flags='o', note='Kerala beef fry')
D('Fried chicken (2 pc)', '2 pc', 180, 'chthigh 55, maida 12, oil 12, masala 1.5, salt 1', y=100, cook='fry', flags='o', note='Battered and deep fried')
D('Biscuits', '2 pc', 20, 'biscuit 100', cook='raw', flags='so', note='Two glucose or marie biscuits')
D('Soft drink', 'can', 330, 'softdrink 100', cook='raw', flags='so')
D('Chai + biscuits', 'plate', 170, 'dish:Tea (sugar) 85, biscuit 15', cook='raw', flags='so', note='A cup of sweet milk tea and three biscuits')
D('Samosa', 'pc', 70, 'maida 25, potato 28, peas 5, oil 18, masala 1, salt .6', y=100, cook='fry', flags='o', note='Deep-fried potato samosa')
D('Vada pav', 'pc', 130, 'dish:Pav 40, potato 35, oil 12, chanadal 5, masala 1, salt .8', y=100, cook='fry', flags='o')
D('Veg momos (6 pc)', 'plate', 180, 'maida 35, cabbage 22, carrot 8, onion 6, oil 3, garlic 1, salt .8', y=100, cook='steam', flags='o', note='Steamed')
D('Chicken momos (6 pc)', 'plate', 180, 'maida 35, chcurry 25, onion 8, oil 3, garlic 1, salt .8', y=100, cook='steam', flags='o', note='Steamed')
D('Maggi noodles (1 pack)', 'pack', 70, 'maida 77, oil 14, salt 3, masala 2', y=100, cook='raw', flags='o', note='One 70 g pack of instant noodles with the tastemaker: about 310 kcal')
D('French fries', 'serving', 120, 'potato 100, oil 16, salt 1', y=100, cook='fry', flags='o', note='Deep fried potato')
D('Chicken biryani (Calicut)', 'plate', 350, 'rice 27, chcurry 20, ghee 3, oil 3, onion 6, curd 2, masala 1.5, raisins .5, cashew .5, salt .6', cook='fry', flags='o', note='Malabar-style biryani, a little more ghee than the mess version')
D('Chicken fried rice', 'plate', 300, 'rice 29, chcurry 12, egg 6, oil 6, mixveg 6, garlic 1, salt 1', cook='fry', flags='o')
D('Egg roll', 'pc', 180, 'maida 28, egg 25, onion 8, oil 8, salad 5, salt .8', y=100, cook='fry', flags='o')
D('Chicken roll', 'pc', 200, 'maida 28, chcurry 22, onion 8, oil 7, mayo 3, salad 4, salt .8', y=100, cook='fry', flags='o')
D('Veg sandwich', 'pc', 150, 'dish:Bread 50, cucumber 8, tomato 8, potato 10, butter 6, mayo 8, salt .5', y=100, cook='raw', flags='o')
D('Pizza slice', 'slice', 110, 'maida 36, paneer 14, tomato 8, capsicum 5, oil 4, ghee 3, salt 1', y=100, cook='raw', flags='o', note='Cheese is counted as paneer; real pizza cheese is a little fattier')
D('Appam', 'pc', 70, 'rice 30, coconut 8, sugar 2, salt .4', cook='steam', note='Kerala appam')
D('Puttu', 'serving', 120, 'rice 40, coconut 10, salt .5', cook='steam', note='Steamed rice and coconut cylinders')
D('Pazham pori', 'pc', 80, 'banana 55, maida 22, oil 12, sugar 3, salt .2', y=100, cook='fry', flags='o', note='Banana fritter')
D('Banana chips', 'handful', 30, 'banana 100, coconutoil 28, salt 1', y=60, cook='fry', flags='o', note='Fried in coconut oil')
D('Unniyappam', 'pc', 30, 'rice 35, jaggery 18, coconut 5, banana 8, oil 10, salt .2', y=100, cook='fry', flags='so')
