export function randomizeQuestionOptions(q) {
  if (!q || !q.options || !Array.isArray(q.options) || q.options.length <= 1) {
    return q;
  }
  if (q.type === 'drag_drop' || q.dragDropData || q.isDragDrop) {
    return q;
  }

  const rawCorrect = q.correctOptions !== undefined ? q.correctOptions : q.correctOption;
  const isArray = Array.isArray(rawCorrect);
  const correctArr = isArray
    ? rawCorrect
    : rawCorrect !== undefined && rawCorrect !== null
    ? [rawCorrect]
    : [];

  const indexed = q.options.map((opt, idx) => {
    let text = opt;
    if (typeof opt === 'string') {
      text = opt.replace(/^[A-E]\.\s*/, '');
    }
    return {
      text,
      isCorrect: correctArr.includes(idx),
    };
  });

  const shuffled = [...indexed];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const newOptions = shuffled.map((item, idx) => {
    const letter = String.fromCharCode(65 + idx);
    return `${letter}. ${item.text}`;
  });

  const newCorrectIndices = [];
  shuffled.forEach((item, idx) => {
    if (item.isCorrect) {
      newCorrectIndices.push(idx);
    }
  });

  const newCorrectOption = isArray
    ? newCorrectIndices
    : newCorrectIndices.length > 0
    ? newCorrectIndices[0]
    : 0;

  return {
    ...q,
    options: newOptions,
    correctOption: newCorrectOption,
    correctOptions: newCorrectIndices,
  };
}
