import { defineConfig } from 'cypress';

export default defineConfig({
  numTestsKeptInMemory: 1,
  viewportWidth: 1800,
  viewportHeight: 920,
  video: false,
  screenshotOnRunFailure: false,
  fixturesFolder: './src/tests/e2e/fixture',
  e2e: {
    baseUrl: 'http://localhost:8888',
    specPattern: './src/tests/e2e/specs/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: './src/tests/e2e/support/index.ts',
  },
});
