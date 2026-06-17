import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import "./RecipesPage.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ConfirmDialog from "../components/ConfirmDialog";
import egyptianRecipesSeed from "../data/egyptianRecipesSeed.json";
import axios from "axios";
import { API_BASE_URL, resolveMediaUrl } from "../config/api";
import { getStoredUser, isAdminRole } from "../services/roleAccess";
import {
  FiBookmark,
  FiBookOpen,
  FiCheck,
  FiClock,
  FiEdit2,
  FiHeart,
  FiSearch,
  FiTrash2,
  FiX,
} from "react-icons/fi";

const fallbackImage =
  "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=1200";

const RECIPES_PER_PAGE = 9;
const TARGET_RECIPE_COUNT = 200;

const MEAT_KEYWORDS = [
  "chicken",
  "turkey",
  "salmon",
  "shrimp",
  "tuna",
  "cod",
  "tilapia",
  "beef",
  "fish",
  "meat",
  "meatball",
  "kebab",
  "steak",
  "seafood",
];

const VEGETABLE_MAIN_KEYWORDS = [
  "vegetable",
  "veggie",
  "salad",
  "broccoli",
  "mushroom",
  "eggplant",
  "cauliflower",
  "zucchini",
  "spinach",
  "kale",
  "lentil",
  "chickpea",
  "bean",
  "hummus",
  "falafel",
  "tofu",
  "sweet potato",
  "brussels",
  "sprout",
  "asparagus",
  "minestrone",
  "roasted pepper",
  "green bean",
  "cabbage",
  "carrot ginger",
];

const NON_VEGETABLE_MAIN_KEYWORDS = [
  "shakshuka",
  "egg",
  "omelet",
  "scramble",
  "yogurt",
  "parfait",
  "cottage",
  "oat",
  "oatmeal",
  "toast",
  "sandwich",
  "smoothie",
  "chia",
  "chicken",
  "turkey",
  "salmon",
  "shrimp",
  "tuna",
  "cod",
  "tilapia",
  "beef",
  "fish",
  "meatball",
  "kebab",
  "steak",
];

const recipeImages = {
  chicken:
    "https://images.pexels.com/photos/410648/pexels-photo-410648.jpeg?auto=compress&cs=tinysrgb&w=1200",
  salad:
    "https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=1200",
  salmon:
    "https://images.pexels.com/photos/3296277/pexels-photo-3296277.jpeg?auto=compress&cs=tinysrgb&w=1200",
  yogurt:
    "https://images.pexels.com/photos/1092730/pexels-photo-1092730.jpeg?auto=compress&cs=tinysrgb&w=1200",
  wrap:
    "https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=1200",
  soup:
    "https://images.pexels.com/photos/539451/pexels-photo-539451.jpeg?auto=compress&cs=tinysrgb&w=1200",
  shrimp:
    "https://images.pexels.com/photos/725991/pexels-photo-725991.jpeg?auto=compress&cs=tinysrgb&w=1200",
  peppers:
    "https://images.pexels.com/photos/1437267/pexels-photo-1437267.jpeg?auto=compress&cs=tinysrgb&w=1200",
  eggs:
    "https://images.pexels.com/photos/824635/pexels-photo-824635.jpeg?auto=compress&cs=tinysrgb&w=1200",
  bowl:
    "https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg?auto=compress&cs=tinysrgb&w=1200",
  tuna:
    "https://images.pexels.com/photos/3763847/pexels-photo-3763847.jpeg?auto=compress&cs=tinysrgb&w=1200",
  tofu:
    "https://images.pexels.com/photos/5848486/pexels-photo-5848486.jpeg?auto=compress&cs=tinysrgb&w=1200",
  fish:
    "https://images.pexels.com/photos/262959/pexels-photo-262959.jpeg?auto=compress&cs=tinysrgb&w=1200",
  oats:
    "https://images.pexels.com/photos/704569/pexels-photo-704569.jpeg?auto=compress&cs=tinysrgb&w=1200",
  beef:
    "https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=1200",
  cottage:
    "https://images.pexels.com/photos/5946720/pexels-photo-5946720.jpeg?auto=compress&cs=tinysrgb&w=1200",
  rice:
    "https://images.pexels.com/photos/723198/pexels-photo-723198.jpeg?auto=compress&cs=tinysrgb&w=1200",
  zucchini:
    "https://images.pexels.com/photos/1438672/pexels-photo-1438672.jpeg?auto=compress&cs=tinysrgb&w=1200",
  miso:
    "https://images.pexels.com/photos/5409751/pexels-photo-5409751.jpeg?auto=compress&cs=tinysrgb&w=1200",
  sprouts:
    "https://images.pexels.com/photos/1435904/pexels-photo-1435904.jpeg?auto=compress&cs=tinysrgb&w=1200",
  hummus:
    "https://images.pexels.com/photos/1618898/pexels-photo-1618898.jpeg?auto=compress&cs=tinysrgb&w=1200",
  falafel:
    "https://images.pexels.com/photos/6275162/pexels-photo-6275162.jpeg?auto=compress&cs=tinysrgb&w=1200",
  sweetpotato:
    "https://images.pexels.com/photos/89247/pexels-photo-89247.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ceviche:
    "https://images.pexels.com/photos/566566/pexels-photo-566566.jpeg?auto=compress&cs=tinysrgb&w=1200",
  eggplant:
    "https://images.pexels.com/photos/1435895/pexels-photo-1435895.jpeg?auto=compress&cs=tinysrgb&w=1200",
  minestrone:
    "https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=1200",
  avocado:
    "https://images.pexels.com/photos/566566/pexels-photo-566566.jpeg?auto=compress&cs=tinysrgb&w=1200",
  sandwich:
    "https://images.pexels.com/photos/1603901/pexels-photo-1603901.jpeg?auto=compress&cs=tinysrgb&w=1200",
  smoothie:
    "https://images.pexels.com/photos/775032/pexels-photo-775032.jpeg?auto=compress&cs=tinysrgb&w=1200",
};

const getToken = () => localStorage.getItem("token");
const authHeaders = () => ({ headers: { Authorization: `Bearer ${getToken()}` } });

const linesToJson = (value) => JSON.stringify(
  String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
);

