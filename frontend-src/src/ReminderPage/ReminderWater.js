import React, { useEffect, useMemo, useState } from "react";
import "./ReminderWater.css";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import { GiMedicines } from "react-icons/gi";
import axios from "axios";
import { API_BASE_URL } from "../config/api";

const defaultIntakes = [
  { time: "8:00 AM", timeOfDay: "08:00", amount: 500, done: false },
  { time: "10:30 AM", timeOfDay: "10:30", amount: 500, done: false },
  { time: "12:30 PM", timeOfDay: "12:30", amount: 500, done: false },
  { time: "3:00 PM", timeOfDay: "15:00", amount: 500, done: false },
  { time: "5:30 PM", timeOfDay: "17:30", amount: 500, done: false },
  { time: "9:00 PM", timeOfDay: "21:00", amount: 500, done: false },
];

const getToken = () => localStorage.getItem("token");
const authHeaders = () => ({ headers: { Authorization: `Bearer ${getToken()}` } });

const toLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function ReminderWater() {
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [isHyperActive, setIsHyperActive] = useState(false);
  const [currentAnimation, setCurrentAnimation] = useState(null);
  const [intakes, setIntakes] = useState(defaultIntakes);
  const [draftIntakes, setDraftIntakes] = useState(defaultIntakes);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const normalizeIntake = (item, index) => ({
    id: item.id,
    time: item.time || formatTimeForDisplay(item.timeOfDay || item.time_of_day || "08:00"),
    timeOfDay: item.timeOfDay || item.time_of_day || formatTimeForInput(item.time || defaultIntakes[index]?.time || "8:00 AM"),
    amount: Number(item.amount || item.amountMl || 500),
    done: Boolean(item.done || item.isCompleted),
  });

  const loadWaterReminders = async () => {
    if (!getToken()) {
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");
      const response = await axios.get(`${API_BASE_URL}/water/reminders`, authHeaders());
      const loaded = response?.data?.intakes || response?.data?.data || [];
      const normalized = loaded.length ? loaded.map(normalizeIntake) : defaultIntakes;
      setIntakes(normalized);
      setDraftIntakes(normalized);
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Could not load water reminders.");
      setIntakes(defaultIntakes);
      setDraftIntakes(defaultIntakes);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWaterReminders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const checkWaterNotifications = () => {
      const now = new Date();
      const currentTime = formatTimeForInput(formatDateToDisplayTime(now));
      const today = now.toISOString().slice(0, 10);
      const sentKey = "eatopia:water-notifications-sent";
      let sentMap = {};

      try {
        sentMap = JSON.parse(localStorage.getItem(sentKey)) || {};
      } catch {
        sentMap = {};
      }

      intakes.forEach((item, index) => {
        const notificationId = `${today}-${item.id || index}-${item.timeOfDay}`;
        if (item.timeOfDay === currentTime && !sentMap[notificationId]) {
          showWaterNotification(item);
          sentMap[notificationId] = true;
        }
      });

      localStorage.setItem(sentKey, JSON.stringify(sentMap));
    };

    checkWaterNotifications();
    const timer = setInterval(checkWaterNotifications, 30000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intakes]);

  const completedCount = intakes.filter((item) => item.done).length;
  const percentage = useMemo(() => {
    if (!intakes.length) return 0;
    return Math.round((completedCount / intakes.length) * 100);
  }, [completedCount, intakes.length]);

  const startEditing = () => {
    setDraftIntakes(intakes.map((item) => ({ ...item })));
    setIsEditing(true);
  };

  const saveEditing = async () => {
    try {
      setErrorMessage("");
      const payload = {
        date: toLocalDateString(),
        intakes: draftIntakes.map((item) => ({
          id: item.id,
          timeOfDay: toBackendTime(item.timeOfDay),
          amountMl: Number(item.amount),
          isCompleted: Boolean(item.done),
        })),
      };

      const response = await axios.put(`${API_BASE_URL}/water/reminders`, payload, authHeaders());
      const saved = response?.data?.intakes || response?.data?.data || [];
      const normalized = saved.length ? saved.map(normalizeIntake) : draftIntakes;
      setIntakes(normalized);
      setDraftIntakes(normalized);
      setIsEditing(false);
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Could not save water reminders.");
    }
  };

  const cancelEditing = () => {
    setDraftIntakes(intakes.map((item) => ({ ...item })));
    setIsEditing(false);
  };

  const handleIntakeClick = async (index) => {
    if (isEditing) return;
    const target = intakes[index];
    if (!target?.id) return;

    setCurrentAnimation(index);
    const nextDone = !target.done;

    setIntakes((prev) => prev.map((item, i) => (i === index ? { ...item, done: nextDone } : item)));

    try {
      await axios.put(`${API_BASE_URL}/water/reminders/${target.id}`, { isCompleted: nextDone }, authHeaders());
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Could not update water status.");
      setIntakes((prev) => prev.map((item, i) => (i === index ? { ...item, done: !nextDone } : item)));
    } finally {
      setTimeout(() => setCurrentAnimation(null), 450);
    }
  };

  const handleTimeChange = (index, newTime) => {
    setDraftIntakes((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, timeOfDay: newTime, time: formatTimeForDisplay(newTime) } : item
      )
    );
  };

  const handleAmountChange = (index, newAmount) => {
    setDraftIntakes((prev) => prev.map((item, i) => (i === index ? { ...item, amount: newAmount } : item)));
  };

  const addIntake = () => {
    setDraftIntakes((prev) => [
      ...prev,
      { time: "12:00 PM", timeOfDay: "12:00", amount: isHyperActive ? 750 : 500, done: false },
    ]);
  };

  const removeIntake = (index) => {
    if (draftIntakes.length <= 1) return;
    setDraftIntakes((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleHyperActive = () => {
    setIsHyperActive((prev) => {
      const next = !prev;
      const setter = isEditing ? setDraftIntakes : setIntakes;
      setter((current) => current.map((item) => ({ ...item, amount: next ? 750 : 500 })));
      return next;
    });
  };

  function toBackendTime(timeValue) {
    const normalized = formatTimeForInput(timeValue);
    return normalized.length === 5 ? `${normalized}:00` : normalized;
  }

  function formatTimeForInput(timeStr) {
    const value = String(timeStr || "").trim();
    if (!value) return "08:00";

    if (/^\d{1,2}:\d{2}$/.test(value)) {
      const [hours, minutes] = value.split(":");
      return `${String(parseInt(hours, 10) || 0).padStart(2, "0")}:${minutes}`;
    }

    const [time, modifier = ""] = value.split(/\s+/);
    const [rawHours, rawMinutes = "00"] = time.split(":");
    let hours = parseInt(rawHours, 10);
    const minutes = String(parseInt(rawMinutes, 10) || 0).padStart(2, "0");
    const normalizedModifier = modifier.toUpperCase();

    if (Number.isNaN(hours)) return "08:00";
    if (normalizedModifier === "PM" && hours !== 12) hours += 12;
    if (normalizedModifier === "AM" && hours === 12) hours = 0;

    return `${String(hours).padStart(2, "0")}:${minutes}`;
  }

  function formatTimeForDisplay(timeValue) {
    const [hours, minutes] = formatTimeForInput(timeValue).split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  const formatDateToDisplayTime = (date) => {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return formatTimeForDisplay(`${hours}:${minutes}`);
  };

  const showWaterNotification = (item) => {
    const title = "Water Reminder";
    const body = `It's time to drink ${item.amount}ml of water.`;
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, icon: "/favicon.ico" });
    }
  };

  const displayedIntakes = isEditing ? draftIntakes : intakes;

  return (
    <>
      <Navbar />
      <section className="reminder-water-hero">
        <div className="reminder-water-container">
          <div className="right-area">
            <div className="med-header-space" />
            <button className="reminder-btn medication" onClick={() => navigate("/reminder/medication")}>
              <GiMedicines className="reminder-icon" /> Medication
            </button>
          </div>

          <div className="left-card">
            <div className="card-header">
              <h1 className="page-title">Water Reminder</h1>
              {!isEditing && (
                <button className="icon-edit-btn" title="Edit" onClick={startEditing}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" fill="white" /></svg>
                </button>
              )}
            </div>

            {errorMessage && <p className="water-error-message">{errorMessage}</p>}
            {loading ? <p className="water-error-message">Loading water reminders...</p> : null}

            <div className="card-body">
              <div className="water-and-intake">
                <div className="water-area">
                  <div className={`water-drop ${currentAnimation !== null ? "pulse" : ""} ${percentage === 100 ? "full" : ""}`} aria-hidden>
                    <div className="water-fill" style={{ height: `${percentage}%` }} />
                    <div className="water-info"><div className="water-percent">{percentage}%</div><div className="water-label">Daily</div></div>
                    <div className="sparkles" />
                  </div>
                </div>

                <div className="intake-area">
                  <div className="intake-header">
                    <h2>Daily Intake</h2>
                    <button
                      type="button"
                      className={`status-tag ${isHyperActive ? "active" : ""}`}
                      onClick={toggleHyperActive}
                      aria-pressed={isHyperActive}
                    >
                      Hyper Active
                    </button>
                  </div>

                  <div className="intake-scroll">
                    <div className="intake-grid">
                      {displayedIntakes.map((item, index) => (
                        <div key={`${item.id || item.timeOfDay}-${index}`} className={`intake-item ${item.done ? "done" : ""} ${currentAnimation === index ? "clicked" : ""}`} onClick={() => handleIntakeClick(index)}>
                          {isEditing ? (
                            <div className="editable-intake">
                              <input type="time" value={item.timeOfDay} onChange={(e) => handleTimeChange(index, e.target.value)} className="time-input" />
                              <input type="number" min="1" value={item.amount} onChange={(e) => handleAmountChange(index, parseInt(e.target.value, 10) || 1)} className="amount-input" />
                              <span className="ml-label">ml</span>
                              <button className="remove-btn" onClick={(e) => { e.stopPropagation(); removeIntake(index); }} title="Remove" aria-label="Remove intake">x</button>
                            </div>
                          ) : (
                            <div className="intake-display"><span className="intake-time">{item.time}</span><span className="intake-amount">{item.amount}ml</span></div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {isEditing && (
                    <div className="intake-edit-actions">
                      <button className="add-intake-btn" onClick={addIntake}>+ Add Intake</button>
                      <button className="save-intake-btn" onClick={saveEditing}>Save</button>
                      <button className="cancel-intake-btn" onClick={cancelEditing}>Cancel</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
