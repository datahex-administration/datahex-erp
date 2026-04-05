import * as XLSX from "xlsx";

export function exportToExcel<T extends object>(
  data: T[],
  columns: { key: string; label: string }[],
  filename: string
) {
  const rows = data.map((item) =>
    columns.reduce(
      (row, col) => {
        row[col.label] = formatValue(item, col.key);
        return row;
      },
      {} as Record<string, unknown>
    )
  );

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportToCSV<T extends object>(
  data: T[],
  columns: { key: string; label: string }[],
  filename: string
) {
  const header = columns.map((c) => `"${c.label}"`).join(",");
  const rows = data.map((item) =>
    columns
      .map((col) => {
        const val = formatValue(item, col.key);
        if (typeof val === "string") return `"${val.replace(/"/g, '""')}"`;
        return val ?? "";
      })
      .join(",")
  );

  const csv = [header, ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function formatValue(item: object, key: string): unknown {
  const parts = key.split(".");
  let val: unknown = item;
  for (const part of parts) {
    if (val == null) return "";
    val = (val as Record<string, unknown>)[part];
  }
  if (val instanceof Date) return val.toISOString().split("T")[0];
  if (val === null || val === undefined) return "";
  return val;
}
