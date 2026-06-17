import React, { useEffect, useState } from "react";
import "./Home.css";

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function DishDetails({
  imageSrc,
  nutrients = [],
  dishName,
  isLoading = false,
  error = "",
  isFood,
  message = "",
  mealGrams = 100,
  onMealGramsChange,
  ingredients = [],
  instructions = [],
}) {
  const isNonFood = isFood === false;
  const safeNutrients = nutrients.length ? nutrients : [];
  const [gramsInput, setGramsInput] = useState(String(mealGrams || 100));
  const [animatedValues, setAnimatedValues] = useState(
    safeNutrients.map(() => 0)
  );

  useEffect(() => {
    setGramsInput(String(mealGrams || 100));
  }, [mealGrams]);

  useEffect(() => {
    const nextNutrients = nutrients.length ? nutrients : [];

    setAnimatedValues(nextNutrients.map(() => 0));

    const duration = 1200;
    const start = performance.now();

    const animate = (time) => {
      const progress = Math.min((time - start) / duration, 1);
      setAnimatedValues(
        nextNutrients.map((n) => Math.floor((n.value || 0) * progress))
      );
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [nutrients]);

  const applyMealGrams = (event) => {
    event.preventDefault();
    const nextGrams = Number(gramsInput);
    if (!Number.isFinite(nextGrams)) return;
    onMealGramsChange?.(Math.min(2000, Math.max(1, Math.round(nextGrams))));
  };

  return (
    <section className="dish-section" id="dish-details-section">
      <h2 className="dish-title">Dish Details</h2>

      <div className="dish-content">
        <div className="dish-image-container">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={dishName || "Uploaded Dish"}
              className="dish-image"
            />
          ) : (
            <div className="dish-image-placeholder">No image selected</div>
          )}
        </div>

        <div className="dish-info-card">
          <div className={`dish-name-pill${isNonFood ? " dish-name-pill-warning" : ""}`}>
            <span>{dishName || "Predicted Dish Name"}</span>
          </div>

          {isLoading && (
            <div className="dish-status">Analyzing your meal...</div>
          )}

          {error && <div className="dish-error">{error}</div>}

          {!isLoading && !error && isNonFood && (
            <div className="dish-warning">
              <strong>This does not look like food</strong>
              <span>
                {message ||
                  "Upload a clear photo of a meal, snack, drink, or ingredient."}
              </span>
            </div>
          )}

          {!isLoading && !error && !isNonFood && (
            <form className="dish-grams-control" onSubmit={applyMealGrams}>
              <div className="dish-grams-copy">
                <span>Meal weight</span>
                <strong>{mealGrams}g</strong>
                <small>Nutrition updates from a 100g estimate.</small>
              </div>
              <label>
                <span>Grams</span>
                <input
                  type="number"
                  min="1"
                  max="2000"
                  step="1"
                  value={gramsInput}
                  onChange={(event) => setGramsInput(event.target.value)}
                />
              </label>
              <button type="submit">Apply grams</button>
            </form>
          )}

          {!isLoading && !error && !isNonFood && (
          <div className="nutrients-circles-grid">
            {safeNutrients.map((item, i) => {
              const value = item.value || 0;
              const percent = Math.max(0, Math.min(value / 1000, 1));
              const offset = CIRCUMFERENCE * (1 - percent);

              let circleColor = "#22c55e";
              if (value > 700) {
                circleColor = "#ef4444";
              } else if (value > 400) {
                circleColor = "#f59e0b";
              }

              return (
                <div key={i} className="nutrient-circle">
                  <div className="circle-outer">
                    <div className="circle-wrapper">
                      <svg className="circle-svg" viewBox="0 0 140 140">
                        <circle
                          className="circle-bg"
                          cx="70"
                          cy="70"
                          r={RADIUS}
                        />
                        <circle
                          className="circle-progress-path"
                          cx="70"
                          cy="70"
                          r={RADIUS}
                          style={{
                            stroke: circleColor,
                            strokeDasharray: CIRCUMFERENCE,
                            strokeDashoffset: offset,
                          }}
                        />
                      </svg>

                      <div className="circle-inner">
                        <span className="circle-value">
                          {animatedValues[i]}
                        </span>
                        <span className="circle-label-inside">
                          {item.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          )}

          {!isNonFood && ingredients?.length > 0 && (
            <div className="dish-extra">
              <h3>Detected ingredients</h3>
              <p>{ingredients.slice(0, 8).join(", ")}</p>
            </div>
          )}

          {!isNonFood && instructions?.length > 0 && (
            <div className="dish-extra">
              <h3>Recipe hints</h3>
              <p>{instructions.slice(0, 3).join(" ")}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
