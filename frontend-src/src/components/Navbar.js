import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FiHome,
  FiBookOpen,
  FiBell,
  FiActivity,
  FiUsers,
  FiLogIn,
  FiShield,
} from "react-icons/fi";
import "./NavbarFooter.css";
import { API_BASE_URL } from "../config/api";
import { syncStoredUserFromBackend } from "../services/authHelpers";
import { playNotificationSound, unlockNotificationSound } from "../services/notificationSound";
import { isAdminRole } from "../services/roleAccess";
import {
  getCommunityAvatarSrc,
  getCommunityDefaultAvatar,
  getNotificationTargetPath,
  normalizeCommunityNotification,
} from "../CommunityPages/communityUtils";
import brandLogo from "../assets/healthyfood-logo.png";

export default function Navbar() {
  const [isnavsidebarOpen, setIsnavsidebarOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const lastUnreadCountRef = useRef(null);
  const audioUnlockedRef = useRef(false);

  const location = useLocation();
  const navigate = useNavigate();
  const { pathname } = location;

  const isElevatedUser = isAdminRole(loggedInUser?.role);
  const navLinks = [
    { to: "/", icon: FiHome, label: "Home" },
    { to: "/recipes", icon: FiBookOpen, label: "Recipes" },
    { to: "/reminder", icon: FiBell, label: "Reminders" },
    { to: "/dietplan", icon: FiActivity, label: "Diet Plan" },
    { to: "/community", icon: FiUsers, label: "Community" },
    ...(isElevatedUser ? [{ to: "/admin", icon: FiShield, label: "Admin Dashboard" }] : []),
  ];

  const getToken = () => localStorage.getItem("token");

  const fetchNotifications = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setNotifications([]);
      setUnreadCount(0);
      lastUnreadCountRef.current = null;
      return;
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const nextNotifications = response?.data?.notifications || response?.data?.data || [];
      const nextUnreadCount = response?.data?.unreadCount ?? response?.data?.unread_count ?? 0;

      setNotifications(nextNotifications);
      setUnreadCount(nextUnreadCount);

      if (
        audioUnlockedRef.current &&
        lastUnreadCountRef.current !== null &&
        nextUnreadCount > lastUnreadCountRef.current
      ) {
        playNotificationSound();
      }

      lastUnreadCountRef.current = nextUnreadCount;
    } catch {
      // Do not block navigation if notification API is unavailable.
    }
  }, []);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const unlockAudio = () => {
      audioUnlockedRef.current = true;
      unlockNotificationSound().catch(() => {});
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };

    window.addEventListener("click", unlockAudio);
    window.addEventListener("keydown", unlockAudio);

    return () => {
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  useEffect(() => {
    setIsnavsidebarOpen(false);
    setShowNotifications(false);
  }, [pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 992 && isnavsidebarOpen) {
        setIsnavsidebarOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isnavsidebarOpen]);

  useEffect(() => {
    const syncAuthState = () => {
      const token = getToken();
      const savedUser = localStorage.getItem("eatopiaUser");

      if (token && savedUser) {
        try {
          setLoggedInUser(JSON.parse(savedUser));
        } catch {
          setLoggedInUser(null);
        }
      } else {
        setLoggedInUser(null);
      }

      if (token) {
        syncStoredUserFromBackend({ refreshTokenWhenRoleChanged: true })
          .then((freshUser) => {
            if (freshUser) setLoggedInUser(freshUser);
          })
          .catch(() => {
            // Keep the locally stored session if the profile sync is temporarily unavailable.
          });
      }
    };

    syncAuthState();
    window.addEventListener("storage", syncAuthState);
    window.addEventListener("eatopia-auth-changed", syncAuthState);
    return () => {
      window.removeEventListener("storage", syncAuthState);
      window.removeEventListener("eatopia-auth-changed", syncAuthState);
    };
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications, loggedInUser]);

  const togglenavsidebar = () => setIsnavsidebarOpen((prev) => !prev);
  const closenavsidebar = () => setIsnavsidebarOpen(false);

  const isActive = (route) => {
    if (route === "/") return pathname === "/";
    return pathname === route || pathname.startsWith(`${route}/`);
  };

  const getProfileAvatarSrc = () => getCommunityAvatarSrc(loggedInUser || {});
  const handleProfileImageError = (event) => {
    event.currentTarget.src = getCommunityDefaultAvatar(loggedInUser?.gender || loggedInUser?.Gender);
  };

  const toggleNotifications = async () => {
    setShowNotifications((prev) => !prev);
    await fetchNotifications();
  };

  const markAllRead = async () => {
    const token = getToken();
    if (!token) return;

    try {
      await axios.put(`${API_BASE_URL}/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUnreadCount(0);
      lastUnreadCountRef.current = 0;
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, is_read: true })));
    } catch {
      // ignore
    }
  };

  const markOneRead = async (notificationId) => {
    const token = getToken();
    if (!token || !notificationId) return;

    try {
      await axios.put(`${API_BASE_URL}/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, isRead: true, is_read: true } : n)));
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch {
      // ignore
    }
  };

  const openNotification = async (rawItem) => {
    const item = normalizeCommunityNotification(rawItem);
    await markOneRead(item.id);
    setShowNotifications(false);

    const targetPath = getNotificationTargetPath(item);
    if (targetPath) navigate(targetPath);
  };

  const DesktopNavItem = ({ to, label }) => (
    <Link to={to} className={`desktop-nav-link ${isActive(to) ? "active" : ""}`}>
      {label}
    </Link>
  );

  const SidebarNavItem = ({ to, icon: Icon, label }) => (
    <Link to={to} className={`navsidebar-link ${isActive(to) ? "active" : ""}`} onClick={closenavsidebar}>
      <span className="navsidebar-link-icon"><Icon /></span>
      <span className="navsidebar-link-label">{label}</span>
    </Link>
  );

  return (
    <>
      <header className={`main-navbar ${isScrolled ? "scrolled" : ""}`}>
        <div className="nav-inner">
          <Link to="/" className="brand" aria-label="Eatopia home">
            <img src={brandLogo} alt="Eatopia" className="brand-logo" />
            <span className="brand-name">Eatopia</span>
          </Link>

          <nav className="desktop-nav">
            {navLinks.map((item) => <DesktopNavItem key={item.to} to={item.to} label={item.label} />)}
          </nav>

          <div className="nav-right">
            {loggedInUser && (
              <div className="nav-notification-wrap">
                <button type="button" className="nav-notification-btn" onClick={toggleNotifications} aria-label="Notifications">
                  <FiBell />
                  {unreadCount > 0 && <span className="nav-notification-badge">{unreadCount}</span>}
                </button>

                {showNotifications && (
                  <div className="nav-notification-popup">
                    <div className="nav-notification-head">
                      <strong>Notifications</strong>
                      <button type="button" onClick={markAllRead}>Mark all read</button>
                    </div>

                    {notifications.length === 0 ? (
                      <p className="nav-notification-empty">No notifications yet.</p>
                    ) : (
                      notifications.slice(0, 8).map((rawItem) => {
                        const item = normalizeCommunityNotification(rawItem);
                        const actor = item.actor;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            className={`nav-notification-item ${item.isRead ? "read" : "unread"}`}
                            onClick={() => openNotification(rawItem)}
                          >
                            <span className="nav-notification-avatar">
                              {actor?.avatar ? <img src={actor.avatar} alt={actor.fullName || actor.name} /> : (actor?.fullName || actor?.name || item.title || "N").charAt(0).toUpperCase()}
                            </span>
                            <span className="nav-notification-copy">
                              <strong>{actor?.fullName || item.title}</strong>
                              <em>{item.title}</em>
                              <p>{item.message}</p>
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {loggedInUser ? (
              (
                <Link to="/profile" className={`nav-profile-link ${isActive("/profile") ? "active-profile" : ""}`} aria-label="Profile">
                  <img
                    src={getProfileAvatarSrc()}
                    alt={loggedInUser.fullName || loggedInUser.username || "Profile"}
                    className="nav-profile-image"
                    onError={handleProfileImageError}
                  />
                </Link>
              )
            ) : (
              <Link to="/login" className={`btn-login ${isActive("/login") ? "active-login" : ""}`}>
                <FiLogIn className="btn-login-icon" />
                <span>Log In</span>
              </Link>
            )}

            <button type="button" className={`burger ${isnavsidebarOpen ? "open" : ""}`} onClick={togglenavsidebar} aria-label={isnavsidebarOpen ? "Close menu" : "Open menu"} aria-expanded={isnavsidebarOpen}>
              <span className="burger-line" />
              <span className="burger-line" />
              <span className="burger-line" />
            </button>
          </div>
        </div>
      </header>

      <div className={`navsidebar-overlay ${isnavsidebarOpen ? "visible" : ""}`} onClick={closenavsidebar} />

      <aside className={`navsidebar ${isnavsidebarOpen ? "open" : ""}`}>
        <div className="navsidebar-header">
          <button type="button" className={`burger burger-inside ${isnavsidebarOpen ? "open" : ""}`} onClick={togglenavsidebar} aria-label="Close menu" aria-expanded={isnavsidebarOpen}>
            <span className="burger-line" />
            <span className="burger-line" />
            <span className="burger-line" />
          </button>
          <span className="navsidebar-title">MENU</span>
        </div>

        <nav className="navsidebar-nav">
          <div className="navsidebar-section">
            {navLinks.map((item) => <SidebarNavItem key={item.to} to={item.to} icon={item.icon} label={item.label} />)}
          </div>
        </nav>

        <div className="navsidebar-footer">
          {loggedInUser ? (
            <div className="navsidebar-account-actions">
              <Link to="/profile" className="navsidebar-profile-btn" onClick={closenavsidebar}>
                <img
                  src={getProfileAvatarSrc()}
                  alt={loggedInUser.fullName || loggedInUser.username || "Profile"}
                  className="navsidebar-profile-image"
                  onError={handleProfileImageError}
                />
                <span>{loggedInUser.fullName || loggedInUser.username || "Profile"}</span>
              </Link>
            </div>
          ) : (
            <Link to="/login" className="navsidebar-login-btn" onClick={closenavsidebar}>
              <FiLogIn className="navsidebar-login-icon" />
              <span>Log In</span>
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
