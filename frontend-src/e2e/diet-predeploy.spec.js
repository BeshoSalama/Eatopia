const { expect, test } = require("@playwright/test");
const { regularUser } = require("./helpers");

const healthyUser = {
  ...regularUser,
  age: 31,
  height: 176,
  weight: 86,
  goal: "lose_weight",
  activityLevel: "moderate",
};

const buildPlan = (label = "Ful Medames Bowl") => ({
  weeklyPlan: [
    {
      day: 1,
      meals: {
        breakfast: {
          title: "Breakfast",
          text: `${label}\n390 kcal protein 18g carbs 52g fat 9g`,
          recipeSearch: label,
          calories: 390,
          protein: 18,
          carbs: 52,
          fat: 9,
        },
        lunch: {
          title: "Lunch",
          text: "Grilled Kofta\n520 kcal protein 34g carbs 55g fat 16g",
          recipeSearch: "Grilled Kofta",
          calories: 520,
          protein: 34,
          carbs: 55,
          fat: 16,
        },
        dinner: {
          title: "Dinner",
          text: "Vegetable Torly Bowl\n410 kcal protein 16g carbs 62g fat 11g",
          recipeSearch: "Vegetable Torly Bowl",
          calories: 410,
          protein: 16,
          carbs: 62,
          fat: 11,
        },
        snacks: {
          title: "Snack",
          text: "Belila Cup\n220 kcal protein 9g carbs 38g fat 5g",
          recipeSearch: "Belila",
          calories: 220,
          protein: 9,
          carbs: 38,
          fat: 5,
        },
      },
    },
  ],
  targetMacros: { calories: 1800, protein: 120, carbs: 190, fat: 55 },
  weightForecast: [
    { week: 1, expectedWeightKg: 85.2, expectedLossKg: 0.8, totalChangeKg: -0.8 },
    { week: 2, expectedWeightKg: 84.4, expectedLossKg: 0.8, totalChangeKg: -1.6 },
  ],
});

async function loginWithHealthyProfile(page) {
  await page.addInitScript((user) => {
    window.localStorage.setItem("token", "e2e-user-token");
    window.localStorage.setItem("refreshToken", "e2e-user-refresh-token");
    window.localStorage.setItem("eatopiaUser", JSON.stringify(user));
  }, healthyUser);
}

async function mockDietApi(page) {
  const requests = [];
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    const method = request.method();

    if (pathname.endsWith("/profile") && method === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, user: healthyUser }) });
    }

    if (pathname.endsWith("/profile") && method === "PUT") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, user: healthyUser }) });
    }

    if (pathname.endsWith("/notifications") && method === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: [], unread_count: 0 }) });
    }

    if (pathname.endsWith("/ai/diet-plan") && method === "POST") {
      const payload = await request.postDataJSON();
      requests.push(payload);
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: buildPlan(requests.length === 1 ? "Ful Medames Bowl" : "Eggah") }),
      });
    }

    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: [] }) });
  });

  return { requests };
}

test("diet plan uses profile data, persists generated meals, and warns before replacement", async ({ page }) => {
  await loginWithHealthyProfile(page);
  const api = await mockDietApi(page);

  await page.goto("/dietplan");

  await expect(page.getByText("31 years")).toBeVisible();
  await expect(page.getByText("176 cm")).toBeVisible();
  await expect(page.getByText("86 kg")).toBeVisible();

  await page.getByRole("button", { name: "Generate Plan" }).click();

  await expect(page.getByText("Egyptian meals with exact portions")).toBeVisible();
  await expect(page.getByText("Ful Medames Bowl")).toBeVisible();
  await expect(page.getByText("Weight forecast")).toBeVisible();
  expect(api.requests).toHaveLength(1);
  expect(api.requests[0]).toMatchObject({ age: 31, height: 176, weight: 86, goal: "lose_weight", activityLevel: "moderate" });

  await page.reload();

  await expect(page.getByText("Saved plan restored automatically")).toBeVisible();
  await expect(page.getByText("Ful Medames Bowl")).toBeVisible();
  expect(api.requests).toHaveLength(1);

  await page.getByRole("button", { name: "Generate Plan" }).click();

  await expect(page.getByRole("dialog", { name: "Replace current diet plan?" })).toBeVisible();
  await expect(page.getByText("Generating a new one will replace the current meals")).toBeVisible();
  await page.getByRole("button", { name: "Keep current plan" }).click();
  expect(api.requests).toHaveLength(1);
});
