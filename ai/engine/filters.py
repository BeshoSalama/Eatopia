def food_filter(goal):
    """
    Smart filter based on user goal
    Uses:
    calories, protein, carbs, fat
    Supports old keys: cal
    """

    def calories(food):
        return food.get("calories", food.get("cal", 0))

    def protein(food):
        return food.get("protein", 0)

    def carbs(food):
        return food.get("carbs", 0)

    def fat(food):
        return food.get("fat", 0)

    # ==================================
    # 🔴 LOSE WEIGHT
    # Low calories + high protein
    # ==================================
    if goal == "lose_weight":
        return lambda food: (
            calories(food) <= 450 and
            protein(food) >= 12 and
            fat(food) <= 18
        )

    # ==================================
    # 🟢 GAIN MUSCLE
    # Higher calories + strong protein
    # ==================================
    if goal == "gain_muscle":
        return lambda food: (
            calories(food) >= 250 and
            protein(food) >= 18 and
            carbs(food) >= 15
        )

    # ==================================
    # 🟡 MAINTAIN
    # Balanced foods only
    # ==================================
    return lambda food: (
        150 <= calories(food) <= 650 and
        protein(food) >= 8
    )