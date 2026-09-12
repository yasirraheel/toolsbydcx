import React, { useEffect, useRef } from "react";

function CustomDialog({
  isOpen,
  title = "Confirmation",
  message = "Are you sure you want to proceed?",
  note = "",
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "warning", // 'danger' | 'warning' | 'info' | 'success'
  isAlert = false,
  onConfirm,
  onCancel,
}) {
  const confirmBtnRef = useRef(null);
  const cancelBtnRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Focus the most appropriate button
    const timer = setTimeout(() => {
      if (type === "danger" && cancelBtnRef.current) {
        cancelBtnRef.current.focus();
      } else if (confirmBtnRef.current) {
        confirmBtnRef.current.focus();
      }
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel?.();
      } else if (e.key === "Enter" && !e.shiftKey) {
        // Only confirm on Enter if not actively focusing Cancel
        if (document.activeElement === cancelBtnRef.current) {
          onCancel?.();
        } else {
          e.preventDefault();
          onConfirm?.();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onConfirm, onCancel, type]);

  if (!isOpen) return null;

  // Format message to highlight quoted names or bracketed emails
  const renderFormattedMessage = (text) => {
    if (typeof text !== "string") return text;

    // Split by quoted text or email patterns to style them nicely
    const parts = text.split(/(".*?"|\(.*?\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b.*?\))/g);

    return parts.map((part, i) => {
      if (part.startsWith('"') && part.endsWith('"')) {
        return (
          <span key={i} className="dialog-highlight-text">
            {part.slice(1, -1)}
          </span>
        );
      }
      if (part.startsWith('(') && part.endsWith(')')) {
        return (
          <span key={i} className="dialog-highlight-sub">
            {" "}{part}{" "}
          </span>
        );
      }
      return part;
    });
  };

  const getIcon = () => {
    switch (type) {
      case "danger":
        return (
          <div className="flow-dialog-icon-badge badge-danger">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 18.75h.007v.008H12v-.008z" />
            </svg>
          </div>
        );
      case "warning":
        return (
          <div className="flow-dialog-icon-badge badge-warning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
        );
      case "success":
        return (
          <div className="flow-dialog-icon-badge badge-success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
        );
      case "info":
      default:
        return (
          <div className="flow-dialog-icon-badge badge-info">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </div>
        );
    }
  };

  return (
    <div className="flow-dialog-backdrop" onClick={onCancel}>
      <div
        className={`flow-dialog-card type-${type}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="flow-dialog-title"
      >
        {/* Top Glow Ambient Accent */}
        <div className={`flow-dialog-accent-glow glow-${type}`} />

        {/* Close "X" Button */}
        <button
          type="button"
          className="flow-dialog-close-btn"
          onClick={onCancel}
          aria-label="Close dialog"
        >
          ✕
        </button>

        <div className="flow-dialog-header">
          {getIcon()}
          <div className="flow-dialog-title-wrap">
            <h3 id="flow-dialog-title" className="flow-dialog-title">
              {title}
            </h3>
            <span className={`flow-dialog-type-tag tag-${type}`}>
              {type.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="flow-dialog-body">
          <div className="flow-dialog-message">
            {renderFormattedMessage(message)}
          </div>

          {note && (
            <div className={`flow-dialog-note note-${type}`}>
              <span className="dialog-note-icon">ℹ️</span>
              <span>{note}</span>
            </div>
          )}
        </div>

        <div className="flow-dialog-footer">
          {!isAlert && (
            <button
              ref={cancelBtnRef}
              type="button"
              className="flow-dialog-btn btn-cancel"
              onClick={onCancel}
            >
              {cancelText}
            </button>
          )}

          <button
            ref={confirmBtnRef}
            type="button"
            className={`flow-dialog-btn btn-confirm confirm-${type}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CustomDialog;
