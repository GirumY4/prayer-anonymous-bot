# Anonymous Prayer Request Bot

## Christian Students Fellowship — Pray Team

**Document:** Step 4 — System Architecture
**Recommended path:** `docs/architecture/step-4-system-architecture.md`

---

# 1. Architecture Goal

The architecture must implement the privacy and operational requirements established in Steps 1–3.

The MVP must provide:

- Private Telegram interaction
- Amharic-first onboarding
- Amharic and English support
- Anonymous prayer-request submission
- Minimal data collection
- Encrypted prayer-request storage
- Weekly scheduled dispatch
- No group message when there are zero eligible requests
- Anonymous bot-generated weekly digest
- Duplicate-dispatch prevention
- Request expiration and deletion
- Privacy-conscious logging
- No admin web console yet

The architecture should also be easy for a student development team to understand, test, deploy, and maintain.

---

# 2. Recommended Architecture Style

## Modular Monolith

The MVP should be one deployable backend application divided into well-defined modules.

```text id="4o7j1p"
                    ┌─────────────────────────┐
                    │      Telegram Users     │
                    └────────────┬────────────┘
                                 │
                                 │ HTTPS
                                 ▼
                    ┌─────────────────────────┐
                    │      Telegram Bot API   │
                    └────────────┬────────────┘
                                 │
                                 │ Webhook
                                 ▼
┌───────────────────────────────────────────────────────────────────┐
│                       BACKEND APPLICATION                         │
│                                                                   │
│  ┌──────────────┐   ┌────────────────┐   ┌─────────────────────┐ │
│  │ Telegram     │   │ Conversation   │   │ Prayer Request      │ │
│  │ Adapter      │──►│ / Session      │──►│ Module              │ │
│  └──────────────┘   └────────────────┘   └──────────┬──────────┘ │
│                                                     │            │
│                                  ┌──────────────────┴───────┐    │
│                                  │                          │    │
│                                  ▼                          ▼    │
│                         ┌────────────────┐       ┌──────────────┐│
│                         │ Encryption     │       │ Localization ││
│                         └────────────────┘       └──────────────┘│
│                                  │                          │    │
│                                  └──────────────┬───────────┘    │
│                                                 ▼                │
│                                      ┌──────────────────────┐    │
│                                      │ MongoDB / Mongoose    │    │
│                                      └──────────────────────┘    │
│                                                                   │
│  ┌─────────────────┐        ┌─────────────────────────────────┐ │
│  │ Weekly          │───────►│ Dispatch / Digest Module        │ │
│  │ Scheduler       │        └───────────────┬─────────────────┘ │
│  └─────────────────┘                        │                   │
│                                             ▼                   │
│                                  ┌──────────────────────┐       │
│                                  │ Telegram Group       │       │
│                                  │ Pray Team            │       │
│                                  └──────────────────────┘       │
└───────────────────────────────────────────────────────────────────┘
```

This is a **single application**, but internally it is divided into modules.

---

# 3. Why a Modular Monolith?

For this project, microservices would introduce complexity without providing a meaningful benefit.

A modular monolith gives us:

```text id="k6qv5m"
One deployment
One backend
One database
One codebase

BUT

Clear module boundaries
Clear responsibilities
Testable components
Easy future expansion
```

Later, if the fellowship system becomes significantly larger, a module can be extracted into another service.

The MVP should not pay the operational cost of microservices before there is a real need.

---

# 4. Major Components

The system has seven major components.

```text id="tg3u2e"
1. Telegram Adapter
2. Conversation / Session Manager
3. Prayer Request Module
4. Encryption Service
5. Localization Module
6. Weekly Dispatch Module
7. Persistence Layer
```

Cross-cutting components:

```text id="21t2go"
Configuration
Logging
Validation
Security
Error Handling
```

---

# 5. Component 1 — Telegram Adapter

The Telegram Adapter is the only component that should directly deal with Telegram's Bot API.

Its responsibility is:

```text id="5wu1gm"
Telegram Update
      ↓
Parse / normalize
      ↓
Application command/event
      ↓
Use-case layer
```

It should handle things such as:

```text id="n9m0v2"
/start
button clicks
text messages
/cancel
/language
```

It should also be responsible for sending messages back to Telegram.

---

# 6. Telegram Boundary Principle

The rest of the application should not depend heavily on the raw Telegram update object.

Bad architecture:

```text id="p9jj2h"
PrayerService
     ↓
TelegramUpdate
     ↓
message.from.id
message.chat.id
message.text
```

Better:

```text id="l9k0ar"
Telegram Adapter
      ↓
SubmitPrayerRequestCommand
      ↓
Prayer Service
```

