# Tests Disabled

All tests have been temporarily disabled to follow the development workflow where tests are only created and run during task 18.

## What was disabled:

### Backend:

- All `*.test.ts` files renamed to `*.test.ts.disabled`
- `jest.config.js` renamed to `jest.config.js.disabled`
- `tsconfig.test.json` renamed to `tsconfig.test.json.disabled`
- Test scripts in `package.json` renamed to `test:disabled`, `test:watch:disabled`, etc.

### Frontend:

- All `*.test.ts` and `*.test.tsx` files renamed to `*.test.ts.disabled` and `*.test.tsx.disabled`
- `vitest.config.ts` renamed to `vitest.config.ts.disabled`
- `vitest.setup.ts` renamed to `vitest.setup.ts.disabled`
- `jest.config.js` renamed to `jest.config.js.disabled`
- `jest.setup.js` renamed to `jest.setup.js.disabled`
- Test scripts in `package.json` renamed to `test:disabled`, `test:run:disabled`, etc.

## To re-enable tests (for task 18):

1. Run the enable script:

   ```bash
   ./scripts/enable-tests.sh
   ```

2. Manually update package.json scripts:

   - Change `test:disabled` back to `test`
   - Change `test:run:disabled` back to `test:run`
   - Change `test:watch:disabled` back to `test:watch`
   - Change `test:coverage:disabled` back to `test:coverage`
   - Change `test:ui:disabled` back to `test:ui`

3. Remove the `:disabled` suffix from script names in both backend and frontend package.json files.

## Current test commands:

- `npm run test:disabled` - Shows message that tests are disabled
- `npm run test:enable` - Shows instructions to enable tests

All test files are preserved and will be restored when task 18 is reached.
