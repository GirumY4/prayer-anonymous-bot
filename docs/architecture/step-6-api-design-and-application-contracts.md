# Anonymous Prayer Request Bot

## Christian Students Fellowship — Pray Team

**Document:** Step 6 — API Design & Application Contracts
**Recommended path:** `docs/architecture/step-6-api-design-and-application-contracts.md`

---

# 1. Purpose

This document defines the interfaces and contracts through which the application's components communicate.

The goal is to establish:

- External Telegram API boundaries
- Internal application use cases
- Request/response contracts
- Domain types
- Repository contracts
- Telegram adapter contracts
- Localization contracts
- Encryption contracts
- Scheduler contracts
- Weekly dispatch state transitions
- Error contracts
- Idempotency rules
- Privacy boundaries

This document does not yet define the concrete implementation of each class or function.

---

# 2. Contract Philosophy

The application should distinguish three levels:

```text id="y4r4v0"
External API
     ↓
Application Contract
     ↓
Infrastructure Implementation
```

For example:

```text id="n5czqf"
Telegram webhook
      ↓
Telegram Adapter
      ↓
SubmitPrayerRequest command
      ↓
Prayer Request Service
```

The Prayer Request Service should not know that the original input came from Telegram.

---

# 3. API Layers

The MVP contains three contract layers:

```text id="lzss0g"
1. Telegram Transport API
2. Application Use-Case Contracts
3. Infrastructure Port Contracts
```

---

# 4. Layer 1 — Telegram Transport API

The primary inbound HTTP endpoint is:

```http
POST /webhooks/telegram
```

The production path should contain a sufficiently unpredictable secret component, or an equivalent webhook authentication mechanism, and the Telegram `secret_token` header should also be verified.

Telegram documents the `secret_token` mechanism for verifying webhook requests.

---

# 5. Production Webhook Shape

Conceptually:

```text
POST https://<domain>/<secret-webhook-path>
```

with:

```http
X-Telegram-Bot-Api-Secret-Token: <configured-secret>
Content-Type: application/json
```

The backend must reject requests when the expected secret is missing or incorrect.

The secret must never be logged.

---

# 6. Webhook Response Contract

The webhook endpoint should return a simple HTTP success response after accepting the update for application processing.

Example:

```http
200 OK
```

For malformed or unauthorized requests:

```http
401 Unauthorized
```

or:

```http
400 Bad Request
```

depending on the failure.

The webhook controller should not expose internal error details.

---

# 7. Telegram Update Handling

The transport layer may receive a complex Telegram `Update`.

Conceptually:

```ts
type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};
```

The exact Telegram SDK types should be used in the infrastructure/adapter layer.

The application domain must NOT receive the full Telegram object.

---

# 8. Normalization Boundary

The Telegram Adapter converts:

```text
Telegram Update
```

into a small application event/command.

Example:

```ts
type IncomingInteraction =
  | StartInteraction
  | LanguageSelectedInteraction
  | SubmitPrayerTextInteraction
  | MenuActionInteraction
  | CancelInteraction;
```

This is a critical privacy boundary.

---

# 9. `/start` Contract

The Telegram Adapter detects `/start` and invokes:

```ts
StartBotSession;
```

Conceptual input:

```ts
interface StartBotSessionInput {
  conversationId: TelegramConversationId;
}
```

The application should not pass the entire Telegram user object.

The `conversationId` is a transport/session identifier used only to continue the immediate conversation.

---

# 10. Language Selection Contract

When the student selects a language:

```ts
SetConversationLanguage;
```

Input:

```ts
interface SetConversationLanguageInput {
  conversationId: string;
  language: "am" | "en";
}
```

Output:

```ts
interface SetConversationLanguageResult {
  language: "am" | "en";
  nextState: ConversationState;
}
```

The language setting belongs to the conversation/session layer, not the prayer-request domain.

---

# 11. Privacy Notice Contract

The application needs a dedicated operation for showing the privacy notice.

Conceptually:

```ts
ShowPrivacyNotice;
```

Input:

```ts
interface ShowPrivacyNoticeInput {
  language: SupportedLanguage;
}
```

Output:

```ts
interface LocalizedMessage {
  text: string;
  language: SupportedLanguage;
}
```

---

# 12. Submit Prayer Request Contract

This is the core application use case.

```ts
SubmitPrayerRequest;
```

Input:

```ts
interface SubmitPrayerRequestInput {
  text: string;
}
```

Important:

This contract intentionally does not contain:

