# Anonymous Prayer Request Bot

## Christian Students Fellowship — Pray Team

**Document:** Step 7 — Telegram Bot Design & Conversation State Machine
**Recommended path:** `docs/architecture/step-7-telegram-bot-design-and-state-machine.md`

---

# 1. Purpose

This document defines the exact Telegram interaction behavior of the Anonymous Prayer Request Bot.

It converts the previous requirements into:

- Telegram commands
- Buttons
- Callback actions
- Conversation states
- State transitions
- Temporary session behavior
- Language selection
- Privacy acknowledgment
- Prayer submission flow
- Review/edit/cancel behavior
- Error handling
- Unexpected-input handling
- Session expiration
- Security/privacy rules for Telegram interactions

The MVP remains a private one-to-one Telegram bot.

---

# 2. Primary Design Principles

The Telegram experience must be:

### Private

Prayer submission occurs only through the private chat with the bot.

### Amharic-first

The first interaction begins in Amharic.

### Bilingual

The user can select Amharic or English and later change the language.

### Minimal

The bot should ask only for information necessary to submit the prayer request.

### Privacy-conscious

The interface should repeatedly remind the user not to include personally identifying information.

### Predictable

Every action should have a clear next state.

### Recoverable

Unexpected input or expired sessions should return the user to a safe state rather than leaving the bot stuck.

---

# 3. Telegram Interaction Components

The MVP uses several Telegram interaction mechanisms.

```text
Telegram
│
├── Commands
│   ├── /start
│   ├── /cancel
│   ├── /help
│   ├── /privacy
│   └── /language
│
├── Inline keyboards
│   ├── Language selection
│   ├── Privacy acknowledgment
│   ├── Review/submit
│   └── Confirmation actions
│
└── Reply keyboard
    └── Main menu
```

Inline keyboards are appropriate for settings and action buttons, while free-text prayer submission should remain a normal conversational text input. Telegram documents both inline keyboards and custom reply keyboards, and specifically recommends inline keyboards for settings and menus.

---

# 4. Supported Commands

The MVP should support:

```text
/start
/cancel
/help
/privacy
/language
```

Commands must work in both languages, because commands themselves are not translated.

For example:

```text
/language
```

works regardless of whether the interface is currently Amharic or English.

---

# 5. `/start`

`/start` is the primary entry point.

It should work in all states.

The behavior depends on whether the user has an active session.

---

# 6. First `/start`

For a new interaction:

```text
/start
   ↓
AMHARIC welcome
   ↓
Language selection
```

The initial message must be in Amharic because Amharic is the default onboarding language.

Example:

```text
🙏 እንኳን ወደ የጸሎት ጥያቄ ቦት በሰላም መጡ!

ይህ ቦት የጸሎት ጉዳይዎን ለህብረቱ
የጸሎት ቡድን በማንነትዎ ሳይገለጽ
ለመላክ ያስችላል።

እባክዎ ቋንቋዎን ይምረጡ።
```

Buttons:

```text
[🇪🇹 አማርኛ]
[🇬🇧 English]
```

---

# 7. Language Selection State

State:

```text
LANGUAGE_SELECTION
```

The available choices are:

```text
am
en
```

The callback data should be small and contain no sensitive information.

Example:

```text
lang:am
lang:en
```

Do NOT put:

```text
telegramUserId
chatId
requestId
prayer text
```

inside callback data.

---

# 8. Callback Handling

When a user presses an inline callback button:

```text
Telegram
   ↓
callback query
   ↓
Telegram Adapter
   ↓
Validate callback
   ↓
Execute application action
   ↓
Answer callback query
```

The bot should acknowledge callback queries promptly so the Telegram client does not leave the button interaction waiting. Telegram's Bot API provides `answerCallbackQuery` specifically for this purpose.

---

# 9. Language Selection Transition

```text
LANGUAGE_SELECTION
        │
        ├── lang:am
        │       ↓
        │   language = am
        │
        └── lang:en
                ↓
            language = en
```

After selection:

