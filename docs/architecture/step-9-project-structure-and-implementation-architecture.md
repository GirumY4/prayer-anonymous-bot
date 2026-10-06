# Anonymous Prayer Request Bot

## Christian Students Fellowship — Pray Team

**Document:** Step 9 — Project Structure & Implementation Architecture
**Recommended path:** `docs/architecture/step-9-project-structure-and-implementation-architecture.md`

---

# 1. Purpose

This document defines the actual repository and source-code organization for the MVP.

It answers:

- Where should each feature live?
- Which files belong to which responsibility?
- Which modules may depend on each other?
- Where should Telegram-specific code live?
- Where should MongoDB-specific code live?
- Where should encryption live?
- Where should localization live?
- Where should the weekly scheduler live?
- Where should tests live?
- Where should configuration live?
- What should be implemented first?

The structure must preserve the privacy boundaries established in previous stages.

---

# 2. MVP Implementation Scope

The initial repository contains:

```text id="x8u8g7"
Backend
Telegram Bot
MongoDB integration
Encryption
Localization
Conversation state
Weekly scheduler
Weekly dispatch
Expiration/deletion
Security controls
Tests
Documentation
```

It does NOT initially contain:

```text id="3a91zp"
Student web application
Admin web application
Mobile application
Public API
AI processing
Analytics platform
```

---

# 3. Recommended Repository Structure

The initial project should look like this:

```text id="6gmd74"
prayer-anonymous-bot/
│
├── backend/
│
│   ├── src/
│   │   │
│   │   ├── app.ts
│   │   ├── server.ts
│   │   │
│   │   ├── config/
│   │   │   ├── env.ts
│   │   │   ├── config.ts
│   │   │   └── config.types.ts
│   │   │
│   │   ├── modules/
│   │   │   │
│   │   │   ├── telegram/
│   │   │   │   ├── telegram.controller.ts
│   │   │   │   ├── telegram.adapter.ts
│   │   │   │   ├── telegram.messenger.ts
│   │   │   │   ├── telegram.types.ts
│   │   │   │   └── telegram.callbacks.ts
│   │   │   │
│   │   │   ├── conversation/
│   │   │   │   ├── conversation.service.ts
│   │   │   │   ├── conversation.types.ts
│   │   │   │   ├── conversation.state.ts
│   │   │   │   └── session.store.ts
│   │   │   │
│   │   │   ├── prayer-requests/
│   │   │   │   ├── prayer-request.service.ts
│   │   │   │   ├── prayer-request.repository.ts
│   │   │   │   ├── prayer-request.model.ts
│   │   │   │   ├── prayer-request.types.ts
│   │   │   │   └── prayer-request.validation.ts
│   │   │   │
│   │   │   ├── dispatch/
│   │   │   │   ├── weekly-dispatch.service.ts
│   │   │   │   ├── dispatch.repository.ts
│   │   │   │   ├── dispatch.model.ts
│   │   │   │   ├── dispatch.types.ts
│   │   │   │   ├── digest-builder.ts
│   │   │   │   ├── message-splitter.ts
│   │   │   │   └── request-randomizer.ts
│   │   │   │
│   │   │   ├── localization/
│   │   │   │   ├── localization.service.ts
│   │   │   │   ├── localization.types.ts
│   │   │   │   ├── translation-keys.ts
│   │   │   │   └── locales/
│   │   │   │       ├── am/
│   │   │   │       │   └── messages.ts
│   │   │   │       └── en/
│   │   │   │           └── messages.ts
│   │   │   │
│   │   │   └── security/
│   │   │       ├── encryption.service.ts
│   │   │       ├── encryption.types.ts
│   │   │       └── secret.types.ts
│   │   │
│   │   ├── infrastructure/
│   │   │   │
│   │   │   ├── database/
│   │   │   │   ├── mongoose.ts
│   │   │   │   └── repositories/
│   │   │   │       ├── mongo-prayer-request.repository.ts
│   │   │   │       └── mongo-dispatch.repository.ts
│   │   │   │
│   │   │   ├── telegram/
│   │   │   │   └── telegram-bot-client.ts
│   │   │   │
│   │   │   └── scheduler/
│   │   │       └── scheduler.ts
│   │   │
│   │   ├── middleware/
│   │   │   ├── webhook-auth.middleware.ts
│   │   │   ├── request-limit.middleware.ts
│   │   │   └── error-handler.middleware.ts
│   │   │
│   │   ├── routes/
│   │   │   ├── health.routes.ts
│   │   │   └── telegram.routes.ts
│   │   │
│   │   ├── shared/
│   │   │   ├── errors/
│   │   │   │   ├── application-error.ts
│   │   │   │   └── error-codes.ts
│   │   │   │
│   │   │   ├── logging/
│   │   │   │   └── logger.ts
│   │   │   │
│   │   │   ├── types/
│   │   │   │   └── common.types.ts
│   │   │   │
│   │   │   └── utils/
│   │   │       ├── random-id.ts
│   │   │       ├── dates.ts
│   │   │       └── text.ts
│   │   │
│   │   └── bootstrap/
│   │       ├── dependencies.ts
│   │       └── startup.ts
│   │
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   ├── security/
│   │   └── e2e/
│   │
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.build.json
│   ├── eslint.config.js
│   ├── .env.example
│   └── .gitignore
│
├── docs/
│   ├── requirements/
│   ├── security/
│   ├── architecture/
│   └── ai/
│
├── .gitignore
├── README.md
└── LICENSE
```

