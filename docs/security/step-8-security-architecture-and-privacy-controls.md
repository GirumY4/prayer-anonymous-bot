# Anonymous Prayer Request Bot

## Christian Students Fellowship — Pray Team

**Document:** Step 8 — Security Architecture & Privacy Controls
**Recommended path:** `docs/security/step-8-security-architecture-and-privacy-controls.md`

---

# 1. Purpose

This document converts the threat model into concrete security and privacy controls for the MVP.

The controls cover:

- Telegram webhook security
- Transport security
- Secret management
- Encryption
- Encryption-key management
- Session security
- Rate limiting
- Input validation
- Telegram message security
- MongoDB security
- Logging
- Error handling
- Data retention
- Backup protection
- Weekly dispatch protection
- Development security
- Operational security
- Incident response
- Security testing

The security model must protect both:

```text
Confidentiality of prayer content
```

and:

```text
Anonymity of the submitter
```

These are related but different goals.

---

# 2. Security Architecture

The MVP should use multiple independent security layers.

```text
                         INTERNET
                            │
                            ▼
                    ┌───────────────┐
                    │ HTTPS / TLS   │
                    └───────┬───────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │ Telegram Webhook     │
                 │ Authentication      │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │ Input Validation    │
                 │ + Body Limits       │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │ Conversation /      │
                 │ Session Protection  │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │ Application Logic   │
                 └──────────┬──────────┘
                            │
                  ┌─────────┴─────────┐
                  ▼                   ▼
        ┌─────────────────┐   ┌─────────────────┐
        │ Encryption      │   │ Privacy-Safe    │
        │ Service         │   │ Logging         │
        └────────┬────────┘   └─────────────────┘
                 │
                 ▼
        ┌───────────────────┐
        │ MongoDB           │
        │ Restricted Access │
        └───────────────────┘
                 │
                 ▼
        ┌───────────────────┐
        │ Retention /       │
        │ Deletion          │
        └───────────────────┘

                    WEEKLY
                      │
                      ▼
             ┌─────────────────┐
             │ Dispatch Lock   │
             └────────┬────────┘
                      │
                      ▼
             ┌─────────────────┐
             │ Anonymous       │
             │ Digest          │
             └────────┬────────┘
                      │
                      ▼
             ┌─────────────────┐
             │ Protected       │
             │ Telegram Group  │
             └─────────────────┘
```

No individual control should be considered sufficient by itself.

---

# 3. Security Objectives

The MVP security objectives are:

## S-01 — Identity Separation

The application must not persistently associate Telegram identity with a prayer request.

## S-02 — Content Confidentiality

Stored prayer content must be encrypted.

## S-03 — Transport Security

All communication between Telegram and the backend must use HTTPS.

## S-04 — Secret Protection

Bot tokens, encryption keys, database credentials, and other secrets must never enter source control or ordinary logs.

## S-05 — Least Privilege

Every component and person receives only the access required for their role.

## S-06 — Input Safety

All external input is untrusted and must be validated.

## S-07 — Data Minimization

Sensitive information must not be copied unnecessarily.

## S-08 — Limited Retention

Sensitive information must eventually be deleted.

## S-09 — Safe Weekly Publication

Only eligible anonymous requests may reach the Pray Team group.

## S-10 — Operational Recoverability

Security failures must not cause the system to silently lose or duplicate prayer requests.

---

# 4. Telegram Webhook Security

The production bot should use an HTTPS webhook rather than exposing a polling process as the public interface.

Telegram's Bot API supports an HTTPS `setWebhook` configuration with a `secret_token`. When configured, Telegram includes the value in the `X-Telegram-Bot-Api-Secret-Token` header on webhook requests. Telegram also supports limiting the update types delivered to the webhook.

The architecture should therefore use:

```text
Telegram
   │
   │ HTTPS POST
   ▼
/<secret-webhook-path>
   │
   ├── Verify secret header
   └── Validate update
```

---

# 5. Webhook Secret

The application must have a dedicated webhook secret:

```env
TELEGRAM_WEBHOOK_SECRET=...
```

It must be:

- Random
- Unpredictable
- Stored outside source code
- Stored outside MongoDB
- Never logged
- Never sent to students

Telegram currently allows webhook `secret_token` values of 1–256 characters using letters, numbers, `_`, and `-`.

For our implementation, generate a sufficiently long random value rather than choosing a human-readable password.

---

# 6. Webhook Secret Verification

Every incoming webhook request must pass:

```text
Expected secret
        =
X-Telegram-Bot-Api-Secret-Token
```

