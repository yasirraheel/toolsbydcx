function Progress({
  index,
  numQuestions,
  points,
  maxPossiblePoints,
  answer,
  candidateName,
}) {
  return (
    <header className="progress">
      <progress max={numQuestions} value={index + Number(answer !== null)} />
      <p>
        {candidateName && <span className="candidate-badge">👤 {candidateName} • </span>}
        Question <strong>{index + 1}</strong> / {numQuestions}
      </p>
      <p>
        <strong>{points}</strong> / {maxPossiblePoints}
      </p>
    </header>
  );
}

export default Progress;
