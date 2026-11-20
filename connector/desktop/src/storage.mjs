import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export const digest = value => createHash('sha256').update(value).digest('hex');
export const SUPPORTED = new Set(['.pdf', '.pptx', '.docx', '.xlsx', '.txt', '.md', '.csv']);
export const courseFile = /^(kurs\.json|spickzettel\.json|themen\/[a-z0-9][a-z0-9-]{0,47}\.json|probeklausuren\/[a-z0-9][a-z0-9-]{0,47}\.json)$/;

export class Storage {
  constructor(root) {
    this.root = root;
    this.baseRoot = root;
    this.activeCourse = '.';
  }

  async init() {
    if (!this.root || !path.isAbsolute(this.root)) throw new Error('Bitte einen absoluten Uni- oder Kursordner in den Erweiterungs-Einstellungen auswählen.');
    this.baseRoot = await fs.realpath(this.root);
    if (!(await fs.stat(this.baseRoot)).isDirectory()) throw new Error('Der ausgewählte Ordner ist kein Verzeichnis.');
    this.root = this.baseRoot;
    this.activeCourse = '.';
  }

  // Reject every symlink component, including existing output files. Resolve only
  // user-selected root itself (macOS /var -> /private/var is common).
  async resolveFrom(baseDir, relative, { createParents = false } = {}) {
    if (typeof relative !== 'string' || relative.includes('\\') || relative.includes('\0') || path.isAbsolute(relative)) throw new Error('Nur relative Pfade innerhalb des Kursordners sind erlaubt.');
    const parts = relative.split('/');
    if (!parts.length || parts.some(p => !p || p === '.' || p === '..' || p.startsWith('.'))) throw new Error('Ungültiger oder versteckter Pfad.');
    let current = baseDir;
    for (let i = 0; i < parts.length; i++) {
      current = path.join(current, parts[i]);
      try {
        const s = await fs.lstat(current);
        if (s.isSymbolicLink()) throw new Error('Symbolische Links werden nicht verfolgt.');
        if (s.isFile() && s.nlink > 1) throw new Error('Dateien mit mehreren Hardlinks werden nicht verwendet.');
        if (i < parts.length - 1 && !s.isDirectory()) throw new Error('Übergeordneter Pfad ist kein Verzeichnis.');
      } catch (e) {
        if (e.code !== 'ENOENT') throw e;
        if (createParents && i < parts.length - 1) await fs.mkdir(current, { mode: 0o700 });
      }
    }
    return current;
  }

  async resolve(relative, { createParents = false } = {}) {
    return this.resolveFrom(this.root, relative, { createParents });
  }

  async countSupportedFiles(dirPath, maxFiles = 2000) {
    let count = 0;
    const stack = [{ dir: dirPath, depth: 0 }];
    while (stack.length && count < maxFiles) {
      const { dir, depth } = stack.pop();
      if (depth > 10) continue;
      let entries;
      try { entries = await fs.readdir(dir, { withFileTypes: true }); }
      catch { continue; }
      for (const item of entries) {
        if (item.name.startsWith('.') || item.name.startsWith('~$') || ['_lernly', 'node_modules', '__MACOSX'].includes(item.name)) continue;
        if (item.isSymbolicLink()) continue;
        const full = path.join(dir, item.name);
        if (item.isDirectory()) stack.push({ dir: full, depth: depth + 1 });
        else if (item.isFile() && SUPPORTED.has(path.extname(item.name).toLowerCase())) count++;
      }
    }
    return count;
  }

  async inspectCourseDir(rel, absDir) {
    let hasLernly = false, title = null;
    try {
      const lernlyStat = await fs.lstat(path.join(absDir, '_lernly'));
      if (!lernlyStat.isSymbolicLink() && lernlyStat.isDirectory()) {
        const kursPath = path.join(absDir, '_lernly', 'kurs.json');
        const kursStat = await fs.lstat(kursPath);
        if (!kursStat.isSymbolicLink() && kursStat.isFile()) {
          hasLernly = true;
          const parsed = JSON.parse(await fs.readFile(kursPath, 'utf8'));
          if (typeof parsed?.title === 'string' && parsed.title.trim()) title = parsed.title.trim();
        }
      }
    } catch { /* No _lernly/kurs.json yet */ }
    const supported = await this.countSupportedFiles(absDir);
    return { course: rel, supported_files: supported, has_lernly_course: hasLernly, title };
  }

