export type Language = 'sql';

export interface Question {
  id: string;
  title: string;
  difficulty: 1 | 2 | 3;
  concepts: string[];
  prompt: string;
  solution: string;
  /** Row order matters. The prompt must say how to order, including tie-breaks. */
  ordered?: boolean;
  /** For questions that change data: run after the learner's SQL, and its result is compared. */
  verify?: string;
  hints: string[];
}

export interface Setting {
  id: string;
  language: Language;
  name: string;
  tagline: string;
  description: string;
  attribution?: string;
  /** schema.sql followed by seed.sql. Run on every fresh database. */
  setupSql: string;
  questions: Question[];
  /** Loaded from content-private/ (git-ignored). */
  isPrivate: boolean;
}
