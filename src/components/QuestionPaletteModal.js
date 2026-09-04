import React, { useState } from "react";

function QuestionPaletteModal({
  numQuestions,
  currentIndex,
  answers,
  questions,
  flaggedQuestions = [],
  comments = {},
  onSelectQuestion,
  onClose,
}) {
  const [filter, setFilter] = useState("all"); // 'all' | 'flagged' | 'notes' | 'unanswered' | 'answered'

  const getStatus = (idx) => {
    const isFlagged = flaggedQuestions.includes(idx);
    const qObj = questions[idx];
    const qKey = qObj?.id || qObj?.questionNo || idx + 1;
    const hasNote = Boolean(comments[qKey] || comments[qObj?.id] || comments[String(qObj?.id)]);
    const ans = answers[idx];
    const isAnswered =
      ans !== null &&
      ans !== undefined &&
      (typeof ans === "number" || ans?.confirmed === true || ans?.selections?.length > 0);
    return { isFlagged, isAnswered, hasNote };
  };

  const filteredIndices = Array.from({ length: numQuestions }, (_, i) => i).filter(
    (idx) => {
      const { isFlagged, isAnswered, hasNote } = getStatus(idx);
      if (filter === "flagged") return isFlagged;
      if (filter === "notes") return hasNote;
      if (filter === "unanswered") return !isAnswered;
      if (filter === "answered") return isAnswered;
      return true;
    }
  );

  const flaggedCount = flaggedQuestions.length;
  const notesCount = Object.keys(comments).filter((k) => comments[k] && comments[k].trim()).length;
  const answeredCount = answers.filter(
    (a) => a !== null && a !== undefined && (typeof a === "number" || a?.confirmed || a?.selections?.length > 0)
  ).length;
  const unansweredCount = numQuestions - answeredCount;

  return (
    <div className="palette-modal-backdrop" onClick={onClose}>
      <div className="palette-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="palette-modal-header">
          <h3 className="palette-modal-title">Question Review Matrix</h3>
          <button
            type="button"
            className="palette-modal-close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="palette-filter-tabs">
          <button
            type="button"
            className={`tab-btn ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All ({numQuestions})
          </button>
          <button
            type="button"
            className={`tab-btn ${filter === "flagged" ? "active" : ""}`}
            onClick={() => setFilter("flagged")}
          >
            🚩 Marked ({flaggedCount})
          </button>
          <button
            type="button"
            className={`tab-btn ${filter === "notes" ? "active" : ""}`}
            onClick={() => setFilter("notes")}
          >
            💬 Notes ({notesCount})
          </button>
          <button
            type="button"
            className={`tab-btn ${filter === "unanswered" ? "active" : ""}`}
            onClick={() => setFilter("unanswered")}
          >
            Incomplete ({unansweredCount})
          </button>
          <button
            type="button"
            className={`tab-btn ${filter === "answered" ? "active" : ""}`}
            onClick={() => setFilter("answered")}
          >
            Answered ({answeredCount})
          </button>
        </div>

        <div className="palette-legend">
          <span className="legend-item">
            <span className="legend-dot dot-active"></span> Current
          </span>
          <span className="legend-item">
            <span className="legend-dot dot-flagged">🚩</span> Marked
          </span>
          <span className="legend-item">
            <span className="legend-dot dot-notes">💬</span> Has Note
          </span>
          <span className="legend-item">
            <span className="legend-dot dot-answered"></span> Answered
          </span>
          <span className="legend-item">
            <span className="legend-dot dot-unanswered"></span> Incomplete
          </span>
        </div>

        <div className="palette-grid">
          {filteredIndices.map((i) => {
            const isActive = i === currentIndex;
            const { isFlagged, isAnswered, hasNote } = getStatus(i);

            let statusClass = "palette-cell";
            if (isActive) statusClass += " cell-active";
            else if (isAnswered) statusClass += " cell-answered";
            else statusClass += " cell-unanswered";

            if (isFlagged) statusClass += " cell-flagged";
            if (hasNote) statusClass += " cell-has-note";

            const qNo = questions[i]?.questionNo || `Q${i + 1}`;

            return (
              <button
                key={i}
                type="button"
                className={statusClass}
                onClick={() => {
                  onSelectQuestion(i);
                  onClose();
                }}
                title={qNo}
              >
                {isFlagged && <span className="cell-flag-pin">🚩</span>}
                {hasNote && <span className="cell-note-pin">💬</span>}
                <span>{i + 1}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default QuestionPaletteModal;
