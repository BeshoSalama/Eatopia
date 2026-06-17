import json
import random

foods = {}

proteins = [
    ("grilled_chicken", 165, 31, 0, 3.6),
    ("tuna", 140, 28, 0, 1),
    ("boiled_eggs", 78, 6, 0.6, 5),
    ("greek_yogurt", 100, 17, 6, 0),
    ("lean_beef", 220, 26, 0, 10),
    ("salmon", 208, 22, 0, 13),
    ("cottage_cheese", 98, 11, 3, 4),
]

carbs = [
    ("rice", 205, 4, 45, 0.4),
    ("sweet_potato", 112, 2, 26, 0),
    ("oats", 150, 5, 27, 3),
    ("baladi_bread", 170, 6, 35, 1),
    ("pasta", 220, 8, 43, 1),
    ("quinoa", 120, 4, 21, 2),
]

veggies = [
    ("salad", 40, 2, 8, 0),
    ("broccoli", 55, 4, 11, 0.5),
    ("molokhia", 60, 5, 9, 1),
    ("zucchini", 33, 2, 6, 0),
    ("spinach", 23, 3, 4, 0),
]

healthy_fats = [
    ("olive_oil", 119, 0, 0, 13.5),
    ("avocado", 160, 2, 9, 15),
    ("nuts", 170, 6, 6, 15),
]

meals = ["breakfast", "lunch", "dinner"]

count = 0

for i in range(2200):

    p = random.choice(proteins)
    c = random.choice(carbs)
    v = random.choice(veggies)
    f = random.choice(healthy_fats)

    meal = random.choice(meals)

    calories = round(p[1] + c[1] + v[1] + random.randint(0, 50))
    protein = round(p[2] + c[2] + v[2], 1)
    carbs_v = round(p[3] + c[3] + v[3], 1)
    fat = round(p[4] + c[4] + v[4] + random.uniform(0, 5), 1)

    name = f"{meal}_{p[0]}_{c[0]}_{v[0]}_{i}"

    foods[name] = {
        "calories": calories,
        "protein": protein,
        "carbs": carbs_v,
        "fat": fat
    }

with open("dataa/food_db.json", "w", encoding="utf-8") as f:
    json.dump(foods, f, indent=4)

print("✅ Generated 2200 foods successfully!")