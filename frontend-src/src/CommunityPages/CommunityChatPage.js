import React, { useEffect, useRef, useState } from "react";
import "./CommunityChatPage.css";
import { FaArrowLeft, FaBan, FaCheck, FaEdit, FaFileAlt, FaFlag, FaHome, FaImage, FaMicrophone, FaPaperPlane, FaPlus, FaSearch, FaTimes, FaTrash, FaVideo } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import { useCommunity } from "./CommunityContext";
import { uploadFile, resolveMediaUrl } from "../config/api";
import ConfirmDialog from "../components/ConfirmDialog";
import TextInputDialog from "../components/TextInputDialog";
import { getCommunityAvatarImageProps, normalizeCommunityUser } from "./communityUtils";
import brandLogo from "../assets/healthyfood-logo.png";

const idsEqual = (a, b) => String(a || "").toLowerCase() === String(b || "").toLowerCase();
const avatarImageProps = (user, fallbackAlt = "Profile") =>
  getCommunityAvatarImageProps(user, user?.fullName || user?.name || fallbackAlt);

const getSupportedAudioMimeType = () => {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/mp4",
  ];
  return candidates.find((type) => window.MediaRecorder?.isTypeSupported?.(type)) || "";
};

const getAudioExtension = (mimeType = "") => {
  const normalized = mimeType.toLowerCase();
  if (normalized.includes("ogg")) return "ogg";
  if (normalized.includes("mp4")) return "m4a";
  if (normalized.includes("mpeg")) return "mp3";
  if (normalized.includes("wav")) return "wav";
  return "webm";
};

const StatusIndicator = ({ isOnline, activeNow }) => (
  <div className={`cc-status-indicator ${isOnline ? "cc-online" : "cc-offline"} ${activeNow ? "cc-active-now" : ""}`} />
);

const PlusMenu = ({ onChooseFile }) => (
  <div className="cc-plus-menu">
    <button type="button" className="cc-plus-menu-option" onClick={onChooseFile}><FaImage /><span>Image</span></button>
    <button type="button" className="cc-plus-menu-option" onClick={onChooseFile}><FaVideo /><span>Video</span></button>
    <button type="button" className="cc-plus-menu-option" onClick={onChooseFile}><FaFileAlt /><span>File</span></button>
  </div>
);

