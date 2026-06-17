import React, { useEffect, useMemo, useState } from "react";
import Hero from "./Hero";
import AllFeatures from "./AllFeatures";
import Recipes from "./Recipes";
import AboutUs from "./AboutUs";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import DishDetails from "./DishDetails";
import { API_BASE_URL } from "../config/api";

const defaultNutrients = [
  { label: "Carbs", value: 0 },
  { label: "Protein", value: 0 },
  { label: "Fats", value: 0 },
  { label: "Calories", value: 0 },
  { label: "Fiber", value: 0 },
  { label: "Sugar", value: 0 },
];

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : 0;
};

const clampMealGrams = (value) => {
  const grams = Number(value);
  if (!Number.isFinite(grams)) return 100;
  return Math.min(2000, Math.max(1, Math.round(grams)));
};

const getResultBaseGrams = (result) => {
  const baseGrams = Number(
    result?.servingGrams ||
      result?.serving_grams ||
      result?.portionGrams ||
      result?.portion_grams ||
      100
  );

  return Number.isFinite(baseGrams) && baseGrams > 0 ? baseGrams : 100;
};

const scaleNutrition = (value, factor) => toNumber((Number(value) || 0) * factor);

const buildNutrients = (result, mealGrams = 100) => {
  if (!result) return defaultNutrients;
  if (result.isFood === false) return defaultNutrients;

  const factor = clampMealGrams(mealGrams) / getResultBaseGrams(result);

  return [
    { label: "Carbs", value: scaleNutrition(result.carbs, factor) },
    { label: "Protein", value: scaleNutrition(result.protein, factor) },
    { label: "Fats", value: scaleNutrition(result.fat ?? result.fats, factor) },
    { label: "Calories", value: scaleNutrition(result.calories, factor) },
    { label: "Fiber", value: scaleNutrition(result.fiber, factor) },
    { label: "Sugar", value: scaleNutrition(result.sugar, factor) },
  ];
};

export default function Home() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [mealGrams, setMealGrams] = useState(100);
  const nutrients = useMemo(() => buildNutrients(scanResult, mealGrams), [scanResult, mealGrams]);
  const shouldShowDishDetails = Boolean(selectedImage || scanResult || scanError || isScanning);

  useEffect(() => {
    return () => {
      if (selectedImage?.startsWith("blob:")) {
        URL.revokeObjectURL(selectedImage);
      }
    };
  }, [selectedImage]);

  const scrollToDishDetails = () => {
    setTimeout(() => {
      document
        .getElementById("dish-details-section")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleImageSelect = async (file, imageUrl) => {
    setSelectedImage(imageUrl);
    setScanResult(null);
    setScanError("");
    setMealGrams(100);
    setIsScanning(true);
    scrollToDishDetails();

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch(`${API_BASE_URL}/ai/scan`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "Food scan failed.");
      }

      const nextResult = data?.result || data?.data || data;
      setScanResult(nextResult);
    } catch (error) {
      setScanError(error.message || "Food scan failed. Please try another image.");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="home">
      <Navbar />
      <Hero onImageSelect={handleImageSelect} />
      {shouldShowDishDetails && (
        <DishDetails
          imageSrc={selectedImage}
          nutrients={nutrients}
          dishName={scanResult?.foodName || "Uploaded Dish"}
          isLoading={isScanning}
          error={scanError}
          isFood={scanResult?.isFood}
          message={scanResult?.message || scanResult?.note}
          mealGrams={mealGrams}
          onMealGramsChange={setMealGrams}
          ingredients={scanResult?.ingredients}
          instructions={scanResult?.instructions}
        />
      )}
      <AllFeatures />
      <Recipes />
      <AboutUs />
      <Footer />
    </div>
  );
}