---

# 4. Root-Level Structure

The project root should remain simple.

```text id="es3ndc"
prayer-anonymous-bot/
├── backend/
├── docs/
├── README.md
├── .gitignore
└── LICENSE
```

No unnecessary root-level packages.

---

# 5. Why Backend-Only for MVP

The product currently has:

```text id="rxjo4p"
Student
    ↓
Telegram Bot
    ↓
Backend
    ↓
MongoDB
    ↓
Weekly Telegram Group
```

There is no requirement for a student website.

Therefore we should not create:

```text id="0f9mso"
frontend/
```

yet.

When the future admin console is approved, it can become:

```text id="6rwcqi"
admin/
```

or:

```text id="xxyj9k"
apps/admin/
```

without changing the MVP.

---

# 6. `backend/src/app.ts`

`app.ts` creates the Express application.

Its responsibility should be limited to:

```text id="1q58on"
Create Express app
Register middleware
Register routes
Register error handler
```

It should NOT:

```text id="eavv7i"
connect MongoDB
start scheduler
register Telegram webhook
start background jobs
```

Those belong in startup/bootstrap logic.

---

# 7. `backend/src/server.ts`

`server.ts` is the process entry point.

Conceptually:

```text id="cg31gf"
server.ts
   ↓
load configuration
   ↓
connect infrastructure
   ↓
create application dependencies
   ↓
start scheduler
   ↓
start HTTP server
```

This provides a clean startup sequence.

---

# 8. Why Separate `app.ts` and `server.ts`

This is important for testing.

Testing:

```text id="3rj12n"
app.ts
```

does not need to:

```text id="c4q5tp"
open a real network port
connect production infrastructure
start a real scheduler
```

This lets integration tests construct the application safely.

---

# 9. `config/`

Configuration belongs in its own module.

```text id="es7xiw"
config/
├── env.ts
├── config.ts
└── config.types.ts
```

---

# 10. `env.ts`

Responsible for:

```text id="f1cdk1"
Read process.env
Validate required values
Reject missing configuration
```

Examples:

```text id="4qmxsp"
TELEGRAM_BOT_TOKEN
TELEGRAM_WEBHOOK_SECRET
MONGODB_URI
ENCRYPTION_KEY
PRAY_TEAM_CHAT_ID
```

No business logic belongs here.

---

# 11. `config.ts`

Transforms validated environment variables into application configuration.

For example:

```ts id="4ifj3n"
const config = {
  telegram: {...},
  database: {...},
  encryption: {...},
  dispatch: {...},
  security: {...},
};
```

All application modules can receive this configuration rather than reading `process.env` directly.

---

# 12. Rule: Do Not Read `process.env` Everywhere

Avoid:

```ts id="b7ijda"
const token = process.env.TELEGRAM_BOT_TOKEN;
```

in many files.

Prefer:

```text id="2ol1xe"
process.env
     ↓
env.ts
     ↓
config.ts
     ↓
application
```

This centralizes validation and prevents inconsistent configuration handling.

---

# 13. `modules/`

This is the main business area of the backend.

Each module represents a coherent capability.

```text id="1g4pwx"
modules/
├── telegram/
├── conversation/
├── prayer-requests/
├── dispatch/
├── localization/
└── security/
```

---

# 14. Telegram Module

```text id="cxq1g1"
modules/telegram/
├── telegram.controller.ts
├── telegram.adapter.ts
├── telegram.messenger.ts
├── telegram.types.ts
└── telegram.callbacks.ts
```

The module owns the Telegram-specific application boundary.

---

# 15. `telegram.controller.ts`

Responsible for receiving the HTTP webhook request.

Conceptually:

```text id="x0k9vg"
HTTP POST
   ↓
controller
   ↓
adapter
```

It should:

- receive request
- pass update to adapter
- return appropriate HTTP response

It should not contain prayer business logic.

---

# 16. `telegram.adapter.ts`

This is the main translation layer.

It converts:

```text id="8o6c6b"
Telegram Update
```

into:

```text id="p3e4w7"
Application action
```

For example:

```text id="i41sjh"
Telegram:
message.text = "/start"

       ↓

Application:
StartBotSession
```

This is one of the most important privacy boundaries in the project.

---

# 17. `telegram.callbacks.ts`

Contains the definitions and validation of callback actions.

Examples:

```text id="5do8te"
lang:am
lang:en
privacy:ack
menu:submit
menu:language
review:submit
review:edit
review:cancel
```

It should not contain personal information.

---

# 18. `telegram.messenger.ts`

Defines the application's outgoing Telegram communication contract.

Example:

```ts id="jj0x8b"
interface TelegramMessenger {
  sendText(...): Promise<...>;
}
```

The application depends on this abstraction.

---

# 19. `infrastructure/telegram/telegram-bot-client.ts`

This file contains the actual Telegram SDK/API implementation.

Architecture:

```text id="scq6sk"
WeeklyDispatchService
       ↓
TelegramMessenger interface
       ↓
telegram-bot-client.ts
       ↓
Telegram Bot API
```

This means the business logic does not know which Telegram library we eventually choose.

---

# 20. Conversation Module

```text id="kp3ie5"
modules/conversation/
├── conversation.service.ts
├── conversation.types.ts
├── conversation.state.ts
└── session.store.ts
```

This module owns:

- state transitions
- language state
- temporary draft
- cancellation
- session expiration
- conversation routing

