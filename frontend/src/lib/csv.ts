/** Quotes a value so separators, quotes and line breaks survive the round trip. */
function escape(value: string): string {
  return /[";\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/**
 * Builds a CSV file and hands it to the browser.
 *
 * Fields are separated by semicolons and the file carries a BOM, because that
 * is what Excel in a Spanish locale expects: with commas it drops every row
 * into a single column, and without the BOM it mangles accents.
 */
export function downloadCsv(
  filename: string,
  headers: readonly string[],
  rows: readonly (readonly string[])[],
): void {
  const content = [headers, ...rows].map((row) => row.map(escape).join(';')).join('\r\n');
  const blob = new Blob([`﻿${content}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}
