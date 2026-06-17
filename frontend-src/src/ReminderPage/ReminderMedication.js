import React, { useEffect, useState } from "react";
import "./ReminderMedication.css";
import Navbar from "../components/Navbar";
import { GiWaterDrop } from "react-icons/gi";
import { FaPills, FaClock, FaUtensils, FaPlus, FaPen, FaTrash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../config/api";

const getToken = () => localStorage.getItem("token");
const authHeaders = () => ({ headers: { Authorization: `Bearer ${getToken()}` } });

const toLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

function formatDisplayTime(timeValue) {
  if (!timeValue) return "-";
  const [h, rawMinutes = "00"] = String(timeValue).split(":");
  let hour = parseInt(h, 10);
  if (Number.isNaN(hour)) return "-";
  const minutes = String(parseInt(rawMinutes, 10) || 0).padStart(2, "0");
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minutes} ${ampm}`;
}

function normalizeMedication(med) {
  const schedule = med.schedule || med.timesOfDay || [];
  return {
    id: med.id,
    name: med.name,
    dosageText: med.dosageText || med.dosage_text || "",
    schedule,
    scheduleIds: med.scheduleIds || med.schedule_ids || [],
    beforeAfterMeal: med.beforeAfterMeal || med.before_after_meal || "Before",
    timesPerDay: med.timesPerDay || med.times_per_day || schedule.length || 1,
    done: med.done || schedule.map(() => false),
  };
}

export default function ReminderMedication() {
  const navigate = useNavigate();
  const [medications, setMedications] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [newMed, setNewMed] = useState({
    name: "",
    dosageText: "",
    timesPerDay: 1,
    schedule: [""],
    beforeAfterMeal: "Before",
  });

  const loadMedications = async () => {
    if (!getToken()) {
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      setPageError("");
      const response = await axios.get(`${API_BASE_URL}/medications`, authHeaders());
      const loaded = response?.data?.medications || response?.data?.data || [];
      setMedications(loaded.map(normalizeMedication));
    } catch (error) {
      setPageError(error?.response?.data?.message || "Could not load medications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setFormError("");
    setNewMed({ name: "", dosageText: "", timesPerDay: 1, schedule: [""], beforeAfterMeal: "Before" });
  };

  const openAddPopup = () => {
    resetForm();
    setShowPopup(true);
  };

  const closePopup = () => {
    setShowPopup(false);
    resetForm();
  };

  const openEditPopup = (med) => {
    setEditingId(med.id);
    setFormError("");
    setNewMed({
      name: med.name,
      dosageText: med.dosageText || med.dosage_text || "",
      timesPerDay: med.schedule.length || 1,
      schedule: med.schedule.length ? med.schedule.slice() : [""],
      beforeAfterMeal: med.beforeAfterMeal || med.before_after_meal || "Before",
    });
    setShowPopup(true);
  };

  const handleTimesPerDayChange = (val) => {
    let value = parseInt(val, 10) || 1;
    if (value < 1) value = 1;
    if (value > 8) value = 8;

    setNewMed((prev) => {
      const updatedSchedule = [...prev.schedule];
      while (updatedSchedule.length < value) updatedSchedule.push("");
      while (updatedSchedule.length > value) updatedSchedule.pop();
      return { ...prev, timesPerDay: value, schedule: updatedSchedule };
    });
  };

  const handleScheduleChange = (index, value) => {
    setNewMed((prev) => {
      const updatedSchedule = [...prev.schedule];
      updatedSchedule[index] = value;
      return { ...prev, schedule: updatedSchedule };
    });
  };

  const buildPayload = () => {
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + 30);

    return {
      name: newMed.name.trim(),
      dosageText: newMed.dosageText?.trim() || "",
      beforeAfterMeal: newMed.beforeAfterMeal,
      timesPerDay: Number(newMed.timesPerDay),
      startDate: toLocalDateString(today),
      endDate: toLocalDateString(endDate),
      timesOfDay: newMed.schedule.filter(Boolean).map((time) => `${time}:00`),
    };
  };

  const handleAddMedication = async () => {
    const trimmedName = newMed.name.trim();
    const schedule = newMed.schedule.filter((time) => time && time.trim() !== "");

    if (!trimmedName) {
      setFormError("Please enter medicine name.");
      return;
    }

    if (schedule.length !== Number(newMed.timesPerDay)) {
      setFormError("Please fill all medicine times.");
      return;
    }

    try {
      setFormError("");
      const payload = buildPayload();
      let response;

      if (editingId) {
        response = await axios.put(`${API_BASE_URL}/medications/${editingId}`, payload, authHeaders());
      } else {
        response = await axios.post(`${API_BASE_URL}/medications`, payload, authHeaders());
      }

      const saved = normalizeMedication(response?.data?.medication || response?.data?.data);
      setMedications((prev) => {
        if (editingId) return prev.map((med) => (med.id === editingId ? saved : med));
        return [...prev, saved];
      });
      closePopup();
    } catch (error) {
      setFormError(error?.response?.data?.message || "Could not save medication.");
    }
  };

  const toggleDoseDone = async (medId, index) => {
    const med = medications.find((item) => item.id === medId);
    const scheduleId = med?.scheduleIds?.[index];
    const nextDone = !med?.done?.[index];

    setMedications((prev) =>
      prev.map((item) =>
        item.id === medId
          ? { ...item, done: item.done.map((doneValue, i) => (i === index ? nextDone : doneValue)) }
          : item
      )
    );

    if (!scheduleId) return;

    try {
      await axios.put(`${API_BASE_URL}/medications/schedules/${scheduleId}`, { isTaken: nextDone }, authHeaders());
    } catch (error) {
      setPageError(error?.response?.data?.message || "Could not update dose status.");
      setMedications((prev) =>
        prev.map((item) =>
          item.id === medId
            ? { ...item, done: item.done.map((doneValue, i) => (i === index ? !nextDone : doneValue)) }
            : item
        )
      );
    }
  };

  const removeMedication = async (id) => {
    const previous = medications;
    setMedications((prev) => prev.filter((med) => med.id !== id));

    try {
      await axios.delete(`${API_BASE_URL}/medications/${id}`, authHeaders());
    } catch (error) {
      setPageError(error?.response?.data?.message || "Could not delete medication.");
      setMedications(previous);
    }
  };

  return (
    <>
      <Navbar />

      <section className="reminder-med-hero">
        <div className="reminder-med-container">
          <div className="left-card">
            <div className="card-header">
              <h1 className="page-title">Medication Reminder</h1>
            </div>

            {pageError ? <p className="medform-error">{pageError}</p> : null}
            {loading ? <p className="no-meds">Loading medications...</p> : null}

            <div className="medicine-list">
              {!loading && medications.length === 0 ? (
                <p className="no-meds">No medicines added yet.</p>
              ) : (
                medications.map((med) => (
                  <div key={med.id} className="medicine-card">
                    <div className="med-top">
                      <div>
                        <h3 className="med-name">{med.name}</h3>
                        <span className="med-dose-count">
                          {med.schedule.length} time{med.schedule.length > 1 ? "s" : ""} per day
                        </span>
                        {med.dosageText ? <span className="med-dose-count"> / {med.dosageText}</span> : null}
                      </div>

                      <div className="med-top-right">
                        <span className="meal-tag">{med.beforeAfterMeal === "Before" ? "Before Meal" : "After Meal"}</span>
                        <button className="edit-btn" title="Edit" onClick={() => openEditPopup(med)}><FaPen /></button>
                        <button className="delete-btn" title="Delete" onClick={() => removeMedication(med.id)}><FaTrash /></button>
                      </div>
                    </div>

                    <div className="med-schedule">
                      {med.schedule.map((time, index) => (
                        <button key={`${med.id}-${index}`} className={`time-btn ${med.done && med.done[index] ? "done" : ""}`} onClick={() => toggleDoseDone(med.id, index)}>
                          {formatDisplayTime(time)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="add-med-bottom">
              <button className="add-med-btn" onClick={openAddPopup}><FaPlus /> Add Medicine</button>
            </div>
          </div>

          <div className="right-area">
            <button className="reminder-btn water" onClick={() => navigate("/reminder/water")}>
              <GiWaterDrop className="reminder-icon" /> Water
            </button>
          </div>
        </div>

        {showPopup && (
          <div className="medform-overlay" onClick={closePopup}>
            <div className="medform-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
              <div className="medform-top-shape"></div>
              <div className="medform-header">
                <div className="medform-icon"><FaPills /></div>
                <div><h2>{editingId ? "Edit Medicine" : "Add Medicine"}</h2><p>Set your medicine details and daily reminder times.</p></div>
              </div>

              <div className="medform-body">
                <div className="medform-group medform-full">
                  <label><FaPills /> Medicine Name</label>
                  <input type="text" value={newMed.name} onChange={(e) => setNewMed({ ...newMed, name: e.target.value })} placeholder="e.g. Vitamin D" />
                </div>

                <div className="medform-group medform-full">
                  <label><FaPills /> Dosage</label>
                  <input type="text" value={newMed.dosageText} onChange={(e) => setNewMed({ ...newMed, dosageText: e.target.value })} placeholder="e.g. 1 tablet" />
                </div>

                <div className="medform-group medform-full">
                  <label><FaClock /> Times Per Day</label>
                  <input type="number" min="1" max="8" value={newMed.timesPerDay} onChange={(e) => handleTimesPerDayChange(e.target.value)} />
                </div>

                <div className="medform-group medform-full">
                  <label><FaClock /> Time</label>
                  <div className="medform-time-list">
                    {newMed.schedule.map((time, index) => (
                      <div className="medform-time-card" key={index}>
                        <span>Dose {index + 1}</span>
                        <input type="time" value={time} onChange={(e) => handleScheduleChange(index, e.target.value)} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="medform-group medform-full">
                  <label><FaUtensils /> Before or After Meal</label>
                  <div className="medform-meal-options">
                    <button type="button" className={newMed.beforeAfterMeal === "Before" ? "medform-meal-choice active" : "medform-meal-choice"} onClick={() => setNewMed({ ...newMed, beforeAfterMeal: "Before" })}>Before Meal</button>
                    <button type="button" className={newMed.beforeAfterMeal === "After" ? "medform-meal-choice active" : "medform-meal-choice"} onClick={() => setNewMed({ ...newMed, beforeAfterMeal: "After" })}>After Meal</button>
                  </div>
                </div>

                {formError ? <p className="medform-error">{formError}</p> : null}

                <div className="medform-actions">
                  <button className="medform-cancel" onClick={closePopup}>Cancel</button>
                  <button className="medform-submit" onClick={handleAddMedication}>{editingId ? "Save Changes" : "Add Medicine"}</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