---

# 21. `conversation.state.ts`

This file should define the state machine.

Example:

```ts id="3v7yb1"
type ConversationState =
  | "LANGUAGE_SELECTION"
  | "PRIVACY_NOTICE"
  | "MAIN_MENU"
  | "PRIVACY_DETAILS"
  | "HELP"
  | "SUBMISSION_INSTRUCTIONS"
  | "WAITING_FOR_PRAYER"
  | "REVIEWING_REQUEST"
  | "SUBMISSION_PROCESSING";
```

Keep states centralized so they do not become inconsistent across the codebase.

---

# 22. `conversation.types.ts`

Contains:

```ts id="g1y1sp"
SupportedLanguage;
Conversation;
ConversationAction;
ConversationResult;
```

Example:

```ts id="m5ys79"
type SupportedLanguage = "am" | "en";
```

---

# 23. `session.store.ts`

Defines temporary session storage.

Initially:

```text id="xypzcb"
In-memory store
```

with:

```text id="w2v6ve"
TTL
```

It should be replaceable later with a distributed store if the system scales.

---

# 24. `conversation.service.ts`

This is where state transitions are enforced.

For example:

```text id="nob9x4"
Current:
REVIEWING_REQUEST

Action:
SUBMIT

Result:
SUBMISSION_PROCESSING
```

The service should reject invalid transitions.

---

# 25. Prayer Request Module

```text id="hh15s7"
modules/prayer-requests/
├── prayer-request.service.ts
├── prayer-request.repository.ts
├── prayer-request.model.ts
├── prayer-request.types.ts
└── prayer-request.validation.ts
```

This module owns the actual prayer-request domain.

---

# 26. `prayer-request.types.ts`

Defines the domain types.

For example:

```ts id="htr6z5"
type PrayerRequestStatus = "pending" | "published";
```

and:

```ts id="l1p76x"
interface PrayerRequest {
  requestId: string;
  content: EncryptedContent;
  status: PrayerRequestStatus;
  createdAt: Date;
  expiresAt: Date;
  dispatchId?: string;
  publishedAt?: Date;
}
```

No Telegram identity fields.

---

# 27. `prayer-request.validation.ts`

Contains input validation.

For example:

```text id="l7j9u0"
empty
too long
unsupported
```

The validator should not perform:

```text id="2u2hii"
database operations
encryption
Telegram sending
```

---

# 28. `prayer-request.service.ts`

This is the main business logic for submitting a prayer request.

Conceptually:

```text id="e7v3rw"
validate
  ↓
generate request ID
  ↓
encrypt
  ↓
create domain object
  ↓
repository.save
```

It should not know how Telegram works.

---

# 29. `prayer-request.repository.ts`

Defines the repository interface.

Example:

```ts id="n0avc3"
interface PrayerRequestRepository {
  create(...);
  findEligibleForDispatch(...);
  markPublished(...);
  deleteExpired(...);
}
```

This is an application-facing contract.

---

# 30. `prayer-request.model.ts`

Contains the Mongoose schema/model.

It belongs to the feature because it represents the persistence structure of the prayer-request domain.

However, actual database connection initialization remains under:

```text id="y0y6qi"
infrastructure/database/
```

---

# 31. Database Repository Implementation

The actual MongoDB implementation belongs here:

```text id="7segr4"
infrastructure/database/repositories/
└── mongo-prayer-request.repository.ts
```

So:

```text id="ll9k0w"
Prayer Request Service
       ↓
PrayerRequestRepository interface
       ↓
MongoPrayerRequestRepository
       ↓
Mongoose
       ↓
MongoDB
```

---

# 32. Why This Separation Matters

Without this separation, we would get:

```text id="x4f1lw"
PrayerRequestService
       ↓
Mongoose Model
       ↓
MongoDB
```

and then testing the service would require a real MongoDB environment.

With the repository interface:

```text id="tm2sb1"
PrayerRequestService
       ↓
Repository interface
       ↓
fake/in-memory repository
```

we can test business logic much more easily.

---

# 33. Dispatch Module

```text id="d4jklv"
modules/dispatch/
├── weekly-dispatch.service.ts
├── dispatch.repository.ts
├── dispatch.model.ts
├── dispatch.types.ts
├── digest-builder.ts
├── message-splitter.ts
└── request-randomizer.ts
```

This module owns the weekly publication process.

---

# 34. `weekly-dispatch.service.ts`

This is the central weekly use case.

Responsibilities:

```text id="m8uodd"
Create/claim dispatch
Find eligible requests
Stop if zero
Decrypt required content
Randomize
Build digest
Split digest
Publish
Update status
Handle failure
```

It should coordinate services, not contain every implementation detail itself.

---

# 35. `digest-builder.ts`

Responsible for turning:

```text id="atj2o4"
PublishablePrayerRequest[]
```

into:

```text id="0ht4p8"
Digest
```

It should control:

- heading
- separators
- request ID
- safe formatting

It must not know:

```text id="6koi24"
Telegram user
Telegram chat
MongoDB
```

---

# 36. `message-splitter.ts`

Responsible for Telegram message-size constraints.

Input:

```text id="qg0aom"
Digest
```

Output:

```text id="scf54r"
OutgoingMessage[]
```

It must never truncate a prayer request.

---

# 37. `request-randomizer.ts`

Responsible for randomizing weekly request order.

This exists as a separate component because:

