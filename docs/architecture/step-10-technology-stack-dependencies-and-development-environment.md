# Anonymous Prayer Request Bot

## Christian Students Fellowship — Pray Team

**Document:** Step 10 — Technology Stack, Dependencies & Development Environment
**Recommended path:** `docs/architecture/step-10-technology-stack-dependencies-and-development-environment.md`

---

# 1. Technology Selection Goal

The technology stack must be:

- Secure
- Maintainable
- Type-safe
- Appropriate for the project's size
- Comfortable for the development team
- Well-supported
- Suitable for Telegram
- Suitable for MongoDB
- Suitable for privacy-sensitive backend development
- Easy to test locally
- Easy to deploy later

The project should deliberately avoid unnecessary technologies.

The goal is not to use the largest number of tools.

The goal is to use the smallest professional stack that satisfies the requirements.

---

# 2. Final MVP Stack

```text id="wkr0c4"
Runtime:
Node.js 24 LTS

Language:
TypeScript 7

HTTP framework:
Express 5

Telegram:
grammY

Database:
MongoDB

ODM:
Mongoose 9

Validation:
Zod 4

Encryption:
Node.js built-in node:crypto

Date/time:
Luxon

Scheduler:
node-cron

Logging:
Pino

Security headers:
Helmet

Testing:
Vitest

HTTP testing:
Supertest

Database integration testing:
mongodb-memory-server

Development TypeScript runner:
tsx

Linting:
ESLint + typescript-eslint

Formatting:
Prettier

Package manager:
npm
```

---

# 3. Why Node.js 24 LTS

The project should use:

```text id="l1ef0k"
Node.js 24 LTS
```

Node's official release schedule currently lists:

```text id="w9t0c6"
24.x → Active LTS
26.x → Current
```

with Node 26 scheduled to enter Active LTS on October 28, 2026.

For a privacy-sensitive production project, the Active LTS release is preferable to adopting the Current line merely because it has the newest features.

