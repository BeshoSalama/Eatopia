def analyze_meal(profile, base_plan, meal_total, dish_label):
    diet = base_plan["diet"]
    calories = base_plan["calories"]

    meal_cal_limit = calories / max(profile.meals_per_day, 1)

    high_carb = meal_total.get("carbs", 0) > 60
    high_fat = meal_total.get("fat", 0) > 25
    high_sodium = meal_total.get("sodium_mg", 0) > 800

    updates = []
    why = [base_plan["why"]]

    if high_sodium:
        diet = "Low Sodium"
        updates.append("Switch → Low Sodium")

    if profile.goal == "lose_weight" and high_carb:
        diet = "Weight Loss Low Carb"
        updates.append("Low Carb needed")

    if profile.goal == "gain_muscle" and meal_total.get("protein", 0) < 25:
        diet = "High Protein"
        updates.append("Increase protein")

    return {
        "dish": dish_label,
        "meal_total": meal_total,
        "base_diet_plan": base_plan["diet"],
        "base_reason": base_plan["why"],
        "diet": diet,
        "daily_calories_target": calories,
        "meal_calories_limit": meal_cal_limit,
        "updates": updates,
        "why": why,
        "Dish": dish_label,
        "Meal total": meal_total,
        "Base diet plan": base_plan["diet"],
        "Base reason": base_plan["why"],
        "Final suggested diet": diet,
        "Daily calories target": calories,
        "Meal calories limit": meal_cal_limit,
        "Updates": updates,
        "Why": why
    }
