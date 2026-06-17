import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import ConfirmDialog from "../components/ConfirmDialog";
import TextInputDialog from "../components/TextInputDialog";
import { API_BASE_URL, resolveMediaUrl, uploadFile } from "../config/api";
import { getRoleLabel, getStoredUser, isAdminRole, isOwnerRole, normalizeRole } from "../services/roleAccess";
import "./AdminDashboardPage.css";

const dashboardSections = [
  { key: "overview", label: "Overview" },
  { key: "users", label: "Users" },
  { key: "admins", label: "Admins", ownerOnly: true },
  { key: "recipes", label: "Recipes" },
  { key: "reports", label: "Reports" },
];

const blankRecipeForm = {
  title: "",
  description: "",
  imageUrl: "",
  caloriesPerServing: "",
  servings: "1",
  ingredients: "",
  steps: "",
};

const lower = (value) => String(value || "").toLowerCase();
const itemId = (item) => item?.id || item?.Id;
const userName = (user = {}) => user.fullName || user.name || user.Name || user.email || user.Email || "User";
const userAvatar = (user = {}) => user.avatar || user.profileImage || user.profileImageUrl || user.ProfileImageUrl || "";

const readJsonList = (value) => {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.join("\n") : String(parsed || "");
  } catch {
    return value || "";
  }
};

const linesToJson = (value) => JSON.stringify(
  String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
);

const normalizeRecipe = (recipe = {}) => ({
  ...recipe,
  id: recipe.id || recipe.Id,
  title: recipe.title || recipe.Title || "",
  description: recipe.description || recipe.Description || "",
  imageUrl: recipe.imageUrl || recipe.image_url || recipe.ImageUrl || "",
  caloriesPerServing: recipe.caloriesPerServing ?? recipe.calories_per_serving ?? recipe.CaloriesPerServing ?? "",
  servings: recipe.servings ?? recipe.Servings ?? 1,
  ingredientsJson: recipe.ingredientsJson || recipe.ingredients_json || recipe.IngredientsJson || "[]",
  stepsJson: recipe.stepsJson || recipe.steps_json || recipe.StepsJson || "[]",
});

