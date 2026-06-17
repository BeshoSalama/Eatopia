import React, { useEffect, useMemo, useState } from "react";
import "./CommunityHomePage.css";
import "./CommunityProfilePage.css";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL, resolveMediaUrl, normalizeStoredMediaUrl, formatServerTimeAgo } from "../config/api";
import { useCommunity } from "./CommunityContext";
import { getCommunityAvatarImageProps, normalizeCommunityUser } from "./communityUtils";
import TextInputDialog from "../components/TextInputDialog";
import brandLogo from "../assets/healthyfood-logo.png";

const DEFAULT_COVER = "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1600&q=80";

const getToken = () => localStorage.getItem("token");
const authHeaders = () => ({ headers: { Authorization: `Bearer ${getToken()}` } });

const normalizeUser = (user = {}) => normalizeCommunityUser(user);

const normalizePost = (post = {}) => ({
  id: post.id || post.Id,
  text: post.text || post.content || "",
  imageUrl: normalizeStoredMediaUrl(post.imageUrl || post.image_url || ""),
  createdAt: post.createdAt || post.created_at || new Date().toISOString(),
  likes: Number(post.likes || 0),
  comments: post.comments || [],
  sharedPost: (() => {
    const shared = post.sharedPost || post.shared_post || null;
    return shared ? { ...shared, imageUrl: normalizeStoredMediaUrl(shared.imageUrl || shared.image_url || "") } : null;
  })(),
});

const CommunityProfilePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewedUserId = searchParams.get("userId");
  const { toggleFollow, refreshCommunity } = useCommunity();

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [activeList, setActiveList] = useState(null);
  const [inputDialog, setInputDialog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const handleImageLoadError = (event) => {
    const image = event.currentTarget;
    image.style.display = "none";
    image.parentElement?.classList.add("media-load-error");
  };

  const avatarImageProps = (user, fallbackAlt = "Profile") =>
    getCommunityAvatarImageProps(user, user?.fullName || user?.name || fallbackAlt);

  const loadProfile = async () => {
    if (!getToken()) {
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");
      const query = viewedUserId ? `?userId=${viewedUserId}` : "";
      const response = await axios.get(`${API_BASE_URL}/community/profile${query}`, authHeaders());
      const payload = response?.data?.profile || response?.data?.data || {};
      const userProfile = normalizeUser(payload.profile || payload.user || {});
      setProfile(userProfile);
      setPosts((payload.posts || []).map(normalizePost));

      const [followersResponse, followingResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/community/followers${viewedUserId ? `?userId=${viewedUserId}` : ""}`, authHeaders()),
        axios.get(`${API_BASE_URL}/community/following${viewedUserId ? `?userId=${viewedUserId}` : ""}`, authHeaders()),
      ]);
      setFollowersList((followersResponse?.data?.users || followersResponse?.data?.data || []).map(normalizeUser));
      setFollowingList((followingResponse?.data?.users || followingResponse?.data?.data || []).map(normalizeUser));
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Could not load community profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewedUserId]);

  const handleToggleFollow = async () => {
    if (!profile || profile.isMine) return;
    try {
      await toggleFollow(profile.id, !profile.isFollowing);
      await refreshCommunity();
      await loadProfile();
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Could not update follow status.");
    }
  };

  const reportProfile = () => {
    if (!profile || profile.isMine) return;
    setInputDialog({
      title: "Report user",
      message: `Tell us what is wrong with ${profile.fullName || profile.name || "this user"}.`,
      label: "Reason",
      placeholder: "Harassment, abuse, spam...",
      confirmText: "Report",
      required: true,
      requiredMessage: "Please write a reason before sending the report.",
      onSubmit: async (reason) => {
        await axios.post(`${API_BASE_URL}/community/users/${profile.id}/report`, { reason }, authHeaders());
        setErrorMessage("");
      },
    });
  };

  const sortedPosts = useMemo(
    () => [...posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [posts]
  );

  if (loading) {
    return (
      <div className="community-page profile-page">
        <p className="community-error-message">Loading community profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="community-page profile-page">
        <p className="community-error-message">{errorMessage || "Profile not found."}</p>
      </div>
    );
  }

  const renderUserList = (title, users) => (
    <div className="community-overlay" onClick={() => setActiveList(null)} role="presentation">
      <div className="community-overlay-panel" onClick={(e) => e.stopPropagation()}>
        <div className="community-overlay-header">
          <h3>{title}</h3>
          <button type="button" className="icon-button" onClick={() => setActiveList(null)}>×</button>
        </div>
        <div className="chats-list">
          {users.length === 0 ? <p className="community-error-message">No users yet.</p> : null}
          {users.map((user) => (
            <button
              key={user.id}
              type="button"
              className="chat-item"
              onClick={() => {
                setActiveList(null);
                navigate(profile?.id === user.id ? "/communityProfile" : `/communityProfile?userId=${user.id}`);
              }}
            >
              <div className="chat-avatar-wrapper">
                <img {...avatarImageProps(user)} alt={user.fullName || user.name || "Profile"} className="chat-avatar" />
              </div>
              <div className="chat-body">
                <div className="chat-name-row"><span className="chat-name">{user.fullName || user.name}</span></div>
                <p className="chat-preview">{user.username || user.email}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="community-page profile-page">
      <header className="community-header">
        <Link to="/" className="community-logo-link" aria-label="Eatopia home">
          <img src={brandLogo} alt="Eatopia" className="community-logo" />
          <span className="community-brand-name">Eatopia</span>
        </Link>
        <div className="community-header-right">
          <Link to="/communityHomePage" className="text-link">Feed</Link>
          <Link to="/communityChat" className="text-link">Chats</Link>
        </div>
      </header>

      {errorMessage && <p className="community-error-message">{errorMessage}</p>}

      <main className="profile-layout">
        <section className="profile-hero-card">
          <div className="profile-cover" style={{ backgroundImage: `url(${DEFAULT_COVER})` }} />
          <div className="profile-main-row">
            <img {...avatarImageProps(profile)} alt={profile.fullName || profile.name || "Profile"} className="profile-main-avatar" />
            <div className="profile-main-info">
              <h1>{profile.fullName}</h1>
              <p>@{profile.username || profile.name}</p>
              <p>{profile.bio}</p>
              <p>📍 {profile.location}</p>
              <p>{profile.online ? "🟢 Active now" : `Last seen ${profile.lastSeen || "recently"}`}</p>
            </div>
            <div className="profile-actions">
              {!profile.isMine && (
                <button type="button" className="primary-button" onClick={handleToggleFollow}>
                  {profile.isFriend ? "Friends" : profile.isFollowing ? "Following" : profile.followsMe ? "Follow back" : "Follow"}
                </button>
              )}
              {!profile.isMine && (
                <button type="button" className="secondary-button" onClick={() => navigate("/communityChat", { state: { friendId: profile.id, friendUser: profile } })}>{profile.isFriend ? "Message" : "Message Request"}</button>
              )}
              {!profile.isMine && (
                <button type="button" className="secondary-button danger-profile-button" onClick={reportProfile}>Report</button>
              )}
            </div>
          </div>

          <div className="profile-stats-row">
            <button type="button" onClick={() => setActiveList("followers")}>
              <strong>{profile.followers}</strong><span>Followers</span>
            </button>
            <button type="button" onClick={() => setActiveList("following")}>
              <strong>{profile.following}</strong><span>Following</span>
            </button>
            <button type="button">
              <strong>{profile.postsCount || posts.length}</strong><span>Posts</span>
            </button>
          </div>
        </section>

        <section className="profile-posts-section">
          <h2>Posts</h2>
          {sortedPosts.length === 0 ? <p className="community-error-message">No posts yet.</p> : null}
          {sortedPosts.map((post) => (
            <article key={post.id} className="post-card">
              <div className="post-header">
                <img {...avatarImageProps(profile)} alt={profile.fullName || profile.name || "Profile"} className="avatar" />
                <div>
                  <div className="post-author-name">{profile.fullName}</div>
                  <div className="post-meta">{formatServerTimeAgo(post.createdAt)}</div>
                </div>
              </div>
              <p className="post-text">{post.text}</p>
              {post.imageUrl && <div className="post-image-full"><img src={resolveMediaUrl(post.imageUrl)} alt="Community post" onError={handleImageLoadError} /></div>}
              {post.sharedPost && <div className="feed-card" style={{ marginTop: 12, padding: 12 }}><strong>{post.sharedPost.author?.name || post.sharedPost.author?.fullName || "Shared post"}</strong>{post.sharedPost.text && <p className="post-text">{post.sharedPost.text}</p>}{post.sharedPost.imageUrl && <div className="post-image-full"><img src={resolveMediaUrl(post.sharedPost.imageUrl)} alt="Shared" onError={handleImageLoadError} /></div>}</div>}
              <div className="post-actions-row">
                <span>{post.likes} likes</span>
                <span>{post.comments.length} comments</span>
              </div>
            </article>
          ))}
        </section>
      </main>

      {activeList === "followers" && renderUserList("Followers", followersList)}
      {activeList === "following" && renderUserList("Following", followingList)}
      {inputDialog && <TextInputDialog {...inputDialog} onCancel={() => setInputDialog(null)} />}
    </div>
  );
};

export default CommunityProfilePage;