```text id="rqm1co"
Randomization
```

is a privacy-related behavior, not just a formatting detail.

It can therefore be tested independently.

---

# 38. Localization Module

```text id="52pfy5"
modules/localization/
├── localization.service.ts
├── localization.types.ts
├── translation-keys.ts
└── locales/
    ├── am/
    │   └── messages.ts
    └── en/
        └── messages.ts
```

---

# 39. `messages.ts`

The translation files should contain only user-facing messages.

Example structure:

```ts id="dn5q2q"
export const messages = {
  "welcome.title": "...",
  "language.choose": "...",
  "privacy.title": "...",
  "prayer.instructions": "...",
  "prayer.review": "...",
  "prayer.success": "...",
  "common.cancel": "...",
};
```

No business logic should be placed in these files.

---

# 40. Amharic as the Initial Language

The localization system should not imply that English is the default.

The conversation layer should initialize new sessions with:

```ts id="buo4da"
language = "am";
```

until the student selects another language.

---

# 41. Security Module

```text id="vlk2rr"
modules/security/
├── encryption.service.ts
├── encryption.types.ts
└── secret.types.ts
```

The security module contains reusable security primitives.

It should not contain:

```text id="5m8ftd"
Telegram conversation flow
database queries
weekly digest logic
```

---

# 42. Encryption Service

```ts id="7a05au"
interface EncryptionService {
  encrypt(plaintext: string): EncryptedContent;
  decrypt(content: EncryptedContent): string;
}
```

Its implementation uses the configured encryption key.

---

# 43. Infrastructure Layer

Infrastructure is where external technologies are implemented.

```text id="5h5fki"
infrastructure/
├── database/
├── telegram/
└── scheduler/
```

This layer answers:

> How does our application communicate with the outside world?

---

# 44. Database Infrastructure

```text id="6e1i0r"
infrastructure/database/
├── mongoose.ts
└── repositories/
    ├── mongo-prayer-request.repository.ts
    └── mongo-dispatch.repository.ts
```

`mongoose.ts` initializes the database connection.

Repository implementations translate application operations into MongoDB/Mongoose operations.

---

# 45. Telegram Infrastructure

```text id="j5c1un"
infrastructure/telegram/
└── telegram-bot-client.ts
```

This is the only place that should contain the concrete Telegram client/library implementation.

---

# 46. Scheduler Infrastructure

```text id="6pys0h"
infrastructure/scheduler/
└── scheduler.ts
```

It triggers:

```text id="qse8ff"
RunWeeklyDispatch
DeleteExpiredRequests
```

It does not contain their business logic.

---

# 47. Middleware

```text id="8wy7vy"
middleware/
├── webhook-auth.middleware.ts
├── request-limit.middleware.ts
└── error-handler.middleware.ts
```

---

# 48. `webhook-auth.middleware.ts`

Responsible for:

```text id="5zop01"
Verify Telegram webhook secret
```

If invalid:

```text id="6d3h4l"
Reject request
```

It must not attempt to process the update first.

---

# 49. `request-limit.middleware.ts`

Responsible for general HTTP request protection.

It can enforce:

```text id="ksm7t3"
Body size
Basic request limits
```

Application-level conversational rate limiting belongs inside the appropriate application/infrastructure mechanism.

---

# 50. `error-handler.middleware.ts`

Centralizes HTTP/application error handling.

It must:

```text id="ud3y8o"
return safe external message
log sanitized technical event
never leak secrets or prayer text
```

---

# 51. Routes

```text id="et4mkn"
routes/
├── telegram.routes.ts
└── health.routes.ts
```

---

# 52. `telegram.routes.ts`

Defines:

```http id="3t8r7v"
POST /webhooks/telegram/<secret-path>
```

The exact secret-path handling can be centralized in configuration.

---

# 53. `health.routes.ts`

Provides a minimal operational health endpoint.

For example:

```http id="o3lxng"
GET /health
```

Response:

```json id="st90ef"
{
  "status": "ok"
}
```

It must not reveal:

```text id="f91nnj"
MongoDB URI
Telegram token
Encryption status details
Environment secrets
internal paths
```

A more sophisticated readiness endpoint can be added later.

---

# 54. Why Have a Health Endpoint?

It helps deployment platforms determine whether the process is alive.

It also provides a safe operational diagnostic without exposing prayer data.

---

# 55. Shared Utilities

```text id="t3g53q"
shared/
├── errors/
├── logging/
├── types/
└── utils/
```

This area should remain small.

Do not place arbitrary business logic here just because it is "shared."

---

# 56. `shared/errors/`

Contains:

```text id="e6cpq0"
ApplicationError
error codes
error mapping
```

This allows consistent error handling across modules.

---

# 57. `shared/logging/`

Contains the centralized logger.

Every module should use the same logging abstraction.

Example:

```ts id="u9htv5"
logger.info({
  event: "weekly_dispatch_completed",
});
```

No prayer content.

---

# 58. `shared/utils/`

Only truly generic utilities belong here.

Examples:

```text id="s1g2u8"
random-id.ts
dates.ts
text.ts
```

Do not put prayer-request-specific functions here.

---

# 59. `random-id.ts`

Provides cryptographically secure anonymous request IDs.

Conceptually:

```ts id="w6upzr"
generateRequestId(): string
```

Example result:

```text id="fa46kn"
PR-7F29A83C
```

This utility must never receive a Telegram ID as an input.

---

