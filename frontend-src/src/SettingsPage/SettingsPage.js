import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import { API_BASE_URL, resolveMediaUrl } from "../config/api";
import "./SettingsPage.css";

const defaultSettings = {
  notificationsEnabled: true,
  messageNotificationsEnabled: true,
  communityNotificationsEnabled: true,
  emailNotificationsEnabled: true,
  profileVisibility: "Public",
  postsVisibility: "Public",
  showOnlineStatus: true,
  showLastSeen: true,
  allowMessageRequests: true,
  allowSearchByEmail: true,
};

const visibilityOptions = [
  { value: "Public", label: "Everyone" },
  { value: "Friends", label: "Friends only" },
  { value: "Private", label: "Private" },
];

function ToggleRow({ title, description, checked, disabled, onChange }) {
  return (
    <div className={`settings-toggle-line ${disabled ? "is-disabled" : ""}`}>
      <div>
        <strong>{title}</strong>
        <span>{description}</span>
      </div>
      <button
        type="button"
        className={`settings-switch ${checked ? "on" : "off"}`}
        aria-pressed={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
      >
        <i />
        <b>{checked ? "On" : "Off"}</b>
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const token = localStorage.getItem("token");
  const authHeaders = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [settings, setSettings] = useState(defaultSettings);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadBlockedUsers = useCallback(async () => {
    if (!token) return;
    const res = await axios.get(`${API_BASE_URL}/community/blocked-users`, authHeaders);
    setBlockedUsers(res.data.users || res.data.data || []);
  }, [authHeaders, token]);

  const loadSettings = useCallback(async () => {
    if (!token) return;
    const res = await axios.get(`${API_BASE_URL}/profile/privacy-settings`, authHeaders);
    setSettings({ ...defaultSettings, ...(res.data.settings || res.data.data || {}) });
  }, [authHeaders, token]);

  useEffect(() => {
    let isMounted = true;
    Promise.all([loadSettings(), loadBlockedUsers()])
      .catch(() => isMounted && setNotice("Could not load settings. Make sure the backend is running and you are logged in."))
      .finally(() => isMounted && setLoading(false));
    return () => {
      isMounted = false;
    };
  }, [loadSettings, loadBlockedUsers]);

  const saveSettings = async (nextSettings) => {
    setSettings(nextSettings);
    setSaving(true);
    try {
      const res = await axios.put(`${API_BASE_URL}/profile/privacy-settings`, nextSettings, authHeaders);
      const saved = res.data.settings || res.data.data || nextSettings;
      setSettings({ ...defaultSettings, ...saved });
      setNotice(res.data.message || "Privacy settings updated.");
    } catch (error) {
      setNotice(error?.response?.data?.message || "Could not update privacy settings.");
    } finally {
      setSaving(false);
    }
  };

  const patchSetting = (key, value) => {
    saveSettings({ ...settings, [key]: value });
  };

  const unblock = async (userId) => {
    try {
      await axios.delete(`${API_BASE_URL}/community/users/${userId}/block`, authHeaders);
      setBlockedUsers((prev) => prev.filter((user) => user.id !== userId));
      setNotice("User unblocked.");
    } catch (error) {
      setNotice(error?.response?.data?.message || "Could not unblock this user.");
    }
  };

  return (
    <div className="settings-page">
      <Navbar />
      <main className="settings-shell">
        <section className="settings-hero">
          <div>
            <p className="settings-kicker">Eatopia settings</p>
            <h1>Privacy & Notification Controls</h1>
            <p>Control who can see you, who can message you, and which notifications you receive.</p>
          </div>
          <a className="settings-primary-link" href="/profile">Open profile settings</a>
        </section>

        {notice && <div className="settings-notice">{notice}</div>}
        {saving && <div className="settings-saving">Saving settings…</div>}

        <section className="settings-grid">
          <article className="settings-card settings-card-wide">
            <div className="settings-card-title-row">
              <div>
                <h2>Notification preferences</h2>
                <p>Turn notifications on or off instantly from here.</p>
              </div>
              <span className={`settings-status-pill ${settings.notificationsEnabled ? "active" : "muted"}`}>
                {settings.notificationsEnabled ? "Notifications active" : "Notifications off"}
              </span>
            </div>

            <ToggleRow
              title="All notifications"
              description="Master switch for every in-app notification."
              checked={settings.notificationsEnabled}
              onChange={(value) => patchSetting("notificationsEnabled", value)}
            />
            <ToggleRow
              title="Community notifications"
              description="Follow, follow back, likes, comments, reports and community activity."
              checked={settings.communityNotificationsEnabled}
              disabled={!settings.notificationsEnabled}
              onChange={(value) => patchSetting("communityNotificationsEnabled", value)}
            />
            <ToggleRow
              title="Message notifications"
              description="New messages, message requests and accepted requests."
              checked={settings.messageNotificationsEnabled}
              disabled={!settings.notificationsEnabled}
              onChange={(value) => patchSetting("messageNotificationsEnabled", value)}
            />
            <ToggleRow
              title="Email notifications"
              description="Allow reminder and system notifications to be sent by email."
              checked={settings.emailNotificationsEnabled}
              disabled={!settings.notificationsEnabled}
              onChange={(value) => patchSetting("emailNotificationsEnabled", value)}
            />
          </article>

          <article className="settings-card">
            <h2>Privacy visibility</h2>
            <label className="settings-select-row">
              <span>Profile visibility</span>
              <select value={settings.profileVisibility} onChange={(e) => patchSetting("profileVisibility", e.target.value)}>
                {visibilityOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="settings-select-row">
              <span>Posts visibility</span>
              <select value={settings.postsVisibility} onChange={(e) => patchSetting("postsVisibility", e.target.value)}>
                {visibilityOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
          </article>

          <article className="settings-card">
            <h2>Presence & messaging</h2>
            <ToggleRow
              title="Show online status"
              description="Let others see Active now when you are using Eatopia."
              checked={settings.showOnlineStatus}
              onChange={(value) => patchSetting("showOnlineStatus", value)}
            />
            <ToggleRow
              title="Show last seen"
              description="Let others see the last time you were active."
              checked={settings.showLastSeen}
              onChange={(value) => patchSetting("showLastSeen", value)}
            />
            <ToggleRow
              title="Allow message requests"
              description="Allow non-friends to send you a message request."
              checked={settings.allowMessageRequests}
              onChange={(value) => patchSetting("allowMessageRequests", value)}
            />
            <ToggleRow
              title="Search by email"
              description="Allow people to find you by your email address."
              checked={settings.allowSearchByEmail}
              onChange={(value) => patchSetting("allowSearchByEmail", value)}
            />
          </article>

          <article className="settings-card settings-card-wide">
            <h2>Blocked users</h2>
            <p className="settings-muted">Blocked users cannot message you, find you in people search, or view your community profile.</p>
            {loading ? (
              <p className="settings-muted">Loading settings…</p>
            ) : !blockedUsers.length ? (
              <p className="settings-muted">No blocked users.</p>
            ) : (
              <div className="blocked-list">
                {blockedUsers.map((user) => (
                  <div className="blocked-row" key={user.id}>
                    <img src={resolveMediaUrl(user.avatar || user.profileImage, "https://i.pravatar.cc/150?u=eatopia")} alt={user.name || user.fullName} />
                    <div>
                      <strong>{user.fullName || user.name}</strong>
                      <span>{user.username || user.email}</span>
                    </div>
                    <button type="button" onClick={() => unblock(user.id)}>Unblock</button>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>
      </main>
    </div>
  );
}
