# Anonymous Prayer Request Bot

## Christian Students Fellowship — Pray Team

**Document:** Step 2 — Threat Model
**Recommended path:** `docs/security/step-2-threat-model.md`

---

# 1. Purpose of This Threat Model

This document identifies the ways the Anonymous Prayer Request Bot could fail to protect the privacy, confidentiality, integrity, and availability of prayer requests.

The primary security objective is:

> **A prayer request must not be unnecessarily linkable to the Telegram account that submitted it, and sensitive prayer content must be accessible only to the people and systems that legitimately require it.**

The threat model covers the complete lifecycle:

```text
Student
   ↓
Telegram
   ↓
Bot
   ↓
Backend
   ↓
Database
   ↓
Weekly Scheduler
   ↓
Generated Weekly Digest
   ↓
Pray Team Telegram Group
   ↓
Retention / Deletion
```

---

# 2. Security and Privacy Objectives

The system has six primary objectives.

## 2.1 Anonymity

The application should not maintain a persistent relationship between:

```text
Telegram identity
        ↕
Prayer request
```

---

## 2.2 Confidentiality

Prayer requests must be accessible only to the systems and authorized people that require them.

---

## 2.3 Integrity

A prayer request must not be secretly modified before or during weekly publication.

---

## 2.4 Availability

Students should be able to submit requests, and the weekly dispatch should operate reliably.

---

## 2.5 Data Minimization

The system should collect and retain only information necessary for its purpose.

---

## 2.6 Limited Retention

Sensitive information should not remain stored indefinitely.

---

# 3. Important Assumption About Telegram

The bot cannot make Telegram itself anonymous.

Telegram's Bot API provides bots with user information such as a unique user ID and potentially first name, last name, username, and language code.

Therefore the project's anonymity model is:

```text
Telegram knows the sender
        ↓
Telegram delivers the update
        ↓
Our application processes the update
        ↓
Application intentionally minimizes/discards identity information
        ↓
Prayer request is stored without identity linkage
```

The system must not claim:

> "Nobody can technically know who sent this because Telegram is anonymous."

Instead, the privacy promise should be:

> **"The fellowship's prayer system does not intentionally retain or reveal your Telegram identity together with your prayer request."**

---

# 4. Assets We Must Protect

The following assets are considered sensitive.

| Asset                            | Sensitivity | Why it matters                                        |
| -------------------------------- | ----------- | ----------------------------------------------------- |
| Prayer request text              | Critical    | May contain deeply personal information               |
| Telegram identity data           | Critical    | Could connect a person to a sensitive request         |
| Identity-to-request relationship | Critical    | This is the central anonymity risk                    |
| Encryption key                   | Critical    | Could decrypt stored requests                         |
| Telegram bot token               | Critical    | Could give control of the bot                         |
| Database credentials             | Critical    | Could provide access to stored requests               |
| Weekly group messages            | High        | Contain sensitive prayer information                  |
| Logs                             | High        | May accidentally contain identities or prayer content |
| Backups                          | High        | Can preserve data after normal deletion               |
| Language/session data            | Medium      | Could create unexpected identity linkage              |
| Dispatch state                   | Medium      | Must be protected against duplicates/manipulation     |
| Security configuration           | High        | Controls the entire system                            |

---

# 5. Trust Boundaries

There are several trust boundaries.

```text
┌─────────────────────────┐
│       STUDENT           │
│ Untrusted user input    │
└────────────┬────────────┘
             │
             │ Telegram
             ▼
┌─────────────────────────┐
│       TELEGRAM          │
│ External platform       │
└────────────┬────────────┘
             │
             │ Webhook/update
             ▼
┌─────────────────────────┐
│       BACKEND           │
│ Trust boundary #1       │
└────────────┬────────────┘
             │
       ┌─────┴─────┐
       ▼           ▼
┌────────────┐ ┌──────────────┐
│  Database  │ │   Scheduler  │
│ Boundary #2│ │ Boundary #3  │
└─────┬──────┘ └──────┬───────┘
      │               │
      └───────┬───────┘
              ▼
     ┌───────────────────┐
     │ Telegram Group    │
     │ Boundary #4       │
     └───────────────────┘
```

