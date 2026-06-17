from engine.meal_generator import generate_day

def generate_week(goal):
    return {
        day:  generate_day(goal)
        for day in ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"]
    }