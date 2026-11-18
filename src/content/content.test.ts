import { describe, expect, it } from 'vitest';
import { checkAnswer, evaluate } from '../engine/checker';
import { openDatabase } from '../engine/sqlite';
import { settings } from './loader';

// Every content pack, public and private, must pass these checks.
describe.each(settings.map((s) => [s.id, s] as const))('setting %s', (_id, setting) => {
  it('builds its database', async () => {
    const db = await openDatabase(setting.setupSql);
    const fkErrors = db.exec('PRAGMA foreign_key_check');
    db.close();
    expect(fkErrors).toEqual([]);
  });

  it('has questions', () => {
    expect(setting.questions.length).toBeGreaterThan(0);
  });

  describe.each(setting.questions.map((q) => [q.id, q] as const))('question %s', (_qid, question) => {
    it('has a reference solution that returns rows', async () => {
      const result = await evaluate(setting.setupSql, question.solution, question.verify);
      if (!result.ok) throw new Error(result.error);
      expect(result.result.rows.length).toBeGreaterThan(0);
    });

    it('accepts its own solution', async () => {
      expect(await checkAnswer(setting.setupSql, question, question.solution)).toEqual({ status: 'correct' });
    });

    it('rejects an obviously wrong answer', async () => {
      const wrong = question.verify ? 'SELECT 1' : "SELECT 'wrong'";
      expect((await checkAnswer(setting.setupSql, question, wrong)).status).not.toBe('correct');
    });

    if (question.ordered) {
      it('says how to order rows in its prompt', () => {
        expect(question.prompt.toLowerCase()).toMatch(/first|order|sort|highest|lowest|alphabetical/);
      });
    }
  });
});
