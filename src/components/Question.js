import { useState } from "react";
import Options from "./Options";
import DragDropQuestion from "./DragDropQuestion";

function Question({ question, dispatch, answer, seqNumber }) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Normalize image path to handle PUBLIC_URL, leading slashes, and relative paths
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

  return (
    <div className="question_container">
      <div className="question-no-badges">
        {seqNumber && (
          <span className="question-seq-badge">Q {seqNumber}</span>
        )}
        {question.questionNo && (
          <span className="question-no-badge">{question.questionNo}</span>
        )}
      </div>
      <h4>{question.question}</h4>

      {question.exhibitImage && (
        <div className="exhibit-wrapper">
          <div className="exhibit-header">
            <span className="exhibit-tag">📸 Exhibit Diagram</span>
            <button
              type="button"
              className="exhibit-zoom-btn"
              onClick={() => setIsZoomed(!isZoomed)}
              title="Click to toggle enlarged view"
            >
              {isZoomed ? "🔍 Shrink View" : "🔍 Enlarge Exhibit"}
            </button>
          </div>

          <div
            className="exhibit-container"
            onClick={() => setIsZoomed(true)}
            style={{ cursor: "zoom-in" }}
          >
            {!imgError ? (
              <img
                src={exhibitSrc}
                alt={`Exhibit for ${question.questionNo || "question"}`}
                className="exhibit-image"
                onError={(e) => {
                  const clean = (question.exhibitImage || "").replace(/^\/+/, "");
                  const fallbackRoot = `/${clean}`;
                  const fallbackRel = `./${clean}`;

                  if (e.target.src.includes(clean)) {
                    if (!e.target.dataset.triedFallback1) {
                      e.target.dataset.triedFallback1 = "true";
                      e.target.src = fallbackRoot;
                    } else if (!e.target.dataset.triedFallback2) {
                      e.target.dataset.triedFallback2 = "true";
                      e.target.src = fallbackRel;
                    } else {
                      setImgError(true);
                    }
                  } else {
                    setImgError(true);
                  }
                }}
              />
            ) : (
              <div className="exhibit-error">
                <p>⚠️ Unable to display exhibit diagram ({question.exhibitImage})</p>
                <a
                  href={`/${(question.exhibitImage || "").replace(/^\/+/, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ui"
                  style={{ fontSize: "1.2rem", padding: "0.6rem 1.2rem", marginTop: "0.8rem", display: "inline-block" }}
                >
                  Open Exhibit in New Tab
                </a>
              </div>
            )}
          </div>
          <div className="exhibit-caption">
            💡 Tip: Click on the diagram to enlarge.
          </div>
        </div>
      )}

      {question.cliSnippet && (
        <pre className="question-snippet-box">
          <code>{question.cliSnippet}</code>
        </pre>
      )}

      {question.type === "drag_drop" || question.dragDropData ? (
        <DragDropQuestion
          question={question}
          dispatch={dispatch}
          answer={answer}
        />
      ) : (
        <Options question={question} dispatch={dispatch} answer={answer} />
      )}

      {/* Modal Lightbox when zoomed */}
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
              <span className="exhibit-modal-title">
                Exhibit Diagram — {question.questionNo || `Question ${seqNumber}`}
              </span>
              <button
                type="button"
                className="exhibit-modal-close"
                onClick={() => setIsZoomed(false)}
              >
                ✕ Close
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
    </div>
  );
}

export default Question;
