import React, { useState } from "react";
import NavigationMenu from "./NavigationMenu";
import CustomConfirmModal from "./CustomConfirmModal";

function ResumeExamsView({
  savedSessions = [],
  onResumeSession,
  onDeleteSession,
  onNavigate,
  candidateName,
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

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return "Just now";
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? "s" : ""} ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  };

  const handleDeleteSessionClick = (session) => {
    const bank = session.selectedBankName || "Exam A";
    setConfirmDialog({
      isOpen: true,
      title: "Discard Saved Exam Session?",
      message: `Are you sure you want to delete and discard your saved progress for "${bank}"? This action cannot be undone.`,
      confirmText: "Discard Session",
      cancelText: "Cancel",
      type: "danger",
      onConfirm: () => {
        onDeleteSession(session.id);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  return (
    <div className="resume-exams-page">
      <NavigationMenu
        currentView="resume-exams"
        onNavigate={onNavigate}
        candidateName={candidateName}
        currentUser={currentUser}
        onOpenAuth={onOpenAuth}
        onLogout={onLogout}
        pageTitle="Resume Exam"
      />

      <div className="resume-exams-content">
        {savedSessions.length === 0 ? (
          <div className="empty-sessions-card">
            <span className="empty-icon">📂</span>
            <h3>No in-progress exams found</h3>
            <p>Start a new exam from the Home Dashboard to track your progress here.</p>
            <button
              type="button"
              className="btn-start-new-exam-home"
              onClick={() => onNavigate("dashboard")}
            >
              + Start a New Exam
            </button>
          </div>
        ) : (
          <div className="resume-sessions-list">
            {savedSessions.map((session, index) => {
              const currentQ = (session.index || 0) + 1;
              const totalQ = session.questions?.length || 74;
              const progressPct = Math.min(
                100,
                Math.max(2, (currentQ / (totalQ || 1)) * 100)
              );

              return (
                <div key={session.id || index} className="resume-session-card">
                  <div className="session-card-header">
                    <h3 className="session-exam-title">
                      Cisco 200-301 CCNA
                    </h3>

                    <div className="session-header-right">
                      <span
                        className={`session-badge ${
                          session.examMode === "simulation"
                            ? "badge-sim"
                            : "badge-study"
                        }`}
                      >
                        {session.examMode === "simulation"
                          ? "Simulation Mode"
                          : "Study Mode"}
                      </span>

                      <span className="session-badge badge-bank">
                        {session.selectedBankName || "Exam A"}
                      </span>

                      <button
                        type="button"
                        className="btn-delete-session-icon"
                        onClick={() => handleDeleteSessionClick(session)}
                        title="Delete this saved session"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div className="session-meta-lines">
                    <div>
                      Started <strong>{formatRelativeTime(session.startedAt)}</strong>
                    </div>
                    <div>
                      Last accessed <strong>{formatRelativeTime(session.savedAt)}</strong>
                    </div>
                  </div>

                  <div className="session-progress-track">
                    <div
                      className="session-progress-fill"
                      style={{ width: `${progressPct}%` }}
                    ></div>
                  </div>

                  <div className="session-card-footer">
                    <span className="session-q-count">
                      {currentQ}/{totalQ}
                    </span>

                    <button
                      type="button"
                      className="btn-pickup-resume"
                      onClick={() => onResumeSession(session)}
                    >
                      Resume ➜
                    </button>
                  </div>
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

export default ResumeExamsView;
