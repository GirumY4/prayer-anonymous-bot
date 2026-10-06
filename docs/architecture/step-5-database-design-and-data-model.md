# Anonymous Prayer Request Bot

## Christian Students Fellowship — Pray Team

**Document:** Step 5 — Database Design & Data Model
**Recommended path:** `docs/architecture/step-5-database-design-and-data-model.md`

---

# 1. Database Design Objective

The database must support the MVP while enforcing the privacy principles established in the previous steps.

The database must allow us to:

- Store anonymous prayer requests
- Protect sensitive prayer content
- Identify requests without identifying submitters
- Determine which requests are eligible for the weekly dispatch
- Track publication state
- Prevent unnecessary duplicate publication
- Expire and delete old requests
- Track technical weekly-dispatch operations
- Avoid storing unnecessary Telegram identity information

The database must NOT become a hidden user-tracking system.

---

# 2. Database Technology

Recommended:

```text
MongoDB
+
Mongoose
+
MongoDB Atlas
```

MongoDB is appropriate for the MVP because the request model is relatively simple and the development team already has MongoDB experience.

The database itself should not be publicly accessible from the Internet.

Architecture:

```text
Internet
   │
   X
   │
   └────── NO DIRECT DATABASE ACCESS
                     │
                     ▼
                Backend
                     │
                     ▼
                 MongoDB
```

---

# 3. Persistent Collections

The MVP should use two primary collections:

```text
MongoDB
│
├── prayer_requests
│
└── dispatch_records
```

There should NOT be a permanent:

```text
users
telegram_users
students
profiles
```

collection in the MVP.

---

# 4. Why There Is No User Collection

A conventional application might create:

```text
users
├── telegramUserId
├── username
├── firstName
└── language
```

and then:

```text
prayer_requests
├── userId
└── prayer
```

This would create exactly the identity relationship we are trying to prevent.

Instead:

```text
Telegram identity
        │
        │ temporary processing only
        ▼
Application
        │
        │ prayer text
        ▼
prayer_requests
```

There is no persistent database relationship:

```text
Telegram User → Prayer Request
```

---

# 5. Collection 1 — `prayer_requests`

This is the primary collection.

Each document represents one submitted prayer request.

Conceptual document:

```json
{
  "_id": "MongoDB ObjectId",

  "requestId": "PR-7F29A83C",

  "content": {
    "ciphertext": "...",
    "iv": "...",
    "authTag": "...",
    "keyVersion": 1
  },

  "status": "pending",

  "createdAt": "2026-10-03T10:30:00.000Z",

  "expiresAt": "2026-10-17T10:30:00.000Z",

  "dispatchId": null,

  "publishedAt": null
}
```

This is only an illustrative representation. The exact serialization of encrypted values will be decided during implementation.

---

# 6. Prayer Request Fields

## 6.1 `_id`

MongoDB's internal identifier.

Example:

```text
ObjectId("...")
```

This is an infrastructure identifier.

It must never be shown to students or used as the public prayer-request identifier.

---

## 6.2 `requestId`

Anonymous public identifier.

Example:

```text
PR-7F29A83C
```

Requirements:

- Cryptographically random
- Unique
- Does not contain a Telegram ID
- Does not contain a username
- Does not encode submission time
- Does not encode database position
- Does not encode user language
- Safe to display to the Pray Team

A sufficiently large random space should be used. Very short IDs such as `PR-1234` should be avoided because the collision and guessing risks grow quickly as the number of requests increases.

---

# 7. Request ID Generation

The request ID should be generated independently from Telegram information.

Correct:

```text
Cryptographically secure random generator
             ↓
PR-7F29A83C
```

Incorrect:

```text
Telegram ID
     ↓
PR-123456789
```

Incorrect:

```text
timestamp + Telegram ID
     ↓
PR-202610031030123456
```

The request ID must be opaque.

---

# 8. `content`

The prayer content must never be stored as plaintext.

Instead:

```text
content
├── ciphertext
├── iv
├── authTag
└── keyVersion
```

The exact property names can be adjusted during implementation.

