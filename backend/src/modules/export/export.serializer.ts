import { Parser } from "json2csv";
import ExcelJS from "exceljs";

export interface SerializedExport {
  buffer: Buffer | string;
  contentType: string;
  extension: string;
}

/**
 * Convert an array of objects to CSV format.
 */
export function toCSV(data: Record<string, unknown>[], fields?: string[]): SerializedExport {
  if (data.length === 0) {
    return { buffer: "", contentType: "text/csv", extension: "csv" };
  }
  const opts = fields ? { fields } : {};
  const parser = new Parser(opts);
  const csv = parser.parse(data);
  return { buffer: csv, contentType: "text/csv", extension: "csv" };
}

/**
 * Convert an array of objects to pretty-printed JSON.
 */
export function toJSON(data: Record<string, unknown>[]): SerializedExport {
  const json = JSON.stringify(data, null, 2);
  return { buffer: json, contentType: "application/json", extension: "json" };
}

/**
 * Convert an array of objects to an XLSX workbook buffer.
 */
export async function toXLSX(
  data: Record<string, unknown>[],
  sheetName: string = "Export",
): Promise<SerializedExport> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  if (data.length === 0) {
    const buf = Buffer.from(await workbook.xlsx.writeBuffer());
    return {
      buffer: buf,
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      extension: "xlsx",
    };
  }

  // Derive columns from the first row's keys
  const keys = Object.keys(data[0]);
  sheet.columns = keys.map((key) => ({
    header: key,
    key,
    width: Math.max(key.length + 4, 15),
  }));

  // Style the header row
  for (const row of data) {
    const sanitised: Record<string, unknown> = {};
    for (const key of keys) {
      const val = row[key];
      // ExcelJS cannot serialise plain objects/arrays — stringify them.
      sanitised[key] =
        val !== null && typeof val === "object" ? JSON.stringify(val) : val;
    }
    sheet.addRow(sanitised);
  }

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  });

  const buf = Buffer.from(await workbook.xlsx.writeBuffer());
  return {
    buffer: buf,
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    extension: "xlsx",
  };
}
