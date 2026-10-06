# Anonymous Prayer Request Bot

## Christian Students Fellowship — Pray Team

**Document:** Step 11 — Project Initialization & Backend Foundation

**Recommended save path:**

```text
prayer-anonymous-bot/
└── docs/
    └── architecture/
        └── step-11-project-initialization-and-backend-foundation.md
```

---

# 1. Goal of Step 11

The objective of this step is to create a clean, secure, testable backend foundation.

At the end of Step 11, the project should have:

```text
Node.js + TypeScript
Express application
Strict configuration validation
Structured logging
Centralized error handling
Health endpoint
Graceful startup
Graceful shutdown
ESLint
Prettier
Vitest
Git configuration
Environment configuration
Basic test suite
```

It should be possible to run:

```bash
npm run dev
```

and access:

```text
GET /health
```

with a successful response.

---

# 2. What Is NOT Implemented Yet

Do not implement these in Step 11:

```text
Telegram bot behavior
Telegram webhook
MongoDB connection
Prayer-request schema
Encryption
Weekly scheduler
Weekly dispatch
Localization
Conversation state machine
Admin console
```

Those belong to later implementation stages.

The goal is to establish the foundation first.

---

# 3. Final Step-11 Repository

After this step, the beginning of the repository should look like:

```text
prayer-anonymous-bot/
│
├── backend/
│   │
│   ├── src/
│   │   ├── app.ts
│   │   ├── server.ts
│   │   │
│   │   ├── config/
│   │   │   ├── env.ts
│   │   │   ├── config.ts
│   │   │   └── config.types.ts
│   │   │
│   │   ├── routes/
│   │   │   └── health.routes.ts
│   │   │
│   │   ├── middleware/
│   │   │   └── error-handler.middleware.ts
│   │   │
│   │   └── shared/
│   │       ├── errors/
│   │       │   ├── application-error.ts
│   │       │   └── error-codes.ts
│   │       │
│   │       └── logging/
│   │           └── logger.ts
│   │
│   ├── tests/
│   │   └── unit/
│   │       └── health.test.ts
│   │
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── tsconfig.build.json
│   ├── vitest.config.ts
│   ├── eslint.config.js
│   ├── prettier.config.cjs
│   ├── .env
│   ├── .env.example
│   ├── .gitignore
│   └── .nvmrc
│
├── docs/
│
├── README.md
├── .gitignore
└── LICENSE
```

---

# 4. Step 11 Directory Creation

From the project root:

```bash
mkdir prayer-anonymous-bot
cd prayer-anonymous-bot
mkdir backend
mkdir docs
cd backend
mkdir src
mkdir tests
mkdir tests\unit
mkdir src\config
mkdir src\routes
mkdir src\middleware
mkdir src\shared
mkdir src\shared\errors
mkdir src\shared\logging
```

If using PowerShell, these commands can be executed directly.

---

# 5. Initialize npm

Inside:

```text
prayer-anonymous-bot/backend
```

run:

```bash
npm init -y
```

This creates:

```text
backend/package.json
```

---

# 6. Set the Package Metadata

The project package should identify itself as:

```json
{
  "name": "prayer-anonymous-bot-backend",
  "version": "0.1.0",
  "private": true,
  "type": "module"
}
```

The package should remain private because this is an application, not a package intended for publication to npm.

---

# 7. Install Production Dependencies

Install the stack selected in Step 10:

```bash
npm install express@5.2.1 grammy@1.46.0 mongoose@9.10.3 zod@4.6.5 luxon@3.7.2 node-cron@4.6.0 pino@10.3.1 helmet@8.3.0
```

At this step many of these packages will not yet be imported.

That is acceptable because they belong to the planned application stack.

---

# 8. Install Development Dependencies

```bash
npm install -D typescript@7.0.2 tsx@4.23.15 vitest@5.0.3 @vitest/coverage-v8@5.0.3 eslint@10.10.0 typescript-eslint@8.71.0 prettier@3.9.9 supertest@7.3.0 mongodb-memory-server@11.3.0 @types/node @types/express@5.0.6
```

For `@types/node`, use a version compatible with the selected Node 24 LTS environment.

Do not blindly upgrade it to Node 26 typings while the project targets Node 24.

---

# 9. Create `.nvmrc`

Create:

```text
backend/.nvmrc
```

with:

```text
24
```

This communicates:

> This project targets Node.js 24.