const parseCalories = (value) => {
  const match = String(value || "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
};

const toPositiveNumber = (value, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : fallback;
};

const clampMealGrams = (value, fallback = 100) => {
  const grams = toPositiveNumber(value, fallback);
  return Math.min(2000, Math.max(1, Math.round(grams)));
};

const scaleNutritionByGrams = (nutrition = {}, grams = 100) => {
  const factor = clampMealGrams(grams) / 100;
  return {
    calories: Math.round((Number(nutrition.calories) || 0) * factor),
    protein: Math.round((Number(nutrition.protein) || 0) * factor),
    carbs: Math.round((Number(nutrition.carbs) || 0) * factor),
    fats: Math.round((Number(nutrition.fats) || 0) * factor),
  };
};

const calculateDietPlanGrams = (recipe, targetCalories, targetProtein) => {
  const caloriesTarget = toPositiveNumber(targetCalories, 0);
  const proteinTarget = toPositiveNumber(targetProtein, 0);

  if (caloriesTarget && recipe?.nutrition?.calories) {
    return clampMealGrams((caloriesTarget / recipe.nutrition.calories) * 100);
  }

  if (proteinTarget && recipe?.nutrition?.protein) {
    return clampMealGrams((proteinTarget / recipe.nutrition.protein) * 100);
  }

  return 100;
};

const findRecipeByQuery = (recipes, query) => {
  const search = String(query || "").trim();
  if (!search) return null;

  const normalized = normalizeRecipeName(search);
  return (
    recipes.find((recipe) => normalizeRecipeName(recipe.name) === normalized) ||
    recipes.find((recipe) => normalizeRecipeName(recipe.name).includes(normalized)) ||
    recipes.find((recipe) => matchesTokenSearch(recipe, search))
  );
};

const parseTimelineMinutes = (title, fallback) => {
  const match = String(title || "").match(/about\s+(\d+)/i);
  return match ? Number(match[1]) : fallback;
};

const mapSeedTimeline = (timeline = []) =>
  timeline.map((step, index) => ({
    title: String(step.title || `Step ${index + 1}`).split("/")[0].trim() || `Step ${index + 1}`,
    text: step.text || "",
    minutes: parseTimelineMinutes(step.title, index === 0 ? 10 : 5),
  }));

const mapEgyptianSeedRecipe = (recipe) => {
  const nutrition = recipe.nutrition || {};
  const steps = mapSeedTimeline(recipe.cookingTimeline || []);

  return {
    name: recipe.title,
    image: recipe.image,
    calories: `${nutrition.kcal || 0} kcal`,
    desc: recipe.shortDescription || recipe.meaning || recipe.whyThisRecipe || "Authentic Egyptian recipe.",
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
    directions: steps.map((step) => step.text).join(" "),
    category: recipe.tags?.includes("Vegetarian") ? "Vegetables" : "",
    servings: recipe.defaultServings || 4,
    seedNutrition: nutrition,
    seedTags: recipe.tags || [],
    seedStory: recipe.whyThisRecipe || recipe.meaning || recipe.shortDescription,
    seedSubstitutions: recipe.ingredientSwaps || [],
    seedSteps: steps,
    seedChefTip: recipe.chefTip,
    seedHealthTip: recipe.healthTip,
    seedMood: recipe.mealMood,
    seedDifficulty: nutrition.level,
    source: "egyptian-seed",
  };
};

const baseRecipesData = [
  {
    name: "Ful Medames Bowl",
    image: recipeImages.hummus,
    calories: "330 kcal",
    desc: "A lighter Egyptian fava bean bowl with lemon, cumin, vegetables, and a controlled bread portion.",
    ingredients: [
      "1 cup cooked fava beans",
      "1 tsp olive oil",
      "1 tbsp lemon juice",
      "1/2 tsp cumin",
      "1/2 tomato",
      "1/2 cucumber",
      "1/2 small baladi bread",
    ],
    directions:
      "Warm the fava beans with cumin and a splash of water. Mash lightly, finish with lemon and olive oil, then serve with tomato, cucumber, and baladi bread.",
  },
  {
    name: "Molokhia Chicken Bowl",
    image: recipeImages.chicken,
    calories: "470 kcal",
    desc: "Classic molokhia balanced with grilled chicken and a measured rice serving.",
    ingredients: [
      "1 cup molokhia",
      "120g grilled chicken breast",
      "1/2 cup cooked rice",
      "1 garlic clove",
      "1 tsp coriander",
      "1 tsp olive oil",
      "Lemon juice",
    ],
    directions:
      "Simmer molokhia until smooth. Toast garlic and coriander in olive oil, stir into the molokhia, and serve with grilled chicken, rice, and lemon.",
  },
  {
    name: "Light Koshari Bowl",
    image: recipeImages.rice,
    calories: "520 kcal",
    desc: "A portion-controlled koshari bowl with lentils, rice, chickpeas, tomato sauce, and crispy onions kept light.",
    ingredients: [
      "1/2 cup cooked rice",
      "1/2 cup cooked lentils",
      "1/4 cup chickpeas",
      "1/3 cup tomato sauce",
      "1 tbsp crispy onions",
      "Garlic vinegar",
      "Chili flakes",
    ],
    directions:
      "Layer rice, lentils, and chickpeas. Add warm tomato sauce, garlic vinegar, chili, and a small spoon of crispy onions before serving.",
  },
  {
    name: "Taameya Salad Plate",
    image: recipeImages.falafel,
    calories: "360 kcal",
    desc: "Egyptian taameya served over salad with tahini yogurt instead of a heavy sandwich.",
    ingredients: [
      "3 baked taameya patties",
      "2 cups lettuce",
      "1 tomato",
      "1 cucumber",
      "1 tbsp tahini",
      "2 tbsp Greek yogurt",
      "Lemon juice",
    ],
    directions:
      "Bake or air-fry the taameya until crisp. Mix tahini, yogurt, and lemon, then serve the patties over chopped salad with the sauce.",
  },
  {
    name: "Egyptian Egg Tomato Skillet",
    image: recipeImages.eggs,
    calories: "300 kcal",
    desc: "A quick Egyptian-style egg and tomato skillet with cumin, parsley, and a small bread portion.",
    ingredients: [
      "2 eggs",
      "1 tomato",
      "1/4 onion",
      "1 garlic clove",
      "1 tsp olive oil",
      "Cumin",
      "Parsley",
    ],
    directions:
      "Cook onion, garlic, and tomato with cumin until saucy. Crack in the eggs, cover until set, and finish with parsley.",
  },
  {
    name: "Low-Fat Cheese Baladi Plate",
    image: recipeImages.cottage,
    calories: "290 kcal",
    desc: "Low-fat cheese with cucumber, tomato, mint, and a controlled baladi bread serving.",
    ingredients: [
      "120g low-fat cheese",
      "1/2 small baladi bread",
      "1 cucumber",
      "1 tomato",
      "Fresh mint",
      "Black pepper",
    ],
    directions:
      "Plate the cheese with cucumber, tomato, mint, and black pepper. Serve with a small baladi bread portion.",
  },
  {
    name: "Egyptian Lentil Soup",
    image: recipeImages.soup,
    calories: "320 kcal",
    desc: "Warm Egyptian yellow lentil soup with carrots, cumin, and lemon.",
    ingredients: [
      "3/4 cup red lentils",
      "1 carrot",
      "1 tomato",
      "1/2 onion",
      "1 garlic clove",
      "1/2 tsp cumin",
      "Lemon wedges",
    ],
    directions:
      "Simmer lentils, carrot, tomato, onion, garlic, and cumin until soft. Blend until smooth and finish with lemon.",
  },
  {
    name: "Eggplant Mesakaa Plate",
    image: recipeImages.eggplant,
    calories: "340 kcal",
    desc: "A lighter mesakaa using roasted eggplant, tomato sauce, chickpeas, and herbs.",
    ingredients: [
      "1 eggplant",
      "1/2 cup tomato sauce",
      "1/3 cup chickpeas",
      "1 garlic clove",
      "1 tsp olive oil",
      "Parsley",
      "Vinegar",
    ],
    directions:
      "Roast eggplant slices until tender. Simmer tomato sauce with garlic, chickpeas, and vinegar, then layer with eggplant and parsley.",
  },
  {
    name: "Tuna Baladi Salad",
    image: recipeImages.tuna,
    calories: "350 kcal",
    desc: "A quick Egyptian-style tuna plate with baladi salad and a small bread serving.",
    ingredients: [
      "1 can tuna in water",
      "1 tomato",
      "1 cucumber",
      "1/4 onion",
      "1 tbsp lemon juice",
      "1 tsp olive oil",
      "1/2 small baladi bread",
    ],
    directions:
      "Drain tuna and mix with tomato, cucumber, onion, lemon, and olive oil. Serve with a small baladi bread portion.",
  },
  {
    name: "Grilled Kofta Rice Plate",
    image: recipeImages.beef,
    calories: "540 kcal",
    desc: "Lean kofta with rice, salad, and yogurt sauce for a balanced Egyptian lunch.",
    ingredients: [
      "130g lean minced beef",
      "1/2 cup cooked rice",
      "1 cup salad",
      "2 tbsp Greek yogurt",
      "1/2 onion",
      "Parsley",
      "Kofta spices",
    ],
    directions:
      "Mix beef with onion, parsley, and spices. Shape into kofta fingers, grill until cooked, and serve with rice, salad, and yogurt.",
  },
  {
    name: "Sayadeya Fish Plate",
    image: recipeImages.fish,
    calories: "430 kcal",
    desc: "Alexandrian-inspired fish with spiced rice and a fresh salad side.",
    ingredients: [
      "140g white fish",
      "1/2 cup cooked brown rice",
      "1/2 onion",
      "1 tsp olive oil",
      "Cumin",
      "Lemon",
      "Side salad",
    ],
    directions:
      "Season fish with cumin and lemon, then bake or grill. Cook onion with olive oil and rice, then serve with salad.",
  },
  {
    name: "Vegetable Torly Bowl",
    image: recipeImages.bowl,
    calories: "310 kcal",
    desc: "A vegetable-first Egyptian torly bowl with zucchini, carrots, peas, tomato sauce, and herbs.",
    ingredients: [
      "1 zucchini",
      "1 carrot",
      "1/2 cup peas",
      "1/2 cup green beans",
      "1/2 cup tomato sauce",
      "1 tsp olive oil",
      "Mixed spices",
    ],
    directions:
      "Saute vegetables lightly, add tomato sauce and spices, then simmer until tender. Serve as a light bowl or side.",
  },
  {
    name: "Dates Greek Yogurt Cup",
    image: recipeImages.yogurt,
    calories: "210 kcal",
    desc: "A simple snack with dates, Greek yogurt, cinnamon, and a few nuts.",
    ingredients: [
      "3/4 cup Greek yogurt",
      "2 dates",
      "1 tsp chopped nuts",
      "Cinnamon",
    ],
    directions:
      "Slice the dates, spoon over Greek yogurt, then top with cinnamon and chopped nuts.",
  },
  {
    name: "Roasted Chickpeas Cucumber Snack",
    image: recipeImages.hummus,
    calories: "190 kcal",
    desc: "Crunchy roasted chickpeas with cucumber for a budget-friendly Egyptian snack.",
    ingredients: [
      "1/2 cup chickpeas",
      "1 cucumber",
      "1/2 tsp cumin",
      "1/2 tsp paprika",
      "1 tsp olive oil",
      "Lemon",
    ],
    directions:
      "Toss chickpeas with olive oil, cumin, and paprika. Roast until crisp, then serve with cucumber and lemon.",
  },
  {
    name: "Lemon Herb Grilled Chicken",
    image: recipeImages.chicken,
    calories: "280 kcal",
    desc: "Juicy grilled chicken with lemon and fresh herbs.",
    ingredients: [
      "2 chicken breasts",
      "2 tbsp olive oil",
      "2 tbsp lemon juice",
      "2 garlic cloves",
      "1 tsp oregano",
      "Salt and pepper",
    ],
    directions:
      "Mix olive oil, lemon juice, garlic, oregano, salt, and pepper. Marinate chicken for 30 minutes, then grill 6 to 7 minutes per side.",
  },
  {
    name: "Quinoa Black Bean Salad",
    image: recipeImages.salad,
    calories: "320 kcal",
    desc: "Fresh quinoa salad with beans, corn, and peppers.",
    ingredients: [
      "1 cup cooked quinoa",
      "1 cup black beans",
      "1/2 cup corn",
      "1 bell pepper",
      "2 tbsp cilantro",
      "1 tbsp lime juice",
    ],
    directions:
      "Combine quinoa, beans, corn, bell pepper, and cilantro. Toss with lime juice and chill before serving.",
  },
  {
    name: "Baked Salmon with Asparagus",
    image: recipeImages.salmon,
    calories: "350 kcal",
    desc: "Tender baked salmon served with roasted asparagus.",
    ingredients: [
      "1 salmon fillet",
      "1 bunch asparagus",
      "1 tbsp olive oil",
      "1/2 lemon",
      "Salt",
      "Black pepper",
    ],
    directions:
      "Place salmon and asparagus on a tray. Drizzle with olive oil, season, add lemon slices, and bake at 200°C for 12 to 15 minutes.",
  },
  {
    name: "Greek Yogurt Parfait",
    image: recipeImages.yogurt,
    calories: "210 kcal",
    desc: "Creamy yogurt layered with berries and granola.",
    ingredients: [
      "1 cup Greek yogurt",
      "1/2 cup berries",
      "2 tbsp granola",
      "1 tbsp honey",
      "1 tbsp walnuts",
    ],
    directions:
      "Layer Greek yogurt, berries, and granola in a glass. Top with honey and walnuts.",
  },
  {
    name: "Turkey Avocado Wrap",
    image: recipeImages.wrap,
    calories: "310 kcal",
    desc: "Soft whole wheat wrap with turkey and avocado.",
    ingredients: [
      "1 whole wheat tortilla",
      "4 turkey slices",
      "1/2 avocado",
      "1 handful spinach",
      "1 tsp mustard",
    ],
    directions:
      "Spread avocado and mustard over tortilla, add turkey and spinach, then roll tightly and slice.",
  },
  {
    name: "Red Lentil Soup",
    image: recipeImages.soup,
    calories: "230 kcal",
    desc: "Warm lentil soup rich in fiber and protein.",
    ingredients: [
      "1 cup red lentils",
      "1 onion",
      "2 garlic cloves",
      "4 cups vegetable broth",
      "1 tsp cumin",
      "1 tsp turmeric",
    ],
    directions:
      "Cook onion and garlic, add lentils, broth, cumin, and turmeric. Simmer for 20 minutes until soft.",
  },
  {
    name: "Garlic Shrimp Stir-Fry",
    image: recipeImages.shrimp,
    calories: "260 kcal",
    desc: "Quick shrimp stir-fry with crisp vegetables.",
    ingredients: [
      "200g shrimp",
      "1 cup broccoli",
      "1/2 cup snap peas",
      "2 garlic cloves",
      "1 tsp ginger",
      "1 tbsp soy sauce",
    ],
    directions:
      "Sauté garlic and ginger, add shrimp and vegetables, then stir-fry for 5 minutes and finish with soy sauce.",
  },
  {
    name: "Stuffed Bell Peppers",
    image: recipeImages.peppers,
    calories: "290 kcal",
    desc: "Bell peppers filled with lean beef and rice.",
    ingredients: [
      "2 bell peppers",
      "150g lean beef",
      "1/2 cup brown rice",
      "1/2 cup tomato sauce",
      "1/4 onion",
    ],
    directions:
      "Cook beef with onion, mix with rice and sauce, stuff peppers, and bake at 180°C for 30 minutes.",
  },
  {
    name: "Shakshuka",
    image: recipeImages.eggs,
    calories: "280 kcal",
    desc: "Eggs poached in a spiced tomato sauce.",
    ingredients: [
      "2 eggs",
      "1 cup crushed tomatoes",
      "1/2 onion",
      "1 garlic clove",
      "1 tsp paprika",
      "1/2 tsp cumin",
    ],
    directions:
      "Cook onion, garlic, tomatoes, and spices. Crack eggs into the sauce, cover, and cook until set.",
  },
  {
    name: "Roasted Chickpea Buddha Bowl",
    image: recipeImages.bowl,
    calories: "410 kcal",
    desc: "Colorful bowl with chickpeas, rice, and greens.",
    ingredients: [
      "1 cup brown rice",
      "1 cup roasted chickpeas",
      "1/2 sweet potato",
      "1 cup kale",
      "2 tbsp tahini dressing",
    ],
    directions:
      "Arrange rice, kale, sweet potato, and chickpeas in a bowl. Drizzle with tahini dressing.",
  },
  {
    name: "Tuna Lettuce Wraps",
    image: recipeImages.tuna,
    calories: "190 kcal",
    desc: "Crunchy lettuce wraps with creamy tuna filling.",
    ingredients: [
      "1 can tuna",
      "2 tbsp Greek yogurt",
      "1 tsp mustard",
      "1 celery stalk",
      "Lettuce leaves",
    ],
    directions:
      "Mix tuna, yogurt, mustard, and celery. Spoon into lettuce leaves and serve fresh.",
  },
  {
    name: "Egg White Omelet",
    image: recipeImages.eggs,
    calories: "150 kcal",
    desc: "Light omelet with mushrooms and spinach.",
    ingredients: [
      "4 egg whites",
      "1/2 cup spinach",
      "1/4 cup mushrooms",
      "1 tsp olive oil",
      "Salt and pepper",
    ],
    directions:
      "Cook mushrooms and spinach, add egg whites, season lightly, and cook until set.",
  },
  {
    name: "Tofu Scramble",
    image: recipeImages.tofu,
    calories: "220 kcal",
    desc: "Savory tofu scramble for a healthy breakfast.",
    ingredients: [
      "200g firm tofu",
      "1/4 onion",
      "1/4 bell pepper",
      "1/2 tsp turmeric",
      "1 tbsp nutritional yeast",
    ],
    directions:
      "Crumble tofu into a skillet with onion and bell pepper. Add turmeric and nutritional yeast, then cook until warm.",
  },
  {
    name: "Grilled Cod with Bok Choy",
    image: recipeImages.fish,
    calories: "210 kcal",
    desc: "Flaky cod with tender bok choy and garlic.",
    ingredients: [
      "1 cod fillet",
      "2 bok choy heads",
      "1 garlic clove",
      "1 tsp soy sauce",
      "1 tsp olive oil",
    ],
    directions:
      "Brush cod and bok choy with oil and soy sauce. Grill until the fish is cooked and vegetables are tender.",
  },
  {
    name: "Overnight Oats",
    image: recipeImages.oats,
    calories: "280 kcal",
    desc: "Easy overnight oats with apple and cinnamon.",
    ingredients: [
      "1/2 cup oats",
      "1/2 cup milk",
      "1 tbsp chia seeds",
      "1/2 apple",
      "1/2 tsp cinnamon",
    ],
    directions:
      "Mix oats, milk, chia seeds, and cinnamon in a jar. Chill overnight and top with apple slices.",
  },
  {
    name: "Oatmeal with Banana",
    image: recipeImages.oats,
    calories: "300 kcal",
    desc: "Warm oatmeal topped with banana and honey.",
    ingredients: [
      "1/2 cup oats",
      "1 cup milk",
      "1 banana",
      "1 tsp honey",
      "Cinnamon",
    ],
    directions:
      "Cook oats in milk until creamy. Add banana slices, honey, and a pinch of cinnamon.",
  },
  {
    name: "Beef and Broccoli Stir-Fry",
    image: recipeImages.beef,
    calories: "340 kcal",
    desc: "Lean beef stir-fry with broccoli and ginger.",
    ingredients: [
      "150g flank steak",
      "1 cup broccoli",
      "1 garlic clove",
      "1 tsp ginger",
      "1 tbsp soy sauce",
    ],
    directions:
      "Cook beef quickly in a hot pan, add broccoli, garlic, and ginger, then finish with soy sauce.",
  },
  {
    name: "Cottage Cheese with Pineapple",
    image: recipeImages.cottage,
    calories: "160 kcal",
    desc: "Simple high-protein snack with pineapple.",
    ingredients: ["1 cup cottage cheese", "1/2 cup pineapple chunks"],
    directions:
      "Place cottage cheese in a bowl and top with pineapple chunks.",
  },
  {
    name: "Cauliflower Rice Paella",
    image: recipeImages.rice,
    calories: "240 kcal",
    desc: "Low-carb cauliflower rice with shrimp and peas.",
    ingredients: [
      "2 cups cauliflower rice",
      "150g shrimp",
      "1/4 cup peas",
      "1/4 bell pepper",
      "Pinch saffron",
    ],
    directions:
      "Cook shrimp and peppers, add cauliflower rice, peas, and saffron, then cook until tender.",
  },
  {
    name: "Zucchini Noodles with Turkey",
    image: recipeImages.zucchini,
    calories: "180 kcal",
    desc: "Fresh zucchini noodles with turkey sauce.",
    ingredients: [
      "2 zucchini",
      "150g ground turkey",
      "1/2 cup marinara sauce",
      "1 tsp olive oil",
    ],
    directions:
      "Cook turkey in olive oil, add marinara sauce, and toss lightly with zucchini noodles before serving.",
  },
  {
    name: "Miso Soup with Tofu",
    image: recipeImages.miso,
    calories: "90 kcal",
    desc: "Light tofu soup with miso and seaweed.",
    ingredients: [
      "2 cups water",
      "1 tbsp miso paste",
      "100g silken tofu",
      "1 tbsp seaweed",
      "1 green onion",
    ],
    directions:
      "Warm water, dissolve miso, add tofu and seaweed, simmer gently, and top with green onion.",
  },
  {
    name: "Roasted Brussels Sprouts",
    image: recipeImages.sprouts,
    calories: "150 kcal",
    desc: "Roasted sprouts with balsamic and almonds.",
    ingredients: [
      "2 cups Brussels sprouts",
      "1 tbsp olive oil",
      "1 tsp balsamic glaze",
      "1 tbsp almonds",
    ],
    directions:
      "Roast Brussels sprouts at 200°C for 20 minutes. Finish with balsamic glaze and almonds.",
  },
  {
    name: "Hummus and Veggie Plate",
    image: recipeImages.hummus,
    calories: "220 kcal",
    desc: "Fresh vegetables served with creamy hummus.",
    ingredients: [
      "1/3 cup hummus",
      "Carrot sticks",
      "Cucumber slices",
      "Bell pepper strips",
    ],
    directions:
      "Arrange vegetables around a bowl of hummus and serve chilled.",
  },
  {
    name: "Baked Falafel",
    image: recipeImages.falafel,
    calories: "280 kcal",
    desc: "Baked chickpea falafel with herbs and spices.",
    ingredients: [
      "1 cup chickpeas",
      "1 garlic clove",
      "2 tbsp parsley",
      "1 tsp cumin",
      "1 tbsp flour",
    ],
    directions:
      "Blend ingredients, shape into small patties, and bake at 200°C for 20 minutes.",
  },
  {
    name: "Sweet Potato Toast",
    image: recipeImages.sweetpotato,
    calories: "190 kcal",
    desc: "Roasted sweet potato slices topped with almond butter.",
    ingredients: [
      "1 sweet potato",
      "1 tbsp almond butter",
      "Pinch cinnamon",
    ],
    directions:
      "Slice sweet potato lengthwise, roast or toast until tender, then top with almond butter and cinnamon.",
  },
  {
    name: "Ceviche",
    image: recipeImages.ceviche,
    calories: "170 kcal",
    desc: "Fresh fish marinated with lime and herbs.",
    ingredients: [
      "200g white fish",
      "3 tbsp lime juice",
      "1/4 red onion",
      "1 tbsp cilantro",
      "1/2 avocado",
    ],
    directions:
      "Marinate diced fish in lime juice until opaque, then mix with onion, cilantro, and avocado.",
  },
  {
    name: "Eggplant Rollatini",
    image: recipeImages.eggplant,
    calories: "260 kcal",
    desc: "Eggplant rolls filled with ricotta and spinach.",
    ingredients: [
      "1 eggplant",
      "1/2 cup ricotta",
      "1/2 cup spinach",
      "1/2 cup marinara sauce",
    ],
    directions:
      "Grill eggplant slices, fill with ricotta and spinach, roll, add sauce, and bake until hot.",
  },
  {
    name: "Shrimp Scampi Spaghetti Squash",
    image: recipeImages.shrimp,
    calories: "230 kcal",
    desc: "Garlic shrimp over spaghetti squash strands.",
    ingredients: [
      "1/2 spaghetti squash",
      "150g shrimp",
      "2 garlic cloves",
      "1 tbsp lemon juice",
      "1 tbsp parsley",
    ],
    directions:
      "Roast squash, scrape into strands, sauté shrimp with garlic and lemon, then serve on top.",
  },
  {
    name: "Minestrone Soup",
    image: recipeImages.minestrone,
    calories: "180 kcal",
    desc: "Vegetable soup with beans and pasta.",
    ingredients: [
      "1 cup mixed vegetables",
      "1/2 cup kidney beans",
      "1/4 cup pasta",
      "2 cups tomato broth",
    ],
    directions:
      "Simmer vegetables and beans in tomato broth, add pasta, and cook until tender.",
  },
  {
    name: "Pesto Zucchini Boats",
    image: recipeImages.zucchini,
    calories: "210 kcal",
    desc: "Zucchini halves baked with pesto and tomatoes.",
    ingredients: [
      "2 zucchini",
      "2 tbsp pesto",
      "1/2 cup cherry tomatoes",
      "2 tbsp parmesan",
    ],
    directions:
      "Fill zucchini halves with pesto and tomatoes, top with parmesan, and bake at 190°C for 15 minutes.",
  },
  {
    name: "Poached Eggs on Rye",
    image: recipeImages.eggs,
    calories: "250 kcal",
    desc: "Poached eggs served over toasted rye bread.",
    ingredients: ["2 eggs", "2 slices rye bread", "Salt", "Black pepper"],
    directions:
      "Poach eggs in simmering water, toast bread, and serve eggs on top with seasoning.",
  },
  {
    name: "Air-Fried Buffalo Cauliflower",
    image: recipeImages.sprouts,
    calories: "140 kcal",
    desc: "Spicy crispy cauliflower bites from the air fryer.",
    ingredients: [
      "2 cups cauliflower florets",
      "2 tbsp hot sauce",
      "1 tsp garlic powder",
      "1 tsp olive oil",
    ],
    directions:
      "Toss cauliflower with sauce and seasonings, then air-fry at 200°C for 15 minutes.",
  },
  {
    name: "Grilled Peach Salad",
    image: recipeImages.salad,
    calories: "200 kcal",
    desc: "Arugula salad with grilled peaches and goat cheese.",
    ingredients: [
      "2 peach halves",
      "2 cups arugula",
      "2 tbsp goat cheese",
      "1 tsp balsamic glaze",
    ],
    directions:
      "Grill peaches until lightly charred, then serve over arugula with goat cheese and balsamic glaze.",
  },
  {
    name: "Chicken Kebabs",
    image: recipeImages.chicken,
    calories: "260 kcal",
    desc: "Skewered chicken with peppers and onion.",
    ingredients: [
      "200g chicken breast",
      "Bell peppers",
      "Red onion",
      "1 tbsp olive oil",
      "Paprika",
      "Salt",
    ],
    directions:
      "Thread chicken and vegetables onto skewers, season, and grill until cooked through.",
  },
  {
    name: "Avocado Toast with Egg",
    image: recipeImages.avocado,
    calories: "290 kcal",
    desc: "Whole grain toast with avocado and egg.",
    ingredients: [
      "2 slices whole grain bread",
      "1/2 avocado",
      "1 egg",
      "Salt",
      "Pepper",
      "Chili flakes",
    ],
    directions:
      "Toast bread, mash avocado on top, add a cooked egg, and season to taste.",
  },
  {
    name: "Grilled Tofu Salad",
    image: recipeImages.tofu,
    calories: "240 kcal",
    desc: "Mixed greens topped with grilled tofu.",
    ingredients: [
      "150g firm tofu",
      "2 cups greens",
      "Cucumber",
      "Cherry tomatoes",
      "1 tbsp vinaigrette",
    ],
    directions:
      "Grill tofu slices until golden, place over greens and vegetables, then drizzle with vinaigrette.",
  },
  {
    name: "Brown Rice Chicken Bowl",
    image: recipeImages.bowl,
    calories: "390 kcal",
    desc: "Brown rice bowl with chicken and fresh vegetables.",
    ingredients: [
      "1 cup cooked brown rice",
      "150g grilled chicken",
      "Cucumber",
      "Carrot",
      "1 tbsp yogurt sauce",
    ],
    directions:
      "Build the bowl with brown rice, sliced chicken, vegetables, and yogurt sauce.",
  },
  {
    name: "Spinach Feta Omelet",
    image: recipeImages.eggs,
    calories: "230 kcal",
    desc: "Fluffy omelet with spinach and feta cheese.",
    ingredients: [
      "2 eggs",
      "1/2 cup spinach",
      "2 tbsp feta",
      "1 tsp olive oil",
    ],
    directions:
      "Cook spinach briefly, add beaten eggs, sprinkle feta, and fold when set.",
  },
  {
    name: "Chia Pudding with Berries",
    image: recipeImages.yogurt,
    calories: "220 kcal",
    desc: "Chilled chia pudding topped with berries.",
    ingredients: [
      "3 tbsp chia seeds",
      "1 cup milk",
      "1/2 tsp vanilla",
      "1/2 cup berries",
    ],
    directions:
      "Mix chia seeds with milk and vanilla. Chill for 4 hours or overnight, then top with berries.",
  },
  {
    name: "Grilled Veggie Sandwich",
    image: recipeImages.sandwich,
    calories: "270 kcal",
    desc: "Toasted sandwich with grilled vegetables and hummus.",
    ingredients: [
      "2 slices whole grain bread",
      "Zucchini",
      "Bell pepper",
      "Eggplant",
      "2 tbsp hummus",
    ],
    directions:
      "Grill vegetables until tender, spread hummus on bread, fill, and toast lightly.",
  },
  {
    name: "Baked Chicken Meatballs",
    image: recipeImages.chicken,
    calories: "250 kcal",
    desc: "Tender baked chicken meatballs with herbs.",
    ingredients: [
      "200g ground chicken",
      "1 egg",
      "2 tbsp breadcrumbs",
      "1 tbsp parsley",
      "Salt and pepper",
    ],
    directions:
      "Mix ingredients, shape into meatballs, and bake at 200°C for 18 to 20 minutes.",
  },
  {
    name: "Mediterranean Chickpea Salad",
    image: recipeImages.salad,
    calories: "300 kcal",
    desc: "Fresh chickpea salad with cucumber and tomatoes.",
    ingredients: [
      "1 cup chickpeas",
      "Cucumber",
      "Cherry tomatoes",
      "Red onion",
      "Parsley",
      "1 tbsp olive oil",
    ],
    directions:
      "Combine all ingredients in a bowl, drizzle with olive oil, and toss gently.",
  },
  {
    name: "Baked Sweet Potato and Yogurt",
    image: recipeImages.sweetpotato,
    calories: "240 kcal",
    desc: "Baked sweet potato topped with creamy yogurt.",
    ingredients: [
      "1 sweet potato",
      "2 tbsp Greek yogurt",
      "Chives",
      "Black pepper",
    ],
    directions:
      "Bake sweet potato until soft, cut open, and top with Greek yogurt, chives, and pepper.",
  },
  {
    name: "Salmon Rice Bowl",
    image: recipeImages.salmon,
    calories: "420 kcal",
    desc: "Healthy salmon bowl with rice and vegetables.",
    ingredients: [
      "1 salmon fillet",
      "1 cup cooked rice",
      "Cucumber",
      "Edamame",
      "1 tsp sesame seeds",
    ],
    directions:
      "Cook salmon, flake into pieces, and serve over rice with cucumber, edamame, and sesame seeds.",
  },
  {
    name: "Vegetable Frittata",
    image: recipeImages.eggs,
    calories: "260 kcal",
    desc: "Baked egg dish full of vegetables.",
    ingredients: [
      "4 eggs",
      "1/2 cup spinach",
      "1/4 cup bell pepper",
      "1/4 cup onion",
      "1 tsp olive oil",
    ],
    directions:
      "Cook vegetables lightly, pour in beaten eggs, and bake until the center is set.",
  },
  {
    name: "Chicken Caesar Lettuce Cups",
    image: recipeImages.chicken,
    calories: "230 kcal",
    desc: "Chicken Caesar filling served in crisp lettuce cups.",
    ingredients: [
      "150g cooked chicken",
      "2 tbsp Greek yogurt Caesar dressing",
      "Parmesan",
      "Romaine leaves",
    ],
    directions:
      "Mix chicken with dressing and parmesan, then spoon into romaine leaves.",
  },
  {
    name: "Edamame Brown Rice Bowl",
    image: recipeImages.bowl,
    calories: "330 kcal",
    desc: "Plant-based bowl with rice, edamame, and vegetables.",
    ingredients: [
      "1 cup cooked brown rice",
      "1/2 cup edamame",
      "Carrot ribbons",
      "Cucumber",
      "1 tbsp soy-lime dressing",
    ],
    directions:
      "Arrange rice, edamame, carrot, and cucumber in a bowl. Drizzle with soy-lime dressing.",
  },
  {
    name: "Grilled Chicken and Veggies",
    image: recipeImages.chicken,
    calories: "300 kcal",
    desc: "Grilled chicken breast with mixed vegetables.",
    ingredients: [
      "1 chicken breast",
      "Zucchini",
      "Bell pepper",
      "Broccoli",
      "1 tbsp olive oil",
    ],
    directions:
      "Season chicken and vegetables, grill until cooked and lightly charred, then serve hot.",
  },
  {
    name: "Tomato Basil Soup",
    image: recipeImages.soup,
    calories: "170 kcal",
    desc: "Smooth tomato soup with basil flavor.",
    ingredients: [
      "2 cups tomatoes",
      "1/2 onion",
      "1 garlic clove",
      "2 cups vegetable broth",
      "Fresh basil",
    ],
    directions:
      "Cook tomatoes, onion, and garlic in broth until soft. Blend smooth and stir in basil.",
  },
  {
    name: "Berry Protein Smoothie Bowl",
    image: recipeImages.smoothie,
    calories: "260 kcal",
    desc: "Thick berry smoothie bowl with healthy toppings.",
    ingredients: [
      "1 cup frozen berries",
      "1/2 banana",
      "1/2 cup yogurt",
      "1 scoop protein powder",
      "1 tbsp chia seeds",
    ],
    directions:
      "Blend berries, banana, yogurt, and protein powder until thick. Pour into a bowl and top with chia seeds.",
  },
  {
    name: "Baked Tilapia with Green Beans",
    image: recipeImages.fish,
    calories: "240 kcal",
    desc: "Light baked tilapia with green beans.",
    ingredients: [
      "1 tilapia fillet",
      "1 cup green beans",
      "1 tbsp olive oil",
      "Lemon juice",
      "Salt and pepper",
    ],
    directions:
      "Place fish and beans on a tray, season with oil and lemon, and bake until the fish flakes easily.",
  },
  {
    name: "Mango Chicken Salad",
    image: recipeImages.salad,
    calories: "310 kcal",
    desc: "Grilled chicken salad with fresh mango and greens.",
    ingredients: [
      "2 cups greens",
      "150g grilled chicken",
      "1/2 mango",
      "Cucumber",
      "1 tbsp lime dressing",
    ],
    directions:
      "Arrange greens, chicken, mango, and cucumber in a bowl. Add lime dressing before serving.",
  },
  {
    name: "Roasted Vegetable Quinoa Bowl",
    image: recipeImages.bowl,
    calories: "340 kcal",
    desc: "Quinoa bowl topped with roasted vegetables.",
    ingredients: [
      "1 cup cooked quinoa",
      "Zucchini",
      "Carrots",
      "Cauliflower",
      "1 tbsp olive oil",
      "Parsley",
    ],
    directions:
      "Roast vegetables until golden, spoon over quinoa, and finish with parsley.",
  },
];

const manualEgyptianFruitRecipes = [
  {
    name: "Egyptian Mango Yogurt Cups",
    image:
      "https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=1200&q=80",
    calories: "210 kcal",
    desc: "Fresh mango layered with yogurt, light honey, and crushed nuts.",
    ingredients: [
      "1 cup diced mango",
      "3/4 cup low-fat yogurt",
      "1 tsp honey",
      "1 tbsp crushed peanuts or almonds",
      "Pinch of cinnamon",
    ],
    directions:
      "Layer yogurt and mango in a cup, drizzle honey, add nuts and cinnamon, then chill for 5 minutes before serving.",
    category: "Fruit",
    seedMood: "Sweet",
    seedTags: ["Egyptian", "Fruit", "Sweet", "Quick Meal"],
    seedNutrition: { kcal: 210, proteinG: 8, carbsG: 36, fatG: 5, minutes: 8 },
    seedDifficulty: "Easy",
  },
  {
    name: "Date Banana Milk",
    image:
      "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=1200&q=80",
    calories: "245 kcal",
    desc: "A lighter Egyptian-style date milk blended with banana and cinnamon.",
    ingredients: [
      "2 soft dates",
      "1 small banana",
      "1 cup low-fat milk",
      "Pinch of cinnamon",
      "Ice cubes",
    ],
    directions:
      "Remove date pits, blend dates with banana, milk, cinnamon, and ice until smooth, then serve cold.",
    category: "Fruit",
    seedMood: "Sweet",
    seedTags: ["Egyptian", "Fruit", "Sweet", "Budget Friendly"],
    seedNutrition: { kcal: 245, proteinG: 9, carbsG: 48, fatG: 3, minutes: 5 },
    seedDifficulty: "Easy",
  },
  {
    name: "Orange Guava Mint Cup",
    image:
      "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?auto=format&fit=crop&w=1200&q=80",
    calories: "165 kcal",
    desc: "Orange and guava fruit cup with mint, lemon, and a small touch of honey.",
    ingredients: [
      "1 orange, segmented",
      "1 guava, sliced",
      "Fresh mint",
      "1 tsp lemon juice",
      "1/2 tsp honey",
    ],
    directions:
      "Combine orange and guava, add mint, lemon, and honey, then toss gently and serve chilled.",
    category: "Fruit",
    seedMood: "Sweet",
    seedTags: ["Egyptian", "Fruit", "Sweet", "Fresh"],
    seedNutrition: { kcal: 165, proteinG: 3, carbsG: 38, fatG: 1, minutes: 7 },
    seedDifficulty: "Easy",
  },
  {
    name: "Apple Date Belila Bowl",
    image:
      "https://images.unsplash.com/photo-1519996529931-28324d5a630e?auto=format&fit=crop&w=1200&q=80",
    calories: "285 kcal",
    desc: "Warm belila-style wheat bowl topped with apple, dates, milk, and cinnamon.",
    ingredients: [
      "3/4 cup cooked wheat",
      "1/2 apple, diced",
      "2 chopped dates",
      "1/2 cup warm milk",
      "Pinch of cinnamon",
    ],
    directions:
      "Warm cooked wheat with milk, top with apple and dates, sprinkle cinnamon, and serve as a sweet light meal.",
    category: "Fruit",
    seedMood: "Sweet",
    seedTags: ["Egyptian", "Fruit", "Sweet", "Comfort"],
    seedNutrition: { kcal: 285, proteinG: 10, carbsG: 55, fatG: 4, minutes: 10 },
    seedDifficulty: "Easy",
  },
];

const recipesData = [
  ...egyptianRecipesSeed.map(mapEgyptianSeedRecipe),
  ...manualEgyptianFruitRecipes,
  ...baseRecipesData,
];

const normalizeRecipeName = (name) => String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const normalizeRecipeImageKey = (image) => {
  const value = String(image || "").trim();
  if (!value || value.toLowerCase() === fallbackImage.toLowerCase()) return "";

  try {
    const parsed = new URL(value);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().toLowerCase();
  } catch {
    return value.split("?")[0].toLowerCase();
  }
};

const buildRecipeCatalog = (source) => {
  const catalog = [];
  const seenNames = new Set();
  const seenImages = new Set();

  const addRecipe = (recipe) => {
    const nameKey = normalizeRecipeName(recipe.name);
    if (!nameKey || seenNames.has(nameKey) || catalog.length >= TARGET_RECIPE_COUNT) return;

    const imageKey = normalizeRecipeImageKey(recipe.image);
    if (imageKey && seenImages.has(imageKey)) return;

    seenNames.add(nameKey);
    if (imageKey) seenImages.add(imageKey);
    catalog.push(recipe);
  };

  source.forEach(addRecipe);
  return catalog.slice(0, TARGET_RECIPE_COUNT);
};

const parseBackendRecipeList = (value) => {
  try {
    const parsed = JSON.parse(value || "[]");
    if (Array.isArray(parsed)) return parsed.map((item) => String(item || "").trim()).filter(Boolean);
    return String(parsed || "").split(/\r?\n|[,;]/).map((item) => item.trim()).filter(Boolean);
  } catch {
    return String(value || "").split(/\r?\n|[,;]/).map((item) => item.trim()).filter(Boolean);
  }
};

const mapBackendRecipe = (recipe = {}) => {
  const backendId = recipe.id || recipe.Id;
  const title = recipe.title || recipe.Title || "Untitled recipe";
  const ingredients = parseBackendRecipeList(recipe.ingredientsJson || recipe.IngredientsJson);
  const steps = parseBackendRecipeList(recipe.stepsJson || recipe.StepsJson);
  const imageUrl = recipe.imageUrl || recipe.ImageUrl || "";
  const calories = recipe.caloriesPerServing ?? recipe.CaloriesPerServing ?? 0;

  return {
    name: title,
    image: resolveMediaUrl(imageUrl, fallbackImage),
    calories: `${calories || 0} kcal`,
    desc: recipe.description || recipe.Description || "Admin-added Eatopia recipe.",
    ingredients: ingredients.length ? ingredients : ["Ingredients will be added soon."],
    directions: steps.length ? steps.join(". ") : "Prepare the ingredients, cook until done, and serve fresh.",
    category: recipe.category || recipe.Category || "",
    servings: recipe.servings ?? recipe.Servings ?? 1,
    backendId,
    adminKey: backendId || normalizeRecipeName(title),
    source: "backend",
  };
};

const mergeUniqueRecipes = (recipes) => {
  const seenNames = new Set();
  const seenImages = new Set();
  return recipes.filter((recipe) => {
    const nameKey = normalizeRecipeName(recipe.name);
    if (!nameKey || seenNames.has(nameKey)) return false;

    const imageKey = normalizeRecipeImageKey(recipe.image);
    if (imageKey && seenImages.has(imageKey)) return false;

    seenNames.add(nameKey);
    if (imageKey) seenImages.add(imageKey);
    return true;
  });
};

const RecipeImage = ({ src, alt, className }) => {
  const [imgSrc, setImgSrc] = useState(src);

  useEffect(() => {
    setImgSrc(src);
  }, [src]);

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setImgSrc(fallbackImage)}
      referrerPolicy="no-referrer"
    />
  );
};