If the header is:

- missing
- invalid
- malformed

the request must be rejected immediately.

The application should not process the Telegram update first and authenticate afterward.

---

# 7. Webhook Secret Comparison

The implementation should use a safe comparison mechanism rather than casually comparing secrets in a way that can introduce timing side channels.

The comparison belongs in the infrastructure/security layer.

Conceptually:

```text
request header
      ↓
constant-time secret comparison
      ↓
valid?
 ┌────┴────┐
NO        YES
 │          │
 ▼          ▼
Reject    Parse update
```

---

# 8. Webhook Path Protection

In addition to the header secret, use an unpredictable webhook path.

For example:

```text
https://bot.example.com/webhook/<random-secret-path>
```

Do not use:

```text
/webhook
/telegram
/bot
```

as the only protection.

The path is an additional defense layer, not a replacement for Telegram's webhook secret.

---

# 9. Telegram Update Types

The application should request only update types that the MVP actually needs.

For example:

```text
message
callback_query
```

The Bot API's `allowed_updates` option lets the webhook restrict which update types are delivered.

This supports data minimization at the transport level.

We should not ask Telegram to deliver unrelated update types unless a future feature requires them.

---

# 10. Webhook Body Limits

The webhook endpoint must impose a reasonable request-body limit.

This protects the server against intentionally oversized HTTP payloads.

Conceptually:

```text
Incoming request
      ↓
Maximum body size?
      │
      ├── exceeded → reject
      │
      └── acceptable → continue
```

This protects the application before Telegram-specific parsing and business logic occur.

---

# 11. HTTPS / TLS

The production webhook must use HTTPS.

The application must never expect prayer submissions to travel over unencrypted HTTP.

The HTTPS termination point may be:

```text
reverse proxy
load balancer
hosting platform
```

but the security responsibility must remain explicit.

---

# 12. Telegram Bot Token Security

The bot token is a critical secret.

Recommended:

```env
TELEGRAM_BOT_TOKEN=...
```

Never place it in:

```text
source code
README
frontend code
Git history
screenshots
logs
AI prompts
public documentation
```

OWASP's current secrets-management guidance says secrets should be limited to those who need them, rotated where practical, revocable, and never logged.

---

# 13. `.env` Development Rules

For local development:

```text
.env
```

may contain local secrets.

But:

```text
.env
```

must be included in `.gitignore`.

Instead commit:

```text
.env.example
```

with placeholders:

```env
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
MONGODB_URI=
ENCRYPTION_KEY=
PRAY_TEAM_CHAT_ID=
```

Never commit real values.

---

# 14. Production Secret Management

For production, secrets should preferably be supplied through the hosting platform's secret-management mechanism or a dedicated secrets manager.

Required secrets include:

```text
TELEGRAM_BOT_TOKEN
TELEGRAM_WEBHOOK_SECRET
MONGODB_URI
ENCRYPTION_KEY
PRAY_TEAM_CHAT_ID
```

Secrets should not be embedded in Docker images, compiled frontend bundles, or configuration files committed to Git. OWASP specifically recommends keeping cryptographic keys and other secrets outside source repositories/build artifacts and limiting access to those who need them.

---

# 15. Secret Inventory

The project should maintain a private inventory of production secrets.

Example:

| Secret            | Purpose                     | Required by        | Rotation                            |
| ----------------- | --------------------------- | ------------------ | ----------------------------------- |
| Bot token         | Telegram API authentication | Telegram adapter   | When compromised / planned rotation |
| Webhook secret    | Webhook verification        | Webhook middleware | Periodically or on compromise       |
| Mongo URI         | Database connection         | Repository layer   | On compromise / planned rotation    |
| Encryption key    | Prayer content encryption   | Encryption service | Planned key-rotation strategy       |
| Pray Team chat ID | Publication destination     | Dispatch           | When group changes                  |

The inventory itself must not contain the actual secret values.

---

# 16. Encryption Requirements

Prayer content is sensitive and must be encrypted before database persistence.

Recommended primitive:

```text
AES-256-GCM
```

This provides:

```text
Confidentiality
+
Integrity/authentication
```

The encryption operation should return:

```text
ciphertext
iv
authTag
keyVersion
```

as defined in Step 5.

---

# 17. Encryption Process

```text
Student prayer text
       │
       ▼
Validation
       │
       ▼
Encryption Service
       │
       ├── random IV
       ├── encryption key
       └── authenticated encryption
       │
       ▼
EncryptedContent
       │
       ▼
MongoDB
```