---

# 10. Verify Node

Run:

```bash
node --version
npm --version
```

The Node version should be in the 24.x line.

For production, the project should remain on an Active LTS line. Node's release documentation specifically recommends production applications use Active LTS or Maintenance LTS releases.

---

# 11. Create `.gitignore`

Create:

```text
backend/.gitignore
```

with:

```gitignore
node_modules/
dist/
coverage/

.env
.env.*
!.env.example

*.log

.DS_Store
Thumbs.db

.vscode/
.idea/

npm-debug.log*
```

---

# 12. Root `.gitignore`

Also create:

```text
prayer-anonymous-bot/.gitignore
```

with:

```gitignore
node_modules/
dist/
coverage/

.env
.env.*
!.env.example

*.log

.DS_Store
Thumbs.db

.vscode/
.idea/

backend/node_modules/
backend/dist/
backend/coverage/
```

The root `.gitignore` protects the whole project.

---

# 13. Environment Template

Create:

```text
backend/.env.example
```

with:

```env
NODE_ENV=development

PORT=3000

TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
TELEGRAM_WEBHOOK_PATH_SECRET=
PRAY_TEAM_CHAT_ID=

MONGODB_URI=

ENCRYPTION_KEY=
ENCRYPTION_KEY_VERSION=1

WEEKLY_DISPATCH_DAY=
WEEKLY_DISPATCH_TIME=
TIMEZONE=Africa/Addis_Ababa

SESSION_TTL_MINUTES=15
MAX_PRAYER_REQUEST_LENGTH=3000
```

This is safe to commit.

---

# 14. Local `.env`

Create:

```text
backend/.env
```

with your local development values.

For Step 11, most Telegram/MongoDB values can remain blank because we are not implementing those systems yet.

Example:

```env
NODE_ENV=development

PORT=3000

TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
TELEGRAM_WEBHOOK_PATH_SECRET=
PRAY_TEAM_CHAT_ID=

MONGODB_URI=

ENCRYPTION_KEY=
ENCRYPTION_KEY_VERSION=1

WEEKLY_DISPATCH_DAY=6
WEEKLY_DISPATCH_TIME=18:00
TIMEZONE=Africa/Addis_Ababa

SESSION_TTL_MINUTES=15
MAX_PRAYER_REQUEST_LENGTH=3000
```

Do not commit `.env`.

---

# 15. Node Environment Loading

Node 24 provides stable `.env` loading through `--env-file`.

Therefore the development command can eventually use:

```bash
node --env-file=.env --import=tsx src/server.ts
```

This avoids adding `dotenv` just to load local environment variables.

---

# 16. Configuration Types

Create:

```text
backend/src/config/config.types.ts
```

The purpose is to define the application configuration shape.

Conceptually:

```ts
export interface AppConfig {
  nodeEnv: "development" | "test" | "production";

  server: {
    port: number;
  };

  telegram: {
    botToken: string;
    webhookSecret: string;
    webhookPathSecret: string;
    prayTeamChatId: string;
  };

  database: {
    mongoUri: string;
  };

  encryption: {
    key: string;
    keyVersion: number;
  };

  dispatch: {
    day: number;
    time: string;
    timezone: string;
  };

  session: {
    ttlMinutes: number;
  };

  prayerRequest: {
    maxLength: number;
  };
}
```

This is the application-level configuration contract.

---

# 17. Environment Validation

Create:

```text
backend/src/config/env.ts
```

Use Zod to validate environment variables.

Conceptually:

```ts
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce.number().int().positive().default(3000),

  TELEGRAM_BOT_TOKEN: z.string().default(""),
  TELEGRAM_WEBHOOK_SECRET: z.string().default(""),
  TELEGRAM_WEBHOOK_PATH_SECRET: z.string().default(""),
  PRAY_TEAM_CHAT_ID: z.string().default(""),

  MONGODB_URI: z.string().default(""),

  ENCRYPTION_KEY: z.string().default(""),
  ENCRYPTION_KEY_VERSION: z.coerce.number().int().positive().default(1),

  WEEKLY_DISPATCH_DAY: z.coerce.number().int().min(0).max(6).default(6),
  WEEKLY_DISPATCH_TIME: z.string().default("18:00"),
  TIMEZONE: z.string().default("Africa/Addis_Ababa"),

  SESSION_TTL_MINUTES: z.coerce.number().int().positive().default(15),

  MAX_PRAYER_REQUEST_LENGTH: z.coerce.number().int().positive().default(3000),
});
```

