# Automation Testing Guide

This project uses **Jest** and **Supertest** for backend API automation testing.

## Prerequisites
- MongoDB must be running locally on port `27017`.
- `npm install` must be run to install `jest`, `supertest`, and `cross-env`.

## Running Actions
Run the following command to execute the test suite:

```bash
npm test
```

This command will:
1. Set `NODE_ENV` to `test`.
2. Connect to a test database (`digital-service-register-test`).
3. Run all test files in the `tests/` directory sequentially.

## Test Structure
- **`tests/auth.test.js`**: Tests User Registration and Login flows.
- **`tests/jobs.test.js`**: Tests Job creation and retrieval (authenticated).
- **`tests/setup.js`**: Handles Global Setup/Teardown (Database connection).

## Troubleshooting
If tests fail with timeout or connection errors:
1. Ensure MongoDB is running.
2. Check `src/config/db.js` for the connection string.
3. If using a custom port, update `.env` or the test connection string.
4. Try running with `--detectOpenHandles` to see what is keeping the process alive.

```bash
npx jest --detectOpenHandles
```
