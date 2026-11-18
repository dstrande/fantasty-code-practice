// Per-browser progress: solved questions, drafts and the last open question.
// Browser storage can be unavailable (private windows, blocked storage), so every
// access is wrapped and the app works without it.

const KEY = 'fantasy-code:progress:v1';

export interface Progress {
  solved: Record<string, true>;
  drafts: Record<string, string>;
  last?: { settingId: string; questionId: string };
}

export const questionKey = (settingId: string, questionId: string) => `${settingId}/${questionId}`;

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Progress>;
      return { solved: parsed.solved ?? {}, drafts: parsed.drafts ?? {}, last: parsed.last };
    }
  } catch {
    // ignore: start fresh
  }
  return { solved: {}, drafts: {} };
}

export function saveProgress(progress: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    // ignore: progress just won't persist
  }
}
