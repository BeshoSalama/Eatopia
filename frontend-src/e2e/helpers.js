const adminUser = {
  id: "admin-1",
  fullName: "Smoke Admin",
  username: "smokeadmin",
  email: "smoke.admin@example.com",
  role: "Admin",
  gender: "male",
  profileImage: "",
};

const ownerUser = {
  id: "owner-1",
  fullName: "Smoke Owner",
  username: "smokeowner",
  email: "smoke.owner@example.com",
  role: "Owner",
  gender: "male",
  profileImage: "",
};

const regularUser = {
  id: "user-1",
  fullName: "Smoke User",
  username: "smokeuser",
  email: "smoke.user@example.com",
  role: "User",
  gender: "female",
  profileImage: "",
};

async function loginAsAdmin(page) {
  await page.addInitScript((user) => {
    window.localStorage.setItem("token", "e2e-token");
    window.localStorage.setItem("refreshToken", "e2e-refresh-token");
    window.localStorage.setItem("eatopiaUser", JSON.stringify(user));
  }, adminUser);
}

async function loginAsOwner(page) {
  await page.addInitScript((user) => {
    window.localStorage.setItem("token", "e2e-owner-token");
    window.localStorage.setItem("refreshToken", "e2e-owner-refresh-token");
    window.localStorage.setItem("eatopiaUser", JSON.stringify(user));
  }, ownerUser);
}

async function loginAsUser(page) {
  await page.addInitScript((user) => {
    window.localStorage.setItem("token", "e2e-user-token");
    window.localStorage.setItem("refreshToken", "e2e-user-refresh-token");
    window.localStorage.setItem("eatopiaUser", JSON.stringify(user));
  }, regularUser);
}

async function mockAdminApi(page) {
  let recipes = [
    {
      id: "recipe-1",
      title: "Chicken Salad",
      description: "Fresh chicken, greens, and a light dressing.",
      calories_per_serving: 450,
      servings: 1,
      image_url: "",
      ingredients_json: "[\"150g chicken breast\",\"2 cups greens\"]",
      steps_json: "[\"Grill chicken\",\"Toss with greens\"]",
    },
  ];

  const reports = [
    {
      id: "report-1",
      content_type: "Post",
      content_id: "post-1",
      reason: "Offensive wording",
      status: "Pending",
      reporter: { id: "user-1", fullName: "Reporter User", email: "reporter@example.com" },
      reported_user: { id: "user-2", fullName: "Reported User", email: "reported@example.com" },
      content: {
        kind: "Post",
        preview: "Reported post preview",
        targetUrl: "/communityProfile?userId=user-2",
      },
    },
  ];

  const actionRequests = [];

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    const method = request.method();

    if (pathname.endsWith("/admin/stats")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            users: 3,
            posts: 1,
            messages: 0,
            activeUsers: 1,
            pendingReports: reports.filter((report) => report.status === "Pending").length,
            bannedUsers: 0,
            recipes: recipes.length,
          },
        }),
      });
    }

    if (pathname.endsWith("/admin/reports")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: reports, reports }),
      });
    }

    if (pathname.endsWith("/admin/users")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            adminUser,
            { id: "user-2", fullName: "Reported User", username: "reported", email: "reported@example.com", role: "User" },
          ],
        }),
      });
    }

    if (pathname.match(/\/admin\/reports\/[^/]+\/action$/) && method === "POST") {
      actionRequests.push(await request.postDataJSON());
      reports[0].status = "Actioned";
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, message: "Report action applied." }),
      });
    }

    if (pathname.endsWith("/recipes") && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: recipes, meta: { page: 1, pageSize: 200, total: recipes.length } }),
      });
    }

    if (pathname.endsWith("/recipes") && method === "POST") {
      const payload = await request.postDataJSON();
      const recipe = {
        id: `recipe-${recipes.length + 1}`,
        title: payload.title,
        description: payload.description,
        calories_per_serving: payload.caloriesPerServing,
        servings: payload.servings,
        image_url: payload.imageUrl,
        ingredients_json: payload.ingredientsJson,
        steps_json: payload.stepsJson,
      };
      recipes = [recipe, ...recipes];
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ data: recipe }),
      });
    }

    const recipeDeleteMatch = pathname.match(/\/recipes\/([^/]+)$/);
    if (recipeDeleteMatch && method === "DELETE") {
      recipes = recipes.filter((recipe) => recipe.id !== recipeDeleteMatch[1]);
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, message: "Recipe deleted." }),
      });
    }

    return route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ success: false, message: `Unhandled E2E route: ${method} ${pathname}` }),
    });
  });

  return { getActionRequests: () => actionRequests };
}

async function mockCommunityModerationApi(page) {
  const reports = [];
  const actionRequests = [];
  const postAuthor = {
    id: "user-2",
    fullName: "Reported Author",
    name: "Reported Author",
    username: "reported_author",
    email: "reported@example.com",
    role: "User",
    gender: "male",
  };
  const post = {
    id: "post-1",
    text: "This post is used by the E2E report flow.",
    content: "This post is used by the E2E report flow.",
    created_at: "2026-05-06T18:00:00Z",
    author: postAuthor,
    user: postAuthor,
    is_mine: false,
    likes: 0,
    comments: [],
  };

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    const method = request.method();

    if (pathname.endsWith("/community/users") && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, users: [postAuthor], data: [postAuthor] }),
      });
    }

    if (pathname.endsWith("/community/posts") && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, posts: [post], data: [post] }),
      });
    }

    if (pathname.endsWith("/chat/threads") && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, threads: [], data: [] }),
      });
    }

    if (pathname.endsWith("/community/presence/heartbeat") && method === "POST") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    }

    if (pathname.endsWith("/community/posts/post-1/report") && method === "POST") {
      const payload = await request.postDataJSON();
      const report = {
        id: "report-from-user",
        content_type: "Post",
        content_id: post.id,
        reason: payload.reason,
        status: "Pending",
        reporter: regularUser,
        reported_user: postAuthor,
        content: {
          kind: "Post",
          preview: post.text,
          targetUrl: `/communityProfile?userId=${postAuthor.id}`,
        },
      };
      reports.splice(0, reports.length, report);
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, message: "Post reported." }),
      });
    }

    if (pathname.endsWith("/admin/stats")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            users: 2,
            posts: 1,
            messages: 0,
            activeUsers: 1,
            pendingReports: reports.filter((report) => report.status === "Pending").length,
            bannedUsers: 0,
            recipes: 1,
          },
        }),
      });
    }

    if (pathname.endsWith("/admin/reports")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, reports, data: reports }),
      });
    }

    if (pathname.endsWith("/admin/users")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, users: [regularUser, postAuthor], data: [regularUser, postAuthor] }),
      });
    }

    if (pathname.endsWith("/recipes") && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [], meta: { page: 1, pageSize: 200, total: 0 } }),
      });
    }

    if (pathname.match(/\/admin\/reports\/[^/]+\/action$/) && method === "POST") {
      actionRequests.push(await request.postDataJSON());
      if (reports[0]) reports[0].status = "Actioned";
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, message: "Report action applied." }),
      });
    }

    return route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ success: false, message: `Unhandled E2E route: ${method} ${pathname}` }),
    });
  });

  return {
    getReports: () => reports,
    getActionRequests: () => actionRequests,
  };
}

module.exports = {
  adminUser,
  ownerUser,
  regularUser,
  loginAsAdmin,
  loginAsOwner,
  loginAsUser,
  mockAdminApi,
  mockCommunityModerationApi,
};