The actual production-required checks will become stricter when those features are enabled.

---

# 18. Why Configuration Validation Starts Now

We want:

```text
bad configuration
       ↓
application refuses to start
```

rather than:

```text
bad configuration
       ↓
application starts
       ↓
failure later
```

This is especially important for:

```text
encryption
database
Telegram
weekly dispatch
```

---

# 19. Configuration Loader

The environment parser should export the validated environment object.

Conceptually:

```ts
export const env = envSchema.parse(process.env);
```

Do not export raw `process.env` throughout the codebase.

---

# 20. Configuration Mapper

Create:

```text
backend/src/config/config.ts
```

Its job is to convert environment variable names into application-friendly configuration.

For example:

```ts
export const config: AppConfig = {
  nodeEnv: env.NODE_ENV,

  server: {
    port: env.PORT,
  },

  telegram: {
    botToken: env.TELEGRAM_BOT_TOKEN,
    webhookSecret: env.TELEGRAM_WEBHOOK_SECRET,
    webhookPathSecret: env.TELEGRAM_WEBHOOK_PATH_SECRET,
    prayTeamChatId: env.PRAY_TEAM_CHAT_ID,
  },

  database: {
    mongoUri: env.MONGODB_URI,
  },

  encryption: {
    key: env.ENCRYPTION_KEY,
    keyVersion: env.ENCRYPTION_KEY_VERSION,
  },

  dispatch: {
    day: env.WEEKLY_DISPATCH_DAY,
    time: env.WEEKLY_DISPATCH_TIME,
    timezone: env.TIMEZONE,
  },

  session: {
    ttlMinutes: env.SESSION_TTL_MINUTES,
  },

  prayerRequest: {
    maxLength: env.MAX_PRAYER_REQUEST_LENGTH,
  },
};
```

---

# 21. Configuration Rule

Only:

```text
src/config/
```

should read environment variables.

Do not allow:

```ts
process.env.PORT;
process.env.MONGODB_URI;
process.env.TELEGRAM_BOT_TOKEN;
```

throughout arbitrary application files.

---

# 22. Logger

Create:

```text
backend/src/shared/logging/logger.ts
```

Use Pino.

Conceptual implementation:

```ts
import pino from "pino";

export const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
});
```

The production logger must be configured so sensitive data is never passed to it.

---

# 23. Logging Convention

Use structured events.

Good:

```ts
logger.info({
  event: "server_started",
});
```

Good:

```ts
logger.info({
  event: "health_check",
});
```

Bad:

```ts
logger.info({
  update,
});
```

Bad:

```ts
logger.info({
  prayerText,
});
```

Bad:

```ts
logger.info({
  telegramUserId,
});
```

---

# 24. Application Error

Create:

```text
backend/src/shared/errors/application-error.ts
```

Conceptually:

```ts
export class ApplicationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 500,
  ) {
    super(message);
    this.name = "ApplicationError";
  }
}
```

The final implementation can be made more strongly typed.

---

# 25. Error Codes

Create:

```text
backend/src/shared/errors/error-codes.ts
```

Example:

```ts
export const ERROR_CODES = {
  INVALID_INPUT: "INVALID_INPUT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  CONFIGURATION_ERROR: "CONFIGURATION_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
```

Later this will expand with:

```text
ENCRYPTION_FAILED
DATABASE_ERROR
TELEGRAM_SEND_FAILED
REQUEST_TOO_LONG
DISPATCH_ALREADY_RUNNING
```

---

# 26. Express Application

Create:

```text
backend/src/app.ts
```

Initial responsibility:

```text
Create Express application
↓
Register JSON/body middleware
↓
Register health route
↓
Register error handler
↓
Export app
```

Conceptually:

```ts
import express from "express";

import { healthRouter } from "./routes/health.routes.js";
import { errorHandler } from "./middleware/error-handler.middleware.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");

  app.use(
    express.json({
      limit: "64kb",
    }),
  );

  app.use("/health", healthRouter);

  app.use(errorHandler);

  return app;
}
```

The exact body-size limit can be adjusted after Telegram webhook testing.

---

# 27. Why `x-powered-by` Is Disabled

Express otherwise exposes an unnecessary framework-identification header.

There is no reason for the production application to advertise the framework when the header is not needed.

---