Each boundary needs explicit security controls.

---

# 6. Threat Actors

We should consider several types of attackers or accidental sources of exposure.

## 6.1 Curious Student

A normal fellowship member who tries to discover who submitted a request.

---

## 6.2 Malicious Student

Someone deliberately tries to abuse the bot, flood it, inject malicious content, or identify submitters.

---

## 6.3 Unauthorized Pray Team Member

Someone who gains access to the prayer group or receives the weekly requests without being trusted to handle sensitive information.

---

## 6.4 Rogue or Careless Team Member

A legitimate team member who:

- screenshots a request
- forwards it
- shares it externally
- discusses identifying details
- attempts to identify the submitter

This cannot be solved entirely through software, but the architecture can reduce unnecessary exposure.

---

## 6.5 Compromised Developer/Admin Account

An attacker obtains:

- server credentials
- database credentials
- deployment credentials
- GitHub secrets
- environment variables

---

## 6.6 Compromised Server or Database

An attacker gains access to the infrastructure hosting the application or database.

---

## 6.7 Webhook Attacker

An attacker attempts to send forged requests to the bot's webhook endpoint.

Telegram recommends using a secret path/token for webhook verification.

---

## 6.8 Accidental Developer Error

For example:

```ts
console.log(update);
```

or:

```ts
console.log(prayerText);
```

This can expose sensitive data through logs even without an attacker.

---

## 6.9 Identity Inference

A person may identify a submitter from the content itself even when no technical identity data is stored.

This is one of the most important threats because it cannot be solved purely with encryption.

---

# 7. Threat Rating Method

We classify threats using:

### Severity

- Critical
- High
- Medium
- Low

### Likelihood

- High
- Medium
- Low

The combination helps determine which controls must exist before production.

---

# 8. Threat T01 — Telegram Identity Stored With Prayer Request

### Description

The backend stores something like:

```text
telegramUserId: 123456789
prayerText: "Please pray for me..."
```

This directly destroys the intended anonymity model.

### Impact

**Critical**

Anyone with database access could connect the person to the sensitive request.

### Likelihood

**Medium to High**

Very easy to implement accidentally.

### Required protection

The prayer-request model must not contain Telegram identity fields.

Do not create:

```ts
telegramUserId;
telegramChatId;
username;
firstName;
lastName;
```

inside the prayer-request record.

### Security requirement

> The database must not maintain a persistent identity-to-request relationship.

---

# 9. Threat T02 — Raw Telegram Update Stored

### Description

A developer stores the entire incoming Telegram update:

```json
{
  "update_id": "...",
  "message": {
    "from": {...},
    "chat": {...},
    "text": "..."
  }
}
```

### Impact

**Critical**

The raw update can contain exactly the identity and message information that the system is trying to separate.

### Likelihood

**High**

Common debugging practice can cause this.

### Required protection

Never store raw Telegram updates in production.

Process the required information and discard the rest.

---

# 10. Threat T03 — Original Message Forwarded to Prayer Group

### Description

The bot forwards the student's original Telegram message instead of constructing a new one.

Telegram's Bot API has explicit forwarding functionality, meaning forwarding is a distinct operation from creating a new message.

### Impact

**Critical**

The original message can retain forwarding/source context that our anonymity model is trying to eliminate.

### Likelihood

**Medium**

Technically easy and tempting.

### Required protection

Never use the student's original message as the weekly publication object.

Instead:

```text
Original message
      ↓
Extract request text
      ↓
Store anonymous request
      ↓
Later create NEW message
      ↓
Send with bot
```

---

# 11. Threat T04 — User Identifies Themselves in the Prayer Text

### Description

The user writes:

> "My name is Abebe, I am a fourth-year Computer Engineering student..."

### Impact

**High to Critical**

The system cannot remove identity information that the user intentionally puts inside the request.

### Required protection

Before submission, clearly instruct users not to include identifying details.

The bot should warn in both Amharic and English.

### Important principle

> Technical anonymity cannot guarantee content anonymity.

