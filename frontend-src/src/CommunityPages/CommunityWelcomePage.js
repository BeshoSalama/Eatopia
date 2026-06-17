import "./CommunityWelcomePage.css";
import BgImage from "../assets/CommunityImage.png"; // ← ضع خلفيتك هنا
import Avatar from "../assets/rafiki.png"; // ← اللوجو الصغير (John)
import Navbar from "../components/Navbar";
import GroupIcon from "../assets/groupIcon.png";
import { Link } from "react-router-dom";
export default function CommunityWelcomePage() {
  return (
    <div className="hero-wrapper">
      <Navbar />

      {/* ========= HERO SECTION ========= */}
      <section className="hero" style={{ backgroundImage: `url(${BgImage})` }}>
        {/* LEFT SIDE TEXT */}
        <div className="hero-left">
          <h1>
            Create Community & <br /> make friends
          </h1>

          <p>
            Join or create community with people who have the same hobby with
            you
          </p>

          <Link to="/communityHomePage">
            <button className="join-btn">
              JOIN NOW
              <span className="btn-icon">
                <img src={GroupIcon} alt="Community" />
              </span>
            </button>
          </Link>
        </div>

        {/* RIGHT SIDE IMAGE */}
        <div className="hero-right">
          <img src={Avatar} alt="Community" />
        </div>
      </section>
    </div>
  );
}
