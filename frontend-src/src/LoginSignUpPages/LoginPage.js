import React, { useEffect, useState } from "react";
import "./LoginPage.css";
import { FaUser, FaEye, FaEyeSlash } from "react-icons/fa";
import Navbar from "../components/Navbar";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { API_BASE_URL } from "../config/api";
import SocialLoginButtons from "../components/SocialLoginButtons";
import { storeAuthResponse } from "../services/authHelpers";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState("");
  const [resendingActivation, setResendingActivation] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("sessionExpired") === "1") {
      const reason = localStorage.getItem("eatopia:lastAuthClearReason");
      toast.info(reason === "token_invalid" ? "Your session expired. Please login again." : "Please login to continue.");
      localStorage.removeItem("eatopia:lastAuthClearReason");
    }
  }, [searchParams]);

  const validate = () => {
    const newErrors = {};

    if (!emailOrUsername.trim()) {
      newErrors.emailOrUsername = "Please enter your username or email.";
    }

    if (!password.trim()) {
      newErrors.password = "Please enter your password.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmail = emailRegex.test(emailOrUsername);

    if (emailOrUsername.trim() && !isEmail && emailOrUsername.trim().length < 3) {
      newErrors.emailOrUsername =
        "Enter a valid email or a username with at least 3 characters.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);

      const payload = {
        usernameOrEmail: emailOrUsername.trim(),
        password,
      };

      const response = await axios.post(`${API_BASE_URL}/login`, payload);
      const token = response?.data?.token;
      const success = Boolean(response?.data?.success || token);

      if (!success) {
        toast.error(response?.data?.message || "Login failed. Please try again.");
        return;
      }

      storeAuthResponse(response?.data, payload.usernameOrEmail);

      setUnconfirmedEmail("");
      localStorage.setItem("eatopia:lastLoginIdentifier", payload.usernameOrEmail);

      const returnUrl = searchParams.get("returnUrl");
      const safeReturnUrl = returnUrl && returnUrl.startsWith("/") ? returnUrl : "/profile";
      toast.success(response?.data?.message || "Logged in successfully.");
      setTimeout(() => navigate(safeReturnUrl), 1000);
    } catch (error) {
      const errorCode = error?.response?.data?.error?.code;
      const message =
        error?.response?.data?.message ||
        "Could not connect to the backend. Check the API base URL and server status.";

      if (errorCode === "EMAIL_NOT_CONFIRMED" && /^\S+@\S+\.\S+$/.test(emailOrUsername.trim())) {
        setUnconfirmedEmail(emailOrUsername.trim());
      }

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };


  const resendActivationEmail = async () => {
    if (!unconfirmedEmail) return;

    try {
      setResendingActivation(true);
      const response = await axios.post(`${API_BASE_URL}/resend-activation`, {
        email: unconfirmedEmail,
      });
      toast.success(response?.data?.message || "Activation email sent.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not resend activation email.");
    } finally {
      setResendingActivation(false);
    }
  };

  return (
    <div className="body">
      <Navbar />
      <div className="wrapper">
        <form onSubmit={handleSubmit} noValidate>
          <h1>Login</h1>

          <div className="input-box">
            <input
              type="text"
              placeholder="Username or Email"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              autoFocus
              autoComplete="username"
            />
            <FaUser className="icon" />
            {errors.emailOrUsername && (
              <p className="error-msg">{errors.emailOrUsername}</p>
            )}
          </div>

          <div className="input-box">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <span
              className={`eye-icon ${showPassword ? "active" : ""}`}
              onClick={() => setShowPassword(!showPassword)}
              aria-label="Toggle password visibility"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setShowPassword((prev) => !prev);
                }
              }}
            >
              {showPassword ? <FaEye /> : <FaEyeSlash />}
            </span>
            {errors.password && <p className="error-msg">{errors.password}</p>}
          </div>

          <div className="forget-pass">
            <Link to="/forgot-password" className="text-link">Forgot password?</Link>
          </div>

          {unconfirmedEmail && (
            <div className="activation-login-help">
              <p>Your account needs activation before login.</p>
              <button type="button" onClick={resendActivationEmail} disabled={resendingActivation}>
                {resendingActivation ? "Sending..." : "Resend activation link"}
              </button>
            </div>
          )}

          <button type="submit" disabled={loading}>
            {loading ? <div className="spinner"></div> : "Login"}
          </button>

          <div className="signup-link">
            <p>
              Don&apos;t have an account ? <Link to="/signup">Sign Up</Link>
            </p>
          </div>

          <div className="divider">
            <span>or</span>
          </div>

          <SocialLoginButtons />
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
