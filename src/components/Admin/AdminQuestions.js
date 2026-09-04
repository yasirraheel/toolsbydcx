import React, { useState } from 'react';
import { ccnaQuestions as ccnaQuestionsData } from '../../data/ccnaQuestions';

function AdminQuestions() {
  const [bankFilter, setBankFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState(null);

  const filterQuestions = () => {
    let list = ccnaQuestionsData;
    if (bankFilter === 'bank_a') list = list.slice(0, 50);
    else if (bankFilter === 'bank_b') list = list.slice(50, 100);
    else if (bankFilter === 'bank_c') list = list.slice(100, 150);
    else if (bankFilter === 'bank_d') list = list.slice(150, 200);
    else if (bankFilter === 'drag_drop') list = list.filter(q => q.type === 'drag_drop' || q.dragDropData);

    if (search.trim()) {
      const qLower = search.toLowerCase();
      list = list.filter(q =>
        (q.questionNo && q.questionNo.toLowerCase().includes(qLower)) ||
        (q.question && q.question.toLowerCase().includes(qLower))
      );
    }
    return list;
  };

  const filtered = filterQuestions();

  return (
    <div className="admin-questions-view">
      <div className="admin-card">
        <div className="admin-card-header">
          <div>
            <h3 className="admin-card-title">
              <span>❓</span> Exam Question Bank ({filtered.length} of {ccnaQuestionsData.length})
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
              Inspect and verify questions across Cisco 200-301 CCNA banks.
            </p>
          </div>

          <div className="admin-card-actions">
            <input
              type="text"
              className="admin-search-input"
              placeholder="Search question text or #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              className="admin-select"
              value={bankFilter}
              onChange={(e) => setBankFilter(e.target.value)}
            >
              <option value="all">All Exam Banks ({ccnaQuestionsData.length})</option>
              <option value="bank_a">Exam A (Q 1-50)</option>
              <option value="bank_b">Exam B (Q 51-100)</option>
              <option value="bank_c">Exam C (Q 101-150)</option>
              <option value="bank_d">Exam D (Q 151-200)</option>
              <option value="drag_drop">Drag & Drop Interactive</option>
            </select>
          </div>
        </div>

        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '140px', whiteSpace: 'nowrap' }}>Q#</th>
                <th style={{ width: '160px', whiteSpace: 'nowrap' }}>Type</th>
                <th>Prompt Summary</th>
                <th style={{ width: '100px', whiteSpace: 'nowrap' }}>Exhibit</th>
                <th style={{ width: '90px', whiteSpace: 'nowrap' }}>Points</th>
                <th style={{ width: '110px', whiteSpace: 'nowrap' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map((q, idx) => (
                <tr key={q.id || idx}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span className="badge-pill badge-pro" style={{ whiteSpace: 'nowrap', fontSize: '11.5px', padding: '5px 12px', fontWeight: 700 }}>
                      {q.questionNo || `QUESTION #${idx + 1}`}
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: q.type === 'drag_drop' ? '#c084fc' : '#38bdf8' }}>
                      {q.type === 'drag_drop' ? '🧩 Drag & Drop' : '☑️ Multiple Choice'}
                    </span>
                  </td>
                  <td>
                    <div style={{ color: '#f8fafc', fontWeight: 600, maxHeight: '42px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {q.question}
                    </div>
                  </td>
                  <td>
                    {q.exhibitImage ? (
                      <span style={{ color: '#4ade80', fontSize: '12px' }}>📸 Diagram</span>
                    ) : (
                      <span style={{ color: '#64748b', fontSize: '12px' }}>—</span>
                    )}
                  </td>
                  <td>
                    <strong style={{ color: '#22c55e' }}>{q.points || 10} pts</strong>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-table-action"
                      onClick={() => setSelectedQuestion(q)}
                    >
                      Inspect 🔍
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* INSPECT QUESTION MODAL */}
      {selectedQuestion && (
        <div className="admin-modal-backdrop" onClick={() => setSelectedQuestion(null)}>
          <div className="admin-modal-card" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h4 className="admin-modal-title">
                Inspect: {selectedQuestion.questionNo || 'Question'} ({selectedQuestion.points || 10} Points)
              </h4>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setSelectedQuestion(null)}
              >
                ✕
              </button>
            </div>

            <div className="admin-modal-body">
              <div>
                <strong style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>Question Prompt:</strong>
                <p style={{ color: '#f8fafc', fontSize: '14px', lineHeight: 1.5, marginTop: '6px' }}>
                  {selectedQuestion.question}
                </p>
              </div>

              {selectedQuestion.exhibitImage && (
                <div>
                  <strong style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>Exhibit Diagram:</strong>
                  <div style={{ marginTop: '8px', textAlign: 'center', background: '#090d16', padding: '12px', borderRadius: '8px' }}>
                    <img
                      src={selectedQuestion.exhibitImage}
                      alt="Exhibit"
                      style={{ maxWidth: '100%', maxHeight: '240px', borderRadius: '6px' }}
                    />
                  </div>
                </div>
              )}

              {selectedQuestion.cliSnippet && (
                <div>
                  <strong style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>CLI Output:</strong>
                  <pre style={{ background: '#090d16', color: '#38bdf8', padding: '12px', borderRadius: '8px', fontSize: '12px', overflowX: 'auto' }}>
                    {selectedQuestion.cliSnippet}
                  </pre>
                </div>
              )}

              {selectedQuestion.options && selectedQuestion.options.length > 0 && (
                <div>
                  <strong style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>Options & Correct Answer:</strong>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                    {selectedQuestion.options.map((opt, i) => {
                      const isCorrect = Array.isArray(selectedQuestion.correctOption)
                        ? selectedQuestion.correctOption.includes(i)
                        : selectedQuestion.correctOption === i;

                      return (
                        <div
                          key={i}
                          style={{
                            padding: '10px 14px',
                            borderRadius: '8px',
                            background: isCorrect ? 'rgba(34, 197, 94, 0.15)' : '#090d16',
                            border: `1px solid ${isCorrect ? '#22c55e' : '#1e293b'}`,
                            color: isCorrect ? '#4ade80' : '#cbd5e1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '13px'
                          }}
                        >
                          <span>{opt}</span>
                          {isCorrect && (
                            <span className="badge-pill badge-verified">
                              ✓ Correct Choice
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="btn-admin-secondary"
                onClick={() => setSelectedQuestion(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminQuestions;