---

# 9. `ciphertext`

This contains the encrypted prayer text.

Conceptually:

```text
"I am struggling with..."
       ↓
Encryption Service
       ↓
"m9H4Qx8..."
```

MongoDB should contain only the encrypted representation.

There should never be another plaintext copy of the prayer text in the same document.

---

# 10. `iv`

The initialization vector/nonce used by the encryption algorithm.

It must be stored with the encrypted content because it is required for decryption.

It is not itself considered a secret.

However, it must be generated correctly and according to the encryption algorithm's requirements.

---

# 11. `authTag`

The authentication tag produced by authenticated encryption such as AES-256-GCM.

It allows the application to detect ciphertext tampering.

Conceptually:

```text
Ciphertext
    +
Authentication Tag
    ↓
Authenticated Decryption
```

If the data has been modified, decryption should fail rather than returning silently corrupted plaintext.

---

# 12. `keyVersion`

The encryption key version.

Example:

```text
keyVersion: 1
```

This allows future key rotation.

For example:

```text
Key Version 1
     ↓
Requests encrypted in 2026

Key Version 2
     ↓
Requests encrypted after rotation
```

Without a key version, future key rotation becomes unnecessarily difficult.

The actual keys must live outside MongoDB.

---

# 13. `status`

The prayer request lifecycle requires a status.

Recommended initial values:

```text
pending
published
```

Conceptually:

```text
pending
   │
   │ successful weekly publication
   ▼
published
```

After deletion, no status is necessary because the entire document should cease to exist.

---

# 14. Why We Do Not Need `failed`

A failed weekly dispatch does not necessarily mean the prayer request itself failed.

For example:

```text
Prayer request
    ↓
Database storage succeeded
    ↓
Telegram publication failed
```

The request should remain:

```text
pending
```

and be eligible for a safe retry.

The failure belongs primarily to the dispatch operation.

Therefore, instead of:

```text
request.status = failed
```

we keep the request pending and record the technical failure in `dispatch_records`.

---

# 15. `createdAt`

The time the request was accepted by the application.

Example:

```text
createdAt:
2026-10-03T10:30:00.000Z
```

This field is necessary for retention, eligibility, and internal operations.

However:

> `createdAt` must never be shown in the weekly Pray Team message.

This reduces timing-based identity inference.

---

# 16. `expiresAt`

The time after which the request should no longer remain in the active database.

Example:

```text
expiresAt:
2026-10-17T10:30:00.000Z
```

This is used for:

- eligibility checks
- expiration
- cleanup
- retention enforcement

---

# 17. `dispatchId`

This identifies the technical weekly dispatch that published the request.

Example:

```text
dispatchId:
DISPATCH-2026-W40
```

This does NOT identify a student.

It answers:

> Which weekly publishing operation processed this request?

It must never contain:

- Telegram ID
- username
- name
- personal information

---

# 18. `publishedAt`

The time at which the request was successfully published to the Pray Team group.

This is an internal operational field.

It must not be displayed to the prayer team.

If future privacy policy requires deletion shortly after publication, the retention system can use this information to calculate deletion.

---

# 19. Fields That Must Never Exist in `prayer_requests`

The schema should explicitly prohibit or reject fields such as:

```text
telegramUserId
telegramChatId
telegramUsername
username
firstName
lastName
phoneNumber
email
studentId
department
year
profilePhoto
language
ipAddress
userId
sessionId
rawTelegramUpdate
originalMessageId
```

Especially dangerous fields are:

```text
userId
telegramUserId
telegramChatId
```

because developers may later use them as an indirect identity relationship.

---

# 20. Why `originalMessageId` Is Excluded

An original Telegram message ID could create an unnecessary link back to the user's Telegram interaction.

The application does not need it to perform the core prayer function.

Therefore:

```text
Original Telegram Message ID
          ↓
       DISCARD
```

The weekly digest must be constructed from the stored prayer request, not from the original Telegram message.

---

# 21. Language Is Not Stored With the Request

The student's interface language is:

```text
Amharic
or
English
```

