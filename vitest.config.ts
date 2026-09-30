import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    // Tests never touch the network: no article reader, no web search, no live pulls, no model calls.
    // (On CI's open network a real reader call once outlived the 5s test timeout.)
    env: { READER: '0', EXA: '0', LIVE_NEWS: '0', LIVE_SNAPSHOT_URL: '', ANTHROPIC_API_KEY: '' },
  },
});