```text
selected language
        ↓
PRIVACY_NOTICE
```

---

# 10. Privacy Notice State

State:

```text
PRIVACY_NOTICE
```

The bot explains the anonymity model in the selected language.

The notice should communicate:

- The bot receives the Telegram message to process it.
- The application's prayer-request database does not retain the sender's Telegram identity with the request.
- The request will be shared with the Pray Team anonymously.
- Users must not put their name or other identifying information into the prayer.
- Requests are collected during the week and published once weekly.
- Requests are retained only for a limited period.
- This is not an emergency service.

Buttons:

```text
[✅ I Understand]
[🔒 Privacy Details]
```

The phrase "I Understand" is preferable to pretending that this button constitutes a legal waiver or complicated legal consent.

---

# 11. Privacy Acknowledgment

When the user selects:

```text
✅ I Understand
```

the state changes:

```text
PRIVACY_NOTICE
        ↓
MAIN_MENU
```

The acknowledgment itself should be stored only in the temporary conversation state if necessary.

It should not become part of the prayer request.

---

# 12. Privacy Details

The user can press:

```text
🔒 Privacy Details
```

at the notice or from the main menu.

The bot shows a more detailed privacy explanation.

Afterward:

```text
Privacy Details
      ↓
Back
      ↓
Previous safe state
```

The system should not create a new permanent database record merely because someone viewed the privacy information.

---

# 13. Main Menu

State:

```text
MAIN_MENU
```

The menu should use simple actions.

## Amharic

Conceptually:

```text
🙏 የጸሎት ጉዳይ ላክ
🌐 ቋንቋ ቀይር
🔒 የግላዊነት መረጃ
ℹ️ እገዛ
```

## English

```text
🙏 Submit Prayer Request
🌐 Change Language
🔒 Privacy Information
ℹ️ Help
```

A normal reply keyboard is suitable here because these are persistent menu actions rather than button-driven simulated conversation. Telegram supports custom reply keyboards for this purpose.

---

# 14. Main Menu Actions

```text
MAIN_MENU
│
├── Submit Prayer Request
│       ↓
│   SUBMISSION_INSTRUCTIONS
│
├── Change Language
│       ↓
│   LANGUAGE_SELECTION
│
├── Privacy Information
│       ↓
│   PRIVACY_DETAILS
│
└── Help
        ↓
    HELP
```

---

# 15. Start Prayer Submission

When the user selects:

```text
🙏 Submit Prayer Request
```

the state becomes:

```text
SUBMISSION_INSTRUCTIONS
```

The bot provides the privacy reminder and instructions.

---

# 16. Submission Instructions

The bot should say, in the selected language:

```text
Please write the prayer request you would like
the Pray Team to pray for.

You may share something personal.

For your privacy, please do not include:
• Your name
• Telegram username
• Phone number
• Student ID
• Address
• Details that could easily identify you
```

Then:

```text
Please send your prayer request as a text message.

[❌ Cancel]
```

---

# 17. Transition to Waiting State

After sending the instructions:

```text
SUBMISSION_INSTRUCTIONS
        ↓
WAITING_FOR_PRAYER
```

The bot now expects ordinary text from the user.

This is the most important conversational state.

---

# 18. `WAITING_FOR_PRAYER`

In this state:

```text
Expected input:
ordinary text
```

The bot should treat the incoming text as a draft prayer request.

The system should not accept media as part of the MVP.

Examples of unsupported input:

```text
Photo
Video
Voice message
Document
Sticker
Location
Contact
```

The bot should explain that text is required.

---

# 19. Text Input Processing

When text is received:

```text
WAITING_FOR_PRAYER
        ↓
Validate text
        │
        ├── invalid
        │      ↓
        │  Validation Error
        │      ↓
        │  WAITING_FOR_PRAYER
        │
        └── valid
               ↓
         temporary draft
               ↓
        REVIEWING_REQUEST
```

---

# 20. Draft Handling

The prayer text at this stage is only a temporary draft.

Conceptually:

```text
Temporary Session
├── language
├── state
└── draftText
```

