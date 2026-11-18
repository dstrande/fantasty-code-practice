import { parse } from 'yaml';
import type { Question, Setting } from './types';

const PATH_PATTERN = /^\/(content|content-private)\/([^/]+)\/([^/]+)\/([^/]+)$/;

function requireString(obj: Record<string, unknown>, key: string, where: string): string {
  const value = obj[key];
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${where}: "${key}" must be a non-empty string`);
  return value;
}

function parseQuestion(raw: unknown, where: string): Question {
  if (typeof raw !== 'object' || raw === null) throw new Error(`${where}: question must be an object`);
  const q = raw as Record<string, unknown>;
  const id = requireString(q, 'id', where);
  const at = `${where} (${id})`;
  const difficulty = q.difficulty;
  if (difficulty !== 1 && difficulty !== 2 && difficulty !== 3) throw new Error(`${at}: difficulty must be 1, 2 or 3`);
  return {
    id,
    title: requireString(q, 'title', at),
    difficulty,
    concepts: Array.isArray(q.concepts) ? q.concepts.map(String) : [],
    prompt: requireString(q, 'prompt', at).trim(),
    solution: requireString(q, 'solution', at).trim(),
    ordered: q.ordered === true,
    verify: typeof q.verify === 'string' ? q.verify.trim() : undefined,
    hints: Array.isArray(q.hints) ? q.hints.map(String) : [],
  };
}

/**
 * Turn a map of { "/content/<language>/<setting>/<file>": text } into settings.
 * Each setting folder needs setting.yaml, schema.sql, seed.sql and questions.yaml.
 */
export function buildSettings(files: Record<string, string>): Setting[] {
  const folders = new Map<string, { isPrivate: boolean; files: Record<string, string> }>();
  for (const [path, text] of Object.entries(files)) {
    const m = PATH_PATTERN.exec(path);
    if (!m) continue;
    const [, root, language, settingDir, fileName] = m;
    const key = `/${root}/${language}/${settingDir}`;
    const folder = folders.get(key) ?? { isPrivate: root === 'content-private', files: {} };
    folder.files[fileName] = text;
    folders.set(key, folder);
  }

  const settings: Setting[] = [];
  for (const [dir, folder] of folders) {
    for (const required of ['setting.yaml', 'schema.sql', 'seed.sql', 'questions.yaml']) {
      if (!(required in folder.files)) throw new Error(`${dir}: missing ${required}`);
    }
    const meta = parse(folder.files['setting.yaml']) as Record<string, unknown>;
    const where = `${dir}/setting.yaml`;
    const language = requireString(meta, 'language', where);
    if (language !== 'sql') throw new Error(`${where}: unsupported language "${language}"`);

    const questionsDoc = parse(folder.files['questions.yaml']) as { questions?: unknown[] } | null;
    const questions = (questionsDoc?.questions ?? []).map((q) => parseQuestion(q, `${dir}/questions.yaml`));
    const ids = new Set<string>();
    for (const q of questions) {
      if (ids.has(q.id)) throw new Error(`${dir}/questions.yaml: duplicate question id "${q.id}"`);
      ids.add(q.id);
    }

    settings.push({
      id: requireString(meta, 'id', where),
      language,
      name: requireString(meta, 'name', where),
      tagline: typeof meta.tagline === 'string' ? meta.tagline : '',
      description: typeof meta.description === 'string' ? meta.description.trim() : '',
      attribution: typeof meta.attribution === 'string' ? meta.attribution.trim() : undefined,
      setupSql: `${folder.files['schema.sql']}\n${folder.files['seed.sql']}`,
      questions,
      isPrivate: folder.isPrivate,
    });
  }

  const seen = new Set<string>();
  for (const s of settings) {
    if (seen.has(s.id)) throw new Error(`Duplicate setting id "${s.id}"`);
    seen.add(s.id);
  }
  // Public settings first, then alphabetical.
  return settings.sort((a, b) => Number(a.isPrivate) - Number(b.isPrivate) || a.name.localeCompare(b.name));
}

const files = import.meta.glob(['/content/*/*/*', '/content-private/*/*/*'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export const settings: Setting[] = buildSettings(files);