For example:

```ts id="qwt8d2"
interface SubmitPrayerRequestCommand {
  text: string;
}
```

The prayer module should not need to know what Telegram's `Update` object looks like.

This greatly improves privacy and testability.

---

# 7. Telegram Webhook

For production, use a Telegram HTTPS webhook.

Conceptually:

```text id="y0v4g2"
Telegram
   │
   │ HTTPS POST
   ▼
POST /webhooks/telegram/<secret-path>
   │
   ▼
Webhook Verification
   │
   ▼
Telegram Adapter
```

Telegram's Bot API provides a `secret_token` option for webhooks and sends the corresponding `X-Telegram-Bot-Api-Secret-Token` header with each webhook request. We should verify this before processing the update.

The webhook endpoint should also be HTTPS.

---

# 8. Webhook Processing Rule

The webhook endpoint should do as little work as possible.

Conceptually:

```text id="2e8s0n"
Receive webhook
      ↓
Verify Telegram secret
      ↓
Validate update structure
      ↓
Pass normalized event to application
      ↓
Return successful HTTP response
```

We should not make the webhook controller responsible for:

```text id="ll6j1g"
database encryption
prayer business logic
weekly dispatch
large amounts of formatting
```

Those belong elsewhere.

---

# 9. Component 2 — Conversation / Session Manager

Telegram interactions require temporary conversational state.

Examples:

```text id="sd0h3p"
LANGUAGE_SELECTION
PRIVACY_NOTICE
WAITING_FOR_PRAYER
REVIEWING_REQUEST
```

The Session Manager handles this.

---

# 10. Important Privacy Decision — Sessions

The system should distinguish between:

```text id="1x2r0r"
Temporary conversation state
```

and:

```text id="0dm5fu"
Permanent prayer request
```

They must never become the same thing.

A session may temporarily contain something like:

```text
language = "am"
state = "waiting_for_prayer"
```

but it must not contain:

```text
telegramUserId → requestId
```

for permanent storage.

---

# 11. MVP Session Strategy

For the MVP, session information should be **temporary and short-lived**.

A conceptual session may look like:

```ts id="uv2p3n"
interface UserSession {
  state:
    | "LANGUAGE_SELECTION"
    | "PRIVACY_NOTICE"
    | "MAIN_MENU"
    | "WAITING_FOR_PRAYER"
    | "REVIEWING_REQUEST";

  language: "am" | "en";

  draft?: string;

  expiresAt: Date;
}
```

However, this does not mean the above object should automatically become a permanent database record.

The architecture should minimize session persistence.

---

# 12. Language State

Language needs special attention.

The bot must initially start in Amharic.

After selection:

```text id="z1ea8c"
Amharic → interface in Amharic
English → interface in English
```

For the MVP, language state should preferably remain **temporary/session state**.

A future persistent language preference can be considered separately.

This prevents a permanent:

```text id="x5m3ts"
Telegram identity
      ↓
language preference
      ↓
prayer request
```

relationship from emerging accidentally.

---

# 13. Component 3 — Prayer Request Module

This is the central business module.

Its responsibility is:

```text id="04y7px"
Accept request
      ↓
Validate request
      ↓
Generate anonymous ID
      ↓
Encrypt content
      ↓
Store request
```

It should not know how Telegram messages are delivered.

---

# 14. Prayer Request Domain Model

Conceptually:

```ts id="i2yix6"
interface PrayerRequest {
  requestId: string;

  encryptedContent: string;

  iv: string;

  authTag: string;

  createdAt: Date;

  status: "pending" | "published";

  expiresAt: Date;

  dispatchId?: string;
}
```

Potential implementation details may differ after the database-design stage.

The crucial privacy property is:

```text id="vmtm3v"
NO telegramUserId
NO telegramChatId
NO username
NO name
```

---

# 15. Why `dispatchId` Is Different

A dispatch identifier does not identify the student.

It identifies a technical publishing operation.

For example:

```text id="tqwvlz"
DISPATCH-2026-W40
```

This helps us track:

```text id="x47xzv"
Which weekly job published this request?
```

without tracking:

```text
Who submitted it?
```

---

# 16. Request Status

We need a simple state machine.

```text id="k1z49g"
PENDING
   │
   │ successful weekly publication
   ▼
PUBLISHED
   │
   │ expiration
   ▼
DELETED
```

An implementation may use additional internal states for reliability, but they should remain technical and not encode identity.

---

# 17. Immutable Prayer Requests

After successful submission, the prayer request should be treated as immutable in the MVP.

```text id="4f7zhl"
Submitted request
       ↓
Stored request
       ↓
Published request
```

