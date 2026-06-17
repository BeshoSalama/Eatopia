import random

# ==========================================
# SMART FOOD GENERATOR
# Egyptian + Global + Diet Friendly
# ==========================================

# -------------------------
# Proteins
# -------------------------
PROTEINS = [
    "chicken_breast",
    "grilled_chicken",
    "turkey",
    "lean_beef",
    "tuna",
    "salmon",
    "shrimp",
    "white_fish",
    "boiled_eggs",
    "egg_whites",
    "greek_yogurt",
    "cottage_cheese",
    "low_fat_cheese",
    "lentils",
    "fava_beans",
    "tofu"
]

# -------------------------
# Carbs
# -------------------------
CARBS = [
    "rice",
    "brown_rice",
    "basmati_rice",
    "quinoa",
    "oats",
    "sweet_potato",
    "potato",
    "whole_wheat_pasta",
    "pasta",
    "baladi_bread",
    "whole_wheat_bread",
    "toast",
    "corn",
    "beans"
]

# -------------------------
# Vegetables
# -------------------------
VEGETABLES = [
    "salad",
    "cucumber",
    "tomato",
    "spinach",
    "broccoli",
    "zucchini",
    "molokhia",
    "green_beans",
    "lettuce",
    "peas",
    "carrot",
    "cauliflower",
    "pepper"
]

# -------------------------
# Healthy fats
# -------------------------
FATS = [
    "olive_oil",
    "nuts",
    "almonds",
    "peanut_butter",
    "avocado",
    "chia"
]

# -------------------------
# Fruits / snacks
# -------------------------
FRUITS = [
    "banana",
    "apple",
    "orange",
    "berries",
    "dates"
]


# ==========================================
# MACRO GENERATOR
# ==========================================
def generate_macros(goal, meal_type="meal"):

    # --------------------------
    # Lose weight
    # --------------------------
    if goal == "lose_weight":

        if meal_type == "snack":
            cal = random.randint(100, 220)
            protein = random.randint(8, 18)
            carbs = random.randint(8, 25)
            fat = random.randint(3, 10)

        else:
            cal = random.randint(250, 450)
            protein = random.randint(20, 45)
            carbs = random.randint(15, 40)
            fat = random.randint(5, 15)

    # --------------------------
    # Gain muscle
    # --------------------------
    elif goal == "gain_muscle":

        if meal_type == "snack":
            cal = random.randint(220, 400)
            protein = random.randint(12, 28)
            carbs = random.randint(20, 45)
            fat = random.randint(5, 15)

        else:
            cal = random.randint(450, 800)
            protein = random.randint(30, 60)
            carbs = random.randint(40, 95)
            fat = random.randint(10, 22)

    # --------------------------
    # Maintain
    # --------------------------
    else:

        if meal_type == "snack":
            cal = random.randint(150, 280)
            protein = random.randint(8, 20)
            carbs = random.randint(15, 35)
            fat = random.randint(4, 12)

        else:
            cal = random.randint(320, 620)
            protein = random.randint(20, 45)
            carbs = random.randint(25, 70)
            fat = random.randint(8, 18)

    return {
        "calories": cal,
        "protein": protein,
        "carbs": carbs,
        "fat": fat
    }


# ==========================================
# CREATE ONE MEAL
# ==========================================
def create_meal(goal, meal_type="meal"):

    # snack meals
    if meal_type == "snack":

        options = [
            random.choice(FRUITS),
            random.choice(FRUITS) + "_" + random.choice(FATS),
            random.choice(["greek_yogurt", "cottage_cheese"]),
            random.choice(FRUITS) + "_yogurt"
        ]

        name = random.choice(options)

    # main meals
    else:
        protein = random.choice(PROTEINS)
        carb = random.choice(CARBS)
        veg = random.choice(VEGETABLES)

        extra = ""

        if random.random() < 0.45:
            extra = "_" + random.choice(FATS)

        name = protein + "_" + carb + "_" + veg + extra

    macros = generate_macros(goal, meal_type)

    return {
        "food": name,
        **macros
    }


# ==========================================
# GENERATE FOOD POOL
# ==========================================
def generate_food_pool(goal, size=2000):

    pool = []
    used = set()

    while len(pool) < size:

        meal_type = random.choice(
            ["meal", "meal", "meal", "snack"]
        )

        meal = create_meal(goal, meal_type)

        if meal["food"] not in used:
            used.add(meal["food"])
            pool.append(meal)

    return pool