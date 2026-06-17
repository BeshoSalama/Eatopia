const { expect, test } = require("@playwright/test");
const { loginAsAdmin, mockAdminApi } = require("./helpers");

test.beforeEach(async ({ page }) => {
  await loginAsAdmin(page);
  await mockAdminApi(page);
});

test("admin can add a recipe with calories and delete it from the dashboard", async ({ page }) => {
  await page.goto("/admin");
  await page
    .getByRole("navigation", { name: "Admin dashboard sections" })
    .getByRole("button", { name: "Recipes", exact: true })
    .click();

  const title = `Smoke Recipe ${Date.now()}`;

  await page.getByRole("textbox", { name: "Title" }).fill(title);
  await page.getByRole("spinbutton", { name: "Calories" }).fill("333");
  await page.getByRole("spinbutton", { name: "Servings" }).fill("1");
  await page.getByRole("textbox", { name: "Description" }).fill("Smoke recipe created from E2E.");
  await page.getByRole("textbox", { name: "Ingredients" }).fill("1 cup test ingredient\n1 tsp olive oil");
  await page.getByRole("textbox", { name: "Steps" }).fill("Prepare ingredient\nServe warm");
  await page.getByRole("button", { name: "Add recipe" }).click();

  const recipeRow = page.locator(".admin-recipe-row", { hasText: title });
  await expect(recipeRow).toBeVisible();
  await expect(recipeRow).toContainText("333 kcal / 1 serving");

  await page.getByRole("button", { name: `Delete ${title}` }).click();
  await page.getByRole("button", { name: "Delete recipe" }).click();

  await expect(recipeRow).toBeHidden();
});