It is NOT yet a `PrayerRequest` database document.

The draft should exist only for the duration of the conversation.

---

# 21. Sensitive Draft Handling

Because even an unsent draft can contain sensitive information:

- Do not log it.
- Do not send it to an analytics platform.
- Do not send it to an AI service.
- Do not store it in a permanent MongoDB collection.
- Do not include it in error reports.

The temporary session should have a short expiration time.

---

# 22. Recommended Draft TTL

Recommended MVP:

```text
Draft/session TTL:
15 minutes
```

After 15 minutes of inactivity:

```text
draft
   ↓
deleted
```

This value should be configurable.

For example:

```env
SESSION_TTL_MINUTES=15
```

The exact value can later be adjusted after usability testing.

---

# 23. Review State

State:

```text
REVIEWING_REQUEST
```

The bot shows the draft back to the user.

Example:

```text
🙏 Please review your prayer request:

"Please pray for me as I struggle with
temptation and want God to strengthen me."

Make sure you have not included your name or
other information that could identify you.

[✅ Submit Anonymously]
[✏️ Edit]
[❌ Cancel]
```

The displayed draft is still temporary.

It has not yet become a permanent database record.

---

# 24. Review Actions

```text
REVIEWING_REQUEST
│
├── Submit Anonymously
│       ↓
│   SUBMISSION_PROCESSING
│
├── Edit
│       ↓
│   WAITING_FOR_PRAYER
│
└── Cancel
        ↓
    MAIN_MENU
```

---

# 25. Edit Behavior

When the user chooses:

```text
✏️ Edit
```

the existing draft remains only in temporary session memory while the bot returns to:

```text
WAITING_FOR_PRAYER
```

The user can send a corrected version.

We should not maintain version history.

---

# 26. Final Submission

When the user selects:

```text
✅ Submit Anonymously
```

the state becomes:

```text
SUBMISSION_PROCESSING
```

The bot should perform:

```text
1. Revalidate the text
2. Generate random request ID
3. Encrypt prayer text
4. Construct PrayerRequest domain object
5. Persist it
6. Clear draft/session data
7. Send localized confirmation
```

---

# 27. Why Validation Happens Twice

Validation happens:

```text
First:
when text is entered

Second:
when user confirms submission
```

The second validation protects against stale or altered temporary state.

The system should never assume that a previously validated draft can safely bypass final validation.

---

# 28. Submission Processing State

State:

```text
SUBMISSION_PROCESSING
```

The user should not be able to accidentally submit the same draft repeatedly by rapidly pressing a button.

The application should enforce a single active submission attempt.

---

# 29. Successful Submission

On success:

```text
SUBMISSION_PROCESSING
        ↓
Store encrypted request
        ↓
Clear draft
        ↓
MAIN_MENU
```

Then send a confirmation.

Example:

```text
🙏 Your prayer request has been received.

It will be included anonymously in the next
weekly prayer-team collection.

Request ID:
PR-7F29A83C
```

---

# 30. Failed Submission

If something goes wrong:

```text
SUBMISSION_PROCESSING
        ↓
Failure
        ↓
Safe localized error
```

The bot must not expose:

```text
MongoDB error
encryption error details
Telegram API details
stack trace
request identifiers from internal systems
```

The bot can say:

```text
Something went wrong while submitting your prayer request.
Please try again.
```

---

# 31. Important Retry Behavior

If the database operation succeeds but the confirmation message fails, the application must not create a second prayer request just because the user retries.

Therefore the submission operation should be designed to be safely retryable.

This is another reason the generated anonymous `requestId` should be unique and submission processing should have a clear idempotency strategy.

The precise implementation will be handled in the implementation/design stage.

---

# 32. `/cancel`

`/cancel` should work globally during an active submission.

For example:

```text
WAITING_FOR_PRAYER
        ↓
/cancel
        ↓
MAIN_MENU
```

And:

```text
REVIEWING_REQUEST
        ↓
/cancel
        ↓
MAIN_MENU
```

The current draft must be discarded.

The bot should confirm:

