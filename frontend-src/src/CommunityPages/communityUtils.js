import { normalizeStoredMediaUrl, resolveMediaUrl } from "../config/api";
import maleAvatar from "../assets/community-avatar-male.svg";
import femaleAvatar from "../assets/community-avatar-female.svg";
import neutralAvatar from "../assets/community-avatar-neutral.svg";

const COMMUNITY_NOTIFICATION_TYPES = new Set([
  "follow",
  "follow_back",
  "comment",
  "post_like",
  "message",
  "message_request",
  "message_request_accepted",
  "moderation_warning",
]);

export const normalizeCommunityGender = (value = "") => {
  const gender = String(value || "").trim().toLowerCase();

  if (["male", "man", "m", "ذكر"].includes(gender)) return "male";
  if (["female", "woman", "f", "انثى", "أنثى", "مؤنث"].includes(gender)) return "female";
  return "neutral";
};

export const getCommunityDefaultAvatar = (gender = "") => {
  const normalized = normalizeCommunityGender(gender);
  if (normalized === "female") return femaleAvatar;
  if (normalized === "male") return maleAvatar;
  return neutralAvatar;
};

export const getCommunityAvatarSrc = (user = {}) => {
  const rawAvatar =
    user.avatar ||
    user.profileImage ||
    user.profile_image ||
    user.profileImageUrl ||
    user.profile_image_url ||
    "";

  if (/^(user|avatar|default-avatar)\.(png|jpe?g|svg)$/i.test(String(rawAvatar || ""))) {
    return getCommunityDefaultAvatar(user.gender || user.Gender);
  }

  if (/^\/?static\//i.test(String(rawAvatar || ""))) {
    return String(rawAvatar).startsWith("/") ? rawAvatar : `/${rawAvatar}`;
  }

  const resolvedAvatar = resolveMediaUrl(rawAvatar, "");
  if (resolvedAvatar) return resolvedAvatar;

  return getCommunityDefaultAvatar(user.gender || user.Gender);
};

export const getCommunityAvatarImageProps = (user = {}, alt = "Profile") => ({
  src: getCommunityAvatarSrc(user),
  alt,
  onError: (event) => {
    event.currentTarget.src = getCommunityDefaultAvatar(user.gender || user.Gender);
  },
});

export const normalizeCommunityUser = (user = {}) => {
  const id = user.id || user.Id || user.user_id || "";
  const fullName =
    user.fullName ||
    user.full_name ||
    user.name ||
    user.Name ||
    user.email ||
    "Eatopia User";
  const username = user.username || user.userName || user.user_name || user.Username || "";
  const gender = normalizeCommunityGender(user.gender || user.Gender);
  const rawAvatar =
    user.avatar ||
    user.profileImage ||
    user.profile_image ||
    user.profileImageUrl ||
    user.profile_image_url ||
    "";

  return {
    id,
    name: username || fullName,
    fullName,
    username,
    email: user.email || user.Email || "",
    gender,
    avatar: getCommunityAvatarSrc({ ...user, gender }),
    profileImage: normalizeStoredMediaUrl(rawAvatar),
    isMine: Boolean(user.isMine || user.is_mine),
    isFollowing: Boolean(user.isFollowing || user.is_following),
    followsMe: Boolean(user.followsMe || user.follows_me),
    isFriend: Boolean(user.isFriend || user.is_friend),
    blockedByMe: Boolean(user.blockedByMe || user.blocked_by_me),
    hasBlockedMe: Boolean(user.hasBlockedMe || user.has_blocked_me),
    online: Boolean(user.online || user.activeNow || user.active_now),
    activeNow: Boolean(user.activeNow || user.active_now || user.online),
    lastSeen: user.lastSeen || user.last_seen || "not active yet",
    lastSeenAt: user.lastSeenAt || user.last_seen_at || null,
    unreadCount: Number(user.unreadCount || user.unread_count || 0),
    requestStatus: user.requestStatus || user.request_status || "",
    section: user.section || "",
    followers: Number(user.followers || 0),
    following: Number(user.following || 0),
    postsCount: Number(user.postsCount || user.posts_count || 0),
    location: user.location || user.Location || "Not added yet",
    bio: user.bio || "Eatopia community member",
  };
};

export const normalizeNotificationActor = (item = {}) => {
  const rawActor = item.actor || item.Actor || item.sender || item.user || null;
  const actorUserId = item.actorUserId || item.actor_user_id || item.ActorUserId || rawActor?.id || rawActor?.Id || "";
  if (!actorUserId && !rawActor) return null;

  return normalizeCommunityUser({
    ...(rawActor || {}),
    id: actorUserId,
    name: rawActor?.name || rawActor?.Name || rawActor?.fullName || rawActor?.full_name || rawActor?.FullName || "Eatopia User",
    fullName: rawActor?.fullName || rawActor?.full_name || rawActor?.FullName || rawActor?.name || rawActor?.Name || "Eatopia User",
    avatar: rawActor?.avatar || rawActor?.Avatar || rawActor?.profileImage || rawActor?.profile_image || rawActor?.ProfileImage,
    profileImage: rawActor?.profileImage || rawActor?.profile_image || rawActor?.ProfileImage || rawActor?.avatar || rawActor?.Avatar,
    gender: rawActor?.gender || rawActor?.Gender,
  });
};

export const getNotificationTargetPath = (item = {}) => {
  const normalized = item.id ? item : normalizeCommunityNotification(item);
  if (normalized.actionUrl) return normalized.actionUrl;
  if (normalized.actor?.id) return `/communityProfile?userId=${normalized.actor.id}`;
  const type = String(normalized.type || "").toLowerCase();
  const entityType = String(normalized.relatedEntityType || "").toLowerCase();
  if (type.includes("message") || entityType.includes("chat")) return "/communityChat";
  if (entityType.includes("community") || entityType.includes("post")) return "/community";
  return "";
};

export const normalizeCommunityNotification = (item = {}) => {
  const actor = normalizeNotificationActor(item);
  return {
    id: item.id || item.Id,
    title: item.title || "Notification",
    message: item.message || "",
    type: String(item.type || "info").trim().toLowerCase(),
    isRead: Boolean(item.isRead ?? item.is_read),
    createdAt: item.createdAt || item.created_at || null,
    relatedEntityType: item.relatedEntityType || item.related_entity_type || "",
    relatedEntityId: item.relatedEntityId || item.related_entity_id || null,
    actor,
    actorId: actor?.id || item.actorUserId || item.actor_user_id || null,
    actorName: actor?.fullName || actor?.name || "",
    actorAvatar: actor?.avatar || "",
    actionUrl: item.actionUrl || item.action_url || "",
  };
};

export const isCommunityNotification = (item = {}) => {
  const relatedEntityType = String(
    item.relatedEntityType || item.related_entity_type || ""
  )
    .trim()
    .toLowerCase();
  const type = String(item.type || "").trim().toLowerCase();

  return relatedEntityType === "community" || relatedEntityType === "communityuser" || relatedEntityType === "communitypost" || COMMUNITY_NOTIFICATION_TYPES.has(type);
};
