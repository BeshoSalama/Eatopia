import DietPlan from "../assets/Diet Plan.png";
import Reminder from "../assets/Reminder.png";
import Recipes from "../assets/pana.png";
import Community from "../assets/Community.png";
import "./Home.css";
import { Link } from "react-router-dom";

const features = [
  {
    title: "Diet Plan",
    text: "Plan your diet according to your nutrition goals and track macros effortlessly.",
    image: DietPlan,
    to: "/dietplan",
  },
  {
    title: "Reminder",
    text: "Get timely reminders for meals and hydration to maintain healthy habits.",
    image: Reminder,
    to: "/reminder",
  },
  {
    title: "Recipes",
    text: "Quick, clear guides to creating flavorful dishes with everyday ingredients.",
    image: Recipes,
    to: "/recipes",
  },
  {
    title: "Community",
    text: "Join our community to learn and share experiences with like-minded people.",
    image: Community,
    to: "/community",
  },
];

export default function AllFeatures() {
  return (
    <section className="features-section">
      <div>
        <h1 className="feature-title">
          We also have unique
          <br /> features for your life
        </h1>

        <div className="features-btn">
          {features.map((feature) => (
            <Link key={feature.title} to={feature.to} className="feature-card">
              <img src={feature.image} alt={feature.title} className="feature-img" />
              <h3 className="feature-name">{feature.title}</h3>
              <p className="feature-text">{feature.text}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