```text
Your current prayer-request draft was cancelled.
No prayer request was submitted.
```

---

# 33. `/cancel` Outside Submission

If the user sends:

```text
/cancel
```

from:

```text
MAIN_MENU
```

there is nothing to cancel.

The bot can simply return the main menu rather than displaying an error.

---

# 34. `/language`

The command:

```text
/language
```

can be used at any time except perhaps while final submission is actively being processed.

It transitions to:

```text
LANGUAGE_SELECTION
```

After selecting the language:

```text
LANGUAGE_SELECTION
       ↓
previous safe state
```

For the MVP, the simplest behavior is to return to:

```text
MAIN_MENU
```

after changing language.

This avoids complicated state restoration.

---

# 35. Changing Language During Draft Submission

If the user is currently writing a prayer and chooses `/language`, we should not silently throw away their draft.

Recommended behavior:

```text
Current state:
WAITING_FOR_PRAYER

/language
   ↓
Language Selection
   ↓
Select language
   ↓
Return to WAITING_FOR_PRAYER
```

The temporary draft, if present, remains in memory.

But if the draft/session expires, it is deleted.

---

# 36. `/privacy`

The command:

```text
/privacy
```

should show the privacy information in the currently selected language.

It can be used from the main menu or during general interaction.

During sensitive draft states, the bot should avoid replacing the current draft accidentally.

---

# 37. `/help`

The command:

```text
/help
```

shows:

- What the bot does
- How to submit a request
- How to change language
- How to cancel
- How the weekly collection works
- Basic privacy guidance
- Safety limitation

---

# 38. Unexpected Text in `MAIN_MENU`

Suppose the user types:

```text
Hello
```

when the bot expects a menu action.

The bot should respond naturally:

```text
Please choose an option from the menu.

[🙏 Submit Prayer Request]
[🌐 Change Language]
[🔒 Privacy Information]
[ℹ️ Help]
```

It should not interpret arbitrary text as a prayer request unless the user is explicitly in:

```text
WAITING_FOR_PRAYER
```

---

# 39. Unexpected Text in `REVIEWING_REQUEST`

If the user sends ordinary text instead of pressing a button:

```text
REVIEWING_REQUEST
```

the bot can explain:

```text
Please choose:
[✅ Submit]
[✏️ Edit]
[❌ Cancel]
```

It should not silently replace the existing draft.

---

# 40. Unsupported Media in `WAITING_FOR_PRAYER`

If the user sends an image, voice message, video, or document:

```text
⚠️ Please send your prayer request as text.

[❌ Cancel]
```

The system should not download or persist the media.

This reduces privacy and storage complexity.

---

# 41. Invalid Callback Data

A callback might be:

```text
lang:es
```

even though Spanish is unsupported.

The bot must reject it safely.

Similarly, an unknown callback such as:

```text
submit:12345
```

must not be trusted.

The system should validate:

```text
callback action
current state
allowed transition
```

before executing it.

---

# 42. Callback Data Security

Callback data should identify an action, not an identity.

Good:

```text
lang:am
lang:en
menu:submit
menu:privacy
review:submit
review:edit
review:cancel
```

Bad:

```text
submit:user_123456789
```

Worse:

```text
submit:user_123456789:PR-A87...
```

There is no reason for Telegram identity to be encoded into the callback data.

---

# 43. State-Aware Callback Handling

A callback should only be accepted if it is valid for the current state.

For example:

```text
Current state:
MAIN_MENU

Received:
review:submit
```

This is invalid.

The system should:

```text
Reject callback
Answer callback query
Return user to valid menu/state
```

This protects against stale or malicious button presses.

---

# 44. Old Buttons

A user may press an old button from a previous message.

Example:

```text
Old message:
[✅ Submit Anonymously]

Current state:
MAIN_MENU
```

The callback must not submit anything.

The application must check current session state before performing the action.

This is important because Telegram messages and their buttons can outlive the conversational state that created them.

---

# 45. Conversation State Machine

The complete state machine:

