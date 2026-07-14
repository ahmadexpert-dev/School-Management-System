import { useEffect, useState } from 'react';
import { listStudents, studentPhotoUrl } from '../../services/students';
import { listStaff } from '../../services/staff';

export default function IDCardsPage() {
  const [tab, setTab] = useState('student');
  const [students, setStudents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    listStudents().then(setStudents).catch((err) => setError(err.response?.data?.error || 'Failed to load students'));
    listStaff().then(setStaff).catch(() => {});
  }, []);

  const selectedStudent = students.find((s) => s.id === selectedId);
  const selectedStaff = staff.find((s) => s.id === selectedId);
  const card = tab === 'student' ? selectedStudent : selectedStaff;

  function handleTabChange(next) {
    setTab(next);
    setSelectedId('');
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-800 mb-4">ID Card Printing</h1>

      <div className="flex gap-2 mb-4 no-print">
        <button
          onClick={() => handleTabChange('student')}
          className={`px-4 py-1.5 rounded text-sm font-medium ${tab === 'student' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-300 text-slate-600'}`}
        >
          Student cards
        </button>
        <button
          onClick={() => handleTabChange('staff')}
          className={`px-4 py-1.5 rounded text-sm font-medium ${tab === 'staff' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-300 text-slate-600'}`}
        >
          Staff cards
        </button>
      </div>

      {error && <div className="text-sm text-red-600 mb-4 no-print">{error}</div>}

      <div className="mb-6 no-print">
        <label className="block text-xs font-medium text-slate-600 mb-1">
          {tab === 'student' ? 'Select student' : 'Select staff member'}
        </label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="border border-slate-300 rounded px-3 py-1.5 text-sm"
        >
          <option value="">Select...</option>
          {(tab === 'student' ? students : staff).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {card && (
        <div className="no-print mb-4">
          <button
            onClick={() => window.print()}
            className="bg-slate-100 text-slate-700 border border-slate-300 rounded px-3 py-1 text-xs font-medium hover:bg-slate-200"
          >
            Print / Save as PDF
          </button>
        </div>
      )}

      {card && (
        <div id="result-card-print">
          <div className="w-80 rounded-xl overflow-hidden border border-slate-300 shadow-sm">
            <div className="bg-blue-700 text-white px-4 py-3 text-center">
              <div className="text-sm font-semibold">School Management System</div>
              <div className="text-xs text-blue-100 capitalize">{tab === 'student' ? 'Student ID Card' : 'Staff ID Card'}</div>
            </div>
            <div className="bg-white p-4 space-y-2">
              <div className="w-16 h-16 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-slate-400 text-xs overflow-hidden">
                {tab === 'student' && card.photoUrl ? (
                  <img src={studentPhotoUrl(card.photoUrl)} alt="" className="w-full h-full object-cover" />
                ) : (
                  'Photo'
                )}
              </div>
              <div className="text-center">
                <div className="text-base font-semibold text-slate-800">{card.name}</div>
                {tab === 'student' ? (
                  <div className="text-xs text-slate-500">
                    {card.class?.className}
                    {card.section && ` - ${card.section}`}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 capitalize">{card.role}</div>
                )}
              </div>
              <div className="border-t border-slate-100 pt-2 text-xs text-slate-600 space-y-1">
                {tab === 'student' ? (
                  <>
                    <div>Admission date: {card.admissionDate?.slice(0, 10)}</div>
                    {card.guardianName && <div>Guardian: {card.guardianName}</div>}
                    {card.guardianPhone && <div>Guardian phone: {card.guardianPhone}</div>}
                  </>
                ) : (
                  <>
                    {card.subject && <div>Subject: {card.subject}</div>}
                    {card.phone && <div>Phone: {card.phone}</div>}
                    <div>Joined: {card.joiningDate?.slice(0, 10)}</div>
                  </>
                )}
                <div>ID: {card.id.slice(0, 8).toUpperCase()}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
