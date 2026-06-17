const path = require("node:path");
const { expect, test } = require("@playwright/test");

const fixtureImage = path.join(__dirname, "../src/assets/bananaOatCookies.png");

async function uploadHeroImage(page) {
  await page.getByRole("button", { name: "Snap your meal Upload" }).click();
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Upload Image" }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles(fixtureImage);
}

test("scan result opens dish details and grams update nutrition", async ({ page }) => {
  await page.route("**/api/ai/scan", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        result: {
          isFood: true,
          foodName: "Banana Oat Cookies",
          calories: 300,
          protein: 8,
          carbs: 40,
          fat: 10,
          fiber: 5,
          sugar: 12,
          servingGrams: 100,
          ingredients: ["banana", "oats", "cinnamon"],
          instructions: ["Mash bananas.", "Mix with oats.", "Bake until set."],
        },
      }),
    });
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dish Details" })).toHaveCount(0);

  await uploadHeroImage(page);

  const dishSection = page.locator("#dish-details-section");
  await expect(dishSection.getByRole("heading", { name: "Dish Details" })).toBeVisible();
  await expect(dishSection.getByText("Banana Oat Cookies", { exact: true })).toBeVisible();
  await expect(dishSection.getByText("banana, oats, cinnamon", { exact: true })).toBeVisible();
  await expect(dishSection.getByText("Meal weight", { exact: true })).toBeVisible();
  await expect(dishSection.getByText("100g", { exact: true })).toBeVisible();

  await dishSection.getByLabel("Grams").fill("50");
  await dishSection.getByRole("button", { name: "Apply grams" }).click();

  await expect(dishSection.getByText("50g", { exact: true })).toBeVisible();
});

test("non-food scan shows a clear warning instead of fake nutrition", async ({ page }) => {
  await page.route("**/api/ai/scan", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        result: {
          isFood: false,
          foodName: "Not food",
          message: "This image does not appear to contain a meal.",
        },
      }),
    });
  });

  await page.goto("/");
  await uploadHeroImage(page);

  const dishSection = page.locator("#dish-details-section");
  await expect(dishSection.getByRole("heading", { name: "Dish Details" })).toBeVisible();
  await expect(dishSection.getByText("This does not look like food", { exact: true })).toBeVisible();
  await expect(dishSection.getByText("This image does not appear to contain a meal.", { exact: true })).toBeVisible();
  await expect(dishSection.getByText("Meal weight", { exact: true })).toHaveCount(0);
});
