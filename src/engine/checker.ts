import { openDatabase, runSql, type Cell, type ResultSet } from './sqlite';

export interface Comparison {
  match: boolean;
  reason?: string;
}

/** Make values comparable: round floats so 0.1 + 0.2 equals 0.3, and stringify blobs. */
function normalizeCell(value: Cell): string | number | null {
  if (typeof value === 'number') return Math.round(value * 1e6) / 1e6;
  if (value instanceof Uint8Array) return `x'${Array.from(value, (b) => b.toString(16).padStart(2, '0')).join('')}'`;
  return value;
}

function rowKey(row: Cell[]): string {
  return JSON.stringify(row.map(normalizeCell));
}

function formatRow(row: Cell[]): string {
  return `(${row.map((v) => (v === null ? 'NULL' : typeof v === 'string' ? `'${v}'` : String(normalizeCell(v)))).join(', ')})`;
}

function countRows(rows: Cell[][]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = rowKey(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/**
 * Compare two result sets by value. Column names are ignored, but column order
 * matters. Row order only matters when `ordered` is true.
 */
export function compareResultSets(actual: ResultSet, expected: ResultSet, ordered: boolean): Comparison {
  if (actual.columns.length !== expected.columns.length) {
    return {
      match: false,
      reason: `Expected ${expected.columns.length} column(s) (${expected.columns.join(', ')}), but your query returned ${actual.columns.length}.`,
    };
  }
  if (actual.rows.length !== expected.rows.length) {
    return {
      match: false,
      reason: `Expected ${expected.rows.length} row(s), but your query returned ${actual.rows.length}.`,
    };
  }

  const actualCounts = countRows(actual.rows);
  const expectedCounts = countRows(expected.rows);

  for (const row of expected.rows) {
    const key = rowKey(row);
    if ((actualCounts.get(key) ?? 0) < (expectedCounts.get(key) ?? 0)) {
      const extra = actual.rows.find((r) => (expectedCounts.get(rowKey(r)) ?? 0) < (actualCounts.get(rowKey(r)) ?? 0));
      return {
        match: false,
        reason:
          `Your result is missing the row ${formatRow(row)}` +
          (extra ? ` and has an unexpected row ${formatRow(extra)}.` : '.'),
      };
    }
  }

  if (ordered) {
    const firstWrong = actual.rows.findIndex((row, i) => rowKey(row) !== rowKey(expected.rows[i]));
    if (firstWrong !== -1) {
      return {
        match: false,
        reason: `The right rows are all there, but not in the requested order (row ${firstWrong + 1} is out of place).`,
      };
    }
  }

  return { match: true };
}

export interface CheckableQuestion {
  solution: string;
  ordered?: boolean;
  verify?: string;
}

type Evaluation = { ok: true; result: ResultSet } | { ok: false; error: string };

/**
 * Run `sql` on a fresh copy of the database. If `verify` is given (for questions
 * that change data), run it afterwards and use its result instead.
 */
export async function evaluate(setupSql: string, sql: string, verify?: string): Promise<Evaluation> {
  const db = await openDatabase(setupSql);
  try {
    const run = runSql(db, sql);
    if (!run.ok) return run;
    if (verify) {
      const check = runSql(db, verify);
      if (!check.ok) return check;
      return { ok: true, result: check.resultSets[check.resultSets.length - 1] };
    }
    const last = run.resultSets[run.resultSets.length - 1];
    if (!last) return { ok: false, error: "Your SQL didn't return any rows or columns. Did you forget a SELECT?" };
    return { ok: true, result: last };
  } finally {
    db.close();
  }
}

export type CheckResult =
  | { status: 'correct' }
  | { status: 'incorrect'; reason: string }
  | { status: 'error'; error: string };

export async function checkAnswer(setupSql: string, question: CheckableQuestion, userSql: string): Promise<CheckResult> {
  const expected = await evaluate(setupSql, question.solution, question.verify);
  if (!expected.ok) throw new Error(`Reference solution failed: ${expected.error}`);

  const actual = await evaluate(setupSql, userSql, question.verify);
  if (!actual.ok) return { status: 'error', error: actual.error };

  const comparison = compareResultSets(actual.result, expected.result, question.ordered ?? false);
  return comparison.match ? { status: 'correct' } : { status: 'incorrect', reason: comparison.reason ?? 'Not quite.' };
}
