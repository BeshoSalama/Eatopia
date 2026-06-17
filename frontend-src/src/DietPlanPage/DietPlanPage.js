import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ConfirmDialog from "../components/ConfirmDialog";
import "./DietPlanPage.css";
import CuateImg from "../assets/cuate.png";
import BroImg from "../assets/bro.png";
import RafikiImg from "../assets/rafiiiiiki.png";
import PanaImg from "../assets/pana.png";
import HeroImg from "../assets/410.jpg";
import { API_BASE_URL } from "../config/api";
import { storeBackendUser, syncStoredUserFromBackend } from "../services/authHelpers";
import egyptianRecipesSeed from "../data/egyptianRecipesSeed.json";

const mealImages = {
  breakfast: CuateImg,
  lunch: BroImg,
  dinner: RafikiImg,
  snacks: PanaImg,
};

const healthFieldConfig = [
  { key: "age", label: "Age", prompt: "Enter your age", type: "number", min: 12, max: 100, suffix: "years" },
  { key: "height", label: "Height", prompt: "Enter your height", type: "number", min: 90, max: 230, suffix: "cm" },
  { key: "weight", label: "Weight", prompt: "Enter your weight", type: "number", min: 30, max: 300, suffix: "kg" },
  {
    key: "goal",
    label: "Goal",
    prompt: "Choose your goal",
    type: "select",
    options: [
      { value: "lose_weight", label: "Weight loss" },
      { value: "maintain", label: "Maintain weight" },
      { value: "gain_muscle", label: "Muscle gain" },
    ],
  },
  {
    key: "activityLevel",
    label: "Activity",
    prompt: "Choose your activity level",
    type: "select",
    options: [
      { value: "sedentary", label: "Sedentary" },
      { value: "light", label: "Light" },
      { value: "moderate", label: "Moderate" },
      { value: "active", label: "Active" },
    ],
  },
];

const formatDateForAge = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) age -= 1;
  return age > 0 ? age : null;
};

const normalizeGoal = (value) => {
  const text = String(value || "").trim().toLowerCase().replace(/[-\s]+/g, "_");
  if (["lose_weight", "weight_loss", "fat_loss", "cut", "slim"].includes(text)) return "lose_weight";
  if (["gain_muscle", "muscle_gain", "bulk", "build_muscle"].includes(text)) return "gain_muscle";
  if (["maintain", "maintenance", "healthy_balance"].includes(text)) return "maintain";
  return text;
};

const normalizeActivity = (value) => {
  const text = String(value || "").trim().toLowerCase();
  if (["sedentary", "light", "moderate", "active"].includes(text)) return text;
  return text;
};

const normalizeProfileForDiet = (user = {}) => ({
  age: user.age ?? user.Age ?? formatDateForAge(user.birthDate || user.BirthDate) ?? "",
  height: user.height ?? user.heightCm ?? user.HeightCm ?? user.Height ?? "",
  weight: user.weight ?? user.weightKg ?? user.WeightKg ?? user.Weight ?? "",
  goal: normalizeGoal(user.goal || user.Goal || ""),
  activityLevel: normalizeActivity(user.activityLevel || user.ActivityLevel || user.activity || ""),
});

const hasHealthValue = (value) => value !== null && value !== undefined && String(value).trim() !== "";

const toProfileNumber = (value) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
};

const formatGoalLabel = (value) =>
  healthFieldConfig.find((field) => field.key === "goal")?.options?.find((option) => option.value === value)?.label ||
  "Goal";

const formatActivityLabel = (value) =>
  healthFieldConfig.find((field) => field.key === "activityLevel")?.options?.find((option) => option.value === value)?.label ||
  "Activity";

const formatSignedKg = (value) => {
  const numberValue = Number(value || 0);
  if (numberValue === 0) return "0 kg";
  return `${numberValue > 0 ? "+" : ""}${numberValue.toFixed(1)} kg`;
};

const getMealRecipeSearch = (meal) =>
  meal?.recipeSearch ||
  meal?.recipe_search ||
  meal?.recipeName ||
  meal?.recipe_name ||
  meal?.text?.split("\n")?.[0] ||
  "";