---

# 12. Threat T05 — Unique Personal Details Allow Identification

### Description

Even without a name, the request could say:

> "Please pray for my family after what happened at yesterday's fellowship meeting."

People may recognize the event or situation.

### Impact

**High**

### Required protection

Explain to students that they should avoid unnecessarily specific information.

Do not attempt automatic AI-based redaction in the MVP because that would introduce another processing system for sensitive information.

---

# 13. Threat T06 — Log Leakage

### Description

Sensitive information is accidentally written into:

```text
application logs
error logs
hosting logs
debug logs
```

Examples:

```ts
console.log(update);
console.log(prayerText);
```

### Impact

**Critical**

A developer or hosting provider could potentially access the information.

### Required protection

Production logs must not include:

- Prayer content
- Telegram IDs
- usernames
- names
- phone numbers
- raw Telegram updates

Use structured technical events instead.

---

# 14. Threat T07 — Database Compromise

### Description

An attacker obtains unauthorized access to MongoDB.

### Impact

**Critical**

Prayer requests may be exposed.

### Required protection

Use multiple layers:

```text
Strong database credentials
        +
Network access control
        +
Encryption at rest where available
        +
Application-level encryption
        +
Minimal stored data
```

Prayer text should be encrypted before being written to the application database.

---

# 15. Threat T08 — Encryption Key Compromise

### Description

The attacker obtains the key used to encrypt prayer requests.

### Impact

**Critical**

Stored ciphertext may become readable.

### Required protection

The encryption key must:

- Never be stored in MongoDB
- Never be committed to Git
- Never be placed in frontend code
- Never be printed in logs
- Be supplied through secure deployment secrets
- Be accessible only to the backend processes that need it

---

# 16. Threat T09 — Bot Token Compromise

### Description

Someone obtains the Telegram bot token.

### Impact

**Critical**

The attacker could potentially control bot operations.

### Common causes

```text
.env committed to GitHub
Token pasted into chat
Token included in screenshots
Token stored in frontend code
Token included in logs
```

### Required protection

Store it only in secure server-side secrets.

If compromised, rotate/revoke the token immediately.

---

# 17. Threat T10 — Webhook Spoofing

### Description

An attacker sends fake requests to the bot's webhook endpoint.

### Impact

**High**

Could result in unauthorized or malicious bot behavior.

### Required protection

Use HTTPS and Telegram webhook verification mechanisms, including a secret webhook path/token. Telegram documents this as a recommended way to help ensure webhook requests are coming from Telegram.

Also validate incoming data and reject malformed/unexpected requests.

---

# 18. Threat T11 — Injection Through Prayer Text

### Description

A malicious user submits content designed to manipulate how the weekly group message is rendered.

For example:

```text
HTML/Markdown formatting
mentions
links
commands
special Telegram entities
```

Telegram automatically recognizes certain entities such as usernames, URLs, hashtags, and bot commands in messages, so message construction needs careful handling.

### Impact

**Medium to High**

Could cause:

- misleading formatting
- unintended mentions
- malicious links
- broken weekly digest
- confusion among prayer-team members

### Required protection

Treat prayer text as untrusted input.

When constructing the weekly digest:

- escape formatting correctly
- avoid executing any user-supplied commands
- do not interpret arbitrary HTML/Markdown as trusted markup
- validate length
- choose a safe formatting strategy

---

# 19. Threat T12 — Weekly Dispatch Sends Nothing When There Are No Requests

### Description

The scheduler sends a message even though the collection contains zero requests.

Example:

```text
🙏 Weekly Prayer Requests

There are no requests this week.
```

### Impact

**Medium**

This violates the defined privacy and operational requirement.

It can reveal activity information and creates unnecessary communication.

### Required protection

The scheduler must first query for eligible requests.

```text
eligibleRequests.length === 0
        ↓
SEND NOTHING
```

It may record:

```text
weekly_dispatch_skipped_no_requests
```

in technical logs.

---

# 20. Threat T13 — Timing Inference

### Description

Suppose a student submits a request shortly after a very specific event.