```text
telegramUserId
telegramChatId
username
firstName
lastName
phoneNumber
```

The prayer-request use case receives the prayer text, not a Telegram identity.

---

# 13. Submit Prayer Request Result

Conceptually:

```ts
interface SubmitPrayerRequestResult {
  requestId: string;
  acceptedAt: Date;
}
```

The application can return:

```text
PR-7F29A83C
```

to the presentation layer.

The `requestId` is safe to show to the user because it is opaque and contains no identity information.

---

# 14. Submission Processing Contract

The internal sequence should be:

```text
SubmitPrayerRequest
       ↓
Validate text
       ↓
Generate request ID
       ↓
Encrypt text
       ↓
Create domain object
       ↓
Repository.create()
       ↓
Return request ID
```

The Telegram Adapter is not responsible for encryption or persistence.

---

# 15. Prayer Request Validation Contract

Validation should have its own boundary.

```ts
interface PrayerRequestValidator {
  validate(text: string): ValidationResult;
}
```

Example result:

```ts
type ValidationResult =
  | {
      valid: true;
    }
  | {
      valid: false;
      reason: "EMPTY" | "TOO_LONG" | "UNSUPPORTED_CONTENT";
    };
```

The validation result contains no prayer text.

---

# 16. Review Contract

The bot needs a review stage before final submission.

Conceptually:

```ts
ReviewPrayerRequest;
```

Input:

```ts
interface ReviewPrayerRequestInput {
  draftText: string;
}
```

Result:

```ts
interface ReviewPrayerRequestResult {
  acceptedForReview: true;
}
```

The draft exists only in temporary conversation state.

It should not become a permanent prayer-request record until the student confirms submission.

---

# 17. Cancellation Contract

The user may cancel before final submission.

```ts
CancelConversation;
```

Input:

```ts
interface CancelConversationInput {
  conversationId: string;
}
```

Result:

```ts
interface CancelConversationResult {
  cancelled: true;
}
```

Any temporary draft should be discarded.

---

# 18. Main Menu Contract

After onboarding, the application should render a main menu according to the selected language.

Conceptually:

```ts
GetMainMenu;
```

Input:

```ts
interface GetMainMenuInput {
  language: SupportedLanguage;
}
```

Output:

```ts
interface MenuDefinition {
  language: SupportedLanguage;
  actions: MenuAction[];
}
```

---

# 19. Supported Languages

The domain type should be explicit:

```ts
type SupportedLanguage = "am" | "en";
```

Do not use arbitrary strings such as:

```ts
language: string;
```

This prevents unsupported languages from entering the application accidentally.

---

# 20. Localization Contract

The localization layer should provide:

```ts
interface LocalizationService {
  translate(key: TranslationKey, language: SupportedLanguage): string;
}
```

The application requests:

```text
submission.success
```

instead of directly writing:

```text
"Your prayer request has been received."
```

in business logic.

---

# 21. Translation Key Contract

Translation keys should be centralized.

Example:

```ts
type TranslationKey =
  | "welcome.title"
  | "language.choose"
  | "privacy.title"
  | "privacy.warning"
  | "prayer.instructions"
  | "prayer.review"
  | "prayer.success"
  | "prayer.cancelled"
  | "error.invalid_request"
  | "error.too_long"
  | "help.title"
  | "safety.warning";
```

The actual list will grow during implementation.

---

# 22. Encryption Contract

The application should communicate with encryption through an abstraction.

```ts
interface EncryptionService {
  encrypt(plaintext: string): EncryptedContent;
  decrypt(content: EncryptedContent): string;
}
```

The business logic should not contain calls such as:

```ts
crypto.createCipheriv(...)
```

throughout the application.

That implementation belongs behind the service.

---

# 23. Encrypted Content Contract

Conceptually:

```ts
interface EncryptedContent {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: number;
}
```

This maps directly to the Step 5 database design.

---

# 24. Encryption Failure

If encryption fails:

```text
SubmitPrayerRequest
       ↓
Encryption
       ↓
FAIL
       ↓
Do not store request
       ↓
Return safe error
```

The original prayer text must not be written to logs merely because encryption failed.

---

# 25. Prayer Request Repository Contract

The application should depend on an interface rather than directly on Mongoose.

```ts
interface PrayerRequestRepository {
  create(request: PrayerRequest): Promise<void>;

  findEligibleForDispatch(
    input: FindEligibleRequestsInput,
  ): Promise<PrayerRequest[]>;

  markPublished(input: MarkPublishedInput): Promise<void>;

  deleteExpired(now: Date): Promise<number>;
}
```