export default function AdminDashboardPage() {
  const token = localStorage.getItem("token");
  const currentUser = useMemo(() => getStoredUser(), []);
  const canAccessAdmin = isAdminRole(currentUser?.role);
  const isOwner = isOwnerRole(currentUser?.role);
  const authHeaders = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);
  const visibleSections = useMemo(
    () => dashboardSections.filter((section) => !section.ownerOnly || isOwner),
    [isOwner]
  );

  const [activeSection, setActiveSection] = useState("overview");
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [roleMessage, setRoleMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [reportStatus, setReportStatus] = useState("Pending");
  const [userSearch, setUserSearch] = useState("");
  const [recipeForm, setRecipeForm] = useState(blankRecipeForm);
  const [editingRecipeId, setEditingRecipeId] = useState(null);
  const [recipeSaving, setRecipeSaving] = useState(false);
  const [recipeImageUploading, setRecipeImageUploading] = useState(false);
  const [adminInputDialog, setAdminInputDialog] = useState(null);
  const [adminConfirmDialog, setAdminConfirmDialog] = useState(null);

  const askAdminInput = useCallback((config) => new Promise((resolve) => {
    setAdminInputDialog({
      ...config,
      resolve,
    });
  }), []);

  const askAdminConfirm = useCallback((config) => new Promise((resolve) => {
    setAdminConfirmDialog({
      ...config,
      resolve,
    });
  }), []);

  useEffect(() => {
    if (!visibleSections.some((section) => section.key === activeSection)) {
      setActiveSection("overview");
    }
  }, [activeSection, visibleSections]);

  const load = useCallback(async () => {
    if (!token || !canAccessAdmin) return;

    try {
      const [statsRes, reportsRes, usersRes, recipesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/admin/stats`, authHeaders),
        axios.get(`${API_BASE_URL}/admin/reports?status=${reportStatus}`, authHeaders),
        axios.get(`${API_BASE_URL}/admin/users`, authHeaders),
        axios.get(`${API_BASE_URL}/recipes?page=1&pageSize=200`),
      ]);

      setStats(statsRes.data.data || statsRes.data.stats || statsRes.data);
      setReports(reportsRes.data.data || reportsRes.data.reports || []);
      setUsers(usersRes.data.data || usersRes.data.users || []);
      setRecipes((recipesRes.data.data || recipesRes.data.recipes || []).map(normalizeRecipe));
      setLoadError("");
    } catch (error) {
      setLoadError(error?.response?.data?.message || "Could not load admin data right now.");
    }
  }, [authHeaders, canAccessAdmin, reportStatus, token]);

  useEffect(() => {
    load();
  }, [load]);

  const updateUserRole = async (id, role) => {
    setRoleMessage("");
    try {
      await axios.put(`${API_BASE_URL}/admin/users/${id}/role`, { role }, authHeaders);
      setUsers((prev) => prev.map((user) => (itemId(user) === id ? { ...user, role } : user)));
      setRoleMessage("Role updated successfully.");
    } catch (error) {
      setRoleMessage(error?.response?.data?.message || "Could not update this role.");
    }
  };

  const toggleBanUser = async (user, banned) => {
    const id = itemId(user);
    if (!id) return;
    const reason = banned
      ? await askAdminInput({
          title: "Ban user",
          message: `Write the reason for banning ${userName(user)}.`,
          label: "Reason",
          placeholder: "Community rules violation",
          initialValue: "Community rules violation",
          confirmText: "Ban user",
          required: true,
          requiredMessage: "A ban reason is required.",
        })
      : "";
    if (banned && reason === null) return;

    try {
      await axios.put(`${API_BASE_URL}/admin/users/${id}/${banned ? "ban" : "unban"}`, banned ? { reason } : {}, authHeaders);
      setUsers((prev) => prev.map((row) => (itemId(row) === id ? { ...row, isBanned: banned, bannedReason: banned ? reason : null } : row)));
      setActionMessage(banned ? "User banned." : "User unbanned.");
      await load();
    } catch (error) {
      setActionMessage(error?.response?.data?.message || "Could not update ban state.");
    }
  };

  const applyReportAction = async (report, action) => {
    const id = itemId(report);
    if (!id) return;
    const note = action === "warn-user" || action === "ban-user"
      ? await askAdminInput({
          title: action === "warn-user" ? "Send warning" : "Ban reported user",
          message: action === "warn-user"
            ? "This warning will be sent to the reported user as an in-app notification."
            : "Write the moderation note that explains why this user is being banned.",
          label: "Moderation note",
          placeholder: report.reason || "Community rules violation",
          initialValue: report.reason || "",
          confirmText: action === "warn-user" ? "Send warning" : "Ban user",
          required: true,
          requiredMessage: "A moderation note is required.",
        })
      : "";
    if ((action === "warn-user" || action === "ban-user") && note === null) return;
    if (action === "delete-content") {
      const confirmed = await askAdminConfirm({
        title: "Remove reported content?",
        message: "This will hide the reported post/comment/message from the community.",
        confirmText: "Remove content",
        tone: "danger",
      });
      if (!confirmed) return;
    }

    try {
      await axios.post(`${API_BASE_URL}/admin/reports/${id}/action`, { action, note }, authHeaders);
      setActionMessage("Report action applied.");
      await load();
    } catch (error) {
      setActionMessage(error?.response?.data?.message || "Could not apply report action.");
    }
  };

  const updateRecipeForm = (field, value) => {
    setRecipeForm((prev) => ({ ...prev, [field]: value }));
  };

  const editRecipe = (recipe) => {
    setEditingRecipeId(recipe.id);
    setRecipeForm({
      title: recipe.title,
      description: recipe.description || "",
      imageUrl: recipe.imageUrl || "",
      caloriesPerServing: recipe.caloriesPerServing || "",
      servings: String(recipe.servings || 1),
      ingredients: readJsonList(recipe.ingredientsJson),
      steps: readJsonList(recipe.stepsJson),
    });
    setActiveSection("recipes");
  };

  const resetRecipeForm = () => {
    setEditingRecipeId(null);
    setRecipeForm(blankRecipeForm);
  };

  const handleRecipeImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setRecipeImageUploading(true);
      const imageUrl = await uploadFile(file, token, "recipe");
      updateRecipeForm("imageUrl", imageUrl || "");
      setActionMessage("Recipe image uploaded.");
    } catch (error) {
      setActionMessage(error?.message || "Could not upload image.");
    } finally {
      setRecipeImageUploading(false);
      event.target.value = "";
    }
  };

  const submitRecipe = async (event) => {
    event.preventDefault();
    setRecipeSaving(true);
    setActionMessage("");

    const payload = {
      title: recipeForm.title.trim(),
      description: recipeForm.description.trim(),
      imageUrl: recipeForm.imageUrl.trim(),
      caloriesPerServing: recipeForm.caloriesPerServing === "" ? null : Number(recipeForm.caloriesPerServing),
      servings: Number(recipeForm.servings) || 1,
      ingredientsJson: linesToJson(recipeForm.ingredients),
      stepsJson: linesToJson(recipeForm.steps),
    };

    try {
      if (editingRecipeId) {
        await axios.put(`${API_BASE_URL}/recipes/${editingRecipeId}`, payload, authHeaders);
        setActionMessage("Recipe updated.");
      } else {
        await axios.post(`${API_BASE_URL}/recipes`, payload, authHeaders);
        setActionMessage("Recipe added.");
      }
      resetRecipeForm();
      await load();
    } catch (error) {
      setActionMessage(error?.response?.data?.message || "Could not save recipe.");
    } finally {
      setRecipeSaving(false);
    }
  };

  const deleteRecipe = async (recipe) => {
    const confirmed = await askAdminConfirm({
      title: "Delete recipe?",
      message: `Delete ${recipe.title}? This action removes it from the recipe library.`,
      confirmText: "Delete recipe",
      tone: "danger",
    });
    if (!confirmed) return;
    try {
      await axios.delete(`${API_BASE_URL}/recipes/${recipe.id}`, authHeaders);
      setActionMessage("Recipe deleted.");
      await load();
    } catch (error) {
      setActionMessage(error?.response?.data?.message || "Could not delete recipe.");
    }
  };

  const filteredUsers = users.filter((user) => {
    const q = lower(userSearch);
    if (!q) return true;
    return [user.name, user.fullName, user.username, user.email, user.role].some((value) => lower(value).includes(q));
  });

  const regularUsers = filteredUsers.filter((user) => normalizeRole(user.role) === "User");
  const adminUsers = filteredUsers.filter((user) => isAdminRole(user.role));
  const pendingReportCount = reports.filter((report) => lower(report.status || report.Status) === "pending").length;

  const renderUserAvatar = (user) => {
    const src = userAvatar(user);
    return src ? <img src={resolveMediaUrl(src)} alt={userName(user)} /> : userName(user).charAt(0).toUpperCase();
  };

  const renderReports = (title = "Latest reports", filterTypes = null) => {
    const visibleReports = filterTypes ? reports.filter((report) => filterTypes.includes(report.contentType || report.ContentType)) : reports;
    return (
      <section className="admin-card">
        <div className="admin-section-head">
          <div>
            <h2>{title}</h2>
            <p>Review the reason, inspect the target, then take one clear action.</p>
          </div>
          <select value={reportStatus} onChange={(event) => setReportStatus(event.target.value)}>
            <option>Pending</option>
            <option>Reviewed</option>
            <option>Dismissed</option>
            <option>Actioned</option>
            <option>All</option>
          </select>
        </div>

        {!visibleReports.length ? <p>No reports yet.</p> : visibleReports.map((report) => {
          const reportedUser = report.reportedUser || report.ReportedUser;
          const reporter = report.reporter || report.Reporter;
          const content = report.content || report.Content || {};
          const status = report.status || report.Status;
          return (
            <article className="admin-report-row" key={itemId(report)}>
              <div className="admin-report-main">
                <span className={`admin-status-chip ${lower(status)}`}>{status}</span>
                <strong>{report.contentType || report.ContentType}</strong>
                <p>{report.reason || report.Reason}</p>
                {content.preview ? <small>Content: {content.preview}</small> : null}
                <small>Reporter: {userName(reporter)} / Reported: {userName(reportedUser)}</small>
              </div>
              <div className="admin-row-actions">
                {content.targetUrl ? <button type="button" onClick={() => window.open(content.targetUrl, "_self")}>Open</button> : null}
                <button type="button" onClick={() => applyReportAction(report, "reviewed")}>Reviewed</button>
                <button type="button" onClick={() => applyReportAction(report, "dismissed")}>Dismiss</button>
                <button type="button" onClick={() => applyReportAction(report, "warn-user")}>Warn</button>
                <button type="button" className="danger" onClick={() => applyReportAction(report, "delete-content")}>Remove content</button>
                <button type="button" className="danger" onClick={() => applyReportAction(report, "ban-user")}>Ban user</button>
              </div>
            </article>
          );
        })}
      </section>
    );
  };

  const renderUsers = (mode = "users") => {
    const onlyAdmins = mode === "admins";
    const rows = onlyAdmins ? adminUsers : regularUsers;
    return (
      <section className="admin-card">
        <div className="admin-section-head">
          <div>
            <h2>{onlyAdmins ? "Admins" : "Users"}</h2>
            <p>{onlyAdmins ? "Owner-only admin list. Promote owners or remove admin access from here." : "Regular users only. Ban, unban, or promote a user when needed."}</p>
          </div>
          <input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Search users..." />
        </div>
        {roleMessage && <p className="admin-inline-message">{roleMessage}</p>}
        {!rows.length ? <p>{onlyAdmins ? "No admins matched this search." : "No regular users matched this search."}</p> : null}
        <div className="admin-users">
          {rows.map((user) => {
            const id = itemId(user);
            const isBanned = Boolean(user.isBanned ?? user.IsBanned);
            const isTargetOwner = isOwnerRole(user.role);
            return (
              <article className={`admin-user-chip ${isBanned ? "banned" : ""}`} key={id}>
                <span className="admin-user-avatar">{renderUserAvatar(user)}</span>
                <div>
                  <strong>{userName(user)}</strong>
                  <small>{getRoleLabel(user.role)}{isBanned ? " / Banned" : ""}</small>
                  <small>{user.email}</small>
                </div>
                <div className="admin-role-actions">
                  {!onlyAdmins && isOwner && (
                    <button type="button" onClick={() => updateUserRole(id, "Admin")}>Promote Admin</button>
                  )}
                  {onlyAdmins && isOwner && !isTargetOwner && (
                    <button type="button" onClick={() => updateUserRole(id, "Owner")}>Make Owner</button>
                  )}
                  {onlyAdmins && isOwner && !isTargetOwner && (
                    <button type="button" className="danger" onClick={() => updateUserRole(id, "User")}>Remove Admin</button>
                  )}
                  {(!onlyAdmins || !isTargetOwner) && (
                    <button type="button" className={isBanned ? "" : "danger"} onClick={() => toggleBanUser(user, !isBanned)}>
                    {isBanned ? "Unban" : "Ban"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    );
  };

  const renderRecipes = () => (
    <section className="admin-card">
      <div className="admin-section-head">
        <div>
          <h2>Recipes</h2>
          <p>Add, edit, and remove recipe content that appears in the real recipe library.</p>
        </div>
        <button type="button" onClick={resetRecipeForm}>New recipe</button>
      </div>

      <form className="admin-recipe-form" onSubmit={submitRecipe}>
        <div className="admin-form-grid">
          <label>Title<input value={recipeForm.title} onChange={(event) => updateRecipeForm("title", event.target.value)} required /></label>
          <label>Calories<input type="number" min="0" value={recipeForm.caloriesPerServing} onChange={(event) => updateRecipeForm("caloriesPerServing", event.target.value)} /></label>
          <label>Servings<input type="number" min="1" value={recipeForm.servings} onChange={(event) => updateRecipeForm("servings", event.target.value)} required /></label>
          <label>Image<input type="file" accept="image/*" onChange={handleRecipeImage} /></label>
        </div>
        <label>Description<textarea value={recipeForm.description} onChange={(event) => updateRecipeForm("description", event.target.value)} rows={3} placeholder="Short meaningful description..." /></label>
        <div className="admin-form-grid two">
          <label>Ingredients<textarea value={recipeForm.ingredients} onChange={(event) => updateRecipeForm("ingredients", event.target.value)} rows={6} placeholder={"One ingredient per line"} required /></label>
          <label>Steps<textarea value={recipeForm.steps} onChange={(event) => updateRecipeForm("steps", event.target.value)} rows={6} placeholder={"One cooking step per line"} required /></label>
        </div>
        {recipeForm.imageUrl ? <div className="admin-recipe-preview"><img src={resolveMediaUrl(recipeForm.imageUrl)} alt="Recipe preview" /><span>{recipeForm.imageUrl}</span></div> : null}
        <div className="admin-row-actions">
          <button type="submit" disabled={recipeSaving || recipeImageUploading}>{editingRecipeId ? "Update recipe" : "Add recipe"}</button>
          {editingRecipeId ? <button type="button" onClick={resetRecipeForm}>Cancel edit</button> : null}
        </div>
      </form>

      <div className="admin-recipe-list">
        {recipes.map((recipe) => (
          <article className="admin-recipe-row" key={recipe.id}>
            <div className="admin-recipe-thumb">{recipe.imageUrl ? <img src={resolveMediaUrl(recipe.imageUrl)} alt={recipe.title} /> : recipe.title.charAt(0)}</div>
            <div>
              <strong>{recipe.title}</strong>
              <p>{recipe.description || "No description yet."}</p>
              <small>{recipe.caloriesPerServing || 0} kcal / {recipe.servings} serving</small>
            </div>
            <div className="admin-row-actions">
              <button type="button" aria-label={`Edit ${recipe.title}`} onClick={() => editRecipe(recipe)}>Edit</button>
              <button type="button" className="danger" aria-label={`Delete ${recipe.title}`} onClick={() => deleteRecipe(recipe)}>Delete</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );

  const renderSection = () => {
    if (activeSection === "overview") {
      return (
        <>
          <section className="admin-stats-grid">
            {["users", "posts", "messages", "activeUsers", "pendingReports", "bannedUsers", "recipes"].map((key) => (
              <article className="admin-stat-card" key={key}>
                <span>{key.replace(/([A-Z])/g, " $1")}</span>
                <strong>{stats?.[key] ?? 0}</strong>
              </article>
            ))}
          </section>
          <section className="admin-card admin-overview-actions">
            <h2>Today&apos;s control room</h2>
            <div className="admin-overview-grid">
              <article><strong>{pendingReportCount}</strong><span>Pending reports</span><button type="button" onClick={() => setActiveSection("reports")}>Review reports</button></article>
              <article><strong>{stats?.recipes ?? recipes.length}</strong><span>Backend recipes</span><button type="button" onClick={() => setActiveSection("recipes")}>Manage recipes</button></article>
              <article><strong>{adminUsers.length}</strong><span>Elevated accounts</span>{isOwner && <button type="button" onClick={() => setActiveSection("admins")}>Manage admins</button>}</article>
            </div>
          </section>
        </>
      );
    }

    if (activeSection === "users") return renderUsers("users");
    if (activeSection === "admins") return renderUsers("admins");
    if (activeSection === "recipes") return renderRecipes();
    if (activeSection === "reports") return renderReports("Latest reports");

    return null;
  };

  if (!canAccessAdmin) {
    return (
      <div className="admin-page">
        <Navbar />
        <main className="admin-shell">
          <section className="admin-hero">
            <p>Access blocked</p>
            <h1>Admin Dashboard is only available for Owner and Admin accounts.</h1>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <Navbar />
      <main className="admin-shell">
        <section className="admin-hero">
          <p>{getRoleLabel(currentUser?.role)}</p>
          <h1>Admin Dashboard</h1>
        </section>

        <nav className="admin-tabs" aria-label="Admin dashboard sections">
          {visibleSections.map((section) => (
            <button key={section.key} type="button" className={activeSection === section.key ? "active" : ""} onClick={() => setActiveSection(section.key)}>
              {section.label}
            </button>
          ))}
        </nav>

        {loadError && <div className="admin-error">{loadError}</div>}
        {actionMessage && <div className="admin-inline-message">{actionMessage}</div>}
        {renderSection()}
      </main>
      <TextInputDialog
        open={Boolean(adminInputDialog)}
        title={adminInputDialog?.title}
        message={adminInputDialog?.message}
        label={adminInputDialog?.label}
        placeholder={adminInputDialog?.placeholder}
        initialValue={adminInputDialog?.initialValue || ""}
        confirmText={adminInputDialog?.confirmText || "Confirm"}
        cancelText="Cancel"
        required={adminInputDialog?.required}
        requiredMessage={adminInputDialog?.requiredMessage}
        onCancel={() => {
          adminInputDialog?.resolve?.(null);
          setAdminInputDialog(null);
        }}
        onSubmit={async (value) => {
          adminInputDialog?.resolve?.(value);
          setAdminInputDialog(null);
        }}
      />
      <ConfirmDialog
        open={Boolean(adminConfirmDialog)}
        title={adminConfirmDialog?.title}
        message={adminConfirmDialog?.message}
        confirmText={adminConfirmDialog?.confirmText || "Confirm"}
        cancelText="Cancel"
        tone={adminConfirmDialog?.tone || "danger"}
        onCancel={() => {
          adminConfirmDialog?.resolve?.(false);
          setAdminConfirmDialog(null);
        }}
        onConfirm={async () => {
          adminConfirmDialog?.resolve?.(true);
          setAdminConfirmDialog(null);
        }}
      />
    </div>
  );
}
