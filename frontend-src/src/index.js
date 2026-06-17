import React from "react";
import ReactDOM from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { installAxiosAuthInterceptors } from "./services/authHelpers";

installAxiosAuthInterceptors();

const rawGoogleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";
const googleClientId = rawGoogleClientId.includes("PUT_GOOGLE") ? "" : rawGoogleClientId;

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);

reportWebVitals();
