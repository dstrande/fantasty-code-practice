import { useMemo, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql, SQLite } from '@codemirror/lang-sql';
import { keymap } from '@codemirror/view';
import { Prec } from '@codemirror/state';
import type { TableInfo } from '../engine/schema';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  onCheck: () => void;
  schema: TableInfo[];
  dark: boolean;
}

export function SqlEditor({ value, onChange, onRun, onCheck, schema, dark }: Props) {
  // Keep the latest callbacks in a ref so the keymap doesn't need rebuilding.
  const handlers = useRef({ onRun, onCheck });
  handlers.current = { onRun, onCheck };

  const extensions = useMemo(() => {
    const completionSchema = Object.fromEntries(schema.map((t) => [t.name, t.columns.map((c) => c.name)]));
    return [
      sql({ dialect: SQLite, schema: completionSchema, upperCaseKeywords: true }),
      Prec.highest(
        keymap.of([
          { key: 'Mod-Enter', run: () => (handlers.current.onRun(), true) },
          { key: 'Shift-Mod-Enter', run: () => (handlers.current.onCheck(), true) },
        ]),
      ),
    ];
  }, [schema]);

  return (
    <CodeMirror
      className="editor"
      value={value}
      onChange={onChange}
      extensions={extensions}
      theme={dark ? 'dark' : 'light'}
      height="100%"
      basicSetup={{ foldGutter: false }}
      aria-label="SQL editor"
    />
  );
}
