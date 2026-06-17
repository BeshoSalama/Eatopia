import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";
import "./ProfilePage.css";
import { API_BASE_URL, uploadFile, normalizeStoredMediaUrl } from "../config/api";
import { getCommunityAvatarSrc, getCommunityDefaultAvatar } from "../CommunityPages/communityUtils";

const DEFAULT_AVATAR = getCommunityDefaultAvatar();
const LEGACY_DEFAULT_AVATAR_PATTERN = /^(user|avatar|default-avatar)\.(png|jpe?g|svg)$/i;
const DEFAULT_AVATAR_VALUES = new Set([
  getCommunityDefaultAvatar("neutral"),
  getCommunityDefaultAvatar("male"),
  getCommunityDefaultAvatar("female"),
]);

const isDefaultAvatarValue = (value) => {
  const rawValue = String(value || "").trim();

  return (
    !rawValue ||
    DEFAULT_AVATAR_VALUES.has(rawValue) ||
    LEGACY_DEFAULT_AVATAR_PATTERN.test(rawValue)
  );
};

const normalizeProfileImage = (value) => {
  const normalized = normalizeStoredMediaUrl(value);

  return isDefaultAvatarValue(normalized) ? "" : normalized;
};

const getProfileAvatarFallback = (user = {}) =>
  getCommunityDefaultAvatar(user.gender || user.Gender);

const getProfileAvatarSrc = (avatar, user = {}) => {
  if (isDefaultAvatarValue(avatar)) {
    return getProfileAvatarFallback(user);
  }

  return getCommunityAvatarSrc({
    ...user,
    avatar,
    profileImage: avatar,
  });
};

const emptyProfile = {
  id: "",
  fullName: "",
  username: "",
  email: "",
  phone: "",
  height: "",
  weight: "",
  age: "",
  birthDate: "",
  gender: "",
  goal: "",
  activityLevel: "",
  location: "",
  profileImage: "",
};

const formatDateForInput = (value) => {
  if (!value) return "";

  const dateText = String(value);

  if (dateText.includes("T")) {
    return dateText.split("T")[0];
  }

  return dateText.slice(0, 10);
};

const toNullableNumber = (value) => {
  if (value === "" || value === null || value === undefined) return null;

  const numberValue = Number(value);

  return Number.isNaN(numberValue) ? null : numberValue;
};

const normalizeUser = (user = {}) => ({
  id: user.id || user.Id || user.userId || user.UserId || "",
  fullName: user.fullName || user.name || user.FullName || user.Name || "",
  username: user.username || user.Username || "",
  email: user.email || user.Email || "",
  phone: user.phone || user.Phone || "",
  height: user.height ?? user.heightCm ?? user.HeightCm ?? user.Height ?? "",
  weight: user.weight ?? user.weightKg ?? user.WeightKg ?? user.Weight ?? "",
  age: user.age ?? user.Age ?? "",
  birthDate: formatDateForInput(user.birthDate || user.BirthDate),
  gender: user.gender || user.Gender || "",
  goal: user.goal || user.Goal || "",
  activityLevel: user.activityLevel || user.ActivityLevel || "",
  location: user.location || user.Location || "",
  profileImage: normalizeProfileImage(user.profileImage || user.avatar || user.profileImageUrl || user.ProfileImage || user.Avatar || user.ProfileImageUrl || ""),
});

