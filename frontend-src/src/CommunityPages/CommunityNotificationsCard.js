import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { FiBell } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL, formatServerDateTime } from "../config/api";
import {
  getCommunityAvatarImageProps,
  getNotificationTargetPath,
  isCommunityNotification,
  normalizeCommunityNotification,
} from "./communityUtils";
import { playNotificationSound } from "../services/notificationSound";

const POLL_INTERVAL_MS = 15000;

const getToken = () => localStorage.getItem("token");
const authHeaders = () => ({ headers: { Authorization: `Bearer ${getToken()}` } });
const notificationAvatarProps = (item = {}) =>
  getCommunityAvatarImageProps(item.actor || { avatar: item.actorAvatar }, item.actorName || item.title || "Notification");

export default function CommunityNotificationsCard() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const lastUnreadCountRef = useRef(null);

  const loadNotifications = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setNotifications([]);
      lastUnreadCountRef.current = null;
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/notifications`, authHeaders());
      const items = response?.data?.notifications || response?.data?.data || [];
      const communityItems = items
        .map(normalizeCommunityNotification)
        .filter(isCommunityNotification)
        .slice(0, 8);
      const nextUnreadCount = communityItems.filter((item) => !item.isRead).length;

      setNotifications(communityItems);
      if (
        lastUnreadCountRef.current !== null &&
        nextUnreadCount > lastUnreadCountRef.current
      ) {
        playNotificationSound();
      }
      lastUnreadCountRef.current = nextUnreadCount;
      setError("");
    } catch {
      setError("Could not load community notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const intervalId = window.setInterval(loadNotifications, POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [loadNotifications]);

  const unreadNotifications = useMemo(
    () => notifications.filter((item) => !item.isRead),
    [notifications]
  );

  const openNotification = async (item) => {
    if (!item?.id) return;

    try {
      await axios.put(
        `${API_BASE_URL}/notifications/${item.id}/read`,
        {},
        authHeaders()
      );
      setNotifications((prev) =>
        prev.map((prevItem) =>
          prevItem.id === item.id ? { ...prevItem, isRead: true } : prevItem
        )
      );
      const targetPath = getNotificationTargetPath(item);
      if (targetPath) navigate(targetPath);
    } catch {
      setError("Could not update notification state.");
    }
  };

  const markAllRead = async () => {
    if (!unreadNotifications.length) return;

    setMarkingAllRead(true);
    try {
      await Promise.all(
        unreadNotifications.map((item) =>
          axios.put(`${API_BASE_URL}/notifications/${item.id}/read`, {}, authHeaders())
        )
      );
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      setError("");
    } catch {
      setError("Could not mark community notifications as read.");
    } finally {
      setMarkingAllRead(false);
    }
  };

  return (
    <div className="sidebar-card community-notifications-card">
      <div className="community-notifications-head">
        <div className="community-notifications-title-wrap">
          <span className="community-notifications-icon" aria-hidden="true">
            <FiBell />
          </span>
          <div>
            <h2 className="community-notifications-title">Community notifications</h2>
            <p className="community-notifications-subtitle">
              Likes, comments, follows, and friend activity.
            </p>
          </div>
        </div>
        {unreadNotifications.length > 0 ? (
          <span className="community-notifications-badge">
            {unreadNotifications.length}
          </span>
        ) : null}
      </div>

      <div className="community-notifications-toolbar">
        <button
          type="button"
          className="text-link"
          onClick={markAllRead}
          disabled={!unreadNotifications.length || markingAllRead}
        >
          {markingAllRead ? "Marking..." : "Mark all read"}
        </button>
      </div>

      {error ? <p className="community-notifications-state">{error}</p> : null}
      {loading ? <p className="community-notifications-state">Loading notifications...</p> : null}

      {!loading && !error && notifications.length === 0 ? (
        <p className="community-notifications-state">
          No community notifications yet.
        </p>
      ) : null}

      {!loading && notifications.length > 0 ? (
        <div className="community-notifications-list">
          {notifications.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`community-notification-item ${
                item.isRead ? "read" : "unread"
              }`}
              onClick={() => openNotification(item)}
            >
              <div className="community-notification-main">
                <span className="community-notification-avatar">
                  <img {...notificationAvatarProps(item)} alt={item.actorName || item.title || "Notification"} />
                </span>
                <div>
                  <div className="community-notification-item-top">
                    <strong>{item.actorName || item.title}</strong>
                    <span>{formatServerDateTime(item.createdAt)}</span>
                  </div>
                  <em>{item.title}</em>
                  <p>{item.message}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
