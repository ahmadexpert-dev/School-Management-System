export default function TableToolbar({
  title,
  showDeactivated,
  onToggleDeactivated,
  filterValue,
  onFilterChange,
  filterOptions,
  filterAllLabel = 'All',
  search,
  onSearchChange,
  onExportCSV,
  onExportExcel,
  onExportPDF,
  onPrint,
}) {
  return (
    <div className="rounded-lg overflow-hidden border border-slate-200 mb-4">
      <div
        className="px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap"
        style={{ background: 'linear-gradient(90deg, #4338ca, #7c3aed)' }}
      >
        <h2 className="text-white text-sm font-semibold">{title}</h2>
        <div className="flex items-center gap-2">
          {onToggleDeactivated && (
            <button
              onClick={onToggleDeactivated}
              className={`text-xs font-medium rounded px-3 py-1.5 ${
                showDeactivated ? 'bg-white text-violet-700' : 'bg-amber-500 text-white hover:bg-amber-600'
              }`}
            >
              {showDeactivated ? 'Show Active' : 'Load Deactivated'}
            </button>
          )}
          {filterOptions && (
            <select
              value={filterValue}
              onChange={(e) => onFilterChange(e.target.value)}
              className="text-sm rounded px-2 py-1.5 border-0"
            >
              <option value="">{filterAllLabel}</option>
              {filterOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      <div className="bg-white px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 no-print">
          <button
            onClick={onExportExcel}
            className="text-xs font-medium rounded px-3 py-1.5 bg-emerald-500 text-white hover:bg-emerald-600"
          >
            Excel
          </button>
          <button
            onClick={onExportCSV}
            className="text-xs font-medium rounded px-3 py-1.5 bg-amber-500 text-white hover:bg-amber-600"
          >
            CSV
          </button>
          <button
            onClick={onExportPDF}
            className="text-xs font-medium rounded px-3 py-1.5 bg-rose-500 text-white hover:bg-rose-600"
          >
            PDF
          </button>
          <button
            onClick={onPrint}
            className="text-xs font-medium rounded px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700"
          >
            Print
          </button>
        </div>
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search..."
          className="border border-slate-300 rounded px-3 py-1.5 text-sm w-56 no-print"
        />
      </div>
    </div>
  );
}
