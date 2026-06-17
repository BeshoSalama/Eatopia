import { useRef, useState } from "react";
import "./Home.css";
import ButtonIcon from "../assets/Scan.png";
import HomeImage from "../assets/HomeImage.png";

export default function Hero({ onImageSelect }) {
  const uploadInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [showPopup, setShowPopup] = useState(false);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      onImageSelect(file, imageUrl);
    }
    event.target.value = "";
    setShowPopup(false);
  };

  return (
    <div>
      <section className="hero-section">
        <div
          className="hero-container"
          style={{ backgroundImage: `url(${HomeImage})` }}
        >
          <h1 className="hero-title">
            Make your Life <br /> Better
          </h1>

          <button
            type="button"
            className="hero-button"
            onClick={() => setShowPopup(true)}
          >
            <span>
              Snap <br />
              your <br />
              meal
            </span>
            <img src={ButtonIcon} alt="Upload" className="hero-button-icon" />
          </button>

          <input
            type="file"
            accept="image/*"
            ref={uploadInputRef}
            style={{ display: "none" }}
            onChange={handleFileChange}
          />

          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={cameraInputRef}
            style={{ display: "none" }}
            onChange={handleFileChange}
          />

          {showPopup && (
            <div className="popup-overlay" onClick={() => setShowPopup(false)}>
              <div
                className="popup-box"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="popup-title">Choose Option</h2>

                <button
                  type="button"
                  className="popup-btn"
                  onClick={() => uploadInputRef.current.click()}
                >
                  Upload Image
                </button>

                <button
                  type="button"
                  className="popup-btn"
                  onClick={() => cameraInputRef.current.click()}
                >
                  Take Photo
                </button>

                <button
                  type="button"
                  className="popup-btn cancel-btn"
                  onClick={() => setShowPopup(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