Plaintext should not be persisted before encryption.

---

# 18. Encryption Key Requirements

The encryption key must:

- Exist outside MongoDB
- Never be committed to Git
- Never be sent to Telegram
- Never be sent to the frontend
- Never be written to logs
- Never be included in error reports

OWASP's key-management guidance explicitly recommends that cryptographic keys not be committed to source repositories or build artifacts and instead be protected through a dedicated secret/key-management mechanism.

---

# 19. Encryption Key Versioning

Every encrypted request contains:

```text
keyVersion
```

Example:

```text
keyVersion = 1
```

If the key changes:

```text
keyVersion = 2
```

The application uses the recorded version to determine which key can decrypt the request.

---

# 20. Key Rotation

Key rotation is a future operational capability.

The project must not casually replace:

```text
ENCRYPTION_KEY
```

without planning what happens to existing encrypted requests.

A proper rotation procedure eventually needs:

```text
Old key available
       ↓
Decrypt old request
       ↓
Encrypt with new key
       ↓
Store new keyVersion
       ↓
Safely retire old key
```

Until we formally implement key rotation, the application must at least prevent accidental key changes from making existing requests undecryptable.

---

# 21. Plaintext Lifetime

When prayer content is decrypted for weekly publication:

```text
Encrypted database value
       ↓
Decrypt
       ↓
Plaintext in memory
       ↓
Digest construction
       ↓
Telegram API
       ↓
Temporary object becomes unreachable
```

The application should keep plaintext lifetime as short as practical.

Because JavaScript/Node.js uses managed memory, the application cannot guarantee immediate physical memory erasure. Therefore the design goal is **minimization of plaintext lifetime and copies**, not a false claim of guaranteed memory wiping.

---

# 22. No Temporary Plaintext Files

The application must never create temporary files such as:

```text
/prayer.txt
/debug/prayer.json
/tmp/request.txt
```

for normal processing.

Sensitive plaintext should remain in application memory only.

---

# 23. MongoDB Security

MongoDB should be accessible only from the backend infrastructure.

Architecture:

```text
Internet
   │
   X
   │
   └──────────────► MongoDB
                         ▲
                         │
                    Backend only
```

MongoDB credentials must be stored as secrets.

The database must not be directly exposed to students, Telegram, or a future browser frontend.

---

# 24. Database Least Privilege

The application's MongoDB user should receive only the permissions required by the application.

For the MVP, that is approximately:

```text
Read/write:
prayer_requests
dispatch_records
```

It should not automatically receive unrestricted administrative permissions if they are unnecessary.

---

# 25. Mongoose Strictness

The Mongoose schemas should be strict.

The application should explicitly construct allowed fields:

```text
Allowed
- requestId
- encrypted content
- status
- timestamps
- dispatch state
```

and reject accidental fields such as:

```text
telegramUserId
username
chatId
rawUpdate
```

This creates a second defense against application coding mistakes.

---

# 26. Input Validation

Every external input is untrusted.

Validation occurs at multiple levels:

```text
Telegram update
      ↓
Transport validation
      ↓
Conversation validation
      ↓
Prayer text validation
      ↓
Domain validation
      ↓
Database schema validation
```

The validation system must include:

- Type checks
- Maximum length
- Empty-value rejection
- Supported action checking
- State checking
- Callback-data validation

---

# 27. Prayer Text Limits

The bot must enforce a maximum request length.

The exact application limit will be chosen during implementation.

The limit should be comfortably below Telegram's message-processing constraints so the application retains enough room for validation, formatting, and safe digest construction.

Telegram's Bot API currently documents a 1–4096 character limit for ordinary text messages after entity parsing.

---

# 28. Plain-Text Publication

For the weekly digest, user-submitted prayer text should preferably be treated as plain text.

We should not interpret arbitrary user text as trusted HTML or Markdown.

This prevents a user from controlling:

```text
mentions
links
formatting
hidden entities
```

inside the team's weekly message.

---

# 29. Link and Mention Policy

The MVP should not intentionally generate user-controlled:

```text
@mentions
clickable arbitrary links
Telegram commands
HTML
Markdown
```

from prayer text.

The user may write whatever text is appropriate for a prayer request, but the application should render it safely.

---

# 30. Telegram Content Protection

For weekly prayer-team messages, I recommend enabling Telegram's `protect_content` option as a defense-in-depth control.

Telegram currently documents `protect_content` for `sendMessage` and other sending methods; it is intended to protect sent content from forwarding and saving. Telegram also provides group-level content protection.