No editing after final submission.

This reduces complexity and protects integrity.

---

# 18. Component 4 — Encryption Service

Encryption should be isolated behind a service interface.

The Prayer Request module should not contain cryptographic implementation details everywhere.

Conceptually:

```ts id="v0g17l"
interface EncryptionService {
  encrypt(plaintext: string): EncryptedValue;
  decrypt(value: EncryptedValue): string;
}
```

The implementation can use authenticated encryption such as AES-256-GCM.

---

# 19. Encryption Boundary

```text id="ug4p6n"
Prayer text
    │
    ▼
Encryption Service
    │
    ▼
Ciphertext
    │
    ▼
MongoDB
```

For reading:

```text id="76kpjx"
MongoDB
   │
   ▼
Ciphertext
   │
   ▼
Encryption Service
   │
   ▼
Plaintext in memory
```

Plaintext should exist only for as long as necessary.

---

# 20. Encryption Key

The key belongs outside MongoDB.

Conceptually:

```text id="n3f23j"
Deployment Secret Store
        │
        ▼
Backend Process
        │
        ▼
Encryption Service
```

Never:

```text id="mjs7bc"
MongoDB
 └── encryptionKey
```

Never:

```text
GitHub
 └── encryptionKey
```

Never:

```text
Frontend
 └── encryptionKey
```

---

# 21. Component 5 — Localization Module

All bot interface content should pass through a localization layer.

Architecture:

```text id="f5xx0n"
Application
    │
    │ key + language
    ▼
Localization Service
    │
    ├── am
    └── en
```

For example:

```ts id="8c2wlt"
t("welcome.title", "am");
t("privacy.warning", "en");
t("submission.success", "am");
```

The rest of the application should not contain dozens of hard-coded translated strings.

---

# 22. Suggested Localization Structure

```text id="p8k0cl"
backend/
└── src/
    └── modules/
        └── localization/
            ├── locales/
            │   ├── am/
            │   │   └── messages.ts
            │   └── en/
            │       └── messages.ts
            │
            ├── localization.service.ts
            └── localization.types.ts
```

The translation keys should be stable.

Example:

```ts id="f2h6dt"
{
  "welcome.title": "...",
  "language.choose": "...",
  "privacy.title": "...",
  "privacy.warning": "...",
  "prayer.enter": "...",
  "prayer.success": "...",
  "common.cancel": "..."
}
```

---

# 23. Component 6 — Weekly Dispatch Module

This is the most important operational component after prayer submission.

Its responsibility is:

```text id="g6w5u6"
Start weekly job
      ↓
Find eligible requests
      ↓
If zero → stop
      ↓
If > 0
      ↓
Randomize order
      ↓
Decrypt only as needed
      ↓
Build anonymous digest
      ↓
Split if necessary
      ↓
Send new messages to Pray Team
      ↓
Update publication state
```

---

# 24. Weekly Scheduler

The scheduler triggers the dispatch use case.

Conceptually:

```text id="jkvfov"
                 Scheduler
                    │
                    │ weekly
                    ▼
           WeeklyDispatchService
```

The schedule should be configurable:

```env
WEEKLY_DISPATCH_DAY=...
WEEKLY_DISPATCH_TIME=...
TIMEZONE=Africa/Addis_Ababa
```

The final configuration format will be determined during implementation.

---

# 25. Scheduler Must Not Contain Business Logic

Bad:

```text id="x3o6fb"
cron callback
   ├── query database
   ├── decrypt
   ├── generate digest
   ├── send Telegram
   ├── update database
   └── delete requests
```

Better:

```text id="pzn2tc"
Cron/Scheduler
      ↓
WeeklyDispatchService
      ↓
Application logic
```

The scheduler should merely trigger the use case.

This allows the dispatch process to be tested without waiting for an actual weekly schedule.

---

# 26. Empty-Week Architecture

The first operation of the dispatch use case must determine whether there is anything to publish.

```text id="zo6j3c"
WeeklyDispatchService
        │
        ▼
Find eligible requests
        │
        ▼
Count = 0?
     /      \
   YES       NO
   │          │
   ▼          ▼
Return      Continue
NO_SEND
```

When zero requests exist:

```text id="2x1lyo"
Telegram group:
NO MESSAGE

System log:
weekly_dispatch_skipped_no_requests
```

This behavior is a hard requirement.

---

# 27. What Is an Eligible Request?

A request should normally satisfy conditions equivalent to:

```text id="c0mrrn"
status = PENDING
AND
expiresAt > currentTime
```

The exact MongoDB query will be defined in Step 5.

Expired requests must never enter the weekly publication pipeline.

---

