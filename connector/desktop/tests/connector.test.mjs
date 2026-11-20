import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { PDFDocument, StandardFonts } from 'pdf-lib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = path.join(root, 'tests/fixtures/course');

async function context(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'lernly-mcp-test-'));
  const prompts = path.join(dir, 'prompt-overrides');
  await fs.cp(path.join(root, 'prompts'), prompts, { recursive: true });
  const course = path.join(dir, 'course');
  await fs.mkdir(course);
  const transport = new StdioClientTransport({ command: process.execPath,
    args: [path.join(root, 'build/extension/server/index.mjs')],
    env: { ...process.env, LERNLY_COURSE_DIR: course, LERNLY_PROMPTS_DIR: prompts, LERNLY_PYTHON: process.env.LERNLY_PYTHON || 'python3' }, stderr: 'pipe' });
  let client = new Client({ name: 'lernly-integration-test', version: '1.0.0' });
  let stderr = '';
  transport.stderr?.on('data', b => { stderr += b; });
  await client.connect(transport);
  t.after(async () => { await client.close(); await fs.rm(dir, { recursive: true, force: true }); });
  const call = async (name, args = {}, expectError = false) => {
    const result = await client.callTool({ name, arguments: args }, undefined, { timeout: 120000 });
    if (expectError) { assert.equal(result.isError, true, JSON.stringify(result)); return result.content[0].text; }
    assert.ok(!result.isError, result.content?.[0]?.text + stderr);
    return JSON.parse(result.content[0].text);
  };
  const restart = async () => {
    await client.close();
    client = new Client({ name: 'lernly-restarted-client', version: '1.0.0' });
    await client.connect(new StdioClientTransport({ command: process.execPath,
      args: [path.join(root, 'build/extension/server/index.mjs')],
      env: { ...process.env, LERNLY_COURSE_DIR: course, LERNLY_PROMPTS_DIR: prompts }, stderr: 'pipe' }));
  };
  return { course, dir, prompts, call, client, restart };
}

test('packaged MCP: discovery, hot prompts, local reading, duplicates, search, invalidation and boundaries', async t => {
  const { course, dir, prompts, call, client } = await context(t);
  assert.equal((await client.listTools()).tools.length, 13);
  assert.equal((await client.listPrompts()).prompts[0].name, 'lernly-start');
  assert.ok((await client.getPrompt({ name: 'lernly-start', arguments: { ziel: 'Mathe' } })).messages[0].content.text.includes('Mathe'));
  const before = await call('lernly_instructions');
  assert.ok(before.instructions.includes('Uni-/Semester-Ordner'));
  assert.ok(before.instructions.includes('lernly_select_course'));
  const fmt = await call('lernly_instructions', { mode: 'format' });
  assert.ok(fmt.instructions.includes('Tax-Mock-Trainer'));
  await fs.appendFile(path.join(prompts, 'base.md'), '\nTest-Prompt-Änderung');
  const after = await call('lernly_instructions');
  assert.notEqual(before.prompt_revision, after.prompt_revision);
  assert.ok(after.instructions.includes('Test-Prompt-Änderung'));
  const text = 'Discounted cash flow: PV = 1000 / 1.1 ** 3.\n' + 'Finanzierung '.repeat(2200);
  await fs.writeFile(path.join(course, 'Vorlesung.txt'), text);
  await fs.writeFile(path.join(course, 'Duplikat.txt'), text);
  const inventory = await call('lernly_inventory');
  assert.equal(inventory.files.length, 2);
  const indexed = await call('lernly_index_material', { file: 'Vorlesung.txt' });
  assert.equal(indexed.pages, 3);
  assert.equal((await call('lernly_index_material', { file: 'Duplikat.txt' })).duplicate_of[0], 'Vorlesung.txt');
  assert.equal((await call('lernly_index_material', { file: 'Vorlesung.txt' })).reused, true);
  let next = { file: 'Vorlesung.txt' }, rebuilt = '';
  while (next) { const p = await call('lernly_read_material', { ...next, max_chars: 1000 }); rebuilt += p.pages.map(x => x.text).join(''); next = p.next; }
  assert.equal(rebuilt, text);
  assert.equal((await call('lernly_search_material', { query: 'Discounted' })).results.length, 2);
  await fs.appendFile(path.join(course, 'Vorlesung.txt'), ' geändert');
  assert.match(await call('lernly_read_material', { file: 'Vorlesung.txt' }, true), /geändert/);
  assert.deepEqual((await call('lernly_index_material', { file: 'Duplikat.txt' })).duplicate_of, []);
  await fs.writeFile(path.join(dir, 'private.txt'), 'private');
  await fs.symlink(path.join(dir, 'private.txt'), path.join(course, 'escape.txt'));
  assert.match(await call('lernly_index_material', { file: 'escape.txt' }, true), /Links/);
  await fs.link(path.join(dir, 'private.txt'), path.join(course, 'hardlink.txt'));
  await call('lernly_index_material', { file: 'hardlink.txt' }, true);
  for (const file of ['../private.txt', '/etc/passwd', '.env', '_lernly/kurs.json']) await call('lernly_index_material', { file }, true);
  await call('lernly_read_material', { file: 'Duplikat.txt', page: -1 }, true);
  await call('lernly_calculate', { expression: '__import__("os").getcwd()' }, true);
  const calculation = await call('lernly_calculate', { expression: '1000 / 1.1 ** 3' });
  assert.ok(Math.abs(calculation.result - 751.3148009015775) < 1e-8);
  await call('lernly_calculate', { expression: '2 ** 100000' }, true);
});