Conceptually:

```text
Bot
  ↓
Weekly digest
  ↓
protect_content = true
  ↓
Pray Team group
```

This does not replace confidentiality rules or technical privacy controls. It simply reduces the ability to redistribute the bot's messages through normal Telegram features.

---

# 31. Private Pray Team Group

The group receiving weekly requests must be private.

It should not be:

```text
public group
public channel
searchable public community
```

Access should be manually controlled by fellowship leadership.

The bot should not be responsible for deciding which people are spiritually or organizationally authorized to see the requests.

---

# 32. Group Membership Security

The fellowship should establish a process for:

```text
Adding authorized team members
Removing former members
Removing compromised accounts
Reviewing membership periodically
```

When a person leaves the Pray Team, their access should be removed promptly.

---

# 33. Bot Group Permissions

The bot should receive only the permissions required for the MVP.

Primarily:

```text
Send messages
```

Avoid unnecessary administrative permissions.

The bot should not need broad group-management authority just to publish weekly prayer requests.

---

# 34. Telegram Account Security for Pray Team

Because the Pray Team can read the sensitive requests, their Telegram accounts become part of the security boundary.

The fellowship should strongly encourage:

```text
Telegram two-step verification
Secure device locks
Current Telegram app
No shared Telegram accounts
Prompt reporting of compromised accounts
```

A compromised team member's Telegram account can expose requests even if our backend is perfectly secure.

---

# 35. Session Security

The bot uses temporary conversation state.

A session should contain only:

```text
language
state
temporary draft
last activity
expiration
```

It must not contain:

```text
permanent user profile
personal details
long-term request history
```

---

# 36. Temporary Session Identifier

If the application uses a session identifier internally, it should be:

- unpredictable
- non-semantic
- free of personal information

OWASP recommends unpredictable, meaningless session identifiers and advises that session IDs should not contain PII or sensitive application information.

For the MVP, the Telegram private chat identifier may be used internally to locate an in-memory session because Telegram supplies it as the conversation routing identifier. The critical requirement is that it remains temporary and never becomes part of the persistent prayer-request model.

---

# 37. Session TTL

Recommended:

```text
SESSION_TTL_MINUTES=15
```

The session expires after inactivity.

On expiration:

```text
session
draft
temporary state
```

are cleared.

This reduces the amount of time sensitive draft text exists outside the encrypted database.

---

# 38. No Persistent Draft Recovery

The MVP deliberately does not persist drafts.

If the backend restarts:

```text
Temporary session → lost
```

This is acceptable.

The user can start again.

This is a privacy advantage because a sensitive unfinished request does not survive indefinitely merely for convenience.

---

# 39. Rate Limiting

Rate limiting is needed for abuse protection.

However, permanent storage of Telegram IDs solely for rate limiting would conflict with our anonymity objective.

Therefore use multiple layers:

```text
1. Global webhook request limits
2. Maximum request body size
3. Temporary per-conversation rate limits
4. Maximum prayer-request length
5. Submission-frequency limits
6. Scheduler/resource protection
```

---

# 40. Temporary Per-Conversation Rate Limit

A practical MVP approach is an in-memory structure keyed by the temporary conversation identifier:

```text
chatId
   ↓
temporary rate-limit state
```

For example:

```text
maximum submissions
within a short period
```

The exact numerical threshold should be determined through testing rather than arbitrarily hard-coded now.

The state must expire.

---

# 41. Why Not Permanent Anti-Spam Profiles?

Avoid:

```text
telegramUserId
↓
submissionCount
↓
account reputation
```

as a permanent database model.

That would gradually turn the privacy-first prayer bot into a user-tracking application.

If stronger anti-abuse controls eventually become necessary, the privacy tradeoff must be explicitly reviewed.

---

# 42. Error Handling Security

Errors must be separated into:

```text
User-facing error
Internal technical error
```

Student receives:

```text
Something went wrong.
Please try again.
```

Internal monitoring may record:

```text
PRAYER_REQUEST_ENCRYPTION_FAILED
```

but never:

```text
prayerText = "..."
telegramUserId = "..."
```

---

# 43. Logging Policy

Logging is one of the most important controls in this project.

OWASP recommends that sensitive personal data, authentication secrets, session IDs, encryption keys, and similar high-risk information not be logged directly; sensitive values should instead be removed, masked, hashed, or otherwise protected where logging is necessary.

Our default rule is even stricter:

> **Do not log prayer content at all.**

---

# 44. Forbidden Log Data