const normalizeMealText = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const mealAliases = {
  "ful medames bowl": "Ful Medames",
  "taameya salad plate": "Taameya",
  "molokhia chicken bowl": "Molokhia with Chicken",
  "light koshari bowl": "Koshari Bowl",
  "grilled kofta rice plate": "Grilled Kofta",
  "tuna baladi salad": "Tuna Baladi Salad",
  "eggplant mesakaa plate": "Egyptian Moussaka",
  "egyptian lentil soup": "Lentil Soup Egyptian Style",
  "sayadeya fish plate": "Sayadeya Fish",
  "vegetable torly bowl": "Torly Vegetables",
  "dates greek yogurt cup": "Belila",
  "roasted chickpeas cucumber snack": "Koshari Salad Bowl",
  "egyptian egg tomato skillet": "Shakshuka Egyptian Style",
  "low fat cheese baladi plate": "Cheese with Tomato Baladi Plate",
  "ful with eggs plate": "Ful with Eggs",
  "eggah slice": "Eggah",
  "potato eggah plate": "Potato Eggah",
  "mish cheese baladi plate": "Mish Cheese Plate",
  "molokhia rabbit bowl": "Molokhia with Rabbit",
  "kofta tomato plate": "Kofta in Tomato Sauce",
  "potato tray chicken plate": "Potato Tray with Chicken",
  "mixed mahshi tray light": "Mixed Mahshi Tray",
  "baladi salad cheese plate": "Cheese with Tomato Baladi Plate",
  "cauliflower tomato plate": "Cauliflower with Tomato Sauce",
  "egyptian potato salad plate": "Egyptian Potato Salad",
  "lentil fatta light": "Lentil Fatta",
  "belila cup": "Belila",
  "sweet potato oven dessert": "Sweet Potato Oven Dessert",
  "date milk": "Date Milk",
  "rice pudding light": "Rice Pudding",
  "baladi salad snack": "Baladi Salad",
};

const seededRecipeOptions = egyptianRecipesSeed.map((recipe) => ({
  ...recipe,
  normalizedTitle: normalizeMealText(recipe.title),
}));

const findSeedRecipe = (searchValue) => {
  const search = normalizeMealText(searchValue);
  if (!search) return null;

  const alias = mealAliases[search];
  if (alias) {
    const aliasKey = normalizeMealText(alias);
    const aliasRecipe = seededRecipeOptions.find((recipe) => recipe.normalizedTitle === aliasKey);
    if (aliasRecipe) return aliasRecipe;
  }

  const tokens = search.split(" ").filter((token) => token.length > 2 && !["with", "and", "the", "bowl", "plate", "style"].includes(token));
  const exactRecipe = seededRecipeOptions.find((recipe) => recipe.normalizedTitle === search);
  if (exactRecipe) return exactRecipe;

  const partialRecipe = seededRecipeOptions.find((recipe) => recipe.normalizedTitle.includes(search) || search.includes(recipe.normalizedTitle));
  if (partialRecipe) return partialRecipe;

  const bestMatch = seededRecipeOptions
    .map((recipe) => ({
      recipe,
      score: tokens.filter((token) => recipe.normalizedTitle.includes(token)).length,
    }))
    .sort((a, b) => b.score - a.score)[0];

  return bestMatch?.score > 0 ? bestMatch.recipe : null;
};

const extractMealNumber = (meal, keys, regex) => {
  for (const key of keys) {
    const value = meal?.[key];
    if (value !== null && value !== undefined && value !== "") {
      const numericValue = Number(value);
      if (Number.isFinite(numericValue) && numericValue > 0) return numericValue;
    }
  }

  const match = String(meal?.text || "").match(regex);
  return match ? Number(match[1]) : 0;
};

const getMealTargets = (meal) => ({
  calories: extractMealNumber(meal, ["calories", "Calories", "kcal", "Kcal"], /(\d+(?:\.\d+)?)\s*(?:cal|kcal)/i),
  protein: extractMealNumber(meal, ["protein", "Protein", "proteinG", "protein_g"], /protein\s*(\d+(?:\.\d+)?)\s*g/i),
  carbs: extractMealNumber(meal, ["carbs", "Carbs", "carbsG", "carbs_g"], /carbs\s*(\d+(?:\.\d+)?)\s*g/i),
  fat: extractMealNumber(meal, ["fat", "Fat", "fats", "Fats", "fatG", "fat_g"], /fat\s*(\d+(?:\.\d+)?)\s*g/i),
});

const calculateRecipeGrams = (recipe, targets) => {
  const calories = Number(targets?.calories || 0);
  const baseCalories = Number(recipe?.nutrition?.kcal || 0);
  if (calories > 0 && baseCalories > 0) {
    return Math.min(900, Math.max(40, Math.round((calories / baseCalories) * 100)));
  }

  return 100;
};