test('packaged PDF extraction retains pages and flags empty pages without external PDF tools', async t => {
  const { course, call } = await context(t);
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.addPage().drawText('Corporate Finance: Market efficiency, 10 points.', { font });
  pdf.addPage();
  await fs.writeFile(path.join(course, 'Exam.pdf'), await pdf.save());
  const indexed = await call('lernly_index_material', { file: 'Exam.pdf' });
  assert.equal(indexed.pages, 2);
  assert.ok(indexed.low_text_pages.some(p => p.page === 2));
  assert.match((await call('lernly_read_material', { file: 'Exam.pdf' })).pages[0].text, /Market efficiency/);
});

test('packaged Office extraction handles spreadsheet formulas and presentation text', async t => {
  const { course, call } = await context(t);
  execFileSync('python3', ['-c', `import zipfile,sys
from pathlib import Path
p=Path(sys.argv[1])
with zipfile.ZipFile(p/'Valuation.xlsx','w') as z:
 z.writestr('xl/workbook.xml','<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="DCF" r:id="rId1"/></sheets></workbook>')
 z.writestr('xl/_rels/workbook.xml.rels','<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>')
 z.writestr('xl/worksheets/sheet1.xml','<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row><c r="A1"><v>1000</v></c><c r="B1"><f>A1/1.1</f><v>909.0909</v></c><c r="C1"><f>A1/2</f></c></row></sheetData></worksheet>')
with zipfile.ZipFile(p/'Slides.pptx','w') as z:
 z.writestr('ppt/slides/slide1.xml','<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:p><a:r><a:t>Market segmentation</a:t></a:r></a:p></p:sld>')
`, course]);
  const indexed = await call('lernly_index_material', { file: 'Valuation.xlsx' });
  assert.match(indexed.warnings[0], /1 Formeln ohne/);
  const sheet = await call('lernly_read_material', { file: 'Valuation.xlsx' });
  assert.equal(sheet.label, 'Blatt DCF');
  assert.match(sheet.pages[0].text, /909.0909/);
  assert.match(sheet.pages[0].text, /FEHLT/);
  await call('lernly_index_material', { file: 'Slides.pptx' });
  assert.match((await call('lernly_read_material', { file: 'Slides.pptx' })).pages[0].text, /Market segmentation/);
});

