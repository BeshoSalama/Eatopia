export const API_BASE_URL =
  (process.env.REACT_APP_API_BASE_URL || "http://localhost:3001/api").replace(/\/$/, "");

export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/i, "");

export const CHAT_HUB_URL =
  process.env.REACT_APP_CHAT_HUB_URL || `${API_ORIGIN}/hubs/chat`;

const isAbsoluteUrl = (value = "") => /^https?:\/\//i.test(String(value));
const isDataOrBlobUrl = (value = "") => /^(data:|blob:)/i.test(String(value));

const normalizeSlashes = (value = "") => String(value).trim().replace(/\\/g, "/");

const extractUploadPath = (value = "") => {
  const url = normalizeSlashes(value);
  const lower = url.toLowerCase();
  const marker = "/uploads/";
  const idx = lower.indexOf(marker);
  if (idx >= 0) return url.slice(idx);
  if (lower.startsWith("uploads/")) return `/${url}`;
  return "";
};

const isLocalBackendHost = (hostname = "") => {
  const host = hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
};

export const normalizeStoredMediaUrl = (value) => {
  if (!value) return "";

  const rawUrl = normalizeSlashes(value);
  if (!rawUrl) return "";
  if (isDataOrBlobUrl(rawUrl)) return rawUrl;

  // Old rows may contain full localhost URLs with different ports/schemes
  // (3001 / 5265 / 7265). Store and render them as portable /uploads paths.
  if (isAbsoluteUrl(rawUrl)) {
    try {
      const parsed = new URL(rawUrl);
      const apiOrigin = new URL(API_ORIGIN).origin;
      const uploadPath = extractUploadPath(`${parsed.pathname}${parsed.search}${parsed.hash}`);

      if (uploadPath && (parsed.origin === apiOrigin || isLocalBackendHost(parsed.hostname))) {
        return uploadPath;
      }

      return rawUrl;
    } catch {
      const uploadPath = extractUploadPath(rawUrl);
      return uploadPath || rawUrl;
    }
  }

  const uploadPath = extractUploadPath(rawUrl);
  if (uploadPath) return uploadPath;

  if (rawUrl.startsWith("/")) return rawUrl;
  return rawUrl;
};

export const resolveMediaUrl = (value, fallback = "") => {
  const url = normalizeStoredMediaUrl(value);
  if (!url) return fallback;
  if (isAbsoluteUrl(url) || isDataOrBlobUrl(url)) return url;
  if (url.startsWith("/")) return `${API_ORIGIN}${url}`;
  return url;
};

export const getMediaUrlCandidates = (value, fallback = "") => {
  const normalized = normalizeStoredMediaUrl(value);
  if (!normalized) return fallback ? [fallback] : [];
  if (isDataOrBlobUrl(normalized)) return [normalized];

  const candidates = [];
  const add = (item) => {
    if (item && !candidates.includes(item)) candidates.push(item);
  };

  if (isAbsoluteUrl(normalized)) {
    add(normalized);
    const uploadPath = extractUploadPath(normalized);
    if (uploadPath) {
      add(`${API_ORIGIN}${uploadPath}`);
      ["http://localhost:3001", "http://localhost:5265", "https://localhost:7265"].forEach((origin) => add(`${origin}${uploadPath}`));
    }
  } else if (normalized.startsWith("/")) {
    add(`${API_ORIGIN}${normalized}`);
    ["http://localhost:3001", "http://localhost:5265", "https://localhost:7265"].forEach((origin) => add(`${origin}${normalized}`));
  } else {
    add(normalized);
  }

  if (fallback) add(fallback);
  return candidates;
};

const ISO_LIKE_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T/i;
const ISO_HAS_TIMEZONE = /(Z|[+-]\d{2}:?\d{2})$/i;

export const parseServerDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  let raw = String(value).trim();
  if (!raw) return null;

  // SQL Server datetime2 values often arrive without a timezone after EF reads
  // DateTime.UtcNow. Treat ISO timestamps without timezone as UTC, then display
  // using the user's local browser timezone.
  if (ISO_LIKE_TIMESTAMP.test(raw) && !ISO_HAS_TIMEZONE.test(raw)) raw = `${raw}Z`;

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatServerDateTime = (value) => {
  const date = parseServerDate(value);
  if (!date) return "Just now";
  return date.toLocaleString([], {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatServerTime = (value) => {
  const date = parseServerDate(value);
  if (!date) return "now";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export const formatServerTimeAgo = (value) => {
  const date = parseServerDate(value);
  if (!date) return "Just now";

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return "Just now";

  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
};


const getUploadLimitBytes = (file, purpose = "general") => {
  const name = file?.name || "";
  const type = file?.type || "";
  const lower = name.toLowerCase();

  if (type.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp)$/.test(lower)) return 5 * 1024 * 1024;
  if (type.startsWith("video/") || /\.(mp4|webm|mov)$/.test(lower)) return 25 * 1024 * 1024;
  if (type.startsWith("audio/") || /\.(mp3|wav|m4a|ogg|webm)$/.test(lower) || purpose === "chat-audio") return 10 * 1024 * 1024;
  return 8 * 1024 * 1024;
};

const formatBytes = (bytes) => {
  if (!bytes) return "0 MB";
  const mb = bytes / 1024 / 1024;
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
};

export const uploadFile = async (file, token, purpose = "general") => {
  if (!file) return null;

  const maxBytes = getUploadLimitBytes(file, purpose);
  if (file.size > maxBytes) {
    throw new Error(`File is too large. Maximum allowed size is ${formatBytes(maxBytes)}.`);
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("purpose", purpose);

  const response = await fetch(`${API_BASE_URL}/uploads`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token || localStorage.getItem("token") || ""}`,
    },
    body: formData,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || "File upload failed.");
  }

  return normalizeStoredMediaUrl(data?.relativeUrl || data?.storedUrl || data?.url || data?.absoluteUrl || null);
};
