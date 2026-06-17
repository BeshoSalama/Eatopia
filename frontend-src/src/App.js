import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Home from "./HomePage/Home";
import LoginPage from "./LoginSignUpPages/LoginPage";
import ForgotPasswordPage from "./LoginSignUpPages/ForgotPasswordPage";
import ActivateAccountPage from "./LoginSignUpPages/ActivateAccountPage";
import SignUpPage from "./LoginSignUpPages/SignUpPage";
import ReminderPage from "./ReminderPage/ReminderPage";
import ReminderWater from "./ReminderPage/ReminderWater";
import ReminderMedication from "./ReminderPage/ReminderMedication";
import CommunityWelcomePage from "./CommunityPages/CommunityWelcomePage";
import CommunityHomePage from "./CommunityPages/CommunityHomePage";
import RecipesPage from "./RecipesPage/RecipesPage";
import DietPalnPage from "./DietPlanPage/DietPlanPage";
import ProfilePage from "./ProfilePage/ProfilePage";
import CommunityProfilePage from "./CommunityPages/CommunityProfilePage";
import CommunityChatPage from "./CommunityPages/CommunityChatPage";
import { CommunityProvider } from "./CommunityPages/CommunityContext";
import SettingsPage from "./SettingsPage/SettingsPage";
import AdminDashboardPage from "./AdminPage/AdminDashboardPage";
import { syncStoredUserFromBackend } from "./services/authHelpers";
import { getStoredUser, isAdminRole } from "./services/roleAccess";

const RequireAdmin = ({ children }) => {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let cancelled = false;

    const verifyAdminAccess = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        if (!cancelled) setStatus("denied");
        return;
      }

      const storedUser = getStoredUser();
      if (isAdminRole(storedUser?.role)) {
        if (!cancelled) setStatus("allowed");
        return;
      }

      try {
        const freshUser = await syncStoredUserFromBackend({ refreshTokenWhenRoleChanged: true });
        if (!cancelled) setStatus(isAdminRole(freshUser?.role) ? "allowed" : "denied");
      } catch {
        if (!cancelled) setStatus("denied");
      }
    };

    verifyAdminAccess();
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "checking") return null;
  return status === "allowed" ? children : <Navigate to="/" replace />;
};

const RequireAuth = ({ children }) => {
  const location = useLocation();
  const token = localStorage.getItem("token");

  if (!token) {
    const returnUrl = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?returnUrl=${returnUrl}`} replace />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <CommunityProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/activate-account" element={<ActivateAccountPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/reminder" element={<ReminderPage />} />
          <Route path="/reminder/water" element={<ReminderWater />} />
          <Route path="/reminder/medication" element={<ReminderMedication />} />
          <Route path="/community" element={<CommunityWelcomePage />} />
          <Route path="/communityHomePage" element={<CommunityHomePage />} />
          <Route path="/communityChat" element={<CommunityChatPage />} />
          <Route path="/communityProfile" element={<CommunityProfilePage />} />
          <Route path="/recipes" element={<RecipesPage />} />
          <Route path="/dietplan" element={<RequireAuth><DietPalnPage /></RequireAuth>} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/admin" element={<RequireAdmin><AdminDashboardPage /></RequireAdmin>} />
          <Route path="/dashboard" element={<Navigate to="/profile" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </CommunityProvider>
    </BrowserRouter>
  );
}

export default App;