Even without identity data, members of the fellowship could infer who probably submitted it.

### Impact

**High**

### Required protection

Do not expose:

- exact original submission time
- exact submission date
- exact time ordering

in the weekly group message.

The weekly digest should not say:

```text
Submitted Friday 11:42 PM
```

Instead, requests should look uniform.

---

# 21. Threat T14 — Ordering Reveals Information

### Description

If requests are sent in exactly the order they were submitted, someone may infer who submitted the first or last request based on known events.

### Protection

Randomize the order of eligible requests when generating the weekly digest.

Example:

```text
Database order:
A
B
C
D

Published order:
C
A
D
B
```

The order should not encode submission time.

---

# 22. Threat T15 — Single-Request Week

### Description

If only one person submits a prayer request during an entire week, everyone in the prayer group may realize:

> "There was only one request. It might be from this particular person."

Even with perfect technical separation, a very small group of requests may make the information socially identifiable.

### Impact

**High**

### Protection options

This is an architectural/privacy decision that must be discussed with the fellowship.

Possible future control:

```text
Minimum publication threshold
```

For example, do not publish until there are at least N requests.

However, this creates a tradeoff because a request may have to wait an additional week.

### MVP decision

For the initial MVP:

> The system should still follow the weekly-dispatch requirement and should NOT silently introduce an arbitrary minimum threshold.

The potential "small-batch inference" issue should remain explicitly documented for future policy discussion.

---

# 23. Threat T16 — Weekly Digest Reveals Total Number of Requests

### Description

A message says:

```text
12 anonymous prayer requests this week
```

That may reveal more information than necessary, especially in a small fellowship.

### Protection

Do not display a request count by default.

Simply publish the requests.

---

# 24. Threat T17 — Language Preference Creates Identity Linkage

### Description

The bot remembers:

```text
Telegram ID 12345 → Amharic
```

and later:

```text
Telegram ID 12345 → Prayer Request X
```

This can create an indirect identity-to-request relationship.

### Impact

**High**

### Protection

The architecture must separate:

```text
User interaction state
```

from:

```text
Prayer request identity
```

If temporary session storage is necessary, it must have a short TTL and must not reference the prayer request record.

---

# 25. Threat T18 — Duplicate Weekly Publication

### Description

A scheduler runs twice or fails after sending but before updating the database.

Result:

```text
PR-7F29
        ↓
Published
        ↓
Scheduler retries
        ↓
PR-7F29 published again
```

### Impact

**Medium**

Creates confusion and unnecessary exposure.

### Protection

Use idempotent dispatch logic.

The system needs an explicit publication state and a safe strategy for handling:

```text
send succeeded
database update failed
```

This should be designed carefully before implementation.

---

# 26. Threat T19 — Partial Weekly Dispatch

### Description

The bot has:

```text
10 requests

Requests 1-7 → sent
Requests 8-10 → failed
```

### Impact

**Medium to High**

Some requests may be missed or duplicated during retry.

### Protection

Track publication state individually or through an explicit dispatch transaction/state machine.

The system must never assume:

```text
job started = all messages successfully delivered
```

---

# 27. Threat T20 — Database Deletion Failure

### Description

The application attempts to delete an expired request but the deletion fails.

### Impact

**High**

Sensitive data may remain longer than intended.

### Protection

Use:

- automatic expiration process
- deletion monitoring
- error reporting without logging the request content
- periodic verification of expired-record cleanup

The deletion system itself must not reintroduce the sensitive data into logs.

---

# 28. Threat T21 — Backup Retention

### Description

The application deletes a request from the live database, but an old database backup still contains it.

### Impact

**High**

The request technically still exists.

### Protection

The final retention policy must consider:

```text
Primary database
Backups
Snapshots
Hosting-provider backups
Disaster recovery copies
```

Backups should have a defined lifecycle consistent with the project's privacy policy.

---

# 29. Threat T22 — Prayer Team Member Shares a Request

### Description

A legitimate member screenshots or forwards a prayer request outside the team.

### Impact

**High**

The application can no longer control the information once authorized humans receive it.

### Protection

Technical controls:

