import React, { useState } from "react";

function ExamSettingsModal({ settings, setSettings, onClose }) {
  const [draft, setDraft] = useState({ ...settings });

  const handleChange = (key, value) => {
    const updated = { ...draft, [key]: value };
    setDraft(updated);
    if (setSettings) {
      setSettings(updated);
    }
  };

  const handleSaveAndClose = () => {
    if (setSettings) {
      setSettings(draft);
    }
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={handleSaveAndClose}>
      <div
        className="settings-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="settings-modal-header">
          <h3 className="settings-modal-title">Exam Settings</h3>
          <button
            type="button"
            className="settings-modal-close"
            onClick={handleSaveAndClose}
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="settings-modal-body">
          {/* QUESTION SEQUENCE / ORDERING OPTION */}
          <div className="settings-section">
            <h4 className="settings-section-title">Question Order</h4>
            <div className="settings-radio-group">
              <label
                className={`settings-radio-card ${
                  !draft.randomizeQuestions ? "active" : ""
                }`}
              >
                <input
                  type="radio"
                  name="qOrder"
                  checked={!draft.randomizeQuestions}
                  onChange={() => handleChange("randomizeQuestions", false)}
                />
                <span className="radio-circle"></span>
                <span className="settings-radio-label">Original Source</span>
              </label>

              <label
                className={`settings-radio-card ${
                  draft.randomizeQuestions ? "active" : ""
                }`}
              >
                <input
                  type="radio"
                  name="qOrder"
                  checked={draft.randomizeQuestions}
                  onChange={() => handleChange("randomizeQuestions", true)}
                />
                <span className="radio-circle"></span>
                <span className="settings-radio-label">Randomize</span>
              </label>
            </div>
          </div>

          <div className="settings-section">
            <h4 className="settings-section-title">General Settings</h4>

            <label className="settings-checkbox-item">
              <input
                type="checkbox"
                checked={Boolean(draft.randomizeAnswers)}
                onChange={(e) =>
                  handleChange("randomizeAnswers", e.target.checked)
                }
              />
              <span className="custom-checkbox"></span>
              <span className="checkbox-label">Randomize answer order</span>
            </label>

            <label className="settings-checkbox-item">
              <input
                type="checkbox"
                checked={Boolean(draft.showScoreLive)}
                onChange={(e) =>
                  handleChange("showScoreLive", e.target.checked)
                }
              />
              <span className="custom-checkbox"></span>
              <span className="checkbox-label">
                Show current score during exam
              </span>
            </label>

            <label className="settings-checkbox-item">
              <input
                type="checkbox"
                checked={Boolean(draft.showRequiredAnswersCount)}
                onChange={(e) =>
                  handleChange("showRequiredAnswersCount", e.target.checked)
                }
              />
              <span className="custom-checkbox"></span>
              <span className="checkbox-label">
                Show the number of answers needed to be correct
              </span>
            </label>

            <label className="settings-checkbox-item">
              <input
                type="checkbox"
                checked={Boolean(draft.includeShowAnswerBtn)}
                onChange={(e) =>
                  handleChange("includeShowAnswerBtn", e.target.checked)
                }
              />
              <span className="custom-checkbox"></span>
              <span className="checkbox-label">
                Include Show Answer button
              </span>
            </label>

            <label className="settings-checkbox-item">
              <input
                type="checkbox"
                checked={Boolean(draft.showAnswersInline)}
                onChange={(e) =>
                  handleChange("showAnswersInline", e.target.checked)
                }
              />
              <span className="custom-checkbox"></span>
              <span className="checkbox-label">
                Show answers inline (Instant feedback on answer)
              </span>
            </label>
          </div>

          <div className="settings-section">
            <h4 className="settings-section-title">Timer Settings</h4>
            <select
              className="settings-select"
              value={draft.timerMode || "not_timed"}
              onChange={(e) => handleChange("timerMode", e.target.value)}
            >
              <option value="not_timed">Not timed</option>
              <option value="ccna_120">
                Official CCNA Standard (120 Minutes)
              </option>
              <option value="90_mins">Timed (90 Minutes)</option>
              <option value="60_mins">Timed (60 Minutes)</option>
              <option value="30s_per_q">30 Seconds per Question</option>
              <option value="60s_per_q">60 Seconds per Question</option>
            </select>
          </div>
        </div>

        <div className="settings-modal-footer">
          <button
            type="button"
            className="btn-settings-save"
            onClick={handleSaveAndClose}
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExamSettingsModal;