Production logs must not contain:

```text
Prayer text
Telegram user ID
Telegram chat ID
Telegram username
first name
last name
phone number
student ID
Raw Telegram update
Bot token
Database URI
Encryption key
Webhook secret
Session token
Temporary draft
```

---

# 45. Allowed Technical Events

Examples:

```text
webhook_received
webhook_rejected
conversation_started
language_selected
privacy_notice_shown
prayer_submission_started
prayer_request_created
weekly_dispatch_started
weekly_dispatch_skipped_no_requests
weekly_dispatch_completed
weekly_dispatch_failed
request_expired
request_deleted
```

Even these events should contain only the minimum metadata needed for troubleshooting.

---

# 46. Anonymous Request IDs in Logs

The anonymous `requestId` may be useful for technical correlation.

For example:

```text
requestId = PR-7F29A83C
event = request_deleted
```

However, long-lived logs should not necessarily retain request IDs forever.

The log retention period should be shorter than, or otherwise aligned with, the data-retention policy for the sensitive request.

---

# 47. Log Injection Protection

Prayer text must never reach logs.

Even ordinary external values that are logged must be safely encoded/structured so attackers cannot manipulate log formatting.

OWASP's current logging guidance also calls for validation and encoding of dangerous characters to prevent log injection.

Use structured JSON logging rather than concatenated log strings.

---

# 48. Log Access

Production logs may themselves be sensitive because they reveal operational behavior.

Access should be limited to:

```text
authorized developers
authorized administrators
```

and only when necessary.

Do not send logs automatically to arbitrary third-party services.

---

# 49. External Error Monitoring

The MVP should initially avoid sending sensitive request payloads to third-party error-monitoring platforms.

If a service such as an error tracker is introduced later:

```text
Raw Telegram update
       X
Prayer content
       X
Secrets
       X
```

must be scrubbed before transmission.

---

# 50. Analytics

Do not install analytics that track individual bot users for the MVP.

Avoid collecting:

```text
user identity
behavior history
submission history
click trails
```

The bot has no legitimate requirement for conventional marketing analytics.

Operational metrics are enough.

---

# 51. Safe Metrics

The application may eventually measure:

```text
Number of successful submissions
Number of failed submissions
Weekly dispatch duration
Number of published requests
Number of empty weeks
Number of expired requests
Number of webhook failures
```

But metrics should not identify individuals or expose prayer content.

---

# 52. Weekly Dispatch Security

The scheduler must first determine:

```text
How many eligible requests?
```

before decrypting anything.

If:

```text
0 requests
```

then:

```text
NO DECRYPTION
NO DIGEST
NO TELEGRAM MESSAGE
```

The job simply records:

```text
weekly_dispatch_skipped_no_requests
```

This is both efficient and privacy-preserving.

---

# 53. Dispatch Lock

Only one scheduler invocation should be allowed to own a particular weekly dispatch.

Conceptually:

```text
SCHEDULED
   ↓
atomic claim
   ↓
RUNNING
```

If another scheduler invocation tries the same week:

```text
already RUNNING
```

and it exits without sending another digest.

This prevents duplicate weekly jobs when a server restarts or multiple scheduler invocations occur.

---

# 54. Expired Requests

The dispatch query must exclude:

```text
expiresAt <= now
```

Expired requests must never be sent to the Pray Team.

---

# 55. Automatic Deletion

The system needs two levels of deletion:

```text
Primary cleanup process
+
MongoDB TTL safety mechanism
```

MongoDB TTL indexes can remove documents automatically based on date fields, including a specific `expireAt` time when `expireAfterSeconds: 0` is used. MongoDB performs TTL deletion in a background process, so it should not be treated as an exact real-time deletion clock.

Therefore:

```text
Application cleanup
=
primary retention mechanism

MongoDB TTL
=
additional safety mechanism
```

---

# 56. Retention Policy

The exact retention period must be decided by the fellowship.

Architecture supports:

```text
expiresAt = explicit deletion deadline
```

rather than:

```text
createdAt + permanent retention
```

This means the policy can later be changed without redesigning the data model.

---

# 57. Backups

Backups are part of the privacy boundary.

Deleting a request from the live collection does not automatically mean every backup or snapshot containing the request disappears immediately.

Therefore the operational policy must define:

```text
Backup retention period
Snapshot lifecycle
Disaster-recovery copies
Who can access backups
How backup encryption keys are protected
```

Backups must not become an unnoticed permanent archive of prayer requests.

---

# 58. Development Environment