test('validated saves survive restarts, reject bad content/stale revisions, build trainer and export real cards', async t => {
  const { course, call, restart } = await context(t);
  const kurs = JSON.parse(await fs.readFile(path.join(fixture, 'kurs.json'), 'utf8'));
  const saved = await call('lernly_save_course_file', { file: 'kurs.json', data: kurs, expected_revision: null });
  assert.equal(saved.saved, true);
  await restart();
  assert.equal((await call('lernly_read_course_file', { file: 'kurs.json' })).data.id, kurs.id);
  await call('lernly_save_course_file', { file: 'kurs.json', data: kurs, expected_revision: null }, true);
  const bad = await call('lernly_save_course_file', { file: 'kurs.json', data: { ...kurs, topics: [] }, expected_revision: saved.revision });
  assert.equal(bad.saved, false);
  assert.equal((await call('lernly_read_course_file', { file: 'kurs.json' })).revision, saved.revision);
  for (const directory of ['themen', 'probeklausuren']) {
    for (const file of await fs.readdir(path.join(fixture, directory))) {
      const result = await call('lernly_save_course_file', { file: `${directory}/${file}`, data: JSON.parse(await fs.readFile(path.join(fixture, directory, file), 'utf8')), expected_revision: null });
      assert.equal(result.saved, true, JSON.stringify(result));
    }
  }
  const existing = await call('lernly_read_course_file', { file: 'themen/dcf.json' });
  const overescaped = structuredClone(existing.data);
  overescaped.theory.push({ type: 'formula', tex: ['PV = ' + '\\'.repeat(4) + 'frac{CF}{(1+r)^n}'] });
  const rejected = await call('lernly_save_course_file', { file: 'themen/dcf.json', data: overescaped, expected_revision: existing.revision });
  assert.equal(rejected.saved, false);
  assert.ok(rejected.errors.some(e => e.includes('mehrfach maskiert')));
  assert.equal((await call('lernly_read_course_file', { file: 'themen/dcf.json' })).revision, existing.revision);
  const built = await call('lernly_build_trainer');
  assert.equal(built.built, true);
  assert.ok(built.missing_topics.length > 0); // partial fixture is explicitly partial
  const html = await fs.readFile(built.path, 'utf8');
  assert.match(html, /lernly-data/);
  assert.ok(!html.includes('__LERNLY_DATA__'));
  const exported = await call('lernly_export_cards');
  assert.equal(exported.exported, true);
  assert.equal(exported.files.length, 2);
  assert.match(exported.files.find(x => x.path.endsWith('_anki.txt')).text, /#separator:tab/);
  const changed = await call('lernly_save_course_file', { file: 'kurs.json', data: { ...kurs, title: 'Updated title' }, expected_revision: saved.revision });
  assert.equal(changed.saved, true);
  assert.equal((await fs.readdir(path.join(course, '_lernly/history'))).length, 1);
  await call('lernly_save_course_file', { file: '../overwrite.json', data: {}, expected_revision: null }, true);
});

test('symlinks in state and output cannot redirect writes outside the selected folder', async t => {
  const { course, dir, call } = await context(t);
  const outside = path.join(dir, 'outside');
  await fs.mkdir(outside);
  await fs.symlink(outside, path.join(course, '_lernly'));
  await fs.writeFile(path.join(course, 'Readme.txt'), 'course data');
  await call('lernly_index_material', { file: 'Readme.txt' }, true);
  assert.deepEqual(await fs.readdir(outside), []);
});

test('generated trainer output refuses existing symlink targets', async t => {
  const { course, dir, call } = await context(t);
  await fs.cp(fixture, path.join(course, '_lernly'), { recursive: true });
  const outside = path.join(dir, 'do-not-overwrite.html');
  await fs.writeFile(outside, 'untouched');
  await fs.mkdir(path.join(course, '_lernly/output'));
  await fs.symlink(outside, path.join(course, '_lernly/output/Lernly-Trainer.html'));
  await call('lernly_build_trainer', {}, true);
  assert.equal(await fs.readFile(outside, 'utf8'), 'untouched');
});

test('repairs legacy errors in two files incrementally without accepting new errors', async t => {
  const { course, call } = await context(t);
  await fs.cp(fixture, path.join(course, '_lernly'), { recursive: true });
  const topicPath = path.join(course, '_lernly/themen/dcf.json');
  const mockPath = path.join(course, '_lernly/probeklausuren/a.json');
  const topic = JSON.parse(await fs.readFile(topicPath, 'utf8'));
  const mock = JSON.parse(await fs.readFile(mockPath, 'utf8'));
  const badTopic = structuredClone(topic), badMock = structuredClone(mock);
  badTopic.theory.push({ type: 'formula', tex: ['\\'.repeat(4) + 'frac{1}{2}'] });
  badMock.items[0].question += ' ' + '\\'.repeat(4) + '(x' + '\\'.repeat(4) + ')';
  await fs.writeFile(topicPath, JSON.stringify(badTopic));
  await fs.writeFile(mockPath, JSON.stringify(badMock));
  assert.equal((await call('lernly_build_trainer')).built, false);
  const old = await call('lernly_read_course_file', { file: 'themen/dcf.json' });
  const invalid = await call('lernly_save_course_file', { file: old.file, data: badTopic, expected_revision: old.revision });
  assert.equal(invalid.saved, false);
  const repaired = await call('lernly_save_course_file', { file: old.file, data: topic, expected_revision: old.revision });
  assert.equal(repaired.saved, true);
  assert.ok(repaired.remaining_errors.length > 0);
  assert.equal((await call('lernly_build_trainer')).built, false);
  const oldMock = await call('lernly_read_course_file', { file: 'probeklausuren/a.json' });
  const repairedMock = await call('lernly_save_course_file', { file: oldMock.file, data: mock, expected_revision: oldMock.revision });
  assert.equal(repairedMock.saved, true);
  assert.deepEqual(repairedMock.remaining_errors, []);
  assert.equal((await call('lernly_build_trainer')).built, true);
});

test('MCPB has self-contained runtime assets and no test courses or credentials', async () => {
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'build/extension/manifest.json'), 'utf8'));
  assert.equal(manifest.manifest_version, '0.3');
  assert.equal(manifest.user_config.course_directory.required, true);
  assert.equal(manifest.server.mcp_config.command, 'node');
  const listing = execFileSync('/usr/bin/unzip', ['-Z1', path.join(root, 'dist/lernly-beta-0.2.0.mcpb')], { encoding: 'utf8' });
  for (const required of ['server/index.mjs', 'src/pdf-worker.mjs', 'src/bridge.py', 'prompts/base.md', 'node_modules/unpdf/dist/pdfjs.mjs', 'icon.png']) assert.ok(listing.includes(required));
  assert.ok(!/(^|\/)(\.env[^/]*|\.git|\.test|fixtures|\.DS_Store)(\/|$)/m.test(listing));
});

