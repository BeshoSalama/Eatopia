import json
import random
from engine.meal_templates import MEAL_TEMPLATES

# ===============================
# Load DB
# ===============================
with open("dataa/food_db.json", encoding="utf-8") as f:
    FOOD_DB = json.load(f)


# ===============================
# Templates
# ===============================
def get_goal_templates(goal):
    return MEAL_TEMPLATES.get(
        goal,
        MEAL_TEMPLATES["maintain"]
    )


# ===============================
# Validation
# ===============================
def is_valid(goal, macros):

    cal = macros.get("calories", 0)
    protein = macros.get("protein", 0)
    fat = macros.get("fat", 0)

    if goal == "lose_weight":
        return (
            cal <= 500 and
            protein >= 10 and
            fat <= 18
        )

    elif goal == "gain_muscle":
        return (
            protein >= 18 and
            cal >= 300
        )

    return True


# ===============================
# Detect protein source
# ===============================
def detect_main_source(name):

    name = name.lower()

    if "chicken" in name:
        return "chicken"

    if "beef" in name:
        return "beef"

    if "fish" in name or "tuna" in name or "salmon" in name:
        return "fish"

    if "egg" in name:
        return "egg"

    if "lentil" in name or "beans" in name:
        return "plant"

    return "other"


# ===============================
# Smart Pick
# ===============================
def pick_food(
    goal,
    foods,
    used_foods,
    used_sources
):

    candidates = []

    for food in foods:

        if food not in FOOD_DB:
            continue

        item = FOOD_DB[food]

        if not is_valid(goal, item):
            continue

        source = detect_main_source(food)

        score = 100

        # منع التكرار
        if food in used_foods:
            score -= 100

        # تقليل تكرار نفس البروتين
        if source in used_sources:
            score -= 30

        # دايت
        if goal == "lose_weight":
            score += item.get("protein", 0) * 2
            score -= item.get("fat", 0)
            score -= item.get("calories", 0) / 20

        # بناء عضل
        elif goal == "gain_muscle":
            score += item.get("protein", 0) * 2
            score += item.get("carbs", 0)

        # المحافظة
        else:
            score += item.get("protein", 0)

        candidates.append({
            "food": food,
            **item,
            "source": source,
            "score": score
        })

    # fallback
    if not candidates:

        for food, item in FOOD_DB.items():

            if food in used_foods:
                continue

            candidates.append({
                "food": food,
                **item,
                "source": detect_main_source(food),
                "score": 50
            })

    candidates.sort(
        key=lambda x: x["score"],
        reverse=True
    )

    top = candidates[:10]

    chosen = random.choice(top)

    used_foods.add(
        chosen["food"]
    )

    used_sources.add(
        chosen["source"]
    )

    return [chosen]


# ===============================
# Generate Day
# ===============================
def generate_day(profile):

    templates = get_goal_templates(
        profile.goal
    )

    used_foods = set()
    used_sources = set()

    meals = {}

    for meal in [
        "breakfast",
        "lunch",
        "dinner"
    ]:

        meals[meal] = pick_food(
            profile.goal,
            templates.get(meal, []),
            used_foods,
            used_sources
        )

    return meals


# ===============================
# Generate Week
# ===============================
def generate_week(profile):

    week = {}

    global_used = set()
    global_sources = set()

    for day in [
        "Sat",
        "Sun",
        "Mon",
        "Tue",
        "Wed",
        "Thu",
        "Fri"
    ]:

        meals = {}

        templates = get_goal_templates(
            profile.goal
        )

        for meal in [
            "breakfast",
            "lunch",
            "dinner"
        ]:

            meals[meal] = pick_food(
                profile.goal,
                templates.get(meal, []),
                global_used,
                global_sources
            )

        week[day] = meals

    return week