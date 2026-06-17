const { expect, test } = require("@playwright/test");
const { loginAsAdmin, loginAsOwner, mockAdminApi } = require("./helpers");

test("admin dashboard tabs are scoped to the current role", async ({ page }) => {
  await loginAsAdmin(page);
  await mockAdminApi(page);

  await page.goto("/admin");

  const tabs = page.getByRole("navigation", { name: "Admin dashboard sections" });
  await expect(tabs.getByRole("button", { name: "Overview", exact: true })).toBeVisible();
  await expect(tabs.getByRole("button", { name: "Users", exact: true })).toBeVisible();
  await expect(tabs.getByRole("button", { name: "Recipes", exact: true })).toBeVisible();
  await expect(tabs.getByRole("button", { name: "Reports", exact: true })).toBeVisible();
  await expect(tabs.getByRole("button", { name: "Admins", exact: true })).toHaveCount(0);
  await expect(tabs.getByRole("button", { name: "Permissions", exact: true })).toHaveCount(0);
  await expect(tabs.getByRole("button", { name: "Settings", exact: true })).toHaveCount(0);
});

test("owner can see the owner-only admin management tab", async ({ page }) => {
  await loginAsOwner(page);
  await mockAdminApi(page);

  await page.goto("/admin");

  const tabs = page.getByRole("navigation", { name: "Admin dashboard sections" });
  await expect(tabs.getByRole("button", { name: "Admins", exact: true })).toBeVisible();
});