but it should not become part of the permanent prayer-request record.

Why?

Because:

```text
Telegram identity
      ↓
language
      ↓
request
```

could create an unnecessary association.

The request itself also does not need a `language` field because the user may submit:

```text
English interface
+
Amharic prayer
```

or:

```text
Amharic interface
+
English prayer
```

The prayer should simply be preserved as submitted.

---

# 22. Temporary Conversation State

The MVP should not create a permanent MongoDB collection for conversational state.

Examples:

```text
LANGUAGE_SELECTION
WAITING_FOR_PRAYER
REVIEWING_REQUEST
```

These should preferably be held temporarily by the application.

Conceptually:

```text
Telegram user
     ↓
Temporary session state
     ↓
Conversation completed
     ↓
Session expires/disappears
```

For the single-instance MVP, an in-memory session store with a short TTL can be used.

A server restart may cause the user to restart the conversation, which is an acceptable MVP tradeoff for stronger data minimization.

A distributed session store can be considered later if the deployment requires multiple application instances.

---

# 23. Why Not Store Temporary Sessions in MongoDB?

A MongoDB session document could easily become:

```text
{
  telegramUserId: "...",
  state: "REVIEWING_REQUEST",
  draft: "very sensitive prayer text..."
}
```

That creates a second privacy problem:

```text
Permanent request
       +
Temporary draft
       +
Telegram identity
```

It also means deleted prayer requests may still have plaintext drafts in the session collection.

Avoiding persistent sessions greatly simplifies the privacy model.

---

# 24. Collection 2 — `dispatch_records`

The second collection tracks weekly dispatch operations.

Conceptual document:

```json
{
  "_id": "MongoDB ObjectId",

  "dispatchId": "DISPATCH-2026-W40",

  "weekKey": "2026-W40",

  "collectionStartAt": "2026-09-28T00:00:00.000Z",

  "collectionEndAt": "2026-10-03T18:00:00.000Z",

  "scheduledAt": "2026-10-03T18:00:00.000Z",

  "status": "completed",

  "eligibleRequestCount": 12,

  "startedAt": "2026-10-03T18:00:03.000Z",

  "completedAt": "2026-10-03T18:01:11.000Z"
}
```

---

# 25. `dispatchId`

Unique technical identifier for the dispatch.

Example:

```text
DISPATCH-2026-W40
```

It should not contain any user information.

---

# 26. `weekKey`

A logical identifier for the weekly collection cycle.

Example:

```text
2026-W40
```

The application should define exactly how the week boundaries are calculated, based on the fellowship's configured weekly dispatch schedule and timezone.

The week identifier is not a personal identifier.

---

# 27. Collection Period

The dispatch record should record the effective collection interval:

```text
collectionStartAt
collectionEndAt
```

This solves an important race condition.

Imagine:

```text
18:00
↓
Weekly dispatch begins

18:00:02
↓
A new student submits a request
```

That new request should normally belong to the next collection period, not the dispatch currently running.

Therefore eligibility should be determined using the dispatch's collection boundary rather than simply:

```text
status = pending
```

---

# 28. `scheduledAt`

The intended dispatch time.

This helps the system determine which weekly operation is being executed and helps diagnose scheduling problems.

---

# 29. `status`

Recommended values:

```text
scheduled
running
completed
skipped_no_requests
failed
```

Lifecycle:

```text
scheduled
    ↓
running
    │
    ├── no requests
    │       ↓
    │   skipped_no_requests
    │
    ├── success
    │       ↓
    │   completed
    │
    └── failure
            ↓
         failed
```

---

# 30. Empty-Week State

If the scheduler finds zero eligible requests:

```text
eligibleRequestCount = 0
status = skipped_no_requests
```

No Telegram message should be sent.

This gives us an auditable technical record without sending anything unnecessary to the group.

---

# 31. `eligibleRequestCount`

The number of eligible requests found when the dispatch began.

This is operational information.

However, the system should not publish this count to the Pray Team group by default.

For privacy purposes, even aggregate statistics should not be unnecessarily exposed publicly within the fellowship.

