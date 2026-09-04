function NextButton({ dispatch, answer, index, numQuestions }) {
  // Hide if no answer yet
  if (answer === null) return null;
  // Hide if multi-select not yet confirmed
  if (typeof answer === "object" && !answer.confirmed) return null;

  if (index < numQuestions - 1)
    return (
      <button
        className="btn btn-ui"
        onClick={() => dispatch({ type: "nextQuestion" })}
      >
        Next
      </button>
    );

  if (index === numQuestions - 1)
    return (
      <button
        className="btn btn-ui"
        onClick={() => dispatch({ type: "finish" })}
      >
        Finish
      </button>
    );
}

export default NextButton;
