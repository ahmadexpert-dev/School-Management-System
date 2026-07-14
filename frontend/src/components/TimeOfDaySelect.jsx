import { useEffect, useState } from 'react';

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

function from24h(value) {
  if (!value) return { hour12: '', minute: '', ampm: 'AM' };
  const [hStr, m] = value.split(':');
  const h = Number(hStr);
  const ampm = h >= 12 ? 'PM' : 'AM';
  let hour12 = h % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12: String(hour12), minute: m, ampm };
}

function to24h(hour12, minute, ampm) {
  if (!hour12 || minute === '') return '';
  let h = Number(hour12) % 12;
  if (ampm === 'PM') h += 12;
  return `${String(h).padStart(2, '0')}:${minute}`;
}

const selectClass = 'border border-slate-300 rounded px-3 py-1.5 text-sm';

// Keeps its own hour/minute/AM-PM state rather than deriving it purely from
// `value`, because a partial selection (hour picked, minute not yet) has no
// valid 24h-string representation — deriving from `value` alone would lose
// the hour the moment it's picked, before the minute is chosen.
export default function TimeOfDaySelect({ value, onChange, required }) {
  const [local, setLocal] = useState(() => from24h(value));

  useEffect(() => {
    const composed = to24h(local.hour12, local.minute, local.ampm);
    if (value !== composed && value !== undefined) {
      setLocal(from24h(value));
    }
    // Only re-sync from an externally-changed value (e.g. entering edit mode).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function update(next) {
    const merged = { ...local, ...next };
    setLocal(merged);
    onChange(to24h(merged.hour12, merged.minute, merged.ampm));
  }

  return (
    <div className="flex gap-2">
      <select
        required={required}
        value={local.hour12}
        onChange={(e) => update({ hour12: e.target.value })}
        className={selectClass}
      >
        <option value="">Hour</option>
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <select
        required={required}
        value={local.minute}
        onChange={(e) => update({ minute: e.target.value })}
        className={selectClass}
      >
        <option value="">Minutes</option>
        {MINUTES.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <select value={local.ampm} onChange={(e) => update({ ampm: e.target.value })} className={selectClass}>
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}
