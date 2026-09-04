import React, { useState, useEffect } from "react";
import DragDropQuestion from "./DragDropQuestion";
import QuestionPaletteModal from "./QuestionPaletteModal";
import CustomConfirmModal from "./CustomConfirmModal";
import QuestionNotesModal from "./QuestionNotesModal";
import MobileBottomBar from "./MobileBottomBar";

function renderFormattedPrompt(rawText) {
  if (!rawText) return null;

  // Convert inline asterisk/bullet points like "following requirements: * It must..." into newlines
  const preformatted = rawText
    .replace(/([^\n])\s+[*•]\s+/g, "$1\n* ")
    .replace(/([^\n])\s+(\(Choose\s+)/gi, "$1\n\n$2");

  const lines = preformatted.split(/\r?\n/);
  const elements = [];
  let currentList = [];

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="prompt-bullet-list">
          {currentList.map((item, idx) => (
            <li key={idx} className="prompt-bullet-item">
              <span className="prompt-bullet-dot">▪</span>
              <span className="prompt-bullet-text">{item}</span>
            </li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((rawLine, idx) => {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      flushList();
      return;
    }

    const bulletMatch = trimmed.match(/^[*•-]\s*(.+)$/);
    if (bulletMatch) {
      currentList.push(bulletMatch[1]);
    } else {
      flushList();
      elements.push(
        <p key={`p-${idx}`} className="prompt-paragraph">
          {trimmed}
        </p>
      );
    }
  });

  flushList();

  return <div className="boson-question-prompt-content">{elements}</div>;
}

function QuestionView({
  question,
  seqNumber,
  numQuestions,
  answer,
  answers,
  questions,
  dispatch,
  examMode,
  settings,
  flaggedQuestions,
  revealedQuestions = [],
  isReviewMode = false,
  onToggleFlag,
  onGoToQuestion,
  onFinishExam,
  onExitReview,
  onExitToDashboard,
  points,
  maxPossiblePoints,
  candidateName,
  currentUser,
  secondsRemaining,
}) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [showPaletteModal, setShowPaletteModal] = useState(false);
  const [isNoteBoxOpen, setIsNoteBoxOpen] = useState(false);
  const [isAllNotesModalOpen, setIsAllNotesModalOpen] = useState(false);
  const [currentNoteText, setCurrentNoteText] = useState("");

  const [questionComments, setQuestionComments] = useState(() => {
    try {
      const stored = localStorage.getItem("ccna_question_comments");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    type: "warning",
    onConfirm: () => {},
  });

  const questionKey = question?.id || question?.questionNo || seqNumber;
  const existingComment = questionComments[questionKey] || questionComments[String(question?.id)] || "";

  useEffect(() => {
    setIsZoomed(false);
    setImgError(false);
    setCurrentNoteText(existingComment);
    setIsNoteBoxOpen(false);
  }, [question?.id, seqNumber, existingComment]);

  const handleSaveComment = (textToSave) => {
    const trimmed = textToSave ? textToSave.trim() : "";
    const updated = { ...questionComments };
    if (trimmed) {
      updated[questionKey] = trimmed;
    } else {
      delete updated[questionKey];
    }
    setQuestionComments(updated);
    try {
      localStorage.setItem("ccna_question_comments", JSON.stringify(updated));
    } catch (e) {
      console.warn("Save note error:", e);
    }

    // MySQL sync with userId / userEmail
    if (question?.id) {
      const notesApi = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" ? "http://localhost:5000/api/notes" : "/api/notes";
      fetch(notesApi, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser?.id || null,
          userEmail: currentUser?.email || null,
          candidateName: currentUser?.name || candidateName || "Candidate",
          questionId: question.id,
          questionNo: question.questionNo || `Question #${question.id}`,
          noteText: trimmed,
        }),
      }).catch(() => {});
    }

    setIsNoteBoxOpen(false);
  };

  const handleDeleteComment = (qKey) => {
    const targetKey = qKey || questionKey;
    const updated = { ...questionComments };
    delete updated[targetKey];
    if (question?.id) delete updated[String(question.id)];
    setQuestionComments(updated);
    if (targetKey === questionKey || String(targetKey) === String(question?.id)) {
      setCurrentNoteText("");
      setIsNoteBoxOpen(false);
    }
    try {
      localStorage.setItem("ccna_question_comments", JSON.stringify(updated));
    } catch (e) {
      console.warn("Delete note error:", e);
    }

    // MySQL sync
    const qId = Number(targetKey) || question?.id;
    if (qId) {
      const notesApi = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" ? "http://localhost:5000/api/notes" : "/api/notes";
      fetch(notesApi, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser?.id || null,
          userEmail: currentUser?.email || null,
          candidateName: currentUser?.name || candidateName || "Candidate",
          questionId: qId,
          questionNo: question?.questionNo || `Question #${qId}`,
          noteText: "",
        }),
      }).catch(() => {});
    }
  };

  const isDragDrop = question.type === "drag_drop" || Boolean(question.dragDropData);

  const correctOptions = Array.isArray(question.correctOption)
    ? question.correctOption
    : question.correctOption !== undefined && question.correctOption !== null
    ? [question.correctOption]
    : [];
  const isMulti = correctOptions.length > 1;

  const isFlagged = flaggedQuestions?.includes(seqNumber - 1);

  const selectedIndices = isMulti
    ? Array.isArray(answer)
      ? answer
      : answer?.selections || []
    : typeof answer === "number"
    ? [answer]
    : Array.isArray(answer)
    ? answer
    : answer?.selections || [];

  // Exhibit image source resolver
  const getExhibitUrl = (imgPath) => {
    if (!imgPath) return "";
    if (imgPath.startsWith("http://") || imgPath.startsWith("https://")) {
      return imgPath;
    }
    const clean = imgPath.replace(/^\/+/, "");
    const publicUrl = (process.env.PUBLIC_URL || "").replace(/\/+$/, "");
    return publicUrl ? `${publicUrl}/${clean}` : `/${clean}`;
  };

  const exhibitSrc = getExhibitUrl(question.exhibitImage);

  const isRevealed = Boolean(revealedQuestions?.includes(seqNumber - 1));
  const maxAllowed = isMulti ? correctOptions.length : 1;
  const isTimeOver = secondsRemaining !== null && secondsRemaining <= 0;

  const handleOptionClick = (index) => {
    // Once answer is revealed, in review mode, or time has expired, user cannot modify their selection
    if (isRevealed || isReviewMode || isTimeOver) return;

    if (isMulti) {
      const current = selectedIndices;
      if (current.includes(index)) {
        // Deselect clicked item
        const newSelections = current.filter((i) => i !== index);
        dispatch({ type: "multiSelect", payload: newSelections });
      } else {
        if (current.length < maxAllowed) {
          const newSelections = [...current, index];
          dispatch({ type: "multiSelect", payload: newSelections });
        } else if (maxAllowed > 0) {
          // Replace oldest selection if already at capacity
          const newSelections = [...current.slice(1), index];
          dispatch({ type: "multiSelect", payload: newSelections });
        }
      }
    } else {
      // Single choice: select or change to chosen option freely
      dispatch({ type: "newAnswer", payload: index });
    }
  };

  // Calculate live score percentage
  const livePercentage =
    maxPossiblePoints > 0 ? ((points / maxPossiblePoints) * 100).toFixed(1) : "0.0";

  const canGoPrev = seqNumber > 1;
  const canGoNext = seqNumber < numQuestions;

  const handleExitClick = () => {
    setConfirmDialog({
      isOpen: true,
      title: "Exit Exam Confirmation",
      message:
        "Are you sure you want to return to the Exam Bank selection? Your current exam progress will be reset.",
      confirmText: "Exit Exam",
      cancelText: "Continue Exam",
      type: "warning",
      onConfirm: () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        onExitToDashboard();
      },
    });
  };

  const handleGradeClick = () => {
    const answeredCount = answers.filter(
      (a) =>
        a !== null &&
        a !== undefined &&
        (typeof a === "number" || a?.confirmed || a?.selections?.length > 0)
    ).length;

    setConfirmDialog({
      isOpen: true,
      title: "Submit & Grade Exam",
      message: `You have answered ${answeredCount} of ${numQuestions} questions. Are you ready to submit and calculate your final score?`,
      confirmText: "Grade Exam Now",
      cancelText: "Return to Exam",
      type: "info",
      onConfirm: () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        onFinishExam();
      },
    });
  };

  const getInitials = (name) => {
    if (!name || !name.trim()) return "CC";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const candidateInitials = getInitials(candidateName);

  const formatTime = (secs) => {
    if (secs === null || secs === undefined) return null;
    const m = Math.floor(Math.abs(secs) / 60);
    const s = Math.abs(secs) % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const timerDisplay = formatTime(secondsRemaining);
  const timerIsLow = secondsRemaining !== null && secondsRemaining < 300;

  return (
    <div className="boson-exsim-view">
      {/* TOP NAVIGATION BAR: Back to Exam, Notes Button, Timer & User Avatar */}
      <div className="boson-top-bar">
        <div className="top-bar-left-actions">
          <button
            type="button"
            className="btn-boson-back"
            onClick={handleExitClick}
            title="Return to Exam Bank"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>Exam</span>
          </button>

          <button
            type="button"
            className={`btn-top-notes-summary ${
              Object.keys(questionComments).length > 0 ? "has-notes" : ""
            }`}
            onClick={() => setIsAllNotesModalOpen(true)}
            title="View all question notes and copy fix report for AI"
          >
            <span>💬 Notes ({Object.keys(questionComments).length})</span>
          </button>
        </div>

        <div className="top-bar-right-group">
          {/* TIMER PILL */}
          {timerDisplay && (
            <div className={`exam-timer-pill ${timerIsLow ? "timer-low" : ""}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>{timerDisplay}</span>
            </div>
          )}

          <div
            className="boson-user-avatar"
            title={candidateName ? `Candidate: ${candidateName}` : "CCNA Candidate"}
          >
            <span>{candidateInitials}</span>
          </div>
        </div>
      </div>

      {/* MAIN TITLE HEADER */}
      <div className="boson-main-header">
        <h1 className="boson-exam-title">
          Cisco 200-301 CCNA Exam Simulator
        </h1>

        <div className="boson-sub-header">
          <div className="boson-sub-left">
            <span className="boson-q-count">
              Question {seqNumber} of {numQuestions}
            </span>
            {settings?.showScoreLive !== false && (
              <>
                <span className="boson-dot-sep">•</span>
                <span className="boson-live-score">
                  {livePercentage}% correct
                </span>
              </>
            )}
            {question.questionNo && (
              <>
                <span className="boson-dot-sep">•</span>
                <span className="boson-qno-pill">{question.questionNo}</span>
              </>
            )}
            {isReviewMode && (
              <>
                <span className="boson-dot-sep">•</span>
                <span className="boson-review-badge">🔍 Review Mode (Read-Only)</span>
              </>
            )}
          </div>

          <div className="boson-sub-right-actions">
            {/* ADD / EDIT QUESTION NOTE BUTTON */}
            <button
              type="button"
              className={`btn-boson-note-toggle ${
                existingComment ? "has-active-note" : ""
              }`}
              onClick={() => setIsNoteBoxOpen((prev) => !prev)}
              title={
                existingComment
                  ? "Click to view or edit your note for this question"
                  : "Click to write a note/feedback for this question"
              }
            >
              {existingComment ? (
                <>
                  <svg
                    className="note-svg-icon"
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="currentColor"
                  >
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 10H6v-2h12v2zm0-3H6V7h12v2z" />
                  </svg>
                  <span>Note Attached ✓</span>
                </>
              ) : (
                <>
                  <svg
                    className="note-svg-icon"
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <span>Add Note</span>
                </>
              )}
            </button>

            {/* MARK FOR REVIEW BUTTON */}
            <button
              type="button"
              className={`btn-boson-flag ${isFlagged ? "is-flagged" : ""}`}
              onClick={() => onToggleFlag(seqNumber - 1)}
              title={isFlagged ? "Click to unmark review" : "Click to mark for review"}
            >
              {isFlagged ? (
                <>
                  <svg
                    className="flag-svg-icon flag-filled"
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="currentColor"
                  >
                    <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6h-5.6z" />
                  </svg>
                  <span>Marked for Review</span>
                </>
              ) : (
                <>
                  <svg
                    className="flag-svg-icon flag-outline"
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7" />
                  </svg>
                  <span>Mark for Review</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* FLOATING SIDE ARROWS (Green < and > on edges) */}
      {canGoPrev && (
        <button
          type="button"
          className="boson-side-arrow side-arrow-left"
          onClick={() => onGoToQuestion(seqNumber - 2)}
          title="Previous Question"
        >
          ‹
        </button>
      )}

      {canGoNext && (
        <button
          type="button"
          className="boson-side-arrow side-arrow-right"
          onClick={() => onGoToQuestion(seqNumber)}
          title="Next Question"
        >
          ›
        </button>
      )}

      {/* QUESTION BODY AREA */}
      <div className="boson-question-body">
        {/* INLINE QUESTION NOTE COMPOSER */}
        {isNoteBoxOpen && (
          <div className="inline-note-composer-card">
            <div className="note-composer-header">
              <div className="note-composer-title">
                <span className="note-badge">💬 Question Note / Issue Report</span>
                <span className="note-composer-sub">
                  ({question.questionNo || `Question #${seqNumber}`})
                </span>
              </div>
              <button
                type="button"
                className="note-composer-close"
                onClick={() => setIsNoteBoxOpen(false)}
                title="Close note box"
              >
                ✕
              </button>
            </div>

            <textarea
              className="note-composer-textarea"
              rows="3"
              placeholder="Describe what needs fixing (e.g. 'Option B typo', 'missing exhibit diagram', 'wrong correct answer marked', 'explanation incomplete')..."
              value={currentNoteText}
              onChange={(e) => setCurrentNoteText(e.target.value)}
              autoFocus
            />

            <div className="note-composer-footer">
              {existingComment ? (
                <button
                  type="button"
                  className="btn-note-delete"
                  onClick={() => handleDeleteComment(questionKey)}
                >
                  🗑️ Delete Note
                </button>
              ) : (
                <div></div>
              )}

              <div className="note-composer-right-btns">
                <button
                  type="button"
                  className="btn-note-cancel"
                  onClick={() => {
                    setCurrentNoteText(existingComment);
                    setIsNoteBoxOpen(false);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-note-save"
                  onClick={() => handleSaveComment(currentNoteText)}
                >
                  Save Note ✓
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVE NOTE BANNER (when note exists and composer is closed) */}
        {!isNoteBoxOpen && existingComment && (
          <div
            className="active-note-banner"
            onClick={() => setIsNoteBoxOpen(true)}
            title="Click to edit this note"
          >
            <span className="note-banner-icon">💬</span>
            <div className="note-banner-content">
              <strong>Your Note on this question:</strong> {existingComment}
            </div>
            <span className="note-banner-edit-hint">✎ Edit</span>
          </div>
        )}

        <div className="boson-question-prompt">
          {renderFormattedPrompt(question.question)}
        </div>

        {isMulti && settings?.showRequiredAnswersCount !== false && (
          <div className="boson-multi-indicator">
            ✋ Please select exactly <strong>{correctOptions.length} answers</strong> ({selectedIndices.length} / {correctOptions.length} selected)
          </div>
        )}

        {/* EXHIBIT IMAGE */}
        {question.exhibitImage && (
          <div className="boson-exhibit-card">
            <div className="exhibit-header">
              <span className="exhibit-tag">📸 Exhibit Diagram</span>
              <button
                type="button"
                className="exhibit-zoom-btn"
                onClick={() => setIsZoomed(!isZoomed)}
              >
                {isZoomed ? "🔍 Shrink" : "🔍 Enlarge Exhibit"}
              </button>
            </div>

            <div
              className="exhibit-img-frame"
              onClick={() => setIsZoomed(true)}
              style={{ cursor: "zoom-in" }}
            >
              {!imgError ? (
                <img
                  src={exhibitSrc}
                  alt={`Exhibit for ${question.questionNo || "question"}`}
                  className="boson-exhibit-img"
                  onError={(e) => {
                    const clean = (question.exhibitImage || "").replace(/^\/+/, "");
                    if (e.target.src.includes(clean)) {
                      if (!e.target.dataset.triedFallback1) {
                        e.target.dataset.triedFallback1 = "true";
                        e.target.src = `/${clean}`;
                      } else {
                        setImgError(true);
                      }
                    } else {
                      setImgError(true);
                    }
                  }}
                />
              ) : (
                <div className="exhibit-error-wrap">
                  <p>Exhibit diagram: {question.exhibitImage}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CLI SNIPPET / CONSOLE OUTPUT */}
        {question.cliSnippet && (
          <div className="boson-cli-box">
            <pre className="boson-cli-content">
              <code>{question.cliSnippet}</code>
            </pre>
          </div>
        )}

        {/* RENDER DRAG & DROP OR MULTIPLE CHOICE */}
        {isDragDrop ? (
          <DragDropQuestion
            question={question}
            dispatch={dispatch}
            answer={answer}
            isReviewMode={isReviewMode || isTimeOver}
          />
        ) : (
          <div className="boson-options-list">
            {question.options &&
              question.options.map((option, index) => {
                const match = option.match(/^([A-E])\.\s*([\s\S]*)/);
                const letter = match ? match[1] : "";
                const text = match ? match[2] : option;

                const isSelected = selectedIndices.includes(index);
                const isCorrectChoice = correctOptions.includes(index);

                let cardClass = "boson-option-item";
                if (isSelected) cardClass += " selected";
                if (isRevealed || isReviewMode || isTimeOver) {
                  cardClass += " locked";
                  if (settings?.showAnswersInline !== false || isReviewMode) {
                    if (isCorrectChoice) {
                      cardClass += " correct-answer";
                    } else if (isSelected) {
                      cardClass += " wrong-answer";
                    }
                  }
                }

                return (
                  <div
                    key={index}
                    className={cardClass}
                    onClick={() => handleOptionClick(index)}
                  >
                    <div className="boson-input-indicator">
                      {isMulti ? (
                        <div className={`boson-checkbox ${isSelected ? "checked" : ""}`}>
                          {isSelected && <span className="check-tick">✓</span>}
                        </div>
                      ) : (
                        <div className={`boson-radio ${isSelected ? "checked" : ""}`}>
                          {isSelected && <span className="radio-dot"></span>}
                        </div>
                      )}
                    </div>

                    {letter && <span className="boson-option-letter">{letter}.</span>}

                    <div className="boson-option-content">
                      {text.includes("\n") ? (
                        <pre className="boson-cli-opt">{text}</pre>
                      ) : (
                        <span className="boson-opt-text">{text}</span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* SHOW ANSWER INLINE BANNER */}
        {(isReviewMode || (isRevealed && settings?.showAnswersInline !== false)) && !isDragDrop && (
          <div className="boson-explanation-card">
            <div className="explanation-title">
              💡 <strong>Correct Answer & Explanation:</strong>
            </div>
            <div className="explanation-body">
              <div className="correct-options-full-list">
                {correctOptions.map((idx) => {
                  const opt = question.options[idx] || "";
                  return (
                    <div key={idx} className="correct-opt-row">
                      {opt.includes("\n") ? (
                        <pre className="boson-cli-opt">{opt}</pre>
                      ) : (
                        <span className="correct-opt-text">{opt}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM ACTION TOOLBAR (Screenshot bottom bar) */}
      <div className="boson-bottom-toolbar">
        <div className="toolbar-left">
          <button
            type="button"
            className={`btn-boson-nav ${!canGoPrev ? "disabled" : ""}`}
            onClick={() => canGoPrev && onGoToQuestion(seqNumber - 2)}
            disabled={!canGoPrev}
          >
            Previous
          </button>

          <button
            type="button"
            className={`btn-boson-nav ${!canGoNext ? "disabled" : ""}`}
            onClick={() => canGoNext && onGoToQuestion(seqNumber)}
            disabled={!canGoNext}
          >
            Next
          </button>
        </div>

        <div className="toolbar-right">
          {!isDragDrop && !isReviewMode && examMode !== "simulation" && settings?.includeShowAnswerBtn !== false && (
            <button
              type="button"
              className={`btn-boson-action ${isRevealed ? "disabled" : ""}`}
              onClick={() => {
                if (!isRevealed) {
                  dispatch({ type: "revealAnswer", payload: seqNumber - 1 });
                }
              }}
              disabled={isRevealed}
            >
              {isRevealed ? "✓ Answer Revealed" : "Show Answer"}
            </button>
          )}

          <button
            type="button"
            className="btn-boson-action"
            onClick={() => setShowPaletteModal(true)}
          >
            Question Review
          </button>

          {isReviewMode ? (
            <button
              type="button"
              className="btn-boson-action btn-grade btn-exit-review"
              onClick={onExitReview}
            >
              ⌂ Exit Review / Score Report
            </button>
          ) : (
            <button
              type="button"
              className="btn-boson-action btn-grade"
              onClick={handleGradeClick}
            >
              Grade Exam
            </button>
          )}
        </div>
      </div>

      {/* CUSTOM CONFIRMATION MODAL */}
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

      {/* QUESTION REVIEW / PALETTE MODAL */}
      {showPaletteModal && (
        <QuestionPaletteModal
          numQuestions={numQuestions}
          currentIndex={seqNumber - 1}
          answers={answers}
          questions={questions}
          flaggedQuestions={flaggedQuestions}
          comments={questionComments}
          onSelectQuestion={onGoToQuestion}
          onClose={() => setShowPaletteModal(false)}
        />
      )}

      {/* QUESTION NOTES & EXPORT MODAL */}
      {isAllNotesModalOpen && (
        <QuestionNotesModal
          comments={questionComments}
          allQuestions={questions}
          onSelectQuestion={(targetIdx) => onGoToQuestion(targetIdx)}
          onDeleteComment={(qId) => handleDeleteComment(qId)}
          onClose={() => setIsAllNotesModalOpen(false)}
        />
      )}

      {/* LIGHTBOX FOR EXHIBIT */}
      {isZoomed && (
        <div
          className="exhibit-modal-backdrop"
          onClick={() => setIsZoomed(false)}
        >
          <div
            className="exhibit-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="exhibit-modal-header">
              <div className="exhibit-modal-title-wrap">
                <span className="exhibit-modal-badge">📸 Exhibit</span>
                <h3 className="exhibit-modal-title">
                  {question.questionNo || `Question ${seqNumber}`}
                </h3>
              </div>
              <button
                type="button"
                className="exhibit-modal-close-btn"
                onClick={() => setIsZoomed(false)}
                aria-label="Close exhibit"
                title="Close exhibit"
              >
                ✕
              </button>
            </div>
            <div className="exhibit-modal-img-wrap">
              <img
                src={exhibitSrc}
                alt="Enlarged Exhibit"
                className="exhibit-modal-image"
              />
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION BAR FOR ACTIVE EXAMS */}
      <MobileBottomBar
        isExamActive={true}
        onOpenNotes={() => setIsNoteBoxOpen(true)}
        notesCount={Object.keys(questionComments).length}
        onOpenReviewMatrix={() => setShowPaletteModal(true)}
        onGradeExam={handleGradeClick}
        isReviewMode={isReviewMode}
        onExitReview={onExitReview}
        onToggleFlag={() => onToggleFlag(seqNumber - 1)}
        isCurrentFlagged={isFlagged}
      />
    </div>
  );
}

export default QuestionView;
