import { useEffect, useState } from 'react';
import { listClasses } from '../../services/classes';
import { listStudents } from '../../services/students';
import {
  listExams,
  createExam,
  updateExam,
  deleteExam,
  listExamSubjects,
  addExamSubjects,
  updateExamSubject,
  deleteExamSubject,
  enterGrades,
  listGrades,
} from '../../services/exams';
import { getResultCard } from '../../services/reports';
import { useAuth } from '../../hooks/useAuth';

export default function GradesPage() {
  const { user } = useAuth();
  const canManage = ['owner', 'admin', 'teacher', 'staff'].includes(user?.role);

  const [classes, setClasses] = useState([]);
  const [exams, setExams] = useState([]);
  const [examForm, setExamForm] = useState({ classId: '', examName: '', term: '', date: '' });

  const [selectedExamId, setSelectedExamId] = useState('');
  const [isEditingExam, setIsEditingExam] = useState(false);
  const [examEditForm, setExamEditForm] = useState({ examName: '', term: '', date: '' });

  const [subjects, setSubjects] = useState([]);
  const [subjectForm, setSubjectForm] = useState({ subject: '', totalMarks: '' });
  const [editingSubjectId, setEditingSubjectId] = useState('');
  const [subjectEditForm, setSubjectEditForm] = useState({ subject: '', totalMarks: '' });

  const [students, setStudents] = useState([]);
  const [entrySubject, setEntrySubject] = useState('');
  const [marks, setMarks] = useState({});

  const [resultCard, setResultCard] = useState(null);
  const [resultCardStudentId, setResultCardStudentId] = useState('');
  const [myGrades, setMyGrades] = useState([]);

  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    if (canManage) listClasses().then(setClasses).catch(() => {});
    listExams().then(setExams).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setResultCard(null);
    setResultCardStudentId('');
    setEntrySubject('');
    setMarks({});
    setIsEditingExam(false);
    setEditingSubjectId('');
    if (!selectedExamId) {
      setSubjects([]);
      setStudents([]);
      return;
    }
    const exam = exams.find((e) => e.id === selectedExamId);
    if (exam && canManage) listStudents({ classId: exam.classId }).then(setStudents);
    refreshSubjects(selectedExamId);
    if (user?.role === 'parent') {
      listGrades({ examId: selectedExamId }).then(setMyGrades).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExamId]);

  async function refreshSubjects(examId) {
    try {
      setSubjects(await listExamSubjects(examId));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load subjects');
    }
  }

  async function handleCreateExam(e) {
    e.preventDefault();
    setError('');
    try {
      const exam = await createExam(examForm);
      setExams((prev) => [exam, ...prev]);
      setExamForm({ classId: '', examName: '', term: '', date: '' });
      setSelectedExamId(exam.id);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create exam');
    }
  }

  async function handleAddSubject(e) {
    e.preventDefault();
    setError('');
    try {
      await addExamSubjects(selectedExamId, [{ subject: subjectForm.subject, totalMarks: Number(subjectForm.totalMarks) }]);
      setSubjectForm({ subject: '', totalMarks: '' });
      await refreshSubjects(selectedExamId);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add subject');
    }
  }

  function handleStartEditExam() {
    const exam = exams.find((e) => e.id === selectedExamId);
    if (!exam) return;
    setExamEditForm({ examName: exam.examName, term: exam.term, date: exam.date?.slice(0, 10) });
    setIsEditingExam(true);
  }

  async function handleSaveExam(e) {
    e.preventDefault();
    setError('');
    try {
      const updated = await updateExam(selectedExamId, examEditForm);
      setExams((prev) => prev.map((ex) => (ex.id === updated.id ? { ...ex, ...updated } : ex)));
      setIsEditingExam(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update exam');
    }
  }

  async function handleDeleteExam() {
    if (!window.confirm('Delete this exam and all its subjects/grades? This cannot be undone.')) return;
    setError('');
    try {
      await deleteExam(selectedExamId);
      setExams((prev) => prev.filter((ex) => ex.id !== selectedExamId));
      setSelectedExamId('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete exam');
    }
  }

  function handleStartEditSubject(subject) {
    setEditingSubjectId(subject.id);
    setSubjectEditForm({ subject: subject.subject, totalMarks: subject.totalMarks });
  }

  async function handleSaveSubject(e, subjectId) {
    e.preventDefault();
    setError('');
    try {
      await updateExamSubject(selectedExamId, subjectId, {
        subject: subjectEditForm.subject,
        totalMarks: Number(subjectEditForm.totalMarks),
      });
      setEditingSubjectId('');
      await refreshSubjects(selectedExamId);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update subject');
    }
  }

  async function handleDeleteSubject(subjectId) {
    if (!window.confirm('Delete this subject and any grades already entered for it?')) return;
    setError('');
    try {
      await deleteExamSubject(selectedExamId, subjectId);
      await refreshSubjects(selectedExamId);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete subject');
    }
  }

  async function handleSubmitMarks(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    try {
      const marksPayload = students.map((s) => ({ studentId: s.id, marksObtained: Number(marks[s.id] || 0) }));
      await enterGrades({ examId: selectedExamId, subject: entrySubject, marks: marksPayload });
      setInfo(`Marks saved for ${entrySubject}.`);
      setMarks({});
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save marks');
    }
  }

  async function handleGenerateResultCard() {
    setError('');
    try {
      setResultCard(await getResultCard(selectedExamId));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate result card');
    }
  }

  const selectedSubjectDef = subjects.find((s) => s.subject === entrySubject);
  const selectedStudentRow = resultCard?.students.find((row) => row.studentId === resultCardStudentId);

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-800 mb-4">Grades</h1>

      {canManage && (
        <form onSubmit={handleCreateExam} className="bg-white rounded-lg border border-slate-200 p-4 mb-6 flex gap-3 items-end flex-wrap">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Class</label>
            <select
              required
              value={examForm.classId}
              onChange={(e) => setExamForm({ ...examForm, classId: e.target.value })}
              className="border border-slate-300 rounded px-3 py-1.5 text-sm"
            >
              <option value="">Select class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.className}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Exam name</label>
            <input
              required
              value={examForm.examName}
              onChange={(e) => setExamForm({ ...examForm, examName: e.target.value })}
              className="border border-slate-300 rounded px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Term</label>
            <input
              required
              value={examForm.term}
              onChange={(e) => setExamForm({ ...examForm, term: e.target.value })}
              className="border border-slate-300 rounded px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
            <input
              required
              type="date"
              value={examForm.date}
              onChange={(e) => setExamForm({ ...examForm, date: e.target.value })}
              className="border border-slate-300 rounded px-3 py-1.5 text-sm"
            />
          </div>
          <button type="submit" className="bg-blue-600 text-white rounded px-4 py-1.5 text-sm font-medium hover:bg-blue-700">
            1. Create exam
          </button>
        </form>
      )}

      <div className="mb-4 flex items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Select exam</label>
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="border border-slate-300 rounded px-3 py-1.5 text-sm"
          >
            <option value="">Select exam</option>
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.examName} — {ex.class?.className} ({ex.term})
              </option>
            ))}
          </select>
        </div>
        {selectedExamId && canManage && !isEditingExam && (
          <>
            <button
              onClick={handleStartEditExam}
              className="text-sm text-blue-600 hover:underline"
            >
              Edit exam
            </button>
            <button onClick={handleDeleteExam} className="text-sm text-red-600 hover:underline">
              Delete exam
            </button>
          </>
        )}
      </div>

      {isEditingExam && (
        <form
          onSubmit={handleSaveExam}
          className="bg-white rounded-lg border border-slate-200 p-4 mb-6 flex gap-3 items-end flex-wrap"
        >
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Exam name</label>
            <input
              required
              value={examEditForm.examName}
              onChange={(e) => setExamEditForm({ ...examEditForm, examName: e.target.value })}
              className="border border-slate-300 rounded px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Term</label>
            <input
              required
              value={examEditForm.term}
              onChange={(e) => setExamEditForm({ ...examEditForm, term: e.target.value })}
              className="border border-slate-300 rounded px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
            <input
              required
              type="date"
              value={examEditForm.date}
              onChange={(e) => setExamEditForm({ ...examEditForm, date: e.target.value })}
              className="border border-slate-300 rounded px-3 py-1.5 text-sm"
            />
          </div>
          <button type="submit" className="bg-blue-600 text-white rounded px-4 py-1.5 text-sm font-medium hover:bg-blue-700">
            Save
          </button>
          <button
            type="button"
            onClick={() => setIsEditingExam(false)}
            className="text-sm text-slate-500 hover:underline"
          >
            Cancel
          </button>
        </form>
      )}

      {error && <div className="text-sm text-red-600 mb-4">{error}</div>}
      {info && <div className="text-sm text-green-600 mb-4">{info}</div>}

      {selectedExamId && canManage && (
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">2. Add subjects (once per exam)</h2>
          {subjects.length > 0 && (
            <ul className="flex flex-wrap gap-2 mb-3">
              {subjects.map((s) =>
                editingSubjectId === s.id ? (
                  <li key={s.id}>
                    <form onSubmit={(e) => handleSaveSubject(e, s.id)} className="flex gap-2 items-center">
                      <input
                        required
                        value={subjectEditForm.subject}
                        onChange={(e) => setSubjectEditForm({ ...subjectEditForm, subject: e.target.value })}
                        className="border border-slate-300 rounded px-2 py-1 text-xs w-24"
                      />
                      <input
                        required
                        type="number"
                        min="1"
                        value={subjectEditForm.totalMarks}
                        onChange={(e) => setSubjectEditForm({ ...subjectEditForm, totalMarks: e.target.value })}
                        className="border border-slate-300 rounded px-2 py-1 text-xs w-16"
                      />
                      <button type="submit" className="text-xs text-blue-600 hover:underline">
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingSubjectId('')}
                        className="text-xs text-slate-500 hover:underline"
                      >
                        Cancel
                      </button>
                    </form>
                  </li>
                ) : (
                  <li key={s.id} className="text-xs bg-slate-100 rounded px-2 py-1 flex items-center gap-2">
                    <span>
                      {s.subject} — {s.totalMarks} marks
                    </span>
                    <button onClick={() => handleStartEditSubject(s)} className="text-blue-600 hover:underline">
                      Edit
                    </button>
                    <button onClick={() => handleDeleteSubject(s.id)} className="text-red-600 hover:underline">
                      Delete
                    </button>
                  </li>
                )
              )}
            </ul>
          )}
          <form onSubmit={handleAddSubject} className="flex gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Subject name</label>
              <input
                required
                value={subjectForm.subject}
                onChange={(e) => setSubjectForm({ ...subjectForm, subject: e.target.value })}
                className="border border-slate-300 rounded px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Total marks</label>
              <input
                required
                type="number"
                min="1"
                value={subjectForm.totalMarks}
                onChange={(e) => setSubjectForm({ ...subjectForm, totalMarks: e.target.value })}
                className="border border-slate-300 rounded px-3 py-1.5 text-sm w-28"
              />
            </div>
            <button type="submit" className="bg-blue-600 text-white rounded px-4 py-1.5 text-sm font-medium hover:bg-blue-700">
              Add subject
            </button>
          </form>
        </div>
      )}

      {selectedExamId && canManage && subjects.length > 0 && (
        <form onSubmit={handleSubmitMarks} className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">3. Enter marks for one subject (whole class at once)</h2>
          <div className="flex gap-3 items-end mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Subject</label>
              <select
                required
                value={entrySubject}
                onChange={(e) => setEntrySubject(e.target.value)}
                className="border border-slate-300 rounded px-3 py-1.5 text-sm"
              >
                <option value="">Select subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.subject}>
                    {s.subject}
                  </option>
                ))}
              </select>
            </div>
            {selectedSubjectDef && (
              <div className="text-sm text-slate-500">Out of {selectedSubjectDef.totalMarks} marks</div>
            )}
          </div>

          {entrySubject && students.length > 0 && (
            <div className="space-y-2 mb-4">
              {students.map((s) => (
                <div key={s.id} className="flex items-center justify-between border-t border-slate-100 pt-2">
                  <span className="text-sm">{s.name}</span>
                  <input
                    type="number"
                    min="0"
                    max={selectedSubjectDef?.totalMarks}
                    placeholder="Marks obtained"
                    value={marks[s.id] || ''}
                    onChange={(e) => setMarks({ ...marks, [s.id]: e.target.value })}
                    className="border border-slate-300 rounded px-2 py-1 text-sm w-28"
                  />
                </div>
              ))}
            </div>
          )}

          {entrySubject && (
            <button type="submit" className="bg-blue-600 text-white rounded px-4 py-1.5 text-sm font-medium hover:bg-blue-700">
              Save marks
            </button>
          )}
        </form>
      )}

      {selectedExamId && canManage && subjects.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6 flex gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Student</label>
            <select
              value={resultCardStudentId}
              onChange={(e) => {
                setResultCardStudentId(e.target.value);
                setResultCard(null);
              }}
              className="border border-slate-300 rounded px-3 py-1.5 text-sm"
            >
              <option value="">Select student</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleGenerateResultCard}
            disabled={!resultCardStudentId}
            className="bg-slate-800 text-white rounded px-4 py-1.5 text-sm font-medium hover:bg-slate-900 disabled:opacity-50"
          >
            4. Generate result card
          </button>
        </div>
      )}

      {user?.role === 'parent' && selectedExamId && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-2">Your child's grades for this exam</h2>
          <table className="w-full text-sm bg-white rounded-lg border border-slate-200 overflow-hidden">
            <thead className="bg-slate-100 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-2">Subject</th>
                <th className="px-4 py-2">Marks</th>
              </tr>
            </thead>
            <tbody>
              {myGrades.map((g) => (
                <tr key={g.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{g.subject}</td>
                  <td className="px-4 py-2">
                    {g.marksObtained} / {g.totalMarks}
                  </td>
                </tr>
              ))}
              {myGrades.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-center text-slate-400">
                    No grades recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {resultCard && selectedStudentRow && (
        <div className="mb-6">
          <div className="flex items-center justify-end mb-2 no-print">
            <button
              onClick={() => window.print()}
              className="bg-slate-100 text-slate-700 border border-slate-300 rounded px-3 py-1 text-xs font-medium hover:bg-slate-200"
            >
              Print / Save as PDF
            </button>
          </div>
          <div id="result-card-print">
            <h2 className="text-sm font-semibold text-slate-700 mb-2">
              Result card — {selectedStudentRow.studentName} — {resultCard.exam.examName} ({resultCard.exam.term}) —{' '}
              {resultCard.class.className}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm bg-white rounded-lg border border-slate-200 overflow-hidden">
                <thead className="bg-slate-100 text-slate-600 text-left">
                  <tr>
                    <th className="px-4 py-2">Subject</th>
                    <th className="px-4 py-2">Marks obtained</th>
                    <th className="px-4 py-2">Total marks</th>
                  </tr>
                </thead>
                <tbody>
                  {resultCard.subjects.map((s) => (
                    <tr key={s.subject} className="border-t border-slate-100">
                      <td className="px-4 py-2">{s.subject}</td>
                      <td className="px-4 py-2">{selectedStudentRow.marks[s.subject] ?? '-'}</td>
                      <td className="px-4 py-2">{s.totalMarks}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-slate-200 font-medium bg-slate-50">
                    <td className="px-4 py-2">Total</td>
                    <td className="px-4 py-2">{selectedStudentRow.totalObtained}</td>
                    <td className="px-4 py-2">{selectedStudentRow.totalPossible}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex gap-6 mt-3 text-sm text-slate-700">
              <div>
                Percentage: <span className="font-medium">{selectedStudentRow.percentage ?? '-'}%</span>
              </div>
              <div>
                Class rank: <span className="font-medium">{selectedStudentRow.rank}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