# 28. Health Route

Create:

```text
backend/src/routes/health.routes.ts
```

Conceptually:

```ts
import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.status(200).json({
    status: "ok",
  });
});
```

Then:

```text
GET /health
```

returns:

```json
{
  "status": "ok"
}
```

---

# 29. Why Start With a Health Endpoint?

It gives us the simplest possible verification that:

```text
Node works
TypeScript works
Express works
Configuration works
Application startup works
HTTP routing works
```

without introducing Telegram or MongoDB yet.

---

# 30. Error Handler

Create:

```text
backend/src/middleware/error-handler.middleware.ts
```

Conceptually:

```ts
import type { ErrorRequestHandler } from "express";

import { logger } from "../shared/logging/logger.js";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  logger.error({
    event: "unhandled_application_error",
    errorName: error instanceof Error ? error.name : "UnknownError",
  });

  res.status(500).json({
    error: "Internal server error",
  });
};
```

The real implementation will later sanitize different error types.

---

# 31. Error Handler Privacy Rule

The error handler must never do:

```ts
logger.error({
  error,
  body: req.body,
});
```

because `req.body` may contain:

```text
Telegram update
Prayer request
Sensitive information
```

The error handler should log the error category and safe technical context only.

---

# 32. Server Entry Point

Create:

```text
backend/src/server.ts
```

Conceptual version:

```ts
import { createApp } from "./app.js";
import { config } from "./config/config.js";
import { logger } from "./shared/logging/logger.js";

const app = createApp();

const server = app.listen(config.server.port, () => {
  logger.info({
    event: "server_started",
    port: config.server.port,
  });
});

function shutdown(signal: string) {
  logger.info({
    event: "shutdown_started",
    signal,
  });

  server.close(() => {
    logger.info({
      event: "shutdown_completed",
    });

    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
```

MongoDB and scheduler shutdown handlers will be added later.

---

# 33. Why `server.ts` Is Separate

`app.ts` creates the HTTP application.

`server.ts` controls the running process.

This allows testing:

```text
createApp()
```

without:

```text
opening a real port
starting background jobs
connecting external services
```

---

# 34. Graceful Shutdown

Even before MongoDB and Telegram exist, establish the pattern now:

```text
SIGINT / SIGTERM
        ↓
stop accepting work
        ↓
finish current HTTP work
        ↓
close server
        ↓
exit
```

Later we will insert:

```text
stop scheduler
close database
close external resources
```

into this process.

---

# 35. Vitest Configuration

Create:

```text
backend/vitest.config.ts
```

Conceptually:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});
```

---

# 36. First Test

Create:

```text
backend/tests/unit/health.test.ts
```

For the foundation we can test the Express app with Supertest.

Conceptually:

```ts
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../../src/app.js";

describe("GET /health", () => {
  it("returns a healthy status", async () => {
    const app = createApp();

    const response = await request(app).get("/health");

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      status: "ok",
    });
  });
});
```

This is our first automated verification of the application.

---

# 37. ESLint

Create:

```text
backend/eslint.config.js
```

The configuration should enforce at least:

```text
TypeScript-aware linting
No explicit any where avoidable
Unused variable detection
Consistent imports
Safe error handling
```

The exact rule set should be kept reasonably small initially.

Do not begin with hundreds of stylistic rules.

---

# 38. Prettier

Create:

```text
backend/prettier.config.cjs
```

An initial configuration can be:

```js
module.exports = {
  singleQuote: true,
  semi: true,
  trailingComma: "all",
  printWidth: 100,
};
```

Formatting is a team convention, not a security mechanism.

---

# 39. TypeScript Configuration

Create:

```text
backend/tsconfig.json
```

Recommended direction:

```json
{
  "compilerOptions": {
    "target": "ES2024",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",

    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,

    "esModuleInterop": true,
    "skipLibCheck": true,

    "sourceMap": true,

    "rootDir": ".",
    "noEmit": true
  },
  "include": ["src/**/*.ts", "tests/**/*.ts"]
}
```

This configuration is for development and type checking.

---

# 40. Production TypeScript Configuration

Create:

```text
backend/tsconfig.build.json
```

Conceptually:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "noEmit": false
  },
  "include": ["src/**/*.ts"],
  "exclude": ["tests", "node_modules", "dist"]
}
```

---

# 41. Why Separate Build Configuration?

We want:

