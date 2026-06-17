import { getRoleLabel, isAdminRole, isOwnerRole, normalizeRole, USER_ROLES } from "./roleAccess";

test("normalizes the three supported access roles", () => {
  expect(normalizeRole("Owner")).toBe(USER_ROLES.owner);
  expect(normalizeRole("super admin")).toBe(USER_ROLES.owner);
  expect(normalizeRole("Manager")).toBe(USER_ROLES.admin);
  expect(normalizeRole("Admin")).toBe(USER_ROLES.admin);
  expect(normalizeRole("anything else")).toBe(USER_ROLES.user);
});

test("identifies owner and elevated admin access accurately", () => {
  expect(isOwnerRole("Owner")).toBe(true);
  expect(isOwnerRole("Admin")).toBe(false);
  expect(isAdminRole("Owner")).toBe(true);
  expect(isAdminRole("Admin")).toBe(true);
  expect(isAdminRole("User")).toBe(false);
});

test("returns dashboard labels that match the app role model", () => {
  expect(getRoleLabel("Owner")).toBe("Owner / Super Admin");
  expect(getRoleLabel("Admin")).toBe("Admin / Manager");
  expect(getRoleLabel("User")).toBe("User");
});
