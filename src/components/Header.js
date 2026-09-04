import React, { useState } from "react";
import Timer from "./Timer";
import CustomConfirmModal from "./CustomConfirmModal";

function Header({
  status,
  examMode,
  selectedBankName,
  secondsRemaining,
  dispatch,
  points,
  maxPossiblePoints,
  settings,
}) {
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  return (
    <header className="cisco-top-header">
      <div className="header-left">
        <div
          className="cisco-brand"
          onClick={() => {
            if (status === "active") {
              setShowExitConfirm(true);
            } else {
              dispatch({ type: "restart" });
            }
          }}
          style={{ cursor: "pointer" }}
          title="Return to Home Dashboard"
        >
          <span className="cisco-logo-symbol">⫸</span>
          <span className="cisco-logo-text">Cisco 200-301 CCNA</span>
        </div>
        {status === "active" && (
          <span className="header-bank-badge">{selectedBankName}</span>
        )}
      </div>

      <div className="header-right">
        {status === "active" && (
          <>
            <span
              className={`header-mode-badge ${
                examMode === "study" ? "badge-study" : "badge-sim"
              }`}
            >
              {examMode === "study" ? "📖 Study Mode" : "⏱️ Simulation Mode"}
            </span>

            {settings?.showScoreLive && (
              <span className="header-live-score">
                Score: <strong>{points}</strong> / {maxPossiblePoints} pts
              </span>
            )}

            {secondsRemaining !== null && (
              <Timer
                dispatch={dispatch}
                secondsRemaining={secondsRemaining}
              />
            )}

            <button
              type="button"
              className="btn-header-exit"
              onClick={() => setShowExitConfirm(true)}
              title="Return to Menu"
            >
              ⌂ Exit Exam
            </button>
          </>
        )}
      </div>

      <CustomConfirmModal
        isOpen={showExitConfirm}
        title="Exit Exam Confirmation"
        message="Are you sure you want to return to the Exam Bank selection? Current progress will be reset."
        confirmText="Exit Exam"
        cancelText="Cancel"
        type="warning"
        onConfirm={() => {
          setShowExitConfirm(false);
          dispatch({ type: "restart" });
        }}
        onCancel={() => setShowExitConfirm(false)}
      />
    </header>
  );
}

export default Header;