# 60. `dates.ts`

Can contain:

```text id="ro7h8c"
week calculation
timezone handling
expiration calculations
collection boundaries
```

This is especially important because weekly dispatch depends on a well-defined timezone.

---

# 61. `text.ts`

Can contain safe generic operations such as:

```text id="5o1xl8"
normalize whitespace
measure safe text length
split helper utilities
```

It must not become a dumping ground for Telegram formatting logic.

---

# 62. Bootstrap Layer

```text id="h2gh9q"
bootstrap/
├── dependencies.ts
└── startup.ts
```

This layer assembles the application.

---

# 63. `dependencies.ts`

This file wires interfaces to implementations.

Conceptually:

```text id="7a0jcu"
PrayerRequestRepository
        ↓
MongoPrayerRequestRepository

TelegramMessenger
        ↓
TelegramBotClient

EncryptionService
        ↓
AesGcmEncryptionService

ConversationManager
        ↓
InMemorySessionStore
```

This is where dependency injection happens.

---

# 64. Why Explicit Dependency Wiring Matters

Without a central composition point, modules can start creating their own dependencies:

```ts id="m8x7fl"
new MongoClient(...)
new TelegramBot(...)
new EncryptionService(...)
```

inside business classes.

That creates tightly coupled code.

Instead:

```text id="k0y2tx"
bootstrap
   ↓
create dependencies
   ↓
inject dependencies
   ↓
start application
```

---

# 65. Startup Sequence

The application should start approximately like this:

```text id="7t7x4y"
1. Load environment
2. Validate configuration
3. Initialize logger
4. Connect MongoDB
5. Create encryption service
6. Create repositories
7. Create Telegram client
8. Create application services
9. Create conversation store
10. Configure webhook
11. Start scheduler
12. Start HTTP server
```

The exact order can be refined during implementation.

---

# 66. Shutdown Sequence

The application also needs graceful shutdown.

```text id="t9z2m8"
SIGTERM / SIGINT
        ↓
Stop scheduler
        ↓
Stop accepting new HTTP work
        ↓
Finish safe in-flight operations
        ↓
Close Telegram client resources
        ↓
Close MongoDB
        ↓
Exit
```

This is especially important during deployment restarts.

---

# 67. Why Graceful Shutdown Matters

Without it:

```text id="j8j4uj"
Deployment restart
      ↓
Weekly dispatch running
      ↓
Process killed
      ↓
Unknown publication state
```

Graceful shutdown reduces the risk of incomplete operations.

---

# 68. Package Structure

The backend `package.json` should provide clear scripts.

Conceptually:

```json id="6jv0t6"
{
  "scripts": {
    "dev": "...",
    "build": "...",
    "start": "...",
    "test": "...",
    "test:unit": "...",
    "test:integration": "...",
    "test:e2e": "...",
    "lint": "...",
    "typecheck": "...",
    "format": "..."
  }
}
```

The actual tooling can be selected during implementation.

---

# 69. TypeScript Configuration

The backend should use strict TypeScript settings.

At minimum, conceptually:

```json id="tv5fuk"
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true
  }
}
```

The exact compiler settings will be validated against the selected dependencies before implementation.

The goal is to make invalid states and missing values harder to express.

---

# 70. Source TypeScript Rules

The codebase should avoid:

```text id="9o1d9h"
any
unsafe type casts
silent error swallowing
global mutable state
direct process.env access outside config
```

when there is a type-safe alternative.

---

# 71. Dependency Direction

The intended direction is:

```text id="mw1j6u"
Routes / Controllers
        ↓
Application Services
        ↓
Repository / Service Interfaces
        ↓
Infrastructure Implementations
```

Not:

```text id="x9p1l0"
Infrastructure
        ↓
Business Logic
        ↓
Telegram SDK
```

The business layer should remain independent.

---

# 72. Module Dependency Rules

## Telegram Module

May depend on:

```text
Conversation
Localization
Application contracts
```

Should not directly manipulate:

```text MongoDB

```

---

# 73. Conversation Module

May depend on:

```text Localization

```

and application contracts.

Should not depend on:

```text Prayer repository implementation
MongoDB
Telegram SDK
```

---

# 74. Prayer Request Module

May depend on:

```text Encryption interface
Prayer repository interface
Validation
ID generator
```

Should not depend on:

```text Telegram SDK
Express request
Telegram user object
```

---

# 75. Dispatch Module

May depend on:

```text Prayer repository interface
Dispatch repository interface
Encryption interface
Digest builder
Randomizer
Telegram messenger interface
```

Should not directly depend on:

```text Mongoose model
Telegram SDK
Express
```

---

# 76. Localization Module

Should be almost completely independent.

It should not know:

```text MongoDB
Telegram IDs
Prayer requests
```

It only translates application message keys.

---

# 77. Security Module

Provides primitives such as encryption.

It should not know:

```text student
prayer
Telegram
MongoDB
```

The generic security layer should remain reusable.

---

# 78. Infrastructure Dependency Rule

Infrastructure knows technology:

```text id="x0k4f9"
Mongoose
Telegram SDK
scheduler library
Express
```

Application modules know business meaning:

```text id="9opn5r"
PrayerRequest
Dispatch
Conversation
```

This separation is the essence of the architecture.

---

# 79. Test Structure

Tests should mirror responsibilities.

