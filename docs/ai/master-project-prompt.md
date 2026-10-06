I am working with a Christian Students Fellowship at a university.

Our fellowship has a team called the "Pray Team." The team's responsibility includes encouraging students to pray and helping organize prayer activities.

We want to build a professional Telegram bot that allows fellowship members to submit prayer requests anonymously.

The requests may contain highly sensitive and deeply personal information, for example struggles with pornography addiction, drug addiction, family problems, spiritual struggles, relationship problems, academic struggles, temptation, or other private matters.

Because of the sensitive nature of these requests, **PRIVACY IS THE PRIMARY SYSTEM REQUIREMENT.**

# Core privacy objective

The fellowship and the Pray Team should not know who submitted a prayer request.

Important distinction:

Telegram itself may provide the bot with sender/chat information while delivering a message. Therefore, "anonymous" does NOT mean Telegram itself cannot technically know the sender.

Instead, our application must be designed so that:

- The application does not retain the submitter's Telegram identity with the prayer request.
- The application does not store Telegram username/name/ID as part of the request record.
- The Pray Team does not receive the submitter's identity.
- The original Telegram message must not simply be forwarded into the prayer group.
- The bot should extract the prayer text and later generate a new anonymous Telegram message.
- Sensitive prayer content must be protected in storage.
- Production logs must not contain prayer content or unnecessary identity information.
- Requests must have a defined retention period and must eventually be deleted.

# Core MVP workflow

The bot is primarily a PRIVATE one-to-one Telegram bot.

The flow should be:

Student
→ opens the Telegram bot privately
→ initially sees the bot in Amharic
→ chooses Amharic or English
→ sees the privacy notice
→ chooses to submit a prayer request
→ writes their prayer request
→ bot validates it
→ system generates a random anonymous request ID
→ prayer content is securely stored
→ Telegram identity is not persisted with the request
→ student receives confirmation in the selected language
→ request waits until the weekly dispatch
→ once per week, the bot checks whether eligible requests exist
→ IF requests exist, the bot sends an anonymous weekly digest to the private Pray Team Telegram group
→ IF NO requests exist, the bot sends NOTHING to the group
→ requests eventually expire and are deleted

IMPORTANT:

The bot should NOT immediately send each request to the prayer-team group.

The intended MVP behavior is a WEEKLY BATCH/DIGEST.

The exact day and time of the weekly dispatch should be configurable rather than permanently hard-coded.

# Language requirements

The bot must support:

- Amharic
- English

AMHARIC IS THE DEFAULT INITIAL LANGUAGE.

When a user first starts the bot, the initial setup must begin in Amharic and present a language-choice prompt such as:

እባክዎ የሚመርጡትን ቋንቋ ይምረጡ።

Please choose your language.

[🇪🇹 አማርኛ]
[🇬🇧 English]

After choosing:

- Amharic → continue in Amharic.
- English → continue in English.

The bot should support changing the language later.

All normal user-facing messages should have Amharic and English versions, including:

- welcome
- privacy notice
- instructions
- confirmations
- cancellation
- errors
- help
- safety notice
- language settings
- rate-limit messages

Do not scatter translations throughout the source code. Prefer a centralized localization structure.

IMPORTANT PRIVACY DETAIL:

If remembering a user's language requires storing a Telegram identifier, analyze that carefully. Do not automatically create a permanent identity-to-user-preference database if the same user experience can be achieved with a more privacy-preserving design.

# Weekly prayer-team group behavior

The primary first delivery mechanism is the Telegram group used by the Pray Team.

An admin web console is NOT part of the initial MVP.

The bot must collect requests throughout the week.

At the configured weekly dispatch time:

1. Find eligible unpublished requests.
2. If the number of eligible requests is greater than zero:
   - generate a new anonymous weekly digest
   - send it to the Pray Team Telegram group
   - mark successfully sent requests as published

3. If the number of eligible requests is zero:
   - DO NOT SEND ANY MESSAGE TO THE GROUP
   - simply record a technical system event and finish the scheduled task

Do NOT send a message such as:

"There are no prayer requests this week."

The required default behavior is SILENCE when there are no requests.

# Telegram-group privacy

The bot should NOT simply forward the original user messages.

Instead:

Student's Telegram message
→ extract prayer content
→ create anonymous record
→ later construct NEW message
→ send NEW message from bot
→ Pray Team group

The prayer-team group should NOT see:

- Telegram username
- Telegram name
- Telegram ID
- chat ID
- phone number
- original-message attribution
- hidden technical identifiers
- anything intentionally linking the request to its sender

# Privacy rules

Treat prayer requests as highly sensitive data.

The database should store only the minimum necessary information, for example:

- anonymous request ID
- encrypted prayer content
- creation timestamp
- publication status
- expiration timestamp

Do NOT store the following in the prayer-request record:

- telegramUserId
- telegramChatId
- username
- firstName
- lastName
- phoneNumber
- profilePhoto
- unnecessary Telegram metadata

Do not store raw Telegram updates for debugging.

Do not use:

console.log(update)

