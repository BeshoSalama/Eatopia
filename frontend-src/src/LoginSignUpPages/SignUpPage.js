import React, { useMemo, useState } from "react";
import "./SignUpPage.css";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { IoMdArrowDropdown } from "react-icons/io";
import Navbar from "../components/Navbar";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { API_BASE_URL } from "../config/api";
import SocialLoginButtons from "../components/SocialLoginButtons";

const getPasswordChecks = (password = "") => ({
  length: password.length >= 8,
  upper: /[A-Z]/.test(password),
  lower: /[a-z]/.test(password),
  digit: /\d/.test(password),
  special: /[^A-Za-z0-9]/.test(password),
});

const passwordStrengthLabel = (checks) => {
  const score = Object.values(checks).filter(Boolean).length;
  if (score >= 5) return { score, label: "Strong" };
  if (score >= 3) return { score, label: "Medium" };
  return { score, label: "Weak" };
};

const initialForm = {
  fullName: "",
  username: "",
  password: "",
  confirmPassword: "",
  email: "",
  birthDate: "",
  location: "",
};

export default function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);
  const [gender, setGender] = useState("");
  const [showGenderOptions, setShowGenderOptions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [activationEmail, setActivationEmail] = useState("");
  const navigate = useNavigate();

  const maxBirthDate = useMemo(
    () => new Date().toISOString().split("T")[0],
    []
  );
  const passwordChecks = useMemo(() => getPasswordChecks(form.password), [form.password]);
  const passwordStrength = useMemo(() => passwordStrengthLabel(passwordChecks), [passwordChecks]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.fullName.trim()) nextErrors.fullName = "Full name is required.";
    if (!form.username.trim() || form.username.trim().length < 3) {
      nextErrors.username = "Username must be at least 3 characters.";
    }
    if (!form.email.trim()) nextErrors.email = "Email is required.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (!form.password) nextErrors.password = "Password is required.";
    if (Object.values(getPasswordChecks(form.password)).some((ok) => !ok)) {
      nextErrors.password = "Password must include 8+ chars, uppercase, lowercase, number, and special character.";
    }
    if (form.confirmPassword !== form.password) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }
    if (!form.birthDate) nextErrors.birthDate = "Birth date is required.";
    if (!form.location.trim()) nextErrors.location = "Location is required.";
    if (!gender) nextErrors.gender = "Please select a gender option.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    const payload = {
      fullName: form.fullName.trim(),
      username: form.username.trim(),
      email: form.email.trim(),
      password: form.password,
      birthDate: form.birthDate,
      location: form.location.trim(),
      gender,
    };

    try {
      const response = await axios.post(`${API_BASE_URL}/signup`, payload);

      localStorage.setItem("eatopia:lastSignupDraft", JSON.stringify(payload));
      localStorage.setItem("eatopia:lastSignupFullName", payload.fullName);
      localStorage.setItem("eatopia:lastSignupUsername", payload.username);
      localStorage.setItem("eatopia:lastActivationEmail", payload.email);

      // Professional auth flow: signup creates the account only.
      // Login is blocked until the user clicks the activation link sent by email.
      localStorage.removeItem("token");
      localStorage.removeItem("eatopiaUser");
      window.dispatchEvent(new Event("eatopia-auth-changed"));

      setActivationEmail(payload.email);
      toast.success(response?.data?.message || "Account created. Check your email to activate it.");
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        "Could not connect to the backend. Check the API base URL and server status.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-body">
      <Navbar />
      <div className="signup-wrapper animate-popup">
        <form onSubmit={handleSubmit} noValidate>
          <h1>Sign Up</h1>

          <SocialLoginButtons />

          <div className="divider">
            <span>or</span>
          </div>

          <div className="input-row">
            <div className="input-box">
              <input
                type="text"
                placeholder="Full Name"
                value={form.fullName}
                onChange={(e) => handleChange("fullName", e.target.value)}
                required
              />
              {errors.fullName && <p className="error-msg">{errors.fullName}</p>}
            </div>

            <div className="input-box">
              <input
                type="text"
                placeholder="Username"
                value={form.username}
                onChange={(e) => handleChange("username", e.target.value)}
                required
              />
              {errors.username && <p className="error-msg">{errors.username}</p>}
            </div>
          </div>

          <div className="input-row">
            <div className="input-box password-input-box">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="eye-icon"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide Password" : "Show Password"}
              >
                {showPassword ? <FaEye /> : <FaEyeSlash />}
              </button>
              {form.password && (
                <div className={`password-strength strength-${passwordStrength.label.toLowerCase()}`}>
                  <div className="password-strength-bar"><span style={{ width: `${passwordStrength.score * 20}%` }} /></div>
                  <p>{passwordStrength.label} password: use uppercase, lowercase, number, and special character.</p>
                </div>
              )}
              {errors.password && <p className="error-msg">{errors.password}</p>}
            </div>

            <div className="input-box password-input-box">
              <input
                type={showRepeatPassword ? "text" : "password"}
                placeholder="Confirm Password"
                value={form.confirmPassword}
                onChange={(e) => handleChange("confirmPassword", e.target.value)}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="eye-icon"
                onClick={() => setShowRepeatPassword(!showRepeatPassword)}
                aria-label={showRepeatPassword ? "Hide password" : "Show password"}
                title={showRepeatPassword ? "Hide Password" : "Show Password"}
              >
                {showRepeatPassword ? <FaEye /> : <FaEyeSlash />}
              </button>
              {errors.confirmPassword && (
                <p className="error-msg">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          <div className="input-row">
            <div className="input-box">
              <input
                type="email"
                placeholder="Email Address"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                required
              />
              {errors.email && <p className="error-msg">{errors.email}</p>}
            </div>

            <div className="input-box">
              <input
                type="date"
                max={maxBirthDate}
                value={form.birthDate}
                onChange={(e) => handleChange("birthDate", e.target.value)}
                required
              />
              {errors.birthDate && (
                <p className="error-msg">{errors.birthDate}</p>
              )}
            </div>
          </div>

          <div className="input-row">
            <div className="input-box">
              <input
                type="text"
                placeholder="Location"
                value={form.location}
                onChange={(e) => handleChange("location", e.target.value)}
                required
              />
              {errors.location && (
                <p className="error-msg">{errors.location}</p>
              )}
            </div>

            <div className="input-box gender-dropdown">
              <button
                type="button"
                className="gender-btn"
                onClick={() => setShowGenderOptions(!showGenderOptions)}
              >
                {gender
                  ? gender.charAt(0).toUpperCase() + gender.slice(1)
                  : "Select Gender"}
                <IoMdArrowDropdown
                  className={`arrow-icon ${showGenderOptions ? "open" : ""}`}
                />
              </button>

              {showGenderOptions && (
                <div className="gender-menu">
                  <div
                    className="gender-option"
                    onClick={() => {
                      setGender("male");
                      setShowGenderOptions(false);
                    }}
                  >
                    Male
                  </div>
                  <div
                    className="gender-option"
                    onClick={() => {
                      setGender("female");
                      setShowGenderOptions(false);
                    }}
                  >
                    Female
                  </div>
                </div>
              )}

              {errors.gender && <p className="error-msg">{errors.gender}</p>}
            </div>
          </div>

          {activationEmail && (
            <div className="activation-notice">
              <div className="activation-icon">Mail</div>
              <div>
                <strong>Check your email</strong>
                <p>We sent an activation link to <span>{activationEmail}</span>. Activate your account before logging in.</p>
              </div>
              <button type="button" onClick={() => navigate("/login")}>Go to Login</button>
            </div>
          )}

          <button type="submit" className="confirm-btn" disabled={loading}>
            {loading ? <span className="loader"></span> : "Confirm"}
          </button>

          <div className="signin-link">
            <p>
              Have an account? <Link to="/login">Sign In</Link>
            </p>
          </div>
        </form>
      </div>

      <ToastContainer
        position="top-center"
        autoClose={2000}
        hideProgressBar
        theme="dark"
      />
    </div>
  );
}
