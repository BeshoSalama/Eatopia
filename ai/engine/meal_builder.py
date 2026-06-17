import random
from engine.portion_engine import scale_food
from engine.meal_templates import MEAL_TEMPLATES

def build_meal(meal_type, food_db, target):
    foods = MEAL_TEMPLATES[meal_type]
    selected = random.sample(foods, 2)

    meal = []
    total = {"cal":0, "protein":0, "carbs":0, "fat":0}

    for food_name in selected:
        food = food_db[food_name]
        qty = random.choice([100, 150, 200]) if food_name not in ["egg"] else random.choice([1,2])

        macros = scale_food(food, qty)

        for k in total:
            total[k] += macros[k]

        meal.append({
            "food": food_name,
            "quantity": qty,
            "macros": macros
        })

    return meal, total