import type { Cell, ResultSet } from '../engine/sqlite';

const MAX_ROWS = 500;

function renderCell(value: Cell) {
  if (value === null) return <span className="null">NULL</span>;
  if (value instanceof Uint8Array) return <span className="null">BLOB ({value.length} bytes)</span>;
  return String(value);
}

export function ResultsTable({ result }: { result: ResultSet }) {
  const shown = result.rows.slice(0, MAX_ROWS);
  return (
    <div className="results">
      <div className="results-meta">
        {result.rows.length} row{result.rows.length === 1 ? '' : 's'}
        {result.rows.length > MAX_ROWS && ` (showing the first ${MAX_ROWS})`}
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {result.columns.map((c, i) => (
                <th key={i}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((row, i) => (
              <tr key={i}>
                {row.map((v, j) => (
                  <td key={j} className={typeof v === 'number' ? 'num' : undefined}>
                    {renderCell(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
