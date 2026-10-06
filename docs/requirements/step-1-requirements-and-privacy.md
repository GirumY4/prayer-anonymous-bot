# Anonymous Prayer Request Bot

## Christian Students Fellowship — Pray Team

**Document:** Step 1 — Requirements & Privacy Rules
**Recommended path:** `docs/requirements/step-1-requirements-and-privacy.md`

---

# 1. Project Purpose

The system is a privacy-conscious Telegram bot that allows members of a Christian Students Fellowship community to submit prayer requests anonymously.

Prayer requests may contain highly sensitive and deeply personal information, including addiction, family problems, spiritual struggles, relationships, academic difficulties, temptation, or other private matters.

Because of the sensitive nature of these requests, **privacy is a primary system requirement**.

The primary MVP purpose is:

> **Collect anonymous prayer requests during the week and send them to the Pray Team Telegram group once per week for collective prayer.**

The initial MVP will not include a web-based administrative console. The admin console will be considered in a later phase.

---

# 2. Primary Users

## 2.1 Prayer Request Submitter

A fellowship member who privately interacts with the Telegram bot and submits a prayer request.

The submitter should not need to provide:

- Name
- Telegram username
- Phone number
- Student ID
- Department
- Year
- Email
- Gender
- Address
- Any other unnecessary identifying information

The bot must not ask for these details.

---

## 2.2 Pray Team

Authorized members of the fellowship's prayer team.

In the MVP, they receive the weekly prayer requests through a private Telegram group.

They should receive only:

- Anonymous request ID
- Prayer request content
- Optional date/week information that does not identify the submitter

They must not receive:

- Telegram username
- Telegram name
- Telegram ID
- Chat ID
- Phone number
- Profile photo
- Original Telegram message metadata
- Any internal technical identifier that can identify the submitter

---

## 2.3 System Administrator

The administrator is responsible for the technical operation of the system.

For the MVP, there does not need to be an admin web console.

Administrative operations may initially be handled through secure server configuration and controlled maintenance procedures.

A web-based admin console will be considered in a future phase.

---

# 3. Language Requirements

The bot must support:

- Amharic
- English

## 3.1 Initial Language

**Amharic must be the default language when a user first starts interacting with the bot.**

The initial `/start` experience should therefore be presented in Amharic.

## 3.2 Language Selection

During initial setup, the bot should prompt the user to select their preferred language.

Example:

```text
እባክዎ የሚመርጡትን ቋንቋ ይምረጡ።

Please choose your language.

[🇪🇹 አማርኛ]
[🇬🇧 English]
```

If the user selects Amharic, the bot continues in Amharic.

If the user selects English, the bot switches to English.

## 3.3 Language Persistence

The user's language preference should be remembered only to provide a consistent user experience.

However, the language preference must not be stored together with the prayer request in a way that creates an identity linkage.

The system should consider whether the Telegram identifier needed for remembering language preference can be handled temporarily or through a privacy-preserving mechanism.

This should be addressed explicitly during architecture and threat-model design.

## 3.4 Language Switching

The bot should provide a way for the user to change language later.

For example:

```text
🌐 Change Language
```

or a command such as:

```text
/language
```

The exact interface can be decided during the UX design phase.

---

# 4. Core User Flow

The primary flow is:

```text
Student
   │
   │ Private Telegram chat
   ▼
Prayer Bot
   │
   ├── Initial language selection
   │
   ├── Privacy notice
   │
   └── Prayer request submission
   │
   ▼
Temporary processing
   │
   ├── Extract prayer content
   ├── Generate anonymous request ID
   ├── Encrypt sensitive content
   └── Remove/discard unnecessary Telegram identity information
   │
   ▼
Secure storage
   │
   │ During the week
   ▼
Weekly scheduled dispatch
   │
   ├── If requests exist → send weekly digest
   │
   └── If no requests exist → send NOTHING
   │
   ▼
Pray Team Telegram Group
   │
   ▼
Collective prayer
```

The system must not immediately send a request to the prayer-team group when it is submitted.

---

# 5. Telegram Interaction Requirements

## 5.1 Private Chat Only

Prayer requests must be submitted through a one-to-one private conversation between the student and the bot.

The bot should not require students to submit prayer requests inside a public fellowship group.

