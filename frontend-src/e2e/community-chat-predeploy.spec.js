const { expect, test } = require("@playwright/test");
const { loginAsUser, regularUser } = require("./helpers");

const requestUser = {
  id: "request-user-1",
  fullName: "Request Friend",
  name: "Request Friend",
  username: "requestfriend",
  gender: "male",
  avatar: "",
};

async function mockChatApi(page) {
  const reports = [];

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    const method = request.method();

    if (pathname.endsWith("/notifications") && method === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: [], unread_count: 0 }) });
    }

    if (pathname.endsWith("/profile") && method === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, user: regularUser }) });
    }

    if (pathname.endsWith("/community/users") && method === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: [] }) });
    }

    if (pathname.endsWith("/chat/threads") && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            {
              thread_id: "thread-1",
              other_user: requestUser,
              section: "requests",
              request_status: "Pending",
              requested_by_user_id: requestUser.id,
              last_message: {
                id: "message-1",
                thread_id: "thread-1",
                sender_id: requestUser.id,
                message_text: "Please review this request.",
                type: "text",
                sent_at: "2026-05-07T09:00:00Z",
              },
            },
          ],
        }),
      });
    }

    if (pathname.endsWith("/chat/threads/thread-1/messages") && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: "message-1",
              thread_id: "thread-1",
              sender_id: requestUser.id,
              message_text: "Please review this request.",
              type: "text",
              sent_at: "2026-05-07T09:00:00Z",
            },
          ],
        }),
      });
    }

    if (pathname.endsWith("/chat/threads/thread-1/read") && method === "PUT") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) });
    }

    if (pathname.endsWith("/chat/threads/thread-1/accept") && method === "POST") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { thread_id: "thread-1", request_status: "Accepted" } }) });
    }

    if (pathname.endsWith("/community/messages/message-1/report") && method === "POST") {
      reports.push(await request.postDataJSON());
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, message: "Message reported." }) });
    }

    if (pathname.endsWith("/community/presence/heartbeat") && method === "POST") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) });
    }

    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: [] }) });
  });

  return { reports };
}

test("message request can be accepted and reported without native browser prompts", async ({ page }) => {
  await loginAsUser(page);
  const api = await mockChatApi(page);

  await page.goto("/communityChat");

  await expect(page.getByText("MESSAGE REQUESTS", { exact: true })).toBeVisible();
  await page.getByText("requestfriend").click();
  await expect(page.getByText("Message request", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /Accept/ }).click();
  await expect(page.getByRole("status")).toContainText("Message request accepted.");

  await page.getByTitle("Report message").click();
  const dialog = page.getByRole("dialog", { name: "Report message" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("textbox", { name: "Reason" }).fill("Harassment in request.");
  await dialog.getByRole("button", { name: "Report", exact: true }).click();

  await expect.poll(() => api.reports.length).toBe(1);
  expect(api.reports[0]).toEqual({ reason: "Harassment in request." });
});
