import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";
import { API_BASE_URL } from "../config/api";
import "./ActivateAccountPage.css";

export default function ActivateAccountPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Activating your account...");
  const [resending, setResending] = useState(false);

  const email = useMemo(() => searchParams.get("email") || "", [searchParams]);
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  useEffect(() => {
    const activate = async () => {
      if (!email || !token) {
        setStatus("error");
        setMessage("Activation link is missing email or token.");
        return;
      }

      try {
        await axios.post(`${API_BASE_URL}/activate-account`, { email, token });
        localStorage.removeItem("token");
        localStorage.removeItem("eatopiaUser");
        window.dispatchEvent(new Event("eatopia-auth-changed"));
        setStatus("success");
        setMessage("Account activated successfully. You can login now.");
      } catch (error) {
        setStatus("error");
        setMessage(error?.response?.data?.message || "Invalid or expired activation link.");
      }
    };

    activate();
  }, [email, token]);

  const resendActivation = async () => {
    if (!email) return;

    try {
      setResending(true);
      const response = await axios.post(`${API_BASE_URL}/resend-activation`, { email });
      setMessage(response?.data?.message || "A new activation link has been sent.");
    } catch (error) {
      setMessage(error?.response?.data?.message || "Could not resend activation email.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="activation-page">
      <Navbar />

      <div className="activation-card">
        <div className={`activation-status-icon ${status}`}>
          {status === "loading" && <span className="activation-spinner" />}
          {status === "success" && <i className="fa-solid fa-circle-check"></i>}
          {status === "error" && <i className="fa-solid fa-triangle-exclamation"></i>}
        </div>

        <h1>
          {status === "success"
            ? "Your account is active"
            : status === "error"
            ? "Activation problem"
            : "Activating account"}
        </h1>

        <p>{message}</p>

        {email && <div className="activation-email-pill">{email}</div>}

        <div className="activation-actions">
          <Link className="activation-primary" to="/login">Go to Login</Link>

          {status === "error" && email && (
            <button type="button" onClick={resendActivation} disabled={resending}>
              {resending ? "Sending..." : "Resend activation link"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