---

# 26. Find Eligible Requests Contract

Input:

```ts
interface FindEligibleRequestsInput {
  collectionEndAt: Date;
  now: Date;
}
```

Conceptual eligibility:

```text
status = pending
AND createdAt < collectionEndAt
AND expiresAt > now
```

This ensures that a request submitted after the weekly cutoff does not unexpectedly enter the current digest.

---

# 27. Mark Published Contract

Input:

```ts
interface MarkPublishedInput {
  requestIds: string[];
  dispatchId: string;
  publishedAt: Date;
}
```

The repository must ensure that only eligible/unpublished requests are marked successfully.

---

# 28. Expiration Contract

```ts
interface DeleteExpiredRequestsResult {
  deletedCount: number;
}
```

The cleanup process should be separate from weekly publication.

This allows the system to delete expired requests even if no weekly dispatch occurs.

---

# 29. Dispatch Repository Contract

```ts
interface DispatchRepository {
  createScheduled(dispatch: DispatchRecord): Promise<void>;

  getByWeekKey(weekKey: string): Promise<DispatchRecord | null>;

  markRunning(dispatchId: string): Promise<void>;

  markCompleted(dispatchId: string): Promise<void>;

  markSkippedNoRequests(dispatchId: string): Promise<void>;

  markFailed(dispatchId: string): Promise<void>;
}
```

The exact method set may change slightly when concurrency handling is implemented.

---

# 30. Dispatch Creation Rule

Only one dispatch record should exist for a given weekly collection period.

Conceptually:

```text
weekKey = 2026-W40
```

must correspond to exactly one logical dispatch.

A unique database constraint should enforce this.

This protects against two scheduler executions independently creating two weekly dispatches.

---

# 31. Weekly Dispatch Use Case

The central application operation is:

```ts
RunWeeklyDispatch;
```

Input:

```ts
interface RunWeeklyDispatchInput {
  weekKey: string;
  collectionStartAt: Date;
  collectionEndAt: Date;
  scheduledAt: Date;
}
```

Output:

```ts
type WeeklyDispatchResult =
  | {
      status: "skipped_no_requests";
      dispatchId: string;
    }
  | {
      status: "completed";
      dispatchId: string;
      publishedRequestCount: number;
    }
  | {
      status: "failed";
      dispatchId: string;
      reason: DispatchFailureReason;
    };
```

---

# 32. Weekly Dispatch Algorithm Contract

The application sequence is:

```text
RunWeeklyDispatch
        ↓
Create/get unique dispatch record
        ↓
Claim running state
        ↓
Find eligible requests
        ↓
If 0:
    mark skipped_no_requests
    send NOTHING
        ↓
If > 0:
    randomize order
    decrypt required content in memory
    build digest
    split digest if necessary
    publish
    mark requests published
    mark dispatch completed
```

---

# 33. Critical Empty-Week Contract

The following is an invariant:

```text
eligibleRequestCount === 0
        ↓
Telegram send operation count === 0
```

This should be tested explicitly.

The system must never call the Telegram group's `sendMessage` operation in this case.

---

# 34. Telegram Messenger Contract

The weekly dispatcher should not know the Telegram SDK.

Use an abstraction:

```ts
interface TelegramMessenger {
  sendText(
    destination: TelegramDestination,
    message: OutgoingMessage,
  ): Promise<SentMessage>;
}
```

For the MVP, the destination is the configured Pray Team group.

---

# 35. Telegram Destination Contract

```ts
interface TelegramDestination {
  type: "pray_team_group";
}
```

Rather than allowing the application to choose arbitrary chat IDs during normal request processing, the infrastructure should resolve the configured destination.

This prevents user-controlled values from becoming message destinations.

---

# 36. Outgoing Message Contract

```ts
interface OutgoingMessage {
  text: string;
}
```

Formatting options can be added later:

```ts
interface OutgoingMessage {
  text: string;
  parseMode?: "HTML" | "MarkdownV2";
}
```

However, the default MVP strategy should strongly prefer safe/plain text for user-generated prayer content.

---

# 37. Telegram Send Result

```ts
interface SentMessage {
  telegramMessageId: number;
}
```

This is returned only to the dispatch/application layer when operationally necessary.

It is not part of a prayer-request object.

---

# 38. Telegram Group Contract

The bot should publish only to the configured Pray Team destination.

Conceptually:

```env
PRAY_TEAM_CHAT_ID=...
```

The configuration layer resolves:

```ts
getPrayTeamDestination();
```