test('lernly_sync_web_course validates, authorizes and posts normalized bundle', async t => {
  const { course, call } = await context(t);
  await fs.cp(fixture, path.join(course, '_lernly'), { recursive: true });

  const received = [];
  const server = http.createServer((req, res) => {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      received.push({ url: req.url, auth: req.headers.authorization, body: JSON.parse(raw) });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: true,
        course: { id: 'pack-123', title: 'Corporate Finance & Valuation', updated: false, topicCount: 1 },
        dashboardUrl: 'https://lernly-app.de/dashboard'
      }));
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const port = server.address().port;

  const missingTokenErr = await call('lernly_sync_web_course', { api_url: `http://127.0.0.1:${port}` }, true);
  assert.match(missingTokenErr, /Sync-Token|dashboard\/settings/);
  assert.equal(received.length, 0);

  const synced = await call('lernly_sync_web_course', {
    sync_token: 'lny1.test-payload.test-signature',
    api_url: `http://127.0.0.1:${port}`
  });
  assert.equal(synced.synced, true);
  assert.equal(synced.course.id, 'pack-123');
  assert.equal(synced.dashboard_url, 'https://lernly-app.de/dashboard');
  assert.equal(received.length, 1);
  assert.equal(received[0].url, '/api/trainer/sync');
  assert.equal(received[0].auth, 'Bearer lny1.test-payload.test-signature');
  assert.equal(received[0].body.bundle.course.id, 'corporate-finance');
  assert.ok(received[0].body.bundle.topics.dcf);
  assert.equal(received[0].body.bundle.mocks.length, 1);

  const topicPath = path.join(course, '_lernly/themen/dcf.json');
  const bad = JSON.parse(await fs.readFile(topicPath, 'utf8'));
  bad.schema = 'wrong.schema';
  await fs.writeFile(topicPath, JSON.stringify(bad));
  const blocked = await call('lernly_sync_web_course', {
    sync_token: 'lny1.test-payload.test-signature',
    api_url: `http://127.0.0.1:${port}`
  });
  assert.equal(blocked.synced, false);
  assert.ok(blocked.errors.length > 0);
  assert.equal(received.length, 1);
});

