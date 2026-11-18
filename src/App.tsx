import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Database } from 'sql.js';
import { settings } from './content/loader';
import type { Question, Setting } from './content/types';
import { checkAnswer, type CheckResult } from './engine/checker';
import { readSchema, type TableInfo } from './engine/schema';
import { openDatabase, runSql, type ResultSet } from './engine/sqlite';
import { loadProgress, questionKey, saveProgress, type Progress } from './progress';
import { Prompt } from './components/Prompt';
import { ResultsTable } from './components/ResultsTable';
import { SchemaPanel } from './components/SchemaPanel';
import { SqlEditor } from './components/SqlEditor';

type RunOutput =
  | { kind: 'result'; resultSets: ResultSet[]; rowsChanged: number }
  | { kind: 'error'; message: string };

const DIFFICULTY = ['', 'Easy', 'Medium', 'Hard'];

function usePrefersDark(): boolean {
  const query = '(prefers-color-scheme: dark)';
  const [dark, setDark] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setDark(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return dark;
}

function initialSelection(progress: Progress): { setting: Setting; question: Question } {
  const lastSetting = settings.find((s) => s.id === progress.last?.settingId) ?? settings[0];
  const lastQuestion = lastSetting.questions.find((q) => q.id === progress.last?.questionId) ?? lastSetting.questions[0];
  return { setting: lastSetting, question: lastQuestion };
}

export function App() {
  const dark = usePrefersDark();
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [{ setting, question }, setSelection] = useState(() => initialSelection(progress));

  // The playground database: learners' Run commands change it, and Reset rebuilds it.
  const [db, setDb] = useState<Database | null>(null);
  const [schema, setSchema] = useState<TableInfo[]>([]);
  const [dbVersion, setDbVersion] = useState(0);

  const [runOutput, setRunOutput] = useState<RunOutput | null>(null);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [hintsShown, setHintsShown] = useState(0);
  const [solutionShown, setSolutionShown] = useState(false);

  const key = questionKey(setting.id, question.id);
  const draft = progress.drafts[key] ?? '';

  useEffect(() => saveProgress(progress), [progress]);

  useEffect(() => {
    let cancelled = false;
    let opened: Database | null = null;
    openDatabase(setting.setupSql).then((d) => {
      if (cancelled) return d.close();
      opened = d;
      setDb(d);
      setSchema(readSchema(d));
    });
    return () => {
      cancelled = true;
      opened?.close();
      setDb(null);
    };
  }, [setting, dbVersion]);

  const selectQuestion = useCallback((s: Setting, q: Question) => {
    setSelection({ setting: s, question: q });
    setProgress((p) => ({ ...p, last: { settingId: s.id, questionId: q.id } }));
    setRunOutput(null);
    setCheckResult(null);
    setHintsShown(0);
    setSolutionShown(false);
  }, []);

  const setDraft = useCallback(
    (value: string) => setProgress((p) => ({ ...p, drafts: { ...p.drafts, [key]: value } })),
    [key],
  );

  const run = useCallback(() => {
    if (!db || !draft.trim()) return;
    const out = runSql(db, draft);
    setRunOutput(out.ok ? { kind: 'result', ...out } : { kind: 'error', message: out.error });
    setCheckResult(null);
    if (out.ok) setSchema(readSchema(db)); // CREATE/DROP TABLE changes the schema
  }, [db, draft]);

  const check = useCallback(async () => {
    if (!draft.trim() || checking) return;
    setChecking(true);
    try {
      const result = await checkAnswer(setting.setupSql, question, draft);
      setCheckResult(result);
      if (result.status === 'correct') {
        setProgress((p) => ({ ...p, solved: { ...p.solved, [key]: true } }));
      }
    } catch (e) {
      setCheckResult({ status: 'error', error: e instanceof Error ? e.message : String(e) });
    } finally {
      setChecking(false);
    }
  }, [draft, checking, setting, question, key]);

  const solvedCount = useMemo(
    () => setting.questions.filter((q) => progress.solved[questionKey(setting.id, q.id)]).length,
    [setting, progress.solved],
  );

  const lastResult = runOutput?.kind === 'result' ? runOutput.resultSets[runOutput.resultSets.length - 1] : undefined;

  return (
    <div className="app">
      <header className="topbar">
        <h1>Fantasy Code</h1>
        <label className="setting-picker">
          <span>Setting</span>
          <select
            value={setting.id}
            onChange={(e) => {
              const s = settings.find((x) => x.id === e.target.value)!;
              selectQuestion(s, s.questions[0]);
            }}
          >
            {settings.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.isPrivate ? ' (private)' : ''}
              </option>
            ))}
          </select>
        </label>
        <span className="progress-count">
          {solvedCount} / {setting.questions.length} solved
        </span>
      </header>

      <nav className="questions" aria-label="Questions">
        <p className="tagline">{setting.tagline}</p>
        <ol>
          {setting.questions.map((q) => {
            const solved = progress.solved[questionKey(setting.id, q.id)];
            return (
              <li key={q.id}>
                <button
                  className={q.id === question.id ? 'active' : undefined}
                  onClick={() => selectQuestion(setting, q)}
                  aria-current={q.id === question.id ? 'true' : undefined}
                >
                  <span className={`tick ${solved ? 'solved' : ''}`} aria-label={solved ? 'Solved' : 'Not solved'}>
                    {solved ? '✓' : '○'}
                  </span>
                  <span className="q-title">{q.title}</span>
                  <span className={`difficulty d${q.difficulty}`}>{DIFFICULTY[q.difficulty]}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <main className="workspace">
        <section className="question">
          <h2>{question.title}</h2>
          <div className="concepts">
            {question.concepts.map((c) => (
              <span key={c} className="concept">
                {c}
              </span>
            ))}
          </div>
          <Prompt text={question.prompt} />

          {hintsShown > 0 && (
            <ol className="hints">
              {question.hints.slice(0, hintsShown).map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ol>
          )}
          {solutionShown && <pre className="solution">{question.solution}</pre>}
        </section>

        <div className="editor-wrap">
          <SqlEditor value={draft} onChange={setDraft} onRun={run} onCheck={check} schema={schema} dark={dark} />
        </div>

        <div className="toolbar">
          <button className="primary" onClick={run} disabled={!db}>
            Run <kbd>Ctrl+Enter</kbd>
          </button>
          <button className="primary" onClick={check} disabled={checking}>
            {checking ? 'Checking…' : 'Check answer'} <kbd>Ctrl+Shift+Enter</kbd>
          </button>
          <span className="spacer" />
          <button onClick={() => setHintsShown((n) => n + 1)} disabled={hintsShown >= question.hints.length}>
            {hintsShown === 0 ? 'Hint' : 'Another hint'}
          </button>
          <button onClick={() => setSolutionShown((s) => !s)}>{solutionShown ? 'Hide solution' : 'Show solution'}</button>
          <button
            onClick={() => {
              setDbVersion((v) => v + 1);
              setRunOutput(null);
            }}
            title="Rebuild the database from scratch, undoing any changes you've made"
          >
            Reset database
          </button>
        </div>

        <section className="output" aria-live="polite">
          {checkResult && (
            <div className={`feedback ${checkResult.status}`}>
              {checkResult.status === 'correct' && <strong>Correct! Well done, adventurer.</strong>}
              {checkResult.status === 'incorrect' && (
                <>
                  <strong>Not quite.</strong> {checkResult.reason}
                </>
              )}
              {checkResult.status === 'error' && (
                <>
                  <strong>SQL error:</strong> {checkResult.error}
                </>
              )}
            </div>
          )}
          {runOutput?.kind === 'error' && (
            <div className="feedback error">
              <strong>SQL error:</strong> {runOutput.message}
            </div>
          )}
          {runOutput?.kind === 'result' && !lastResult && (
            <div className="feedback info">
              Done. {runOutput.rowsChanged} row{runOutput.rowsChanged === 1 ? '' : 's'} changed in the playground
              database.
            </div>
          )}
          {lastResult && <ResultsTable result={lastResult} />}
          {!runOutput && !checkResult && (
            <p className="empty">
              Write a query and press <strong>Run</strong> to see its results, or <strong>Check answer</strong> to
              mark it. Column names don't matter, but column order does.
            </p>
          )}
        </section>
      </main>

      <SchemaPanel tables={schema} />

      {setting.attribution && <footer className="attribution">{setting.attribution}</footer>}
    </div>
  );
}
