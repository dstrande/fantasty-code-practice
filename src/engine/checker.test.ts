import { describe, expect, it } from 'vitest';
import { checkAnswer, compareResultSets } from './checker';

const rs = (columns: string[], rows: (string | number | null)[][]) => ({ columns, rows });

describe('compareResultSets', () => {
  const expected = rs(['name', 'hp'], [['Goblin', 7], ['Orc', 15]]);

  it('matches regardless of row order when unordered', () => {
    expect(compareResultSets(rs(['n', 'h'], [['Orc', 15], ['Goblin', 7]]), expected, false).match).toBe(true);
  });

  it('enforces row order when ordered', () => {
    const result = compareResultSets(rs(['n', 'h'], [['Orc', 15], ['Goblin', 7]]), expected, true);
    expect(result.match).toBe(false);
    expect(result.reason).toMatch(/order/);
  });

  it('reports a wrong column count', () => {
    expect(compareResultSets(rs(['n'], [['Goblin'], ['Orc']]), expected, false).reason).toMatch(/2 column/);
  });

  it('reports a wrong row count', () => {
    expect(compareResultSets(rs(['n', 'h'], [['Goblin', 7]]), expected, false).reason).toMatch(/2 row/);
  });

  it('reports a missing and an unexpected row', () => {
    const reason = compareResultSets(rs(['n', 'h'], [['Goblin', 7], ['Orc', 16]]), expected, false).reason;
    expect(reason).toContain("('Orc', 15)");
    expect(reason).toContain("('Orc', 16)");
  });

  it('treats duplicate rows as a multiset', () => {
    const dupes = rs(['n'], [['a'], ['a'], ['b']]);
    expect(compareResultSets(rs(['n'], [['a'], ['b'], ['b']]), dupes, false).match).toBe(false);
  });

  it('tolerates floating-point noise', () => {
    expect(compareResultSets(rs(['x'], [[0.1 + 0.2]]), rs(['x'], [[0.3]]), false).match).toBe(true);
  });

  it('distinguishes NULL from the string "null"', () => {
    expect(compareResultSets(rs(['x'], [['null']]), rs(['x'], [[null]]), false).match).toBe(false);
  });
});

describe('checkAnswer', () => {
  const setup = `
    CREATE TABLE t (id INTEGER PRIMARY KEY, v INTEGER);
    INSERT INTO t VALUES (1, 10), (2, 20);
  `;

  it('accepts an equivalent query', async () => {
    const result = await checkAnswer(setup, { solution: 'SELECT v FROM t' }, 'SELECT t.v FROM t WHERE 1 = 1');
    expect(result.status).toBe('correct');
  });

  it('returns SQL errors', async () => {
    const result = await checkAnswer(setup, { solution: 'SELECT v FROM t' }, 'SELEC v FROM t');
    expect(result.status).toBe('error');
  });

  it('keeps an empty result set, so an empty SELECT can match', async () => {
    const result = await checkAnswer(setup, { solution: 'SELECT v FROM t WHERE v > 100' }, 'SELECT v FROM t WHERE 0');
    expect(result.status).toBe('correct');
  });

  it('uses the verify query for data changes, each on a fresh database', async () => {
    const q = { solution: 'UPDATE t SET v = v + 1 WHERE id = 1', verify: 'SELECT id, v FROM t' };
    expect((await checkAnswer(setup, q, 'UPDATE t SET v = 11 WHERE id = 1')).status).toBe('correct');
    expect((await checkAnswer(setup, q, 'UPDATE t SET v = v + 1')).status).toBe('incorrect');
  });
});