```text id="e8y6m6"
backend/tests/
├── unit/
│   ├── conversation/
│   ├── prayer-requests/
│   ├── dispatch/
│   ├── localization/
│   └── security/
│
├── integration/
│   ├── database/
│   ├── telegram/
│   └── dispatch/
│
├── security/
│   ├── privacy/
│   ├── webhook/
│   ├── encryption/
│   └── retention/
│
└── e2e/
    └── bot/
```

---

# 80. Unit Tests

Unit tests should not require:

```text id="0o3x4a"
MongoDB
real Telegram
Internet
production secrets
```

Examples:

```text id="7a1r6b"
Conversation state transitions
Prayer validation
Request ID generation
Encryption service behavior
Localization
Digest construction
Message splitting
Randomization
```

---

# 81. Integration Tests

Integration tests can use:

```text id="37eu9w"
test MongoDB
test Telegram adapter/mock
application services
```

Examples:

```text id="cs1jrh"
Repository operations
Mongoose schema validation
dispatch persistence
Telegram adapter mapping
```

Use synthetic prayer data only.

---

# 82. Security Tests

Security tests must explicitly attack the privacy boundaries.

Examples:

```text id="7y4qkl"
Try to inject telegramUserId
Try to persist raw Telegram update
Try to publish with expired request
Try stale callback
Try wrong webhook secret
Try oversized payload
Try unauthorized dispatch
```

---

# 83. End-to-End Tests

The most valuable E2E test is:

```text id="1kvpo4"
Start bot
↓
Choose Amharic
↓
Acknowledge privacy
↓
Submit synthetic prayer
↓
Confirm
↓
Run weekly dispatch
↓
Verify group message
↓
Verify database state
```

Then a second test:

```text id="s7t04x"
Run weekly dispatch with zero requests
↓
Verify NO Telegram group message
```

---

# 84. Test Doubles

Because the application uses interfaces, we can create:

```text id="yq7exx"
FakePrayerRequestRepository
FakeDispatchRepository
FakeTelegramMessenger
FakeEncryptionService
FakeConversationStore
```

This is one of the main benefits of the architecture.

---

# 85. No Real Telegram During Unit Tests

Do not use the real fellowship bot token in normal unit tests.

Real Telegram integration should belong to controlled integration/E2E environments.

This prevents accidental test messages from reaching the real Pray Team group.

---

# 86. Separate Test Bot

Eventually, integration testing should use:

```text id="d4m8gm"
development/test Telegram bot
```

and:

```text id="omg1sl"
development/test Telegram group
```

never the real fellowship production group.

---

# 87. Environment Separation

There should eventually be distinct environments:

```text id="y9gk3s"
development
testing
production
```

Each should have separate:

```text id="nll4ic"
Telegram bot
MongoDB database
secrets
Pray Team destination
```

Production prayer requests must never enter development.

---

# 88. Suggested Environment Files

Local:

```text id="dj9l6p"
.env
```

Template:

```text id="q9x7vx"
.env.example
```

Test:

```text id="rj6vly"
.env.test
```

Production secrets should be supplied by the deployment platform rather than committed files.

---

# 89. Documentation Structure

The documentation should now be:

```text id="o1q7sq"
docs/
│
├── requirements/
│   ├── step-1-requirements-and-privacy.md
│   └── step-3-user-flow.md
│
├── security/
│   ├── step-2-threat-model.md
│   └── step-8-security-architecture-and-privacy-controls.md
│
├── architecture/
│   ├── step-4-system-architecture.md
│   ├── step-5-database-design-and-data-model.md
│   ├── step-6-api-design-and-application-contracts.md
│   ├── step-7-telegram-bot-design-and-state-machine.md
│   └── step-9-project-structure-and-implementation-architecture.md
│
└── ai/
    └── master-project-prompt.md
```

---

# 90. Future Documentation Files

As the project continues, we will eventually add:

```text id="mvgdxy"
docs/
├── api/
│   └── telegram-webhook-contract.md
│
├── deployment/
│   ├── development-deployment.md
│   └── production-deployment.md
│
├── operations/
│   ├── backup-policy.md
│   ├── retention-policy.md
│   └── incident-response.md
│
└── testing/
    └── security-test-plan.md
```

These should be added only when those areas are actually designed.

---

# 91. README Purpose

The root `README.md` should explain:

```text id="f3cslv"
What the project is
Why privacy matters
Architecture overview
Repository structure
Development setup
Environment configuration
Testing
Deployment overview
```

It should NOT contain:

```text id="d6nqfp"
real bot token
database credentials
encryption key
real prayer requests
production webhook secret
```

---

# 92. Root README Architecture Diagram

The README can eventually contain a simplified diagram:

```text id="6xwv86"
Student
   ↓
Telegram Bot
   ↓
TypeScript Backend
   ├── Conversation
   ├── Prayer Requests
   ├── Encryption
   ├── Localization
   └── Weekly Dispatch
          ↓
       MongoDB
          ↓
   Pray Team Telegram Group
```

The detailed diagrams remain in `docs/`.

---

# 93. Implementation Order

We should not create every file and then fill them randomly.

Implement in dependency order.

## Phase 1 — Project Foundation

```text id="g7v1i9"
package.json
TypeScript
ESLint
Formatting
Environment validation
Express application
Health route
```

---

## Phase 2 — Database Foundation

```text id="as0nzr"
MongoDB connection
Mongoose setup
Prayer request schema
Dispatch schema
Repository interfaces
Repository implementations
Indexes
```

---

## Phase 3 — Security Foundation

