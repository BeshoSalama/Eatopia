const { expect, test } = require("@playwright/test");

test("diet plan redirects anonymous visitors to login", async ({ page }) => {
  await page.goto("/dietplan");

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
});

test("recipe opened from diet plan query adjusts macros by grams", async ({ page }) => {
  await page.goto("/recipes?search=Eggah&recipe=Eggah&grams=108&targetCalories=280&targetProtein=18&targetCarbs=22&targetFats=12&mealType=Breakfast&source=diet&open=1");

  await expect(page.getByRole("dialog", { name: "Eggah" })).toBeVisible();
  await expect(page.getByText("Adjusted from Diet Plan")).toBeVisible();
  await expect(page.getByRole("spinbutton", { name: "Quantity grams" })).toHaveValue("108");
  await expect(page.getByText("281 kcal")).toBeVisible();

  await page.getByRole("spinbutton", { name: "Quantity grams" }).fill("50");

  await expect(page.getByText("130 kcal")).toBeVisible();
  await expect(page.getByText("8g protein", { exact: true })).toBeVisible();
});
