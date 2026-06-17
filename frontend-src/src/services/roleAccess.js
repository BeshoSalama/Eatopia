export const USER_ROLES = {
  owner: "Owner",
  admin: "Admin",
  user: "User",
};

export const normalizeRole = (role) => {
  const value = String(role || "").trim().toLowerCase();

  if (value === "owner" || value === "super admin" || value === "superadmin") return USER_ROLES.owner;
  if (value === "admin" || value === "manager") return USER_ROLES.admin;
  return USER_ROLES.user;
};

export const isOwnerRole = (role) => normalizeRole(role) === USER_ROLES.owner;

export const isAdminRole = (role) => {
  const normalized = normalizeRole(role);
  return normalized === USER_ROLES.owner || normalized === USER_ROLES.admin;
};

export const getRoleLabel = (role) => {
  const normalized = normalizeRole(role);
  if (normalized === USER_ROLES.owner) return "Owner / Super Admin";
  if (normalized === USER_ROLES.admin) return "Admin / Manager";
  return "User";
};

export const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("eatopiaUser") || "null");
  } catch {
    return null;
  }
};