The weekly dispatch service does not accept a student-provided destination.

---

# 39. Digest Builder Contract

The digest builder should accept domain-level publication data.

```ts
interface DigestBuilder {
  build(requests: PublishablePrayerRequest[]): Digest;
}
```

It should not receive raw Telegram updates.

---

# 40. Publishable Prayer Request

Conceptually:

```ts
interface PublishablePrayerRequest {
  requestId: string;
  plaintext: string;
}
```

This object exists only temporarily in memory during digest creation.

It should never be persisted as a second plaintext record.

---

# 41. Digest Contract

```ts
interface Digest {
  messages: OutgoingMessage[];
}
```

The digest builder handles:

- heading
- request formatting
- separators
- request IDs
- safe text construction

---

# 42. Message Splitter Contract

Because Telegram's current `sendMessage` text limit is 1–4096 characters after entities parsing, the digest needs a dedicated splitting stage.

```ts
interface MessageSplitter {
  split(digest: Digest): OutgoingMessage[];
}
```

The splitter must:

- not truncate prayer text
- not split in the middle of a request where avoidable
- preserve request IDs
- preserve complete requests
- preserve order after randomization
- produce valid Telegram-sized messages

---

# 43. Digest Message Ordering

The digest builder should receive requests after randomization.

Example:

```text
Database order:
A B C D

Randomized:
C A D B

Digest:
C A D B
```

The database's physical/order retrieval sequence must not determine the public sequence.

---

# 44. Randomization Contract

```ts
interface RequestOrderRandomizer {
  randomize<T>(items: T[]): T[];
}
```

The implementation should not use:

```ts
items.sort(() => Math.random() - 0.5);
```

as a production-quality randomization strategy.

Use a properly defined randomized shuffle.

---

# 45. Weekly Dispatch Idempotency

The hardest API contract is the interaction:

```text
Database
      +
Telegram
```

There is no ordinary local database transaction that can guarantee:

```text
Telegram sends exactly once
AND
MongoDB updates exactly once
```

as one atomic operation.

Therefore the application must explicitly design around ambiguous external outcomes.

---

# 46. The Critical Failure Scenario

Example:

```text
1. Build digest
2. Call Telegram send
3. Telegram successfully receives message
4. Network connection fails before backend receives response
5. Backend believes operation failed
6. Scheduler retries
```

Result without protection:

```text
Same weekly request
       ↓
Telegram group message #1
       ↓
Telegram group message #2
```

This is unacceptable.

---

# 47. Dispatch State Machine

The dispatch record should follow an explicit state machine:

```text
SCHEDULED
    │
    ▼
RUNNING
    │
    ├───────────────┐
    │               │
    ▼               ▼
NO REQUESTS       REQUESTS
    │               │
    ▼               ▼
SKIPPED          PUBLISHING
                    │
              ┌─────┴─────┐
              │           │
              ▼           ▼
          SUCCESS       FAILURE
              │           │
              ▼           ▼
          COMPLETED     FAILED
```

The exact intermediate states may be expanded during implementation.

---

# 48. Recommended Publication Strategy

For the MVP, the weekly digest should be treated as **one logical publication operation**.

Conceptually:

```text
Dispatch D
    │
    ├── selected requests
    │
    ├── generated digest
    │
    └── Telegram publication
```

A successful publication should be associated with a unique dispatch ID.

The implementation should then reconcile the publication state before allowing a retry.

---

# 49. Important Limitation

Telegram's Bot API provides the result of a successful `sendMessage`, but an application can still lose that response due to network/infrastructure failure.

Therefore the architecture must not claim:

> "Exactly once delivery is mathematically guaranteed."

Instead, our goal is:

> **Make duplicate publication extremely difficult, detect ambiguous outcomes, and provide controlled recovery.**

---

# 50. Future-Safe Idempotency Design

Before implementation, we should evaluate options such as:

```text
Option A:
Single digest + dispatch lock + state reconciliation

Option B:
Persist outgoing publication intent
+
Telegram message ID when confirmed

Option C:
A smaller per-request publication state machine

Option D:
Telegram-provided/client-side deduplication mechanisms where applicable
```

Telegram's lower-level API has message `random_id` deduplication semantics, but the Bot API abstraction we are using should not be assumed to provide application-level exactly-once guarantees.

The MVP should choose the simplest reliable strategy after integration testing.

---

# 51. Dispatch Lock Contract

The scheduler must not allow two instances to execute the same weekly dispatch simultaneously.

Conceptually:

