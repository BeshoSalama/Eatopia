import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./CommunityHomePage.css";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL, uploadFile, normalizeStoredMediaUrl, formatServerDateTime, getMediaUrlCandidates } from "../config/api";
import { useCommunity } from "./CommunityContext";
import CommunityNotificationsCard from "./CommunityNotificationsCard";
import ConfirmDialog from "../components/ConfirmDialog";
import TextInputDialog from "../components/TextInputDialog";
import { getCommunityAvatarImageProps, normalizeCommunityUser } from "./communityUtils";
import brandLogo from "../assets/healthyfood-logo.png";

const SEARCH_HISTORY_KEY = "eatopiaPeopleSearchHistory";
const getToken = () => localStorage.getItem("token");
const authHeaders = () => ({ headers: { Authorization: `Bearer ${getToken()}` } });

const fileToStoredUrl = async (file) => {
  if (!file) return "";
  return uploadFile(file, getToken(), "post");
};

const normalizeUser = (user = {}) => normalizeCommunityUser(user);

const normalizePost = (post = {}) => {
  const shared = post.sharedPost || post.shared_post || null;
  return {
    id: post.id || post.Id,
    text: post.text || post.content || "",
    imageUrl: normalizeStoredMediaUrl(post.imageUrl || post.image_url || ""),
    createdAt: post.createdAt || post.created_at || new Date().toISOString(),
    author: normalizeUser(post.author || post.user || {}),
    isMine: Boolean(post.isMine || post.is_mine),
    isLiked: Boolean(post.isLiked || post.is_liked),
    likes: Number(post.likes || 0),
    likedBy: post.likedBy || post.liked_by || [],
    comments: (post.comments || []).map((c) => ({
      id: c.id || c.Id,
      text: c.text || "",
      createdAt: c.createdAt || c.created_at || null,
      isMine: Boolean(c.isMine || c.is_mine),
      author: normalizeUser(c.author || c.user || {}),
    })),
    sharedPost: shared ? {
      id: shared.id,
      text: shared.text || shared.content || "",
      imageUrl: normalizeStoredMediaUrl(shared.imageUrl || shared.image_url || ""),
      author: normalizeUser(shared.author || shared.user || {}),
    } : null,
  };
};

const followButtonText = (person) => {
  if (person.isFriend) return "Friends";
  if (person.isFollowing && person.followsMe) return "Friends";
  if (person.isFollowing) return "Following";
  if (person.followsMe) return "Follow back";
  return "Follow";
};

