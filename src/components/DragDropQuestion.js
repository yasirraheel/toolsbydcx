import React, { useState } from "react";

function DragDropQuestion({ question, dispatch, answer, isReviewMode = false }) {
  const dragData = question.dragDropData || {
    items: [],
    targets: [],
    correctMatches: {},
  };

  const hasAnswered = (answer !== null && answer.confirmed === true) || isReviewMode;
  const isLocked = hasAnswered || isReviewMode;
  const currentMatches = answer?.matches || {};

  const [selectedItem, setSelectedItem] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);

  const assignedValues = Object.values(currentMatches);
  const availableItems = dragData.items.filter((item) => {
    const timesAssigned = assignedValues.filter((v) => v === item).length;
    const totalCount = dragData.items.filter((i) => i === item).length;
    return timesAssigned < totalCount;
  });

  const assignItemToTarget = (targetName, itemName) => {
    if (isLocked) return;
    const newMatches = { ...currentMatches, [targetName]: itemName };
    dispatch({ type: "dragDropAnswer", payload: { matches: newMatches } });
    setSelectedItem(null);
  };

  const removeItemFromTarget = (targetName) => {
    if (isLocked) return;
    const newMatches = { ...currentMatches };
    delete newMatches[targetName];
    dispatch({ type: "dragDropAnswer", payload: { matches: newMatches } });
    setSelectedItem(null);
  };

  const handleDragStart = (e, item) => {
    if (isLocked) return;
    setDraggedItem(item);
    e.dataTransfer.setData("text/plain", item);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    if (isLocked) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDropOnTarget = (e, targetName) => {
    if (isLocked) return;
    e.preventDefault();
    const item = e.dataTransfer.getData("text/plain") || draggedItem;
    if (item) {
      assignItemToTarget(targetName, item);
    }
    setDraggedItem(null);
  };

  const handleTargetClick = (targetName) => {
    if (hasAnswered) return;
    if (selectedItem) {
      assignItemToTarget(targetName, selectedItem);
    } else if (currentMatches[targetName]) {
      removeItemFromTarget(targetName);
    }
  };

  const handleReset = () => {
    if (hasAnswered) return;
    dispatch({ type: "dragDropAnswer", payload: { matches: {} } });
    setSelectedItem(null);
  };

  const handleConfirm = () => {
    dispatch({ type: "confirmDragDrop" });
  };

  const numAssigned = Object.keys(currentMatches).length;
  const numTargets = dragData.targets.length;

  return (
    <div className="drag-drop-container">
      {!hasAnswered && (
        <div className="drag-drop-instructions">
          💡 <strong>Instructions:</strong> Drag items from the Left into matching Target slots on the Right, or <strong>click an item then click a slot</strong>.
        </div>
      )}

      <div className="drag-drop-layout">
        {/* LEFT COLUMN: Items Pool */}
        <div className="drag-pool-column">
          <div className="column-header">
            <span className="column-title">📋 Available Items</span>
            <span className="column-count">
              {availableItems.length} left
            </span>
          </div>

          <div className="items-pool">
            {availableItems.length === 0 && !hasAnswered && (
              <div className="pool-empty-notice">
                All items have been assigned! Review on the right.
              </div>
            )}
            {availableItems.map((item, idx) => {
              const isSelected = selectedItem === item;
              return (
                <div
                  key={`${item}-${idx}`}
                  className={`drag-item-card ${isSelected ? "selected" : ""}`}
                  draggable={!hasAnswered}
                  onDragStart={(e) => handleDragStart(e, item)}
                  onClick={() => {
                    if (hasAnswered) return;
                    setSelectedItem(isSelected ? null : item);
                  }}
                  title={hasAnswered ? "" : "Click to select or drag to target"}
                >
                  <span className="drag-handle">⠿</span>
                  <span className="drag-text">{item}</span>
                </div>
              );
            })}
          </div>

          {!hasAnswered && numAssigned > 0 && (
            <button
              type="button"
              className="btn btn-ui btn-reset-dd"
              onClick={handleReset}
            >
              ↺ Reset All Matches
            </button>
          )}
        </div>

        {/* RIGHT COLUMN: Target Slots */}
        <div className="drag-targets-column">
          <div className="column-header">
            <span className="column-title">🎯 Target Slots</span>
            <span className="column-count">
              {numAssigned} / {numTargets} assigned
            </span>
          </div>

          <div className="targets-list">
            {dragData.targets.map((target, idx) => {
              const assignedItem = currentMatches[target];
              const correctAnswer = dragData.correctMatches[target];
              const isMatchCorrect =
                hasAnswered && assignedItem === correctAnswer;
              const isMatchWrong =
                hasAnswered && assignedItem && assignedItem !== correctAnswer;
              const isMissing = hasAnswered && !assignedItem;

              let slotClass = "target-slot-card";
              if (assignedItem && !hasAnswered) slotClass += " filled";
              if (selectedItem && !hasAnswered && !assignedItem)
                slotClass += " ready-for-drop";
              if (hasAnswered) {
                if (isMatchCorrect) slotClass += " correct-slot";
                else if (isMatchWrong) slotClass += " wrong-slot";
                else if (isMissing) slotClass += " missing-slot";
              }

              return (
                <div
                  key={`${target}-${idx}`}
                  className={slotClass}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropOnTarget(e, target)}
                  onClick={() => handleTargetClick(target)}
                >
                  <div className="target-label">
                    <span className="target-num">{idx + 1}.</span>
                    <span className="target-name">{target}</span>
                  </div>

                  <div className="target-drop-zone">
                    {assignedItem ? (
                      <div className="assigned-item">
                        <span className="assigned-text">{assignedItem}</span>
                        {!hasAnswered && (
                          <button
                            type="button"
                            className="remove-item-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeItemFromTarget(target);
                            }}
                            title="Remove item"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="drop-placeholder">
                        {selectedItem && !hasAnswered ? (
                          <span className="click-to-place">
                            👈 Click to place "{selectedItem.length > 25 ? selectedItem.slice(0, 25) + "..." : selectedItem}"
                          </span>
                        ) : (
                          <span className="empty-hint">Drop item here</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Show Correct Answer during review mode */}
                  {hasAnswered && !isMatchCorrect && (
                    <div className="correct-answer-banner">
                      <span className="correct-label">✓ Correct:</span>{" "}
                      <span className="correct-text">{correctAnswer}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Confirm Button */}
      {!hasAnswered && numAssigned > 0 && (
        <div className="dd-confirm-wrapper">
          <button
            type="button"
            className="btn btn-ui btn-confirm-dd"
            onClick={handleConfirm}
          >
            ✓ Confirm Drag & Drop Matches ({numAssigned}/{numTargets})
          </button>
        </div>
      )}
    </div>
  );
}

export default DragDropQuestion;