# 28. Anonymous Digest Construction

The digest generator receives only the information necessary to create the publication.

Conceptually:

```text id="t7p2n9"
Eligible requests
      ↓
Request content
      +
Anonymous request IDs
      ↓
Digest Builder
      ↓
Telegram-safe messages
```

The digest builder must not receive:

```text id="o9pvw0"
telegramUserId
username
firstName
chatId
```

---

# 29. Random Publication Order

Before building the digest:

```text id="10glfh"
Request A
Request B
Request C
Request D
```

may become:

```text id="tzbaw7"
Request C
Request A
Request D
Request B
```

This prevents publication order from unnecessarily revealing submission order.

The randomization should use a secure/random method appropriate to the purpose.

---

# 30. Telegram Message Construction

The weekly message must be newly constructed.

```text id="zv6wth"
Database request
       ↓
Digest Builder
       ↓
NEW Telegram message
       ↓
sendMessage()
```

We should not forward the original user's message.

Telegram's Bot API provides a dedicated `sendMessage` operation, and its current text limit is 1–4096 characters after entity parsing.

---

# 31. Message Formatting Strategy

For the MVP, the safest option is to keep user prayer content as close to plain text as possible.

The application should not trust user-provided markup.

Avoid allowing a user's prayer text to directly control:

```text
HTML
Markdown
mentions
commands
rich entities
```

The digest builder should explicitly control any formatting that the bot adds.

---

# 32. Digest Size Handling

Because Telegram text messages are limited to 4096 characters, the architecture needs a message-splitting step.

```text id="o2rbnn"
Requests
   ↓
Digest Builder
   ↓
Size Check
   │
   ├── Fits → one message
   │
   └── Too large → multiple messages
```

Example:

```text id="1f1pln"
Weekly Anonymous Prayer Requests
Part 1/3

...

Weekly Anonymous Prayer Requests
Part 2/3

...

Weekly Anonymous Prayer Requests
Part 3/3
```

A single prayer request should not be truncated merely to make the digest fit.

---

# 33. Component 7 — Persistence Layer

The application should not allow every module to directly manipulate Mongoose models.

Prefer:

```text id="jgb9wo"
Application
   ↓
Repository Interface
   ↓
MongoDB/Mongoose implementation
```

For example:

```ts id="1fs8qg"
interface PrayerRequestRepository {
  create(request: PrayerRequest): Promise<void>;

  findEligibleForDispatch(now: Date): Promise<PrayerRequest[]>;

  markPublished(requestIds: string[], dispatchId: string): Promise<void>;

  deleteExpired(now: Date): Promise<number>;
}
```

This keeps business logic independent from MongoDB implementation details.

---

# 34. Database

MongoDB is appropriate for the MVP because:

- the project already uses MongoDB
- prayer requests have a relatively simple structure
- Mongoose works naturally with TypeScript
- TTL-based/expiration strategies can complement application-level cleanup
- it is easy to deploy

However, database convenience must never override the privacy model.

---

# 35. Proposed Database Collections

The MVP should keep the data model small.

Possible collections:

```text id="k66d9n"
prayer_requests
dispatch_records
```

Possibly:

```text id="3pe6ik"
system_events
```

if needed.

Avoid creating collections such as:

```text id="n1ct3y"
users
profiles
telegram_users
students
```

unless a future requirement genuinely requires them.

---

# 36. Prayer Requests Collection

Conceptually:

```text id="gqwc0d"
prayer_requests
├── _id
├── requestId
├── encryptedContent
├── iv
├── authTag
├── status
├── createdAt
├── expiresAt
└── dispatchId
```

No Telegram identity fields.

---

# 37. Dispatch Records

A dispatch record is technical, not a student profile.

Conceptually:

```text id="bz4je7"
dispatch_records
├── _id
├── dispatchId
├── scheduledAt
├── startedAt
├── completedAt
├── status
├── requestCount
└── telegramMessageIds
```

Even this should be reviewed carefully before storing message IDs unnecessarily.

Do not store sensitive request content in the dispatch record.

---

# 38. Important Privacy Consideration: Telegram Message IDs

The weekly bot messages have Telegram message IDs.

They may be useful for operational purposes such as later deletion.

But they should not be used to create unnecessary links back to submitters.

If message IDs are stored, they should be associated only with the weekly dispatch, not with Telegram users.

---

# 39. Data Flow — Submission

The complete submission flow becomes:

```text id="evk0j4"
Student
  │
  │ private message
  ▼
Telegram
  │
  │ webhook update
  ▼
Telegram Adapter
  │
  │ normalized command
  ▼
Conversation Manager
  │
  │ request text
  ▼
Prayer Request Service
  │
  ├── validate
  ├── generate anonymous ID
  ├── encrypt
  │
  ▼
Prayer Request Repository
  │
  ▼
MongoDB
```

