import type { TableInfo } from '../engine/schema';

export function SchemaPanel({ tables }: { tables: TableInfo[] }) {
  return (
    <aside className="schema" aria-label="Database schema">
      <h2>Tables</h2>
      {tables.map((t) => (
        <details key={t.name}>
          <summary>{t.name}</summary>
          <ul>
            {t.columns.map((c) => (
              <li key={c.name}>
                <span className="col-name">
                  {c.name}
                  {c.primaryKey && <span className="badge" title="Primary key">PK</span>}
                </span>
                <span className="col-type">{c.type.toLowerCase()}</span>
                {c.references && (
                  <span className="col-ref">
                    → {c.references.table}.{c.references.column}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </details>
      ))}
    </aside>
  );
}