```text id="26aple"
Encryption service
Key configuration
Webhook authentication
Input limits
Safe logging
Error handling
```

---

## Phase 4 — Localization Foundation

```text id="id19n6"
Translation keys
Amharic messages
English messages
Localization service
```

---

## Phase 5 — Conversation Engine

```text id="tbt0gp"
Session store
State definitions
State transitions
Commands
Callback handling
Expiration
```

---

## Phase 6 — Telegram Adapter

```text id="9u1ibs"
Webhook controller
Update normalization
Telegram outbound client
Keyboard definitions
Message rendering
```

---

## Phase 7 — Prayer Submission

```text id="36m9b7"
Instructions
Text validation
Review
Submission
Encryption
Persistence
Confirmation
```

---

## Phase 8 — Weekly Dispatch

```text id="7z1k0y"
Scheduler
Dispatch records
Lock/claim
Eligibility query
Randomization
Digest builder
Message splitter
Telegram publication
Publication state
```

---

## Phase 9 — Retention

```text id="0xetpr"
Expiration logic
Cleanup job
TTL index
Retention tests
```

---

## Phase 10 — Security Testing

```text id="3m5vxl"
Privacy tests
Webhook tests
Encryption tests
Session tests
Dispatch failure tests
Empty-week tests
```

---

## Phase 11 — Deployment

```text id="x5r8uq"
Production environment
HTTPS
Telegram webhook
MongoDB security
Secrets
Monitoring
Backup policy
```

---

# 94. Why This Implementation Order?

Because each phase builds on the previous one.

For example:

```text id="kb5t8j"
Cannot build:
weekly dispatch

reliably before:
database + dispatch states
```

And:

```text id="d40paz"
Cannot build:
conversation flow

cleanly before:
localization + session model
```

And:

```text id="5jt8q3"
Cannot build:
secure submission

before:
encryption + validation + persistence contracts
```

---

# 95. First Coding Milestone

The first actual coding milestone should NOT be:

```text id="2ne48a"
"Make /start work"
```

Instead:

> **Create a production-quality backend foundation capable of safely hosting the bot.**

That means:

```text id="lhik1k"
TypeScript
+
Express
+
configuration
+
logging
+
error handling
+
MongoDB connection
+
test framework
```

before adding the conversational logic.

---

# 96. Second Coding Milestone

Then implement the privacy-critical foundation:

```text id="hpr1ef"
Encryption
+
Prayer request schema
+
Repository
+
Validation
+
Request ID generation
```

At this point we can test whether our fundamental privacy assumptions actually hold in code.

---

# 97. Third Coding Milestone

Then implement:

```text id="x5e7yt"
Conversation state machine
+
Amharic/English localization
+
Telegram adapter
```

This produces the actual student-facing bot flow.

---

# 98. Fourth Coding Milestone

Then:

```text id="7f6w8n"
Weekly scheduler
+
Dispatch state
+
Digest builder
+
Telegram group publication
```

This produces the central Pray Team workflow.

---

# 99. Fifth Coding Milestone

Finally:

```text id="ifj17b"
Retention
+
security testing
+
failure testing
+
deployment
```

before treating the system as production-ready.

---

# 100. File Responsibility Rules

Every file should have a clearly answerable question:

```text id="wf9dzm"
What does this file own?
```

Examples:

```text id="f9osgt"
prayer-request.service.ts
→ What is the business logic for creating prayer requests?

mongo-prayer-request.repository.ts
→ How are prayer requests stored in MongoDB?

telegram-bot-client.ts
→ How do we communicate with Telegram?

weekly-dispatch.service.ts
→ How do we execute one weekly publication operation?

digest-builder.ts
→ How do we turn anonymous requests into a Telegram digest?

localization.service.ts
→ How do we produce user-facing messages in the selected language?

encryption.service.ts
→ How do we protect sensitive plaintext?
```

If a file cannot answer a clear question, its responsibility probably needs to be reconsidered.

---

# 101. Avoid the "Utils Everything" Problem

Do not allow:

```text id="yqk4jo"
utils.ts
helpers.ts
common.ts
misc.ts
```

to become giant files containing unrelated functionality.

Prefer precise modules:

```text id="3eworq"
random-id.ts
dates.ts
text.ts
```

and feature-specific utilities inside their respective modules.

---

# 102. Avoid Giant Services

Do not create:

```text id="5syptc"
bot.service.ts
```

containing:

```text
Telegram
conversation
MongoDB
encryption
dispatch
localization
```

The system is deliberately divided into modules because the project is privacy-sensitive and will need careful testing.

---

# 103. Avoid Circular Dependencies

For example, avoid:

```text id="2l2vct"
Prayer Service
   ↓
Telegram Service
   ↓
Conversation Service
   ↓
Prayer Service
```

Dependencies should generally move inward toward application/domain contracts.

---

# 104. Recommended Dependency Direction

```text id="xq4v6k"
                   ┌───────────────┐
                   │  Controllers  │
                   └───────┬───────┘
                           ▼
                  ┌────────────────┐
                  │ Application    │
                  │ Services       │
                  └───────┬────────┘
                          ▼
                ┌──────────────────┐
                │ Interfaces /     │
                │ Domain Contracts │
                └───────┬──────────┘
                        ▼
                ┌──────────────────┐
                │ Infrastructure   │
                └──────────────────┘
```

---

# 105. Privacy Boundary in Source Code

