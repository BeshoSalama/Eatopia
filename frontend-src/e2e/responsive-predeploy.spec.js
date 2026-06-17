const { expect, test } = require("@playwright/test");
const { loginAsUser } = require("./helpers");

async function expectNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => {
    const width = window.innerWidth;
    const doc = document.documentElement;
    const body = document.body;
    return Math.max(doc.scrollWidth, body.scrollWidth) <= width + 2;
  });
  expect(overflow).toBe(true);
}

test("recipes page fits mobile viewport without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/recipes");

  await expect(page.getByRole("heading", { name: "Healthy Meals" })).toBeVisible();
  await expect(page.getByPlaceholder("Search recipes by title or description")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("diet plan form keeps generate controls reachable on mobile", async ({ page }) => {
  await loginAsUser(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname.endsWith("/profile")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, user: { age: 30, height: 175, weight: 82, goal: "lose_weight", activityLevel: "moderate" } }),
      });
    }
    if (pathname.endsWith("/notifications")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: [], unread_count: 0 }) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: [] }) });
  });

  await page.goto("/dietplan");

  await expect(page.getByRole("button", { name: "Generate Plan" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate Plan" })).toBeEnabled();
  await expectNoHorizontalOverflow(page);
});