- restrict membership
- keep the group private
- use bot-generated messages
- optionally use Telegram content-protection features where appropriate

Organizational controls:

- prayer-team confidentiality agreement
- clear handling rules
- remove members when their role ends
- educate team members about anonymity

### Important principle

> Software cannot completely prevent a trusted human from intentionally disclosing information they can see.

---

# 30. Threat T23 — Compromised Prayer-Team Telegram Account

### Description

A member's Telegram account is compromised.

### Impact

**High**

The attacker may gain access to the weekly prayer requests in the group.

### Protection

The fellowship should establish account-security requirements for prayer-team members, especially:

- strong account security
- Telegram two-step verification
- device security
- immediate removal of compromised members from the group

---

# 31. Threat T24 — Unauthorized Person Added to the Pray Team Group

### Description

An unauthorized person gains membership in the prayer group.

### Impact

**Critical**

They could read sensitive requests.

### Protection

The group must be private.

Membership should be manually controlled by authorized fellowship leadership.

The bot itself should not be responsible for deciding who is spiritually or organizationally authorized to view requests.

---

# 32. Threat T25 — Admin/Developer Accidentally Views Requests

### Description

A developer connects directly to the production database and can read decrypted requests.

### Impact

**High**

### Protection

Use least privilege.

The application should not expose decrypted prayer content to technical personnel unnecessarily.

Future admin tools should themselves use authorization and auditing.

---

# 33. Threat T26 — Malicious User Floods the Bot

### Description

Someone submits hundreds or thousands of requests.

### Impact

**Medium**

Could:

- overwhelm the database
- overload the weekly digest
- hide legitimate requests
- increase operating cost
- degrade availability

### Protection

Use privacy-conscious rate limiting and input-size limits.

Avoid permanent user tracking merely to implement rate limiting unless the fellowship explicitly accepts the privacy tradeoff.

---

# 34. Threat T27 — Extremely Long Prayer Request

### Description

A user submits an unexpectedly large message.

### Impact

**Medium**

Could cause:

- oversized database records
- oversized Telegram messages
- memory pressure
- failed weekly publication

### Protection

Define:

```text
Maximum request length
```

and validate it before storage.

The weekly digest generator must also safely split large batches/messages.

---

# 35. Threat T28 — Malicious Links or Mentions

### Description

A prayer request includes a malicious URL or an unintended username mention.

### Impact

**Medium**

### Protection

Use plain-text rendering where practical.

Do not intentionally create clickable links from arbitrary user content.

Avoid unnecessary Telegram entities.

---

# 36. Threat T29 — Sensitive Data in Error Reporting Service

### Description

An external error-monitoring service receives:

```text
request body
Telegram update
database record
```

and therefore stores sensitive information outside the main system.

### Impact

**Critical**

### Protection

Any error-reporting/monitoring system must be configured to scrub:

```text
message
body
Telegram update
authorization headers
tokens
request content
```

A third-party service should not receive prayer content unless there is a specific, justified, privacy-reviewed reason.

---

# 37. Threat T30 — AI/Third-Party Processing Leakage

### Description

A future developer sends prayer requests to an external AI service for:

```text
classification
summarization
translation
moderation
```

### Impact

**Critical**

This creates a new data processor and additional privacy boundary.

### Protection

Do not introduce AI processing into the MVP.

Any future AI feature requires a separate privacy and security review.

---

# 38. Threat T31 — Bot Token or Secret in GitHub

### Description

A developer accidentally commits:

```text
.env
TELEGRAM_BOT_TOKEN
MONGODB_URI
ENCRYPTION_KEY
```

### Impact

**Critical**

### Protection

Use:

```text
.env
.env.local
```

with `.gitignore`.

Use deployment secrets in production.

Use secret-scanning tools where available.

---

# 39. Threat T32 — Insecure Development Database

### Description

During development, sensitive real prayer requests are used in a local database with weak security.

### Impact

**High**

### Protection

Never use real sensitive requests for ordinary development/testing.

Use synthetic test data such as:

```text
TEST-PR-001
Please pray for my exam.
```