---

## 5.2 `/start`

The first interaction must begin in Amharic and present the language-selection option.

The initial flow should:

1. Welcome the user.
2. Allow them to choose Amharic or English.
3. Show the privacy notice.
4. Explain how anonymous submission works.
5. Allow the user to submit a prayer request.

---

# 6. Prayer Request Submission

After language selection, the bot should clearly explain what the student may submit.

The wording should be available in both languages.

The user should be told that they may share something personal, while also being instructed not to include identifying information.

The exact Amharic and English wording will be designed during the UX/content phase.

---

# 7. Anonymous Identity Requirements

This is one of the most important system requirements.

Telegram may provide the bot with information about the sender while processing the incoming message.

The application may temporarily receive such information as part of Telegram's normal bot operation, but the application must not retain the sender's identity together with the prayer request.

The database must not contain a relationship such as:

```text
Telegram User ID → Prayer Request
```

or:

```text
Username → Prayer Request
```

The application must not intentionally persist:

```text
telegramUserId
telegramChatId
username
firstName
lastName
phoneNumber
profilePhoto
```

as part of the prayer-request record.

---

# 8. Never Forward the Original Telegram Message

This is a critical privacy requirement.

The bot must **not simply forward the student's original Telegram message** into the prayer-team group.

The system should instead:

1. Receive the request.
2. Extract the prayer text.
3. Create a new anonymous request record.
4. Generate an anonymous request ID.
5. Later construct a completely new Telegram message.
6. Send that new message from the bot to the Pray Team group.

Conceptually:

```text
Student's original Telegram message
            │
            X
      DO NOT FORWARD
            │
            ▼
      Extract content
            │
            ▼
      New bot-generated message
            │
            ▼
      Pray Team Group
```

---

# 9. Anonymous Request ID

Each request should receive a random identifier.

Example:

```text
PR-7F29
PR-A83C
PR-41D2
```

The ID must:

- Be randomly generated
- Contain no Telegram ID
- Contain no username
- Contain no encoded personal information
- Not be reversible into the submitter's identity

---

# 10. Data Minimization

The principle is:

> **Collect the minimum amount of information necessary to perform the prayer-request function.**

A request record should contain approximately:

```text
requestId
encryptedPrayerContent
createdAt
publicationStatus
expiresAt
```

Noticeably absent:

```text
telegramUserId
telegramChatId
username
name
phoneNumber
```

---

# 11. Sensitive Data Protection

Prayer requests may contain highly sensitive information.

The application should encrypt the stored prayer-request content before saving it to the database.

Recommended approach:

```text
AES-256-GCM
```

The encryption key must be stored separately from the database, preferably as a secure deployment secret/environment secret.

The database must never store the encryption key alongside the encrypted prayer requests.

---

# 12. Logging Requirements

Production logging must not contain the prayer request itself or unnecessary Telegram identity information.

Avoid:

```ts
console.log(update);
```

Avoid:

```ts
console.log(prayerText);
```

Prefer technical events such as:

```text
prayer_request_received
prayer_request_stored
weekly_dispatch_started
weekly_dispatch_completed
weekly_dispatch_skipped_no_requests
prayer_request_expired
```

The system should explicitly record the fact that a weekly dispatch was skipped because there were no requests, but it must not expose sensitive request content.

---

# 13. Weekly Dispatch — Core MVP Feature

The bot must collect requests throughout the week.

On one configurable day and time each week, the bot must process the week's eligible requests.

The exact day and time should be configurable rather than permanently hard-coded.

Example:

```text
Monday ───────────────── Saturday
          Collection

               ↓

        Weekly Dispatch
               ↓
        ┌──────┴──────┐
        │             │
  Requests exist   No requests
        │             │
        ▼             ▼
 Send digest        Send NOTHING
        │
        ▼
 Pray Team Group
```

---

# 14. Empty-Week Requirement

This is an explicit functional requirement.

> **The bot must not send anything to the Pray Team Telegram group when there are no eligible prayer requests for that week's dispatch.**

For example, if zero requests have been submitted during the collection period:

```text
Eligible requests = 0
```

then the scheduled job should:

```text
Check requests
      ↓
Count = 0
      ↓
Do not send Telegram message
      ↓
Record technical event
      ↓
Finish
```

