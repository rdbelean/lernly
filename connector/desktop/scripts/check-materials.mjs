import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const course = process.argv[2], report = process.argv[3];
if (!course || !report) throw new Error('Usage: node scripts/check-materials.mjs <course-folder> <report.json>');
const client = new Client({ name: 'lernly-material-audit', version: '0.2.0' });
const transport = new StdioClientTransport({ command: process.execPath,
  args: [path.join(root, 'build/extension/server/index.mjs')], env: { ...process.env, LERNLY_COURSE_DIR: path.resolve(course) }, stderr: 'pipe' });
await client.connect(transport);
const call = async (name, args = {}) => {
  const result = await client.callTool({ name, arguments: args }, undefined, { timeout: 120000 });
  return result.isError ? { error: result.content[0].text } : JSON.parse(result.content[0].text);
};
try {
  const inventory = await call('lernly_inventory'), results = [];
  if (inventory.error) throw new Error(inventory.error);
  for (const file of inventory.files.filter(x => x.supported)) {
    const started = Date.now();
    const result = await call('lernly_index_material', { file: file.file });
    results.push({ ...result, file: file.file, elapsed_ms: Date.now() - started });
    console.log(JSON.stringify({ file: file.file, pages: result.pages, duplicate_of: result.duplicate_of, error: result.error, elapsed_ms: Date.now() - started }));
  }
  await fs.writeFile(report, JSON.stringify({ inventory, results }, null, 2));
} finally { await client.close(); }
