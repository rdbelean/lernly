import fs from 'node:fs/promises';
import { getDocumentProxy } from 'unpdf';

// Isolated child process: PDFs cannot exhaust the MCP server's heap or write
// parser diagnostics into its JSON-RPC stdout stream.
console.log = (...args) => console.error(...args);
try {
  const pdf = await getDocumentProxy(new Uint8Array(await fs.readFile(process.argv[2])), { verbosity: 0, isEvalSupported: false });
  if (pdf.numPages > 2500) throw new Error('Mehr als 2500 Seiten: bitte die PDF in Abschnitte aufteilen.');
  const pages = [];
  let chars = 0;
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map(item => ('str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '')).join('').trim();
    chars += text.length;
    if (chars > 20_000_000) throw new Error('Mehr als 20 Mio. Textzeichen: bitte die PDF aufteilen.');
    pages.push({ label: `Seite ${i}`, text });
    page.cleanup();
  }
  await pdf.destroy();
  process.stdout.write(JSON.stringify({ pages, warnings: [] }));
} catch (e) { console.error(e.message); process.exitCode = 1; }