```text
Development
→ source + tests + no emit

Production
→ source only + compiled JavaScript
```

This keeps test files out of production output.

---

# 42. Package Scripts

Update `package.json` scripts to:

```json
{
  "scripts": {
    "dev": "node --env-file=.env --import=tsx src/server.ts",
    "build": "tsc -p tsconfig.build.json",
    "start": "node dist/server.js",

    "typecheck": "tsc --noEmit",
    "lint": "eslint .",

    "format": "prettier --write .",
    "format:check": "prettier --check .",

    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

Node's `--env-file` is now stable in the Node 24 line, so this development command is appropriate for our selected runtime.

---

# 43. First Development Check

Run:

```bash
npm run typecheck
```

Expected:

```text
No TypeScript errors.
```

Then:

```bash
npm run lint
```

Then:

```bash
npm run format:check
```

Then:

```bash
npm test
```

---

# 44. Start the Server

Run:

```bash
npm run dev
```

Expected log:

```text
server_started
```

The server should listen at:

```text
http://localhost:3000
```

---

# 45. Test Health Endpoint

Open:

```text
http://localhost:3000/health
```

or run:

```bash
curl http://localhost:3000/health
```

Expected:

```json
{
  "status": "ok"
}
```

---

# 46. Windows PowerShell Test

Since development is on Windows, this is also convenient:

```powershell
Invoke-RestMethod http://localhost:3000/health
```

Expected result:

```text
status
------
ok
```

---

# 47. First Definition of Done

Step 11 is successful when:

```text id="9d6p9q"
✓ Node 24 environment works
✓ npm project initialized
✓ TypeScript configured
✓ ESM configured
✓ Express works
✓ Configuration validation works
✓ Logger works
✓ Error handler works
✓ Health route works
✓ Graceful shutdown exists
✓ ESLint works
✓ Prettier works
✓ Vitest works
✓ Supertest works
✓ Production build works
✓ .env is ignored
✓ .env.example is committed
✓ No secrets are committed
```

---

# 48. What the Project Should NOT Do Yet

After Step 11:

```text
Telegram bot does NOT receive users yet.
MongoDB is NOT connected yet.
Prayer requests are NOT stored yet.
Encryption is NOT active yet.
Weekly dispatch is NOT running yet.
```

That is intentional.

We are building the foundation before adding sensitive functionality.

---

# 49. Step 11 Development Sequence

The actual work should proceed in this order:

```text
1. Install Node 24
        ↓
2. Create repository
        ↓
3. Initialize backend
        ↓
4. Install dependencies
        ↓
5. Configure TypeScript
        ↓
6. Configure ESLint
        ↓
7. Configure Prettier
        ↓
8. Configure environment validation
        ↓
9. Create logger
        ↓
10. Create Express app
        ↓
11. Create health endpoint
        ↓
12. Create error handler
        ↓
13. Create graceful shutdown
        ↓
14. Create first test
        ↓
15. Run full quality checks
```

---

# 50. Step 11 Source Tree Responsibility

At the end of this step:

```text
src/
│
├── app.ts
│   └── Express application
│
├── server.ts
│   └── Process lifecycle
│
├── config/
│   ├── env.ts
│   │   └── Environment validation
│   │
│   ├── config.ts
│   │   └── Application configuration
│   │
│   └── config.types.ts
│       └── Configuration contracts
│
├── routes/
│   └── health.routes.ts
│       └── Health endpoint
│
├── middleware/
│   └── error-handler.middleware.ts
│       └── Central error handling
│
└── shared/
    ├── errors/
    │   ├── application-error.ts
    │   └── error-codes.ts
    │
    └── logging/
        └── logger.ts
```

---

# 51. What Comes Next

After the foundation is working, we should move to:

**Step 12 — Database Foundation & Persistence Layer**

That step will add:

```text
MongoDB connection
Mongoose configuration
PrayerRequest schema
Dispatch schema
Indexes
Repository interfaces
MongoDB repository implementations
Database connection lifecycle
TTL/expiration infrastructure
Database integration tests
```

Only after that should we implement encryption and the Telegram conversation flow.

---

# 52. Final Principle

At the end of Step 11, we should have a boring backend.

That is exactly what we want.

It should:

```text
Start correctly
Fail safely
Log safely
Respond to health checks
Shutdown gracefully
Pass tests
Build successfully
```

but not yet process sensitive prayer information.

The next features can then be added one controlled layer at a time.