```ts
interface DispatchLock {
  acquire(dispatchId: string): Promise<boolean>;

  release(dispatchId: string): Promise<void>;
}
```

However, the preferred implementation may be a MongoDB atomic state transition rather than a separate distributed lock service.

---

# 52. Recommended MVP Concurrency Control

Because the MVP is a modular monolith, use the database as the coordination mechanism where practical.

For example:

```text
SCHEDULED
   ↓
atomic update
   ↓
RUNNING
```

Only one scheduler invocation should succeed in claiming the dispatch.

A second invocation should see:

```text
RUNNING
```

or:

```text
COMPLETED
```

and stop.

---

# 53. Scheduler Contract

The scheduler itself should be extremely small.

```ts
interface WeeklyScheduler {
  scheduleWeeklyDispatch(): void;
  scheduleExpirationCleanup(): void;
}
```

The scheduler triggers application use cases.

It should not contain:

```text
MongoDB queries
Telegram send logic
encryption
digest construction
```

---

# 54. Scheduler → Application Contract

Conceptually:

```text
Scheduler
   ↓
RunWeeklyDispatch(...)
```

and:

```text
Scheduler
   ↓
DeleteExpiredRequests(...)
```

This makes scheduler behavior easy to test.

---

# 55. Expiration Use Case

```ts
interface DeleteExpiredRequests {
  execute(now: Date): Promise<{
    deletedCount: number;
  }>;
}
```

The cleanup operation should not expose deleted prayer content.

---

# 56. Error Contract

The application should use typed errors rather than random strings.

Example:

```ts
type ApplicationErrorCode =
  | "INVALID_INPUT"
  | "REQUEST_TOO_LONG"
  | "ENCRYPTION_FAILED"
  | "DATABASE_ERROR"
  | "DISPATCH_ALREADY_RUNNING"
  | "DISPATCH_NOT_FOUND"
  | "TELEGRAM_SEND_FAILED"
  | "DIGEST_TOO_LARGE"
  | "INTERNAL_ERROR";
```

---

# 57. Public Error vs Internal Error

The user should receive a safe message such as:

```text
Something went wrong. Please try again.
```

The application log may contain:

```text
TELEGRAM_SEND_FAILED
```

but must not contain:

```text
prayerText = "..."
```

or Telegram identity data.

---

# 58. Error Response Contract

Telegram-facing application errors should resolve to:

```ts
interface UserFacingError {
  messageKey: TranslationKey;
}
```

Then:

```text
Error code
   ↓
Translation key
   ↓
Selected language
   ↓
User-facing message
```

Example:

```text
REQUEST_TOO_LONG
      ↓
error.too_long
      ↓
Amharic translation
```

---

# 59. Conversation Contract

Temporary conversation state can use:

```ts
type ConversationState =
  | "LANGUAGE_SELECTION"
  | "PRIVACY_NOTICE"
  | "MAIN_MENU"
  | "WAITING_FOR_PRAYER"
  | "REVIEWING_REQUEST";
```

The conversation manager exposes:

```ts
interface ConversationManager {
  get(conversationId: string): Promise<Conversation | null>;

  set(conversationId: string, conversation: Conversation): Promise<void>;

  clear(conversationId: string): Promise<void>;
}
```

For the MVP, an in-memory implementation is acceptable if the deployment remains single-instance.

---

# 60. Conversation Object

Conceptually:

```ts
interface Conversation {
  state: ConversationState;

  language: SupportedLanguage;

  draftText?: string;

  expiresAt: Date;
}
```

Important:

The conversation object must never become a prayer-request persistence object.

---

# 61. Privacy Boundary in Conversation Manager

The conversation manager may temporarily know:

```text
conversationId
language
draftText
state
```

but the prayer-request repository must not receive:

```text
conversationId
```

as a prayer-request field.

This prevents:

```text
conversation → request
```

from becoming a hidden identity relationship.

---

# 62. Configuration Contract

The application should load validated configuration once.

Conceptually:

```ts
interface AppConfig {
  telegram: {
    botToken: string;
    webhookSecret: string;
    prayTeamChatId: string;
  };

  database: {
    uri: string;
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
}
```

The real runtime configuration should be validated before the application starts.

---

# 63. Configuration Validation

The application must fail fast if required configuration is missing.

For example:

```text
Missing TELEGRAM_BOT_TOKEN
       ↓
Application startup failure
```

This is safer than allowing the bot to start partially configured.

Secrets should never be printed as part of the startup configuration dump.

---

