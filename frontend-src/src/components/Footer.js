import React from "react";
import "./NavbarFooter.css";
import { Link } from "react-router-dom";
import brandLogo from "../assets/healthyfood-logo.png";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="eatopia-footer">
      <div className="eatopia-footer-container">
        <div className="eatopia-footer-content">
          {/* Column 1: Logo + About + Social */}
          <div className="eatopia-footer-col eatopia-footer-col-brand">
            <div className="eatopia-footer-brand-wrapper">
              <Link to="/" className="eatopia-footer-brand-link" aria-label="Eatopia home">
                <img src={brandLogo} alt="Eatopia" className="eatopia-footer-brand-logo" />
              </Link>
            </div>
            <p className="eatopia-footer-text">
              Eatopia helps you track your meals, follow your diet plan, and
              stay motivated with a supportive community.
            </p>
            <div className="eatopia-footer-social-links">
              <Link
                to="#"
                className="eatopia-footer-social-link"
                aria-label="Twitter"
              >
                <i className="fab fa-twitter"></i>
              </Link>
              <Link
                to="#"
                className="eatopia-footer-social-link"
                aria-label="Facebook"
              >
                <i className="fab fa-facebook-f"></i>
              </Link>
              <Link
                to="#"
                className="eatopia-footer-social-link"
                aria-label="Instagram"
              >
                <i className="fab fa-instagram"></i>
              </Link>
              <Link
                to="#"
                className="eatopia-footer-social-link"
                aria-label="Github"
              >
                <i className="fab fa-github"></i>
              </Link>
            </div>
          </div>

          {/* Column 2: Pages */}
          <div className="eatopia-footer-col eatopia-footer-col-links">
            <h4 className="eatopia-footer-heading">Pages</h4>
            <ul className="eatopia-footer-links">
              <li>
                <a href="/">Home</a>
              </li>
              <li>
                <a href="/profile">Profile</a>
              </li>
              <li>
                <a href="/recipes">Recipes</a>
              </li>
              <li>
                <a href="/dietplan">Diet Plan</a>
              </li>
              <li>
                <a href="/community">Community</a>
              </li>
              <li>
                <a href="/reminder">Reminder</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom: Dynamic Copyright */}
        <div className="eatopia-footer-bottom">
          <p>Copyright © {currentYear} Eatopia. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