---

# 32. `startedAt`

Records when the dispatch process actually started.

---

# 33. `completedAt`

Records when the dispatch operation finished.

These fields are useful for operational troubleshooting.

They should not be included in user-facing weekly messages.

---

# 34. Telegram Message IDs in Dispatch Records

There is a legitimate future reason to store the IDs of the bot-generated weekly messages: automated deletion of old group posts.

However, for the basic MVP, we should not automatically introduce additional Telegram metadata unless there is a concrete requirement for it.

A future design may add something such as:

```text
telegramMessageIds: [...]
```

to the dispatch record.

If implemented, these IDs should belong only to the dispatch record and must never be used to establish a student-to-request relationship.

---

# 35. No Prayer Text in `dispatch_records`

The dispatch record must never contain:

```text
prayerText
plaintextContent
encryptedPrayerText
```

unless a future design has a very specific reason.

The dispatch collection should contain operational metadata only.

The prayer text belongs exclusively in `prayer_requests`.

---

# 36. Database Relationship

The only meaningful relationship should be:

```text
dispatch_records
       │
       │ dispatchId
       ▼
prayer_requests
```

Conceptually:

```text
DISPATCH-2026-W40
        │
        ├── PR-7F29A83C
        ├── PR-B8412E19
        └── PR-5D812C77
```

There should be NO:

```text
Telegram User
        │
        ▼
Prayer Request
```

relationship.

---

# 37. Recommended Indexes — `prayer_requests`

The database should have indexes supporting the actual access patterns.

### Unique request ID

```text
requestId
UNIQUE
```

This guarantees that two requests cannot receive the same anonymous identifier.

### Weekly eligibility query

The dispatch process needs efficient querying by:

```text
status
createdAt
expiresAt
```

A suitable compound index should be designed around the actual eligibility query.

### Expiration

`expiresAt` should be indexed for expiration processing.

MongoDB supports TTL indexes, but TTL deletion occurs asynchronously in the background rather than at an exact guaranteed instant. Therefore TTL should be treated as a cleanup safety mechanism, not as the sole exact-retention guarantee.

---

# 38. Recommended Indexes — `dispatch_records`

At minimum:

```text
dispatchId
UNIQUE
```

and:

```text
weekKey
UNIQUE
```

The unique `weekKey` is particularly useful because the scheduler should not create two independent weekly dispatch records for the same collection period.

---

# 39. Example `prayer_requests` Index Concept

Conceptually:

```text
prayer_requests
│
├── UNIQUE requestId
│
├── eligibility index
│     ├── status
│     ├── createdAt
│     └── expiresAt
│
└── TTL/safety cleanup index
      └── expiresAt
```

The exact index order should be validated against the actual MongoDB query once the repository is implemented.

---

# 40. Example `dispatch_records` Index Concept

```text
dispatch_records
│
├── UNIQUE dispatchId
│
└── UNIQUE weekKey
```

---

# 41. Data Lifecycle

A request follows:

```text
Student submits
      ↓
Validate
      ↓
Encrypt
      ↓
Create prayer_requests document
      ↓
status = pending
      ↓
Wait for weekly dispatch
      ↓
Published successfully
      ↓
status = published
      ↓
Expiration time reached
      ↓
Delete document
```

---

# 42. Database State During Weekly Dispatch

Suppose we have:

```text
PR-A → pending
PR-B → pending
PR-C → pending
PR-D → published
```

The weekly dispatcher should select only eligible pending requests:

```text
PR-A
PR-B
PR-C
```

It should not select:

```text
PR-D
```

again.

---

# 43. Eligibility Definition

An eligible request should approximately satisfy:

```text
status = pending
AND
createdAt < collectionEndAt
AND
expiresAt > currentTime
```

The actual query may use slightly different boundaries to avoid edge-case ambiguity.

The important requirement is that the request must belong to the current collection period and must not be expired.

---

# 44. New Requests During Dispatch

Suppose dispatch occurs at:

```text
18:00
```

A student submits at:

```text
18:00:03
```