  async listCourses() {
    const courses = [];
    const baseInfo = await this.inspectCourseDir('.', this.baseRoot);
    if (baseInfo.has_lernly_course || baseInfo.supported_files > 0) courses.push(baseInfo);

    const walk = async (relPrefix, absDir, depth) => {
      if (depth > 2) return;
      let entries;
      try { entries = (await fs.readdir(absDir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name)); }
      catch { return; }
      for (const item of entries) {
        if (item.name.startsWith('.') || item.name.startsWith('~$') || ['_lernly', 'node_modules', '__MACOSX'].includes(item.name)) continue;
        if (item.isSymbolicLink() || !item.isDirectory()) continue;
        const rel = relPrefix ? `${relPrefix}/${item.name}` : item.name;
        const abs = await this.resolveFrom(this.baseRoot, rel);
        const info = await this.inspectCourseDir(rel, abs);
        if (depth === 1 || info.has_lernly_course || info.supported_files > 0) courses.push(info);
        if (depth < 2) await walk(rel, abs, depth + 1);
      }
    };
    await walk('', this.baseRoot, 1);

    return {
      base_root: this.baseRoot,
      active_course: this.activeCourse,
      active_root: this.root,
      courses,
    };
  }

  async selectCourse(relative = '.') {
    const cleaned = typeof relative === 'string' ? relative.trim().replace(/\/+$/, '') : '.';
    if (!cleaned || cleaned === '.') {
      this.root = this.baseRoot;
      this.activeCourse = '.';
      return { active_course: this.activeCourse, active_root: this.root };
    }
    if (cleaned.split('/').includes('_lernly')) throw new Error('_lernly ist kein Fachordner.');
    const target = await this.resolveFrom(this.baseRoot, cleaned);
    let stat;
    try { stat = await fs.stat(target); }
    catch { throw new Error(`Fachordner nicht gefunden: ${cleaned}`); }
    if (!stat.isDirectory()) throw new Error(`Fachordner ist kein Verzeichnis: ${cleaned}`);
    this.root = target;
    this.activeCourse = cleaned;
    return { active_course: this.activeCourse, active_root: this.root };
  }

  async read(relative, limit = 2_000_000) {
    const file = await this.resolve(relative);
    const stat = await fs.stat(file);
    if (!stat.isFile() || stat.size > limit) throw new Error(`Datei ist keine reguläre Datei oder größer als ${limit} Bytes.`);
    return fs.readFile(file, 'utf8');
  }

  async write(relative, text) {
    if (!relative.startsWith('_lernly/')) throw new Error('Schreiben nur unter _lernly erlaubt.');
    const file = await this.resolve(relative, { createParents: true });
    const temp = path.join(path.dirname(file), `.lernly-${randomUUID()}.tmp`);
    try {
      await fs.writeFile(temp, text, { mode: 0o600, flag: 'wx' });
      await this.resolve(relative);
      await fs.rename(temp, file);
    } finally { await fs.rm(temp, { force: true }); }
    return file;
  }

  async inventory() {
    const files = [], skipped = [];
    let visited = 0, truncated = false;
    const walk = async (relative = '', depth = 0) => {
      if (depth > 15) { skipped.push({ file: relative, reason: 'maximale Verzeichnistiefe' }); return; }
      const dir = relative ? await this.resolve(relative) : this.root;
      for (const item of (await fs.readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
        if (++visited > 10000 || files.length >= 2000) { truncated = true; return; }
        if (item.name.startsWith('.') || item.name.startsWith('~$') || ['_lernly', 'node_modules', '__MACOSX'].includes(item.name)) continue;
        const name = relative ? `${relative}/${item.name}` : item.name;
        if (item.isSymbolicLink()) { skipped.push({ file: name, reason: 'Symlink' }); continue; }
        if (item.isDirectory()) await walk(name, depth + 1);
        else if (item.isFile()) {
          try {
            const stat = await fs.stat(await this.resolve(name));
            files.push({ file: name, bytes: stat.size, modified: stat.mtime.toISOString(), supported: SUPPORTED.has(path.extname(name).toLowerCase()) });
          } catch (e) { skipped.push({ file: name, reason: e.message }); }
        }
      }
    };
    await walk();
    return { root: this.root, files, skipped, truncated, note: 'Noch keine Inhalte gelesen. Zuerst Altklausuren indexieren; unterstützte Formate bedeuten keine garantierte vollständige Extraktion.' };
  }

  async hash(relative) {
    const h = createHash('sha256');
    for await (const chunk of createReadStream(await this.resolve(relative))) h.update(chunk);
    return h.digest('hex');
  }

  async courseFiles() {
    const names = ['kurs.json', 'spickzettel.json'];
    for (const dir of ['themen', 'probeklausuren']) {
      const p = await this.resolve(`_lernly/${dir}`);
      try {
        for (const item of await fs.readdir(p, { withFileTypes: true })) {
          if (item.name.endsWith('.json')) names.push(`${dir}/${item.name}`);
        }
      } catch (e) { if (e.code !== 'ENOENT') throw e; }
    }
    const result = {};
    for (const name of names) {
      if (!courseFile.test(name)) throw new Error(`Ungültige Kursdatei: ${name}`);
      try { result[name] = JSON.parse(await this.read(`_lernly/${name}`)); }
      catch (e) { if (e.code !== 'ENOENT') throw e; }
    }
    return result;
  }
}