```text
                         ┌─────────────────┐
                         │      /start     │
                         └────────┬────────┘
                                  │
                                  ▼
                    ┌────────────────────────┐
                    │ LANGUAGE_SELECTION     │
                    └────────────┬───────────┘
                                 │
                          language chosen
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │ PRIVACY_NOTICE         │
                    └────────────┬───────────┘
                                 │
                           acknowledged
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │ MAIN_MENU              │
                    └─┬──────┬──────┬───────┘
                      │      │      │
                  submit   lang   privacy
                      │      │      │
                      ▼      ▼      ▼
                  INSTR.   LANG   DETAILS
                      │      │
                      ▼      │
                  WAITING ◄──┘
                      │
                     text
                      │
                      ▼
                  REVIEWING
                   /   |   \
                edit submit cancel
                 │      │      │
                 ▼      ▼      ▼
              WAITING PROCESS MAIN_MENU
                        │
                      success
                        │
                        ▼
                    MAIN_MENU
```

---

# 46. State Definitions

The MVP state set is:

```ts
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

---

# 47. Terminal Session States

A temporary conversation can end through:

```text
COMPLETED
CANCELLED
EXPIRED
RESET
```

These do not necessarily need to be stored as long-lived states.

They describe lifecycle outcomes.

---

# 48. Session Lifecycle

```text
New interaction
      ↓
Create temporary session
      ↓
Language selection
      ↓
Privacy acknowledgment
      ↓
Main menu
      ↓
Optional draft
      ↓
Submission
      ↓
Clear temporary state
```

After completion:

```text
No draft remains
No sensitive conversation data remains
```

---

# 49. Session Expiration

Every temporary session must have:

```text
createdAt
lastActivityAt
expiresAt
```

The application may internally calculate:

```text
expiresAt = lastActivityAt + SESSION_TTL
```

Recommended MVP TTL:

```text
15 minutes
```

---

# 50. Session Expiration Behavior

If the user returns after the session expires:

```text
Expired session
      ↓
Start fresh
      ↓
MAIN_MENU or LANGUAGE_SELECTION
```

For privacy, any expired draft should already have been removed.

The bot may say:

```text
Your previous session expired for privacy reasons.
Please start again.
```

---

# 51. `/start` During Active Draft

Suppose:

```text
WAITING_FOR_PRAYER
```

and the user sends:

```text
/start
```

Recommended behavior:

```text
Show warning:

Starting again will cancel your current draft.

[✅ Start Over]
[↩️ Continue]
```

This avoids accidentally destroying a sensitive draft.

If the user confirms:

```text
Start Over
    ↓
Clear draft
    ↓
LANGUAGE_SELECTION
```

---

# 52. `/start` Without Active Draft

If no active draft exists:

```text
/start
   ↓
MAIN_MENU
```

If language has not yet been selected:

```text
/start
   ↓
LANGUAGE_SELECTION
```

The system should not ask the user to repeat the privacy acknowledgment unnecessarily unless the product policy specifically requires it.

---

# 53. Privacy Acknowledgment Rule

A user needs to see the privacy explanation before the first prayer submission.

The system should track this only as short-lived conversation/session state for the MVP.

It should not create a permanent:

```text
user → acceptedPrivacy
```

profile.

This avoids creating an unnecessary identity database.

---

# 54. Main Menu Language

After the user selects a language:

```text
language = am
```

the menu should be in Amharic.

If:

```text
language = en
```

the menu should be English.

The selected language should be carried through the current session.

---

# 55. Prayer Text Language

The prayer itself is independent from the interface language.

Example:

```text
Interface:
አማርኛ

Prayer:
Please pray for me as I...
```

Valid.

Or:

```text
Interface:
English