That request must not unexpectedly appear in the digest that was already being built.

It should become part of the next weekly collection.

The architecture therefore needs a clearly defined collection cutoff.

---

# 45. Dispatch Idempotency

The database must support safe retry behavior.

The difficult case is:

```text
1. Bot sends weekly digest
2. Telegram successfully receives it
3. Network response is lost
4. Backend does not know whether send succeeded
5. Job retries
```

A normal database transaction cannot make an external Telegram API call exactly-once.

Therefore the architecture should aim for **idempotent dispatch with controlled reconciliation**, rather than pretending exactly-once delivery is possible.

This issue will be resolved in detail during the dispatch/API-design stage.

---

# 46. Recommended MVP Dispatch Strategy

For the weekly digest, we should treat a dispatch as one logical publication operation:

```text
Dispatch
   ↓
Eligible requests
   ↓
Construct digest
   ↓
Send digest
   ↓
Record successful publication
```

The system should create a unique dispatch record before attempting publication.

The exact claim/send/finalize sequence will be designed in the API and service-design stage.

---

# 47. Request Immutability

Once a prayer request becomes:

```text
status = pending
```

its encrypted content should not be edited by normal application operations.

After:

```text
status = published
```

it should also remain unchanged.

The MVP has no edit endpoint.

---

# 48. Why Immutability Helps Privacy

If old and new versions of prayer text were stored, we could accidentally create:

```text
version 1
version 2
version 3
```

copies of extremely sensitive information.

By storing only the final accepted request:

```text
one request
one encrypted content
```

we reduce unnecessary copies.

---

# 49. Deletion Strategy

When a request expires, the system should delete the entire document.

Deletion should remove:

```text
requestId
ciphertext
iv
authTag
timestamps
dispatch association
```

from the primary database.

There should not be a separate "deleted requests" collection containing the original content.

---

# 50. Should We Soft-Delete?

No for the MVP.

Avoid:

```text
deleted: true
```

while retaining the sensitive content.

That only hides the request instead of removing it.

When the retention period ends:

```text
DELETE DOCUMENT
```

is preferable.

Technical audit logs may record that deletion occurred without retaining the prayer content.

---

# 51. Deletion and Backups

Deleting the live MongoDB document does not necessarily mean every backup copy instantly disappears.

Therefore the retention policy must account for:

```text
Primary database
Database snapshots
Backups
Disaster-recovery copies
```

Backup lifecycle must be defined separately.

---

# 52. TTL Index vs Application Cleanup

Recommended approach:

```text
Application cleanup
       +
MongoDB TTL safety mechanism
```

The application cleanup process is responsible for the intended retention workflow.

The TTL index provides an additional safety net.

We should not depend solely on TTL for an exact deletion time because MongoDB TTL cleanup is performed asynchronously.

---

# 53. Encryption Key and Database Separation

Database:

```text
prayer_requests
└── ciphertext
```

Secret environment:

```text
ENCRYPTION_KEY
```

These must remain separate.

Conceptually:

```text
             Backend
            /       \
           /         \
          ▼           ▼
     MongoDB       Secret Store
       │                │
       │ ciphertext     │ encryption key
       ▼                ▼
   encrypted          secret
   request
```

---

# 54. Key Rotation

The `keyVersion` field makes future key rotation possible.

Example:

```text
Requests 1–100
keyVersion = 1

Key rotation

Requests 101+
keyVersion = 2
```

The application can decrypt an older request using its recorded key version.

Key rotation should be a later operational feature, not a reason to overcomplicate the MVP.

---

# 55. Database-Level Schema Validation

Mongoose schemas should be strict.

The application should not silently accept arbitrary extra fields.

For example, an incoming object containing:

```text
telegramUserId
```

should not accidentally become part of the stored document.

Use strict schema behavior and explicit object construction.

The safest pattern is:

```text
Incoming Telegram update
        ↓
Extract allowed fields
        ↓
Construct PrayerRequest object
        ↓
Validate schema
        ↓
Store
```

rather than:

```text
Incoming update
        ↓
Spread entire object into database document
```

