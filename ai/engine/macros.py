def calculate_macros(weight, goal, activity_level="moderate", age=None, height=None):
    """
    Advanced macro calculator (TDEE-based + smart adjustment)
    """

    # =========================
    # 1. Base BMR approximation
    # =========================
    bmr = weight * 22  # simplified safe baseline

    # =========================
    # 2. Activity multiplier
    # =========================
    activity_multiplier = {
        "sedentary": 1.2,
        "light": 1.375,
        "moderate": 1.55,
        "active": 1.725
    }.get(activity_level, 1.55)

    tdee = bmr * activity_multiplier

    # =========================
    # 3. Goal adjustment (IMPORTANT FIX)
    # =========================
    if goal in ["lose_weight", "cut"]:
        calories = tdee * 0.80   # 🔥 20% deficit (healthy fat loss)

    elif goal in ["gain_muscle", "bulk"]:
        calories = tdee * 1.15   # 🔥 lean bulk

    else:
        calories = tdee          # maintenance

    # =========================
    # 4. Protein logic
    # =========================
    if goal in ["gain_muscle", "bulk"]:
        protein = weight * 2.2
    else:
        protein = weight * 1.6

    # =========================
    # 5. Fat logic (stable range)
    # =========================
    fat = calories * 0.25 / 9

    # =========================
    # 6. Carbs (remaining calories)
    # =========================
    carbs = (calories - (protein * 4 + fat * 9)) / 4

    # =========================
    # 7. Safety constraints (smart)
    # =========================
    calories = max(1200, calories)
    protein = max(60, protein)
    fat = max(25, fat)
    carbs = max(50, carbs)

    return {
        "calories": round(calories),
        "protein": round(protein),
        "carbs": round(carbs),
        "fat": round(fat)
    }