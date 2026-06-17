import { render, screen, cleanup, waitFor } from "@testing-library/react";
import App from "./App";
import { syncStoredUserFromBackend } from "./services/authHelpers";

jest.mock("./HomePage/Home", () => () => <div>Home Page</div>);
jest.mock("./LoginSignUpPages/LoginPage", () => () => <div>Login Page</div>);
jest.mock("./LoginSignUpPages/ForgotPasswordPage", () => () => <div>Forgot Password Page</div>);
jest.mock("./LoginSignUpPages/ActivateAccountPage", () => () => <div>Activate Account Page</div>);
jest.mock("./LoginSignUpPages/SignUpPage", () => () => <div>Sign Up Page</div>);
jest.mock("./ReminderPage/ReminderPage", () => () => <div>Reminder Page</div>);
jest.mock("./ReminderPage/ReminderWater", () => () => <div>Reminder Water Page</div>);
jest.mock("./ReminderPage/ReminderMedication", () => () => <div>Reminder Medication Page</div>);
jest.mock("./CommunityPages/CommunityWelcomePage", () => () => <div>Community Welcome Page</div>);
jest.mock("./CommunityPages/CommunityHomePage", () => () => <div>Community Feed Page</div>);
jest.mock("./CommunityPages/CommunityChatPage", () => () => <div>Community Chat Page</div>);
jest.mock("./CommunityPages/CommunityProfilePage", () => () => <div>Community Profile Page</div>);
jest.mock("./RecipesPage/RecipesPage", () => () => <div>Recipes Page</div>);
jest.mock("./DietPlanPage/DietPlanPage", () => () => <div>Diet Plan Page</div>);
jest.mock("./ProfilePage/ProfilePage", () => () => <div>Profile Page</div>);
jest.mock("./SettingsPage/SettingsPage", () => () => <div>Settings Page</div>);
jest.mock("./AdminPage/AdminDashboardPage", () => () => <div>Admin Page</div>);
jest.mock("./CommunityPages/CommunityContext", () => ({
  CommunityProvider: ({ children }) => <>{children}</>,
}));
jest.mock("./services/authHelpers", () => ({
  syncStoredUserFromBackend: jest.fn(),
}));

const renderAt = (path) => {
  window.history.pushState({}, "", path);
  return render(<App />);
};

afterEach(() => {
  cleanup();
  localStorage.clear();
  syncStoredUserFromBackend.mockReset();
  window.history.pushState({}, "", "/");
});

test("community welcome route is registered", () => {
  renderAt("/community");
  expect(screen.getByText("Community Welcome Page")).toBeTruthy();
});

test("community feed route is registered", () => {
  renderAt("/communityHomePage");
  expect(screen.getByText("Community Feed Page")).toBeTruthy();
});

test("community chat route is registered", () => {
  renderAt("/communityChat");
  expect(screen.getByText("Community Chat Page")).toBeTruthy();
});

test("community profile route is registered", () => {
  renderAt("/communityProfile");
  expect(screen.getByText("Community Profile Page")).toBeTruthy();
});

test("diet plan route requires login", () => {
  renderAt("/dietplan");
  expect(screen.getByText("Login Page")).toBeTruthy();
});

test("admin route is available for stored admin roles", async () => {
  localStorage.setItem("token", "token");
  localStorage.setItem("eatopiaUser", JSON.stringify({ id: "admin", role: "Admin" }));

  renderAt("/admin");

  expect(await screen.findByText("Admin Page")).toBeTruthy();
  expect(syncStoredUserFromBackend).not.toHaveBeenCalled();
});

test("admin route rejects regular users after backend role sync", async () => {
  localStorage.setItem("token", "token");
  localStorage.setItem("eatopiaUser", JSON.stringify({ id: "user", role: "User" }));
  syncStoredUserFromBackend.mockResolvedValue({ id: "user", role: "User" });

  renderAt("/admin");

  await waitFor(() => {
    expect(screen.getByText("Home Page")).toBeTruthy();
  });
  expect(syncStoredUserFromBackend).toHaveBeenCalledWith({ refreshTokenWhenRoleChanged: true });
});

test("admin route allows access when backend sync upgrades the stored role", async () => {
  localStorage.setItem("token", "token");
  localStorage.setItem("eatopiaUser", JSON.stringify({ id: "owner", role: "User" }));
  syncStoredUserFromBackend.mockResolvedValue({ id: "owner", role: "Owner" });

  renderAt("/admin");

  expect(await screen.findByText("Admin Page")).toBeTruthy();
  expect(syncStoredUserFromBackend).toHaveBeenCalledWith({ refreshTokenWhenRoleChanged: true });
});