---

# 56. Never Store Raw Telegram Objects

Never do something conceptually equivalent to:

```ts
{
  ...telegramUpdate,
  prayerRequest: ...
}
```

The database model must be explicitly constructed.

The request should contain only the fields defined by the domain schema.

---

# 57. No Sensitive Data in Database Metadata

Be careful with automated database features that may capture:

```text
query contents
debug data
profiling information
```

Production database monitoring should be configured so sensitive prayer content does not appear unnecessarily in monitoring systems.

---

# 58. Database Access Control

MongoDB credentials should be used only by the backend services that need them.

The development team should distinguish:

```text
development database credentials
production database credentials
```

Production credentials should not be shared casually among all developers.

The backend account should have only the database permissions necessary for the application.

---

# 59. Development Database

Real fellowship prayer requests must never be used as development fixtures.

Development/test data should be artificial:

```text
PR-TEST001

"Please pray for my upcoming exam."
```

or:

```text
PR-TEST002

"Please pray for wisdom and strength."
```

No real sensitive requests.

---

# 60. Example Complete Request

Conceptually, a production request could look like:

```json
{
  "_id": "ObjectId(...)",

  "requestId": "PR-7F29A83C",

  "content": {
    "ciphertext": "7d8f...",
    "iv": "13b4...",
    "authTag": "a90c...",
    "keyVersion": 1
  },

  "status": "pending",

  "createdAt": "2026-10-03T10:30:00.000Z",

  "expiresAt": "2026-10-17T10:30:00.000Z",

  "dispatchId": null,

  "publishedAt": null
}
```

Notice what is absent:

```text
Telegram ID
Telegram username
Name
Phone
Student ID
Interface language
Original message ID
Raw Telegram update
IP address
```

---

# 61. Example Complete Dispatch Record

```json
{
  "_id": "ObjectId(...)",

  "dispatchId": "DISPATCH-2026-W40",

  "weekKey": "2026-W40",

  "collectionStartAt": "2026-09-28T00:00:00.000Z",

  "collectionEndAt": "2026-10-03T18:00:00.000Z",

  "scheduledAt": "2026-10-03T18:00:00.000Z",

  "status": "completed",

  "eligibleRequestCount": 12,

  "startedAt": "2026-10-03T18:00:03.000Z",

  "completedAt": "2026-10-03T18:01:11.000Z"
}
```

Again, no prayer text and no student identity.

---

# 62. Example Empty Week Dispatch Record

If no requests exist:

```json
{
  "dispatchId": "DISPATCH-2026-W40",

  "weekKey": "2026-W40",

  "status": "skipped_no_requests",

  "eligibleRequestCount": 0
}
```

The database records that the scheduler correctly ran.

The Telegram group receives:

```text
NOTHING
```

---

# 63. Database Relationships

The data model should remain intentionally simple:

```text
                    ┌─────────────────────┐
                    │  dispatch_records   │
                    └──────────┬──────────┘
                               │
                         dispatchId
                               │
                               ▼
                    ┌─────────────────────┐
                    │   prayer_requests   │
                    └─────────────────────┘


                    NO USER COLLECTION

                    NO USER RELATIONSHIP
```

---

# 64. Data That Exists Only Temporarily

The following may exist briefly while a request is being processed:

```text
Telegram user/chat information
Prayer plaintext
Conversation state
Draft prayer text
```

The application must ensure these do not unnecessarily become permanent database records.

Conceptually:

```text
Temporary
─────────────
Telegram metadata
Draft text
Session state

Permanent
─────────────
Anonymous request
Encrypted content
Operational status
```

---

# 65. Data Flow Into the Database

The database should receive:

```text
Prayer text
    ↓
Validation
    ↓
Generate random requestId
    ↓
Encrypt
    ↓
Create explicit domain object
    ↓
Mongoose validation
    ↓
MongoDB
```

Not:

```text
Telegram update
    ↓
MongoDB
```

---

# 66. Privacy Invariant

The following must always be true:

