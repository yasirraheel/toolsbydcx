import React from "react";

function MobileBottomBar({
  currentView,
  onNavigate,
  savedCount = 0,
  historyCount = 0,
  notesCount = 0,
  onOpenNotes,
  isExamActive = false,
  onOpenReviewMatrix,
  onGradeExam,
  isReviewMode = false,
  onExitReview,
  onToggleFlag,
  isCurrentFlagged = false,
  onOpenSettings,
  currentUser,
  onOpenAuth,
}) {
  if (isExamActive) {
    // Exam Active Bottom Bar
    return (
      <nav className="mobile-app-bottom-bar exam-active-bar" aria-label="Exam Actions">
        {/* Toggle Flag / Bookmark */}
        <button
          type="button"
          className={`mobile-bar-btn ${isCurrentFlagged ? "active-flag" : ""}`}
          onClick={onToggleFlag}
          title={isCurrentFlagged ? "Marked for review" : "Mark for review"}
        >
          <div className="mobile-bar-icon-wrap">
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill={isCurrentFlagged ? "#ef4444" : "none"}
              stroke={isCurrentFlagged ? "#ef4444" : "currentColor"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7" />
            </svg>
          </div>
          <span className="mobile-bar-label">
            {isCurrentFlagged ? "Marked" : "Review"}
          </span>
        </button>

        {/* Notes */}
        <button
          type="button"
          className={`mobile-bar-btn ${notesCount > 0 ? "has-badge" : ""}`}
          onClick={onOpenNotes}
          title="Question Notes"
        >
          <div className="mobile-bar-icon-wrap">
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {notesCount > 0 && <span className="mobile-bar-badge">{notesCount}</span>}
          </div>
          <span className="mobile-bar-label">Notes</span>
        </button>

        {/* Question Review Grid Matrix */}
        <button
          type="button"
          className="mobile-bar-btn highlight-grid"
          onClick={onOpenReviewMatrix}
          title="All Questions Matrix"
        >
          <div className="mobile-bar-icon-wrap">
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="currentColor"
            >
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
          </div>
          <span className="mobile-bar-label">Matrix</span>
        </button>

        {/* Grade / Exit Review */}
        {isReviewMode ? (
          <button
            type="button"
            className="mobile-bar-btn exit-review-btn"
            onClick={onExitReview}
            title="Exit Review"
          >
            <div className="mobile-bar-icon-wrap">
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </div>
            <span className="mobile-bar-label">Exit Review</span>
          </button>
        ) : (
          <button
            type="button"
            className="mobile-bar-btn grade-btn"
            onClick={onGradeExam}
            title="Finish & Grade Exam"
          >
            <div className="mobile-bar-icon-wrap">
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <span className="mobile-bar-label">Grade</span>
          </button>
        )}
      </nav>
    );
  }

  // General App Dashboard Navigation Bottom Bar
  return (
    <nav className="mobile-app-bottom-bar" aria-label="Main Navigation">
      {/* 1. Home / Dashboard */}
      <button
        type="button"
        className={`mobile-bar-btn ${currentView === "dashboard" ? "active" : ""}`}
        onClick={() => onNavigate("dashboard")}
      >
        <div className="mobile-bar-icon-wrap">
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <span className="mobile-bar-label">Home</span>
      </button>

      {/* 2. My Saved / In-Progress Exams */}
      <button
        type="button"
        className={`mobile-bar-btn ${currentView === "resume-exams" ? "active" : ""}`}
        onClick={() => {
          if (!currentUser && onOpenAuth) {
            onOpenAuth("login");
          } else {
            onNavigate("resume-exams");
          }
        }}
      >
        <div className="mobile-bar-icon-wrap">
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          {savedCount > 0 && <span className="mobile-bar-badge">{savedCount}</span>}
        </div>
        <span className="mobile-bar-label">Saved</span>
      </button>

      {/* 3. Exam History & Scores */}
      <button
        type="button"
        className={`mobile-bar-btn ${currentView === "history" ? "active" : ""}`}
        onClick={() => {
          if (!currentUser && onOpenAuth) {
            onOpenAuth("login");
          } else {
            onNavigate("history");
          }
        }}
      >
        <div className="mobile-bar-icon-wrap">
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {historyCount > 0 && <span className="mobile-bar-badge">{historyCount}</span>}
        </div>
        <span className="mobile-bar-label">History</span>
      </button>

      {/* 4. Candidate Account / Sign In */}
      <button
        type="button"
        className={`mobile-bar-btn ${!currentUser ? "auth-prompt" : ""}`}
        onClick={() => {
          if (currentUser) {
            onNavigate("dashboard");
          } else if (onOpenAuth) {
            onOpenAuth("login");
          }
        }}
      >
        <div className="mobile-bar-icon-wrap">
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <span className="mobile-bar-label">
          {currentUser ? (currentUser.name ? currentUser.name.split(" ")[0] : "Account") : "Sign In"}
        </span>
      </button>
    </nav>
  );
}

export default MobileBottomBar;
