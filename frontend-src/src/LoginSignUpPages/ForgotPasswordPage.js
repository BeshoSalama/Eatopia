import React, { useState } from "react";
import "./LoginPage.css";
import Navbar from "../components/Navbar";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { API_BASE_URL } from "../config/api";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState("email");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  React.useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const requestCode = async (e) => {
    e.preventDefault();
    if (!email.trim()) return toast.error("Email is required.");
    if (cooldown > 0) return toast.info(`Please wait ${cooldown}s before requesting another code.`);
    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE_URL}/forgot-password`, { email: email.trim() });
      toast.success(res?.data?.message || "Reset code sent.");
      setStep("reset");
      setCooldown(60);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not send reset code. Check email settings.");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    if (!code.trim() || !newPassword || !confirmPassword) return toast.error("Complete all fields.");
    if (!/^\d{6}$/.test(code.trim())) return toast.error("Code must be exactly 6 digits.");
    if (newPassword.length < 8) return toast.error("Password must be at least 8 characters.");
    if (newPassword !== confirmPassword) return toast.error("Passwords do not match.");
    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE_URL}/reset-password`, { email: email.trim(), code: code.trim(), newPassword, confirmPassword });
      toast.success(res?.data?.message || "Password reset successfully.");
      setTimeout(() => navigate("/login"), 1200);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="body">
      <Navbar />
      <div className="wrapper">
        {step === "email" ? (
          <form onSubmit={requestCode} noValidate>
            <h1>Forgot Password</h1>
            <div className="input-box">
              <input type="email" placeholder="Registered email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            </div>
            <button type="submit" disabled={loading}>{loading ? <div className="spinner"></div> : "Send reset code"}</button>
            <div className="signup-link"><p><Link to="/login">Back to login</Link></p></div>
          </form>
        ) : (
          <form onSubmit={resetPassword} noValidate>
            <h1>Reset Password</h1>
            <div className="input-box"><input type="text" inputMode="numeric" placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} maxLength={6} /></div>
            <div className="input-box"><input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></div>
            <div className="input-box"><input type="password" placeholder="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></div>
            <button type="submit" disabled={loading}>{loading ? <div className="spinner"></div> : "Reset password"}</button>
            <div className="signup-link"><p><button type="button" className="text-link" disabled={cooldown > 0 || loading} onClick={requestCode}>{cooldown > 0 ? `Resend in ${cooldown}s` : "Send another code"}</button></p></div>
          </form>
        )}
      </div>
      <ToastContainer position="top-center" autoClose={2500} hideProgressBar theme="dark" />
    </div>
  );
}
