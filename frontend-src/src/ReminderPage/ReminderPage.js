import React from "react";
import "./ReminderPage.css";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import { GiMedicines } from "react-icons/gi";
import { GiWaterDrop } from "react-icons/gi";

export default function ReminderPage() {
  const navigate = useNavigate();

  return (
    <>
      <Navbar />
      <section className="reminder-hero">
        <div className="reminder-container">
          <h1 className="reminder-main-title">Reminder</h1>
          <p className="reminder-subtitle">Stay Healthy, Stay On Track</p>

          <div className="reminder-buttons">
            <button
              className="reminder-btn medication"
              onClick={() => navigate("/reminder/medication")}
            >
              <GiMedicines className="reminder-icon" />
              Medication
            </button>
            <button
              className="reminder-btn water"
              onClick={() => navigate("/reminder/water")}
            >
              <GiWaterDrop className="reminder-icon" />
              Water
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
