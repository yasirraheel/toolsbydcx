import React, { useState } from "react";

function QuestionNotesModal({
  comments = {},
  allQuestions = [],
  onSelectQuestion,
  onDeleteComment,
  onClose,
}) {
  const [copied, setCopied] = useState(false);

  const commentedList = Object.entries(comments)
    .filter(([qId, text]) => text && text.trim().length > 0)
    .map(([qId, text]) => {
      const numId = Number(qId);
      const qIndex = allQuestions.findIndex(
        (q) => q.id === numId || String(q.id) === String(qId)
      );
      const qObj = qIndex >= 0 ? allQuestions[qIndex] : null;
      return {
        id: qId,
        index: qIndex,
        questionNo: qObj?.questionNo || `Question #${qId}`,
        prompt: qObj?.question || "",
        comment: text,
      };
    });

  const handleCopyAll = () => {
    if (commentedList.length === 0) return;
    const reportLines = [
      "# 📝 CCNA Exam Questions - User Feedback & Fix List",
      "",
      `Total questions flagged with notes: ${commentedList.length}`,
      "",
    ];

    commentedList.forEach((item, idx) => {
      reportLines.push(
        `### ${idx + 1}. [${item.questionNo}] (ID: ${item.id})`,
        `**Prompt:** ${item.prompt.replace(/\n+/g, " ").slice(0, 120)}...`,
        `**Issue / Feedback:**`,
        `> ${item.comment}`,
        ""
      );
    });

    const fullText = reportLines.join("\n");
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="palette-modal-backdrop" onClick={onClose}>
      <div
        className="palette-modal-card notes-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="palette-modal-header">
          <div className="notes-modal-title-wrap">
            <span className="notes-badge">💬 Question Notes</span>
            <h3 className="palette-modal-title">
              Issues & Fixes List ({commentedList.length})
            </h3>
          </div>

          <button
            type="button"
            className="palette-modal-close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="notes-modal-toolbar">
          <p className="notes-modal-desc">
            All notes and feedback you add to questions are saved here. You can
            copy this full report to have the AI assistant fix all questions at
            once.
          </p>

          {commentedList.length > 0 && (
            <button
              type="button"
              className="btn-copy-notes-for-ai"
              onClick={handleCopyAll}
            >
              {copied ? "✓ Copied to Clipboard!" : "📋 Copy All Notes for AI"}
            </button>
          )}
        </div>

        <div className="notes-modal-body">
          {commentedList.length === 0 ? (
            <div className="empty-notes-box">
              <span className="empty-notes-icon">📝</span>
              <h4>No question notes added yet</h4>
              <p>
                While answering or reviewing questions, click{" "}
                <strong>"💬 Add Note"</strong> to write what needs fixing (e.g.
                typos, missing exhibits, wrong answers).
              </p>
            </div>
          ) : (
            <div className="notes-cards-list">
              {commentedList.map((item, idx) => (
                <div key={item.id} className="note-card-item">
                  <div className="note-card-header">
                    <div className="note-card-qinfo">
                      <span className="note-qno-pill">{item.questionNo}</span>
                      <span className="note-qprompt-snippet">
                        {item.prompt.slice(0, 90)}...
                      </span>
                    </div>

                    <div className="note-card-actions">
                      {item.index >= 0 && onSelectQuestion && (
                        <button
                          type="button"
                          className="btn-jump-to-q"
                          onClick={() => {
                            onSelectQuestion(item.index);
                            onClose();
                          }}
                        >
                          Go to Question ➜
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-delete-note-item"
                        onClick={() => onDeleteComment(item.id)}
                        title="Delete note"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div className="note-card-comment-box">
                    <span className="note-comment-label">
                      Feedback / Fix needed:
                    </span>
                    <p className="note-comment-text">{item.comment}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default QuestionNotesModal;