Never use real fellowship prayer requests for:

```text
local development
unit tests
screenshots
GitHub examples
README examples
demo videos
portfolio
AI prompts
```

Only synthetic data.

Example:

```text
PR-TEST001

"Please pray that I do well on my upcoming exam."
```

---

# 59. Test Data Policy

Test data must deliberately contain fictional examples that exercise:

```text
Amharic
English
long requests
special characters
apostrophes
quotes
links
emoji
multiple paragraphs
```

But none should represent actual fellowship members or real private situations.

---

# 60. Git Security

The repository must contain:

```text
.env.example
.gitignore
```

and should exclude:

```text
.env
.env.*
secrets/
keys/
local databases/
production exports/
```

Do not commit:

```text
MongoDB dumps
Telegram updates
prayer requests
screenshots containing requests
production logs
```

---

# 61. Secret Scanning

The development workflow should eventually include secret scanning.

The purpose is to catch accidental commits of:

```text
bot tokens
database credentials
API keys
private keys
encryption material
```

before they reach the shared repository.

---

# 62. Git History Problem

Deleting a leaked secret from the current file is not always sufficient because the value may remain in Git history.

If a secret is accidentally committed:

```text
1. Revoke/rotate the secret immediately
2. Investigate exposure
3. Remove it from repository history if appropriate
4. Replace it with a new secret
```

Changing the secret is more important than merely editing the file.

---

# 63. Deployment Security

Production deployment must:

```text
Use HTTPS
Use secret-managed configuration
Use production database credentials
Use minimal OS/container permissions
Disable development/debug mode
Avoid verbose stack traces
Restrict database access
Monitor application health
```

---

# 64. Debug Mode

Production must never run with verbose development debugging enabled.

Avoid exposing:

```text
stack traces
database queries
request bodies
environment configuration
```

to users.

---

# 65. HTTP Security

The backend should use standard HTTP security controls appropriate to its deployment.

At minimum:

```text
TLS
Request-size limits
Strict content type handling
Secure security headers
No unnecessary public endpoints
```

The browser-facing admin console does not exist yet, so CORS can remain minimal/restricted in the MVP rather than designing a broad cross-origin API.

---

# 66. No Public API for Prayer Retrieval

The MVP must not expose:

```text
GET /prayer-requests
GET /requests
GET /requests/:id
```

to the public Internet.

The only prayer-content retrieval path is the internal weekly dispatch process.

This dramatically reduces the attack surface.

---

# 67. No Student Request-Status API

The MVP also does not need:

```text
GET /my-request
```

because that would require an identity-to-request mechanism.

The student only receives the anonymous request ID at submission time.

The ID is not an authentication mechanism.

---

# 68. Request IDs Are Not Passwords

A request ID such as:

```text
PR-7F29A83C
```

must not be treated as a secret credential.

Anyone who knows the ID should not automatically gain access to the request.

The ID exists for human/reference purposes, not authentication.

---

# 69. Admin Console Future Security

When an admin console is eventually introduced, it will require a separate security design including:

```text
Authentication
Authorization
Role-based access control
MFA/2FA
Session security
Audit logging
Account recovery
Admin revocation
```

The MVP must not preemptively build a weak authentication system merely because a future dashboard may need one.

---

# 70. Administrator Access Principle

Technical administrators should not automatically be able to browse all plaintext prayer requests simply because they can access the infrastructure.

The architecture should aim to minimize who can decrypt content.

This becomes especially important when the future admin console is designed.

---

# 71. Encryption/Access Separation

Conceptually:

```text
Production database access
        ≠
Automatic permission to decrypt everything
```

The application server needs both database access and encryption capability to perform weekly dispatch, but human operational access should be restricted as much as practical.

---

# 72. Incident Response

A privacy incident should have a predefined response process.

```text
1. Detect
2. Contain
3. Revoke compromised credentials
4. Determine affected systems/data
5. Preserve necessary evidence
6. Remove unauthorized access
7. Delete exposed copies where possible
8. Rotate relevant secrets
9. Notify fellowship leadership
10. Correct root cause
11. Test the correction
12. Document the incident
```

Do not investigate an incident by copying sensitive prayer requests into another chat or tool unnecessarily.

---

# 73. Bot Token Incident

If the Telegram bot token is exposed:

```text
Immediate:
rotate/revoke bot token
```

Then:

```text
Review Git history
Review deployment logs
Review access
Set new secret
Redeploy
Verify webhook configuration
```

Never assume that deleting the token from the source file alone solves the problem.

