import React, { useState, useRef, useEffect } from "react";

function FinishScreen({
  points,
  maxPossiblePoints,
  highscore,
  candidateName,
  saveStatus,
  dispatch,
  numQuestions,
  answers,
  questions,
  flaggedQuestions = [],
  examMode,
  selectedBankName,
  onReviewExam,
  onRetakeAll,
  onRetakeFlagged,
  onRetakeIncorrect,
}) {
  const [isRetakeMenuOpen, setIsRetakeMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsRetakeMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const percentage =
    maxPossiblePoints > 0 ? (points / maxPossiblePoints) * 100 : 0;
  const ciscoScaleScore = Math.round(300 + (percentage / 100) * 700); // 300 - 1000 scale
  const isPassed = ciscoScaleScore >= 825 || percentage >= 82.5;

  let answeredCount = 0;
  let correctCount = 0;
  const incorrectIndices = [];

  questions.forEach((q, idx) => {
    const ans = answers ? answers[idx] : null;
    if (ans !== null && ans !== undefined) {
      answeredCount++;
      if (q.type === "drag_drop" || q.dragDropData) {
        if (ans?.confirmed && ans?.isCorrect) {
          correctCount++;
        } else {
          incorrectIndices.push(idx);
        }
      } else {
        const correctArr = Array.isArray(q.correctOption)
          ? q.correctOption
          : [q.correctOption];
        if (typeof ans === "number") {
          if (correctArr.includes(ans)) {
            correctCount++;
          } else {
            incorrectIndices.push(idx);
          }
        } else if (ans.selections) {
          const sels = ans.selections || [];
          if (
            sels.length === correctArr.length &&
            correctArr.every((c) => sels.includes(c))
          ) {
            correctCount++;
          } else {
            incorrectIndices.push(idx);
          }
        } else {
          incorrectIndices.push(idx);
        }
      }
    } else {
      incorrectIndices.push(idx);
    }
  });

  const flaggedCount = flaggedQuestions.length;
  const incorrectCount = incorrectIndices.length;

  return (
    <div className="finish-screen-container">
      <div className={`cisco-score-report-card ${isPassed ? "card-pass" : "card-fail"}`}>
        <div className="report-header">
          <div className="report-title-area">
            <span className="report-sub">Final Score: ExSim-Max for Cisco 200-301 CCNA</span>
            <h2 className="report-main-title">{selectedBankName || "CCNA Examination"}</h2>
          </div>
          <div className={`report-status-badge ${isPassed ? "badge-pass" : "badge-fail"}`}>
            {isPassed ? "PASS ✓" : "FAIL ✕"}
          </div>
        </div>

        {candidateName && (
          <div className="report-candidate-bar">
            Candidate: <strong>{candidateName}</strong>
            <span className="candidate-bar-sep">•</span>
            Exam Mode: <strong>{examMode === "study" ? "Study Mode" : "Simulation Mode"}</strong>
          </div>
        )}

        <div className="report-metrics-grid">
          <div className="metric-box">
            <span className="metric-label">Your Scaled Score</span>
            <span className="metric-value highlight">{ciscoScaleScore}</span>
            <span className="metric-meta">out of 1000 ({points} Points)</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">Passing Score</span>
            <span className="metric-value">825</span>
            <span className="metric-meta">Required (82.5%)</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">Accuracy Percentage</span>
            <span className={`metric-value ${isPassed ? "text-green" : "text-danger"}`}>
              {percentage.toFixed(1)}%
            </span>
            <span className="metric-meta">{points} / {maxPossiblePoints} Points</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">Questions Summary</span>
            <span className="metric-value">{correctCount} / {numQuestions}</span>
            <span className="metric-meta">{answeredCount} Answered, {incorrectCount} Missed, {flaggedCount} Marked</span>
          </div>
        </div>

        {/* BOSON EXSIM SCORE BAR WITH PASSING SCORE PIN */}
        <div className="boson-score-bar-section">
          <div className="boson-score-track-wrap">
            <div className="boson-score-track">
              <div
                className={`boson-score-fill ${isPassed ? "fill-pass" : "fill-fail"}`}
                style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
              ></div>
            </div>
            <div className="boson-passing-pin" style={{ left: "82.5%" }}>
              <div className="pin-triangle">▲</div>
              <span className="pin-label">Passing Score</span>
            </div>
          </div>
        </div>

        <div className="report-footer-info">
          {saveStatus && <span className="save-status-indicator">💾 {saveStatus}</span>}
        </div>

        {/* ACTION BUTTONS & RETAKE DROPDOWN */}
        <div className="report-action-buttons">
          {/* RETAKE DROPDOWN */}
          <div className="retake-dropdown-container" ref={menuRef}>
            <button
              type="button"
              className="btn-report-retake-toggle"
              onClick={() => setIsRetakeMenuOpen((prev) => !prev)}
            >
              <span>↺ Retake Exam ▾</span>
            </button>

            {isRetakeMenuOpen && (
              <div className="retake-dropdown-menu">
                <button
                  type="button"
                  className="retake-dropdown-item"
                  onClick={() => {
                    setIsRetakeMenuOpen(false);
                    if (onReviewExam) {
                      onReviewExam();
                    } else {
                      dispatch({ type: "reviewExam", payload: 0 });
                    }
                  }}
                >
                  <span className="item-icon">↶</span>
                  <div className="item-text-wrap">
                    <strong>Revise Previous Answers</strong>
                    <span className="item-sub">Review completed questions & show explanations</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="retake-dropdown-item"
                  onClick={() => {
                    setIsRetakeMenuOpen(false);
                    if (onRetakeAll) {
                      onRetakeAll();
                    } else {
                      dispatch({ type: "restart" });
                    }
                  }}
                >
                  <span className="item-icon">↺</span>
                  <div className="item-text-wrap">
                    <strong>Retake All Questions</strong>
                    <span className="item-sub">Start same exam from scratch ({numQuestions} Qs)</span>
                  </div>
                </button>

                <button
                  type="button"
                  className={`retake-dropdown-item ${flaggedCount === 0 ? "disabled" : ""}`}
                  disabled={flaggedCount === 0}
                  onClick={() => {
                    if (flaggedCount === 0) return;
                    setIsRetakeMenuOpen(false);
                    if (onRetakeFlagged) onRetakeFlagged();
                  }}
                >
                  <span className="item-icon">⚑</span>
                  <div className="item-text-wrap">
                    <strong>Retake Marked Questions</strong>
                    <span className="item-sub">{flaggedCount > 0 ? `${flaggedCount} marked for review` : "No marked questions"}</span>
                  </div>
                </button>

                <button
                  type="button"
                  className={`retake-dropdown-item ${incorrectCount === 0 ? "disabled" : ""}`}
                  disabled={incorrectCount === 0}
                  onClick={() => {
                    if (incorrectCount === 0) return;
                    setIsRetakeMenuOpen(false);
                    if (onRetakeIncorrect) onRetakeIncorrect();
                  }}
                >
                  <span className="item-icon">✕</span>
                  <div className="item-text-wrap">
                    <strong>Retake Incorrect Questions</strong>
                    <span className="item-sub">{incorrectCount > 0 ? `${incorrectCount} incorrect/missed` : "All answers correct!"}</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            className="btn-report-review"
            onClick={() => {
              if (onReviewExam) {
                onReviewExam();
              } else {
                dispatch({ type: "reviewExam", payload: 0 });
              }
            }}
          >
            🔍 Review All Questions
          </button>

          <button
            type="button"
            className="btn-report-restart"
            onClick={() => dispatch({ type: "restart" })}
          >
            ⌂ Back to Exam Selection
          </button>
        </div>
      </div>
    </div>
  );
}

export default FinishScreen;