# 64. API Contract: Student Submission

At the conceptual application level:

```text
SubmitPrayerRequest
```

Input:

```json
{
  "text": "Please pray for me..."
}
```

Output:

```json
{
  "requestId": "PR-7F29A83C"
}
```

There is deliberately no:

```json
{
  "telegramUserId": "..."
}
```

---

# 65. API Contract: Weekly Dispatch

Conceptual input:

```json
{
  "weekKey": "2026-W40",
  "collectionStartAt": "...",
  "collectionEndAt": "...",
  "scheduledAt": "..."
}
```

Possible output:

```json
{
  "status": "completed",
  "dispatchId": "DISPATCH-2026-W40",
  "publishedRequestCount": 12
}
```

or:

```json
{
  "status": "skipped_no_requests",
  "dispatchId": "DISPATCH-2026-W40"
}
```

---

# 66. API Contract: Empty Week

When:

```text
eligibleRequestCount = 0
```

the result must be:

```json
{
  "status": "skipped_no_requests"
}
```

and:

```text
TelegramMessenger.sendText()
```

must not be called.

This is both a business rule and a security/privacy test.

---

# 67. API Contract: Expiration Cleanup

Conceptually:

```text
DeleteExpiredRequests
```

Input:

```json
{
  "now": "..."
}
```

Output:

```json
{
  "deletedCount": 17
}
```

No deleted prayer text is returned.

---

# 68. API Contract: Localization

Conceptually:

```text
translate()
```

Input:

```json
{
  "key": "prayer.success",
  "language": "am"
}
```

Output:

```text
localized string
```

This ensures that user-facing language remains independent from application logic.

---

# 69. API Contract: Telegram Adapter

The adapter maps Telegram actions to application actions:

```text
Telegram
   │
   ├── /start
   │      ↓
   │   StartBotSession
   │
   ├── Language button
   │      ↓
   │   SetConversationLanguage
   │
   ├── Prayer text
   │      ↓
   │   Review/SubmitPrayerRequest
   │
   └── Cancel
          ↓
       CancelConversation
```

---

# 70. API Contract: Telegram Outbound

The application can request:

```ts
telegramMessenger.sendText({
  destination: { type: "pray_team_group" },
  message: {
    text: "...",
  },
});
```

The adapter translates this into Telegram's Bot API request.

For ordinary outbound text, the underlying Telegram operation is `sendMessage`.

---

# 71. No Telegram API Calls From Domain Services

The following should NOT happen:

```ts
PrayerRequestService
      ↓
Telegram API
```

or:

```ts
PrayerRequestService
      ↓
Mongoose
```

Instead:

```text
PrayerRequestService
      ↓
Repository interface
      ↓
Mongoose implementation
```

and:

```text
WeeklyDispatchService
      ↓
TelegramMessenger interface
      ↓
Telegram implementation
```

---

# 72. Command/Event Naming

Use explicit application use-case names.

Recommended:

```text
StartBotSession
SetConversationLanguage
AcceptPrivacyNotice
ShowMainMenu
StartPrayerSubmission
ReviewPrayerRequest
SubmitPrayerRequest
CancelConversation
ChangeLanguage
RunWeeklyDispatch
DeleteExpiredRequests
```

This makes the application readable as a collection of business actions.

---

# 73. Interface Naming

Use clear domain-oriented interfaces:

```text
PrayerRequestRepository
DispatchRepository
EncryptionService
LocalizationService
TelegramMessenger
DigestBuilder
MessageSplitter
ConversationManager
RequestValidator
RequestOrderRandomizer
```

Avoid vague interfaces such as:

```text
Helper
Manager
UtilService
CommonService
DataHandler
```

unless the responsibility genuinely requires it.

---

# 74. Privacy Contracts

The following contract restrictions are mandatory.

### `SubmitPrayerRequest`

MUST NOT accept Telegram identity.

### `PrayerRequestRepository`

MUST NOT store Telegram identity.

### `DigestBuilder`

MUST NOT accept Telegram identity.

### `TelegramMessenger`

MUST NOT receive a student identity when sending the weekly digest.

### `DispatchRepository`

MUST NOT store prayer text.

### `Logger`

MUST NOT receive prayer text under normal operation.

---

# 75. Data Flow Contract

Submission:

```text
Telegram Update
      ↓
Telegram Adapter
      ↓
ConversationManager
      ↓
SubmitPrayerRequest
      ↓
PrayerRequestValidator
      ↓
RequestIdGenerator
      ↓
EncryptionService
      ↓
PrayerRequestRepository
      ↓
MongoDB
```