> **Given a `prayer_requests` document, the database alone should not contain an application-level field that identifies which Telegram account submitted it.**

This should become an automated test requirement.

For example, a schema test should verify that the stored object does not contain forbidden fields.

---

# 67. Another Privacy Invariant

The system must never intentionally create:

```text
telegramUserId
        ↓
requestId
```

or:

```text
telegramChatId
        ↓
requestId
```

relationships in another collection either.

It would defeat the privacy design to remove the field from `prayer_requests` and then store the same relationship in:

```text
sessions
audit_logs
user_preferences
dispatch_debug
```

---

# 68. Auditability Without Content

Technical auditing is useful.

We can record events such as:

```text
prayer_request_created
weekly_dispatch_started
weekly_dispatch_skipped_no_requests
weekly_dispatch_completed
prayer_request_expired
prayer_request_deleted
```

But audit records must not contain the prayer text.

A technical audit entry might contain:

```json
{
  "event": "prayer_request_deleted",
  "timestamp": "...",
  "requestId": "PR-7F29A83C"
}
```

Whether even the anonymous `requestId` should remain in long-lived logs will be reviewed during the retention design. Logs should not outlive sensitive data unnecessarily.

---

# 69. Data Retention Model

The intended lifecycle is:

```text
Submission
     │
     ▼
Encrypted active request
     │
     ▼
Weekly publication
     │
     ▼
Short defined retention
     │
     ▼
Deletion
```

There should not be:

```text
Submission
     │
     ▼
Permanent archive
```

unless the fellowship explicitly establishes a separate reason and privacy policy for doing so.

---

# 70. Database Design Decisions Summary

| Area                         | Decision                                     |
| ---------------------------- | -------------------------------------------- |
| Database                     | MongoDB                                      |
| ODM                          | Mongoose                                     |
| Persistent collections       | `prayer_requests`, `dispatch_records`        |
| User collection              | None in MVP                                  |
| Telegram identity in request | Forbidden                                    |
| Raw Telegram update          | Never stored                                 |
| Prayer plaintext             | Never persist                                |
| Prayer storage               | Application-level encrypted ciphertext       |
| Encryption                   | Authenticated encryption                     |
| Key storage                  | Outside database                             |
| Request ID                   | Cryptographically random opaque ID           |
| Request editing              | Not supported                                |
| Request deletion             | Hard delete                                  |
| Request expiration           | `expiresAt` + cleanup                        |
| TTL                          | Safety mechanism, not sole retention control |
| Language preference          | Temporary session state                      |
| Weekly dispatch ID           | Technical only                               |
| Week identification          | `weekKey`                                    |
| Empty week                   | Dispatch record, zero Telegram messages      |
| Dispatch state               | Tracked separately                           |
| Prayer-team message content  | Not stored in dispatch record                |
| Telegram message IDs         | Future consideration                         |
| Development data             | Synthetic only                               |

---

# 71. Proposed Final Data Model

```text
MongoDB
│
├── prayer_requests
│   │
│   ├── _id
│   ├── requestId
│   │
│   ├── content
│   │   ├── ciphertext
│   │   ├── iv
│   │   ├── authTag
│   │   └── keyVersion
│   │
│   ├── status
│   ├── createdAt
│   ├── expiresAt
│   ├── dispatchId
│   └── publishedAt
│
└── dispatch_records
    │
    ├── _id
    ├── dispatchId
    ├── weekKey
    ├── collectionStartAt
    ├── collectionEndAt
    ├── scheduledAt
    ├── status
    ├── eligibleRequestCount
    ├── startedAt
    └── completedAt
```

---

# 72. Final Database Privacy Principle

The database is designed around this rule:

```text
                         PERSON
                            │
                            X
                            │
                     NO DATABASE LINK
                            │
                            ▼
                   ANONYMOUS REQUEST
                            │
                            ▼
                      ENCRYPTED DATA
                            │
                            ▼
                         MongoDB
```

The system should know enough to operate the prayer service, but not enough to turn the database into a map of:

```text
student → sensitive prayer request
```

That separation is the fundamental data-model property of this project.