It must **not** send:

```text
🙏 Weekly Prayer Requests

There are no prayer requests this week.
```

unless the fellowship deliberately chooses to add such a feature in a future version.

The default MVP behavior is complete silence in the prayer-team group when the weekly collection is empty.

A technical log may record:

```text
weekly_dispatch_skipped_no_requests
```

but nothing should be posted to the group.

---

# 15. Weekly Dispatch Behavior When Requests Exist

At the scheduled time, the system should:

1. Find all unpublished, unexpired prayer requests.
2. Prepare anonymous versions.
3. Generate the weekly digest.
4. Send the digest to the private Pray Team group.
5. Mark successfully published requests as `published`.
6. Prevent the same requests from being published twice.
7. Record technical dispatch information without recording the submitter's identity.

---

# 16. Weekly Message Format

The bot should generate a fresh message rather than forwarding original messages.

Example:

```text
🙏 Weekly Anonymous Prayer Requests
Christian Students Fellowship — Pray Team

Please keep these requests in prayer.

────────────────────

PR-7F29

Please pray for me. I have been struggling
with pornography addiction and I want God to
help me overcome it.

────────────────────

PR-A83C

Please pray for my family and for wisdom
regarding an important situation.

────────────────────

PR-41D2

Please pray for me as I struggle with fear,
temptation, and spiritual weakness.

────────────────────

May God strengthen everyone who submitted
these requests. 🙏
```

The actual wording should eventually be available appropriately in the fellowship's chosen group language.

The request text itself should remain in the language submitted by the user unless a future translation feature is deliberately introduced.

---

# 17. Weekly Digest Size

The initial MVP should preferably use a single weekly digest containing multiple anonymous requests.

If the number of requests becomes too large for one Telegram message, the system should split the digest into multiple bot-generated messages.

The splitting logic must preserve:

- request IDs
- complete request content
- ordering
- no duplication
- no truncation

---

# 18. Dispatch Failure Handling

The system must account for partial failures.

Example:

```text
Request 1 → Sent
Request 2 → Sent
Request 3 → Failed
Request 4 → Sent
```

The system must not mark Request 3 as successfully published.

A retry mechanism should publish only requests that remain unpublished.

The system must be designed to prevent duplicate weekly publication.

---

# 19. Retention Requirements

Sensitive information must not remain indefinitely.

Every request must have an expiration time.

Example:

```text
Submission
   ↓
Secure storage
   ↓
Weekly dispatch
   ↓
Limited retention
   ↓
Automatic deletion
```

The fellowship must choose an exact retention period during the next requirements stage.

The important requirement is:

> **There must be an explicit deletion policy rather than indefinite storage.**

---

# 20. Telegram Group Retention

Database retention and Telegram-group retention are separate issues.

Sending a request to the prayer-team group creates another copy of the information.

Therefore the fellowship should establish how long weekly prayer-request messages should remain accessible in the group.

The system may later automate deletion of old bot-generated prayer posts where technically and operationally appropriate.

---

# 21. User Confirmation

After successful storage, the bot should confirm submission in the user's selected language.

The confirmation should communicate that:

- The prayer request has been received.
- It will be included anonymously in the next weekly collection.
- The request has an anonymous request ID.
- The user should avoid identifying information.

---

# 22. Cancellation

Before final submission, the user should be able to cancel.

When cancelled, the draft request should be discarded rather than stored as a prayer request.

---

# 23. Language-Specific User Experience

The bot's normal user-facing content must exist in both:

```text
አማርኛ
English
```

This includes, at minimum:

- Welcome message
- Language selection
- Privacy notice
- Submission instructions
- Confirmation
- Cancellation
- Error messages
- Help/privacy information
- Language-switching interface
- Rate-limit messages
- Safety notice

The system should avoid scattering translated strings throughout the source code.

Instead, translations should use a centralized localization structure, for example:

```text
locales/
├── am/
│   └── messages.ts
└── en/
    └── messages.ts
```

The exact implementation will be determined during architecture design.

---

# 24. Abuse and Spam Protection

The system should have basic abuse protection so that someone cannot flood the bot with thousands of requests.

However, anti-spam controls must be designed carefully.

Permanent storage of Telegram IDs solely for rate limiting should not be introduced casually because it weakens the anonymity model.