The following structure must remain true:

```text id="g8mlvn"
Telegram Adapter
      │
      │ Telegram data
      ▼
Conversation Layer
      │
      │ prayer text only
      ▼
Prayer Request Service
      │
      │ anonymous domain object
      ▼
Repository
      │
      ▼
MongoDB
```

The Telegram user object should not cross into:

```text id="q5l1zn"
prayer-requests/
```

---

# 106. Weekly Dispatch Boundary in Source Code

```text id="9kk9uo"
Prayer Repository
      │
      │ encrypted requests
      ▼
Weekly Dispatch
      │
      │ temporary plaintext
      ▼
Digest Builder
      │
      │ safe outgoing text
      ▼
Telegram Messenger
```

The digest builder should never receive:

```text id="d0r2w8"
Telegram user
chat ID
username
conversation ID
```

---

# 107. Future Admin Console

When the admin console is eventually built, it should be another application layer:

```text id="0yrb8s"
prayer-anonymous-bot/
├── backend/
├── admin/
└── docs/
```

or a monorepo:

```text id="3p4w6t"
apps/
├── backend/
└── admin/
```

The admin console should communicate through application services/API contracts.

It should not directly access MongoDB from browser code.

---

# 108. Future API Layer

When the admin console appears, the backend may expose authenticated routes such as:

```text id="25a6s6"
GET /admin/requests
POST /admin/dispatch
DELETE /admin/requests/:id
```

But these do not exist in the MVP.

The architecture is designed so they can be added without altering the student Telegram flow.

---

# 109. Future Mobile App

If a mobile application is eventually developed, it should use the same application/backend services rather than creating a second prayer database.

But this is explicitly outside the MVP.

---

# 110. Final Repository Structure

The recommended actual starting repository is:

```text id="4w9r2p"
prayer-anonymous-bot/
│
├── backend/
│   │
│   ├── src/
│   │   ├── app.ts
│   │   ├── server.ts
│   │   │
│   │   ├── config/
│   │   │
│   │   ├── modules/
│   │   │   ├── telegram/
│   │   │   ├── conversation/
│   │   │   ├── prayer-requests/
│   │   │   ├── dispatch/
│   │   │   ├── localization/
│   │   │   └── security/
│   │   │
│   │   ├── infrastructure/
│   │   │   ├── database/
│   │   │   ├── telegram/
│   │   │   └── scheduler/
│   │   │
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── shared/
│   │   └── bootstrap/
│   │
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   ├── security/
│   │   └── e2e/
│   │
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.build.json
│   ├── eslint.config.js
│   ├── .env.example
│   └── .gitignore
│
├── docs/
│   ├── requirements/
│   │   ├── step-1-requirements-and-privacy.md
│   │   └── step-3-user-flow.md
│   │
│   ├── security/
│   │   ├── step-2-threat-model.md
│   │   └── step-8-security-architecture-and-privacy-controls.md
│   │
│   ├── architecture/
│   │   ├── step-4-system-architecture.md
│   │   ├── step-5-database-design-and-data-model.md
│   │   ├── step-6-api-design-and-application-contracts.md
│   │   ├── step-7-telegram-bot-design-and-state-machine.md
│   │   └── step-9-project-structure-and-implementation-architecture.md
│   │
│   └── ai/
│       └── master-project-prompt.md
│
├── README.md
├── .gitignore
└── LICENSE
```

---

# 111. Final Architecture Principle

The repository should visually communicate the architecture:

```text id="x7a0pb"
modules/
    = business capabilities

infrastructure/
    = technologies

middleware/
    = transport/security boundaries

routes/
    = HTTP entry points

bootstrap/
    = dependency wiring

shared/
    = genuinely reusable technical primitives

tests/
    = verification of behavior and privacy
```

This prevents the project from becoming a collection of unrelated Telegram handlers.

---

# 112. Step 9 Acceptance Criteria

The implementation architecture is ready when:

```text id="ozfrxj"
✓ MVP is backend-only
✓ No unnecessary frontend exists
✓ Telegram is isolated behind an adapter
✓ MongoDB is isolated behind repositories
✓ Conversation state is its own module
✓ Prayer requests are their own module
✓ Weekly dispatch is its own module
✓ Localization is its own module
✓ Encryption is its own security service
✓ Scheduler is separate from dispatch business logic
✓ Configuration is centralized
✓ Secrets are not accessed throughout the codebase
✓ HTTP middleware is separated
✓ Application dependencies are wired centrally
✓ Tests are separated by purpose
✓ Development and production environments are distinct
✓ No real prayer data enters tests
✓ Future admin console can be added independently
✓ Module dependency direction is clear
✓ Telegram identity cannot naturally enter the prayer-request module
```

---

# 113. Implementation Readiness

After Steps 1–9, the project now has:

```text id="n5q4wu"
Step 1  → Requirements
Step 2  → Threat Model
Step 3  → User Flow
Step 4  → System Architecture
Step 5  → Database Design
Step 6  → API/Application Contracts
Step 7  → Telegram State Machine
Step 8  → Security Architecture
Step 9  → Project Structure
```

The next phase can therefore move from **architecture** toward **technical implementation specifications**.

The recommended next step is:

**Step 10 — Technology Stack, Dependencies & Development Environment**

That will define the exact backend packages, Telegram library approach, database libraries, validation, testing framework, linting/formatting, environment setup, Node/TypeScript configuration, and local development workflow before we create the project files.