const ProfilePage = () => {
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState("profile");
  const [editMode, setEditMode] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState(DEFAULT_AVATAR);
  const [showAvatarPreview, setShowAvatarPreview] = useState(false);

  const [notificationCount, setNotificationCount] = useState(3);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  const [profileData, setProfileData] = useState(emptyProfile);
  const [originalData, setOriginalData] = useState({
    ...emptyProfile,
    profileImage: DEFAULT_AVATAR,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const avatarInputRef = useRef(null);

  const token = localStorage.getItem("token");

  const authHeaders = useMemo(() => ({
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }), [token]);

  const showToast = (message = "Saved!") => {
    const toast = document.getElementById("toast");
    const toastText = document.getElementById("toastText");

    if (!toast) return;

    if (toastText) toastText.textContent = message;

    toast.classList.add("show");

    setTimeout(() => {
      toast.classList.remove("show");
    }, 2200);
  };

  const clearAuthAndGoLogin = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("eatopiaUser");
    window.dispatchEvent(new Event("eatopia-auth-changed"));
    navigate("/login");
  }, [navigate]);

  const logout = useCallback(() => {
    clearAuthAndGoLogin();
  }, [clearAuthAndGoLogin]);

  const loadLocalUser = () => {
    const savedUser = localStorage.getItem("eatopiaUser");

    if (!savedUser) return null;

    try {
      return normalizeUser(JSON.parse(savedUser));
    } catch {
      return null;
    }
  };

  const setUserToState = (user) => {
    const normalized = normalizeUser(user);

    setProfileData(normalized);
    setAvatarSrc(normalized.profileImage || DEFAULT_AVATAR);
    setOriginalData({
      ...normalized,
      profileImage: normalized.profileImage || DEFAULT_AVATAR,
    });
  };

  const fetchProfile = useCallback(async () => {
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setLoadingProfile(true);

      const localUser = loadLocalUser();
      if (localUser) {
        setUserToState(localUser);
      }

      /*
        Backend expected endpoint:
        GET /profile
        Headers: Authorization: Bearer token

        Expected response examples:
        { success: true, user: {...} }
        or
        { user: {...} }
      */
      const response = await axios.get(`${API_BASE_URL}/profile`, authHeaders);

      const backendUser = response?.data?.user || response?.data;

      if (backendUser) {
        const normalized = normalizeUser(backendUser);
        localStorage.setItem("eatopiaUser", JSON.stringify(normalized));
        window.dispatchEvent(new Event("eatopia-auth-changed"));
        setUserToState(normalized);
      }
    } catch (error) {
      if (error?.response?.status === 401) {
        logout();
        return;
      }

      const localUser = loadLocalUser();

      if (!localUser) {
        showToast("Could not load profile.");
      }
    } finally {
      setLoadingProfile(false);
    }
  }, [token, navigate, logout, authHeaders]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleNavClick = (section, e) => {
    if (e) e.preventDefault();
    setActiveSection(section);
    setEditMode(false);
  };

  const toggleEditMode = () => {
    if (!editMode) {
      setOriginalData({
        ...profileData,
        profileImage: avatarSrc,
      });
    }

    setEditMode((prev) => !prev);
  };

  const cancelEdit = () => {
    const { profileImage, ...restData } = originalData;

    setProfileData(restData);
    setAvatarSrc(profileImage || DEFAULT_AVATAR);
    setEditMode(false);
  };

  const saveChanges = async () => {
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setSavingProfile(true);

      const payload = {
        fullName: profileData.fullName?.trim() || "",
        username: profileData.username?.trim() || "",
        email: profileData.email?.trim() || "",
        phone: profileData.phone?.trim() || "",
        height: toNullableNumber(profileData.height),
        weight: toNullableNumber(profileData.weight),
        age: toNullableNumber(profileData.age),
        birthDate: profileData.birthDate || null,
        goal: profileData.goal || "",
        activityLevel: profileData.activityLevel || "",
        gender: profileData.gender || "",
        location: profileData.location || "",
        profileImage: normalizeProfileImage(avatarSrc),
      };

      /*
        Backend expected endpoint:
        PUT /profile
        Headers: Authorization: Bearer token
        Body: user profile data

        Expected response:
        { success: true, user: {...}, message: "Profile updated successfully" }
      */
      const response = await axios.put(
        `${API_BASE_URL}/profile`,
        payload,
        authHeaders
      );

      const updatedUser = normalizeUser(response?.data?.user || payload);

      localStorage.setItem("eatopiaUser", JSON.stringify(updatedUser));
      window.dispatchEvent(new Event("eatopia-auth-changed"));

      setProfileData(updatedUser);
      setAvatarSrc(updatedUser.profileImage || DEFAULT_AVATAR);
      setOriginalData({
        ...updatedUser,
        profileImage: updatedUser.profileImage || DEFAULT_AVATAR,
      });

      showToast(response?.data?.message || "Profile updated!");
      setEditMode(false);
    } catch (error) {
      if (error?.response?.status === 401) {
        logout();
        return;
      }

      showToast(
        error?.response?.data?.message ||
          "Could not update profile. Check backend connection."
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarClick = () => {
    if (editMode) {
      avatarInputRef.current?.click();
    } else {
      setShowAvatarPreview(true);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const uploadedUrl = await uploadFile(file, token, "profile");
      setAvatarSrc(uploadedUrl || DEFAULT_AVATAR);
      showToast("Profile photo uploaded. Save changes to keep it.");
    } catch (error) {
      showToast(error?.message || "Could not upload profile photo.");
    } finally {
      e.target.value = "";
    }
  };

  const handleAvatarImageError = (event) => {
    event.currentTarget.src = getProfileAvatarFallback(profileData);
  };

  const handleInputChange = (key, value) => {
    setProfileData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleUpdatePassword = async () => {
    if (!passwordData.currentPassword) {
      showToast("Current password is required.");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      showToast("New password must be at least 8 characters.");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast("Passwords do not match.");
      return;
    }

    try {
      setUpdatingPassword(true);

      /*
        Backend expected endpoint:
        PUT /change-password
        Headers: Authorization: Bearer token
        Body:
        {
          currentPassword,
          newPassword,
          confirmPassword
        }
      */
      const response = await axios.put(
        `${API_BASE_URL}/change-password`,
        passwordData,
        authHeaders
      );

      showToast(response?.data?.message || "Password updated!");

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setActiveSection("profile");
    } catch (error) {
      if (error?.response?.status === 401) {
        logout();
        return;
      }

      showToast(
        error?.response?.data?.message ||
          "Could not update password. Check backend connection."
      );
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleLogoutAllDevices = async () => {
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setLoggingOutAll(true);
      await axios.post(`${API_BASE_URL}/logout-all-devices`, {}, authHeaders);
      showToast("All sessions have been logged out.");
      clearAuthAndGoLogin();
    } catch (error) {
      showToast(error?.response?.data?.message || "Could not logout all devices.");
    } finally {
      setLoggingOutAll(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!token) {
      navigate("/login");
      return;
    }

    if (deleteConfirmationText.trim() !== "DELETE MY ACCOUNT") {
      showToast('Type "DELETE MY ACCOUNT" to confirm.');
      return;
    }

    try {
      setDeletingAccount(true);
      await axios.delete(`${API_BASE_URL}/account`, {
        ...authHeaders,
        data: {
          password: deletePassword,
          confirmationText: deleteConfirmationText.trim(),
        },
      });
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("eatopiaUser");
      window.dispatchEvent(new Event("eatopia-auth-changed"));
      showToast("Account deleted permanently.");
      setTimeout(() => navigate("/signup"), 900);
    } catch (error) {
      if (error?.response?.status === 401) {
        logout();
        return;
      }

      showToast(
        error?.response?.data?.message ||
          "Could not delete account. Check backend connection."
      );
    } finally {
      setDeletingAccount(false);
      setShowDeleteConfirm(false);
      setDeletePassword("");
      setDeleteConfirmationText("");
    }
  };

  const toggleNotifications = () => {
    setShowNotifications((prev) => !prev);

    if (!showNotifications && notificationCount > 0) {
      setTimeout(() => setNotificationCount(0), 50);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        !e.target.closest("#notificationBell") &&
        !e.target.closest("#notifPopup")
      ) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("click", handleClickOutside);

    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setMobileDrawerOpen(false);
        setShowAvatarPreview(false);
        setShowDeleteConfirm(false);
      }
    };

    document.addEventListener("keydown", handleEsc);

    return () => document.removeEventListener("keydown", handleEsc);
  }, []);

  const toggleMobileDrawer = () => {
    setMobileDrawerOpen((prev) => !prev);
  };

  const goalOptions = [
    { value: "lose_weight", label: "Weight loss" },
    { value: "maintain", label: "Maintain weight" },
    { value: "gain_muscle", label: "Muscle gain" },
  ];

  const activityOptions = [
    { value: "sedentary", label: "Sedentary" },
    { value: "light", label: "Light" },
    { value: "moderate", label: "Moderate" },
    { value: "active", label: "Active" },
  ];

  const getOptionLabel = (options, value) =>
    options.find((option) => option.value === value)?.label || "Not added yet";

  const profileFields = [
    { key: "fullName", label: "Full Name", type: "text" },
    { key: "username", label: "Username", type: "text" },
    { key: "email", label: "Email", type: "email" },
    { key: "phone", label: "Phone", type: "text" },
    { key: "height", label: "Height", type: "number" },
    { key: "weight", label: "Weight", type: "number" },
    { key: "age", label: "Age", type: "number" },
    { key: "birthDate", label: "Birth Date", type: "date" },
  ];

  const avatarDisplaySrc = getProfileAvatarSrc(avatarSrc, profileData);

  if (loadingProfile) {
    return (
      <div className="profile-wrapper">
        <Navbar />
        <div className="main-container">
          <section className="profile-content">
            <div className="main-profile">
              <div className="card">
                <h3>Loading profile...</h3>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-wrapper">
      <Navbar
        avatarSrc={avatarSrc}
        avatarInputRef={avatarInputRef}
        notificationCount={notificationCount}
        toggleNotifications={toggleNotifications}
        showNotifications={showNotifications}
        toggleMobileDrawer={toggleMobileDrawer}
      />

      <div className="main-container">
        <div
          className="mobile-drawer-backdrop"
          style={{ display: mobileDrawerOpen ? "block" : "none" }}
          onClick={toggleMobileDrawer}
        ></div>

        <section className="profile-content">
          <aside className="side-bar profile-action-sidebar">
            <button
              type="button"
              className={
                activeSection === "profile"
                  ? "side-bar-item profile-sidebar-btn profile-sidebar-btn--profile active"
                  : "side-bar-item profile-sidebar-btn profile-sidebar-btn--profile"
              }
              onClick={(e) => handleNavClick("profile", e)}
            >
              <i className="fa-solid fa-user"></i>
              <span>Profile</span>
            </button>

            <button
              type="button"
              className={
                activeSection === "change-password"
                  ? "side-bar-item profile-sidebar-btn profile-sidebar-btn--password active"
                  : "side-bar-item profile-sidebar-btn profile-sidebar-btn--password"
              }
              onClick={(e) => handleNavClick("change-password", e)}
            >
              <i className="fa-solid fa-key"></i>
              <span>Change Password</span>
            </button>

            <button
              type="button"
              className="side-bar-item profile-sidebar-btn profile-sidebar-btn--settings"
              onClick={() => navigate("/settings")}
            >
              <i className="fa-solid fa-shield-halved"></i>
              <span>Privacy Settings</span>
            </button>

            <button
              type="button"
              className={
                activeSection === "logout"
                  ? "side-bar-item profile-sidebar-btn profile-sidebar-btn--logout active"
                  : "side-bar-item profile-sidebar-btn profile-sidebar-btn--logout"
              }
              onClick={(e) => handleNavClick("logout", e)}
            >
              <i className="fa-solid fa-right-from-bracket"></i>
              <span>Logout</span>
            </button>

            <button
              type="button"
              className={
                activeSection === "delete-account"
                  ? "side-bar-item profile-sidebar-btn profile-sidebar-btn--danger active"
                  : "side-bar-item profile-sidebar-btn profile-sidebar-btn--danger"
              }
              onClick={(e) => handleNavClick("delete-account", e)}
            >
              <i className="fa-solid fa-user-xmark"></i>
              <span>Delete Account</span>
            </button>
          </aside>

          <div className="main-profile">
            {activeSection === "profile" && (
              <div className="card">
                <div className="personal-top">
                  <div
                    className={`profile-photo-large ${
                      editMode ? "editable-avatar" : "preview-avatar"
                    }`}
                    onClick={handleAvatarClick}
                    title={editMode ? "Change photo" : "View photo"}
                  >
                    <img
                      id="profileBigPreview"
                      src={avatarDisplaySrc}
                      alt="Profile"
                      onError={handleAvatarImageError}
                    />

                    {editMode && (
                      <div className="avatar-edit-overlay">
                        <i className="fa-solid fa-camera"></i>
                        <span>Change</span>
                      </div>
                    )}
                  </div>

                  <div className="personal-info">
                    <div className="header">
                      <div>
                        <h3>Personal info</h3>
                        <p className="section-subtitle">
                          Manage your personal details and health information.
                        </p>
                      </div>

                      <button
                        type="button"
                        className="edit-toggle"
                        onClick={toggleEditMode}
                      >
                        <i
                          className={`fa-solid ${
                            editMode ? "fa-eye" : "fa-pen-to-square"
                          }`}
                        ></i>
                      </button>
                    </div>

                    <div className="info-grid">
                      {profileFields.map((field) => (
                        <div className="info-item" key={field.key}>
                          <label>{field.label}</label>

                          <span
                            className="value"
                            style={{ display: editMode ? "none" : "block" }}
                          >
                            {profileData[field.key] || "Not added yet"}
                          </span>

                          <input
                            type={field.type}
                            style={{ display: editMode ? "block" : "none" }}
                            value={profileData[field.key] || ""}
                            onChange={(e) =>
                              handleInputChange(field.key, e.target.value)
                            }
                          />
                        </div>
                      ))}

                      <div className="info-item">
                        <label>Goal</label>

                        <span
                          className="value"
                          style={{ display: editMode ? "none" : "block" }}
                        >
                          {getOptionLabel(goalOptions, profileData.goal)}
                        </span>

                        <select
                          style={{ display: editMode ? "block" : "none" }}
                          value={profileData.goal || ""}
                          onChange={(e) => handleInputChange("goal", e.target.value)}
                        >
                          <option value="">Select goal</option>
                          {goalOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="info-item">
                        <label>Activity Level</label>

                        <span
                          className="value"
                          style={{ display: editMode ? "none" : "block" }}
                        >
                          {getOptionLabel(activityOptions, profileData.activityLevel)}
                        </span>

                        <select
                          style={{ display: editMode ? "block" : "none" }}
                          value={profileData.activityLevel || ""}
                          onChange={(e) => handleInputChange("activityLevel", e.target.value)}
                        >
                          <option value="">Select activity</option>
                          {activityOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="profile-field-block">
                      <label className="profile-main-label">Gender</label>

                      <div className="gender-row">
                        <label className="gender-option">
                          <input
                            type="radio"
                            name="gender"
                            value="male"
                            checked={profileData.gender === "male"}
                            disabled={!editMode}
                            onChange={(e) =>
                              handleInputChange("gender", e.target.value)
                            }
                          />

                          <div className="gender-icon">
                            <i className="fa-solid fa-mars"></i>
                          </div>

                          <span className="gender-text">Male</span>
                        </label>

                        <label className="gender-option">
                          <input
                            type="radio"
                            name="gender"
                            value="female"
                            checked={profileData.gender === "female"}
                            disabled={!editMode}
                            onChange={(e) =>
                              handleInputChange("gender", e.target.value)
                            }
                          />

                          <div className="gender-icon">
                            <i className="fa-solid fa-venus"></i>
                          </div>

                          <span className="gender-text">Female</span>
                        </label>
                      </div>
                    </div>

                    <div className="location-row">
                      <div style={{ flex: 1 }}>
                        <label className="profile-main-label">Location</label>

                        <div className="location-select">
                          <i className="fa-solid fa-location-dot"></i>

                          <select
                            value={profileData.location || ""}
                            disabled={!editMode}
                            onChange={(e) =>
                              handleInputChange("location", e.target.value)
                            }
                          >
                            <option value="">Select location</option>
                            <option>Assiut</option>
                            <option>Cairo</option>
                            <option>Alexandria</option>
                            <option>Giza</option>
                            <option>Qalyubia</option>
                            <option>Sharqia</option>
                            <option>Dakahlia</option>
                            <option>Monufia</option>
                            <option>Beheira</option>
                            <option>Gharbia</option>
                            <option>Kafr El-Sheikh</option>
                            <option>Damietta</option>
                            <option>Port Said</option>
                            <option>Ismailia</option>
                            <option>Suez</option>
                            <option>North Sinai</option>
                            <option>South Sinai</option>
                            <option>Luxor</option>
                            <option>Qena</option>
                            <option>Aswan</option>
                            <option>Sohag</option>
                            <option>Minya</option>
                            <option>Beni Suef</option>
                            <option>Fayoum</option>
                            <option>Matrouh</option>
                            <option>New Valley</option>
                            <option>Red Sea</option>
                          </select>
                        </div>
                      </div>

                      {editMode && (
                        <div className="action-row" id="actionButtons">
                          <button
                            type="button"
                            className="btn secondary"
                            onClick={cancelEdit}
                            disabled={savingProfile}
                          >
                            Cancel
                          </button>

                          <button
                            type="button"
                            className="btn primary"
                            onClick={saveChanges}
                            disabled={savingProfile}
                          >
                            {savingProfile ? "Saving..." : "Save Changes"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "change-password" && (
              <div className="card change-password-card">
                <div className="change-password-header">
                  <div className="change-password-icon">
                    <i className="fa-solid fa-lock"></i>
                  </div>

                  <div>
                    <h3>Change Password</h3>
                    <p>
                      Update your password regularly to keep your account secure.
                    </p>
                  </div>
                </div>

                <div className="password-form">
                  <div className="password-field">
                    <label>Current Password</label>

                    <div className="password-input-box">
                      <i className="fa-solid fa-key"></i>
                      <input
                        type="password"
                        placeholder="Enter current password"
                        value={passwordData.currentPassword}
                        onChange={(e) =>
                          setPasswordData((prev) => ({
                            ...prev,
                            currentPassword: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="password-field">
                    <label>New Password</label>

                    <div className="password-input-box">
                      <i className="fa-solid fa-lock"></i>
                      <input
                        type="password"
                        placeholder="Enter new password"
                        value={passwordData.newPassword}
                        onChange={(e) =>
                          setPasswordData((prev) => ({
                            ...prev,
                            newPassword: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="password-field">
                    <label>Confirm New Password</label>

                    <div className="password-input-box">
                      <i className="fa-solid fa-shield-halved"></i>
                      <input
                        type="password"
                        placeholder="Confirm new password"
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                          setPasswordData((prev) => ({
                            ...prev,
                            confirmPassword: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="password-actions">
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() => handleNavClick("profile")}
                      disabled={updatingPassword}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      className="btn primary"
                      onClick={handleUpdatePassword}
                      disabled={updatingPassword}
                    >
                      {updatingPassword ? "Updating..." : "Update Password"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "logout" && (
              <div className="card profile-modern-card logout-card">
                <div className="profile-modern-icon logout">
                  <i className="fa-solid fa-right-from-bracket"></i>
                </div>

                <div>
                  <h3>Ready to leave?</h3>
                  <p>Logout will clear your current session from this browser only.</p>
                </div>

                <div className="profile-modern-actions">
                  <button
                    type="button"
                    className="btn secondary profile-soft-btn"
                    onClick={() => handleNavClick("profile")}
                  >
                    Stay Here
                  </button>

                  <button type="button" className="btn primary profile-gradient-btn" onClick={logout}>
                    <i className="fa-solid fa-arrow-right-from-bracket"></i>
                    Logout
                  </button>

                  <button type="button" className="btn profile-danger-btn" onClick={handleLogoutAllDevices} disabled={loggingOutAll}>
                    <i className="fa-solid fa-power-off"></i>
                    {loggingOutAll ? "Logging out..." : "Logout all devices"}
                  </button>
                </div>
              </div>
            )}

            {activeSection === "delete-account" && (
              <div className="card profile-modern-card delete-account-card">
                <div className="profile-modern-icon danger">
                  <i className="fa-solid fa-user-xmark"></i>
                </div>

                <div>
                  <h3>Delete Account Permanently</h3>
                  <p>
                    This will permanently remove your profile, posts, chats, reminders,
                    saved data, and account access. This action cannot be undone.
                  </p>
                </div>

                <div className="delete-warning-list">
                  <span><i className="fa-solid fa-circle-exclamation"></i> Profile data will be removed</span>
                  <span><i className="fa-solid fa-message"></i> Related chat threads will be removed</span>
                  <span><i className="fa-solid fa-shield-halved"></i> You will be logged out immediately</span>
                </div>

                <div className="profile-modern-actions">
                  <button
                    type="button"
                    className="btn secondary profile-soft-btn"
                    onClick={() => handleNavClick("profile")}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="btn profile-danger-btn"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={deletingAccount}
                  >
                    <i className="fa-solid fa-trash-can"></i>
                    Delete Forever
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <input
        type="file"
        ref={avatarInputRef}
        style={{ display: "none" }}
        accept="image/*"
        onChange={handleAvatarChange}
      />

      {showAvatarPreview && (
        <div
          className="avatar-modal-backdrop"
          onClick={() => setShowAvatarPreview(false)}
        >
          <div className="avatar-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="avatar-modal-close"
              onClick={() => setShowAvatarPreview(false)}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>

            <img
              src={avatarDisplaySrc}
              alt="Profile preview"
              onError={handleAvatarImageError}
            />
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="delete-account-modal-backdrop" onClick={() => !deletingAccount && setShowDeleteConfirm(false)}>
          <div className="delete-account-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-account-modal-icon">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>

            <h3>Confirm permanent deletion</h3>
            <p>
              Are you sure you want to permanently delete your Eatopia account?
              All related data will be deleted and you will not be able to recover it.
            </p>

            <div className="delete-account-confirm-fields">
              <label>
                Password
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={deletingAccount}
                />
              </label>
              <label>
                Confirmation
                <input
                  type="text"
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  placeholder='Type "DELETE MY ACCOUNT"'
                  disabled={deletingAccount}
                />
              </label>
            </div>

            <div className="delete-account-modal-actions">
              <button
                type="button"
                className="profile-soft-btn"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deletingAccount}
              >
                No, keep account
              </button>

              <button
                type="button"
                className="profile-danger-btn"
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
              >
                {deletingAccount ? "Deleting..." : "Yes, delete forever"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div id="toast" className="toast">
        <i className="fa-solid fa-circle-check" style={{ fontSize: "18px" }}></i>
        <div id="toastText">Saved!</div>
      </div>
    </div>
  );
};

export default ProfilePage;