in production.

Do not log the actual prayer text.

# Encryption

Because requests may contain sensitive information, recommend application-level authenticated encryption for stored prayer content, such as AES-256-GCM.

The encryption key must be stored separately from MongoDB, using secure environment/deployment secrets.

The database must never store the encryption key alongside encrypted prayer requests.

# Request IDs

Every request should receive a cryptographically random anonymous identifier such as:

PR-7F29
PR-A83C
PR-41D2

The identifier must not contain or encode the Telegram user ID or other personal information.

# Student privacy instructions

The bot should clearly tell users not to include:

- their name
- Telegram username
- phone number
- student ID
- address
- unnecessarily identifying details about themselves or others

This matters because a request can still reveal someone's identity through its contents.

# Logging

Do not log:

- raw Telegram updates
- prayer text
- usernames
- Telegram IDs
- chat IDs

Prefer technical events such as:

- prayer_request_received
- prayer_request_stored
- weekly_dispatch_started
- weekly_dispatch_completed
- weekly_dispatch_skipped_no_requests
- prayer_request_expired

# Anti-spam/privacy tradeoff

We need basic spam protection.

However, do not casually introduce permanent storage of Telegram IDs merely for rate limiting because that weakens the anonymity model.

Prefer privacy-preserving approaches such as:

- temporary/in-memory rate limiting where practical
- reasonable submission limits
- maximum request size
- abuse protection that minimizes identity retention

Any design that stores Telegram identity information must clearly explain the privacy tradeoff.

# Safety limitation

The bot is a prayer-request system, not an emergency-response or crisis-response service.

The design should include an appropriate safety notice in both Amharic and English explaining that people facing immediate danger or serious harm should contact a trusted person or appropriate emergency/help service directly.

Do not design the system as though anonymity allows the Pray Team to intervene directly with an unidentified person.

# Technology direction

Preferred stack:

Backend:

- Node.js
- TypeScript
- Express
- Telegram Bot API

Database:

- MongoDB
- Mongoose
- MongoDB Atlas is acceptable

Frontend:

- React
- TypeScript
- MUI

Future deployment:

- HTTPS
- secure Telegram webhook
- secure environment secrets

# Development philosophy

DO NOT jump directly into coding.

First reason about the system as a real product.

The development order should be approximately:

1. Requirements
2. Privacy rules
3. Threat model
4. User flow
5. Language/localization design
6. System architecture
7. Database design
8. API design
9. Telegram bot design
10. Weekly dispatch design
11. Security design
12. Implementation
13. Testing
14. Deployment
15. Future admin console

# Important architectural principles

Privacy should be treated as a SYSTEM REQUIREMENT, not as a feature added later.

Whenever proposing a feature, ask:

"Does this feature create any unnecessary identity linkage or additional sensitive-data retention?"

If yes, explain the risk and propose a more privacy-preserving design.

Also ask:

"Does this feature create any unnecessary copy of sensitive prayer content?"

If yes, minimize or eliminate that copy.

# MVP scope

The MVP should include:

- private Telegram interaction
- initial Amharic experience
- Amharic/English language selection
- language switching
- privacy notice
- anonymous prayer-request submission
- request validation
- random anonymous request ID
- secure encrypted storage
- weekly scheduled dispatch
- anonymous weekly digest
- delivery to the Pray Team Telegram group
- NO group message when there are zero eligible requests
- duplicate-dispatch prevention
- dispatch failure handling
- automatic expiration/deletion
- privacy-conscious logging

# Explicitly out of scope for MVP

Do NOT add:

- admin web console
- student accounts
- student registration
- names/profiles
- public request pages
- prayer-request comments
- private messaging between prayer team and submitter
- identity tracking
- advanced analytics
- mobile application
- AI classification of prayer requests
- automatic translation of sensitive prayer requests

These may be considered later as separate phases.

# Future admin console

After the Telegram MVP works reliably, we may build a secure web-based admin console.

Possible future features:

- view requests
- mark requests as prayed
- delete requests
- view weekly dispatch status
- manage dispatch schedule
- manage authorized prayer-team members
- view system health

The future admin console must preserve the same anonymity model.

# Expected behavior when reasoning about the project

Act as a senior software architect and privacy/security-conscious engineer.

For this project:

1. Help define professional requirements.
2. Identify privacy risks before implementation.
3. Build a realistic threat model.
4. Explain architectural decisions clearly.
5. Avoid unnecessary data collection.
6. Avoid premature coding.
7. Prefer simple, maintainable solutions over unnecessary complexity.
8. Distinguish assumptions from confirmed requirements.
9. Explain security/privacy tradeoffs.
10. Keep weekly Telegram-group dispatch as the main MVP delivery mechanism.
11. Treat the admin console as a future phase.
12. Preserve Amharic as the initial/default language.
13. Ensure English is available through language selection.
14. Never send anything to the Pray Team group when there are zero eligible requests.
15. Never assume that "anonymous" means Telegram itself cannot technically know the sender.

Start by helping me design the project requirements and privacy model before writing code.
