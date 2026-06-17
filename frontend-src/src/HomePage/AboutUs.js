import React, { useState, useEffect } from "react";
import "./Home.css";

export default function AboutUs() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="about-us-section">
      <div className="about-container">
        {/* Title */}
        <h1 className={`about-title ${isVisible ? "fade-in" : ""}`}>
          About Us
        </h1>

        {/* Vision and Mission Grid */}
        <div className="content-wrapper">
          {/* Our Vision */}
          <div className={`section vision ${isVisible ? "slide-in-left" : ""}`}>
            {/* Background Circle */}
            <div className="bg-circle"></div>

            {/* Icon */}
            <div className="icon-container">
              <div className="lightbulb-wrapper">
                {/* Light rays */}
                <div className="light-ray ray-1"></div>
                <div className="light-ray ray-2"></div>
                <div className="light-ray ray-3"></div>
                <div className="light-ray ray-4"></div>
                <div className="light-ray ray-5"></div>

                {/* Lightbulb */}
                <div className="lightbulb">
                  <svg viewBox="0 0 24 24">
                    <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z" />
                  </svg>
                </div>
                <div className="bulb-base-1"></div>
                <div className="bulb-base-2"></div>
              </div>
            </div>

            {/* Content */}
            <div className="content">
              <h2 className="section-title">
                Our
                <br />
                Vision
              </h2>
              <div className="text-content">
                <p>We believe every life carries a light and purpose.</p>
                <p>Wellness reflects gratitude for the gift of life.</p>
                <p>We create space to nurture body and heart.</p>
                <p>Our goal is to inspire strength and light.</p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="section-divider"></div>

          {/* Our Mission */}
          <div
            className={`section mission ${isVisible ? "slide-in-right" : ""}`}
          >
            {/* Background Circle */}
            <div className="bg-circle"></div>

            {/* Icon */}
            <div className="icon-container">
              <div className="arrow-wrapper">
                <svg viewBox="0 0 24 24">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                  <polyline points="17 6 23 6 23 12"></polyline>
                </svg>
              </div>
            </div>

            {/* Content */}
            <div className="content">
              <h2 className="section-title">
                Our
                <br />
                Mission
              </h2>
              <div className="text-content">
                <p>We walk with people to care for their lives.</p>
                <p>Our tools help honor the body as sacred.</p>
                <p>We build habits rooted in grace and purpose.</p>
                <p>Care becomes a reflection of love and light.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
