import "./Home.css";
import grilledStake from "../assets/grilledSteak.png";
import buddhaBowl from "../assets/buddhaBowl.png";
import bananaCookies from "../assets/bananaOatCookies.png";
import grilledFish from "../assets/grilledFish.png";
import sweetPotato from "../assets/sweetPotato.png";
import { Link, useNavigate } from "react-router-dom";

const highlightedRecipes = [
  {
    title: "Buddha Bowl",
    recipeName: "Roasted Chickpea Buddha Bowl",
    description:
      "A vibrant, nutritious bowl filled with a mix of fresh vegetables, plant-based protein, and wholesome grains. It offers a balanced, energizing meal all in one bowl.",
    image: buddhaBowl,
    large: true,
  },
  {
    title: "Grilled fish",
    recipeName: "Grilled Cod with Bok Choy",
    description:
      "Tender, flavorful fish cooked over an open flame for a smoky taste and a light, healthy meal.",
    image: grilledFish,
  },
  {
    title: "Oven-Baked Sweet Potato",
    recipeName: "Sweet Potato Toast",
    description:
      "Soft and naturally sweet potatoes baked to perfection, rich in fiber and vitamins for a healthy, satisfying meal.",
    image: sweetPotato,
  },
  {
    title: "Banana Oat Cookies",
    recipeName: "Oatmeal with Banana",
    description:
      "Soft, naturally sweet cookies made with bananas and oats — a healthy treat packed with fiber and energy.",
    image: bananaCookies,
  },
  {
    title: "Grilled steak & brown rice",
    recipeName: "Beef and Broccoli Stir-Fry",
    description:
      "Juicy, tender steak served with hearty brown rice — a protein-packed, balanced meal full of flavor and energy.",
    image: grilledStake,
  },
];

export default function Recipes() {
  const navigate = useNavigate();
  const [featured, ...smallCards] = highlightedRecipes;

  const goToRecipe = (recipeName) => {
    navigate("/recipes", {
      state: {
        selectedRecipeName: recipeName,
      },
    });
  };

  const renderCard = (recipe, extraClass = "") => (
    <article
      key={recipe.title}
      className={`blog-card ${extraClass}`.trim()}
      role="button"
      tabIndex={0}
      onClick={() => goToRecipe(recipe.recipeName)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          goToRecipe(recipe.recipeName);
        }
      }}
      aria-label={`Open ${recipe.title} recipe`}
    >
      <img src={recipe.image} alt={recipe.title} />

      <div className="content">
        <h3>{recipe.title}</h3>
        <p>{recipe.description}</p>
      </div>
    </article>
  );

  return (
    <section className="blog-section">
      <div className="blog-header">
        <h2>Our Recipes</h2>

        <Link className="read-btn" to="/recipes">
          Read All <span>→</span>
        </Link>
      </div>

      <div className="blog-container">
        {renderCard(featured, "large")}

        <div className="small-cards">
          {smallCards.map((recipe) => renderCard(recipe, "small"))}
        </div>
      </div>
    </section>
  );
}