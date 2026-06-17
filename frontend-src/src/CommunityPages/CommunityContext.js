import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { API_BASE_URL, CHAT_HUB_URL, normalizeStoredMediaUrl, formatServerTime } from "../config/api";
import { normalizeCommunityUser } from "./communityUtils";

const CommunityContext = createContext(null);

const getToken = () => localStorage.getItem("token") || "";
const authHeaders = () => {
  const token = getToken();
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

const idsEqual = (a, b) => String(a || "").toLowerCase() === String(b || "").toLowerCase();

const normalizeUser = (user = {}) => normalizeCommunityUser(user);

const normalizeMessage = (msg = {}, currentUserId) => {
  const type = msg.type || msg.messageType || msg.message_type || "text";
  const rawContent = msg.content || msg.mediaContent || msg.media_content || "";
  const sentAt = msg.sentAt || msg.sent_at || msg.createdAt || msg.created_at || new Date().toISOString();
  const senderId = msg.senderId || msg.sender_id;
  const derivedSender = currentUserId && senderId ? (idsEqual(senderId, currentUserId) ? "me" : "them") : (msg.sender || "them");

  return {
    id: msg.id || msg.Id || `${Date.now()}-${Math.random()}`,
    threadId: msg.threadId || msg.thread_id,
    text: msg.text || msg.messageText || msg.message_text || "",
    sender: derivedSender,
    senderId,
    time: formatServerTime(sentAt),
    sentAt,
    editedAt: msg.editedAt || msg.edited_at || null,
    deletedAt: msg.deletedAt || msg.deleted_at || null,
    isEdited: Boolean(msg.isEdited || msg.is_edited || msg.editedAt || msg.edited_at),
    isDeleted: Boolean(msg.isDeleted || msg.is_deleted),
    canEdit: Boolean(msg.canEdit || msg.can_edit),
    canDelete: Boolean(msg.canDelete || msg.can_delete),
    replyTo: msg.replyTo || msg.reply_to || null,
    type,
    content: typeof rawContent === "string" ? normalizeStoredMediaUrl(rawContent) : rawContent,
    mediaContent: normalizeStoredMediaUrl(msg.mediaContent || msg.media_content || (typeof rawContent === "string" ? rawContent : rawContent?.url)),
    fileName: msg.fileName || msg.file_name || rawContent?.name || "File",
    status: msg.status || "sent",
    unread: Boolean(msg.unread),
    liked: Boolean(msg.liked),
  };
};

export const CommunityProvider = ({ children }) => {
  const [friends, setFriends] = useState([]);
  const [chats, setChats] = useState([]);
  const [messageRequests, setMessageRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [messages, setMessages] = useState({});
  const [threadsByUserId, setThreadsByUserId] = useState({});
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loadingCommunity, setLoadingCommunity] = useState(false);

  const signalRRef = useRef(null);
  const joinedThreadsRef = useRef(new Set());
  const threadsByUserIdRef = useRef({});
  const currentUserIdRef = useRef(null);
  const refreshCommunityRef = useRef(null);

  useEffect(() => {
    threadsByUserIdRef.current = threadsByUserId;
  }, [threadsByUserId]);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  const loadCurrentUserId = useCallback(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("eatopiaUser") || "{}");
      const id = saved.id || saved.Id || saved.user_id;
      setCurrentUserId(id || null);
      currentUserIdRef.current = id || null;
      return id || null;
    } catch {
      return null;
    }
  }, []);

  const joinThreadRealtime = useCallback(async (threadId) => {
    const connection = signalRRef.current;
    if (!connection || !threadId || connection.state !== "Connected" || joinedThreadsRef.current.has(String(threadId))) {
      return;
    }

    try {
      await connection.invoke("JoinThread", String(threadId));
      joinedThreadsRef.current.add(String(threadId));
    } catch {
      // REST API still works if realtime joining fails.
    }
  }, []);

  const findOtherUserIdByThreadId = useCallback((threadId) => {
    const entries = Object.entries(threadsByUserIdRef.current || {});
    const match = entries.find(([, value]) => idsEqual(value, threadId));
    return match?.[0] || null;
  }, []);

  const addRealtimeMessage = useCallback((serverMessage) => {
    const threadId = serverMessage?.threadId || serverMessage?.thread_id;
    if (!threadId) return;

    const otherUserId = findOtherUserIdByThreadId(threadId);
    if (!otherUserId) {
      refreshCommunityRef.current?.();
      return;
    }

    const normalized = normalizeMessage(serverMessage, currentUserIdRef.current);

    setMessages((prev) => {
      const list = prev[otherUserId] || [];
      if (list.some((msg) => idsEqual(msg.id, normalized.id))) return prev;
      return { ...prev, [otherUserId]: [...list, normalized] };
    });
  }, [findOtherUserIdByThreadId]);

  const updateRealtimeMessage = useCallback((serverMessage) => {
    const threadId = serverMessage?.threadId || serverMessage?.thread_id;
    const messageId = serverMessage?.id || serverMessage?.Id;
    if (!threadId || !messageId) return;

    const otherUserId = findOtherUserIdByThreadId(threadId);
    if (!otherUserId) return;

    const normalized = normalizeMessage(serverMessage, currentUserIdRef.current);
    setMessages((prev) => ({
      ...prev,
      [otherUserId]: (prev[otherUserId] || []).map((msg) => idsEqual(msg.id, messageId) ? { ...msg, ...normalized } : msg),
    }));
  }, [findOtherUserIdByThreadId]);

  const deleteRealtimeMessage = useCallback((payload) => {
    const threadId = payload?.threadId || payload?.thread_id;
    const messageId = payload?.id || payload?.Id;
    if (!threadId || !messageId) return;

    const otherUserId = findOtherUserIdByThreadId(threadId);
    if (!otherUserId) return;

    const normalized = normalizeMessage(payload, currentUserIdRef.current);
    setMessages((prev) => ({
      ...prev,
      [otherUserId]: (prev[otherUserId] || []).map((msg) => idsEqual(msg.id, messageId)
        ? { ...msg, ...normalized, isDeleted: true, text: "This message was deleted", type: "text", content: null, mediaContent: null }
        : msg),
    }));
  }, [findOtherUserIdByThreadId]);

  const loadUsers = useCallback(async (search = "", friendsOnly = true) => {
    if (!getToken()) return [];
    const params = new URLSearchParams();
    params.set("friendsOnly", friendsOnly ? "true" : "false");
    if (search.trim()) params.set("search", search.trim());

    const response = await axios.get(`${API_BASE_URL}/community/users?${params.toString()}`, authHeaders());
    const users = response?.data?.users || response?.data?.data || [];
    const currentId = currentUserIdRef.current || loadCurrentUserId();
    const normalized = users.map(normalizeUser).filter((u) => u.id && !idsEqual(u.id, currentId));

    if (friendsOnly) setFriends(normalized);
    else setAllUsers(normalized);

    return normalized;
  }, [loadCurrentUserId]);

  const searchUsers = useCallback(async (search = "") => {
    return loadUsers(search, false);
  }, [loadUsers]);

  const toggleFollow = useCallback(async (userId, shouldFollow) => {
    if (!userId || idsEqual(userId, currentUserIdRef.current)) return null;

    const response = shouldFollow
      ? await axios.post(`${API_BASE_URL}/community/users/${userId}/follow`, {}, authHeaders())
      : await axios.delete(`${API_BASE_URL}/community/users/${userId}/follow`, authHeaders());

    await loadUsers("", true);
    await loadUsers("", false);

    return response?.data?.profile || response?.data?.data || null;
  }, [loadUsers]);

  const loadThreads = useCallback(async (knownCurrentUserId) => {
    if (!getToken()) return;
    const response = await axios.get(`${API_BASE_URL}/chat/threads`, authHeaders());
    const threads = response?.data?.data || response?.data?.threads || [];
    const currentId = knownCurrentUserId || currentUserIdRef.current || loadCurrentUserId();
    const nextThreads = {};
    const nextMessages = {};
    const nextRequests = [];
    const nextSentRequests = [];
    const nextAcceptedChats = [];

    for (const thread of threads) {
      const other = normalizeUser(thread.otherUser || thread.other_user || {});
      const threadId = thread.threadId || thread.thread_id;
      const lastMessage = thread.lastMessage || thread.last_message;
      if (!other.id || !threadId || idsEqual(other.id, currentId) || !lastMessage) continue;

      nextThreads[other.id] = threadId;
      other.isFriend = Boolean(thread.isFriend || thread.is_friend || other.isFriend);
      other.isAccepted = Boolean(thread.isAccepted || thread.is_accepted || String(thread.requestStatus || thread.request_status || "").toLowerCase() === "accepted");
      other.section = thread.section || other.section || (other.isAccepted ? "chats" : "");
      other.requestStatus = thread.requestStatus || thread.request_status || "";
      other.unreadCount = Number(thread.unreadCount || thread.unread_count || 0);

      if (other.section === "requests") nextRequests.push(other);
      else if (other.section === "sentRequests") nextSentRequests.push(other);
      else if (other.section === "friends" || other.section === "chats" || other.isAccepted) nextAcceptedChats.push(other);

      const messageResponse = await axios.get(`${API_BASE_URL}/chat/threads/${threadId}/messages?page=1&pageSize=100`, authHeaders());
      const items = messageResponse?.data?.data || messageResponse?.data?.messages || [];
      nextMessages[other.id] = items.map((m) => normalizeMessage(m, currentId));
    }

    setThreadsByUserId(nextThreads);
    threadsByUserIdRef.current = nextThreads;
    setMessageRequests(nextRequests);
    setSentRequests(nextSentRequests);
    setChats(nextAcceptedChats);
    setMessages(nextMessages);

    await Promise.all(Object.values(nextThreads).map((threadId) => joinThreadRealtime(threadId)));
  }, [joinThreadRealtime, loadCurrentUserId]);

  const refreshCommunity = useCallback(async () => {
    if (!getToken()) {
      setFriends([]);
      setChats([]);
      setMessageRequests([]);
      setSentRequests([]);
      setAllUsers([]);
      setMessages({});
      setThreadsByUserId({});
      threadsByUserIdRef.current = {};
      return;
    }

    setLoadingCommunity(true);
    try {
      const id = loadCurrentUserId();
      await loadUsers("", true);
      await loadUsers("", false);
      await loadThreads(id);
    } catch (error) {
      // 401 is handled globally by the axios interceptor. Avoid React dev overlay/unhandled promises.
      if (error?.response?.status !== 401) {
        console.warn("Community refresh failed", error);
      }
    } finally {
      setLoadingCommunity(false);
    }
  }, [loadCurrentUserId, loadUsers, loadThreads]);

  useEffect(() => {
    refreshCommunityRef.current = refreshCommunity;
  }, [refreshCommunity]);

  useEffect(() => {
    refreshCommunity().catch(() => {});
  }, [refreshCommunity]);

  useEffect(() => {
    if (!getToken()) return undefined;

    loadCurrentUserId();

    let isActive = true;

    const connection = new HubConnectionBuilder()
      .withUrl(CHAT_HUB_URL, { accessTokenFactory: () => getToken() || "" })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.None)
      .build();

    signalRRef.current = connection;
    joinedThreadsRef.current = new Set();

    connection.on("MessageReceived", addRealtimeMessage);
    connection.on("MessageUpdated", updateRealtimeMessage);
    connection.on("MessageDeleted", deleteRealtimeMessage);
    connection.on("MessagesSeen", () => refreshCommunityRef.current?.());
    connection.on("UserTyping", (payload) => {
      window.dispatchEvent(new CustomEvent("eatopia-chat-typing", { detail: payload }));
    });
    connection.on("ThreadChanged", () => refreshCommunityRef.current?.());

    connection.onreconnected(async () => {
      if (!isActive || signalRRef.current !== connection) return;
      joinedThreadsRef.current = new Set();
      await Promise.all(Object.values(threadsByUserIdRef.current || {}).map((threadId) => joinThreadRealtime(threadId)));
      refreshCommunityRef.current?.();
    });

    connection
      .start()
      .then(async () => {
        if (!isActive || signalRRef.current !== connection) {
          await connection.stop().catch(() => {});
          return;
        }
        await Promise.all(Object.values(threadsByUserIdRef.current || {}).map((threadId) => joinThreadRealtime(threadId)));
      })
      .catch(() => {});

    return () => {
      isActive = false;
      connection.off("MessageReceived", addRealtimeMessage);
      connection.off("MessageUpdated", updateRealtimeMessage);
      connection.off("MessageDeleted", deleteRealtimeMessage);
      connection.off("MessagesSeen");
      connection.off("UserTyping");
      connection.off("ThreadChanged");
      joinedThreadsRef.current = new Set();
      signalRRef.current = null;
      connection.stop().catch(() => {});
    };
  }, [addRealtimeMessage, deleteRealtimeMessage, joinThreadRealtime, loadCurrentUserId, updateRealtimeMessage]);

  useEffect(() => {
    if (!getToken()) return undefined;

    const sendHeartbeat = () => axios.post(`${API_BASE_URL}/community/presence/heartbeat`, {}, authHeaders()).catch(() => {});
    sendHeartbeat();

    const heartbeatId = window.setInterval(sendHeartbeat, 45000);
    const refreshId = window.setInterval(() => {
      loadUsers("", true).catch(() => {});
      loadUsers("", false).catch(() => {});
    }, 60000);

    return () => {
      window.clearInterval(heartbeatId);
      window.clearInterval(refreshId);
    };
  }, [loadUsers]);

  const createOrGetThread = useCallback(async (friendId) => {
    if (!friendId || idsEqual(friendId, currentUserIdRef.current)) return null;
    if (threadsByUserIdRef.current[friendId]) return threadsByUserIdRef.current[friendId];

    const response = await axios.post(`${API_BASE_URL}/chat/threads`, { otherUserId: friendId }, authHeaders());
    const threadId = response?.data?.data?.threadId || response?.data?.data?.thread_id || response?.data?.threadId || response?.data?.thread_id;

    if (threadId) {
      setThreadsByUserId((prev) => {
        const next = { ...prev, [friendId]: threadId };
        threadsByUserIdRef.current = next;
        return next;
      });
      await joinThreadRealtime(threadId);
    }

    return threadId;
  }, [joinThreadRealtime]);

  const loadMessagesForFriend = useCallback(async (friendId) => {
    const threadId = threadsByUserIdRef.current[friendId];
    if (!threadId) {
      setMessages((prev) => ({ ...prev, [friendId]: prev[friendId] || [] }));
      return [];
    }

    await joinThreadRealtime(threadId);

    const response = await axios.get(`${API_BASE_URL}/chat/threads/${threadId}/messages?page=1&pageSize=100`, authHeaders());
    const items = response?.data?.data || response?.data?.messages || [];
    const normalized = items.map((m) => normalizeMessage(m, currentUserIdRef.current || currentUserId));

    setMessages((prev) => ({ ...prev, [friendId]: normalized }));
    axios.put(`${API_BASE_URL}/chat/threads/${threadId}/read`, {}, authHeaders()).catch(() => {});
    return normalized;
  }, [currentUserId, joinThreadRealtime]);

  const sendChatMessage = useCallback(async (friendId, payload) => {
    const threadId = await createOrGetThread(friendId);
    if (!threadId) return null;

    await joinThreadRealtime(threadId);

    const response = await axios.post(`${API_BASE_URL}/chat/threads/${threadId}/messages`, payload, authHeaders());
    const saved = normalizeMessage(response?.data?.message || response?.data?.data, currentUserIdRef.current || currentUserId);

    setMessages((prev) => {
      const list = prev[friendId] || [];
      if (list.some((msg) => idsEqual(msg.id, saved.id))) return prev;
      return { ...prev, [friendId]: [...list, saved] };
    });

    return saved;
  }, [createOrGetThread, currentUserId, joinThreadRealtime]);

  const editChatMessage = useCallback(async (friendId, messageId, messageText) => {
    const threadId = threadsByUserIdRef.current[friendId];
    if (!threadId || !messageId) return null;

    const response = await axios.put(`${API_BASE_URL}/chat/threads/${threadId}/messages/${messageId}`, { messageText }, authHeaders());
    const saved = normalizeMessage(response?.data?.message || response?.data?.data, currentUserIdRef.current || currentUserId);

    setMessages((prev) => ({
      ...prev,
      [friendId]: (prev[friendId] || []).map((msg) => idsEqual(msg.id, messageId) ? { ...msg, ...saved } : msg),
    }));

    return saved;
  }, [currentUserId]);

  const deleteChatMessage = useCallback(async (friendId, messageId) => {
    const threadId = threadsByUserIdRef.current[friendId];
    if (!threadId || !messageId) return;

    const response = await axios.delete(`${API_BASE_URL}/chat/threads/${threadId}/messages/${messageId}`, authHeaders());
    const saved = normalizeMessage(response?.data?.data, currentUserIdRef.current || currentUserId);

    setMessages((prev) => ({
      ...prev,
      [friendId]: (prev[friendId] || []).map((msg) => idsEqual(msg.id, messageId)
        ? { ...msg, ...saved, isDeleted: true, text: "This message was deleted", type: "text", content: null, mediaContent: null }
        : msg),
    }));
  }, [currentUserId]);

  const acceptMessageRequest = useCallback(async (friendId) => {
    const threadId = threadsByUserIdRef.current[friendId];
    if (!threadId) return null;
    const response = await axios.post(`${API_BASE_URL}/chat/threads/${threadId}/accept`, {}, authHeaders());
    await refreshCommunityRef.current?.();
    return response?.data?.data || null;
  }, []);

  const deleteMessageRequest = useCallback(async (friendId) => {
    const threadId = threadsByUserIdRef.current[friendId];
    if (!threadId) return null;
    const response = await axios.delete(`${API_BASE_URL}/chat/threads/${threadId}/request`, authHeaders());
    await refreshCommunityRef.current?.();
    return response?.data?.data || null;
  }, []);

  const blockChatUser = useCallback(async (friendId) => {
    const threadId = threadsByUserIdRef.current[friendId];
    const response = threadId
      ? await axios.post(`${API_BASE_URL}/chat/threads/${threadId}/block`, {}, authHeaders())
      : await axios.post(`${API_BASE_URL}/community/users/${friendId}/block`, {}, authHeaders());
    await refreshCommunityRef.current?.();
    return response?.data?.data || null;
  }, []);

  const reportMessage = useCallback(async (messageId, reason) => {
    if (!messageId || !reason?.trim()) return null;
    const response = await axios.post(`${API_BASE_URL}/community/messages/${messageId}/report`, { reason: reason.trim() }, authHeaders());
    return response?.data || null;
  }, []);

  const sendTyping = useCallback((friendId, isTyping) => {
    const threadId = threadsByUserIdRef.current[friendId];
    const connection = signalRRef.current;
    if (!threadId || !connection || connection.state !== "Connected") return;
    connection.invoke("Typing", String(threadId), Boolean(isTyping)).catch(() => {});
  }, []);

  const value = {
    friends,
    setFriends,
    chats,
    setChats,
    messageRequests,
    setMessageRequests,
    sentRequests,
    setSentRequests,
    allUsers,
    setAllUsers,
    messages,
    setMessages,
    threadsByUserId,
    currentUserId,
    loadingCommunity,
    refreshCommunity,
    loadUsers,
    searchUsers,
    toggleFollow,
    loadMessagesForFriend,
    sendChatMessage,
    editChatMessage,
    deleteChatMessage,
    acceptMessageRequest,
    deleteMessageRequest,
    blockChatUser,
    reportMessage,
    sendTyping,
  };

  return <CommunityContext.Provider value={value}>{children}</CommunityContext.Provider>;
};

export const useCommunity = () => {
  const ctx = useContext(CommunityContext);
  if (!ctx) {
    throw new Error("useCommunity must be used inside CommunityProvider");
  }
  return ctx;
};
