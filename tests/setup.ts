import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';

// 3 Nov — lists remember their last query for the session (lib/useListParams.ts); each test starts
// from a list that has never been opened.
beforeEach(() => {
  try {
    window.sessionStorage.clear();
  } catch {
    // jsdom always has it; guarded for any environment that does not.
  }
});
