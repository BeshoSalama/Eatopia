const { expect, test } = require("@playwright/test");
const { loginAsAdmin, mockAdminApi } = require("./helpers");

test("admin can send a moderation warning from a report", async ({ page }) => {
  await loginAsAdmin(page);
  const api = await mockAdminApi(page);

  await page.goto("/admin");
  await page
    .getByRole("navigation", { name: "Admin dashboard sections" })
    .getByRole("button", { name: "Reports", exact: true })
    .click();

  await expect(page.getByText("Offensive wording")).toBeVisible();
  await page.getByRole("button", { name: "Warn" }).click();
  await expect(page.getByRole("dialog", { name: "Send warning" })).toBeVisible();
  await page.getByRole("textbox", { name: "Moderation note" }).fill("Please keep the community respectful.");
  await page.getByRole("button", { name: "Send warning" }).click();

  await expect(page.getByText("Report action applied.")).toBeVisible();
  expect(api.getActionRequests()).toContainEqual({
    action: "warn-user",
    note: "Please keep the community respectful.",
  });
});