Real prayer requests should never become developer test fixtures.

---

# 40. Threat T33 — Identity Leakage Through Screenshots and Documentation

### Description

A developer or team member screenshots the database, Telegram updates, or bot messages and places them in:

```text
GitHub
README
presentation
class assignment
portfolio
AI conversation
documentation
```

### Impact

**Critical**

### Protection

Only use synthetic/redacted examples.

Never use real fellowship prayer requests in technical documentation or public demonstrations.

---

# 41. Threat T34 — Uncontrolled Access to Production Environment

### Description

Too many people possess:

```text
server access
MongoDB credentials
hosting dashboard access
bot token
encryption key
GitHub deployment access
```

### Impact

**Critical**

### Protection

Apply least privilege.

The number of people with production access should be kept as small as practical.

Separate:

```text
developer access
database access
deployment access
bot administration
```

where practical.

---

# 42. Threat T35 — Loss of Encryption Key

### Description

The encryption key is deleted or lost.

### Impact

**Critical for availability**

Encrypted prayer requests may become permanently unreadable.

### Protection

A secure key-recovery/backup strategy must exist.

However, the backup must be protected as carefully as the primary key.

This is an important tradeoff:

```text
More key copies → better recoverability
More key copies → larger exposure surface
```

The final key-management strategy must balance both.

---

# 43. Threat T36 — Scheduled Job Executes at Wrong Time

### Description

A timezone/configuration mistake causes weekly dispatch to occur:

```text
too early
too late
multiple times
on the wrong day
```

### Impact

**Medium**

### Protection

Store the schedule explicitly with timezone information.

The fellowship's actual intended timezone must be documented.

The scheduler should be idempotent so an unexpected duplicate execution does not automatically produce duplicate publication.

---

# 44. Threat T37 — Publication Includes Expired Requests

### Description

The scheduler accidentally publishes requests that should already have been deleted or excluded.

### Impact

**High**

### Protection

The dispatch query must include explicit eligibility conditions:

```text
published = false
AND
expiresAt > now
```

Expired requests should never enter the publication pipeline.

---

# 45. Threat T38 — Request Modified After Submission

### Description

A bug or unauthorized database operation changes the content before weekly publication.

### Impact

**High**

Prayer content could be distorted.

### Protection

The MVP should treat a submitted prayer request as immutable.

If editing is ever introduced, it must be a deliberate, authenticated operation.

---

# 46. Threat T39 — Request ID Reveals Information

### Description

A request ID is generated from:

```text
Telegram user ID
timestamp
database sequence
```

For example:

```text
PR-123456789
```

### Impact

**Medium to High**

This can create indirect information leakage.

### Protection

Use a cryptographically random identifier that does not encode:

- Telegram identity
- submission time
- database position
- other sensitive information

---

# 47. Threat T40 — User Tries to Use the Bot as a Communication Channel

### Description

Someone attempts to use a prayer request to send a message specifically intended for a known prayer-team member.

Example:

> "Brother X, you know what happened yesterday..."

### Impact

**Medium to High**

May reveal identity or private interpersonal information.

### Protection

The bot should clearly establish that submissions are prayer requests rather than private communication channels.

---

# 48. Threat Summary Matrix