---

# 74. Encryption-Key Incident

If the encryption key may have been exposed:

```text
Do not immediately destroy the only copy.
```

First determine:

```text
Which requests may be affected?
Can the key be safely rotated?
Can old data be re-encrypted?
Do we need to restrict database access?
```

Key rotation must be handled carefully because losing the only valid decryption key causes permanent data loss.

---

# 75. Database Incident

If MongoDB may have been accessed by an unauthorized person:

```text
1. Restrict access
2. Rotate credentials
3. Determine whether encrypted content was exposed
4. Determine whether keys were also exposed
5. Review audit/security logs
6. Verify retention/deletion status
7. Notify appropriate leadership
```

Encrypted content alone and encrypted content plus the encryption key represent very different levels of exposure.

---

# 76. Testing Strategy

Security testing must begin before production.

We should have:

```text
Unit tests
Integration tests
Security tests
End-to-end tests
Failure/recovery tests
```

---

# 77. Webhook Security Tests

Test:

```text
Valid secret → accepted
Missing secret → rejected
Wrong secret → rejected
Malformed body → rejected
Oversized body → rejected
Unsupported update type → rejected/ignored
```

---

# 78. Privacy Tests

Test:

```text
Stored prayer request contains no Telegram ID
Stored prayer request contains no chat ID
Stored prayer request contains no username
Stored prayer request contains no name
Stored prayer request contains no raw Telegram update
```

---

# 79. Encryption Tests

Test:

```text
Plaintext → ciphertext
Ciphertext → correct plaintext
Tampered ciphertext → decryption failure
Wrong key → decryption failure
Wrong key version → controlled failure
```

---

# 80. Session Security Tests

Test:

```text
Session expires after TTL
Expired session cannot submit
Draft is cleared on cancel
Draft is cleared after successful submission
Server restart loses temporary draft
Old callback cannot submit
Callback from wrong state is rejected
```

---

# 81. Weekly Dispatch Security Tests

Test:

```text
Zero requests → zero Telegram messages
One request → correct behavior
Multiple requests → randomized order
Expired request → excluded
Already published request → excluded
New request after cutoff → next week
Scheduler runs twice → one logical dispatch
Telegram failure → controlled recovery
```

---

# 82. Logging Tests

Automated tests should search captured logs and verify that they do not contain:

```text
prayer content
Telegram ID
Telegram chat ID
username
bot token
database URI
encryption key
webhook secret
temporary draft
```

This is particularly important because developers frequently reintroduce sensitive logging while debugging.

OWASP recommends strong controls around sensitive logging and emphasizes that sensitive information should not be placed in normal logs.

---

# 83. Data-Retention Tests

Test:

```text
Expired request becomes ineligible
Expired request is deleted
Deleted request is not returned by repository
Deleted request is not published
TTL cleanup is configured
Cleanup failures are detectable
```

---

# 84. Group-Security Tests

Test:

```text
Correct group receives digest
Wrong group never receives digest
Student cannot select destination
No public destination can be supplied
Messages are sent with content protection enabled where supported
```

---

# 85. Security Configuration Checklist

Before production:

```text
✓ HTTPS configured
✓ Webhook secret configured
✓ Webhook secret verified
✓ Secret path configured
✓ Only required Telegram update types enabled
✓ Bot token stored as secret
✓ Encryption key stored as secret
✓ MongoDB credentials stored as secret
✓ MongoDB network access restricted
✓ Production debug mode disabled
✓ Request body limits enabled
✓ Input validation enabled
✓ Rate limiting enabled
✓ Session TTL enabled
✓ Prayer content encrypted
✓ Production logs scrubbed
✓ External error tracking reviewed
✓ No analytics tracking individuals
✓ Pray Team group private
✓ Bot has minimal group permissions
✓ Content protection enabled for weekly requests
✓ Expiration cleanup enabled
✓ TTL safety index configured
✓ Backup retention documented
✓ Real prayer data absent from test environments
✓ Secret scanning enabled
```

---

# 86. Security Architecture by Layer

## Layer 1 — Telegram

```text
HTTPS
Webhook secret
Limited update types
Private user chat
```

## Layer 2 — HTTP/Application

```text
Input validation
Body limits
Rate limiting
Safe errors
```

## Layer 3 — Conversation

```text
Temporary sessions
15-minute TTL
No persistent drafts
State validation
Callback validation
```

## Layer 4 — Data

```text
Application-level encryption
Minimal schema
Strict Mongoose schema
No identity linkage
```