Publication:

```text
Scheduler
      ↓
RunWeeklyDispatch
      ↓
DispatchRepository
      ↓
PrayerRequestRepository
      ↓
EncryptionService
      ↓
RequestOrderRandomizer
      ↓
DigestBuilder
      ↓
MessageSplitter
      ↓
TelegramMessenger
      ↓
Pray Team Group
```

---

# 76. Dependency Inversion

The application should depend on abstractions.

```text
Application
    ↓
Interfaces / Ports
    ↓
Infrastructure
```

Examples:

```text
PrayerRequestService
      ↓
PrayerRequestRepository

WeeklyDispatchService
      ↓
TelegramMessenger

PrayerRequestService
      ↓
EncryptionService
```

This makes unit testing possible without requiring Telegram or MongoDB.

---

# 77. Testing Contracts

Each contract should eventually have tests.

Examples:

```text
SubmitPrayerRequest
✓ accepts valid text
✓ rejects empty text
✓ rejects oversized text
✓ generates random request ID
✓ encrypts content
✓ stores only allowed fields
✓ does not accept Telegram identity
```

---

# 78. Weekly Dispatch Tests

```text
RunWeeklyDispatch
✓ creates one dispatch
✓ returns skipped_no_requests when empty
✓ sends nothing when empty
✓ selects only eligible requests
✓ ignores expired requests
✓ ignores published requests
✓ randomizes order
✓ builds digest
✓ splits oversized digest
✓ handles Telegram failure
✓ prevents duplicate scheduler execution
```

---

# 79. Privacy Contract Tests

These are particularly important.

Test that:

```text
PrayerRequest
   DOES NOT contain:
   telegramUserId
   telegramChatId
   username
   name
   phoneNumber
   conversationId
   rawTelegramUpdate
```

Also test that no alternate collection silently stores the same identity relationship.

---

# 80. Contract: No Empty Telegram Publication

This deserves a direct integration test:

```text
Given:
    zero eligible prayer requests

When:
    weekly dispatch executes

Then:
    dispatch.status = skipped_no_requests

And:
    TelegramMessenger.sendText() is never called
```

This test should remain permanently in the test suite.

---

# 81. Contract: Weekly Publication Is Anonymous

Another direct test:

```text
Given:
    request PR-7F29A83C

When:
    weekly digest is created

Then:
    digest contains:
        requestId
        prayer text

And does not contain:
        Telegram ID
        username
        name
        chat ID
        submission timestamp
        original message ID
```

---

# 82. Contract: Original Telegram Message Is Never Forwarded

The application should have no weekly dispatch operation conceptually equivalent to:

```text
forwardMessage(userMessage)
```

The publishing interface should only expose:

```text
sendText(...)
```

for the MVP digest.

This creates an architectural safeguard against accidentally forwarding user messages.

---

# 83. Contract: Language

Given:

```text
language = am
```

the application should return Amharic interface messages.

Given:

```text
language = en
```

the application should return English interface messages.

The prayer text itself must not automatically be translated.

---

# 84. Contract: Language Does Not Enter Prayer Domain

The following must NOT exist in the request submission contract:

```ts
interface SubmitPrayerRequestInput {
  text: string;
  language: "am" | "en"; // avoid
}
```

The language belongs to presentation/conversation state.

The prayer request itself is language-neutral.

---

# 85. Contract: Request Text Is Untrusted

The application must treat request text as untrusted input from the beginning to the end.

```text
Input
 ↓
Validation
 ↓
Encryption
 ↓
Storage
 ↓
Decryption
 ↓
Safe rendering
 ↓
Telegram
```

The digest builder must never assume that user text is safe markup.

---

# 86. Contract: Plaintext Lifetime

When decrypted for publication:

```text
encrypted request
       ↓
decrypt
       ↓
plaintext in memory
       ↓
digest construction
       ↓
send
       ↓
discard temporary plaintext
```

The architecture should avoid creating permanent intermediate plaintext files or database records.

---

# 87. Contract: Retention

The application must eventually invoke:

```text
DeleteExpiredRequests
```

independently of whether the request was successfully published.

Expired records must not be included in:

```text
findEligibleForDispatch()
```

---

# 88. Contract: Dispatch Cutoff

Every weekly dispatch has:

```text
collectionStartAt
collectionEndAt
```

The application must use these boundaries consistently.

This avoids ambiguous situations where requests submitted while a dispatch is being processed unexpectedly enter that same digest.

---