Prayer:
እባክዎ ለቤተሰቤ ጸልዩ...
```

Also valid.

The bot does not need to detect or store the prayer language.

---

# 56. Language Selection Does Not Translate Existing Drafts

If the user writes:

```text
Draft:
Please pray for my family.
```

then changes:

```text
English → Amharic
```

the draft remains:

```text
Please pray for my family.
```

It must not automatically become an Amharic translation.

This avoids introducing external translation processing of sensitive content.

---

# 57. Privacy Details Should Not Contain Technical Internals

The user-facing privacy notice should not explain things such as:

```text
MongoDB
AES-256-GCM
webhook
Mongoose
request repository
```

Instead, explain the practical privacy behavior in ordinary language.

Technical details belong in the project's documentation.

---

# 58. Conversation State and Database Separation

Critical boundary:

```text
Temporary conversation
        │
        │ chat/session context
        ▼
Conversation Manager
        │
        X
        │
        │ NO direct persistence relation
        ▼
Prayer Request Repository
```

The conversation manager may use the Telegram chat identifier internally to find a temporary session, but that identifier must not be copied into the prayer-request record.

---

# 59. Suggested Session Key

For the single-instance MVP, the temporary session can conceptually be keyed by the private Telegram chat ID:

```text
Map<chatId, Session>
```

However:

- It exists only in application memory.
- It must never be logged.
- It must never be written into `prayer_requests`.
- It must expire.
- It must be cleared immediately after successful submission or cancellation.

If the system later becomes multi-instance, we will need a distributed session approach that preserves the same privacy guarantees.

---

# 60. No Message Logging

The conversation system must not log:

```text
incoming message text
draftText
chatId
userId
callback data containing sensitive information
```

Normal technical logs should instead say things such as:

```text
conversation_started
language_selected
prayer_submission_started
prayer_submission_completed
conversation_expired
```

Even then, the log should avoid unnecessary identifiers.

---

# 61. User-Facing Error State

When a technical failure occurs during normal conversation:

```text
Current State
     ↓
Error
     ↓
Localized safe message
     ↓
Return to previous safe state
```

Example:

```text
⚠️ Something went wrong.

Please try again.

[🏠 Main Menu]
```

The system should avoid leaving users trapped in `SUBMISSION_PROCESSING`.

---

# 62. Bot Recovery After Restart

Because the MVP session state is temporary/in-memory:

```text
Server restart
      ↓
Temporary sessions disappear
```

This is acceptable.

The next interaction should produce a fresh session.

Importantly, a partially written prayer draft should not be recovered from MongoDB because doing so would require persistent storage of sensitive plaintext or session data.

---

# 63. No Persistent Draft Recovery

If the server restarts while a user is writing a prayer:

```text
Draft disappears.
```

This is an intentional privacy tradeoff.

The user can simply start the submission again.

We prioritize:

```text
privacy
>
convenience of draft recovery
```

---

# 64. Bot Behavior for Direct Text After `/start`

Suppose the user sends:

```text
/start
```

and immediately sends:

```text
Please pray for me...
```

before selecting a language.

The bot should not silently accept the text as a prayer request.

It should first complete onboarding:

```text
LANGUAGE_SELECTION
```

then:

```text
PRIVACY_NOTICE
```

then:

```text
MAIN_MENU
```

This ensures the user sees the privacy instructions before submitting.

---

# 65. Bot Behavior for Unsupported Commands

Unknown command:

```text
/whatever
```

The bot should respond:

```text
I don't recognize that command.

Use /help to see available options.
```

in the currently selected language.

---

# 66. Global Safety Notice

The safety notice should be available through:

```text
/help
/privacy
```

and may also be included in the privacy notice.

The user should understand that:

```text
This bot is not an emergency-response service.
```

---

# 67. Exact MVP Interaction Map

```text
/start
  │
  ▼
LANGUAGE_SELECTION
  │
  ├── Amharic ─────┐
  │                │
  └── English ─────┤
                   ▼
             PRIVACY_NOTICE
                   │
            [I Understand]
                   │
                   ▼
               MAIN_MENU
                   │
       ┌───────────┼─────────────┐
       │           │             │
       ▼           ▼             ▼
    Submit      Language      Privacy
       │           │             │
       ▼           ▼             ▼
Instructions    Selection     Details
       │
       ▼
WAITING_FOR_PRAYER
       │
       │ text
       ▼