Meanwhile:

```text id="j1qa4k"
Telegram identity information
          │
          ▼
Used only while processing
          │
          ▼
NOT stored in PrayerRequest
```

---

# 40. Data Flow — Confirmation

After secure storage:

```text id="4omwq1"
Prayer Request Service
       ↓
Submission Successful
       ↓
Telegram Adapter
       ↓
sendMessage()
       ↓
Student
```

The Telegram `chat_id` needed to answer the student is used as part of this immediate interaction but is not stored as part of the prayer request.

---

# 41. Data Flow — Weekly Dispatch

```text id="j1bcs8"
Scheduler
    │
    ▼
WeeklyDispatchService
    │
    ▼
Repository
    │
    ▼
Eligible requests
    │
    ▼
Decrypt
    │
    ▼
Randomize
    │
    ▼
Digest Builder
    │
    ▼
Message Splitter
    │
    ▼
Telegram Adapter
    │
    ▼
Pray Team Group
```

---

# 42. Data Flow — Empty Week

```text id="x4c9p6"
Scheduler
    │
    ▼
WeeklyDispatchService
    │
    ▼
Find eligible requests
    │
    ▼
0 requests
    │
    ▼
NO Telegram API send
    │
    ▼
technical event
    │
    ▼
END
```

This must be tested explicitly.

---

# 43. Pray Team Group Configuration

The target group is an operational configuration value.

Conceptually:

```env
PRAY_TEAM_CHAT_ID=...
```

This identifier does not identify a student.

The bot uses it only to determine where weekly anonymous requests should be published.

The bot should verify that it is publishing to the configured group rather than allowing arbitrary user input to determine the destination.

---

# 44. Group Permissions

The bot should have only the permissions it actually needs.

For the MVP, the bot primarily needs to:

```text id="7r72ct"
Send messages
```

Additional group permissions should not be granted unless a later requirement needs them.

This follows the least-privilege principle.

---

# 45. Configuration Layer

Configuration should be centralized.

Possible environment variables:

```env id="mwgw4l"
NODE_ENV=production

PORT=3000

MONGODB_URI=...

TELEGRAM_BOT_TOKEN=...

TELEGRAM_WEBHOOK_SECRET=...

TELEGRAM_WEBHOOK_PATH_SECRET=...

PRAY_TEAM_CHAT_ID=...

ENCRYPTION_KEY=...

WEEKLY_DISPATCH_DAY=...

WEEKLY_DISPATCH_TIME=...

TIMEZONE=Africa/Addis_Ababa
```

The exact variable names can change during implementation.

Secrets must never be committed to Git.

---

# 46. Logging Architecture

Logging should be centralized.

Conceptually:

```text id="mfjkj7"
Application
    ↓
Logger
    ↓
Structured technical events
```

Allowed:

```text id="dfp0d1"
weekly_dispatch_started
weekly_dispatch_completed
weekly_dispatch_skipped_no_requests
```

Not allowed:

```text id="as8i5u"
telegramUserId=...
username=...
prayerText=...
rawUpdate=...
```

---

# 47. Error Handling

Errors should pass through a central error-handling strategy.

```text id="9qjkfh"
Telegram Adapter
      ↓
Use Case
      ↓
Service
      ↓
Repository
      ↓
Error
      ↓
Central Error Handler
```

The central handler must ensure sensitive request content is not automatically included in logs or external error reports.

---

# 48. Security Middleware

The HTTP layer should include appropriate security controls such as:

```text id="7tcqx6"
HTTPS
Webhook secret verification
Request validation
Rate limiting
Body-size limits
Security headers
Controlled CORS where applicable
```

The exact middleware choices will be determined during implementation.

---

# 49. Validation Layer

Validation should occur before sensitive content reaches the deeper business layers.

Conceptually:

```text id="t68s9f"
Incoming Telegram text
        ↓
Schema validation
        ↓
Length validation
        ↓
Application rules
        ↓
Prayer Request Service
```

Validation must not log invalid sensitive text.

---

# 50. Security Boundary Between Telegram and Application

Telegram is an external dependency.

Therefore:

```text id="t7sy7m"
             UNTRUSTED EXTERNAL INPUT
                       │
                       ▼
                  Telegram
                       │
                       ▼
              Webhook Boundary
                       │
                Verify + Validate
                       │
                       ▼
                 Application
```

Never assume that external input is safe merely because it came from Telegram.

---

# 51. Security Boundary Around MongoDB