const STORAGE_KEYS = {
  saved: "eatopia:savedRecipeNames",
  tried: "eatopia:triedRecipeNames",
  reviews: "eatopia:recipeReviews",
  guestReviewer: "eatopia:guestReviewerId",
  adminOverrides: "eatopia:adminRecipeOverrides",
  adminHidden: "eatopia:adminHiddenRecipeKeys",
};

const calorieFilterOptions = [
  { value: "All", label: "All" },
  { value: "under-250", label: "Under 250 kcal" },
  { value: "250-400", label: "250 - 400 kcal" },
  { value: "400-plus", label: "400+ kcal" },
];

const proteinFilterOptions = [
  { value: "All", label: "All" },
  { value: "under-15", label: "Under 15g" },
  { value: "15-30", label: "15 - 30g" },
  { value: "30-plus", label: "30g+" },
];

const readJson = (key, fallback) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return value ?? fallback;
  } catch {
    return fallback;
  }
};

const saveJson = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const normalizeReviewIdentity = (value) => String(value || "").trim().toLowerCase();

const createGuestReviewerId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `guest:${crypto.randomUUID()}`;
  }

  return `guest:${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const getGuestReviewerId = () => {
  const storedId = localStorage.getItem(STORAGE_KEYS.guestReviewer);
  if (storedId) return storedId;

  const nextId = createGuestReviewerId();
  localStorage.setItem(STORAGE_KEYS.guestReviewer, nextId);
  return nextId;
};

const getReviewerId = (user) => {
  const userKey =
    user?.id ||
    user?.userId ||
    user?.user_id ||
    user?.Id ||
    user?.email ||
    user?.Email ||
    user?.username ||
    user?.Username;

  return userKey ? `user:${normalizeReviewIdentity(userKey)}` : getGuestReviewerId();
};

const getCurrentUserName = (user) => {
  const activeUser = user ?? readJson("eatopiaUser", {});
  return activeUser?.fullName || activeUser?.name || activeUser?.username || "Eatopia user";
};

const getReviewDedupeKey = (review) => {
  if (review?.reviewerId) return review.reviewerId;

  const author = normalizeReviewIdentity(review?.author);
  return author ? `legacy:${author}` : `review:${review?.id || ""}`;
};

const normalizeRecipeReviews = (reviewsByRecipe) => {
  if (!reviewsByRecipe || typeof reviewsByRecipe !== "object" || Array.isArray(reviewsByRecipe)) return {};

  return Object.entries(reviewsByRecipe).reduce((nextReviews, [recipeName, reviews]) => {
    if (!Array.isArray(reviews)) return nextReviews;

    const seenReviewers = new Set();
    nextReviews[recipeName] = reviews
      .filter((review) => {
        const dedupeKey = getReviewDedupeKey(review);
        if (seenReviewers.has(dedupeKey)) return false;
        seenReviewers.add(dedupeKey);
        return true;
      })
      .slice(0, 6);

    return nextReviews;
  }, {});
};

const isReviewFromReviewer = (review, reviewerId, reviewerName) => {
  if (review?.reviewerId && review.reviewerId === reviewerId) return true;

  return (
    !review?.reviewerId &&
    normalizeReviewIdentity(review?.author) === normalizeReviewIdentity(reviewerName)
  );
};

const lowerText = (recipe) =>
  `${recipe.name} ${recipe.desc} ${recipe.ingredients.join(" ")} ${recipe.directions}`.toLowerCase();

const includesAny = (text, words) => words.some((word) => text.includes(word));
const tokenizeSearch = (value) =>
  String(value || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2 && !["with", "and", "the", "bowl", "plate"].includes(token));
const matchesTokenSearch = (recipe, search) => {
  const tokens = tokenizeSearch(search);
  if (!tokens.length) return false;

  const text = `${lowerText(recipe)} ${recipe.tags.join(" ")} ${recipe.goals.join(" ")}`.toLowerCase();
  const matched = tokens.filter((token) => text.includes(token)).length;
  return matched >= Math.max(1, Math.ceil(tokens.length * 0.5));
};
const hasMeat = (recipe) => includesAny(lowerText(recipe), MEAT_KEYWORDS);
const isVegetableRecipe = (recipe) => {
  if (recipe.category) return recipe.category === "Vegetables";

  const title = String(recipe.name || "").toLowerCase();
  return (
    !hasMeat(recipe) &&
    !includesAny(title, NON_VEGETABLE_MAIN_KEYWORDS) &&
    includesAny(title, VEGETABLE_MAIN_KEYWORDS)
  );
};

const inferNutrition = (recipe) => {
  if (recipe.seedNutrition) {
    return {
      calories: Number(recipe.seedNutrition.kcal) || parseCalories(recipe.calories),
      protein: Number(recipe.seedNutrition.proteinG) || 0,
      carbs: Number(recipe.seedNutrition.carbsG) || 0,
      fats: Number(recipe.seedNutrition.fatG) || 0,
    };
  }

  const text = lowerText(recipe);
  const calories = parseCalories(recipe.calories);
  let protein = 12;
  let carbs = 24;
  let fats = 8;

  if (includesAny(text, MEAT_KEYWORDS)) protein += 18;
  if (includesAny(text, ["egg", "eggs", "tofu", "cottage", "greek yogurt", "edamame", "lentil", "beans", "chickpea"])) protein += 9;
  if (includesAny(text, ["rice", "quinoa", "oats", "bread", "wrap", "pasta", "potato", "banana", "granola"])) carbs += 18;
  if (includesAny(text, ["avocado", "olive oil", "salmon", "walnuts", "almond", "tahini", "pesto", "cheese"])) fats += 8;

  protein = Math.min(48, Math.max(8, protein));
  carbs = Math.min(70, Math.max(8, carbs));
  fats = Math.min(28, Math.max(4, fats));

  return { calories, protein, carbs, fats };
};

const inferTime = (recipe) => {
  if (recipe.seedNutrition?.minutes) return Number(recipe.seedNutrition.minutes);

  const text = lowerText(recipe);
  if (includesAny(text, ["overnight", "marinate"])) return 30;
  if (includesAny(text, ["bake", "roast", "stuff", "rollatini", "meatballs"])) return 30;
  if (includesAny(text, ["soup", "simmer", "lentil"])) return 25;
  if (includesAny(text, ["smoothie", "parfait", "plate", "toast", "wraps"])) return 10;
  if (includesAny(text, ["stir-fry", "omelet", "scramble", "salad"])) return 15;
  return 20;
};

const inferDifficulty = (recipe, minutes) => {
  if (recipe.seedDifficulty) return recipe.seedDifficulty;

  const text = lowerText(recipe);
  if (includesAny(text, ["stuff", "roll", "paella", "ceviche"])) return "Medium";
  if (minutes <= 15) return "Easy";
  return "Balanced";
};

const inferTags = (recipe, nutrition, minutes) => {
  const text = lowerText(recipe);
  const tags = new Set();

  (recipe.seedTags || []).forEach((tag) => tags.add(tag));
  if (nutrition.protein >= 28) tags.add("High Protein");
  if (nutrition.calories && nutrition.calories <= 250) tags.add("Low Calorie");
  if (minutes <= 20) tags.add("Quick Meal");
  if (includesAny(text, ["oats", "lentil", "beans", "chickpea", "eggs", "rice", "soup", "hummus"])) tags.add("Budget Friendly");
  if (!hasMeat(recipe)) tags.add("Vegetarian");
  if (isVegetableRecipe(recipe)) tags.add("Vegetables");
  if (includesAny(text, ["salad", "asparagus", "lettuce", "zucchini", "greens", "cucumber", "tomato"])) tags.add("Fresh");
  if (includesAny(text, ["rice", "oats", "quinoa", "banana", "potato", "bowl"])) tags.add("Energy Fuel");

  return Array.from(tags).slice(0, 5);
};

const inferGoals = (recipe, tags, nutrition) => {
  const goals = new Set();
  if (nutrition.calories <= 260 || tags.includes("Low Calorie")) goals.add("Weight Loss");
  if (nutrition.protein >= 28 || tags.includes("High Protein")) goals.add("Muscle Gain");
  if (tags.includes("Quick Meal")) goals.add("Quick Meal");
  if (tags.includes("Budget Friendly")) goals.add("Budget Friendly");
  if (tags.includes("Vegetables")) goals.add("Vegetables");
  if (tags.includes("Vegetarian")) goals.add("Vegetarian");
  if (nutrition.protein >= 25 && (tags.includes("Energy Fuel") || nutrition.carbs >= 35)) goals.add("Post Workout");
  return Array.from(goals.size ? goals : new Set(["Healthy Balance"]));
};

const inferMood = (recipe) => {
  if (recipe.seedMood) return recipe.seedMood;

  const text = lowerText(recipe);
  if (includesAny(text, ["soup", "oatmeal", "meatballs", "sweet potato", "toast"])) return "Comfort";
  if (includesAny(text, ["salad", "ceviche", "lettuce", "cucumber", "mango", "peach"])) return "Fresh";
  if (includesAny(text, ["rice", "oats", "smoothie", "banana", "quinoa", "bowl"])) return "Energy";
  if (includesAny(text, ["yogurt", "berries", "honey", "pineapple", "chia"])) return "Sweet";
  return "Light";
};

const createStory = (recipe, goals, nutrition, minutes) => {
  const mainGoal = goals[0] || "Healthy Balance";
  const proteinLabel = nutrition.protein >= 28 ? "high-protein" : "balanced";
  return `A ${proteinLabel} ${mainGoal.toLowerCase()} recipe built for real life: simple ingredients, clear portions, and a satisfying meal in about ${minutes} minutes.`;
};

const buildSubstitutions = (recipe) => {
  const substitutions = [];
  const text = lowerText(recipe);
  const rules = [
    [/greek yogurt|yogurt/, "Greek yogurt to regular yogurt, labneh, or low-fat sour cream"],
    [/chicken/, "Chicken breast to turkey, tuna, tofu, or eggs for a different protein"],
    [/salmon|cod|tilapia|fish/, "Fish to chicken breast, shrimp, or tofu if seafood is not available"],
    [/quinoa/, "Quinoa to brown rice, bulgur, or couscous"],
    [/rice/, "Rice to quinoa, cauliflower rice, or whole wheat pasta"],
    [/honey/, "Honey to dates, maple syrup, or a small banana"],
    [/olive oil/, "Olive oil to avocado oil or a light cooking spray"],
    [/tortilla|bread|toast|wrap/, "Bread or wrap to lettuce cups for a lighter option"],
    [/beef/, "Beef to lean turkey, chicken mince, or lentils"],
    [/cheese|feta|ricotta|parmesan/, "Cheese to cottage cheese, light feta, or nutritional yeast"],
  ];

  rules.forEach(([pattern, message]) => {
    if (pattern.test(text) && !substitutions.includes(message)) substitutions.push(message);
  });

  if (substitutions.length < 2) {
    substitutions.push("Add extra vegetables to increase volume without adding many calories.");
  }

  return substitutions.slice(0, 4);
};

const buildSteps = (recipe) => {
  const rawSteps = recipe.directions
    .replace(/, then /gi, ". Then ")
    .replace(/ and then /gi, ". Then ")
    .split(/\.\s+|;\s+/)
    .map((step) => step.trim().replace(/\.$/, ""))
    .filter(Boolean);

  return (rawSteps.length ? rawSteps : [recipe.directions]).map((step, index) => ({
    title: index === 0 ? "Prepare" : index === rawSteps.length - 1 ? "Serve" : `Step ${index + 1}`,
    text: step,
    minutes: index === 0 ? 3 : index === rawSteps.length - 1 ? 2 : 5,
  }));
};

const buildTips = (recipe, nutrition) => {
  const text = lowerText(recipe);
  const chefTip = includesAny(text, ["grill", "bake", "roast"])
    ? "Let the protein rest for 3 minutes before serving so the juices stay inside."
    : includesAny(text, ["salad", "bowl"])
    ? "Keep the dressing on the side until serving so the vegetables stay crisp."
    : "Taste at the end and adjust acidity with lemon or lime before adding more salt.";

  const healthTip = nutrition.calories > 340
    ? "For a lighter plate, reduce the starch portion and add extra greens."
    : nutrition.protein >= 28
    ? "Great after training; pair it with water and a small carb source if you need more energy."
    : "To make it more filling, add a lean protein or a spoon of Greek yogurt.";

  return { chefTip, healthTip };
};

const splitDirectionsIntoSteps = (text = "") =>
  String(text || "")
    .replace(/\s+and then\s+/gi, ". Then ")
    .replace(/\s+then\s+/gi, ". Then ")
    .split(/\.\s+|;\s+|\n+/)
    .map((step) => step.trim().replace(/\.$/, ""))
    .filter(Boolean);

const hasGenericSeedIngredients = (ingredients = []) =>
  ingredients.some((item) =>
    /main protein|main vegetable|tomato sauce or broth|egyptian spice blend|rice or baladi bread/i.test(item)
  );

const makeDetailedGuide = (recipe, template = {}) => {
  const fallbackSteps = splitDirectionsIntoSteps(recipe.directions);
  const defaultSteps = recipe.steps?.map((step) => step.text).filter(Boolean) || [];
  const availableSteps = fallbackSteps.length ? fallbackSteps : defaultSteps;
  const ingredients = template.ingredients?.length
    ? template.ingredients
    : recipe.ingredients?.filter(Boolean) || [];
  const method = template.method?.length
    ? template.method
    : availableSteps.length
    ? availableSteps.map((step, index) => `${index === 0 ? "Prep" : index === availableSteps.length - 1 ? "Finish" : "Cook"}: ${step}`)
    : [
        "Prepare all ingredients before heating the pan so the cooking moves cleanly.",
        "Cook the main ingredient until safe and tender, then adjust seasoning with lemon, cumin, salt, and pepper.",
        "Serve immediately with the listed side or garnish while the texture is still fresh.",
      ];

  return {
    servings: template.servings || recipe.servings || 1,
    prep: template.prep || "Prep the ingredients first, then cook without rushing the sauce or topping.",
    ingredients,
    method,
    finish: template.finish || recipe.chefTip || "Taste at the end and balance salt, acidity, and spice before serving.",
    sourceNote: template.sourceNote || (hasGenericSeedIngredients(recipe.ingredients) ? "Detailed Egyptian cooking guide" : "Detailed guide from this recipe data"),
  };
};

const buildFullRecipeGuide = (recipe = {}) => {
  const text = lowerText(recipe);
  const name = String(recipe.name || "").toLowerCase();

  if (name.includes("koshari") || name.includes("koshary")) {
    return makeDetailedGuide(recipe, {
      servings: recipe.servings || 4,
      prep: "Keep the rice, lentils, pasta, sauce, and onions separate until serving so the texture stays clear.",
      ingredients: [
        "1 cup cooked Egyptian rice or rice-vermicelli mix",
        "1/2 cup cooked brown lentils, tender but not mushy",
        "1/2 cup cooked chickpeas",
        "1/2 cup small pasta or macaroni",
        "3/4 cup tomato sauce cooked with garlic, vinegar, cumin, and coriander",
        "1/4 cup crispy fried onions",
        "Chili vinegar, lemon, or extra cumin for serving",
      ],
      method: [
        "Cook lentils until just tender, then drain so they do not turn into a paste.",
        "Cook rice or rice-vermicelli separately and keep it fluffy.",
        "Cook pasta until al dente, drain, and keep warm.",
        "Simmer tomato sauce with garlic, vinegar, cumin, coriander, salt, and pepper until thick.",
        "Fry onions slowly until deep golden and crisp, then drain on paper towel.",
        "Layer rice, lentils, pasta, and chickpeas, then spoon sauce on top and finish with crispy onions.",
      ],
      finish: "Serve extra sauce and chili vinegar on the side instead of soaking the bowl early.",
      sourceNote: "Compared against common Egyptian koshari method: separate components, tomato-vinegar sauce, chickpeas, and fried onions.",
    });
  }

  if (name.includes("molokhia") || name.includes("mulukhiyah")) {
    return makeDetailedGuide(recipe, {
      servings: recipe.servings || 4,
      prep: "The key detail is the garlic-coriander ta'liya; add it near the end so the aroma stays bright.",
      ingredients: [
        "2 cups finely chopped molokhia leaves, fresh or thawed frozen",
        "4 cups chicken, rabbit, beef, or vegetable broth",
        "250-300g cooked chicken, rabbit, or lean meat if used",
        "4-5 garlic cloves, crushed",
        "1 1/2 tbsp ground coriander",
        "1 tbsp ghee or 2 tsp light oil",
        "Salt, black pepper, and lemon on the side",
        "Rice or baladi bread for serving",
      ],
      method: [
        "Warm the broth gently; do not let it boil hard after adding molokhia.",
        "Stir in molokhia gradually until the soup is smooth and silky.",
        "Add cooked protein if using, then simmer gently for a few minutes.",
        "In a small pan, cook garlic and coriander in ghee or oil until fragrant and lightly golden.",
        "Pour the ta'liya into the molokhia, stir once, cover briefly, then turn off the heat.",
        "Serve with rice or baladi bread and add lemon only at the table.",
      ],
      finish: "Avoid overboiling molokhia after the ta'liya; strong boiling can dull the texture and flavor.",
      sourceNote: "Compared against traditional molokhia methods using broth plus garlic-coriander ta'liya.",
    });
  }

  if (name.includes("ful") || name.includes("fava")) {
    return makeDetailedGuide(recipe, {
      servings: recipe.servings || 2,
      prep: "Mash only part of the beans; leaving some whole gives Egyptian ful its better texture.",
      ingredients: [
        "1 1/2 cups cooked fava beans with a little cooking liquid",
        "1 tbsp lemon juice",
        "1 tsp olive oil or tahini, optional",
        "1/2 tsp ground cumin",
        "1 small tomato, diced",
        "1 tbsp chopped parsley or cucumber",
        "Salt, black pepper, and chili to taste",
        "Baladi bread or vegetables for serving",
      ],
      method: [
        "Warm fava beans with a splash of their liquid until soft.",
        "Lightly mash part of the beans while keeping some beans whole.",
        "Season with cumin, lemon, salt, and pepper.",
        "Fold in tomato, parsley, cucumber, tahini, or olive oil according to the recipe style.",
        "Serve warm with baladi bread and fresh vegetables.",
      ],
      finish: "Add lemon after warming the beans so the flavor stays fresh.",
      sourceNote: "Compared against Egyptian ful basics: cooked fava beans, cumin, lemon, olive oil or tahini, and fresh toppings.",
    });
  }

  if (name.includes("hawawshi")) {
    return makeDetailedGuide(recipe, {
      servings: recipe.servings || 4,
      prep: "Use a thin, even meat layer inside the bread so it cooks through before the bread burns.",
      ingredients: [
        "4 small baladi bread loaves or pita pockets",
        "350-400g lean minced beef or lamb",
        "1 onion, finely grated and squeezed lightly",
        "1 small green pepper, finely chopped",
        "2 tbsp parsley",
        "1 tsp mixed spices or seven spice",
        "1/2 tsp cumin",
        "Salt, black pepper, and chili to taste",
        "1 tsp oil for brushing, optional",
      ],
      method: [
        "Mix minced meat with onion, pepper, parsley, spices, salt, and pepper until evenly seasoned.",
        "Open each bread pocket and spread a thin layer of meat inside from edge to edge.",
        "Brush the outside lightly with oil if you want a crisp crust.",
        "Bake in a hot oven or covered skillet until the bread is crisp and the meat is fully cooked.",
        "Rest 2 minutes, then cut and serve with pickles, salad, or tahini.",
      ],
      finish: "If the bread browns too fast, lower the heat and cover briefly so the meat finishes safely.",
      sourceNote: "Compared against hawawshi basics: spiced minced meat, onion, pepper, parsley, and baladi bread.",
    });
  }

  if (name.includes("taameya") || name.includes("falafel")) {
    return makeDetailedGuide(recipe, {
      servings: recipe.servings || 4,
      prep: "Egyptian taameya is usually fava-bean based; keep the mix coarse enough to hold shape.",
      ingredients: [
        "1 cup soaked split fava beans, drained very well",
        "1/2 cup parsley, coriander, or dill",
        "1 small onion",
        "2 garlic cloves",
        "1 tsp ground cumin",
        "1/2 tsp ground coriander",
        "1 tbsp sesame seeds, optional",
        "Salt and pepper",
      ],
      method: [
        "Blend soaked fava beans with herbs, onion, garlic, cumin, coriander, salt, and pepper.",
        "Chill the mixture until firm enough to shape.",
        "Shape into small patties and press sesame seeds on top if using.",
        "Bake, air-fry, or shallow-fry until the outside is crisp and the inside is cooked.",
        "Serve with tahini, salad, and baladi bread.",
      ],
      finish: "Drain the soaked beans very well; extra water makes the patties fall apart.",
    });
  }

  if (name.includes("mahshi") || name.includes("stuffed")) {
    return makeDetailedGuide(recipe, {
      servings: recipe.servings || 4,
      prep: "The filling should be moist, not wet; too much liquid makes stuffed vegetables split.",
      ingredients: [
        "Vegetables for stuffing: cabbage, vine leaves, zucchini, peppers, or eggplant",
        "1 cup short-grain rice, rinsed",
        "1 cup tomato sauce or crushed tomato",
        "1 onion, finely chopped",
        "Parsley, dill, and coriander, chopped",
        "1 tbsp light oil",
        "Cumin, black pepper, coriander, salt, and chili",
        "Broth or light tomato stock for cooking",
      ],
      method: [
        "Prepare vegetables by hollowing, blanching, or softening depending on the type.",
        "Mix rice with tomato, onion, herbs, oil, and spices.",
        "Fill vegetables loosely because rice expands while cooking.",
        "Arrange tightly in a pot, add broth just below the top layer, and simmer gently.",
        "Rest covered for 10 minutes before serving so the filling sets.",
      ],
      finish: "Pack the pot tightly enough to stop movement, but do not overfill each piece.",
    });
  }

  if (name.includes("kofta")) {
    return makeDetailedGuide(recipe, {
      servings: recipe.servings || 4,
      prep: "Squeeze grated onion before mixing so the kofta holds shape.",
      ingredients: [
        "400g lean minced beef or chicken",
        "1 small onion, grated and squeezed",
        "2 tbsp parsley",
        "1 tsp kofta spice or seven spice",
        "1/2 tsp cumin",
        "Salt and black pepper",
        "Tomato sauce if making sauced kofta",
      ],
      method: [
        "Mix meat with onion, parsley, spices, salt, and pepper until just combined.",
        "Shape into fingers, balls, or patties with lightly wet hands.",
        "Grill, bake, or pan-sear until browned outside and cooked through.",
        "For tomato kofta, simmer the browned pieces briefly in tomato sauce.",
        "Serve with rice, salad, tahini, or baladi bread.",
      ],
      finish: "Do not overmix the meat; overworking makes kofta dense.",
    });
  }

  if (name.includes("fatta") || name.includes("fattah")) {
    return makeDetailedGuide(recipe, {
      servings: recipe.servings || 4,
      prep: "Keep bread crisp until assembly so the final plate has contrast.",
      ingredients: [
        "2 cups cooked rice",
        "2 cups toasted baladi bread pieces",
        "300g cooked beef, chicken, lamb, or lentils",
        "1 cup tomato sauce",
        "2 garlic cloves",
        "1 tbsp vinegar",
        "Broth for moistening",
        "Salt, pepper, cumin, and coriander",
      ],
      method: [
        "Toast bread pieces until crisp.",
        "Cook garlic briefly, add vinegar, then add tomato sauce and simmer.",
        "Warm rice and protein separately.",
        "Moisten bread lightly with hot broth, then layer bread, rice, protein, and sauce.",
        "Serve immediately before the bread turns too soft.",
      ],
      finish: "Add broth carefully; fatta should be moist, not soupy.",
    });
  }

  if (name.includes("bechamel")) {
    return makeDetailedGuide(recipe, {
      servings: recipe.servings || 6,
      prep: "Let the bechamel thicken before baking so the slices hold after resting.",
      ingredients: [
        "300g pasta, cooked just under al dente",
        "250g minced meat or chicken filling",
        "1 onion, finely chopped",
        "2 cups milk",
        "2 tbsp flour",
        "1 tbsp butter or light oil",
        "Salt, pepper, nutmeg, and optional cheese",
      ],
      method: [
        "Cook pasta until slightly firm because it will finish in the oven.",
        "Cook onion with minced meat or chicken and season well.",
        "Whisk flour with butter or oil, add milk gradually, and cook until creamy.",
        "Layer pasta, filling, and bechamel in a baking dish.",
        "Bake until bubbling and golden, then rest before slicing.",
      ],
      finish: "Rest 10 minutes after baking for cleaner portions.",
    });
  }

  if (name.includes("fish") || text.includes("fish")) {
    return makeDetailedGuide(recipe, {
      servings: recipe.servings || 4,
      prep: "Season fish early, but add strong acid close to cooking so the texture stays clean.",
      ingredients: [
        "4 fish fillets or 1 whole cleaned fish",
        "3 garlic cloves, crushed",
        "1 tsp cumin",
        "1 tsp coriander",
        "Lemon juice",
        "Bell pepper, tomato, or vegetables if listed",
        "1 tbsp olive oil or light oil",
        "Salt, pepper, and chili to taste",
      ],
      method: [
        "Pat fish dry, then season with garlic, cumin, coriander, salt, pepper, and a little lemon.",
        "Arrange vegetables or sauce in the tray if the recipe uses them.",
        "Bake, grill, or pan-cook until the fish flakes easily.",
        "Rest briefly, then finish with lemon and fresh herbs.",
        "Serve with rice, salad, or tahini depending on the dish.",
      ],
      finish: "Fish is ready when it flakes with gentle pressure; overcooking dries it quickly.",
    });
  }

  return makeDetailedGuide(recipe);
};

const enhanceRecipe = (recipe, index) => {
  const nutrition = inferNutrition(recipe);
  const minutes = inferTime(recipe);
  const difficulty = inferDifficulty(recipe, minutes);
  const tags = inferTags(recipe, nutrition, minutes);
  const goals = inferGoals(recipe, tags, nutrition);
  const mood = inferMood(recipe);
  const tips = buildTips(recipe, nutrition);

  return {
    ...recipe,
    id: `${recipe.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`,
    nutrition,
    minutes,
    difficulty,
    tags,
    goals,
    mood,
    story: recipe.seedStory || createStory(recipe, goals, nutrition, minutes),
    substitutions: recipe.seedSubstitutions?.length ? recipe.seedSubstitutions : buildSubstitutions(recipe),
    steps: recipe.seedSteps?.length ? recipe.seedSteps : buildSteps(recipe),
    chefTip: recipe.seedChefTip || tips.chefTip,
    healthTip: recipe.seedHealthTip || tips.healthTip,
  };
};

const matchesCalorieRange = (calories, range) => {
  if (range === "under-250") return calories < 250;
  if (range === "250-400") return calories >= 250 && calories <= 400;
  if (range === "400-plus") return calories > 400;
  return true;
};

const matchesProteinRange = (protein, range) => {
  if (range === "under-15") return protein < 15;
  if (range === "15-30") return protein >= 15 && protein <= 30;
  if (range === "30-plus") return protein > 30;
  return true;
};

const matchesFilter = (recipe, searchTerm, calorieRange, proteinRange, showSavedOnly, savedRecipeNames) => {
  const search = searchTerm.trim().toLowerCase();
  const searchMatch =
    !search ||
    lowerText(recipe).includes(search) ||
    recipe.tags.some((tag) => tag.toLowerCase().includes(search)) ||
    matchesTokenSearch(recipe, search);
  const caloriesMatch = matchesCalorieRange(recipe.nutrition.calories, calorieRange);
  const proteinMatch = matchesProteinRange(recipe.nutrition.protein, proteinRange);
  const savedMatch = !showSavedOnly || savedRecipeNames.includes(recipe.name);
  return searchMatch && caloriesMatch && proteinMatch && savedMatch;
};

const recipeToAdminForm = (recipe = {}) => ({
  title: recipe.name || "",
  description: recipe.desc || "",
  imageUrl: recipe.image || "",
  caloriesPerServing: parseCalories(recipe.calories) || "",
  servings: String(recipe.servings || 1),
  ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients.join("\n") : "",
  steps: Array.isArray(recipe.steps) && recipe.steps.length
    ? recipe.steps.map((step) => step.text).join("\n")
    : String(recipe.directions || "").split(/\.\s+/).map((step) => step.trim()).filter(Boolean).join("\n"),
});

const Recipes = () => {
  const location = useLocation();
  const [backendRecipes, setBackendRecipes] = useState([]);
  const [currentUser, setCurrentUser] = useState(() => getStoredUser());
  const [currentReviewerId, setCurrentReviewerId] = useState(() => getReviewerId(getStoredUser()));
  const [adminRecipeOverrides, setAdminRecipeOverrides] = useState(() => readJson(STORAGE_KEYS.adminOverrides, {}));
  const [adminHiddenRecipeKeys, setAdminHiddenRecipeKeys] = useState(() => readJson(STORAGE_KEYS.adminHidden, []));
  const recipes = useMemo(
    () => {
      const localCatalog = buildRecipeCatalog(recipesData)
        .map((recipe) => {
          const adminKey = normalizeRecipeName(recipe.name);
          return {
            ...recipe,
            ...(adminRecipeOverrides[adminKey] || {}),
            originalName: recipe.name,
            adminKey,
            source: "static",
          };
        })
        .filter((recipe) => !adminHiddenRecipeKeys.includes(recipe.adminKey));

      return mergeUniqueRecipes([...backendRecipes, ...localCatalog]).map(enhanceRecipe);
    },
    [backendRecipes, adminHiddenRecipeKeys, adminRecipeOverrides]
  );
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [showFullRecipeGuide, setShowFullRecipeGuide] = useState(false);
  const [recipeEditor, setRecipeEditor] = useState(null);
  const [recipeAdminMessage, setRecipeAdminMessage] = useState("");
  const [recipeAdminSaving, setRecipeAdminSaving] = useState(false);
  const [recipeConfirmDialog, setRecipeConfirmDialog] = useState(null);
  const [mealQuantity, setMealQuantity] = useState(100);
  const [dietRecipeContext, setDietRecipeContext] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCalories, setActiveCalories] = useState("All");
  const [activeProtein, setActiveProtein] = useState("All");
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [savedRecipeNames, setSavedRecipeNames] = useState(() => readJson(STORAGE_KEYS.saved, []));
  const [triedRecipeNames, setTriedRecipeNames] = useState(() => readJson(STORAGE_KEYS.tried, []));
  const [recipeReviews, setRecipeReviews] = useState(() => normalizeRecipeReviews(readJson(STORAGE_KEYS.reviews, {})));
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const canManageRecipes = isAdminRole(currentUser?.role) && Boolean(getToken());

  const loadBackendRecipes = useCallback(async () => {
    const response = await axios.get(`${API_BASE_URL}/recipes?page=1&pageSize=200`);
    const items = response?.data?.data || response?.data?.recipes || [];
    const mapped = items.map(mapBackendRecipe);
    setBackendRecipes(mapped);
    return mapped;
  }, []);

  useEffect(() => {
    let isMounted = true;
    loadBackendRecipes()
      .then(() => {
        if (!isMounted) return;
      })
      .catch(() => {
        if (isMounted) setBackendRecipes([]);
      });

    return () => {
      isMounted = false;
    };
  }, [loadBackendRecipes]);

  useEffect(() => {
    const refreshUser = () => {
      const nextUser = getStoredUser();
      setCurrentUser(nextUser);
      setCurrentReviewerId(getReviewerId(nextUser));
    };

    window.addEventListener("eatopia-auth-changed", refreshUser);
    window.addEventListener("storage", refreshUser);
    return () => {
      window.removeEventListener("eatopia-auth-changed", refreshUser);
      window.removeEventListener("storage", refreshUser);
    };
  }, []);

  useEffect(() => {
    saveJson(STORAGE_KEYS.reviews, recipeReviews);
  }, [recipeReviews]);

  const filteredRecipes = useMemo(
    () => recipes.filter((recipe) => matchesFilter(recipe, searchTerm, activeCalories, activeProtein, showSavedOnly, savedRecipeNames)),
    [recipes, searchTerm, activeCalories, activeProtein, showSavedOnly, savedRecipeNames]
  );

  const totalPages = Math.max(1, Math.ceil(filteredRecipes.length / RECIPES_PER_PAGE));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const firstRecipeIndex = (currentPageSafe - 1) * RECIPES_PER_PAGE;
  const paginatedRecipes = filteredRecipes.slice(firstRecipeIndex, firstRecipeIndex + RECIPES_PER_PAGE);
  const visibleStart = filteredRecipes.length ? firstRecipeIndex + 1 : 0;
  const visibleEnd = Math.min(firstRecipeIndex + paginatedRecipes.length, filteredRecipes.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeCalories, activeProtein, showSavedOnly]);

  const openRecipeDetail = useCallback((recipe, options = {}) => {
    const grams = clampMealGrams(options.grams ?? 100);
    setSelectedRecipe(recipe);
    setShowFullRecipeGuide(Boolean(options.showGuide));
    setMealQuantity(grams);
    setDietRecipeContext(options.dietContext || null);
  }, []);

  const openRecipeFullGuide = useCallback((recipe, event) => {
    event?.stopPropagation();
    openRecipeDetail(recipe, { showGuide: true });
  }, [openRecipeDetail]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const requestedRecipe = params.get("recipe") || params.get("selectedRecipe");
    const requestedSearch = params.get("search") || params.get("q") || requestedRecipe;

    if (!requestedSearch) return;

    setSearchTerm(requestedSearch);
    setActiveCalories("All");
    setActiveProtein("All");
    setShowSavedOnly(false);
    setCurrentPage(1);

    const shouldOpenRecipe =
      params.get("open") === "1" ||
      Boolean(requestedRecipe) ||
      Boolean(params.get("grams")) ||
      Boolean(params.get("targetCalories"));

    if (!shouldOpenRecipe) return;

    const recipeFromQuery = findRecipeByQuery(recipes, requestedRecipe || requestedSearch);
    if (!recipeFromQuery) return;

    const targetCalories = toPositiveNumber(params.get("targetCalories"), 0);
    const targetProtein = toPositiveNumber(params.get("targetProtein"), 0);
    const targetCarbs = toPositiveNumber(params.get("targetCarbs"), 0);
    const targetFats = toPositiveNumber(params.get("targetFats") || params.get("targetFat"), 0);
    const grams = params.get("grams")
      ? clampMealGrams(params.get("grams"))
      : calculateDietPlanGrams(recipeFromQuery, targetCalories, targetProtein);

    const recipeIndex = recipes.findIndex((recipe) => recipe.id === recipeFromQuery.id);
    if (recipeIndex >= 0) setCurrentPage(Math.floor(recipeIndex / RECIPES_PER_PAGE) + 1);

    openRecipeDetail(recipeFromQuery, {
      grams,
      dietContext: {
        source: params.get("source") || "diet",
        mealType: params.get("mealType") || "",
        targetCalories,
        targetProtein,
        targetCarbs,
        targetFats,
      },
    });
  }, [location.search, openRecipeDetail, recipes]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const closePopup = () => {
    setSelectedRecipe(null);
    setShowFullRecipeGuide(false);
    setDietRecipeContext(null);
    setReviewText("");
    setReviewRating(5);
  };

  const toggleLocalRecipe = (recipe, storageKey, list, setter) => {
    const exists = list.includes(recipe.name);
    const next = exists ? list.filter((name) => name !== recipe.name) : [recipe.name, ...list];
    setter(next);
    saveJson(storageKey, next);
  };

  const toggleSavedRecipe = (recipe, event) => {
    event?.stopPropagation();
    toggleLocalRecipe(recipe, STORAGE_KEYS.saved, savedRecipeNames, setSavedRecipeNames);
  };

  const toggleTriedRecipe = (recipe, event) => {
    event?.stopPropagation();
    toggleLocalRecipe(recipe, STORAGE_KEYS.tried, triedRecipeNames, setTriedRecipeNames);
  };

  const submitReview = () => {
    if (!selectedRecipe || !reviewText.trim()) return;

    const reviewerName = getCurrentUserName(currentUser);
    const existingReviews = recipeReviews[selectedRecipe.name] || [];
    const existingReview = existingReviews.find((review) =>
      isReviewFromReviewer(review, currentReviewerId, reviewerName)
    );

    const nextReview = {
      id: existingReview?.id || `${Date.now()}`,
      reviewerId: currentReviewerId,
      author: reviewerName,
      rating: Number(reviewRating) || 5,
      text: reviewText.trim(),
      createdAt: existingReview?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const nextRecipeReviews = existingReview
      ? existingReviews.map((review) =>
          isReviewFromReviewer(review, currentReviewerId, reviewerName) ? nextReview : review
        )
      : [nextReview, ...existingReviews];

    const nextReviews = normalizeRecipeReviews({
      ...recipeReviews,
      [selectedRecipe.name]: nextRecipeReviews,
    });

    setRecipeReviews(nextReviews);
  };

  const deleteOwnReview = () => {
    if (!selectedRecipe) return;

    const reviewerName = getCurrentUserName(currentUser);
    const existingReviews = recipeReviews[selectedRecipe.name] || [];
    const nextRecipeReviews = existingReviews.filter((review) =>
      !isReviewFromReviewer(review, currentReviewerId, reviewerName)
    );
    const nextReviews = {
      ...recipeReviews,
      [selectedRecipe.name]: nextRecipeReviews,
    };

    if (!nextRecipeReviews.length) delete nextReviews[selectedRecipe.name];

    setRecipeReviews(normalizeRecipeReviews(nextReviews));
    setReviewText("");
    setReviewRating(5);
  };

  const openRecipeEditor = (recipe, event) => {
    event?.stopPropagation();
    setRecipeAdminMessage("");
    setRecipeEditor({
      recipe,
      form: recipeToAdminForm(recipe),
    });
  };

  const updateRecipeEditor = (field, value) => {
    setRecipeEditor((prev) => prev ? { ...prev, form: { ...prev.form, [field]: value } } : prev);
  };

  const closeRecipeEditor = () => {
    setRecipeEditor(null);
    setRecipeAdminSaving(false);
  };

  const saveAdminRecipeEdit = async (event) => {
    event.preventDefault();
    if (!recipeEditor?.recipe || !canManageRecipes) return;

    const { recipe, form } = recipeEditor;
    const title = form.title.trim();
    const ingredients = form.ingredients.trim();
    const steps = form.steps.trim();

    if (!title || !ingredients || !steps) {
      setRecipeAdminMessage("Title, ingredients, and steps are required.");
      return;
    }

    setRecipeAdminSaving(true);
    setRecipeAdminMessage("");

    const payload = {
      title,
      description: form.description.trim(),
      imageUrl: form.imageUrl.trim(),
      caloriesPerServing: form.caloriesPerServing === "" ? null : Number(form.caloriesPerServing),
      servings: Number(form.servings) || 1,
      ingredientsJson: linesToJson(ingredients),
      stepsJson: linesToJson(steps),
    };

    try {
      if (recipe.source === "backend" && recipe.backendId) {
        await axios.put(`${API_BASE_URL}/recipes/${recipe.backendId}`, payload, authHeaders());
        await loadBackendRecipes();
        setRecipeAdminMessage("Recipe updated.");
      } else {
        const key = recipe.adminKey || normalizeRecipeName(recipe.originalName || recipe.name);
        const nextOverrides = {
          ...adminRecipeOverrides,
          [key]: {
            name: payload.title,
            desc: payload.description,
            image: payload.imageUrl || recipe.image,
            calories: `${payload.caloriesPerServing || 0} kcal`,
            servings: payload.servings,
            ingredients: ingredients.split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
            directions: steps.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).join(". "),
          },
        };
        setAdminRecipeOverrides(nextOverrides);
        saveJson(STORAGE_KEYS.adminOverrides, nextOverrides);
        setRecipeAdminMessage("Recipe updated in this catalog.");
      }

      setSelectedRecipe(null);
      closeRecipeEditor();
    } catch (error) {
      setRecipeAdminMessage(error?.response?.data?.message || "Could not update this recipe.");
    } finally {
      setRecipeAdminSaving(false);
    }
  };

  const deleteAdminRecipe = (recipe, event) => {
    event?.stopPropagation();
    if (!recipe || !canManageRecipes) return;

    setRecipeConfirmDialog({
      title: "Delete recipe?",
      message: `Delete ${recipe.name}? It will disappear from the recipe page.`,
      confirmText: "Delete recipe",
      onConfirm: async () => {
        if (recipe.source === "backend" && recipe.backendId) {
          await axios.delete(`${API_BASE_URL}/recipes/${recipe.backendId}`, authHeaders());
          setBackendRecipes((prev) => prev.filter((item) => item.backendId !== recipe.backendId));
          await loadBackendRecipes();
        }

        const key = recipe.adminKey || normalizeRecipeName(recipe.originalName || recipe.name);
        const nextHidden = Array.from(new Set([...adminHiddenRecipeKeys, key, normalizeRecipeName(recipe.name)]));
        setAdminHiddenRecipeKeys(nextHidden);
        saveJson(STORAGE_KEYS.adminHidden, nextHidden);

        setSavedRecipeNames((prev) => {
          const next = prev.filter((name) => name !== recipe.name);
          saveJson(STORAGE_KEYS.saved, next);
          return next;
        });
        setTriedRecipeNames((prev) => {
          const next = prev.filter((name) => name !== recipe.name);
          saveJson(STORAGE_KEYS.tried, next);
          return next;
        });
        setSelectedRecipe(null);
        setRecipeAdminMessage("Recipe deleted.");
      },
    });
  };

  useEffect(() => {
    const selectedRecipeName = location.state?.selectedRecipeName;

    if (!selectedRecipeName) return;

    const recipeFromHome = recipes.find(
      (recipe) => recipe.name.toLowerCase() === selectedRecipeName.toLowerCase()
    );

    if (recipeFromHome) {
      const recipeIndex = recipes.findIndex((recipe) => recipe.id === recipeFromHome.id);
      setCurrentPage(Math.floor(recipeIndex / RECIPES_PER_PAGE) + 1);
      openRecipeDetail(recipeFromHome);

      setTimeout(() => {
        const recipeCard = document.querySelector(
          `[data-recipe-name="${recipeFromHome.name}"]`
        );

        if (recipeCard) {
          recipeCard.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 200);
    }
  }, [location.state, openRecipeDetail, recipes]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") closePopup();
    };

    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.body.style.overflow = selectedRecipe ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [selectedRecipe]);

  const selectedReviews = selectedRecipe ? recipeReviews[selectedRecipe.name] || [] : [];
  const currentReviewerName = getCurrentUserName(currentUser);
  const selectedOwnReview = selectedReviews.find((review) =>
    isReviewFromReviewer(review, currentReviewerId, currentReviewerName)
  );
  const hasReviewedSelectedRecipe = Boolean(selectedOwnReview);

  useEffect(() => {
    if (selectedOwnReview) {
      setReviewText(selectedOwnReview.text || "");
      setReviewRating(selectedOwnReview.rating || 5);
      return;
    }

    setReviewText("");
    setReviewRating(5);
  }, [currentReviewerId, selectedOwnReview, selectedRecipe?.name]);

  const adjustedMealGrams = clampMealGrams(mealQuantity);
  const selectedAdjustedNutrition = selectedRecipe
    ? scaleNutritionByGrams(selectedRecipe.nutrition, adjustedMealGrams)
    : null;
  const selectedFullRecipeGuide = selectedRecipe ? buildFullRecipeGuide(selectedRecipe) : null;

  return (
    <>
      <Navbar />

      <section className="bg-container recipe-experience-page">
        <section className="recipes-hero" aria-labelledby="recipes-page-title">
          <div className="hero-title-section">
            <h1 id="recipes-page-title">Healthy Meals</h1>
            <p className="hero-subtitle">
              {recipes.length} healthy meals with calories, ingredients, and directions
            </p>
          </div>

          <div className="recipe-search-panel" aria-label="Recipe search filters">
            <div className="recipe-search-box">
              <FiSearch aria-hidden="true" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search recipes by title or description"
                aria-label="Search recipes"
              />
            </div>

            <div className="recipe-hero-filter">
              <label htmlFor="recipe-calorie-filter">Calories</label>
              <select
                id="recipe-calorie-filter"
                value={activeCalories}
                onChange={(e) => setActiveCalories(e.target.value)}
              >
                {calorieFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="recipe-hero-filter">
              <label htmlFor="recipe-protein-filter">Protein</label>
              <select
                id="recipe-protein-filter"
                value={activeProtein}
                onChange={(e) => setActiveProtein(e.target.value)}
              >
                {proteinFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className={`saved-filter-btn ${showSavedOnly ? "active" : ""}`}
              onClick={() => setShowSavedOnly((value) => !value)}
            >
              <FiBookmark aria-hidden="true" />
              <span>Favorites</span>
            </button>
          </div>
        </section>

        <section className="recipes-section">
          <div className="recipes-result-header">
            <div>
              <span className="panel-kicker">Recipe library</span>
              <h2>{filteredRecipes.length} matching meals</h2>
              <p className="recipe-page-count">
                Showing {visibleStart}-{visibleEnd} of {filteredRecipes.length}
              </p>
            </div>
            <p>Browse meals with clear calories, protein, prep time, and simple cooking notes.</p>
          </div>

          {filteredRecipes.length === 0 ? (
            <div className="recipe-empty-state">
              <h3>No recipes matched this filter</h3>
              <p>Try clearing the search, choosing “All”, or switching the mood filter.</p>
            </div>
          ) : (
            <div className="recipes-grid smart-recipes-grid">
              {paginatedRecipes.map((recipe) => {
                const isSaved = savedRecipeNames.includes(recipe.name);
                const isTried = triedRecipeNames.includes(recipe.name);

                return (
                  <article
                    className="recipe-card smart-recipe-card"
                    key={recipe.id}
                    data-recipe-name={recipe.name}
                    onClick={() => openRecipeDetail(recipe)}
                  >
                    <button
                      type="button"
                      className={`recipe-card-save ${isSaved ? "active" : ""}`}
                      onClick={(e) => toggleSavedRecipe(recipe, e)}
                      aria-label={isSaved ? "Remove from saved" : "Save recipe"}
                    >
                      <FiHeart aria-hidden="true" />
                    </button>

                    {canManageRecipes && (
                      <div className="recipe-card-admin-actions" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={(e) => openRecipeEditor(recipe, e)} aria-label={`Edit ${recipe.name}`}>
                          <FiEdit2 aria-hidden="true" />
                          <span>Edit</span>
                        </button>
                        <button type="button" className="danger" onClick={(e) => deleteAdminRecipe(recipe, e)} aria-label={`Delete ${recipe.name}`}>
                          <FiTrash2 aria-hidden="true" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}

                    <div className="card-img-wrap">
                      <RecipeImage src={recipe.image} alt={recipe.name} />
                      <span className="calories-badge">{recipe.calories}</span>
                      <span className="time-badge"><FiClock aria-hidden="true" /> {recipe.minutes} min</span>
                    </div>

                    <div className="card-content">
                      <div className="card-tags">
                        {recipe.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}
                      </div>
                      <h3>{recipe.name}</h3>
                      <p>{recipe.story}</p>
                      <div className="card-macro-row">
                        <span>{recipe.nutrition.protein}g protein</span>
                        <span>{recipe.difficulty}</span>
                        <span>{recipe.mood}</span>
                      </div>
                      <div className="card-footer-actions">
                        <span className="recipe-card-cta">View recipe</span>
                        <button
                          type="button"
                          className="recipe-card-full-btn"
                          onClick={(e) => openRecipeFullGuide(recipe, e)}
                        >
                          <FiBookOpen aria-hidden="true" />
                          Full details
                        </button>
                        {isTried ? <span className="tried-mini-badge"><FiCheck aria-hidden="true" /> Cooked</span> : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {filteredRecipes.length > RECIPES_PER_PAGE && (
            <div className="recipes-pagination" aria-label="Recipes pages">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPageSafe === 1}
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <button
                  type="button"
                  key={page}
                  className={page === currentPageSafe ? "active" : ""}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPageSafe === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </section>

        {selectedRecipe && (
          <div className="popup-overlay" onClick={closePopup}>
            <div
              className="popup recipe-detail-modal"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={selectedRecipe.name}
            >
              <button className="popup-close" onClick={closePopup} aria-label="Close"><FiX aria-hidden="true" /></button>

              <div className="popup-left recipe-detail-visual">
                <RecipeImage src={selectedRecipe.image} alt={selectedRecipe.name} />
                <div className="visual-overlay-card">
                  <span>{selectedRecipe.mood} mood</span>
                  <h3>{selectedRecipe.goals[0]}</h3>
                  <p>{selectedRecipe.minutes} min / {selectedRecipe.difficulty}</p>
                </div>
              </div>

              <div className="popup-right recipe-detail-content">
                  <div className="detail-topline">
                    <span className="panel-kicker">Recipe with meaning</span>
                    <div className="detail-action-row">
                      <button type="button" className={savedRecipeNames.includes(selectedRecipe.name) ? "active" : ""} onClick={() => toggleSavedRecipe(selectedRecipe)}>
                        <FiHeart aria-hidden="true" />
                      <span>{savedRecipeNames.includes(selectedRecipe.name) ? "Saved" : "Save"}</span>
                    </button>
                    <button type="button" className={triedRecipeNames.includes(selectedRecipe.name) ? "active" : ""} onClick={() => toggleTriedRecipe(selectedRecipe)}>
                      <FiCheck aria-hidden="true" />
                        <span>{triedRecipeNames.includes(selectedRecipe.name) ? "Tried" : "I cooked this"}</span>
                      </button>
                    <button
                      type="button"
                      className={showFullRecipeGuide ? "active" : ""}
                      onClick={() => setShowFullRecipeGuide((value) => !value)}
                    >
                      <FiBookOpen aria-hidden="true" />
                      <span>{showFullRecipeGuide ? "Hide full method" : "Full method"}</span>
                    </button>
                    </div>
                  </div>

                  {canManageRecipes && (
                    <div className="detail-admin-actions">
                      <button type="button" onClick={(e) => openRecipeEditor(selectedRecipe, e)}>
                        <FiEdit2 aria-hidden="true" />
                        Edit recipe
                      </button>
                      <button type="button" className="danger" onClick={(e) => deleteAdminRecipe(selectedRecipe, e)}>
                        <FiTrash2 aria-hidden="true" />
                        Delete recipe
                      </button>
                    </div>
                  )}

                <h2>{selectedRecipe.name}</h2>
                <p className="popup-desc">{selectedRecipe.desc}</p>

                {dietRecipeContext && (
                  <div className="diet-recipe-sync">
                    <strong>Adjusted from Diet Plan</strong>
                    <span>
                      {dietRecipeContext.mealType ? `${dietRecipeContext.mealType} / ` : ""}
                      {dietRecipeContext.targetCalories ? `${dietRecipeContext.targetCalories} kcal target` : "Portion target"}
                      {dietRecipeContext.targetProtein ? ` / ${dietRecipeContext.targetProtein}g protein` : ""}
                    </span>
                  </div>
                )}

                <div className="detail-summary-grid">
                  <div><strong>{selectedAdjustedNutrition.calories}</strong><span>kcal</span></div>
                  <div><strong>{selectedAdjustedNutrition.protein}g</strong><span>protein</span></div>
                  <div><strong>{selectedAdjustedNutrition.carbs}g</strong><span>carbs</span></div>
                  <div><strong>{selectedAdjustedNutrition.fats}g</strong><span>fats</span></div>
                  <div><strong>{adjustedMealGrams}g</strong><span>portion</span></div>
                  <div><strong>{selectedRecipe.minutes}</strong><span>minutes</span></div>
                  <div><strong>{selectedRecipe.difficulty}</strong><span>level</span></div>
                </div>

                <div className="detail-tag-cloud">
                  {Array.from(new Set([...selectedRecipe.goals, ...selectedRecipe.tags])).slice(0, 8).map((tag) => <span key={tag}>{tag}</span>)}
                </div>

                <div className="meaning-card">
                  <h4>Why this recipe?</h4>
                  <p>{selectedRecipe.story}</p>
                </div>

                {showFullRecipeGuide && selectedFullRecipeGuide && (
                  <div className="full-recipe-guide">
                    <div className="full-guide-header">
                      <div>
                        <span>{selectedFullRecipeGuide.sourceNote}</span>
                        <h4>Full ingredients and method</h4>
                      </div>
                      <strong>Serves {selectedFullRecipeGuide.servings}</strong>
                    </div>
                    <p className="full-guide-prep">{selectedFullRecipeGuide.prep}</p>
                    <div className="full-guide-grid">
                      <div>
                        <h5>Measured ingredients</h5>
                        <ul>
                          {selectedFullRecipeGuide.ingredients.map((item, index) => (
                            <li key={`${item}-${index}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h5>Detailed method</h5>
                        <ol>
                          {selectedFullRecipeGuide.method.map((step, index) => (
                            <li key={`${step}-${index}`}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    </div>
                    <div className="full-guide-finish">
                      <strong>Finish check</strong>
                      <p>{selectedFullRecipeGuide.finish}</p>
                    </div>
                  </div>
                )}

                <div className="popup-section ingredients-section">
                  <h4>Ingredients</h4>
                  <ul className="ingredient-checklist">
                    {selectedRecipe.ingredients.map((item, index) => (
                      <li key={index}><span>OK</span>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="popup-section substitutions-section">
                  <h4>Ingredient swaps</h4>
                  <div className="substitution-list">
                    {selectedRecipe.substitutions.map((item, index) => (
                      <div key={index}>{item}</div>
                    ))}
                  </div>
                </div>

                <div className="popup-section steps-section">
                  <h4>Cooking timeline</h4>
                  <div className="steps-timeline">
                    {selectedRecipe.steps.map((step, index) => (
                      <div className="timeline-step" key={`${step.title}-${index}`}>
                        <span className="timeline-index">{index + 1}</span>
                        <div>
                          <strong>{step.title} / about {step.minutes} min</strong>
                          <p>{step.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="tips-grid">
                  <div>
                    <span>Chef Tip</span>
                    <p>{selectedRecipe.chefTip}</p>
                  </div>
                  <div>
                    <span>Health Tip</span>
                    <p>{selectedRecipe.healthTip}</p>
                  </div>
                </div>

                <div className="meal-save-box smart-save-box">
                  <div>
                    <label>Meal portion</label>
                    <p>Changing grams updates calories, protein, carbs, and fats instantly.</p>
                    <div className="portion-macro-preview">
                      <span>{selectedAdjustedNutrition.calories} kcal</span>
                      <span>{selectedAdjustedNutrition.protein}g protein</span>
                      <span>{selectedAdjustedNutrition.carbs}g carbs</span>
                      <span>{selectedAdjustedNutrition.fats}g fats</span>
                    </div>
                  </div>
                  <div className="save-meal-controls">
                    <input
                      type="number"
                      min="1"
                      max="2000"
                      value={mealQuantity}
                      onChange={(e) => setMealQuantity(clampMealGrams(e.target.value))}
                      aria-label="Quantity grams"
                    />
                  </div>
                </div>

                <div className="recipe-review-box">
                  <div className="review-header">
                    <h4>Community reviews</h4>
                    <span>{selectedReviews.length} review{selectedReviews.length === 1 ? "" : "s"}</span>
                  </div>
                  <div className="review-composer">
                    <select
                      value={reviewRating}
                      onChange={(e) => setReviewRating(e.target.value)}
                    >
                      {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} stars</option>)}
                    </select>
                    <input
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder={hasReviewedSelectedRecipe ? "Edit your review..." : "I tried it with extra lemon..."}
                    />
                    <div className="review-composer-actions">
                      <button type="button" onClick={submitReview} disabled={!reviewText.trim()}>
                        {hasReviewedSelectedRecipe ? "Update review" : "Add review"}
                      </button>
                      {hasReviewedSelectedRecipe ? (
                        <button type="button" className="review-delete-button" onClick={deleteOwnReview}>
                          Delete review
                        </button>
                      ) : null}
                    </div>
                    {hasReviewedSelectedRecipe ? (
                      <p className="review-limit-message">You can edit your review anytime.</p>
                    ) : null}
                  </div>

                  {selectedReviews.length === 0 ? (
                    <p className="empty-reviews">No reviews yet. Be the first one to add a cooking note.</p>
                  ) : (
                    <div className="review-list">
                      {selectedReviews.map((review) => (
                        <div className="review-item" key={review.id}>
                          <strong>{review.author} / {review.rating} stars</strong>
                          <p>{review.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {recipeEditor && (
          <div className="popup-overlay recipe-admin-overlay" onClick={closeRecipeEditor}>
            <form className="recipe-admin-edit-modal" onSubmit={saveAdminRecipeEdit} onClick={(e) => e.stopPropagation()}>
              <button type="button" className="popup-close" onClick={closeRecipeEditor} aria-label="Close"><FiX aria-hidden="true" /></button>
              <span className="panel-kicker">Admin recipe editor</span>
              <h2>{recipeEditor.recipe.source === "backend" ? "Edit backend recipe" : "Edit catalog recipe"}</h2>
              <div className="recipe-admin-form-grid">
                <label>Title<input value={recipeEditor.form.title} onChange={(e) => updateRecipeEditor("title", e.target.value)} required /></label>
                <label>Calories<input type="number" min="0" value={recipeEditor.form.caloriesPerServing} onChange={(e) => updateRecipeEditor("caloriesPerServing", e.target.value)} /></label>
                <label>Servings<input type="number" min="1" value={recipeEditor.form.servings} onChange={(e) => updateRecipeEditor("servings", e.target.value)} required /></label>
                <label>Image URL<input value={recipeEditor.form.imageUrl} onChange={(e) => updateRecipeEditor("imageUrl", e.target.value)} /></label>
              </div>
              <label>Description<textarea value={recipeEditor.form.description} onChange={(e) => updateRecipeEditor("description", e.target.value)} rows={3} /></label>
              <div className="recipe-admin-form-grid two">
                <label>Ingredients<textarea value={recipeEditor.form.ingredients} onChange={(e) => updateRecipeEditor("ingredients", e.target.value)} rows={7} required /></label>
                <label>Steps<textarea value={recipeEditor.form.steps} onChange={(e) => updateRecipeEditor("steps", e.target.value)} rows={7} required /></label>
              </div>
              {recipeAdminMessage && <p className="recipe-admin-message">{recipeAdminMessage}</p>}
              <div className="recipe-admin-modal-actions">
                <button type="button" onClick={closeRecipeEditor}>Cancel</button>
                <button type="submit" disabled={recipeAdminSaving}>{recipeAdminSaving ? "Saving..." : "Save changes"}</button>
              </div>
            </form>
          </div>
        )}
      </section>

      {recipeAdminMessage && !recipeEditor && <div className="recipe-admin-toast">{recipeAdminMessage}</div>}
      <ConfirmDialog
        open={Boolean(recipeConfirmDialog)}
        title={recipeConfirmDialog?.title}
        message={recipeConfirmDialog?.message}
        confirmText={recipeConfirmDialog?.confirmText || "Delete"}
        cancelText="Cancel"
        tone="danger"
        onCancel={() => setRecipeConfirmDialog(null)}
        onConfirm={recipeConfirmDialog?.onConfirm}
      />

      <Footer />
    </>
  );
};

export default Recipes;