| ID  | Threat                            | Severity | Likelihood | Primary Control                    |
| --- | --------------------------------- | -------: | ---------: | ---------------------------------- |
| T01 | Identity stored with request      | Critical |       High | No identity field in request model |
| T02 | Raw Telegram update stored        | Critical |       High | Discard raw update                 |
| T03 | Original message forwarded        | Critical |     Medium | Generate a new message             |
| T04 | User names themselves             |     High |       High | Privacy instructions               |
| T05 | Personal details enable inference |     High |       High | Minimize user-provided details     |
| T06 | Logs leak sensitive data          | Critical |       High | Content-free logging               |
| T07 | Database compromise               | Critical |     Medium | Encryption + access control        |
| T08 | Encryption key compromise         | Critical |     Medium | Secure secret management           |
| T09 | Bot token compromise              | Critical |     Medium | Secret management + rotation       |
| T10 | Webhook spoofing                  |     High |     Medium | HTTPS + webhook secret             |
| T11 | Input/format injection            |     High |     Medium | Escape/sanitize output             |
| T12 | Empty weekly dispatch             |   Medium |     Medium | Skip if zero requests              |
| T13 | Timing inference                  |     High |     Medium | No timestamps in group             |
| T14 | Submission-order inference        |     High |     Medium | Randomize publication order        |
| T15 | Single-request inference          |     High |     Medium | Future policy decision             |
| T16 | Request count disclosure          |   Medium |     Medium | Do not show count                  |
| T17 | Language preference linkage       |     High |     Medium | Short-lived/session-only state     |
| T18 | Duplicate publication             |   Medium |     Medium | Idempotent dispatch                |
| T19 | Partial publication               |     High |     Medium | Per-request dispatch state         |
| T20 | Failed deletion                   |     High |     Medium | Expiration + monitoring            |
| T21 | Backup retention                  |     High |     Medium | Defined backup lifecycle           |
| T22 | Team member disclosure            |     High |     Medium | Confidentiality policy             |
| T23 | Team account compromise           |     High |     Medium | Account security                   |
| T24 | Unauthorized group member         | Critical |     Medium | Private controlled group           |
| T25 | Developer access to plaintext     |     High |     Medium | Least privilege                    |
| T26 | Spam/flooding                     |   Medium |       High | Privacy-conscious rate limiting    |
| T27 | Oversized request                 |   Medium |     Medium | Maximum length                     |
| T28 | Malicious links/mentions          |   Medium |     Medium | Safe rendering                     |
| T29 | Error-monitoring leakage          | Critical |     Medium | Data scrubbing                     |
| T30 | AI/third-party leakage            | Critical |     Medium | No AI in MVP                       |
| T31 | Secret committed to Git           | Critical |     Medium | `.gitignore` + secrets             |
| T32 | Real data in development          |     High |     Medium | Synthetic test data                |
| T33 | Screenshots/docs expose requests  | Critical |     Medium | Redacted/synthetic examples        |
| T34 | Excess production access          | Critical |     Medium | Least privilege                    |
| T35 | Lost encryption key               | Critical | Low/Medium | Secure key recovery                |
| T36 | Scheduler timing error            |   Medium |     Medium | Timezone + idempotency             |
| T37 | Expired request published         |     High | Low/Medium | Eligibility query                  |
| T38 | Request altered                   |     High | Low/Medium | Immutable request model            |
| T39 | Request ID leaks data             |   Medium |     Medium | Random opaque IDs                  |
| T40 | Bot abused as private messaging   |   Medium |     Medium | Clear usage boundaries             |

---

# 49. Core Security Controls Derived From the Threat Model

The threat model produces the following mandatory controls for the MVP.

## Identity Protection

```text
NO Telegram identity in prayer-request records
NO raw Telegram updates stored
NO original-message forwarding
NO identity encoded in request IDs
```

## Data Protection

```text
Application-level encryption
Secure secret management
Minimal database schema
Automatic expiration/deletion
Controlled backups
```

## Application Security

```text
HTTPS
Webhook verification
Input validation
Safe message rendering
Maximum request size
Rate limiting
Idempotent weekly dispatch
```

## Operational Security

```text
Least privilege
Private Pray Team group
Controlled group membership
Production access restrictions
Privacy-conscious logging
No real prayer requests in development
```

## Human Privacy

```text
Clear privacy notice
Clear anonymity explanation
Instructions against self-identification
Prayer-team confidentiality rules
```

---

# 50. Weekly Dispatch Privacy Design

The weekly scheduler is a particularly important trust boundary.

The secure process should be:

```text
                 WEEKLY JOB
                    │
                    ▼
          Query eligible requests
                    │
                    ▼
           Is count = 0?
             /          \
           YES           NO
            │             │
            ▼             ▼
      Send NOTHING     Randomize order
                          │
                          ▼
                    Decrypt in memory
                          │
                          ▼
                   Build new digest
                          │
                          ▼
                    Send to group
                          │
                          ▼
              Mark successfully sent
```