MongoDB must not be publicly exposed unnecessarily.

Architecture:

```text id="g4lqvw"
Internet
   │
   X
   │
   └──── NO DIRECT DATABASE ACCESS
                │
                ▼
            Backend
                │
                ▼
             MongoDB
```

The database should be reachable only by the backend or trusted infrastructure.

---

# 52. Encryption and Database Relationship

The data should look conceptually like:

```text id="5vf4p0"
                BACKEND
                   │
                   │ plaintext
                   ▼
          ┌─────────────────┐
          │ Encryption      │
          │ Service         │
          └────────┬────────┘
                   │
                   │ ciphertext
                   ▼
              ┌─────────┐
              │ MongoDB │
              └─────────┘
```

Therefore someone looking directly at the prayer-request document should not see the prayer text.

---

# 53. Future Admin Console Boundary

Although the admin console is not part of the MVP, the architecture should leave room for it.

Current:

```text id="qayb1p"
Telegram
   │
   ▼
Backend
   │
   └──► Pray Team Telegram Group
```

Future:

```text id="opxgkl"
                         ┌──► Telegram Group
Telegram ─► Backend ─────┤
                         └──► Admin Console
```

The admin console should access application services rather than directly accessing MongoDB.

---

# 54. Recommended Backend Module Structure

I recommend beginning with:

```text id="n0ss4r"
backend/
└── src/
    ├── app.ts
    ├── server.ts
    │
    ├── config/
    │   ├── env.ts
    │   └── config.types.ts
    │
    ├── modules/
    │   │
    │   ├── telegram/
    │   │   ├── telegram.controller.ts
    │   │   ├── telegram.adapter.ts
    │   │   ├── telegram.service.ts
    │   │   └── telegram.types.ts
    │   │
    │   ├── conversation/
    │   │   ├── conversation.service.ts
    │   │   ├── session.store.ts
    │   │   └── conversation.types.ts
    │   │
    │   ├── prayer-requests/
    │   │   ├── prayer-request.service.ts
    │   │   ├── prayer-request.repository.ts
    │   │   ├── prayer-request.model.ts
    │   │   ├── prayer-request.types.ts
    │   │   └── prayer-request.validation.ts
    │   │
    │   ├── dispatch/
    │   │   ├── weekly-dispatch.service.ts
    │   │   ├── digest-builder.ts
    │   │   ├── message-splitter.ts
    │   │   ├── dispatch.repository.ts
    │   │   └── dispatch.types.ts
    │   │
    │   ├── localization/
    │   │   ├── localization.service.ts
    │   │   ├── localization.types.ts
    │   │   └── locales/
    │   │       ├── am/
    │   │       │   └── messages.ts
    │   │       └── en/
    │   │           └── messages.ts
    │   │
    │   └── security/
    │       ├── encryption.service.ts
    │       └── security.types.ts
    │
    ├── infrastructure/
    │   ├── database/
    │   │   ├── mongoose.ts
    │   │   └── repositories/
    │   │
    │   ├── telegram/
    │   │   └── telegram-client.ts
    │   │
    │   └── scheduler/
    │       └── scheduler.ts
    │
    ├── middleware/
    │   ├── webhook-auth.ts
    │   ├── error-handler.ts
    │   └── rate-limit.ts
    │
    ├── shared/
    │   ├── errors/
    │   ├── logger/
    │   ├── utils/
    │   └── types/
    │
    └── routes/
        └── webhook.routes.ts
```

This is deliberately more organized than putting everything into:

```text
bot.ts
```

---

# 55. Responsibility Rules

Each module should have one primary responsibility.

### Telegram

Understands Telegram.

### Conversation

Understands user conversation state.

### Prayer Requests

Understands prayer-request business rules.

### Localization

Understands language and translated interface content.

### Security

Understands encryption/security primitives.

### Dispatch

Understands weekly publishing.

### Infrastructure

Understands external technology implementations.

This separation will become extremely useful when we start coding.

---

# 56. Dependency Direction

The dependency direction should generally be:

```text id="m7xvkv"
Interface / Adapter
       ↓
Application Services
       ↓
Domain / Business Rules
       ↓
Repository Interfaces
       ↓
Infrastructure Implementations
```

We do not want:

```text id="c9z3uy"
Prayer Request Service
       ↓
Mongoose Model directly
       ↓
Telegram SDK directly
       ↓
Express Request directly
```

That creates tightly coupled code.

---

# 57. A More Concrete Architectural View