Prefer privacy-preserving approaches such as:

- Temporary/in-memory rate limits where practical
- Maximum request length
- Temporary session controls
- Reasonable submission-frequency limits
- Server-side protection

Any design that permanently stores Telegram identity information must be treated as a deliberate privacy tradeoff and documented.

---

# 25. Safety / Emergency Limitation

This bot is a prayer-request system, not an emergency-response service.

The bot should communicate this in both supported languages.

It should explain that people facing immediate danger or serious harm should contact a trusted person or an appropriate emergency/help service directly.

The bot should not imply that anonymous submissions can always be followed up personally.

---

# 26. MVP Functional Requirements

The MVP must support:

```text
FR-01  /start
FR-02  Initial Amharic experience
FR-03  Language selection
FR-04  English interface
FR-05  Amharic interface
FR-06  Language switching
FR-07  Privacy notice
FR-08  Private prayer-request submission
FR-09  Cancel submission
FR-10  Prayer-request validation
FR-11  Random anonymous request ID
FR-12  Encryption of stored prayer content
FR-13  Secure database storage
FR-14  Weekly scheduled dispatch
FR-15  Weekly anonymous digest
FR-16  No group message when there are zero requests
FR-17  Delivery to Pray Team Telegram group
FR-18  Duplicate-dispatch prevention
FR-19  Dispatch failure handling
FR-20  Request expiration
FR-21  Automatic deletion
FR-22  Privacy-conscious production logging
```

---

# 27. Security Requirements

The MVP should include:

```text
HTTPS
Secure secret/environment management
Encrypted sensitive content
Secure MongoDB credentials
Least-privilege access
Webhook security
Rate limiting
Input validation
No sensitive information in logs
No Telegram identity stored with prayer requests
Secure scheduled-job handling
```

---

# 28. Non-Functional Requirements

### Privacy

Privacy must be a fundamental architectural principle.

### Security

Sensitive requests must be protected during transmission and storage.

### Reliability

The weekly dispatch process must operate consistently.

### Simplicity

The student interaction should require very few steps.

### Bilingual UX

The same core workflow must be available in Amharic and English.

### Maintainability

The codebase should use clear modules and separation of responsibilities.

### Auditability

Important technical events should be recorded without unnecessarily recording sensitive content.

### Recoverability

The system should have a safe recovery strategy that respects the retention policy.

---

# 29. Explicitly Out of Scope for MVP

The first version will NOT include:

```text
Web admin dashboard
Student accounts
Student registration
Names/profiles
Prayer-request comments
Private communication between prayer team and submitter
Public prayer-request pages
Identity tracking
Advanced analytics
Mobile application
AI classification of prayer requests
Automatic translation of prayer requests
```

Automatic translation may be considered separately in the future, but it should not be assumed that sending sensitive prayer content to a third-party AI service is privacy-neutral.

---

# 30. Future Phase: Admin Console

After the Telegram-based MVP works reliably, a secure web-based admin console may be added.

Possible features:

```text
View requests
Mark requests as prayed
Delete requests
View weekly dispatch status
Manage dispatch schedule
Manage authorized prayer-team members
View system health
```

The admin console must preserve the same anonymity model.

---

# 31. Fundamental Privacy Principles

### Data minimization

Do not collect information that is not necessary.

### Purpose limitation

Prayer-request information must not be repurposed for unrelated purposes.

### Privacy by design

Privacy controls must be part of the architecture from the beginning.

### Limited retention

Sensitive information should be deleted when no longer needed.

### Least privilege

Only authorized people should have access to the prayer requests.

### Transparency

Users should understand how the system works before submitting sensitive information.

### No identity linkage

The system must not maintain a relationship between a prayer request and the submitter's Telegram identity.

### No unnecessary weekly notifications

The prayer-team group should receive a weekly digest only when there are eligible requests.

---

# 32. One-Sentence MVP Definition

> **A bilingual, private Telegram bot that initially welcomes users in Amharic, lets them choose Amharic or English, anonymously collects sensitive prayer requests throughout the week, securely stores them with minimal identifying information, and automatically sends a newly generated anonymous weekly collection to the Pray Team Telegram group only when requests exist, after which the requests are retained only for the defined limited period.**