const getMealDisplayData = (meal, type) => {
  if (!meal) return null;

  const recipeSearch = getMealRecipeSearch(meal);
  const recipe = findSeedRecipe(recipeSearch || meal.text);
  const targets = getMealTargets(meal);
  const grams = meal?.quantityGrams || meal?.quantity_grams || calculateRecipeGrams(recipe, targets);
  const lines = String(meal.text || "").split("\n").filter(Boolean);

  return {
    type,
    title: meal.title,
    lines,
    recipeSearch,
    recipe,
    targets,
    grams,
    image: recipe?.image || mealImages[type],
    recipeName: recipe?.title || recipeSearch,
  };
};

const formatMacroLine = (targets) => {
  const parts = [];
  if (targets.calories) parts.push(`${Math.round(targets.calories)} kcal`);
  if (targets.protein) parts.push(`${Math.round(targets.protein)}g protein`);
  if (targets.carbs) parts.push(`${Math.round(targets.carbs)}g carbs`);
  if (targets.fat) parts.push(`${Math.round(targets.fat)}g fat`);
  return parts.join(" / ");
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const getMacroValue = (macros, names) => {
  for (const name of names) {
    const value = macros?.[name];
    if (value !== null && value !== undefined && value !== "") return value;
  }

  return "";
};

const DIET_PLAN_STORAGE_VERSION = 1;

const getStoredDietUser = () => {
  try {
    return JSON.parse(localStorage.getItem("eatopiaUser") || "null");
  } catch {
    return null;
  }
};

const getDietPlanStorageKey = (user = getStoredDietUser()) => {
  const userKey =
    user?.id ||
    user?.userId ||
    user?.email ||
    user?.username ||
    "current";

  return `eatopia:dietPlan:v${DIET_PLAN_STORAGE_VERSION}:${String(userKey).toLowerCase()}`;
};

const readSavedDietPlan = (user) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(getDietPlanStorageKey(user)) || "null");
    return Array.isArray(parsed?.weeklyPlan) && parsed.weeklyPlan.length ? parsed : null;
  } catch {
    return null;
  }
};

const saveDietPlanSnapshot = (snapshot, user) => {
  try {
    localStorage.setItem(
      getDietPlanStorageKey(user),
      JSON.stringify({
        ...snapshot,
        version: DIET_PLAN_STORAGE_VERSION,
        savedAt: new Date().toISOString(),
      })
    );
  } catch {
    // Local storage may be unavailable in private browsing. The generated plan still works in memory.
  }
};

const formatSavedPlanTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const DietPlanPage = () => {
  const [dietPlanVisible, setDietPlanVisible] = useState(false);
  const [activeDay, setActiveDay] = useState(1);
  const [weeklyPlan, setWeeklyPlan] = useState([]);
  const [targetMacros, setTargetMacros] = useState(null);
  const [weightForecast, setWeightForecast] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [savedPlanMeta, setSavedPlanMeta] = useState(null);
  const [replacePlanDialogOpen, setReplacePlanDialogOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [savingHealthProfile, setSavingHealthProfile] = useState(false);
  const [healthForm, setHealthForm] = useState({
    age: "",
    height: "",
    weight: "",
    goal: "",
    activityLevel: "",
  });
  const [profileNotice, setProfileNotice] = useState("");

  const [allergyTags, setAllergyTags] = useState([]);
  const [avoidTags, setAvoidTags] = useState([]);
  const [allergyInput, setAllergyInput] = useState("");
  const [avoidInput, setAvoidInput] = useState("");

  const activePlan = weeklyPlan.find((plan) => plan.day === activeDay);
  const activeMeals = activePlan?.meals;
  const missingHealthFields = useMemo(
    () => healthFieldConfig.filter((field) => !hasHealthValue(healthForm[field.key])),
    [healthForm]
  );
  const canGeneratePlan = missingHealthFields.length === 0 && !profileLoading && !isGenerating && !savingHealthProfile;

  const applySavedDietPlan = (savedPlan) => {
    if (!savedPlan?.weeklyPlan?.length) return false;

    setWeeklyPlan(savedPlan.weeklyPlan);
    setTargetMacros(savedPlan.targetMacros || null);
    setWeightForecast(savedPlan.weightForecast || []);
    setActiveDay(savedPlan.activeDay || savedPlan.weeklyPlan[0]?.day || 1);
    setDietPlanVisible(true);
    if (savedPlan.healthForm) {
      setHealthForm((prev) => ({ ...prev, ...savedPlan.healthForm }));
    }
    if (Array.isArray(savedPlan.allergyTags)) {
      setAllergyTags(savedPlan.allergyTags);
    }
    if (Array.isArray(savedPlan.avoidTags)) {
      setAvoidTags(savedPlan.avoidTags);
    }
    setSavedPlanMeta({
      generatedAt: savedPlan.generatedAt,
      savedAt: savedPlan.savedAt,
      activeDay: savedPlan.activeDay || 1,
    });
    return true;
  };

  const persistDietPlan = (overrides = {}, user) => {
    if (!weeklyPlan.length && !overrides.weeklyPlan?.length) return;

    const snapshot = {
      weeklyPlan: overrides.weeklyPlan || weeklyPlan,
      targetMacros: overrides.targetMacros !== undefined ? overrides.targetMacros : targetMacros,
      weightForecast: overrides.weightForecast !== undefined ? overrides.weightForecast : weightForecast,
      healthForm: overrides.healthForm || healthForm,
      allergyTags: overrides.allergyTags || allergyTags,
      avoidTags: overrides.avoidTags || avoidTags,
      activeDay: overrides.activeDay || activeDay,
      generatedAt: overrides.generatedAt || savedPlanMeta?.generatedAt || new Date().toISOString(),
    };

    saveDietPlanSnapshot(snapshot, user);
    setSavedPlanMeta({
      generatedAt: snapshot.generatedAt,
      savedAt: new Date().toISOString(),
      activeDay: snapshot.activeDay,
    });
  };

  useEffect(() => {
    let mounted = true;

    const loadProfileForDiet = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setProfileLoading(false);
        setProfileNotice("Log in first so the plan can use your profile data.");
        return;
      }

      try {
        const user = await syncStoredUserFromBackend();
        if (!mounted) return;
        setHealthForm((prev) => ({
          ...prev,
          ...normalizeProfileForDiet(user || {}),
        }));
        applySavedDietPlan(readSavedDietPlan(user));
        setProfileNotice("");
      } catch (error) {
        if (!mounted) return;
        const localUser = (() => {
          try {
            return JSON.parse(localStorage.getItem("eatopiaUser") || "null");
          } catch {
            return null;
          }
        })();

        setHealthForm((prev) => ({
          ...prev,
          ...normalizeProfileForDiet(localUser || {}),
        }));
        applySavedDietPlan(readSavedDietPlan(localUser));
        setProfileNotice("Could not sync your profile. Complete the fields below to continue.");
      } finally {
        if (mounted) setProfileLoading(false);
      }
    };

    loadProfileForDiet();

    return () => {
      mounted = false;
    };
  }, []);

  const addTag = (type) => {
    if (type === "allergy") {
      const value = allergyInput.trim();

      if (!value) return;

      const alreadyExists = allergyTags.some(
        (tag) => tag.toLowerCase() === value.toLowerCase()
      );

      if (!alreadyExists) {
        setAllergyTags([...allergyTags, value]);
      }

      setAllergyInput("");
    }

    if (type === "avoid") {
      const value = avoidInput.trim();

      if (!value) return;

      const alreadyExists = avoidTags.some(
        (tag) => tag.toLowerCase() === value.toLowerCase()
      );

      if (!alreadyExists) {
        setAvoidTags([...avoidTags, value]);
      }

      setAvoidInput("");
    }
  };

  const removeTag = (type, index) => {
    if (type === "allergy") {
      setAllergyTags(allergyTags.filter((_, i) => i !== index));
    } else {
      setAvoidTags(avoidTags.filter((_, i) => i !== index));
    }
  };

  const handleKeyDown = (e, type) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(type);
    }
  };

  const handleHealthChange = (key, value) => {
    setHealthForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const validateHealthProfile = () => {
    const missing = healthFieldConfig.filter((field) => !hasHealthValue(healthForm[field.key]));
    if (missing.length > 0) {
      setGenerateError(`Complete these fields first: ${missing.map((field) => field.label).join(", ")}.`);
      return false;
    }

    const invalidNumber = healthFieldConfig.find((field) => {
      if (field.type !== "number") return false;
      const value = Number(healthForm[field.key]);
      return !Number.isFinite(value) || value < field.min || value > field.max;
    });

    if (invalidNumber) {
      setGenerateError(`${invalidNumber.label} must be between ${invalidNumber.min} and ${invalidNumber.max}.`);
      return false;
    }

    return true;
  };

  const saveDietProfileInputs = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setSavingHealthProfile(true);
    try {
      const response = await fetch(`${API_BASE_URL}/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          age: toProfileNumber(healthForm.age),
          height: toProfileNumber(healthForm.height),
          weight: toProfileNumber(healthForm.weight),
          goal: healthForm.goal,
          activityLevel: healthForm.activityLevel,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || "Could not save your health profile.");
      }

      if (data?.user) {
        storeBackendUser(data.user, "User");
      }
    } finally {
      setSavingHealthProfile(false);
    }
  };

  const buildBackendPayload = () => {
    return {
      generationId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      age: toProfileNumber(healthForm.age),
      height: toProfileNumber(healthForm.height),
      weight: toProfileNumber(healthForm.weight),
      goal: healthForm.goal,
      activityLevel: healthForm.activityLevel,
      allergies: allergyTags,
      avoidFoods: avoidTags,
      durationDays: 7,
      mealsPerDay: ["breakfast", "lunch", "dinner", "snacks"],
      preferences: {
        goal: healthForm.goal,
        language: "en",
      },
    };
  };

  const normalizeBackendPlan = (data) => {
    const root = data?.data || data?.result || data;
    const plan = Array.isArray(root?.weeklyPlan) ? root.weeklyPlan : Array.isArray(root?.plan) ? root.plan : Array.isArray(root) ? root : [];

    return {
      plan,
      targetMacros: root?.targetMacros || root?.target_macros || null,
      weightForecast: root?.weightForecast || root?.weight_forecast || [],
    };
  };

  const handleGeneratePlan = async () => {
    if (!validateHealthProfile()) return;

    setIsGenerating(true);
    setGenerateError("");

    const payload = buildBackendPayload();

    try {
      await saveDietProfileInputs();

      const response = await fetch(`${API_BASE_URL}/ai/diet-plan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const missingFields = data?.missingFields || data?.missing_fields;
        throw new Error(
          missingFields?.length
            ? `Complete these fields first: ${missingFields.join(", ")}.`
            : data?.message || "Failed to generate diet plan."
        );
      }

      const generated = normalizeBackendPlan(data);

      if (!generated.plan.length) {
        throw new Error("The AI did not return a diet plan. Please try again.");
      }

      const generatedAt = new Date().toISOString();
      const currentUser = getStoredDietUser();

      setWeeklyPlan(generated.plan);
      setTargetMacros(generated.targetMacros);
      setWeightForecast(generated.weightForecast);
      setDietPlanVisible(true);
      setActiveDay(1);
      setSavedPlanMeta({
        generatedAt,
        savedAt: generatedAt,
        activeDay: 1,
      });
      saveDietPlanSnapshot(
        {
          weeklyPlan: generated.plan,
          targetMacros: generated.targetMacros,
          weightForecast: generated.weightForecast,
          healthForm,
          allergyTags,
          avoidTags,
          activeDay: 1,
          generatedAt,
        },
        currentUser
      );

      setTimeout(() => {
        document
          .getElementById("diet-plan-section")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (error) {
      setGenerateError(error?.message || "Something went wrong. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGeneratePlanClick = () => {
    if (weeklyPlan.length && !isGenerating) {
      setReplacePlanDialogOpen(true);
      return;
    }

    handleGeneratePlan();
  };

  const handleDayClick = (day) => {
    setActiveDay(day);
    persistDietPlan({ activeDay: day });
  };

  const buildPdfMealRows = (plan) =>
    ["breakfast", "lunch", "dinner", "snacks"]
      .map((type) => getMealDisplayData(plan.meals?.[type], type))
      .filter(Boolean)
      .map((meal) => `
        <tr>
          <td>${escapeHtml(meal.title)}</td>
          <td>
            <strong>${escapeHtml(meal.recipeName || meal.recipeSearch)}</strong>
            <small>${escapeHtml(meal.lines[0] || "")}</small>
          </td>
          <td>${escapeHtml(`${meal.grams}g`)}</td>
          <td>${escapeHtml(formatMacroLine(meal.targets))}</td>
        </tr>
      `)
      .join("");

  const handleDownloadPdf = () => {
    if (!weeklyPlan.length) return;

    const calories = getMacroValue(targetMacros, ["calories", "Calories"]);
    const protein = getMacroValue(targetMacros, ["protein", "Protein"]);
    const carbs = getMacroValue(targetMacros, ["carbs", "Carbs"]);
    const fat = getMacroValue(targetMacros, ["fat", "Fat"]);
    const printWindow = window.open("", "_blank", "width=920,height=1200");

    if (!printWindow) {
      setGenerateError("Allow popups to export the PDF.");
      return;
    }

    const rows = weeklyPlan
      .map((plan) => `
        <section class="day-block">
          <h2>Day ${escapeHtml(plan.day)}</h2>
          <table>
            <thead>
              <tr>
                <th>Meal</th>
                <th>Egyptian suggestion</th>
                <th>Portion</th>
                <th>Macros</th>
              </tr>
            </thead>
            <tbody>${buildPdfMealRows(plan)}</tbody>
          </table>
        </section>
      `)
      .join("");

    const forecastRows = weightForecast.slice(0, 8).map((item) => {
      const week = item.week || item.Week;
      const expectedWeight = item.expectedWeightKg ?? item.expected_weight_kg ?? item.ExpectedWeightKg;
      const expectedLoss = item.expectedLossKg ?? item.expected_loss_kg ?? item.ExpectedLossKg;
      const totalChange = item.totalChangeKg ?? item.total_change_kg ?? item.TotalChangeKg;
      return `<span>Week ${escapeHtml(week)}: ${escapeHtml(expectedWeight)} kg (${Number(expectedLoss || 0) > 0 ? `${Number(expectedLoss).toFixed(1)} kg down` : formatSignedKg(totalChange)})</span>`;
    }).join("");

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Eatopia Diet Plan</title>
          <style>
            @page { size: A4; margin: 12mm; }
            * { box-sizing: border-box; }
            body { margin: 0; color: #111; font-family: Arial, sans-serif; background: #fff; }
            .sheet { border: 3px double #111; padding: 18px; min-height: 100vh; }
            header { display: grid; grid-template-columns: 1fr auto; gap: 12px; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 12px; }
            h1 { margin: 0; font-size: 30px; letter-spacing: 0; }
            .brand { text-align: right; font-weight: 900; font-size: 24px; }
            .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 12px 0; }
            .summary div { border: 1px solid #111; padding: 8px; min-height: 54px; }
            .summary strong { display: block; font-size: 18px; }
            .profile { border: 1px solid #111; padding: 8px; margin-bottom: 12px; font-weight: 700; }
            .forecast { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0 14px; }
            .forecast span { border: 1px solid #555; padding: 5px 7px; font-size: 11px; }
            .day-block { break-inside: avoid; margin: 12px 0; }
            h2 { display: inline-block; border: 1px solid #111; padding: 5px 18px; margin: 8px 0; font-size: 18px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
            th, td { border: 1px solid #111; padding: 8px; vertical-align: top; font-size: 12px; }
            th { background: #e9e9e9; text-align: left; }
            td strong { display: block; font-size: 13px; }
            td small { display: block; color: #444; margin-top: 4px; line-height: 1.35; }
            .notes { border: 2px solid #111; border-radius: 16px; padding: 10px; margin-top: 14px; font-size: 12px; line-height: 1.7; }
            @media print { .no-print { display: none; } body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <main class="sheet">
            <header>
              <div>
                <h1>Personal Diet Program</h1>
                <p>Egyptian meal suggestions with clear portions and macros.</p>
              </div>
              <div class="brand">Eatopia</div>
            </header>
            <div class="profile">
              Age: ${escapeHtml(healthForm.age)} / Height: ${escapeHtml(healthForm.height)} cm / Weight: ${escapeHtml(healthForm.weight)} kg / Goal: ${escapeHtml(formatGoalLabel(healthForm.goal))} / Activity: ${escapeHtml(formatActivityLabel(healthForm.activityLevel))}
            </div>
            <div class="summary">
              <div><strong>${escapeHtml(calories || "-")}</strong>Daily kcal</div>
              <div><strong>${escapeHtml(protein || "-")}g</strong>Protein</div>
              <div><strong>${escapeHtml(carbs || "-")}g</strong>Carbs</div>
              <div><strong>${escapeHtml(fat || "-")}g</strong>Fat</div>
            </div>
            ${forecastRows ? `<div class="forecast">${forecastRows}</div>` : ""}
            ${rows}
            <div class="notes">
              <strong>Daily notes</strong><br />
              Drink water through the day. Keep vegetables with lunch and dinner. Use grilling, baking, or boiling when possible. If hunger is high, add salad or soup before increasing bread/rice.
            </div>
          </main>
          <script>
            window.onload = () => setTimeout(() => window.print(), 250);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const renderMealCard = (type) => {
    const meal = activeMeals?.[type];

    if (!meal) return null;

    const display = getMealDisplayData(meal, type);
    const recipeParams = new URLSearchParams({
      search: display.recipeName || display.recipeSearch || "",
      recipe: display.recipeName || display.recipeSearch || "",
      grams: String(display.grams || 100),
      targetCalories: String(Math.round(display.targets.calories || 0)),
      targetProtein: String(Math.round(display.targets.protein || 0)),
      targetCarbs: String(Math.round(display.targets.carbs || 0)),
      targetFats: String(Math.round(display.targets.fat || 0)),
      mealType: display.title || type,
      source: "diet",
      open: "1",
    });

    return (
      <div className="diet-meal-card" key={type}>
        <img src={display.image} alt={display.recipeName || display.title} />

        <h3>{display.title}</h3>

        <p>
          {display.lines.map((line, index) => (
            <React.Fragment key={index}>
              {line}
              {index !== display.lines.length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>

        <div className="diet-meal-meta">
          {formatMacroLine(display.targets) ? <span>{formatMacroLine(display.targets)}</span> : null}
          <span>{display.grams}g portion</span>
        </div>

        {(display.recipeName || display.recipeSearch) && (
          <Link
            className="diet-recipe-link"
            to={`/recipes?${recipeParams.toString()}`}
          >
            View recipe
          </Link>
        )}
      </div>
    );
  };

  return (
    <>
      <Navbar />

      <div className="diet-plan-page">
        <div className="hero-section">
          <div
            className="hero-background"
            style={{ backgroundImage: `url(${HeroImg})` }}
          >
            <div className="content-left">
              <h1 className="title">Diet Plan</h1>

              <div className="input-section">
                <div className="diet-profile-card">
                  <div>
                    <span className="diet-input-title">Profile health data</span>
                    <p className="diet-input-subtitle">
                      Your plan uses these values to calculate calories, macros, and weight progress.
                    </p>
                  </div>

                  {profileLoading ? (
                    <p className="diet-profile-message">Loading your profile...</p>
                  ) : (
                    <>
                      {profileNotice && (
                        <p className="diet-profile-message">{profileNotice}</p>
                      )}

                      {missingHealthFields.length > 0 && (
                        <div className="diet-missing-alert">
                          {missingHealthFields.map((field) => (
                            <span key={field.key}>{field.prompt}</span>
                          ))}
                        </div>
                      )}

                      <div className="diet-health-grid">
                        {healthFieldConfig.map((field) => (
                          <label className="diet-health-field" key={field.key}>
                            <span>{field.label}</span>

                            {field.type === "select" ? (
                              <select
                                value={healthForm[field.key] || ""}
                                onChange={(e) => handleHealthChange(field.key, e.target.value)}
                              >
                                <option value="">{field.prompt}</option>
                                {field.options.map((option) => (
                                  <option value={option.value} key={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className="diet-number-input">
                                <input
                                  type="number"
                                  min={field.min}
                                  max={field.max}
                                  value={healthForm[field.key] || ""}
                                  placeholder={field.prompt}
                                  onChange={(e) => handleHealthChange(field.key, e.target.value)}
                                />
                                <em>{field.suffix}</em>
                              </div>
                            )}
                          </label>
                        ))}
                      </div>

                      {missingHealthFields.length === 0 && (
                        <div className="diet-profile-summary">
                          <span>{healthForm.age} years</span>
                          <span>{healthForm.height} cm</span>
                          <span>{healthForm.weight} kg</span>
                          <span>{formatGoalLabel(healthForm.goal)}</span>
                          <span>{formatActivityLabel(healthForm.activityLevel)}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="cards">
                  <div className="diet-input-card">
                    <div className="diet-input-text">
                      <span className="diet-input-title">Food allergies</span>
                    </div>

                    <div className="tags-container" id="allergy-tags">
                      {allergyTags.map((tag, index) => (
                        <div key={index} className="tag">
                          {tag}

                          <button
                            type="button"
                            className="remove"
                            onClick={() => removeTag("allergy", index)}
                            aria-label={`Remove ${tag}`}
                          >
                            x
                          </button>
                        </div>
                      ))}

                      <input
                        className="input-tag"
                        id="allergy-input"
                        placeholder="I have a food allergy"
                        value={allergyInput}
                        onChange={(e) => setAllergyInput(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, "allergy")}
                      />
                    </div>

                    <button
                      type="button"
                      className="plus-circle"
                      id="allergy-add"
                      onClick={() => addTag("allergy")}
                    >
                      +
                    </button>
                  </div>

                  <div className="diet-input-card">
                    <div className="diet-input-text">
                      <span className="diet-input-title">Foods to avoid</span>
                    </div>

                    <div className="tags-container" id="avoid-tags">
                      {avoidTags.map((tag, index) => (
                        <div key={index} className="tag">
                          {tag}

                          <button
                            type="button"
                            className="remove"
                            onClick={() => removeTag("avoid", index)}
                            aria-label={`Remove ${tag}`}
                          >
                            x
                          </button>
                        </div>
                      ))}

                      <input
                        className="input-tag"
                        id="avoid-input"
                        placeholder="The type of food I tend to avoid"
                        value={avoidInput}
                        onChange={(e) => setAvoidInput(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, "avoid")}
                      />
                    </div>

                    <button
                      type="button"
                      className="plus-circle"
                      id="avoid-add"
                      onClick={() => addTag("avoid")}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="cta-wrap">
                  <button
                    className="cta"
                    onClick={handleGeneratePlanClick}
                    disabled={!canGeneratePlan}
                  >
                    <span>
                      {isGenerating
                        ? "Generating..."
                        : savingHealthProfile
                          ? "Saving profile..."
                          : "Generate Plan"}
                    </span>

                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z"
                        stroke="#13b67f"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>

                {generateError && (
                  <p className="generate-error">{generateError}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {dietPlanVisible && (
          <section className="plan-section" id="diet-plan-section">
            <div className="main-content">
              <div className="container">
                <div className="diet-results-column">
                  <div className="diet-plan-actions">
                    <div>
                      <span>Generated weekly plan</span>
                      <strong>Egyptian meals with exact portions</strong>
                      {savedPlanMeta && (
                        <p className="diet-saved-plan-note">
                          Saved plan restored automatically
                          {formatSavedPlanTime(savedPlanMeta.savedAt || savedPlanMeta.generatedAt)
                            ? ` / ${formatSavedPlanTime(savedPlanMeta.savedAt || savedPlanMeta.generatedAt)}`
                            : ""}
                        </p>
                      )}
                    </div>
                    <button type="button" onClick={handleDownloadPdf}>
                      Download PDF
                    </button>
                  </div>

                  {(targetMacros || weightForecast.length > 0) && (
                    <div className="diet-insights">
                      {targetMacros && (
                        <div className="diet-macro-card">
                          <span>Daily target</span>
                          <strong>{targetMacros.calories || targetMacros.Calories} kcal</strong>
                          <p>
                            {targetMacros.protein || targetMacros.Protein}g protein ·{" "}
                            {targetMacros.carbs || targetMacros.Carbs}g carbs ·{" "}
                            {targetMacros.fat || targetMacros.Fat}g fat
                          </p>
                        </div>
                      )}

                      {weightForecast.length > 0 && (
                        <div className="diet-forecast-card">
                          <div className="diet-forecast-header">
                            <span>Weight forecast</span>
                            <strong>8 weeks</strong>
                          </div>

                          <div className="diet-forecast-grid">
                            {weightForecast.slice(0, 8).map((item) => {
                              const week = item.week || item.Week;
                              const expectedWeight = item.expectedWeightKg ?? item.expected_weight_kg ?? item.ExpectedWeightKg;
                              const totalChange = item.totalChangeKg ?? item.total_change_kg ?? item.TotalChangeKg;
                              const expectedLoss = item.expectedLossKg ?? item.expected_loss_kg ?? item.ExpectedLossKg;

                              return (
                                <div className="diet-forecast-week" key={week}>
                                  <span>Week {week}</span>
                                  <strong>{expectedWeight} kg</strong>
                                  <em>
                                    {Number(expectedLoss || 0) > 0
                                      ? `${Number(expectedLoss).toFixed(1)} kg down`
                                      : formatSignedKg(totalChange)}
                                  </em>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="plan-generated">
                    {renderMealCard("breakfast")}
                    {renderMealCard("lunch")}
                    {renderMealCard("dinner")}
                    {renderMealCard("snacks")}
                  </div>
                </div>

                <div className="days-container">
                  {weeklyPlan.map((plan) => (
                    <button
                      type="button"
                      key={plan.day}
                      className={`day ${activeDay === plan.day ? "active" : ""}`}
                      onClick={() => handleDayClick(plan.day)}
                      data-day={plan.day}
                    >
                      <span>Day {plan.day}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      <Footer />
      <ConfirmDialog
        open={replacePlanDialogOpen}
        title="Replace current diet plan?"
        message="You already have a saved diet plan. Generating a new one will replace the current meals, portions, macros, and weight forecast."
        confirmText="Generate new plan"
        cancelText="Keep current plan"
        tone="info"
        onCancel={() => setReplacePlanDialogOpen(false)}
        onConfirm={handleGeneratePlan}
      />
    </>
  );
};

export default DietPlanPage;