# 89. Contract: Dispatch Uniqueness

For a given:

```text
weekKey
```

there must be one logical dispatch.

Example:

```text
2026-W40
     ↓
DISPATCH-2026-W40
```

Another scheduler execution must reuse/check that dispatch rather than creating:

```text
DISPATCH-2026-W40-A
DISPATCH-2026-W40-B
```

---

# 90. Contract: Failed Dispatch

If Telegram publication fails:

```text
dispatch.status = failed
```

or an appropriate recoverable state.

Requests that were not successfully published must remain eligible for controlled recovery.

The implementation must distinguish:

```text
database failure
Telegram failure
message-construction failure
configuration failure
```

rather than treating everything as one generic failure.

---

# 91. Contract: Configuration Errors

If:

```text
PRAY_TEAM_CHAT_ID
```

is missing, the scheduler must refuse to publish.

If encryption configuration is missing, the bot must refuse to accept sensitive requests.

Failing safely is preferable to operating with weakened privacy or an unknown publication destination.

---

# 92. Contract: External Service Errors

Telegram is an external dependency.

Therefore:

```text
TelegramMessenger
```

should return typed operational errors.

Example:

```ts
type TelegramError =
  | "RATE_LIMITED"
  | "NETWORK_ERROR"
  | "BOT_FORBIDDEN"
  | "CHAT_NOT_FOUND"
  | "MESSAGE_REJECTED"
  | "UNKNOWN";
```

The application can then decide whether the dispatch should retry or fail.

---

# 93. Contract: No Sensitive Error Propagation

An exception must never automatically become:

```text
Telegram:
"Database decryption failed for request PR-7F29 because..."
```

Internal technical details stay internal.

The user receives only localized safe messages.

---

# 94. Overall Application Contract

The important relationships are:

```text
                  ┌─────────────────┐
                  │ Telegram        │
                  │ Adapter         │
                  └────────┬────────┘
                           │
                     Application
                       Commands
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
 Conversation       Prayer Request        Dispatch
 Service             Service               Service
        │                  │                  │
        │                  │                  │
        ▼                  ▼                  ▼
 Localization        Encryption          Digest Builder
                           │                  │
                           ▼                  ▼
                       Repository       Telegram Messenger
                           │                  │
                           ▼                  ▼
                        MongoDB          Telegram Group
```

---

# 95. Final Contract Principle

The most important boundary is:

```text
Telegram identity
      │
      │ transport layer
      ▼
Telegram Adapter
      │
      │ anonymous application command
      ▼
Prayer Request Domain
      │
      │ anonymous stored request
      ▼
MongoDB
```

And for publication:

```text
MongoDB
   ↓
Anonymous request
   ↓
Digest
   ↓
NEW Telegram message
   ↓
Pray Team Group
```

The architecture must never turn this into:

```text
Telegram identity
      ↓
User record
      ↓
Prayer request
      ↓
Telegram identity exposed
```

---

# 96. Step 6 Acceptance Criteria

Step 6 is considered complete when:

```text
✓ Telegram webhook boundary is defined
✓ Webhook authentication contract is defined
✓ Telegram data is normalized before entering the domain
✓ SubmitPrayerRequest contract contains no Telegram identity
✓ Conversation contract is separate from prayer-request contract
✓ Language contract is defined
✓ Encryption contract is defined
✓ Prayer repository contract is defined
✓ Dispatch repository contract is defined
✓ Weekly dispatch use case is defined
✓ Empty-week behavior is explicitly enforced
✓ Digest builder contract is defined
✓ Message splitter contract is defined
✓ Telegram messenger contract is defined
✓ Request publication state is defined
✓ Dispatch idempotency problem is explicitly recognized
✓ Scheduler contract is separate from dispatch logic
✓ Expiration cleanup contract is defined
✓ Error contract is defined
✓ Privacy invariants are testable
✓ No original-message forwarding exists in the MVP contract
```

---

# 97. Next Stage

The next stage is:

**Step 7 — Telegram Bot Design & Conversation State Machine**

That stage will turn the application contracts into the exact Telegram behavior:

```text
/start
   ↓
Amharic welcome
   ↓
Language selection
   ↓
Privacy notice
   ↓
Main menu
   ↓
Submit Prayer
   ↓
Instructions
   ↓
Waiting for text
   ↓
Review
   ↓
Submit / Edit / Cancel
   ↓
Confirmation
```

We will define the exact states, transitions, callback actions, commands, message keys, temporary session lifecycle, and failure behavior before implementing the bot.
