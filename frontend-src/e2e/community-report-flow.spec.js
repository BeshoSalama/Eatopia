const { expect, test } = require("@playwright/test");
const { adminUser, regularUser, mockCommunityModerationApi } = require("./helpers");

async function setSession(page, user, token) {
  await page.evaluate(
    ({ nextUser, nextToken }) => {
      window.localStorage.setItem("eatopiaUser", JSON.stringify(nextUser));
      window.localStorage.setItem("token", nextToken);
      window.localStorage.setItem("refreshToken", `${nextToken}-refresh`);
    },
    { nextUser: user, nextToken: token }
  );
}

test("reported community post appears in admin reports and can be actioned", async ({ page }) => {
  const api = await mockCommunityModerationApi(page);

  await page.goto("/");
  await setSession(page, regularUser, "e2e-user-token");
  await page.goto("/communityHomePage");

  await expect(page.getByText("This post is used by the E2E report flow.")).toBeVisible();
  await page.getByRole("button", { name: "Open post actions" }).click();
  await page.getByRole("button", { name: "Report post" }).click();

  const reportDialog = page.getByRole("dialog", { name: "Report post" });
  await expect(reportDialog).toBeVisible();
  await reportDialog.getByRole("textbox", { name: "Reason" }).fill("This post contains unsafe advice.");
  await reportDialog.getByRole("button", { name: "Report", exact: true }).click();

  await expect.poll(() => api.getReports().length).toBe(1);
  expect(api.getReports()[0].reason).toBe("This post contains unsafe advice.");

  await setSession(page, adminUser, "e2e-admin-token");

  await page.goto("/admin");
  await page
    .getByRole("navigation", { name: "Admin dashboard sections" })
    .getByRole("button", { name: "Reports", exact: true })
    .click();

  await expect(page.getByText("This post contains unsafe advice.")).toBeVisible();
  await expect(page.getByText("Content: This post is used by the E2E report flow.", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Reviewed" }).click();

  await expect(page.getByText("Report action applied.")).toBeVisible();
  expect(api.getActionRequests()).toContainEqual({ action: "reviewed", note: "" });
});