Node 24 also supports native `.env` loading through `--env-file`, which is useful for local development without requiring an additional environment-file package. ([nodejs.org](https://nodejs.org/download/release/v24.20.0/docs/api/cli.html))

---

# 4. Node Version Policy

The project should initially target:

```text id="f3b8se"
Node 24.x
```

Recommended local version management:

```text id="z7q9kd"
.nvmrc
```

containing:

```text
24
```

The exact patch version can be updated within the Node 24 LTS line.

Before moving the production environment to Node 26, the project should explicitly test:

```text id="yy7ghk"
TypeScript
grammY
Express
Mongoose
Vitest
production build
encryption
scheduler
```

---

# 5. Package Manager

Use:

```text id="m05y4i"
npm
```

Reasons:

- Comes with Node.js
- Familiar to the development team
- No additional package-manager installation
- Easy CI/CD support
- `package-lock.json` gives reproducible dependency installation

The repository must commit:

```text id="p9g7q2"
package-lock.json
```

---

# 6. TypeScript

Use:

```text id="fz5mw9"
TypeScript 7.0.2
```

The current npm release is 7.0.2.

The project is TypeScript-first because the architecture contains many important contracts:

```text id="fjblm6"
PrayerRequestRepository
TelegramMessenger
EncryptionService
LocalizationService
ConversationManager
DispatchRepository
```

TypeScript gives us compile-time enforcement of those contracts.

---

# 7. TypeScript Strictness

The compiler should be configured strictly.

Important options include:

```json id="h00me2"
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true,
  "noImplicitOverride": true
}
```

The objective is to make invalid states harder to express.

---

# 8. Module System

Use:

```text id="k2e0zj"
ES Modules (ESM)
```

The project should use:

```json id="x4jyqz"
{
  "type": "module"
}
```

This matches the modern Node.js/TypeScript ecosystem and works with the selected libraries.

---

# 9. Telegram Framework — grammY

Use:

```text id="aj7m8x"
grammY 1.46.0
```

The current npm release is 1.46.0. grammY is TypeScript-oriented, includes TypeScript declarations, runs on Node.js, and is designed specifically for Telegram bots.

---

# 10. Why grammY?

I recommend grammY instead of writing raw Telegram Bot API HTTP calls ourselves.

It provides:

```text id="j4j2px"
Telegram update handling
Command handling
Callback queries
Inline keyboards
Reply keyboards
Webhook support
TypeScript types
Middleware
```

while still leaving us in control of the architecture.

Importantly, we will use grammY only at the **Telegram adapter/infrastructure boundary**.

Our business logic must not depend on grammY types.

---

# 11. grammY Architectural Rule

Good:

```text id="n4h3m7"
grammY
   ↓
Telegram Adapter
   ↓
Application contracts
```

Bad:

```text id="rm17yo"
grammY Context
   ↓
PrayerRequestService
   ↓
MongoDB
```

The latter would tightly couple the entire business domain to Telegram.

---

# 12. HTTP Framework — Express

Use:

```text id="5c9ksp"
Express 5.2.1
```

The current npm `latest` release is 5.2.1.

Express will be responsible for:

```text id="k4qz1m"
HTTPS webhook endpoint
Health endpoint
Middleware
Error handling
HTTP lifecycle
```

It will not contain the prayer-request business logic.

---

# 13. Why Express?

The project's HTTP requirements are small.

We need:

```text id="n4sbd2"
POST /webhook/...
GET /health
```

There is no need to introduce a larger framework solely for these endpoints.

Express is sufficient and familiar.

---

# 14. MongoDB — Mongoose

Use:

```text id="f90jla"
Mongoose 9.10.3
```

The current npm release is 9.10.3. Mongoose 9 includes built-in TypeScript declarations.

---

# 15. Why Mongoose?

Mongoose provides:

```text id="c9myw0"
Schemas
Validation
Models
Queries
Indexes
TypeScript support
MongoDB integration
```

This fits the database design from Step 5.

The application should still hide Mongoose behind repository implementations.

---

# 16. MongoDB Driver

We do not need to install the MongoDB Node driver separately for the application.

Mongoose provides its MongoDB integration.

The official MongoDB driver is currently in the 7.x line, but our application interacts through Mongoose rather than directly using the driver.

Avoid adding both Mongoose and direct-driver code unless a future requirement genuinely needs it.

---

# 17. Validation — Zod

Use:

```text id="js8m4d"
Zod 4.6.5
```

The current npm release is 4.6.5, and Zod is specifically designed for TypeScript-first schema validation with static type inference.

---

# 18. Why Zod?

Zod will validate:

```text id="z6v3wx"
Environment variables
Telegram callback data
Application inputs
Configuration
API boundaries
Test data
```

Example conceptual boundary:

```text id="b82ec3"
unknown input
     ↓
Zod schema
     ↓
validated typed value
```

This is particularly useful because Telegram data is external/untrusted input.

---

# 19. Encryption — Node Built-In Crypto

Do NOT install a third-party AES library for the basic encryption requirement.

Use Node's standard library:

```text id="64e6sm"
node:crypto
```

The application will implement authenticated encryption using AES-256-GCM behind our own:

```ts id="r1nqfx"
EncryptionService;
```

Advantages:

```text id="j4h1pu"
No additional crypto dependency
Maintained with Node
Well-integrated with Node security APIs
Less dependency surface
```

---

# 20. Date/Time — Luxon

Use:

```text id="h5p04v"
Luxon 3.7.2
```

Luxon provides immutable date/time objects and timezone support without shipping timezone data files. The current npm release is 3.7.2.

This is useful for:

```text id="k68k7t"
Weekly dispatch
Africa/Addis_Ababa timezone
Collection boundaries
Expiration timestamps
Week keys
```

---

# 21. Why Not Rely Only on JavaScript `Date`?

JavaScript `Date` represents instants, but the application needs explicit timezone-oriented calculations such as:

```text id="3ncbqj"
What day is the weekly dispatch in Addis Ababa?
When does the collection period end?
Which week key does this request belong to?
```

Luxon's timezone-aware API makes these calculations clearer.

---

# 22. Scheduler — node-cron

Use:

```text id="znlkr5"
node-cron 4.6.0
```

The current npm release is 4.6.0. It supports recurring cron schedules, TypeScript, overlap prevention, and coordination features.

---

# 23. Important Scheduler Rule

`node-cron` is only the **trigger**.

It is NOT responsible for deciding:

```text id="sr0y8d"
Which requests are eligible?
Should the week be skipped?
Which requests are published?
How is duplicate dispatch prevented?
```

Those belong to:

```text id="e5m9pl"
WeeklyDispatchService
```

---

# 24. Scheduler Architecture

```text id="3ecoz0"
node-cron
    ↓
RunWeeklyDispatch()
    ↓
Application logic
    ↓
MongoDB + Telegram
```

This keeps the business logic testable without waiting for real clock events.

---

# 25. Overlap Protection

We will use `node-cron`'s overlap-prevention capability where appropriate.

But this is only defense in depth.

The real protection is the MongoDB-backed dispatch state transition:

```text id="89n7gy"
SCHEDULED
   ↓
atomic claim
   ↓
RUNNING
```

because the database remains the source of truth.

---

# 26. Logging — Pino

Use:

```text id="xq9s4z"
Pino 10.3.1
```

The current npm release is 10.3.1.

Pino is suitable for structured JSON logging.

---

# 27. Why Pino?

Our logs must be:

```text id="ln8q5n"
Structured
Machine-readable
Fast
Filterable
Privacy-conscious
```

Example:

```json id="q9i2wq"
{
  "level": 30,
  "event": "weekly_dispatch_completed",
  "dispatchId": "DISPATCH-2026-W40"
}
```

Never:

```json id="4zzf4p"
{
  "prayerText": "...",
  "telegramUserId": "..."
}
```

---

# 28. Security Headers — Helmet

Use:

```text id="0g9vyd"
Helmet 8.3.0
```

Helmet's current npm release is 8.3.0 and provides common HTTP security headers for Express applications.

Even though our MVP has almost no browser-facing surface, using Helmet is a low-cost defense-in-depth measure for the HTTP application.

---

# 29. Rate Limiting

Do NOT make `express-rate-limit` the primary student-level anti-abuse mechanism.

The Telegram webhook is not a normal public user API, and all Telegram traffic may share infrastructure/IP characteristics.

Instead use:

```text id="kmw6oy"
HTTP body-size limits
+
temporary conversation-level limits
+
submission-frequency controls
```

A general HTTP rate-limiting package can be added later to other public endpoints if they appear.

The currently available `express-rate-limit` release is 8.7.0, but it is not essential to the MVP's initial dependency set.

---

# 30. Environment Configuration

We will use Node's native environment-file support rather than adding `dotenv` unless a later deployment requirement makes it useful.

Node 24's `--env-file` is stable and loads variables from a file into `process.env`. ([nodejs.org](https://nodejs.org/download/release/v24.20.0/docs/api/cli.html))

This reduces dependency count.

---

# 31. Local `.env`

Development:

```text id="7e89cu"
backend/
└── .env
```

Example:

```env id="y3j9u9"
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

These are placeholders, not real credentials.

---

# 32. `.env.example`

Commit:

```text id="6t1v1o"
backend/.env.example
```

Do NOT commit:

```text id="fiv0u1"
backend/.env
```

`.env.example` should contain names only.

---

# 33. Production Environment

Production should NOT depend on a committed `.env` file.

Use:

```text id="zz3p1s"
Hosting provider secrets
or
Secret manager
```

The process receives:

```text id="u7j9l9"
process.env
```

without the secret values entering Git.

---

# 34. TypeScript Development Runner — tsx

Use:

```text id="s84f0s"
tsx 4.23.15
```

The current npm release is 4.23.15.

It provides a convenient development runtime for TypeScript.

---

# 35. Development Command

Conceptually:

```bash
node --env-file=.env --import=tsx src/server.ts
```

Node 24's native `--env-file` loads `.env`, while `tsx` provides the TypeScript execution layer.

In `package.json`, this can become:

```json
{
  "scripts": {
    "dev": "node --env-file=.env --import=tsx src/server.ts"
  }
}
```

---

# 36. Testing — Vitest

Use:

```text id="lqd8gp"
Vitest 5.0.3
```

The current npm release is 5.0.3.

Vitest is appropriate for:

```text id="7opcf2"
Unit tests
Integration tests
Application-service tests
Security tests
Mocks/fakes
```

---

# 37. Coverage — V8

Use:

```text id="x3a4p5"
@vitest/coverage-v8 5.0.3
```

The coverage provider is specifically designed to work with Vitest and V8.

---

# 38. HTTP Testing — Supertest

Use:

```text id="mcgp6h"
Supertest 7.3.0
```

The current npm release is 7.3.0.

It allows us to test:

```text id="lqk4vn"
POST /webhooks/...
GET /health
```

without opening a real network port.

---

# 39. MongoDB Integration Testing

Use:

```text id="05m1jh"
mongodb-memory-server 11.3.0
```

The current npm release is 11.3.0.

This gives repository/integration tests a local MongoDB instance without requiring the developer to connect tests to the real production database.

---

# 40. Testing Privacy With mongodb-memory-server

We can test:

```text id="46yhpn"
Create request
   ↓
Inspect stored document
```

and verify:

```text id="8p4x8o"
No Telegram ID
No username
No raw update
Encrypted content
Correct expiration
Correct status
```

This is especially valuable for this project.

---

# 41. Linting — ESLint

Use:

```text id="6r9ym3"
ESLint 10.10.0
```

The current npm release is 10.10.0. It requires supported modern Node versions, including Node 24.

---

# 42. TypeScript ESLint Integration

Use:

```text id="p3q2mv"
typescript-eslint 8.71.0
```

The current npm release is 8.71.0.

This provides TypeScript-aware linting.

We should use ESLint's modern flat configuration.

---

# 43. Formatting — Prettier

Use:

```text id="3f4mx6"
Prettier 3.9.9
```

The current npm release is 3.9.9.

Prettier should handle formatting, while ESLint handles code-quality rules.

Do not use ESLint as an all-purpose formatter.

---

# 44. Type Definitions

Use:

```text id="4t3jvj"
@types/node
@types/express
```

For Node 24, the project should use the matching Node 24 type line rather than blindly installing Node 26 types.

`@types/express` currently provides Express 5 typings at version 5.0.6.

---

# 45. Date/Time Type Definitions

Luxon is TypeScript-friendly, and its package is used directly.

The current separate `@types/luxon` package is 3.7.6, but we should verify whether the selected Luxon package version exposes the declarations we need before adding another development dependency.

Do not add unnecessary `@types/*` packages when the dependency already provides its own types.

---

# 46. Production Dependency Set

The initial production dependencies should be approximately:

```text id="1v3qoh"
express
grammy
mongoose
zod
luxon
node-cron
pino
helmet
```

Encryption uses Node's built-in:

```text id="t5am7y"
node:crypto
```

No crypto package is required.

---

# 47. Development Dependency Set

Approximately:

```text id="3qpo4r"
typescript
tsx
vitest
@vitest/coverage-v8
eslint
typescript-eslint
prettier
@types/node
@types/express
supertest
mongodb-memory-server
```

---

# 48. Recommended Exact Versions

For reproducible initial development:

| Package               |      Recommended version |
| --------------------- | -----------------------: |
| Node.js               |          24.x Active LTS |
| TypeScript            |                    7.0.2 |
| Express               |                    5.2.1 |
| grammY                |                   1.46.0 |
| Mongoose              |                   9.10.3 |
| Zod                   |                    4.6.5 |
| Luxon                 |                    3.7.2 |
| node-cron             |                    4.6.0 |
| Pino                  |                   10.3.1 |
| Helmet                |                    8.3.0 |
| tsx                   |                  4.23.15 |
| Vitest                |                    5.0.3 |
| @vitest/coverage-v8   |                    5.0.3 |
| ESLint                |                  10.10.0 |
| typescript-eslint     |                   8.71.0 |
| Prettier              |                    3.9.9 |
| Supertest             |                    7.3.0 |
| mongodb-memory-server |                   11.3.0 |
| @types/express        |                    5.0.6 |
| @types/node           | Node 24 matching release |

These versions were checked against current package registries around October 3, 2026.

---

# 49. Initial Installation

From:

```text id="3fz3uw"
prayer-anonymous-bot/backend
```

initialize npm:

```bash
npm init -y
```

Then install production dependencies:

```bash
npm install express@5.2.1 grammy@1.46.0 mongoose@9.10.3 zod@4.6.5 luxon@3.7.2 node-cron@4.6.0 pino@10.3.1 helmet@8.3.0
```

---

# 50. Development Dependencies

```bash
npm install -D typescript@7.0.2 tsx@4.23.15 vitest@5.0.3 @vitest/coverage-v8@5.0.3 eslint@10.10.0 typescript-eslint@8.71.0 prettier@3.9.9 supertest@7.3.0 mongodb-memory-server@11.3.0 @types/express@5.0.6 @types/node@24.19.1
```

The exact `@types/node` patch can be updated within the Node 24 type line as needed.

---

# 51. Why Pin Versions Initially?

For this project, we should initially prefer:

```json id="j4eeef"
"express": "5.2.1"
```

over:

```json id="8mym4a"
"express": "^5.2.1"
```

because the project is privacy-sensitive and we want a known dependency set.

Later, controlled dependency updates can be performed intentionally.

Prettier itself currently recommends specifying an exact version when installing/updating to avoid unexpected formatting changes.

---

# 52. Dependency Update Policy

Do not run:

```bash
npm update
```

blindly on the production project.

Instead:

```text id="lti9g8"
1. Review update
2. Check changelog
3. Run tests
4. Run security tests
5. Review lockfile
6. Deploy to test environment
7. Verify
8. Deploy production
```

---

# 53. `package.json`

The eventual package configuration should conceptually resemble:

```json
{
  "name": "prayer-anonymous-bot-backend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": "24.x"
  },
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

The exact package fields can be adjusted after initialization.

---

# 54. TypeScript Files

The project should use:

```text id="6a7ew0"
.ts
```

throughout the backend.

Avoid mixing:

```text id="wtp9h5"
.ts
.js
.cjs
```

without a clear reason.

---

# 55. Build Output

Source:

```text id="sk1p8n"
src/
```

compiled output:

```text id="4f8m6e"
dist/
```

`dist/` should not be committed to Git if the deployment pipeline builds it automatically.

---

# 56. TypeScript Configuration Files

Use:

```text id="z2gv0w"
tsconfig.json
tsconfig.build.json
```

---

# 57. `tsconfig.json`

Used for:

```text id="dc8hpy"
development
IDE
tests
type-checking
```

---

# 58. `tsconfig.build.json`

Used to define the production compilation:

```text id="9g6s7d"
src/
    ↓
TypeScript compiler
    ↓
dist/
```

Test files should not be included in the production build.

---

# 59. Recommended TypeScript Compiler Direction

Conceptually:

```json id="eh8m3m"
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
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

The exact target/module combination should be verified against TypeScript 7 and Node 24 during project initialization.

---

# 60. ESLint Configuration

Use modern flat configuration:

```text id="prw8y0"
eslint.config.js
```

It should include:

```text id="7pp7t1"
JavaScript rules
TypeScript rules
Unused-variable protection
No-explicit-any policy
Import consistency
Error handling rules
```

The exact rules will be chosen during implementation.

---

# 61. Prettier Configuration

Create:

```text id="a4k9j9"
.prettierrc
```

Example principles:

```text id="g1p5k8"
singleQuote
semi
trailingComma
printWidth
```

The exact values are a team style decision and have no effect on privacy/security.

---

# 62. Test Configuration

Create:

```text id="m3yx0u"
vitest.config.ts
```

Coverage:

```text id="9b7byq"
provider: "v8"
```

Use the `@vitest/coverage-v8` package.

---

# 63. Test Environment Separation

Tests should use:

```text id="l0v1td"
NODE_ENV=test
```

and:

```text id="2o4m0m"
test database
test Telegram client
fake encryption keys
synthetic prayer data
```

Never:

```text id="6qa8mm"
production MongoDB
production bot token
real Pray Team group
real prayer requests
```

---

# 64. Local Development Architecture

The developer's computer should run:

```text id="8vfy87"
┌────────────────────────────┐
│ Windows                     │
│                             │
│ Node.js 24                  │
│ npm                         │
│ VS Code                     │
│                             │
│ ┌────────────────────────┐  │
│ │ Backend                │  │
│ │ Express + grammY       │  │
│ └───────────┬────────────┘  │
│             │               │
│             ▼               │
│        MongoDB Atlas        │
│        Development DB       │
└────────────────────────────┘
```

The production Telegram bot should use separate credentials.

---

# 65. Local MongoDB Strategy

For development, there are two reasonable approaches.

### Option A — MongoDB Atlas development database

Advantages:

```text id="19b46s"
Real MongoDB environment
Simple synchronization with production architecture
No local MongoDB installation
```

### Option B — Local MongoDB

Advantages:

```text id="h4a2ts"
Works offline
Fast
No cloud dependency
```

For your learning environment, MongoDB Atlas is perfectly reasonable for development as long as it contains only synthetic/test data.

---

# 66. Integration-Test MongoDB

For automated integration tests:

```text id="xyc0dy"
mongodb-memory-server
```

can create an isolated temporary MongoDB environment. Its current release is 11.3.0.

This keeps tests away from real databases.

---

# 67. Telegram Development Strategy

Create separate Telegram resources for development.

```text id="4dyw5n"
PRODUCTION
├── production bot
└── production Pray Team group

DEVELOPMENT
├── development bot
└── development test group
```

Never use the production bot while experimenting with:

```text id="z1d1b3"
callback handlers
weekly scheduler
database deletion
message formatting
failure simulation
```

---

# 68. Telegram Bot Environment Variables

Development:

```env id="96xx88"
TELEGRAM_BOT_TOKEN=<development-token>
PRAY_TEAM_CHAT_ID=<development-group>
```

Production:

```env id="5uk9nq"
TELEGRAM_BOT_TOKEN=<production-token>
PRAY_TEAM_CHAT_ID=<production-group>
```

The two environments must never share the same bot token.

---

# 69. Weekly Scheduler Development

Do not initially wait one week to test weekly dispatch.

Create a development configuration such as:

```env id="l7w2o0"
WEEKLY_DISPATCH_CRON=* * * * *
```

or a test-trigger mechanism.

However, such a development schedule must never be enabled in production.

Production should load the real weekly schedule.

---

# 70. Better Scheduler Testing

The scheduler should expose:

```text id="ihp8xv"
RunWeeklyDispatch()
```

as an application use case.

Then tests can invoke:

```text id="z92zph"
RunWeeklyDispatch()
```

directly rather than waiting for cron.

This is much more reliable.

---

# 71. Development Logging

During development, Pino can output structured logs.

Never use:

```ts id="2k95ty"
console.log(update);
console.log(prayerText);
```

even while developing.

It is better to develop with the same privacy rules we will use in production.

---

# 72. Environment Variable Validation

At startup:

```text id="m3ifv9"
Load environment
      ↓
Zod schema
      ↓
Validate
      ↓
If invalid → startup failure
      ↓
If valid → application starts
```

This prevents:

```text id="v2ocwt"
missing encryption key
missing Telegram token
invalid chat ID
invalid schedule
```

from causing dangerous partial startup.

---

# 73. Required Configuration

The initial required configuration is:

```text id="p0bz9n"
NODE_ENV
PORT

TELEGRAM_BOT_TOKEN
TELEGRAM_WEBHOOK_SECRET
TELEGRAM_WEBHOOK_PATH_SECRET
PRAY_TEAM_CHAT_ID

MONGODB_URI

ENCRYPTION_KEY
ENCRYPTION_KEY_VERSION

WEEKLY_DISPATCH_DAY
WEEKLY_DISPATCH_TIME
TIMEZONE

SESSION_TTL_MINUTES
MAX_PRAYER_REQUEST_LENGTH
```

---

# 74. No Configuration Secrets in TypeScript

Do not write:

```ts id="4lcb7w"
const BOT_TOKEN = "123456:ABC...";
```

or:

```ts id="n0xk4m"
const MONGO_URI = "mongodb+srv://...";
```

or:

```ts id="7i0wuj"
const KEY = "...";
```

The configuration system must be the only source.

---

# 75. Windows Development

Since the project is likely to be developed on Windows, the commands should work in:

```text id="fzw7xt"
PowerShell
Windows Terminal
VS Code terminal
```

Avoid scripts that depend unnecessarily on Unix-specific commands such as:

```text id="q76w7r"
rm -rf
export KEY=value
```

Use Node/npm scripts instead.

---

# 76. Git Ignore

Root `.gitignore`:

```gitignore id="x1rjv9"
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

Be careful with `.env.*` patterns if you later create a non-secret committed environment file.

---

# 77. Sensitive Development Files

Never commit:

```text id="u7n3bx"
MongoDB dumps
Telegram update JSON
Prayer screenshots
Production logs
Environment files
Encryption keys
Bot tokens
Database exports
```

---

# 78. Local Folder Structure

During development:

```text id="9i7n8v"
backend/
├── .env
├── node_modules/
├── src/
├── tests/
├── dist/
└── package.json
```

The `.env` and `node_modules` files never enter the repository.

---

# 79. Recommended First Setup Sequence

On a new development machine:

```text id="x08q9z"
1. Install Node 24 LTS
2. Verify node/npm
3. Clone repository
4. Enter backend
5. npm ci
6. Create .env from .env.example
7. Fill development secrets
8. Run typecheck
9. Run lint
10. Run tests
11. Start development server
```

---

# 80. Why `npm ci`?

Once `package-lock.json` exists:

```bash
npm ci
```

should be preferred for reproducible installations in:

```text id="i7y0ke"
CI
deployment
clean development setups
```

Use:

```bash
npm install
```

when intentionally changing dependencies.

---

# 81. Development Quality Gate

Before opening a pull request:

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
```

All should pass.

---

# 82. Security Quality Gate

Before production:

```text id="3zg7u4"
typecheck
lint
unit tests
integration tests
security tests
E2E tests
dependency audit
manual privacy review
```

The project is not production-ready simply because the bot "works."

---

# 83. Dependency Security

Periodically run:

```bash
npm audit
```

and review any reported issue.

Do not automatically run:

```bash
npm audit fix --force
```

on a production codebase without reviewing the dependency changes.

Major-version changes may break the carefully tested architecture.

---

# 84. Dependency Review

Every dependency should answer:

> What problem does this package solve that we actually need?

Current selected libraries have clear purposes:

```text id="2wqv5z"
grammY
→ Telegram

Express
→ HTTP

Mongoose
→ MongoDB

Zod
→ Validation

Luxon
→ Timezones

node-cron
→ Scheduling

Pino
→ Logging

Helmet
→ HTTP security headers

Vitest
→ Testing
```

---

# 85. Dependencies We Deliberately Avoid

For the MVP, do NOT add:

```text id="q1w8sp"
Redis
RabbitMQ
Kafka
Docker orchestration
Microservices framework
GraphQL
Prisma
Sequelize
AI APIs
Analytics SDKs
Frontend framework
Auth framework
Cloud SDKs
```

unless a later requirement proves one necessary.

---

# 86. Why No Redis Yet?

We currently have:

```text id="0gu4os"
temporary sessions
single application instance
small weekly workload
```

Therefore in-memory session state is sufficient.

If the application becomes multi-instance, Redis may become justified.

Until then, Redis creates another data store and privacy boundary.

---

# 87. Why No Queue Yet?

The weekly workload is expected to be small enough for a direct controlled publication process.

We do not need:

```text id="jt1g6n"
Kafka
RabbitMQ
BullMQ
Redis Queue
```

for the MVP.

The dispatch architecture can later be upgraded if volume or reliability requirements demand it.

---

# 88. Why No Admin Authentication Package?

There is no admin console yet.

Therefore no reason exists to add:

```text id="bt6l0u"
Passport
Auth.js
OAuth framework
JWT library
```

to the MVP.

When the admin console is designed, authentication will be selected intentionally.

---

# 89. Why No AI Dependency?

Because prayer requests can contain extremely sensitive personal information.

The MVP should not send them to external AI providers for:

```text id="4f4y0m"
translation
classification
summarization
moderation
sentiment analysis
```

This avoids introducing another third-party processing boundary.

---

# 90. Final Technology Architecture

```text id="r1u1x5"
                     NODE.JS 24 LTS
                           │
                           ▼
                    TypeScript 7
                           │
                 ┌─────────┴──────────┐
                 │                    │
                 ▼                    ▼
             Express 5             grammY
                 │                    │
                 │               Telegram API
                 │
                 ▼
          Application Modules
          │       │       │
          │       │       └── Localization
          │       │
          │       └────────── Dispatch
          │
          └────────────────── Prayer Requests
                     │
             ┌───────┴────────┐
             ▼                ▼
         Zod Validation   node:crypto
                              │
                              ▼
                           AES-GCM
                              │
                              ▼
                         Mongoose 9
                              │
                              ▼
                           MongoDB
```

Supporting infrastructure:

```text id="bq8w1b"
Pino
Helmet
node-cron
Vitest
Supertest
mongodb-memory-server
ESLint
Prettier
```

---

# 91. Step 10 Acceptance Criteria

Technology selection is complete when:

```text id="pb5s6n"
✓ Node 24 LTS selected
✓ TypeScript selected
✓ ESM selected
✓ Express selected
✓ grammY selected
✓ MongoDB selected
✓ Mongoose selected
✓ Zod selected
✓ node:crypto selected
✓ Luxon selected
✓ node-cron selected
✓ Pino selected
✓ Helmet selected
✓ Vitest selected
✓ Supertest selected
✓ mongodb-memory-server selected
✓ ESLint selected
✓ typescript-eslint selected
✓ Prettier selected
✓ npm selected
✓ Environment strategy defined
✓ Windows development supported
✓ Test environment separated
✓ Development Telegram bot separated from production
✓ Production secrets strategy defined
✓ No unnecessary frontend dependency
✓ No unnecessary Redis/queue/microservices
✓ No AI dependency
✓ Dependency versions documented
✓ Dependency update strategy defined
```

---

# 92. Final Recommended Stack

The MVP stack is therefore:

```text id="9g3x22"
┌────────────────────────────────────────────┐
│                 RUNTIME                    │
│ Node.js 24 LTS                             │
├────────────────────────────────────────────┤
│                 LANGUAGE                   │
│ TypeScript 7                               │
├────────────────────────────────────────────┤
│                 WEB/API                    │
│ Express 5                                  │
├────────────────────────────────────────────┤
│                 TELEGRAM                   │
│ grammY                                      │
├────────────────────────────────────────────┤
│                 DATABASE                   │
│ MongoDB + Mongoose 9                       │
├────────────────────────────────────────────┤
│                 VALIDATION                 │
│ Zod 4                                      │
├────────────────────────────────────────────┤
│                 ENCRYPTION                 │
│ Node.js node:crypto                        │
├────────────────────────────────────────────┤
│                 TIME                       │
│ Luxon                                       │
├────────────────────────────────────────────┤
│                 SCHEDULING                 │
│ node-cron                                  │
├────────────────────────────────────────────┤
│                 LOGGING                    │
│ Pino                                       │
├────────────────────────────────────────────┤
│                 HTTP SECURITY              │
│ Helmet                                     │
├────────────────────────────────────────────┤
│                 TESTING                    │
│ Vitest + Supertest                         │
├────────────────────────────────────────────┤
│                 TEST DATABASE              │
│ mongodb-memory-server                      │
├────────────────────────────────────────────┤
│                 CODE QUALITY               │
│ ESLint + typescript-eslint + Prettier      │
├────────────────────────────────────────────┤
│                 PACKAGE MANAGER            │
│ npm                                        │
└────────────────────────────────────────────┘
```

---

# 93. Final Development Principle

The technology stack must serve the architecture, not dictate it.

The project should remain:

```text id="b9xk6i"
Simple
Typed
Modular
Privacy-conscious
Testable
Maintainable
```

The most important dependency is not grammY, Express, or MongoDB.

It is the **architecture that keeps Telegram identity separated from anonymous prayer content**.

That boundary must survive every technology choice.
