import { useEffect, useRef, useState } from 'react';
import {
  listStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  uploadStudentPhoto,
  studentPhotoUrl,
} from '../../services/students';
import { listClasses } from '../../services/classes';
import { useAuth } from '../../hooks/useAuth';
import { compareClassNames } from '../../utils/classOrder';
import TableToolbar from '../../components/TableToolbar';
import { downloadCSV, downloadExcel, downloadPDF } from '../../utils/exportTable';

const emptyForm = {
  classId: '',
  name: '',
  section: '',
  admissionDate: '',
  gender: '',
  dateOfBirth: '',
  placeOfBirth: '',
  bFormNumber: '',
  religion: '',
  surname: '',
  previousSchool: '',
  remarks: '',
  guardianName: '',
  guardianPhone: '',
  fatherIdCard: '',
  fatherEmail: '',
  motherPhone: '',
  whatsappNumber: '',
  homeAddress: '',
  customFeeOverride: '',
  discountType: 'none',
  discountNotes: '',
  createParentAccount: false,
};

function SectionHeader({ children }) {
  return (
    <div
      className="col-span-full -mx-4 -mt-4 mb-3 px-4 py-2 rounded-t-lg text-white text-sm font-semibold"
      style={{ background: 'linear-gradient(90deg, #4338ca, #7c3aed)' }}
    >
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputClass = 'border border-slate-300 rounded px-3 py-1.5 text-sm w-full';

function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraError, setCameraError] = useState('');

  useEffect(() => {
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'user' } })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setCameraError('Could not access camera. Check browser permissions.'));

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function handleCapture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) onCapture(new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      onClose();
    }, 'image/jpeg');
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-4 w-80">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Capture live photo</h3>
        {cameraError ? (
          <p className="text-sm text-red-600">{cameraError}</p>
        ) : (
          <video ref={videoRef} autoPlay playsInline className="w-full rounded bg-slate-900" />
        )}
        <div className="flex justify-end gap-2 mt-3">
          <button type="button" onClick={onClose} className="text-sm text-slate-500 px-3 py-1.5 hover:underline">
            Cancel
          </button>
          {!cameraError && (
            <button
              type="button"
              onClick={handleCapture}
              className="text-white rounded px-3 py-1.5 text-sm font-medium"
              style={{ background: 'linear-gradient(90deg, #059669, #10b981)' }}
            >
              Capture
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StudentsPage() {
  const { user } = useAuth();
  const canEdit = user?.role === 'owner' || user?.role === 'admin';
  const canSeeFees = user?.role === 'owner' || user?.role === 'admin';

  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [classFilter, setClassFilter] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [photoFile, setPhotoFile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingPhotoUrl, setEditingPhotoUrl] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [parentAccountResult, setParentAccountResult] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [search, setSearch] = useState('');
  const [showDeactivated, setShowDeactivated] = useState(false);
  const [printMode, setPrintMode] = useState(false);
  const formRef = useRef(null);

  async function loadClasses() {
    if (!canEdit) return;
    try {
      setClasses(await listClasses());
    } catch {
      // class list is only needed for the filter/form; ignore failures here
    }
  }

  async function loadStudents() {
    setIsLoading(true);
    try {
      setStudents(await listStudents(classFilter ? { classId: classFilter } : undefined));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load students');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classFilter]);

  // Scroll the form into view whenever it opens, so editing a row further
  // down the list doesn't look like a no-op.
  useEffect(() => {
    if (showForm) {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showForm, editingId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setParentAccountResult(null);
    try {
      const payload = {
        ...form,
        customFeeOverride: form.customFeeOverride === '' ? null : Number(form.customFeeOverride),
      };
      if (!payload.dateOfBirth) delete payload.dateOfBirth;
      if (!payload.fatherEmail) delete payload.fatherEmail;

      let student;
      let parentAccount = null;
      if (editingId) {
        student = await updateStudent(editingId, payload);
      } else {
        const result = await createStudent(payload);
        student = result.student ?? result;
        parentAccount = result.parentAccount ?? null;
      }
      if (photoFile && student?.id) {
        await uploadStudentPhoto(student.id, photoFile);
      }
      if (parentAccount?.created) {
        setParentAccountResult(parentAccount);
      }
      setForm(emptyForm);
      setPhotoFile(null);
      setEditingId(null);
      setEditingPhotoUrl(null);
      setShowForm(false);
      await loadStudents();
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    }
  }

  function startEdit(student) {
    setEditingId(student.id);
    setEditingPhotoUrl(student.photoUrl || null);
    setPhotoFile(null);
    setShowForm(true);
    setForm({
      classId: student.classId,
      name: student.name,
      section: student.section || '',
      admissionDate: student.admissionDate?.slice(0, 10) || '',
      gender: student.gender || '',
      dateOfBirth: student.dateOfBirth?.slice(0, 10) || '',
      placeOfBirth: student.placeOfBirth || '',
      bFormNumber: student.bFormNumber || '',
      religion: student.religion || '',
      surname: student.surname || '',
      previousSchool: student.previousSchool || '',
      remarks: student.remarks || '',
      guardianName: student.guardianName || '',
      guardianPhone: student.guardianPhone || '',
      fatherIdCard: student.fatherIdCard || '',
      fatherEmail: student.fatherEmail || '',
      motherPhone: student.motherPhone || '',
      whatsappNumber: student.whatsappNumber || '',
      homeAddress: student.homeAddress || '',
      customFeeOverride: student.customFeeOverride ?? '',
      discountType: student.discountType || 'none',
      discountNotes: student.discountNotes || '',
      createParentAccount: false,
    });
  }

  async function handleDelete(id) {
    if (!confirm('Delete this student?')) return;
    try {
      await deleteStudent(id);
      await loadStudents();
    } catch (err) {
      setError(err.response?.data?.error || 'Delete failed');
    }
  }

  async function handleToggleStatus(student) {
    try {
      await updateStudent(student.id, { status: student.status === 'inactive' ? 'active' : 'inactive' });
      await loadStudents();
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed');
    }
  }

  const visibleStudents = students.filter((s) => {
    const isInactive = s.status === 'inactive';
    if (showDeactivated ? !isInactive : isInactive) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.studentCode?.toLowerCase().includes(q) ||
      s.guardianName?.toLowerCase().includes(q)
    );
  });

  const EXPORT_COLUMNS = [
    { key: 'studentCode', label: 'Code' },
    { key: 'name', label: 'Name' },
    { key: 'className', label: 'Class' },
    { key: 'section', label: 'Section' },
    { key: 'guardianName', label: 'Guardian' },
    { key: 'guardianPhone', label: 'Phone' },
    { key: 'status', label: 'Status' },
  ];
  const exportRows = visibleStudents.map((s) => ({
    studentCode: s.studentCode || '',
    name: s.name,
    className: s.class?.className || '',
    section: s.section || '',
    guardianName: s.guardianName || '',
    guardianPhone: s.guardianPhone || '',
    status: s.status || 'active',
  }));

  function handlePrint() {
    setPrintMode(true);
    setTimeout(() => {
      window.print();
      setPrintMode(false);
    }, 50);
  }

  // Group students by class for a class-wise view. When a specific class
  // filter is applied, this collapses to a single group.
  const groups = [];
  const groupsByClassId = new Map();
  for (const s of visibleStudents) {
    const key = s.classId;
    if (!groupsByClassId.has(key)) {
      const group = { classId: key, className: s.class?.className || 'Unassigned', students: [] };
      groupsByClassId.set(key, group);
      groups.push(group);
    }
    groupsByClassId.get(key).students.push(s);
  }
  groups.sort((a, b) => compareClassNames(a.className, b.className));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-slate-800">Students</h1>
        {canEdit && (
          <button
            onClick={() => {
              setShowForm((v) => !v);
              setEditingId(null);
              setEditingPhotoUrl(null);
              setPhotoFile(null);
              setForm(emptyForm);
            }}
            className="text-white rounded px-4 py-1.5 text-sm font-medium"
            style={{ background: 'linear-gradient(90deg, #4338ca, #7c3aed)' }}
          >
            {showForm ? 'Close' : 'Admit student'}
          </button>
        )}
      </div>

      <TableToolbar
        title="Manage Student Accounts"
        showDeactivated={showDeactivated}
        onToggleDeactivated={() => setShowDeactivated((v) => !v)}
        filterValue={classFilter}
        onFilterChange={setClassFilter}
        filterOptions={classes.map((c) => ({ value: c.id, label: c.className }))}
        filterAllLabel="All classes"
        search={search}
        onSearchChange={setSearch}
        onExportCSV={() => downloadCSV('students.csv', EXPORT_COLUMNS, exportRows)}
        onExportExcel={() => downloadExcel('students.xlsx', EXPORT_COLUMNS, exportRows)}
        onExportPDF={() => downloadPDF('students.pdf', 'Students', EXPORT_COLUMNS, exportRows)}
        onPrint={handlePrint}
      />

      {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

      {parentAccountResult && (
        <div className="text-sm bg-emerald-50 border border-emerald-200 text-emerald-800 rounded px-4 py-3 mb-4 flex items-start justify-between gap-4">
          <div>
            Parent account created — email <b>{parentAccountResult.email}</b>, temporary password{' '}
            <b>{parentAccountResult.temporaryPassword}</b>. This was also emailed to the parent; it won't be shown
            again.
          </div>
          <button onClick={() => setParentAccountResult(null)} className="text-emerald-700 hover:underline shrink-0">
            Dismiss
          </button>
        </div>
      )}

      {showForm && canEdit && (
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6 mb-6 scroll-mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-slate-200 p-4 grid grid-cols-2 gap-3 content-start">
              <SectionHeader>Student Information</SectionHeader>
              <div className="col-span-2 flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                  {photoFile ? (
                    <img src={URL.createObjectURL(photoFile)} alt="" className="w-full h-full object-cover" />
                  ) : editingPhotoUrl ? (
                    <img src={studentPhotoUrl(editingPhotoUrl)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-slate-400">Photo</span>
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                    className="text-xs"
                  />
                  <p className="text-[11px] text-slate-400 mt-1 mb-1.5">JPEG/PNG/WEBP, up to 3MB</p>
                  <button
                    type="button"
                    onClick={() => setShowCamera(true)}
                    className="text-white rounded px-2.5 py-1 text-xs font-medium"
                    style={{ background: 'linear-gradient(90deg, #059669, #10b981)' }}
                  >
                    Capture live
                  </button>
                </div>
              </div>
              <Field label="Student name">
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Gender">
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Date of birth">
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Place of birth">
                <input
                  value={form.placeOfBirth}
                  onChange={(e) => setForm({ ...form, placeOfBirth: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="B-Form number">
                <input
                  placeholder="Nadra B-Form number (if any)"
                  value={form.bFormNumber}
                  onChange={(e) => setForm({ ...form, bFormNumber: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Religion">
                <input
                  value={form.religion}
                  onChange={(e) => setForm({ ...form, religion: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Surname / Caste">
                <input
                  value={form.surname}
                  onChange={(e) => setForm({ ...form, surname: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Previous school">
                <input
                  value={form.previousSchool}
                  onChange={(e) => setForm({ ...form, previousSchool: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <div className="col-span-2">
                <Field label="Remarks">
                  <input
                    placeholder="Any remarks about this admission"
                    value={form.remarks}
                    onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-4 grid grid-cols-2 gap-3 content-start">
              <SectionHeader>Parent Information</SectionHeader>
              <Field label="Father ID card">
                <input
                  placeholder="National ID card number"
                  value={form.fatherIdCard}
                  onChange={(e) => setForm({ ...form, fatherIdCard: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Father name">
                <input
                  value={form.guardianName}
                  onChange={(e) => setForm({ ...form, guardianName: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Father email">
                <input
                  type="email"
                  value={form.fatherEmail}
                  onChange={(e) => setForm({ ...form, fatherEmail: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Father phone">
                <input
                  value={form.guardianPhone}
                  onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Mother phone">
                <input
                  value={form.motherPhone}
                  onChange={(e) => setForm({ ...form, motherPhone: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="WhatsApp number">
                <input
                  placeholder="If different from father phone"
                  value={form.whatsappNumber}
                  onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <div className="col-span-2">
                <Field label="Home address">
                  <input
                    value={form.homeAddress}
                    onChange={(e) => setForm({ ...form, homeAddress: e.target.value })}
                    className={inputClass}
                  />
                </Field>
              </div>
              {!editingId && (
                <div className="col-span-2">
                  <Field label="Create parent account?">
                    <select
                      value={form.createParentAccount ? 'yes' : 'no'}
                      onChange={(e) => setForm({ ...form, createParentAccount: e.target.value === 'yes' })}
                      className={inputClass}
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes — requires father email above</option>
                    </select>
                  </Field>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4 grid grid-cols-3 gap-3">
            <SectionHeader>Academic Information</SectionHeader>
            <Field label="Class">
              <select
                required
                value={form.classId}
                onChange={(e) => setForm({ ...form, classId: e.target.value })}
                className={inputClass}
              >
                <option value="">Select class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.className}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Section">
              <input
                value={form.section}
                onChange={(e) => setForm({ ...form, section: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Admission date">
              <input
                required
                type="date"
                value={form.admissionDate}
                onChange={(e) => setForm({ ...form, admissionDate: e.target.value })}
                className={inputClass}
              />
            </Field>
            {canSeeFees && (
              <>
                <Field label="Monthly fee override (Rs.)">
                  <input
                    type="number"
                    min="0"
                    placeholder="Leave blank to use class fee"
                    value={form.customFeeOverride}
                    onChange={(e) => setForm({ ...form, customFeeOverride: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Discounted student?">
                  <select
                    value={form.discountType}
                    onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                    className={inputClass}
                  >
                    {['none', 'sibling', 'staff', 'scholarship', 'hardship'].map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Discount notes">
                  <input
                    value={form.discountNotes}
                    onChange={(e) => setForm({ ...form, discountNotes: e.target.value })}
                    className={inputClass}
                  />
                </Field>
              </>
            )}
            <div className="col-span-3">
              <button
                type="submit"
                className="text-white rounded px-4 py-1.5 text-sm font-medium"
                style={{ background: 'linear-gradient(90deg, #4338ca, #7c3aed)' }}
              >
                {editingId ? 'Update student' : 'Add student'}
              </button>
            </div>
          </div>
        </form>
      )}

      {showCamera && (
        <CameraCapture
          onCapture={(file) => setPhotoFile(file)}
          onClose={() => setShowCamera(false)}
        />
      )}

      {isLoading ? (
        <p className="text-slate-400 text-sm">Loading...</p>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 px-4 py-6 text-center text-slate-400 text-sm">
          No students found.
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.classId}>
              <h2 className="text-sm font-semibold text-slate-700 mb-2">
                {group.className} <span className="text-slate-400 font-normal">({group.students.length})</span>
              </h2>
              <table className="w-full text-sm bg-white rounded-lg border border-slate-200 overflow-hidden">
                <thead className="bg-slate-100 text-slate-600 text-left">
                  <tr>
                    <th className="px-4 py-2"></th>
                    <th className="px-4 py-2">Code</th>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Section</th>
                    <th className="px-4 py-2">Guardian</th>
                    {canEdit && <th className="px-4 py-2">Status</th>}
                    {canSeeFees && <th className="px-4 py-2">Discount</th>}
                    {canEdit && <th className="px-4 py-2"></th>}
                  </tr>
                </thead>
                <tbody>
                  {group.students.map((s) => (
                    <tr key={s.id} className="border-t border-slate-100">
                      <td className="px-4 py-2">
                        <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center">
                          {s.photoUrl ? (
                            <img src={studentPhotoUrl(s.photoUrl)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[9px] text-slate-400">{s.name?.[0]}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-slate-500">{s.studentCode || '-'}</td>
                      <td className="px-4 py-2">{s.name}</td>
                      <td className="px-4 py-2">{s.section || '-'}</td>
                      <td className="px-4 py-2">
                        {s.guardianName} {s.guardianPhone && `— ${s.guardianPhone}`}
                      </td>
                      {canEdit && (
                        <td className="px-4 py-2">
                          <button
                            onClick={() => handleToggleStatus(s)}
                            className={`text-xs font-medium rounded px-2 py-0.5 ${
                              s.status === 'inactive'
                                ? 'bg-slate-100 text-slate-500'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {s.status === 'inactive' ? 'Deactivated' : 'Active'}
                          </button>
                        </td>
                      )}
                      {canSeeFees && <td className="px-4 py-2 capitalize">{s.discountType || 'none'}</td>}
                      {canEdit && (
                        <td className="px-4 py-2 text-right space-x-3">
                          <button onClick={() => startEdit(s)} className="text-violet-600 hover:underline">
                            Edit
                          </button>
                          <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:underline">
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {printMode && (
        <div id="result-card-print" className="p-8">
          <h2 className="text-lg font-bold mb-4">Students {showDeactivated ? '(Deactivated)' : '(Active)'}</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-800 text-left">
                {EXPORT_COLUMNS.map((c) => (
                  <th key={c.key} className="py-1 pr-3">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {exportRows.map((row, i) => (
                <tr key={i} className="border-b border-slate-200">
                  {EXPORT_COLUMNS.map((c) => (
                    <td key={c.key} className="py-1 pr-3">
                      {row[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
