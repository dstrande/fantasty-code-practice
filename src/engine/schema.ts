import type { Database } from 'sql.js';

export interface ColumnInfo {
  name: string;
  type: string;
  notNull: boolean;
  primaryKey: boolean;
  references?: { table: string; column: string };
}

export interface TableInfo {
  name: string;
  columns: ColumnInfo[];
}

/** Read the tables, columns and foreign keys of a database, for the schema panel and autocomplete. */
export function readSchema(db: Database): TableInfo[] {
  const tables = db.exec(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  );
  if (tables.length === 0) return [];

  return tables[0].values.map(([tableName]) => {
    const name = String(tableName);
    const quoted = `"${name.replace(/"/g, '""')}"`;
    const fks = new Map<string, { table: string; column: string }>();
    for (const row of db.exec(`PRAGMA foreign_key_list(${quoted})`)[0]?.values ?? []) {
      // columns: id, seq, table, from, to, on_update, on_delete, match
      fks.set(String(row[3]), { table: String(row[2]), column: String(row[4]) });
    }
    const columns = (db.exec(`PRAGMA table_info(${quoted})`)[0]?.values ?? []).map((row) => ({
      // columns: cid, name, type, notnull, dflt_value, pk
      name: String(row[1]),
      type: String(row[2]),
      notNull: row[3] === 1,
      primaryKey: Number(row[5]) > 0,
      references: fks.get(String(row[1])),
    }));
    return { name, columns };
  });
}
