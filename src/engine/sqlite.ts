import initSqlJs, { type Database, type SqlJsStatic, type SqlValue } from 'sql.js';

export type Cell = SqlValue;

export interface ResultSet {
  columns: string[];
  rows: Cell[][];
}

export type RunOutcome =
  | { ok: true; resultSets: ResultSet[]; rowsChanged: number }
  | { ok: false; error: string };

let sqlJs: Promise<SqlJsStatic> | undefined;

/**
 * Load the SQLite WebAssembly module once. In the browser, pass the URL of
 * sql-wasm.wasm (see main.tsx). In Node (Vitest), sql.js finds it on its own.
 */
export function initSqlite(wasmUrl?: string): Promise<SqlJsStatic> {
  sqlJs ??= initSqlJs(wasmUrl ? { locateFile: () => wasmUrl } : undefined);
  return sqlJs;
}

/** Create a fresh in-memory database and run the setup SQL (schema + seed) on it. */
export async function openDatabase(setupSql: string): Promise<Database> {
  const SQL = await initSqlite();
  const db = new SQL.Database();
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(setupSql);
  return db;
}

function totalChanges(db: Database): number {
  return Number(db.exec('SELECT total_changes()')[0].values[0][0]);
}

/**
 * Run one or more statements. Unlike db.exec, this keeps result sets that have
 * columns but no rows, so an empty SELECT still shows its column headers.
 */
export function runSql(db: Database, sql: string): RunOutcome {
  const resultSets: ResultSet[] = [];
  const changesBefore = totalChanges(db);
  try {
    for (const stmt of db.iterateStatements(sql)) {
      try {
        const columns = stmt.getColumnNames();
        const rows: Cell[][] = [];
        while (stmt.step()) rows.push(stmt.get());
        if (columns.length > 0) resultSets.push({ columns, rows });
      } finally {
        stmt.free();
      }
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  return { ok: true, resultSets, rowsChanged: totalChanges(db) - changesBefore };
}