REVIEWING_REQUEST
   │       │       │
   │       │       └── Cancel
   │       │             ↓
   │       │         MAIN_MENU
   │       │
   │       └── Edit
   │             ↓
   │         WAITING_FOR_PRAYER
   │
   └── Submit
          ↓
SUBMISSION_PROCESSING
          │
          ▼
      Store request
          │
          ▼
      MAIN_MENU
```

---

# 68. Button Design

Recommended callback actions:

```text
lang:am
lang:en

privacy:ack
privacy:details

menu:submit
menu:language
menu:privacy
menu:help

review:submit
review:edit
review:cancel

nav:back
nav:home
```

These should remain small, predictable, and free from sensitive data.

---

# 69. Callback Validation

Every callback must be checked against:

```text
1. Known action
2. Current conversation state
3. Expected language/session
4. Valid transition
```

For example:

```text
Current:
WAITING_FOR_PRAYER

Received:
review:submit
```

Reject.

But:

```text
Current:
REVIEWING_REQUEST

Received:
review:submit
```

Accept.

---

# 70. Stale Callback Handling

If an old button is pressed after session expiration:

```text
Callback
   ↓
Session not found
   ↓
Reject action
   ↓
Answer callback
   ↓
Tell user:
"Your session expired. Please start again."
```

No prayer request should be created from a stale callback.

---

# 71. User Experience After Expiration

Recommended:

```text
Your previous session expired for privacy reasons.

Please use /start to begin again.
```

This explains why the interaction reset without revealing technical details.

---

# 72. Command-to-State Rules

| Command/action         | Allowed from             | Result                                   |
| ---------------------- | ------------------------ | ---------------------------------------- |
| `/start`               | Any state                | Fresh/restarted onboarding or safe reset |
| `/cancel`              | Any active draft state   | Clear draft → Main Menu                  |
| `/help`                | Any state                | Help                                     |
| `/privacy`             | Any state                | Privacy information                      |
| `/language`            | Any non-processing state | Language selection                       |
| Submit Request         | Main Menu                | Submission Instructions                  |
| Language button        | Language Selection       | Selected language                        |
| Privacy acknowledgment | Privacy Notice           | Main Menu                                |
| Edit                   | Reviewing                | Waiting for Prayer                       |
| Submit Anonymously     | Reviewing                | Processing                               |
| Cancel                 | Reviewing                | Main Menu                                |

---

# 73. Processing State Restrictions

While:

```text
SUBMISSION_PROCESSING
```

the bot should not accept another submission action.

Possible incoming actions can be ignored or answered:

```text
Your request is currently being submitted. Please wait.
```

The application should keep this state as short as possible.

---

# 74. Exact Privacy Boundary in Telegram

The Telegram Adapter may receive:

```text
Telegram update
├── chat
├── from
├── message
└── callback query
```

It should extract only what is needed for the current interaction.

For example:

```text
Incoming message
     ↓
chat ID → temporary conversation routing
text    → application command/input
```

Then:

```text
from/user data
     ↓
NOT persisted
```

---

# 75. The Adapter Must Not Pass Raw User Objects Downstream

Avoid:

```ts
submitPrayerRequest({
  telegramUser: update.message.from,
  text: update.message.text,
});
```

Instead:

```ts
submitPrayerRequest({
  text: update.message.text,
});
```

The Telegram adapter handles the Telegram-specific part.

This enforces the privacy contract from Step 6.

---

# 76. Conversation State Machine as Code Concept

The implementation should eventually resemble:

```ts
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

And transitions should be explicit rather than scattered through dozens of `if` statements.

---

# 77. State Transition Rule

Conceptually:

```ts
transition(
  currentState,
  action
): NextState
```

For example:

```text
LANGUAGE_SELECTION
+
LANGUAGE_SELECTED
       ↓
PRIVACY_NOTICE
```

and:

```text
REVIEWING_REQUEST
+
SUBMIT
       ↓
SUBMISSION_PROCESSING
```

This makes illegal transitions easier to reject.

---

# 78. State Machine Invariants