Important:

The system should not decrypt every request and store the plaintext permanently.

Ideally, plaintext exists only in memory for the shortest practical time necessary to construct the outgoing message.

---

# 51. Weekly Digest Privacy Rules

The weekly group message should:

### Include

```text
Anonymous request ID
Prayer request
General weekly prayer heading
```

### Exclude

```text
Telegram username
Telegram name
Telegram ID
submission timestamp
submission order
user language metadata
internal database ID
IP address
request count
other unnecessary metadata
```

---

# 52. Small-Batch Anonymity

The project has an important non-technical privacy limitation:

> **A technically anonymous request may still be socially identifiable.**

If only one request is published, or if a request describes a uniquely known event, members may infer the sender.

Therefore the system must distinguish:

```text
Technical anonymity
```

from:

```text
Social anonymity
```

The technical architecture can protect the former, but the fellowship must also consider policies for the latter.

Possible future privacy policies include:

```text
minimum batch size
delayed publication
manual review
generalization of timestamps/events
```

Any such policy must be explicitly agreed upon by the fellowship rather than silently added by the software.

---

# 53. Language Privacy

The bot supports:

```text
Amharic
English
```

but language preference must not become an accidental identity identifier.

For example, we must avoid creating a permanent structure like:

```text
Telegram ID
     ↓
Preferred language
     ↓
Request ID
```

Language/session state should be deliberately separated from prayer-request data.

---

# 54. Incident Response

If a privacy breach occurs, the team should have a documented response process.

For example:

```text
1. Detect
2. Stop further exposure
3. Secure compromised credentials
4. Determine what information was affected
5. Remove unauthorized access
6. Rotate secrets if necessary
7. Preserve only necessary technical evidence
8. Delete exposed copies where possible
9. Notify appropriate fellowship leadership
10. Review the root cause
11. Fix the vulnerability
```

Do not publicly investigate a breach by posting the affected prayer requests.

---

# 55. Security Testing Requirements

Before production, the team should deliberately test:

```text
Can a request be linked to a Telegram ID?
Can raw Telegram updates be recovered?
Can an original sender appear in the weekly group?
Can timestamps reveal the sender?
Can the request order reveal the sender?
Does an empty week produce a message?
Can a request be published twice?
Can an expired request be published?
Can malformed text break the digest?
Can a non-member trigger weekly publication?
Can unauthorized people access the database?
Can logs expose the prayer text?
Can test environments accidentally contain real requests?
```

These tests should become part of the project's security test suite.

---

# 56. Security Acceptance Criteria

The MVP should not be considered production-ready unless all of the following are true:

```text
✓ Prayer requests contain no persistent Telegram identity
✓ Raw Telegram updates are not stored
✓ Original Telegram messages are never forwarded
✓ Prayer content is encrypted at rest
✓ Encryption key is outside the database
✓ Production logs contain no prayer text
✓ Production logs contain no unnecessary identity data
✓ Weekly dispatch is scheduled safely
✓ Empty week produces no Telegram group message
✓ Weekly publication does not expose timestamps
✓ Weekly order is not based on submission order
✓ Request IDs contain no identifying information
✓ Expired requests are automatically removed
✓ Duplicate publication is prevented
✓ Failed publication can be retried safely
✓ The Pray Team group is private
✓ Group membership is controlled
✓ Bot secrets are outside source control
✓ Real prayer requests are never used as test data
✓ Webhook requests are protected
✓ User-facing privacy instructions exist in Amharic and English
✓ Safety limitations are communicated
```

---

# 57. Final Threat Model Principle

The most important rule for this project is:

> **Do not ask only "Can an attacker access the database?" Ask "At any point in the entire lifecycle, can someone connect this sensitive prayer request to the person who submitted it?"**

That means examining:

```text
Telegram metadata
       ↓
Application state
       ↓
Database
       ↓
Logs
       ↓
Backups
       ↓
Scheduler
       ↓
Weekly publication
       ↓
Prayer-team access
       ↓
Human inference
```

The system is considered privacy-conscious only when every stage is designed with this question in mind.
