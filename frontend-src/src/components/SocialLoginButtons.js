import React, { useMemo } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { FaGoogle } from "react-icons/fa";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { loginWithSocialToken } from "../services/authHelpers";
import "./SocialLoginButtons.css";

export default function SocialLoginButtons() {
  const navigate = useNavigate();
  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";

  const googleConfigured = useMemo(
    () => Boolean(googleClientId && !googleClientId.includes("PUT_GOOGLE")),
    [googleClientId]
  );

  const handleSuccess = async (data) => {
    toast.success(data?.message || "Logged in with Google.");
    setTimeout(() => navigate("/profile"), 800);
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      if (!credentialResponse?.credential) {
        toast.error("Google did not return a credential.");
        return;
      }

      const data = await loginWithSocialToken({
        provider: "google",
        idToken: credentialResponse.credential,
      });

      await handleSuccess(data);
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || "Google login failed.");
    }
  };

  return (
    <div className="social-login-stack google-only-login">
      <div className="google-login-wrapper">
        {googleConfigured ? (
          <>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => toast.error("Google login failed.")}
              containerProps={{ "aria-label": "Continue with Google" }}
              theme="outline"
              size="large"
              text="continue_with"
              shape="pill"
              logo_alignment="left"
              locale="en"
              width="100%"
              useOneTap={false}
              auto_select={false}
            />
            <div className="google-login-label" aria-hidden="true">
              <FaGoogle className="social-icon" />
              <span>Continue with Google</span>
            </div>
          </>
        ) : (
          <button
            type="button"
            className="social-btn google social-login-disabled"
            onClick={() => toast.info("Google login needs REACT_APP_GOOGLE_CLIENT_ID in .env and the same ClientId in appsettings.json.")}
          >
            <FaGoogle className="social-icon" />
            Continue with Google
          </button>
        )}
      </div>
    </div>
  );
}
