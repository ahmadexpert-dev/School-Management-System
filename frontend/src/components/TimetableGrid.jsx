const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function timeLabel(t) {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export { DAYS };

export default function TimetableGrid({ entries, editable, onEdit, onDelete, showClassColumn }) {
  const slotKey = (e) => `${e.startTime}-${e.endTime}`;
  const slots = [...new Set(entries.map(slotKey))].sort();

  if (slots.length === 0) {
    return <p className="text-sm text-slate-400 bg-white rounded-lg border border-slate-200 px-4 py-6 text-center">No periods scheduled yet.</p>;
  }

  const byDayAndSlot = new Map();
  for (const e of entries) {
    byDayAndSlot.set(`${e.dayOfWeek}|${slotKey(e)}`, e);
  }

  return (
    <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
      <table className="w-full text-sm border-collapse min-w-[800px]">
        <thead>
          <tr style={{ background: 'linear-gradient(90deg, #4338ca, #7c3aed)' }}>
            <th className="px-3 py-2 text-left text-white font-semibold sticky left-0" style={{ background: '#4338ca' }}>
              Time
            </th>
            {DAYS.map((d) => (
              <th key={d} className="px-3 py-2 text-left text-white font-semibold whitespace-nowrap">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map((slot) => {
            const [start, end] = slot.split('-');
            return (
              <tr key={slot} className="border-t border-slate-100">
                <td className="px-3 py-2 text-xs font-medium text-slate-600 whitespace-nowrap bg-slate-50 sticky left-0">
                  {timeLabel(start)} – {timeLabel(end)}
                </td>
                {DAYS.map((_, dayIndex) => {
                  const entry = byDayAndSlot.get(`${dayIndex}|${slot}`);
                  return (
                    <td key={dayIndex} className="px-3 py-2 align-top">
                      {entry ? (
                        <div
                          className={`rounded-md px-2 py-1.5 bg-violet-50 border border-violet-100 ${
                            editable ? 'cursor-pointer hover:bg-violet-100' : ''
                          }`}
                          onClick={() => editable && onEdit?.(entry)}
                        >
                          <div className="text-xs font-semibold text-violet-800">{entry.subject}</div>
                          {entry.teacher && <div className="text-[11px] text-violet-500">{entry.teacher.name}</div>}
                          {showClassColumn && entry.class && (
                            <div className="text-[11px] text-violet-500">{entry.class.className}</div>
                          )}
                          {editable && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete?.(entry.id);
                              }}
                              className="no-print text-[10px] text-red-500 hover:underline mt-0.5"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-200 text-xs">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
