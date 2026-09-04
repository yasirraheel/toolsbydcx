function StartScreen({
  numQuestions,
  candidateName,
  setCandidateName,
  dispatch,
}) {
  const isNameEmpty = !candidateName || candidateName.trim() === "";

  function handleStart(e) {
    e.preventDefault();
    if (isNameEmpty) return;
    dispatch({ type: "start" });
  }

  return (
    <form className="start" onSubmit={handleStart}>
      <h2>Welcome to The CCNA Quiz!</h2>
      <h3>{numQuestions} questions to test your CCNA mastery</h3>

      <div className="candidate-input-box">
        <label htmlFor="candidate-name" className="candidate-label">
          Enter Your Name:
        </label>
        <input
          id="candidate-name"
          type="text"
          className="input-candidate"
          placeholder="e.g. Alex Johnson"
          value={candidateName}
          onChange={(e) => setCandidateName(e.target.value)}
          autoFocus
          required
        />
      </div>

      <button
        type="submit"
        className="btn btn-ui"
        disabled={isNameEmpty}
      >
        Let's start
      </button>
    </form>
  );
}

export default StartScreen;