export default function CommunityHomePage() {
  const navigate = useNavigate();
  const { allUsers, friends, searchUsers, toggleFollow, refreshCommunity } = useCommunity();
  const [currentUser] = useState(() => normalizeUser(JSON.parse(localStorage.getItem("eatopiaUser") || "{}")));
  const [posts, setPosts] = useState([]);
  const [newPostText, setNewPostText] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [peopleSearch, setPeopleSearch] = useState("");
  const [peopleResults, setPeopleResults] = useState([]);
  const [searchHistory, setSearchHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || "[]"); }
    catch { return []; }
  });
  const [editingPost, setEditingPost] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [editingImage, setEditingImage] = useState("");
  const [commentDrafts, setCommentDrafts] = useState({});
  const [editingComment, setEditingComment] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [error, setError] = useState("");
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [inputDialog, setInputDialog] = useState(null);
  const [openPostMenuId, setOpenPostMenuId] = useState(null);
  const [openPeopleMenuId, setOpenPeopleMenuId] = useState(null);

  const canPost = newPostText.trim().length > 0 || Boolean(imagePreview);
  const canSaveEdit = editingText.trim().length > 0 || Boolean(editingImage) || Boolean(editingPost?.sharedPost);
  const isSelf = useCallback((id) => String(id || "").toLowerCase() === String(currentUser.id || "").toLowerCase(), [currentUser.id]);

  const closeMenus = () => {
    setOpenPostMenuId(null);
    setOpenPeopleMenuId(null);
  };
  const mediaImageProps = (value, fallback = "") => {
    const candidates = getMediaUrlCandidates(value, fallback);
    return {
      src: candidates[0] || fallback,
      "data-media-candidates": JSON.stringify(candidates),
      "data-media-index": "0",
    };
  };

  const handleImageLoadError = (event) => {
    const image = event.currentTarget;
    let candidates = [];
    try { candidates = JSON.parse(image.dataset.mediaCandidates || "[]"); } catch { candidates = []; }
    const currentIndex = Number(image.dataset.mediaIndex || "0");
    const nextIndex = currentIndex + 1;

    if (nextIndex < candidates.length) {
      image.dataset.mediaIndex = String(nextIndex);
      image.src = candidates[nextIndex];
      return;
    }

    console.warn("Eatopia media failed to load", { src: image.src, candidates });
    image.style.display = "none";
    image.parentElement?.classList.add("media-load-error");
  };

  const avatarImageProps = (user, fallbackAlt = "Profile") =>
    getCommunityAvatarImageProps(user, user?.fullName || user?.name || fallbackAlt);


  const persistSearchHistory = (items) => {
    const unique = Array.from(new Set(items.map((item) => String(item || "").trim()).filter(Boolean))).slice(0, 8);
    setSearchHistory(unique);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(unique));
  };

  const saveSearchTerm = (term) => {
    const value = String(term || "").trim();
    if (value.length < 2) return;
    persistSearchHistory([value, ...searchHistory.filter((item) => item.toLowerCase() !== value.toLowerCase())]);
  };

  const removeSearchTerm = (term) => {
    persistSearchHistory(searchHistory.filter((item) => item !== term));
  };

  const openCommunityProfile = (userId) => {
    closeMenus();
    if (!userId) return;
    navigate(isSelf(userId) ? "/communityProfile" : "/communityProfile?userId=" + userId);
  };

  const loadPosts = async () => {
    const res = await axios.get(`${API_BASE_URL}/community/posts?page=1&pageSize=50`, authHeaders());
    setPosts((res.data.posts || res.data.data || []).map(normalizePost));
  };

  useEffect(() => {
    loadPosts().catch((e) => setError(e?.response?.data?.message || "Could not load posts."));
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const q = peopleSearch.trim();
      if (!q) {
        setPeopleResults((allUsers || []).filter((u) => !isSelf(u.id)).slice(0, 8));
        return;
      }
      const users = await searchUsers(q).catch(() => []);
      setPeopleResults(users.filter((u) => !isSelf(u.id)).slice(0, 8));
    }, 250);
    return () => clearTimeout(timer);
  }, [peopleSearch, allUsers, searchUsers, isSelf]);

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImagePreview(await fileToStoredUrl(file));
      setError("");
    } catch (err) {
      setError(err?.message || "Could not upload image.");
    } finally {
      e.target.value = "";
    }
  };

  const handleEditImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setEditingImage(await fileToStoredUrl(file));
      setError("");
    } catch (err) {
      setError(err?.message || "Could not upload image.");
    } finally {
      e.target.value = "";
    }
  };

  const createPost = async () => {
    if (!canPost) return;
    try {
      const res = await axios.post(`${API_BASE_URL}/community/posts`, { content: newPostText.trim(), imageUrl: imagePreview || null }, authHeaders());
      setPosts((prev) => [normalizePost(res.data.post || res.data.data), ...prev]);
      setNewPostText("");
      setImagePreview("");
      setError("");
    } catch (e) {
      setError(e?.response?.data?.message || "Could not create post.");
    }
  };

  const startEditPost = (post) => {
    closeMenus();
    setEditingPost(post);
    setEditingText(post.text || "");
    setEditingImage(post.imageUrl || "");
  };

  const cancelPostEdit = () => {
    setEditingPost(null);
    setEditingText("");
    setEditingImage("");
  };

  const savePostEdit = async () => {
    if (!editingPost || !canSaveEdit) return;
    try {
      const res = await axios.put(`${API_BASE_URL}/community/posts/${editingPost.id}`, { content: editingText.trim(), imageUrl: editingImage || null }, authHeaders());
      const saved = normalizePost(res.data.post || res.data.data);
      setPosts((prev) => prev.map((p) => p.id === saved.id ? saved : p));
      cancelPostEdit();
      setError("");
    } catch (e) {
      setError(e?.response?.data?.message || "Could not update post.");
    }
  };

  const performDeletePost = async (id) => {
    const old = posts;
    setPosts((prev) => prev.filter((p) => p.id !== id));
    try {
      await axios.delete(`${API_BASE_URL}/community/posts/${id}`, authHeaders());
    } catch (e) {
      setPosts(old);
      setError(e?.response?.data?.message || "Could not delete post.");
    }
  };

  const deletePost = (id) => {
    closeMenus();
    setConfirmDialog({
      title: "Delete post?",
      message: "This post will be removed from your profile and feed. Shared copies will stay safe as deleted-post placeholders.",
      confirmText: "Delete",
      onConfirm: () => performDeletePost(id),
    });
  };

  const toggleLike = async (post) => {
    const liked = !post.isLiked;
    setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, isLiked: liked, likes: Math.max(0, p.likes + (liked ? 1 : -1)) } : p));
    try {
      if (liked) await axios.post(`${API_BASE_URL}/community/posts/${post.id}/like`, {}, authHeaders());
      else await axios.delete(`${API_BASE_URL}/community/posts/${post.id}/like`, authHeaders());
    } catch {
      loadPosts();
    }
  };

  const addComment = async (postId) => {
    const text = (commentDrafts[postId] || "").trim();
    if (!text) return;
    try {
      const res = await axios.post(`${API_BASE_URL}/community/posts/${postId}/comments`, { text }, authHeaders());
      const saved = res.data.comment || res.data.data;
      const normalized = {
        id: saved.id,
        text: saved.text,
        createdAt: saved.createdAt || new Date().toISOString(),
        author: normalizeUser(saved.author || saved.user),
        isMine: true,
      };
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comments: [...p.comments, normalized] } : p));
      setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
    } catch (e) {
      setError(e?.response?.data?.message || "Could not add comment.");
    }
  };

  const startEditComment = (postId, comment) => {
    setEditingComment({ postId, commentId: comment.id });
    setEditingCommentText(comment.text || "");
  };

  const cancelEditComment = () => {
    setEditingComment(null);
    setEditingCommentText("");
  };

  const saveCommentEdit = async () => {
    const text = editingCommentText.trim();
    if (!editingComment || !text) return;
    try {
      const { postId, commentId } = editingComment;
      const res = await axios.put(`${API_BASE_URL}/community/posts/${postId}/comments/${commentId}`, { text }, authHeaders());
      const saved = res.data.comment || res.data.data;
      setPosts((prev) => prev.map((post) => post.id === postId ? {
        ...post,
        comments: post.comments.map((comment) => comment.id === commentId ? {
          ...comment,
          text: saved.text || text,
          createdAt: saved.createdAt || comment.createdAt,
        } : comment),
      } : post));
      cancelEditComment();
    } catch (e) {
      setError(e?.response?.data?.message || "Could not update comment.");
    }
  };

  const performDeleteComment = async (postId, commentId) => {
    const oldPosts = posts;
    setPosts((prev) => prev.map((post) => post.id === postId ? {
      ...post,
      comments: post.comments.filter((comment) => comment.id !== commentId),
    } : post));
    try {
      await axios.delete(`${API_BASE_URL}/community/posts/${postId}/comments/${commentId}`, authHeaders());
    } catch (e) {
      setPosts(oldPosts);
      setError(e?.response?.data?.message || "Could not delete comment.");
    }
  };

  const deleteComment = (postId, commentId) => {
    setConfirmDialog({
      title: "Delete comment?",
      message: "This comment will be removed from the post.",
      confirmText: "Delete",
      onConfirm: () => performDeleteComment(postId, commentId),
    });
  };

  const performShareToProfile = async (post, caption) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/community/posts/${post.id}/share-profile`, { caption: caption || "" }, authHeaders());
      setPosts((prev) => [normalizePost(res.data.post || res.data.data), ...prev]);
      setError("");
    } catch (e) {
      setError(e?.response?.data?.message || "Could not share post.");
    }
  };

  const shareToProfile = (post) => {
    closeMenus();
    setInputDialog({
      title: "Share to profile",
      message: "Add an optional caption before sharing this post.",
      label: "Caption",
      placeholder: "Write a caption...",
      confirmText: "Share",
      onSubmit: (caption) => performShareToProfile(post, caption),
    });
  };

  const performSendPost = async (post, query) => {
    const q = query.trim();
    if (!q) return;
    try {
      const users = allUsers.length ? allUsers : await searchUsers(q);
      const key = q.toLowerCase();
      const target = users.find((u) => [u.name, u.fullName, u.username, u.email].some((v) => (v || "").toLowerCase().includes(key)));
      if (!target) {
        setError("No user found.");
        return;
      }
      await axios.post(`${API_BASE_URL}/community/posts/${post.id}/share-message`, { targetUserId: target.id, message: "Shared a post" }, authHeaders());
      setError("");
      navigate("/communityChat", { state: { friendId: target.id, friendUser: target } });
    } catch (e) {
      setError(e?.response?.data?.message || "Could not send post.");
    }
  };

  const sendPost = (post) => {
    closeMenus();
    setInputDialog({
      title: "Send post",
      message: "Type the name, username, or email of the person you want to send this post to.",
      label: "Recipient",
      placeholder: "Search by name, username, or email...",
      confirmText: "Send",
      onSubmit: (query) => performSendPost(post, query),
    });
  };

  const handleFollow = async (person) => {
    closeMenus();
    if (!person?.id || isSelf(person.id)) return;
    await toggleFollow(person.id, !person.isFollowing);
    await refreshCommunity();
  };

  const hidePost = async (postId) => {
    closeMenus();
    const oldPosts = posts;
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    try {
      await axios.post(`${API_BASE_URL}/community/posts/${postId}/hide`, {}, authHeaders());
      setError("");
    } catch (e) {
      setPosts(oldPosts);
      setError(e?.response?.data?.message || "Could not hide post.");
    }
  };

  const reportPost = (post) => {
    closeMenus();
    setInputDialog({
      title: "Report post",
      message: "Tell us what is wrong with this post.",
      label: "Reason",
      placeholder: "Spam, harassment, misinformation...",
      confirmText: "Report",
      required: true,
      requiredMessage: "Please write a reason before sending the report.",
      onSubmit: async (reason) => {
        await axios.post(`${API_BASE_URL}/community/posts/${post.id}/report`, { reason }, authHeaders());
        setError("");
      },
    });
  };

  const reportComment = (postId, comment) => {
    setInputDialog({
      title: "Report comment",
      message: "Tell us what is wrong with this comment.",
      label: "Reason",
      placeholder: "Spam, harassment, unsafe content...",
      confirmText: "Report",
      required: true,
      requiredMessage: "Please write a reason before sending the report.",
      onSubmit: async (reason) => {
        await axios.post(`${API_BASE_URL}/community/posts/${postId}/comments/${comment.id}/report`, { reason }, authHeaders());
        setError("");
      },
    });
  };

  const reportPerson = (person) => {
    closeMenus();
    if (!person?.id || isSelf(person.id)) return;
    setInputDialog({
      title: "Report user",
      message: `Tell us what is wrong with ${person.fullName || person.name || "this user"}.`,
      label: "Reason",
      placeholder: "Harassment, abuse, spam...",
      confirmText: "Report",
      required: true,
      requiredMessage: "Please write a reason before sending the report.",
      onSubmit: async (reason) => {
        await axios.post(`${API_BASE_URL}/community/users/${person.id}/report`, { reason }, authHeaders());
        setError("");
      },
    });
  };

  const blockPerson = (person) => {
    closeMenus();
    if (!person?.id || isSelf(person.id)) return;
    setConfirmDialog({
      title: "Block user?",
      message: `${person.name || "This user"} will not be able to message you or appear in search results.`,
      confirmText: "Block",
      onConfirm: async () => {
        await axios.post(`${API_BASE_URL}/community/users/${person.id}/block`, {}, authHeaders());
        setPeopleResults((prev) => prev.filter((u) => u.id !== person.id));
        setPosts((prev) => prev.filter((post) => post.author.id !== person.id));
        await refreshCommunity();
      },
    });
  };

  const filteredPeople = useMemo(() => (peopleResults.length ? peopleResults : allUsers).filter((u) => !isSelf(u.id)).slice(0, 8), [peopleResults, allUsers, isSelf]);

  return (
    <div className="community-page" onClick={closeMenus}>
      <header className="community-header">
        <Link to="/" className="community-logo-link" aria-label="Eatopia home">
          <img src={brandLogo} alt="Eatopia" className="community-logo" />
          <span className="community-brand-name">Eatopia</span>
        </Link>
        <div className="profile-chip"><Link to="/communityProfile" className="profile-chip-link"><img {...avatarImageProps(currentUser)} alt={currentUser.fullName || currentUser.name || "Profile"} className="avatar" /><span className="profile-chip-name">{currentUser.name}</span></Link></div>
      </header>

      <div className="community-layout">
        <aside className="sidebar chats-sidebar">
          <div className="sidebar-card">
            <h2 className="sidebar-title">Find people</h2>
            <input type="search" className="header-search-input" style={{ width: "100%", marginBottom: 12 }} placeholder="Search users by name/email..." value={peopleSearch} onChange={(e) => setPeopleSearch(e.target.value)} onBlur={() => saveSearchTerm(peopleSearch)} onKeyDown={(e) => { if (e.key === "Enter") saveSearchTerm(peopleSearch); }} />
            {searchHistory.length > 0 && (
              <div className="search-history-box">
                <div className="search-history-header"><span>Recent searches</span><button type="button" onClick={() => persistSearchHistory([])}>Clear</button></div>
                <div className="search-history-list">
                  {searchHistory.map((term) => (
                    <button key={term} type="button" className="search-history-chip" onClick={() => setPeopleSearch(term)}>
                      <span>{term}</span><strong onClick={(e) => { e.stopPropagation(); removeSearchTerm(term); }}>×</strong>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="chats-list">
              {filteredPeople.map((person) => (
                <div key={person.id} className="chat-item" style={{ cursor: "default" }}>
                  <div className="chat-avatar-wrapper" onClick={() => { saveSearchTerm(peopleSearch); openCommunityProfile(person.id); }} style={{ cursor: "pointer" }}><img {...avatarImageProps(person)} alt={person.fullName || person.name || "Profile"} className="chat-avatar" />{person.online && <span className="status-dot" />}</div>
                  <div className="chat-body" onClick={() => { saveSearchTerm(peopleSearch); openCommunityProfile(person.id); }} style={{ cursor: "pointer" }}>
                    <div className="chat-name-row"><span className="chat-name">{person.fullName || person.name}</span></div>
                    <p className="chat-preview">{person.isFriend ? "Friend" : person.followsMe ? "Follows you" : person.lastSeen || person.username || person.email}</p>
                  </div>
                  {!isSelf(person.id) && <div className="people-actions people-menu-wrapper" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="people-menu-button"
                      aria-label={`Open actions for ${person.fullName || person.name || person.username || "user"}`}
                      onClick={() => setOpenPeopleMenuId((id) => id === person.id ? null : person.id)}
                    >
                      <span className="three-dots" />
                    </button>
                    {openPeopleMenuId === person.id && (
                      <div className="people-menu">
                        <button type="button" onClick={() => handleFollow(person)}>{followButtonText(person)}</button>
                        <button type="button" onClick={() => { closeMenus(); navigate("/communityChat", { state: { friendId: person.id, friendUser: person } }); }}>{person.isFriend ? "Message" : "Message request"}</button>
                        <button type="button" onClick={() => openCommunityProfile(person.id)}>View profile</button>
                        <button type="button" className="danger" onClick={() => reportPerson(person)}>Report user</button>
                        <button type="button" className="danger" onClick={() => blockPerson(person)}>Block</button>
                      </div>
                    )}
                  </div>}
                </div>
              ))}
            </div>
          </div>
          <div className="sidebar-card"><h3 className="following-card-title">Friends</h3><div className="following-avatars">{friends.slice(0, 8).map((p) => <div key={p.id} className="following-avatar" onClick={() => openCommunityProfile(p.id)} title="Open profile"><img {...avatarImageProps(p)} alt={p.fullName || p.name || "Profile"} /></div>)}</div></div>
        </aside>

        <main className="feed-column">
          <div className="feed-header"><h1 className="feed-title">Activity Feed</h1></div>
          {error && <p className="community-error-message">{error}</p>}

          <section className="create-post-card">
            <div className="create-post-top"><img {...avatarImageProps(currentUser)} alt={currentUser.fullName || currentUser.name || "Profile"} className="avatar" onClick={() => openCommunityProfile(currentUser.id)} style={{ cursor: "pointer" }} /><div className="create-post-input-wrapper"><textarea className="create-post-textarea" placeholder="Share what’s on your mind..." value={newPostText} onChange={(e) => setNewPostText(e.target.value)} /></div></div>
            <div className="create-post-footer"><label className="upload-button"><input type="file" accept="image/*" className="upload-input" onChange={handleImageChange} /><span>📷 Upload photo</span></label><button type="button" className="primary-button" disabled={!canPost} onClick={createPost}>Post ➤</button></div>
            {imagePreview && <div className="create-post-preview"><button type="button" className="comment-cancel-button" onClick={() => setImagePreview("")}>Remove image</button><div className="post-image-square"><img {...mediaImageProps(imagePreview)} alt="preview" onError={handleImageLoadError} /></div></div>}
          </section>

          <section className="feed-list">
            {posts.map((post) => <article key={post.id} className="feed-card">
              <div className="post-header">
                <div className="post-author" onClick={() => openCommunityProfile(post.author.id)} style={{ cursor: "pointer" }}>
                  <img {...avatarImageProps(post.author)} alt={post.author.fullName || post.author.name || "Profile"} className="avatar" />
                  <div className="post-author-meta">
                    <span className="post-author-name">{post.author.name}</span>
                    <div className="post-meta"><span>{formatServerDateTime(post.createdAt)}</span></div>
                  </div>
                </div>
                <div className="post-header-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="post-menu-button icon-only"
                    type="button"
                    aria-label="Open post actions"
                    onClick={() => setOpenPostMenuId((id) => id === post.id ? null : post.id)}
                  >
                    <span className="three-dots" />
                  </button>
                  {openPostMenuId === post.id && (
                    <div className="post-menu">
                      {post.isMine ? (
                        <>
                          <button type="button" onClick={() => startEditPost(post)}>Edit post</button>
                          <button type="button" className="danger" onClick={() => deletePost(post.id)}>Delete post</button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => openCommunityProfile(post.author.id)}>View profile</button>
                          <button type="button" onClick={() => { closeMenus(); navigate("/communityChat", { state: { friendId: post.author.id, friendUser: post.author } }); }}>Message</button>
                          <button type="button" onClick={() => hidePost(post.id)}>Hide post</button>
                          <button type="button" className="danger" onClick={() => reportPost(post)}>Report post</button>
                          <button type="button" className="danger" onClick={() => reportPerson(post.author)}>Report user</button>
                          <button type="button" className="danger" onClick={() => blockPerson(post.author)}>Block user</button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {editingPost?.id === post.id ? <div className="post-edit-block"><textarea className="post-edit-textarea" value={editingText} onChange={(e) => setEditingText(e.target.value)} /><div className="create-post-footer"><label className="upload-button"><input type="file" accept="image/*" className="upload-input" onChange={handleEditImageChange} /><span>Replace photo</span></label>{editingImage && <button type="button" className="comment-cancel-button" onClick={() => setEditingImage("")}>Remove photo</button>}</div>{editingImage && <div className="post-image-full"><img {...mediaImageProps(editingImage)} alt="Edit preview" onError={handleImageLoadError} /></div>}<div className="post-edit-actions"><button className="comment-save-button" disabled={!canSaveEdit} onClick={savePostEdit}>Save</button><button className="comment-cancel-button" onClick={cancelPostEdit}>Cancel</button></div></div> : <>{post.text && <p className="post-text">{post.text}</p>}{post.imageUrl && <div className="post-image-full"><img {...mediaImageProps(post.imageUrl)} alt="Post" onError={handleImageLoadError} /></div>}</>}
              {post.sharedPost && <div className="feed-card" style={{ marginTop: 12, padding: 12 }}><strong>{post.sharedPost.author.name}</strong>{post.sharedPost.text && <p className="post-text">{post.sharedPost.text}</p>}{post.sharedPost.imageUrl && <img {...mediaImageProps(post.sharedPost.imageUrl)} alt="Shared" style={{ maxWidth: "100%", borderRadius: 14 }} onError={handleImageLoadError} />}</div>}
              <div className="post-footer"><div className="reactions-left"><button type="button" className={`reaction-button ${post.isLiked ? "liked" : ""}`} onClick={() => toggleLike(post)}>♥ {post.likes}</button><button type="button" className="reaction-button">💬 {post.comments.length}</button><button type="button" className="reaction-button" onClick={() => shareToProfile(post)}>Share</button><button type="button" className="reaction-button" onClick={() => sendPost(post)}>Send</button></div></div>
              <div className="post-comments"><div className="comments-list">{post.comments.map((c) => {
                const isEditingThisComment = editingComment?.postId === post.id && editingComment?.commentId === c.id;
                return (
                  <div key={c.id} className="comment-item">
                    <img {...avatarImageProps(c.author)} alt={c.author.fullName || c.author.name || "Profile"} className="comment-avatar" onClick={() => openCommunityProfile(c.author.id)} style={{ cursor: "pointer" }} />
                    <div className="comment-body">
                      <div className="comment-header">
                        <span className="comment-author">{c.author.name}</span>
                        {!isEditingThisComment && <span className="comment-actions-inline">{c.isMine ? <><button type="button" onClick={() => startEditComment(post.id, c)}>Edit</button><button type="button" onClick={() => deleteComment(post.id, c.id)}>Delete</button></> : <button type="button" onClick={() => reportComment(post.id, c)}>Report</button>}</span>}
                      </div>
                      {isEditingThisComment ? (
                        <div className="comment-edit-row">
                          <input className="add-comment-input" value={editingCommentText} onChange={(e) => setEditingCommentText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveCommentEdit(); if (e.key === "Escape") cancelEditComment(); }} />
                          <button type="button" className="add-comment-button" onClick={saveCommentEdit}>Save</button>
                          <button type="button" className="comment-cancel-button" onClick={cancelEditComment}>Cancel</button>
                        </div>
                      ) : <p className="comment-text">{c.text}</p>}
                    </div>
                  </div>
                );
              })}</div><div className="add-comment-row"><img {...avatarImageProps(currentUser)} alt={currentUser.fullName || currentUser.name || "Profile"} className="comment-avatar" onClick={() => openCommunityProfile(currentUser.id)} style={{ cursor: "pointer" }} /><input className="add-comment-input" placeholder="Comment..." value={commentDrafts[post.id] || ""} onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") addComment(post.id); }} /><button className="add-comment-button" onClick={() => addComment(post.id)}>Comment</button></div></div>
            </article>)}
          </section>
        </main>

        <aside className="sidebar updates-sidebar">
          <CommunityNotificationsCard />
        </aside>
      </div>
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
        cancelText="Cancel"
        onCancel={() => setInputDialog(null)}
        onSubmit={async (value) => {
          await inputDialog?.onSubmit?.(value);
          setInputDialog(null);
        }}
      />
    </div>
  );
}
