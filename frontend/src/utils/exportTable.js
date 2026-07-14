import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// columns: [{ key, label }], rows: array of plain objects (already formatted strings)
function toAoa(columns, rows) {
  return [columns.map((c) => c.label), ...rows.map((row) => columns.map((c) => row[c.key] ?? ''))];
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadCSV(filename, columns, rows) {
  const aoa = toAoa(columns, rows);
  const csv = aoa
    .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
  triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), filename);
}

export function downloadExcel(filename, columns, rows) {
  const sheet = XLSX.utils.aoa_to_sheet(toAoa(columns, rows));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Sheet1');
  XLSX.writeFile(book, filename);
}

export function downloadPDF(filename, title, columns, rows) {
  const doc = new jsPDF();
  doc.setFontSize(12);
  doc.text(title, 14, 12);
  autoTable(doc, {
    startY: 18,
    head: [columns.map((c) => c.label)],
    body: rows.map((row) => columns.map((c) => row[c.key] ?? '')),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [67, 56, 202] },
  });
  doc.save(filename);
}