## Layer 5 — Database

```text
Restricted network
Least-privilege credentials
Indexes
TTL cleanup
Encrypted backups
```

## Layer 6 — Telegram Group

```text
Private group
Controlled membership
Minimal bot permissions
Fresh bot-generated messages
Content protection
```

## Layer 7 — Operations

```text
Secret management
Secure deployment
Privacy-safe logs
Incident response
Security testing
```

---

# 87. Security Invariants

The following must always remain true.

### INV-01

A prayer request cannot contain a Telegram identity.

### INV-02

The raw incoming Telegram update is never persisted as application data.

### INV-03

Plaintext prayer content is not intentionally written to logs.

### INV-04

A user's draft cannot survive beyond its session TTL.

### INV-05

An expired request cannot be published.

### INV-06

A zero-request weekly dispatch sends zero group messages.

### INV-07

The weekly digest is created as a new bot message.

### INV-08

The student cannot select the publication destination.

### INV-09

Secrets cannot enter source control.

### INV-10

Encryption keys are not stored beside encrypted prayer data.

### INV-11

Only one logical weekly dispatch exists for a given week.

### INV-12

A stale or invalid callback cannot create or publish a prayer request.

---

# 88. Security Boundary Summary

The final security architecture is:

```text
                         TELEGRAM
                            │
                            │ HTTPS
                            ▼
                   ┌─────────────────┐
                   │ Webhook Secret  │
                   │ Verification    │
                   └────────┬────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ Validation      │
                   │ Rate Limits     │
                   └────────┬────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ Conversation    │
                   │ State / TTL     │
                   └────────┬────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ Prayer Service  │
                   └───────┬─────────┘
                           │
                     Encrypt Before
                        Persistence
                           │
                           ▼
                    ┌─────────────┐
                    │   MongoDB   │
                    │ Encrypted   │
                    │   Content   │
                    └──────┬──────┘
                           │
                    Restricted Access
                           │
                           ▼
                   Weekly Dispatch
                           │
                    Eligibility Check
                           │
                    Randomized Order
                           │
                      New Digest
                           │
                 Content Protection
                           │
                           ▼
                  Pray Team Group
```

---

# 89. Security Priorities

If implementation resources are limited, these controls must receive priority:

```text
1. Telegram webhook authentication
2. No identity linkage
3. Encryption of prayer content
4. Secret management
5. Privacy-safe logging
6. Temporary session/draft expiration
7. Private Pray Team group
8. Secure weekly dispatch/idempotency
9. Automatic deletion
10. Security testing
```

A beautiful interface is secondary to these controls.

---

# 90. Step 8 Acceptance Criteria

Step 8 is complete when:

```text
✓ HTTPS webhook is required
✓ Telegram webhook secret is required
✓ Secret webhook path is used
✓ Only necessary update types are accepted
✓ Webhook input has size limits
✓ Sensitive input is validated
✓ Rate limiting exists
✓ Temporary sessions expire
✓ Drafts are never permanently stored
✓ Prayer content is encrypted
✓ Encryption keys are separate from MongoDB
✓ Key versioning exists
✓ MongoDB access is restricted
✓ Database credentials are secret-managed
✓ No sensitive information is logged
✓ No analytics track individual students
✓ External error tracking is scrubbed or excluded
✓ Pray Team group is private
✓ Bot group permissions are minimal
✓ Weekly messages use content protection where appropriate
✓ Empty weekly dispatch sends nothing
✓ Expired requests cannot be published
✓ Automatic deletion exists
✓ TTL is used as a safety mechanism
✓ Backup retention is defined
✓ Real prayer data is never used in development
✓ Secrets are excluded from Git
✓ Secret scanning is planned
✓ Incident response is documented
✓ Security tests cover the major privacy invariants
```

---

# 91. Final Security Principle

The system should not depend on one statement such as:

> "The database is encrypted."

Instead, privacy should survive multiple possible failures:

```text
If logs are inspected
    → no prayer text

If database is leaked
    → prayer text is encrypted

If Telegram update is inspected by the application
    → identity is not persisted with request

If an old callback is pressed
    → current state rejects it

If weekly scheduler runs twice
    → dispatch coordination prevents duplicate publication

If there are zero requests
    → no Telegram group message

If a request expires
    → it becomes ineligible and is deleted

If a secret is compromised
    → it can be rotated/revoked

If a group member accidentally tries to forward a protected
weekly message
    → Telegram content-protection controls provide an
       additional barrier
```

The goal is **defense in depth**, not a single security feature.