```text id="yh4pnr"
                         ┌─────────────────────┐
                         │      Telegram       │
                         └──────────┬──────────┘
                                    │
                                  HTTPS
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │ Telegram Controller │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │ Telegram Adapter    │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │ Conversation Layer  │
                         └──────────┬──────────┘
                                    │
                              application
                                commands
                                    │
                  ┌─────────────────┴─────────────────┐
                  │                                   │
                  ▼                                   ▼
       ┌─────────────────────┐          ┌─────────────────────┐
       │ Prayer Request      │          │ Localization        │
       │ Service             │          │ Service             │
       └──────────┬──────────┘          └─────────────────────┘
                  │
                  ▼
       ┌─────────────────────┐
       │ Encryption Service  │
       └──────────┬──────────┘
                  │
                  ▼
       ┌─────────────────────┐
       │ Prayer Repository   │
       └──────────┬──────────┘
                  │
                  ▼
             ┌─────────┐
             │ MongoDB │
             └─────────┘


      ┌─────────────────────┐
      │ Weekly Scheduler    │
      └──────────┬──────────┘
                 ▼
      ┌─────────────────────┐
      │ Weekly Dispatch     │
      │ Service             │
      └──────────┬──────────┘
                 │
                 ▼
      ┌─────────────────────┐
      │ Digest Builder      │
      └──────────┬──────────┘
                 │
                 ▼
      ┌─────────────────────┐
      │ Message Splitter    │
      └──────────┬──────────┘
                 │
                 ▼
      ┌─────────────────────┐
      │ Telegram Adapter    │
      └──────────┬──────────┘
                 │
                 ▼
        Pray Team Group
```

---

# 58. End-to-End Privacy Boundary

The complete privacy path is:

```text id="piqgr5"
               TELEGRAM
                  │
                  │ sender metadata exists
                  ▼
          Telegram Adapter
                  │
                  │ extract only what is required
                  ▼
          Application Layer
                  │
                  │ prayer text only
                  ▼
          Prayer Request Service
                  │
                  ▼
            Encryption
                  │
                  ▼
              MongoDB
```

The user identity should terminate conceptually at the Telegram/application boundary rather than becoming part of the prayer domain.

---

# 59. Weekly Dispatch Privacy Boundary

The weekly dispatch should operate like:

```text id="2cdy7x"
MongoDB
   │
   │ encrypted request
   ▼
Prayer Repository
   │
   ▼
Decrypt in memory
   │
   ▼
Digest Builder
   │
   ├── request ID
   └── prayer content
   │
   ▼
NEW Telegram message
   │
   ▼
Pray Team Group
```

The digest builder does not need Telegram identity.

---

# 60. Important Design Decision: No Direct Database-to-Telegram Shortcut

Never create:

```text id="jse1et"
MongoDB
    ↓
send directly to Telegram
```

Instead:

```text id="fb8lkk"
MongoDB
    ↓
Application Service
    ↓
Digest Builder
    ↓
Telegram Adapter
```

The application remains the authority over what information is allowed to leave the database.

---

# 61. Important Design Decision: No Telegram SDK in Business Logic

Do not let the prayer business service directly call:

```ts id="k5c2yn"
telegram.sendMessage(...)
```

Instead:

```ts id="oe8zef"
WeeklyDispatchService
       ↓
TelegramPort
       ↓
Telegram Adapter
       ↓
Telegram API
```

Conceptually:

```ts id="wx9n2m"
interface TelegramMessenger {
  sendText(chatId: string, text: string): Promise<TelegramMessageResult>;
}
```

This makes the dispatch service easy to test.

---

# 62. Testing Architecture

Because the project is privacy-sensitive, the architecture must support automated testing.

We should eventually have:

```text id="qir5dx"
Unit Tests
   ↓
Service Tests
   ↓
Integration Tests
   ↓
Security Tests
   ↓
End-to-End Tests
```

Important test examples:

```text id="1yojb2"
A request never receives a Telegram ID field
Raw update is not persisted
Empty week sends no group message
Original message is never forwarded
Requests are encrypted
Expired requests are excluded
Duplicate dispatch is prevented
Amharic flow works
English flow works
Language switching works
Large digest is split safely
```

---

# 63. Deployment Architecture

The simplest production deployment is:

```text id="0w3au1"
                    Internet
                       │
                       ▼
                ┌────────────┐
                │ Telegram   │
                └─────┬──────┘
                      │
                   HTTPS
                      │
                      ▼
             ┌──────────────────┐
             │ Node.js Backend  │
             │ TypeScript       │
             └───────┬──────────┘
                     │
              ┌──────┴───────┐
              ▼              ▼
        ┌──────────┐   ┌─────────────┐
        │ MongoDB  │   │ Secret      │
        │ Atlas    │   │ Environment │
        └──────────┘   └─────────────┘
```

