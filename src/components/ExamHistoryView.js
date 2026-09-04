import React, { useState } from "react";
import NavigationMenu from "./NavigationMenu";
import CustomConfirmModal from "./CustomConfirmModal";

function ExamHistoryView({
  pastExams = [],
  onNavigate,
  candidateName,
  onClearHistory,
  onReviewExam,
  onRetakeAll,
  onRetakeFlagged,
  onRetakeIncorrect,
  onDeleteRecord,
  currentUser,
  onOpenAuth,
  onLogout,
}) {
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Delete",
    cancelText: "Cancel",
    type: "danger",
    onConfirm: () => {},
  });

  const handleDeleteItemClick = (exam) => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete Exam Record?",
      message: `Are you sure you want to delete the completed record for "${exam.bankName || "CCNA Exam"}"? This action cannot be undone.`,
      confirmText: "Delete Record",
      cancelText: "Cancel",
      type: "danger",
      onConfirm: () => {
        onDeleteRecord(exam.id);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleClearAllClick = () => {
    setConfirmDialog({
      isOpen: true,
      title: "Clear All Exam History?",
      message: "Are you sure you want to permanently delete all completed exam records? All past scores and review histories will be lost.",
      confirmText: "Clear All History",
      cancelText: "Cancel",
      type: "danger",
      onConfirm: () => {
        onClearHistory();
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  return (
    <div className="exam-history-page">
      <NavigationMenu
        currentView="history"
        onNavigate={onNavigate}
        candidateName={candidateName}
        currentUser={currentUser}
        onOpenAuth={onOpenAuth}
        onLogout={onLogout}
        pageTitle="Exam History"
      />

      <div className="history-content history-content-fullwidth">
        <div className="history-header-row">
          <div>
            <h2 className="history-section-title">Completed Exam History</h2>
            <p className="history-section-subtitle">
              Review previous exam attempts, re-test missed or marked questions, and track score progress.
            </p>
          </div>
          {pastExams.length > 0 && (
            <button
              type="button"
              className="btn-clear-history"
              onClick={handleClearAllClick}
            >
              🗑️ Clear All History
            </button>
          )}
        </div>

        {pastExams.length === 0 ? (
          <div className="empty-history-card">
            <span className="empty-icon">📊</span>
            <h3>No past exam records found</h3>
            <p>Once you finish and grade an exam, your detailed score records, review options, and retake actions will appear here.</p>
            <button
              type="button"
              className="btn-start-new-exam-home"
              onClick={() => onNavigate("dashboard")}
            >
              + Start an Exam
            </button>
          </div>
        ) : (
          <div className="history-rows-list">
            {pastExams.map((exam, idx) => {
              const dateStr = exam.date
                ? new Date(exam.date).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Recent";

              const flaggedCount = exam.flaggedQuestions ? exam.flaggedQuestions.length : 0;
              const hasQuestions = exam.questions && exam.questions.length > 0;
              const pctNum = parseFloat(exam.percentage) || 0;
              const isPassed = exam.passed;

              return (
                <div
                  key={exam.id || idx}
                  className={`history-full-card ${isPassed ? "pass-border" : "fail-border"}`}
                >
                  {/* TOP HEADER BAR */}
                  <div className="history-card-top-bar">
                    <div className="history-title-group">
                      <span className="history-badge-cert">Cisco 200-301 CCNA</span>
                      <h3 className="history-card-bank-name">{exam.bankName || "CCNA Exam"}</h3>
                      <span className="history-card-date">🕒 {dateStr}</span>
                    </div>

                    <div className="history-header-actions-right">
                      <span
                        className={`history-result-badge-large ${
                          isPassed ? "badge-pass-lg" : "badge-fail-lg"
                        }`}
                      >
                        {isPassed ? "PASS ✓" : "FAIL ✕"}
                      </span>

                      {onDeleteRecord && (
                        <button
                          type="button"
                          className="btn-history-delete-pill"
                          onClick={() => handleDeleteItemClick(exam)}
                          title="Delete this exam record"
                        >
                          🗑️ Delete
                        </button>
                      )}
                    </div>
                  </div>

                  {/* METRICS ROW */}
                  <div className="history-metrics-grid">
                    <div className="history-metric-box">
                      <span className="metric-lbl">Raw Score</span>
                      <strong className="metric-val">{exam.score} / {exam.maxScore || 1000}</strong>
                      <span className="metric-sub">Points Earned</span>
                    </div>

                    <div className="history-metric-box">
                      <span className="metric-lbl">Percentage</span>
                      <strong className={`metric-val ${isPassed ? "text-green" : "text-danger"}`}>
                        {exam.percentage}%
                      </strong>
                      <span className="metric-sub">Overall Accuracy</span>
                    </div>

                    <div className="history-metric-box">
                      <span className="metric-lbl">Passing Score</span>
                      <strong className="metric-val">82.5%</strong>
                      <span className="metric-sub">Required Mark</span>
                    </div>

                    <div className="history-metric-box">
                      <span className="metric-lbl">Total Questions</span>
                      <strong className="metric-val">
                        {exam.totalQuestions || (exam.questions ? exam.questions.length : 0)} Qs
                      </strong>
                      <span className="metric-sub">
                        {flaggedCount > 0 ? `⚑ ${flaggedCount} marked` : "Completed"}
                      </span>
                    </div>
                  </div>

                  {/* BOSON SCORE PROGRESS BAR */}
                  <div className="history-score-bar-wrapper">
                    <div className="history-score-bar-bg">
                      <div
                        className={`history-score-bar-fill ${isPassed ? "fill-pass" : "fill-fail"}`}
                        style={{ width: `${Math.min(100, Math.max(0, pctNum))}%` }}
                      ></div>
                      {/* 82.5% passing marker */}
                      <div className="history-score-bar-marker" style={{ left: "82.5%" }}>
                        <div className="marker-tooltip">▲ 82.5% Passing</div>
                      </div>
                    </div>
                  </div>

                  {/* ACTIONS BAR */}
                  {hasQuestions && (
                    <div className="history-full-actions-bar">
                      <button
                        type="button"
                        className="btn-history-action btn-history-review"
                        onClick={() => onReviewExam(exam)}
                      >
                        🔍 Review Exam (Read-Only)
                      </button>

                      <button
                        type="button"
                        className="btn-history-action btn-history-retake-all"
                        onClick={() => onRetakeAll(exam)}
                      >
                        ↺ Retake All Questions
                      </button>

                      <button
                        type="button"
                        className={`btn-history-action btn-history-retake-flagged ${
                          flaggedCount === 0 ? "disabled" : ""
                        }`}
                        disabled={flaggedCount === 0}
                        onClick={() => flaggedCount > 0 && onRetakeFlagged(exam)}
                        title={flaggedCount > 0 ? `Retake ${flaggedCount} marked questions` : "No marked questions"}
                      >
                        ⚑ Retake Flagged Only {flaggedCount > 0 ? `(${flaggedCount})` : ""}
                      </button>

                      <button
                        type="button"
                        className="btn-history-action btn-history-retake-incorrect"
                        onClick={() => onRetakeIncorrect(exam)}
                      >
                        ✕ Retake Incorrect Only
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CONFIRMATION MODAL */}
      <CustomConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        type={confirmDialog.type}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

export default ExamHistoryView;