export default function CommunityChatPage() {
  const {
    friends,
    chats,
    messageRequests,
    sentRequests,
    messages,
    setMessages,
    currentUserId,
    loadMessagesForFriend,
    sendChatMessage,
    editChatMessage,
    deleteChatMessage,
    acceptMessageRequest,
    deleteMessageRequest,
    blockChatUser,
    reportMessage,
    sendTyping,
    refreshCommunity,
  } = useCommunity();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeChat, setActiveChat] = useState(null);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileChatList, setShowMobileChatList] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [inputDialog, setInputDialog] = useState(null);
  const [notice, setNotice] = useState("");
  const [typingUserId, setTypingUserId] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const noticeTimerRef = useRef(null);
  const typingTimerRef = useRef(null);
  const processedRouteChatRef = useRef(null);

  const showNotice = (message) => {
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    setNotice(message || "Something went wrong.");
    noticeTimerRef.current = window.setTimeout(() => setNotice(""), 3500);
  };

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setShowMobileChatList(false);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleTyping = (event) => {
      const detail = event.detail || {};
      const userId = detail.userId || detail.user_id;
      if (!userId) return;
      if (detail.isTyping || detail.is_typing) {
        setTypingUserId(userId);
        window.clearTimeout(typingTimerRef.current);
        typingTimerRef.current = window.setTimeout(() => setTypingUserId(null), 1600);
      } else {
        setTypingUserId(null);
      }
    };

    window.addEventListener("eatopia-chat-typing", handleTyping);
    return () => window.removeEventListener("eatopia-chat-typing", handleTyping);
  }, []);


  useEffect(() => {
    const friendId = location.state?.friendId;
    const friendUser = location.state?.friendUser;

    if (!friendId || idsEqual(friendId, currentUserId)) return;

    const routeKey = `${location.key || "default"}:${friendId}`;
    if (processedRouteChatRef.current === routeKey) return;

    const allChats = [...friends, ...(chats || []), ...messageRequests, ...sentRequests].filter((u) => u?.id && !idsEqual(u.id, currentUserId));
    const existingUser = allChats.find((x) => idsEqual(x.id, friendId));

    if (existingUser) {
      setActiveChat(normalizeCommunityUser(existingUser));
      processedRouteChatRef.current = routeKey;
    } else if (friendUser?.id && !idsEqual(friendUser.id, currentUserId)) {
      setActiveChat(normalizeCommunityUser(friendUser));
      processedRouteChatRef.current = routeKey;
    }

    // Use navigation state once only. Without this, an old friendId can force the chat
    // back to a previous friend whenever Message Requests refresh.
    if (processedRouteChatRef.current === routeKey) {
      navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    }
  }, [location.key, location.pathname, location.search, location.state, friends, chats, messageRequests, sentRequests, currentUserId, navigate]);

  useEffect(() => {
    if (activeChat?.id && !idsEqual(activeChat.id, currentUserId)) loadMessagesForFriend(activeChat.id);
  }, [activeChat?.id, currentUserId, loadMessagesForFriend]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeChat]);

  const goToProfile = (user, event) => {
    event?.stopPropagation?.();
    const userId = user?.id;
    if (!userId) return;
    navigate(idsEqual(userId, currentUserId) ? "/communityProfile" : `/communityProfile?userId=${userId}`);
  };

  const openChat = (user) => {
    if (!user?.id || idsEqual(user.id, currentUserId)) return;
    setActiveChat(normalizeCommunityUser(user));
    setShowPlusMenu(false);
    setEditingMessageId(null);
    setEditingText("");
    if (isMobile) setShowMobileChatList(false);
    setMessages((prev) => ({ ...prev, [user.id]: (prev[user.id] || []).map((m) => ({ ...m, unread: false })) }));
  };

  const getLastMessage = (userId) => {
    const list = messages[userId] || [];
    if (!list.length) return { text: "No messages yet", time: "" };
    const last = list[list.length - 1];
    const text = last.type === "image" ? "📷 Photo" : last.type === "video" ? "🎬 Video" : last.type === "file" ? "📎 File" : last.type === "audio" ? "🎤 Voice note" : last.type === "post" ? "↗ Shared post" : last.text;
    return { text, time: last.time || "" };
  };

  const filterUsers = (list) => list
    .filter((u) => u?.id && !idsEqual(u.id, currentUserId))
    .filter((u) => (u.name || u.fullName || "").toLowerCase().includes(searchQuery.toLowerCase()));
  const mergeUsers = (...lists) => {
    const map = new Map();
    lists.flat().filter(Boolean).forEach((user) => {
      const key = String(user.id || "").toLowerCase();
      if (!key || idsEqual(key, currentUserId)) return;
      map.set(key, { ...(map.get(key) || {}), ...user });
    });
    return Array.from(map.values());
  };

  const acceptedChats = mergeUsers(chats || [], friends || []);
  const acceptedChatIds = new Set(acceptedChats.map((u) => String(u.id || "").toLowerCase()));
  const friendSuggestions = (friends || []).filter((u) => !acceptedChatIds.has(String(u.id || "").toLowerCase()));
  const filteredChats = filterUsers(acceptedChats);
  const filteredFriendSuggestions = filterUsers(friendSuggestions);
  const filteredRequests = filterUsers(messageRequests);
  const filteredSentRequests = filterUsers(sentRequests || []);

  const handleInputChange = (value) => {
    setInputText(value);
    if (!activeChat?.id) return;
    sendTyping?.(activeChat.id, true);
    window.clearTimeout(typingTimerRef.current);
    typingTimerRef.current = window.setTimeout(() => sendTyping?.(activeChat.id, false), 900);
  };

  const sendText = async () => {
    const text = inputText.trim();
    if (!text || !activeChat) return;
    setInputText("");
    try {
      await sendChatMessage(activeChat.id, { messageText: text, messageType: "text" });
      sendTyping?.(activeChat.id, false);
      refreshCommunity?.();
    } catch (error) {
      showNotice(error?.response?.data?.message || "Could not send message.");
      setInputText(text);
    }
  };

  const sendMedia = async (type, content, fileName = null) => {
    if (!activeChat) return;
    try {
      await sendChatMessage(activeChat.id, { messageText: type === "audio" ? "Voice note" : type, messageType: type, mediaContent: content, fileName });
      refreshCommunity?.();
    } catch (error) {
      showNotice(error?.response?.data?.message || "Could not send media.");
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const value = await uploadFile(file, undefined, "chat");
      if (file.type.startsWith("image/")) await sendMedia("image", value, file.name);
      else if (file.type.startsWith("video/")) await sendMedia("video", value, file.name);
      else await sendMedia("file", value, file.name);
    } catch (error) {
      showNotice(error?.message || "Could not upload file.");
    } finally {
      event.target.value = "";
    }
  };

  const toggleVoiceRecording = async () => {
    if (!activeChat) return;
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      showNotice("Voice notes are not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedAudioMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        try {
          if (!audioChunksRef.current.some((chunk) => chunk.size > 0)) {
            showNotice("No audio was recorded.");
            return;
          }
          const recordedType = recorder.mimeType || mimeType || "audio/webm";
          const extension = getAudioExtension(recordedType);
          const blob = new Blob(audioChunksRef.current, { type: recordedType });
          const file = new File([blob], `voice-${Date.now()}.${extension}`, { type: recordedType });
          const url = await uploadFile(file, undefined, "chat-audio");
          await sendMedia("audio", url, file.name);
        } catch (error) {
          showNotice(error?.message || "Could not upload voice note.");
        } finally {
          stream.getTracks().forEach((track) => track.stop());
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      showNotice("Microphone permission was denied.");
      setIsRecording(false);
    }
  };

  const startEditMessage = (msg) => {
    if (msg.type !== "text") return;
    setEditingMessageId(msg.id);
    setEditingText(msg.text || "");
  };

  const cancelEditMessage = () => {
    setEditingMessageId(null);
    setEditingText("");
  };

  const saveEditMessage = async () => {
    const text = editingText.trim();
    if (!activeChat || !editingMessageId || !text) return;
    try {
      await editChatMessage(activeChat.id, editingMessageId, text);
      cancelEditMessage();
    } catch (error) {
      showNotice(error?.response?.data?.message || "Could not edit message.");
    }
  };

  const performDeleteMessage = async (msg) => {
    if (!activeChat || !msg?.id) return;
    try {
      await deleteChatMessage(activeChat.id, msg.id);
      refreshCommunity?.();
    } catch (error) {
      showNotice(error?.response?.data?.message || "Could not delete message.");
    }
  };

  const removeMessage = (msg) => {
    if (!activeChat || !msg?.id) return;
    setConfirmDialog({
      title: "Delete message?",
      message: "This message will be removed from the conversation for everyone in real time.",
      confirmText: "Delete",
      onConfirm: () => performDeleteMessage(msg),
    });
  };

  const confirmRequestAction = (title, message, confirmText, action) => {
    setConfirmDialog({ title, message, confirmText, onConfirm: action });
  };

  const handleAcceptRequest = async () => {
    if (!activeChat?.id) return;
    try {
      await acceptMessageRequest?.(activeChat.id);
      setActiveChat((prev) => prev ? { ...prev, isFriend: true, section: "friends", requestStatus: "Accepted" } : prev);
      showNotice("Message request accepted.");
    } catch (error) {
      showNotice(error?.response?.data?.message || "Could not accept request.");
    }
  };

  const handleDeleteRequest = () => {
    if (!activeChat?.id) return;
    confirmRequestAction("Delete request?", "This request will disappear from your Message Requests.", "Delete", async () => {
      try {
        await deleteMessageRequest?.(activeChat.id);
        setActiveChat(null);
        showNotice("Message request deleted.");
      } catch (error) {
        showNotice(error?.response?.data?.message || "Could not delete request.");
      }
    });
  };

  const handleBlockUser = () => {
    if (!activeChat?.id) return;
    confirmRequestAction("Block user?", "They will not be able to message you or see you in search.", "Block", async () => {
      try {
        await blockChatUser?.(activeChat.id);
        setActiveChat(null);
        showNotice("User blocked.");
      } catch (error) {
        showNotice(error?.response?.data?.message || "Could not block user.");
      }
    });
  };

  const handleReportMessage = async (msg) => {
    if (!msg?.id) return;
    setInputDialog({
      title: "Report message",
      message: "Tell us what is wrong with this message. A moderator can review it from the admin panel.",
      label: "Reason",
      placeholder: "Spam, harassment, unsafe content...",
      confirmText: "Report",
      required: true,
      requiredMessage: "Please write a reason before sending the report.",
      onSubmit: async (reason) => {
        try {
          await reportMessage?.(msg.id, reason);
          showNotice("Message reported. Our moderators will review it.");
        } catch (error) {
          showNotice(error?.response?.data?.message || "Could not report this message.");
          throw error;
        }
      },
    });
  };

  const getPresenceText = (user) => {
    if (user?.online || user?.activeNow) return "Active now";
    if (user?.lastSeen === "hidden") return "Last seen hidden";
    return `Last seen ${user?.lastSeen || "recently"}`;
  };

  const getConversationBadge = (user) => {
    if (user?.section === "requests") return "Incoming request";
    if (user?.section === "sentRequests") return "Request sent";
    if (user?.isFriend) return "Friend";
    if (String(user?.requestStatus || "").toLowerCase() === "accepted") return "Chat";
    return "";
  };

  const renderChatItem = (user) => {
    const displayUser = normalizeCommunityUser(user);
    const last = getLastMessage(displayUser.id);
    const badge = getConversationBadge(displayUser);
    return (
      <div key={displayUser.id} className={`cc-chat-item ${activeChat?.id === displayUser.id ? "cc-active" : ""}`} onClick={() => openChat(displayUser)}>
        <div className="cc-chat-avatar" onClick={(e) => goToProfile(displayUser, e)} role="button" title="Open profile"><img {...avatarImageProps(displayUser)} alt={displayUser.fullName || displayUser.name || "Profile"} /><StatusIndicator isOnline={displayUser.online} activeNow={displayUser.activeNow} /></div>
        <div className="cc-chat-info">
          <div className="cc-chat-name-row"><div className="cc-chat-name">{displayUser.name}</div>{badge && <span className="cc-chat-badge">{badge}</span>}</div>
          <div className="cc-chat-preview">{last.text}</div>
          <div className="cc-chat-presence">{getPresenceText(displayUser)}</div>
        </div>
        <div className="cc-chat-meta"><div className="cc-chat-time">{last.time}</div>{displayUser.unreadCount > 0 && <span className="cc-unread-badge">{displayUser.unreadCount}</span>}</div>
      </div>
    );
  };

  const renderMessageContent = (msg) => {
    if (editingMessageId === msg.id) {
      return (
        <div className="cc-edit-message-box">
          <textarea
            className="cc-edit-message-input"
            value={editingText}
            onChange={(e) => setEditingText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEditMessage(); }
              if (e.key === "Escape") cancelEditMessage();
            }}
            autoFocus
          />
          <div className="cc-edit-message-actions">
            <button type="button" className="cc-small-action" onClick={saveEditMessage}><FaCheck /> Save</button>
            <button type="button" className="cc-small-action" onClick={cancelEditMessage}><FaTimes /> Cancel</button>
          </div>
        </div>
      );
    }

    if (msg.type === "image") return <img src={resolveMediaUrl(msg.mediaContent || msg.content)} className="cc-message-image" alt="Shared" />;
    if (msg.type === "video") return <video className="cc-message-video" src={resolveMediaUrl(msg.mediaContent || msg.content)} controls />;
    if (msg.type === "audio") return <audio className="cc-message-audio" src={resolveMediaUrl(msg.mediaContent || msg.content)} controls />;
    if (msg.type === "file") {
      const url = resolveMediaUrl(msg.mediaContent || msg.content?.url || msg.content);
      return <a className="cc-file-message" href={url} target="_blank" rel="noreferrer"><FaFileAlt className="cc-file-icon" /><div className="cc-file-info"><div className="cc-file-name">{msg.fileName || "File"}</div><div className="cc-file-size">Open file</div></div></a>;
    }
    if (msg.type === "post") return <div className="cc-file-message cc-shared-post-message"><FaFileAlt className="cc-file-icon" /><div className="cc-file-info"><div className="cc-file-name">Shared post</div><div className="cc-file-size">{msg.content?.text || msg.text || "Community post"}</div>{msg.content?.imageUrl && <img src={resolveMediaUrl(msg.content.imageUrl)} className="cc-message-image" alt="Shared post" />}</div></div>;
    return <div className="cc-message-text">{msg.text}</div>;
  };

  return (
    <div className="cc-messenger-container">
      {notice && <div className="cc-toast-message" role="status">{notice}</div>}
      {(!isMobile || showMobileChatList) && (
        <div className="cc-messenger-sidebar">
          <div className="cc-sidebar-header">
            <div className="cc-sidebar-heading">
              <button className="cc-community-brand" type="button" onClick={() => navigate("/")} aria-label="Eatopia home">
                <img src={brandLogo} alt="Eatopia" className="cc-community-brand-logo" />
                <span className="community-brand-name">Eatopia</span>
              </button>
              <div className="cc-chats-title">Chats</div>
            </div>
            <button className="cc-home-btn" type="button" onClick={() => navigate("/communityHomePage")}><FaHome /></button>
          </div>
          <div className="cc-sidebar-search"><FaSearch className="cc-search-icon" /><input type="text" placeholder="Search Messenger" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
          <div className="cc-all-chats">
            <div className="cc-section-title">CHATS</div>
            {filteredChats.length ? filteredChats.map(renderChatItem) : <div className="cc-empty-section">No chats yet. Follow people back to become friends or send a message request.</div>}
            {filteredFriendSuggestions.length > 0 && <div className="cc-section-title">FRIENDS TO MESSAGE</div>}
            {filteredFriendSuggestions.map(renderChatItem)}
            <div className="cc-section-title">MESSAGE REQUESTS</div>
            {filteredRequests.length ? filteredRequests.map(renderChatItem) : <div className="cc-empty-section">No incoming requests</div>}
            <div className="cc-section-title">SENT REQUESTS</div>
            {filteredSentRequests.length ? filteredSentRequests.map(renderChatItem) : <div className="cc-empty-section">No sent requests</div>}
          </div>
        </div>
      )}

      {(!isMobile || !showMobileChatList) && (
        <div className="cc-messenger-main">
          {activeChat ? (
            <>
              <div className="cc-chat-header">
                <div className="cc-header-left">
                  {isMobile && <button type="button" className="cc-back-btn" onClick={() => setShowMobileChatList(true)}><FaArrowLeft /></button>}
                  <div className="cc-header-avatar" onClick={(e) => goToProfile(activeChat, e)} role="button" title="Open profile"><img {...avatarImageProps(activeChat)} alt={activeChat.fullName || activeChat.name || "Profile"} /><StatusIndicator isOnline={activeChat.online} activeNow={activeChat.activeNow} /></div>
                  <div className="cc-header-info" onClick={(e) => goToProfile(activeChat, e)} role="button" title="Open profile"><div className="cc-header-name">{activeChat.name}</div><div className="cc-header-status">{activeChat.online ? <span className="cc-online-text">Active now</span> : <span className="cc-offline-text">{getPresenceText(activeChat)}</span>}</div></div>
                </div>
                <div className="cc-header-actions">
                  <button type="button" className="cc-header-danger-btn" onClick={handleBlockUser} title="Block this user">
                    <FaBan /> Block
                  </button>
                </div>
              </div>

              {activeChat.section === "requests" && !activeChat.isFriend && (
                <div className="cc-request-action-bar">
                  <div><strong>Message request</strong><span> Accept to move this conversation to Chats, or delete/block it.</span></div>
                  <div className="cc-request-buttons">
                    <button type="button" className="cc-accept-btn" onClick={handleAcceptRequest}><FaCheck /> Accept</button>
                    <button type="button" className="cc-soft-btn" onClick={handleDeleteRequest}><FaTrash /> Delete</button>
                    <button type="button" className="cc-danger-btn" onClick={handleBlockUser}><FaBan /> Block</button>
                  </div>
                </div>
              )}

              {activeChat.section === "sentRequests" && !activeChat.isFriend && (
                <div className="cc-request-action-bar cc-sent-request-bar">
                  <div><strong>Request sent</strong><span> Your messages stay here until the other person accepts or follows you back.</span></div>
                  <div className="cc-request-buttons">
                    <button type="button" className="cc-soft-btn" onClick={handleDeleteRequest}><FaTrash /> Cancel request</button>
                    <button type="button" className="cc-danger-btn" onClick={handleBlockUser}><FaBan /> Block</button>
                  </div>
                </div>
              )}

              <div className="cc-messages-area"><div className="cc-messages-container">
                {(messages[activeChat.id] || []).length === 0 && (
                  <div className="cc-chat-starter">
                    <img {...avatarImageProps(activeChat)} alt={activeChat.fullName || activeChat.name || "Profile"} />
                    <h3>{activeChat.name}</h3>
                    <p>{activeChat.isFriend ? "You are mutual friends. Start the conversation." : "This will be sent as a message request until they accept or follow back."}</p>
                  </div>
                )}
                {(messages[activeChat.id] || []).map((msg) => {
                  const isMine = msg.sender === "me";
                  return (
                    <div key={msg.id} className={`cc-message-wrapper ${isMine ? "cc-mine" : "cc-theirs"}`}>
                      {editingMessageId !== msg.id && !msg.isDeleted && (
                        <div className="cc-message-actions" aria-label="Message actions">
                          {isMine && msg.type === "text" && <button type="button" className="cc-message-action-btn" title="Edit message" onClick={() => startEditMessage(msg)}><FaEdit /></button>}
                          {isMine && <button type="button" className="cc-message-action-btn cc-danger" title="Delete message" onClick={() => removeMessage(msg)}><FaTrash /></button>}
                          {!isMine && <button type="button" className="cc-message-action-btn" title="Report message" onClick={() => handleReportMessage(msg)}><FaFlag /></button>}
                        </div>
                      )}
                      <div className={`cc-message-bubble ${isMine ? "cc-my-message" : "cc-their-message"}`}>
                        {renderMessageContent(msg)}
                        <div className="cc-message-footer"><span className="cc-message-time">{msg.time}{msg.isEdited ? " · edited" : ""}{isMine ? ` · ${msg.status || "sent"}` : ""}</span></div>
                      </div>
                    </div>
                  );
                })}
                {typingUserId && activeChat?.id && !idsEqual(typingUserId, currentUserId) && (
                  <div className="cc-typing-indicator">{activeChat.name} is typing<span>.</span><span>.</span><span>.</span></div>
                )}
                <div ref={messagesEndRef} />
              </div></div>

              <div className="cc-message-input-area">
                <div className="cc-plus-menu-container"><button type="button" className={`cc-input-icon cc-plus-button ${showPlusMenu ? "cc-active" : ""}`} onClick={() => setShowPlusMenu((v) => !v)}><FaPlus /></button>{showPlusMenu && <PlusMenu onChooseFile={() => fileInputRef.current?.click()} />}<input ref={fileInputRef} type="file" accept="image/*,video/*,.pdf,.doc,.docx,.txt" style={{ display: "none" }} onChange={handleFileUpload} /></div>
                <button type="button" className={isRecording ? "cc-input-icon cc-voice-button cc-recording" : "cc-input-icon cc-voice-button"} onClick={toggleVoiceRecording}><FaMicrophone /></button>
                <div className="cc-input-container"><textarea className="cc-message-input" placeholder="Message..." value={inputText} onChange={(e) => handleInputChange(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); } }} rows={1} /><button type="button" className="cc-input-icon cc-send-button" onClick={sendText}><FaPaperPlane /></button></div>
              </div>
            </>
          ) : <div className="cc-empty-chat"><h2>Select a conversation</h2><p>Mutual follow appears under Friends. Messages before follow-back appear under Message Requests.</p></div>}
        </div>
      )}
      <ConfirmDialog
        open={Boolean(confirmDialog)}
        title={confirmDialog?.title}
        message={confirmDialog?.message}
        confirmText={confirmDialog?.confirmText || "Delete"}
        cancelText="Cancel"
        tone="danger"
        onCancel={() => setConfirmDialog(null)}
        onConfirm={confirmDialog?.onConfirm}
      />
      <TextInputDialog
        open={Boolean(inputDialog)}
        title={inputDialog?.title}
        message={inputDialog?.message}
        label={inputDialog?.label}
        placeholder={inputDialog?.placeholder}
        confirmText={inputDialog?.confirmText || "Save"}
        required={inputDialog?.required}
        requiredMessage={inputDialog?.requiredMessage}
        onCancel={() => setInputDialog(null)}
        onSubmit={async (value) => {
          await inputDialog?.onSubmit?.(value);
          setInputDialog(null);
        }}
      />
    </div>
  );
}
