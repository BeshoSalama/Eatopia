import axios from "axios";
import { API_BASE_URL, API_ORIGIN, normalizeStoredMediaUrl } from "../config/api";

const AUTH_ENDPOINT_PARTS = [
  "/login",
  "/signup",
  "/activate-account",
  "/resend-activation",
  "/forgot-password",
  "/reset-password",
  "/refresh-token",
  "/auth/social-login",
];

let interceptorsInstalled = false;
let refreshPromise = null;

export const getStoredToken = () => localStorage.getItem("token") || "";
export const getStoredRefreshToken = () => localStorage.getItem("refreshToken") || "";

const normalizeRoleValue = (role) => String(role || "").trim().toLowerCase();

export const clearAuthSession = (reason = "session_expired") => {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("eatopiaUser");
  localStorage.setItem("eatopia:lastAuthClearReason", reason);
  window.dispatchEvent(new Event("eatopia-auth-changed"));
};

const isAuthEndpoint = (url = "") => AUTH_ENDPOINT_PARTS.some((part) => String(url).includes(part));

const isApiRequest = (config = {}) => {
  const url = String(config.url || "");
  if (!url) return false;
  return url.startsWith(API_BASE_URL) || url.startsWith(API_ORIGIN) || url.startsWith("/api") || url.startsWith("api/");
};

const redirectToLogin = () => {
  const path = window.location.pathname;
  if (path === "/login" || path === "/signup" || path === "/activate-account" || path === "/forgot-password") return;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.assign(`/login?sessionExpired=1&returnUrl=${encodeURIComponent(current)}`);
};

export const storeAuthResponse = (responseData, fallbackName = "User") => {
  const authData = responseData?.data?.token ? responseData.data : responseData;
  const token = authData?.token;
  const refreshToken = authData?.refreshToken || authData?.refresh_token;
  const backendUser = authData?.user;

  if (token) {
    localStorage.setItem("token", token);
  }
  if (refreshToken) {
    localStorage.setItem("refreshToken", refreshToken);
  }

  if (backendUser) {
    storeBackendUser(backendUser, fallbackName, true);
  }
};

export const refreshAccessToken = async () => {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return null;

  const response = await axios.post(`${API_BASE_URL}/refresh-token`, { refreshToken }, { skipAuthRefresh: true });
  storeAuthResponse(response.data, "User");
  return response.data?.token || response.data?.data?.token || null;
};

export const storeBackendUser = (backendUser, fallbackName = "User", forceEvent = false) => {
  if (!backendUser) return null;

  const userData = {
    ...backendUser,
    id: backendUser.id || backendUser.userId || backendUser.user_id || backendUser.Id || null,
    fullName: backendUser.fullName || backendUser.full_name || backendUser.name || fallbackName,
    username: backendUser.username || backendUser.email || fallbackName,
    email: backendUser.email || "",
    role: backendUser.role || "User",
    profileImage: normalizeStoredMediaUrl(
      backendUser.profileImage ||
      backendUser.profile_image ||
      backendUser.avatar ||
      backendUser.profileImageUrl ||
      backendUser.profile_image_url ||
      ""
    ),
  };

  const nextValue = JSON.stringify(userData);
  const previousValue = localStorage.getItem("eatopiaUser");
  localStorage.setItem("eatopiaUser", nextValue);

  if (forceEvent || previousValue !== nextValue) {
    window.dispatchEvent(new Event("eatopia-auth-changed"));
  }

  return userData;
};

export const syncStoredUserFromBackend = async ({ refreshTokenWhenRoleChanged = false } = {}) => {
  const token = getStoredToken();
  if (!token) return null;

  const previousUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("eatopiaUser") || "null");
    } catch {
      return null;
    }
  })();

  let activeToken = token;
  let response;

  try {
    response = await axios.get(`${API_BASE_URL}/profile`, {
      headers: { Authorization: `Bearer ${activeToken}` },
      skipAuthRefresh: true,
    });
  } catch (error) {
    if (error?.response?.status !== 401 || !getStoredRefreshToken()) {
      throw error;
    }

    activeToken = await refreshAccessToken();
    if (!activeToken) throw error;

    response = await axios.get(`${API_BASE_URL}/profile`, {
      headers: { Authorization: `Bearer ${activeToken}` },
      skipAuthRefresh: true,
    });
  }

  const backendUser =
    response?.data?.user ||
    response?.data?.data?.user ||
    response?.data?.data ||
    response?.data;

  const userData = storeBackendUser(backendUser, previousUser?.username || "User");
  const roleChanged = normalizeRoleValue(previousUser?.role) !== normalizeRoleValue(userData?.role);

  if (refreshTokenWhenRoleChanged && roleChanged && getStoredRefreshToken()) {
    await refreshAccessToken();
    try {
      return JSON.parse(localStorage.getItem("eatopiaUser") || "null");
    } catch {
      return userData;
    }
  }

  return userData;
};

export const installAxiosAuthInterceptors = () => {
  if (interceptorsInstalled) return;
  interceptorsInstalled = true;

  axios.interceptors.request.use((config) => {
    if (config?.skipAuthHeader || !isApiRequest(config)) return config;

    const token = getStoredToken();
    if (token && !config.headers?.Authorization) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  });

  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const status = error?.response?.status;
      const config = error?.config || {};
      const requestUrl = String(config.url || "");

      if (status !== 401 || !isApiRequest(config) || isAuthEndpoint(requestUrl) || config.skipAuthRefresh) {
        return Promise.reject(error);
      }

      if (config._eatopiaRetry) {
        clearAuthSession("token_invalid");
        redirectToLogin();
        return Promise.reject(error);
      }

      try {
        config._eatopiaRetry = true;
        refreshPromise = refreshPromise || refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
        const newToken = await refreshPromise;

        if (!newToken) {
          clearAuthSession("token_invalid");
          redirectToLogin();
          return Promise.reject(error);
        }

        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${newToken}`;
        return axios(config);
      } catch (refreshError) {
        clearAuthSession("token_invalid");
        redirectToLogin();
        return Promise.reject(refreshError);
      }
    }
  );
};

export const loginWithSocialToken = async ({ provider, idToken, fullName }) => {
  const response = await axios.post(`${API_BASE_URL}/auth/social-login`, {
    provider,
    idToken,
    fullName,
  });

  storeAuthResponse(response.data, provider);
  return response.data;
};
