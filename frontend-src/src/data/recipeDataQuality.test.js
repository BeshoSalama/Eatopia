import egyptianRecipesSeed from "./egyptianRecipesSeed.json";

const normalize = (value) => String(value || "").trim().toLowerCase();
const meatKeywords = /\b(chicken|beef|meat|kofta|fish|tuna|rabbit|liver|duck|shrimp|seafood|turkey|salmon|tilapia|sausage)\b/i;

test("Egyptian recipe seed has enough unique recipes and unique images for launch", () => {
  expect(egyptianRecipesSeed.length).toBeGreaterThanOrEqual(100);

  const titles = egyptianRecipesSeed.map((recipe) => normalize(recipe.title));
  const images = egyptianRecipesSeed.map((recipe) => normalize(recipe.image));

  expect(new Set(titles).size).toBe(titles.length);
  expect(new Set(images).size).toBe(images.length);
});

test("Egyptian recipe seed has deploy-ready media, nutrition, and cooking details", () => {
  for (const recipe of egyptianRecipesSeed) {
    expect(recipe.image).toMatch(/^\/images\/recipes\/egyptian\/.+\.(jpg|jpeg|png|webp)$/i);
    expect(recipe.shortDescription?.trim().length).toBeGreaterThan(20);
    expect(recipe.nutrition?.kcal).toBeGreaterThan(0);
    expect(typeof recipe.nutrition?.proteinG).toBe("number");
    expect(typeof recipe.nutrition?.carbsG).toBe("number");
    expect(typeof recipe.nutrition?.fatG).toBe("number");
    expect(Array.isArray(recipe.ingredients)).toBe(true);
    expect(recipe.ingredients.length).toBeGreaterThanOrEqual(4);
    expect(Array.isArray(recipe.cookingTimeline)).toBe(true);
    expect(recipe.cookingTimeline.length).toBeGreaterThanOrEqual(2);
  }
});

test("vegetarian and vegetables-tagged recipes do not contain meat-first recipe wording", () => {
  const badRecipes = egyptianRecipesSeed
    .filter((recipe) => (recipe.tags || []).some((tag) => /vegetarian|vegetables/i.test(tag)))
    .filter((recipe) => meatKeywords.test([recipe.title, recipe.shortDescription, ...(recipe.ingredients || [])].join(" ")))
    .map((recipe) => recipe.title);

  expect(badRecipes).toEqual([]);
});
