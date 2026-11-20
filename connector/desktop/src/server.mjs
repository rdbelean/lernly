import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { Lernly } from './service.mjs';

const service = new Lernly({ root: process.env.LERNLY_COURSE_DIR || process.argv[2] });
await service.init();
const server = new McpServer({ name: 'lernly', version: '0.2.0' }, {
  instructions: 'Lernly ist der lokale Uni-Ordner-, Kurs- und Lerntrainer-Connector. Zuerst lernly_instructions und lernly_status aufrufen. Liegen mehrere Fächer im Uni-Ordner, wählt Claude mit lernly_select_course gezielt das gewünschte Fach, analysiert Altklausuren und Vorlesungsfolien selbstständig, erstellt den Kurs in _lernly und synct ihn per lernly_sync_web_course direkt nach lernly-app.de.'
});
const text = value => ({ content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] });
// Serialize operations, including cross-file validation and atomic saves.
let queue = Promise.resolve();
function tool(name, description, inputSchema, action, writes = false, openWorld = false) {
  server.registerTool(name, { description, inputSchema, annotations: {
    readOnlyHint: !writes, destructiveHint: false, idempotentHint: true, openWorldHint: openWorld
  } }, args => {
    const run = queue.then(async () => {
      try { return text(await action(args)); }
      catch (e) { return { isError: true, content: [{ type: 'text', text: e.message.slice(0, 1600) }] }; }
    });
    queue = run.then(() => undefined, () => undefined);
    return run;
  });
}
const file = z.string().min(1).max(500);
tool('lernly_status', 'Prüft Uni-/Kursordner, erkannte Fächer, Laufzeit, Prompt-Version und vorhandenes Kursgedächtnis.', {}, () => service.status());
tool('lernly_select_course', 'Listet alle Fächer/Unterordner im verbundenen Uni-Ordner auf oder wechselt aktiv in ein bestimmtes Fach (Unterordner), um ausschließlich dessen Unterlagen zu analysieren, den Kurs in dessen _lernly-Ordner zu bauen und nach lernly-app.de zu synchronisieren.', {
  course: z.string().min(1).max(300).optional()
}, args => service.selectCourse(args), true);
tool('lernly_instructions', 'Lädt die aktuellen Lernly-Anweisungen. Immer vor Planung/Bauen abrufen; Änderungen an Markdown-Prompts wirken sofort.', {
  mode: z.enum(['start', 'artifact', 'trainer', 'format']).default('start')
}, ({ mode }) => service.instructions(mode));
tool('lernly_inventory', 'Listet Rohunterlagen im freigegebenen Kursordner. Liest noch keine Inhalte; zeigt übersprungene/unsupported Dateien.', {}, () => service.storage.inventory());
tool('lernly_index_material', 'Extrahiert genau eine Rohdatei lokal in einen Cache. PDF/PPTX/DOCX/XLSX/TXT/MD/CSV. Liefert Seitenzahl, identische Duplikate und Textlücken. Keine OCR. Große Dateien vorab teilen.', { file }, ({ file }) => service.index(file), true);
tool('lernly_read_material', 'Liest bis zu 20 indexierte Seiten/Abschnitte mit getrennten Quellenbezeichnungen und Zeichenlimit. Bei next fortsetzen. Änderungen an der Quelle erfordern erneutes Indexieren.', {
  file, page: z.number().int().min(1).default(1), page_count: z.number().int().min(1).max(20).default(5), offset: z.number().int().min(0).default(0), max_chars: z.number().int().min(500).max(24000).default(16000)
}, args => service.readMaterial(args));
tool('lernly_search_material', 'Sucht eine wörtliche Zeichenfolge in bereits indexierten Quellen. Gibt Dateinamen, Seiten und Auszüge zurück, keine semantische Vollständigkeitsgarantie.', { query: z.string().min(2).max(200) }, ({ query }) => service.search(query));
tool('lernly_read_course_file', 'Liest Kursgedächtnis und Revision. Für neue Dateien ist revision null. Erlaubt kurs.json, themen/<id>.json, probeklausuren/<id>.json, spickzettel.json.', { file }, ({ file }) => service.readCourse(file));
tool('lernly_save_course_file', 'Validiert und speichert eine Kursdatei. Bei saved=false Fehler korrigieren. Vorherige Version bleibt als Backup. Format vorher über lernly_instructions(mode=format) lesen.', {
  file, data: z.record(z.string(), z.unknown()), expected_revision: z.string().regex(/^[a-f0-9]{64}$/).nullable()
}, args => service.saveCourse(args), true);
tool('lernly_calculate', 'Berechnet arithmetische Ausdrücke zur unabhängigen Prüfung von Übungslösungen. Punkt als Dezimaltrenner; + - * / ** % und Klammern. Keine Python-Codeausführung.', {
  expression: z.string().min(1).max(500)
}, ({ expression }) => service.bridge({ op: 'calculate', expression }));
tool('lernly_build_trainer', 'Baut aus gespeicherten, validierten Kursdaten den lokalen HTML-Trainer. Gibt offene Themen und Dateipfad zurück. Kein natives Claude-Artifact; dieses erstellt Claude selbst.', {}, () => service.build(), true);
tool('lernly_sync_web_course', 'Synchronisiert den lokal gespeicherten und validierten _lernly-Kurs direkt in das Lernly Web-Dashboard (lernly-app.de/dashboard). Nutzt den hinterlegten Sync-Token oder einen direkt übergebenen sync_token aus lernly-app.de/dashboard/settings.', {
  sync_token: z.string().min(10).max(1000).optional(),
  api_url: z.string().url().optional()
}, args => service.syncToWeb(args), true, true);
tool('lernly_export_cards', 'Exportiert gespeicherte Karteikarten für manuellen Anki-/Quizlet-Import. Liefert Dateien und TSV-Text. Kein Cloud-Sync.', { format: z.enum(['anki', 'quizlet', 'both']).default('both') }, ({ format }) => service.exportCards(format), true);
server.registerPrompt('lernly-start', { title: 'Mit Lernly lernen', description: 'Kurs aus dem freigegebenen Ordner einrichten und ein Study OS erstellen.', argsSchema: { ziel: z.string().optional() } }, async ({ ziel }) => ({ messages: [{ role: 'user', content: { type: 'text', text: `${(await service.instructions()).instructions}\n\nMein Lernziel: ${ziel || 'Klausurvorbereitung. Analysiere meinen Kurs und hilf mir mit einem interaktiven Study OS.'}` } }] }));
await server.connect(new StdioServerTransport());
