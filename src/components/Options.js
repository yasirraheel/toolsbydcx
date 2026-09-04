function Options({ question, dispatch, answer }) {
  const correctOptions = Array.isArray(question.correctOption)
    ? question.correctOption
    : [question.correctOption];
  const isMulti = correctOptions.length > 1;

  // For multi-select: answer is { selections: [], confirmed: bool }
  // For single: answer is a number or null
  const hasAnswered = isMulti
    ? answer !== null && answer.confirmed === true
    : answer !== null;

  const selectedIndices = isMulti
    ? answer?.selections || []
    : answer !== null
    ? [answer]
    : [];

  function handleClick(index) {
    if (hasAnswered) return;

    if (isMulti) {
      const current = answer?.selections || [];
      const newSelections = current.includes(index)
        ? current.filter((i) => i !== index)
        : [...current, index];
      dispatch({ type: "multiSelect", payload: newSelections });
    } else {
      dispatch({ type: "newAnswer", payload: index });
    }
  }

  function handleConfirm() {
    dispatch({ type: "confirmMulti" });
  }

  return (
    <div>
      {isMulti && !hasAnswered && (
        <p className="multi-hint">
          ✋ Select {correctOptions.length} answers
        </p>
      )}
      <div className="options">
        {question.options.map((option, index) => {
          // Parse letter prefix like "A. ..."
          const match = option.match(/^([A-E])\.\s*([\s\S]*)/);
          const letter = match ? match[1] : "";
          const text = match ? match[2] : option;

          const isSelected = selectedIndices.includes(index);
          const isCorrectChoice = correctOptions.includes(index);

          let optionClass = "btn btn-option";
          if (isSelected && !hasAnswered) optionClass += " answer";
          if (hasAnswered) {
            if (isCorrectChoice) {
              optionClass += " correct";
            } else if (isSelected) {
              optionClass += " wrong";
            }
          }

          const hasCli = text.includes("\n");

          return (
            <button
              className={optionClass}
              key={index}
              disabled={hasAnswered}
              onClick={() => handleClick(index)}
            >
              {letter && <span className="option-letter">{letter}</span>}
              {hasCli ? (
                <span className="cli-option">{text}</span>
              ) : (
                <span className="option-text">{text}</span>
              )}
            </button>
          );
        })}
      </div>
      {isMulti &&
        !hasAnswered &&
        selectedIndices.length >= correctOptions.length && (
          <button
            className="btn btn-ui btn-confirm"
            onClick={handleConfirm}
          >
            Confirm Selection ({selectedIndices.length})
          </button>
        )}
    </div>
  );
}

export default Options;
