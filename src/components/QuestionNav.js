function QuestionNav({ numQuestions, index, answers, questions, dispatch }) {
  return (
    <div className="question-nav">
      <div className="question-nav-label">Go to Question:</div>
      <div className="question-nav-grid">
        {Array.from({ length: numQuestions }, (_, i) => {
          const isActive = i === index;
          const ans = answers[i];
          const isAnswered =
            ans !== null &&
            ans !== undefined &&
            (typeof ans === "number" || ans?.confirmed === true);
          const qNo = questions[i]?.questionNo || "";

          return (
            <button
              key={i}
              className={`question-bubble ${isActive ? "bubble-active" : ""} ${
                isAnswered ? "bubble-answered" : ""
              }`}
              onClick={() => dispatch({ type: "goToQuestion", payload: i })}
              title={qNo}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default QuestionNav;
