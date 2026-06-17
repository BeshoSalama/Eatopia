import json

from engine.macros import calculate_macros
from engine.meal_generator import generate_day, generate_week
from engine.analysis import analyze_meal

def clean_food_name(name):

    parts = name.split("_")

    # حذف breakfast / lunch / dinner
    if parts[0] in ["breakfast", "lunch", "dinner"]:
        parts = parts[1:]

    # حذف الرقم الأخير
    if parts[-1].isdigit():
        parts = parts[:-1]

    return " ".join(parts).title()
# =====================================
# TITLE
# =====================================

print("=" * 60)
print("SMART FOOD AI SYSTEM")
print("=" * 60)


# =====================================
# READ FEATURE ONE OUTPUT
# =====================================

try:

    with open(
        "feature_output.json",
        "r",
        encoding="utf-8"
    ) as f:

        meal_total = json.load(f)

except Exception as e:

    print("Error loading feature_output.json")
    print(e)
    exit()


dish_label = meal_total.get(
    "dish",
    "unknown_food"
)


# =====================================
# DISPLAY FEATURE ONE RESULT
# =====================================

print("\nFOOD IMAGE ANALYSIS")
print("-" * 60)

print("\nDetected Food:")
print("-", dish_label)

print("\nIngredients:")

for item in meal_total.get(
    "ingredients",
    []
):
    print("-", item)

print("\nFEATURE ONE (NUTRITION)")
print("-" * 60)

print(
    "Calories:",
    meal_total.get(
        "calories",
        0
    )
)

print(
    "Protein:",
    meal_total.get(
        "protein",
        0
    )
)

print(
    "Carbs:",
    meal_total.get(
        "carbs",
        0
    )
)

print(
    "Fat:",
    meal_total.get(
        "fat",
        0
    )
)

print(
    "Sodium_mg:",
    meal_total.get(
        "sodium_mg",
        0
    )
)

print(
    "Added_sugars:",
    meal_total.get(
        "added_sugars",
        0
    )
)


# =====================================
# USER DATA
# =====================================

print("\n" + "=" * 60)
print("USER DATA")
print("=" * 60)

age = int(
    input("Age: ")
)

gender = input(
    "Gender (male/female): "
).strip().lower()

weight = float(
    input(
        "Weight (kg): "
    )
)

height = float(
    input(
        "Height (cm): "
    )
)

activity = input(
    "Activity (sedentary/light/moderate/active): "
).strip().lower()

goal = input(
    "Goal (lose_weight/maintain/gain_muscle): "
).strip().lower()


# =====================================
# VALIDATION
# =====================================

valid_goals = [
    "lose_weight",
    "maintain",
    "gain_muscle"
]

valid_activity = [
    "sedentary",
    "light",
    "moderate",
    "active"
]

if goal not in valid_goals:
    goal = "maintain"

if activity not in valid_activity:
    activity = "moderate"

# المشروع هيشتغل على 3 وجبات
meals_per_day = 3


# =====================================
# PROFILE
# =====================================

class Profile:

    def __init__(
        self,
        age,
        gender,
        weight,
        height,
        activity,
        goal,
        meals_per_day
    ):

        self.age = age
        self.gender = gender
        self.weight = weight
        self.height = height
        self.activity = activity
        self.goal = goal
        self.meals_per_day = meals_per_day


profile = Profile(
    age,
    gender,
    weight,
    height,
    activity,
    goal,
    meals_per_day
)


# =====================================
# TARGET MACROS
# =====================================

target = calculate_macros(
    weight,
    goal,
    activity
)

print("\n" + "=" * 60)
print("TARGET MACROS")
print("=" * 60)

print(
    "Goal:",
    goal
)

print(
    "Calories:",
    target["calories"]
)

print(
    "Protein:",
    target["protein"]
)

print(
    "Carbs:",
    target["carbs"]
)

print(
    "Fat:",
    target["fat"]
)

# =====================================
# DAILY PLAN
# =====================================

day_plan = generate_day(profile)

print("\n" + "=" * 60)
print("DAILY DIET PLAN")
print("=" * 60)

for meal_name, items in day_plan.items():

    print(f"\n{meal_name.upper()}")
    print("-" * 40)

    for item in items:

        parts = item["food"].split("_")

        if parts[0] in ["breakfast", "lunch", "dinner"]:
            parts = parts[1:]

        if parts[-1].isdigit():
            parts = parts[:-1]

        food_name = " ".join(parts).title()

        print(f"Food      : {food_name}")
        print(f"Calories : {item['calories']} kcal")
        print(f"Protein  : {item['protein']} g")
        print(f"Carbs    : {item['carbs']} g")
        print(f"Fat      : {item['fat']} g")
        print()
# =====================================
# WEEKLY PLAN
# =====================================

week_plan = generate_week(profile)

print("\n" + "=" * 60)
print("WEEKLY DIET PLAN")
print("=" * 60)

for day_name, meals in week_plan.items():

    print(f"\n{'=' * 20}")
    print(f"{day_name}")
    print(f"{'=' * 20}")

    for meal_name, items in meals.items():

        print(f"\n{meal_name.upper()}")
        print("-" * 30)

        for item in items:

            parts = item["food"].split("_")

            if parts[0] in ["breakfast", "lunch", "dinner"]:
                parts = parts[1:]

            if parts[-1].isdigit():
                parts = parts[:-1]

            food_name = " ".join(parts).title()

            print(food_name)

            print(
                f"Calories: {item['calories']} kcal"
            )

            print(
                f"Protein : {item['protein']} g"
            )

            print(
                f"Carbs   : {item['carbs']} g"
            )

            print(
                f"Fat     : {item['fat']} g"
            )

            print()
# =====================================
# MEAL ANALYSIS
# =====================================

print("\n" + "=" * 60)
print("MEAL ANALYSIS")
print("=" * 60)

base_plan = {

    "diet": goal,

    "calories":
    target["calories"],

    "why":
    "Feature One + Macro System"
}

analysis = analyze_meal(

    profile,

    base_plan,

    meal_total,

    dish_label
)


# =====================================
# RESULT
# =====================================

print("\n" + "=" * 60)
print("RESULT")
print("=" * 60)

print(
    "Dish:",
    dish_label
)

print(
    "Suggested diet:",
    analysis.get(
        "diet",
        "maintain"
    )
)

print(
    "Daily calories target:",
    analysis.get(
        "daily_calories_target",
        0
    )
)

print(
    "Meal calories limit:",
    analysis.get(
        "meal_calories_limit",
        0
    )
)

print("\nUpdates:")

for u in analysis.get(
    "updates",
    []
):
    print("-", u)

print("\nWhy:")

for w in analysis.get(
    "why",
    []
):
    print("-", w)


# =====================================
# FINAL CHECK
# =====================================

if meal_total.get(
    "calories",
    0
) <= analysis.get(
    "meal_calories_limit",
    999999
):

    print(
        "\nMeal fits your plan"
    )

else:

    print(
        "\nMeal exceeds your plan"
    )