The deployment provider is intentionally not fixed yet.

That decision belongs later, after we know the operational requirements and budget.

---

# 64. Production Network Principle

Only these components should be externally reachable:

```text id="k9lao4"
HTTPS application endpoint
```

MongoDB should not be a public application endpoint.

The scheduler should not create an unnecessary public endpoint either unless the chosen deployment architecture requires one.

---

# 65. Single-Instance MVP Scheduler

For the first deployment, a single backend instance with one scheduler process is sufficient.

However, the architecture should explicitly anticipate the future problem:

```text id="qzg9vz"
Server instance A
   +
Server instance B

Both run weekly scheduler
   ↓
Duplicate dispatch
```

Therefore the dispatch system must have an idempotency/locking strategy.

The exact mechanism will be designed in the next stage.

---

# 66. Future Scaling

If the project grows significantly, we could eventually separate:

```text id="kq9buw"
Telegram API service
Prayer service
Scheduler/worker
Admin API
Frontend
```

But this is intentionally future architecture.

The MVP should remain:

```text id="d0k7g1"
ONE BACKEND
ONE DATABASE
ONE TELEGRAM BOT
ONE WEEKLY WORKER
```

with strong internal boundaries.

---

# 67. Architecture Decisions Summary

| Decision               | MVP Choice                                 | Reason                             |
| ---------------------- | ------------------------------------------ | ---------------------------------- |
| Architecture style     | Modular monolith                           | Simple but maintainable            |
| Backend                | Node.js + TypeScript                       | Fits project skills                |
| API framework          | Express                                    | Familiar and sufficient            |
| Telegram communication | HTTPS webhook                              | Production-oriented                |
| Database               | MongoDB + Mongoose                         | Fits data model and project skills |
| Encryption             | Application-level authenticated encryption | Protect sensitive request content  |
| Language               | Amharic + English                          | Fellowship requirement             |
| Initial language       | Amharic                                    | Explicit product requirement       |
| Language state         | Temporary/session-first                    | Avoid identity linkage             |
| Weekly dispatch        | Scheduled backend job                      | Core MVP workflow                  |
| Group publication      | Bot-generated new messages                 | Prevent forwarding/source exposure |
| Empty week             | No Telegram message                        | Explicit requirement               |
| Digest order           | Randomized                                 | Reduce timing inference            |
| Admin console          | Future phase                               | Not needed for MVP                 |
| User accounts          | None                                       | Unnecessary data                   |
| AI processing          | None                                       | Avoid extra privacy boundary       |
| Media requests         | Not in MVP                                 | Reduce complexity/privacy surface  |

---

# 68. Final Architecture

The final MVP architecture can be summarized as:

```text id="3sy9h3"
                            ┌─────────────────────┐
                            │     STUDENT         │
                            └──────────┬──────────┘
                                       │
                                Private Chat
                                       │
                                       ▼
                            ┌─────────────────────┐
                            │ Telegram Bot API    │
                            └──────────┬──────────┘
                                       │
                                  HTTPS Webhook
                                       │
                                       ▼
                            ┌─────────────────────┐
                            │ Telegram Adapter    │
                            └──────────┬──────────┘
                                       │
                                       ▼
                            ┌─────────────────────┐
                            │ Conversation/       │
                            │ Session Manager     │
                            └──────────┬──────────┘
                                       │
                                       ▼
                            ┌─────────────────────┐
                            │ Prayer Request      │
                            │ Service             │
                            └───────┬─────┬───────┘
                                    │     │
                         ┌──────────┘     └──────────┐
                         ▼                           ▼
                ┌────────────────┐          ┌─────────────────┐
                │ Encryption     │          │ Localization    │
                │ Service        │          │ Service         │
                └────────┬───────┘          └─────────────────┘
                         │
                         ▼
                ┌────────────────┐
                │ Prayer Request │
                │ Repository     │
                └────────┬───────┘
                         │
                         ▼
                    ┌─────────┐
                    │ MongoDB │
                    └────┬────┘
                         │
                 during collection
                         │
                         ▼
                ┌─────────────────┐
                │ Weekly Scheduler│
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │ Weekly Dispatch │
                │ Service         │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │ Digest Builder  │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │ Message Splitter│
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │ Telegram Adapter│
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────────┐
                │ Pray Team Telegram  │
                │ Group               │
                └─────────────────────┘
```

---

# 69. Core Architectural Principle

The system should always follow this rule:

> **External Telegram identity belongs to the transport layer; anonymous prayer content belongs to the prayer domain; and the architecture must never create an unnecessary connection between the two.**

That principle should guide every implementation decision that follows.
