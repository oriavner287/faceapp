#!/bin/bash

# Script to re-enable tests (for task 18)
echo "Re-enabling tests for task 18..."

# Restore test files in backend
find backend/src -name "*.test.ts.disabled" -exec bash -c 'mv "$1" "${1%.disabled}"' _ {} \;

# Restore test files in frontend  
find frontend/src -name "*.test.ts.disabled" -o -name "*.test.tsx.disabled" | while read file; do
    mv "$file" "${file%.disabled}"
done

# Restore config files
mv backend/jest.config.js.disabled backend/jest.config.js 2>/dev/null || true
mv frontend/jest.config.js.disabled frontend/jest.config.js 2>/dev/null || true
mv frontend/jest.setup.js.disabled frontend/jest.setup.js 2>/dev/null || true
mv frontend/vitest.config.ts.disabled frontend/vitest.config.ts 2>/dev/null || true
mv frontend/vitest.setup.ts.disabled frontend/vitest.setup.ts 2>/dev/null || true
mv backend/tsconfig.test.json.disabled backend/tsconfig.test.json 2>/dev/null || true

echo "Tests have been re-enabled. Remember to update package.json scripts manually."
echo "Change test:disabled back to test, test:run:disabled back to test:run, etc."