The following must always remain true:

### Invariant 1

A prayer request cannot be created from:

```text
LANGUAGE_SELECTION
PRIVACY_NOTICE
MAIN_MENU
```

without the submission flow.

### Invariant 2

A prayer request can be created only from:

```text
REVIEWING_REQUEST
```

after explicit confirmation.

### Invariant 3

A cancelled draft cannot later be submitted.

### Invariant 4

An expired session cannot create a request.

### Invariant 5

An old callback cannot bypass the current state.

### Invariant 6

Changing language never changes prayer content.

### Invariant 7

The Telegram identity never enters the prayer-request domain.

---

# 79. Final Telegram Architecture

```text
                         TELEGRAM
                            │
                            ▼
                   ┌────────────────┐
                   │ Telegram       │
                   │ Webhook        │
                   └───────┬────────┘
                           │
                           ▼
                   ┌────────────────┐
                   │ Telegram       │
                   │ Adapter        │
                   └───────┬────────┘
                           │
                  normalized actions
                           │
                           ▼
                   ┌────────────────┐
                   │ Conversation   │
                   │ State Machine  │
                   └───────┬────────┘
                           │
            ┌──────────────┼───────────────┐
            │              │               │
            ▼              ▼               ▼
       Localization   Prayer Request   Help/Privacy
            │              │
            │              ▼
            │        Encryption
            │              │
            │              ▼
            │          Database
            │
            ▼
       Telegram Reply
```

---

# 80. Final State Machine

```text
START
  ↓
LANGUAGE_SELECTION
  ↓
PRIVACY_NOTICE
  ↓
MAIN_MENU
  │
  ├───────────────┐
  │               │
  ▼               ▼
LANGUAGE       SUBMIT
  │               │
  │               ▼
  └─────────► MAIN_MENU
                  │
                  ▼
       SUBMISSION_INSTRUCTIONS
                  │
                  ▼
        WAITING_FOR_PRAYER
                  │
                  ▼
         REVIEWING_REQUEST
             /       |       \
            /        |        \
         EDIT      SUBMIT    CANCEL
          │          │          │
          ▼          ▼          ▼
       WAITING   PROCESSING   MAIN_MENU
                     │
                     ▼
                 SUCCESS
                     │
                     ▼
                 MAIN_MENU
```

---

# 81. Step 7 Acceptance Criteria

The Telegram bot design is complete when:

```text
✓ First interaction starts in Amharic
✓ Language selection supports Amharic and English
✓ Privacy notice appears before first submission
✓ Privacy acknowledgment is required before submission
✓ Main menu is available in both languages
✓ /start is handled globally
✓ /cancel is handled during active submission
✓ /help is available
✓ /privacy is available
✓ /language is available
✓ Prayer submission uses free-text input
✓ Drafts exist only temporarily
✓ Drafts have a short expiration period
✓ Review is required before final submission
✓ User can edit before submission
✓ User can cancel before submission
✓ Submission is explicitly confirmed
✓ Unsupported media is safely rejected
✓ Unsupported callbacks are rejected
✓ Stale callbacks cannot create requests
✓ Language changes do not translate prayer content
✓ Telegram identity is not passed into the prayer domain
✓ Callback data contains no sensitive information
✓ Callback actions are state-validated
✓ Failed submission returns a safe localized message
✓ Server restarts do not recover sensitive drafts
✓ Session expiration clears sensitive drafts
✓ No prayer content is logged
```

---

# 82. Next Stage

The next stage is:

**Step 8 — Security Architecture & Privacy Controls**

That stage will turn the threat model into actual security mechanisms:

```text
Webhook authentication
        ↓
Input validation
        ↓
Rate limiting
        ↓
Session protection
        ↓
Encryption/key management
        ↓
Secure MongoDB access
        ↓
Secret management
        ↓
Logging rules
        ↓
Telegram group security
        ↓
Deletion/retention enforcement
        ↓
Security testing
```

After Step 8, we'll have most of the architecture fully specified and can move toward implementation planning without prematurely coding.