test('uni-folder multi-subject mode discovers subfolders, switches isolated roots and blocks escapes', async t => {
  const { course: uniRoot, dir, call } = await context(t);
  const cfDir = path.join(uniRoot, 'Corporate-Finance');
  const taxDir = path.join(uniRoot, 'Steuerrecht');
  await fs.mkdir(path.join(cfDir, 'Altklausuren'), { recursive: true });
  await fs.mkdir(taxDir, { recursive: true });
  await fs.writeFile(path.join(cfDir, 'Altklausuren', 'Exam23.txt'), 'DCF WACC 15 points.');
  await fs.writeFile(path.join(cfDir, 'Slides.txt'), 'Lecture slides.');
  await fs.writeFile(path.join(taxDir, 'Fall1.txt'), 'Paragraph 8b KStG.');
  const cfKurs = JSON.parse(await fs.readFile(path.join(fixture, 'kurs.json'), 'utf8'));
  await fs.mkdir(path.join(cfDir, '_lernly'), { recursive: true });
  await fs.writeFile(path.join(cfDir, '_lernly', 'kurs.json'), JSON.stringify(cfKurs));

  const outside = path.join(dir, 'outside-subject');
  await fs.mkdir(outside);
  await fs.symlink(outside, path.join(uniRoot, 'Link-Fach'));

  const initialStatus = await call('lernly_status');
  assert.equal(initialStatus.active_course, '.');
  assert.ok(initialStatus.available_courses.some(c => c.course === 'Corporate-Finance' && c.has_lernly_course === true && c.supported_files === 2 && c.title === cfKurs.title));
  assert.ok(initialStatus.available_courses.some(c => c.course === 'Steuerrecht' && c.has_lernly_course === false && c.supported_files === 1));
  assert.ok(!initialStatus.available_courses.some(c => c.course === 'Link-Fach'));

  const selectedTax = await call('lernly_select_course', { course: 'Steuerrecht' });
  assert.equal(selectedTax.active_course, 'Steuerrecht');
  assert.deepEqual(selectedTax.inventory.files.map(f => f.file), ['Fall1.txt']);

  const taxKurs = {
    ...cfKurs,
    id: 'tax-law',
    title: 'Steuerrecht I',
    topics: [{ id: 'kstg', title: 'Körperschaftsteuer', expectedPoints: 20, tier: 1 }]
  };
  const savedTax = await call('lernly_save_course_file', { file: 'kurs.json', data: taxKurs, expected_revision: null });
  assert.equal(savedTax.saved, true);
  assert.equal(JSON.parse(await fs.readFile(path.join(taxDir, '_lernly', 'kurs.json'), 'utf8')).title, 'Steuerrecht I');
  assert.equal(JSON.parse(await fs.readFile(path.join(cfDir, '_lernly', 'kurs.json'), 'utf8')).title, cfKurs.title);

  const selectedCf = await call('lernly_select_course', { course: 'Corporate-Finance' });
  assert.equal(selectedCf.active_course, 'Corporate-Finance');
  assert.ok(selectedCf.inventory.files.some(f => f.file === 'Altklausuren/Exam23.txt'));
  assert.ok(selectedCf.course_files.includes('kurs.json'));

  await call('lernly_select_course', { course: '../outside-subject' }, true);
  await call('lernly_select_course', { course: 'Link-Fach' }, true);
  await call('lernly_select_course', { course: 'Corporate-Finance/_lernly' }, true);
});
