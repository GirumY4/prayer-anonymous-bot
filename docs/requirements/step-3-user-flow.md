# Anonymous Prayer Request Bot

## Christian Students Fellowship — Pray Team

**Document:** Step 3 — User Flow & Interaction Design
**Recommended path:** `docs/requirements/step-3-user-flow.md`

---

# 1. Purpose

This document defines how a fellowship member interacts with the Anonymous Prayer Request Bot and how the weekly prayer-team publication works.

The design must prioritize:

- Privacy
- Simplicity
- Amharic-first onboarding
- English availability
- Clear user understanding
- Minimal data collection
- Safe handling of sensitive content
- Predictable weekly dispatch

The flow described here is the basis for the architecture and implementation that will follow.

---

# 2. Actors

There are two active actors in the MVP.

## 2.1 Student

The student interacts privately with the Telegram bot to submit a prayer request.

## 2.2 Pray Team

The Pray Team receives the weekly anonymous prayer-request digest in its private Telegram group.

There is no student-facing communication from the Pray Team through the bot in the MVP.

---

# 3. High-Level Student Flow

```text
Student opens bot
       ↓
/start
       ↓
Amharic welcome
       ↓
Choose language
   ↙           ↘
Amharic       English
   ↓             ↓
Privacy notice in selected language
       ↓
Main menu
       ↓
Submit prayer request
       ↓
Privacy reminder
       ↓
Write request
       ↓
Validate request
       ↓
Review / confirmation
       ↓
Submit
       ↓
Generate anonymous request ID
       ↓
Securely store request
       ↓
Confirmation
       ↓
Wait for weekly dispatch
```

---

# 4. Initial `/start` Flow

When the student first interacts with the bot, the bot must begin in Amharic.

Example:

```text
🙏 እንኳን ወደ የጸሎት ጥያቄ ቦት በሰላም መጡ!

ይህ ቦት የክርስቲያን ተማሪዎች ህብረት የጸሎት
ቡድን እንዲጸልይላችሁ የጸሎት ጉዳያችሁን
በግላዊነት ለመላክ ያስችላችኋል።

እባክዎ ቋንቋዎን ይምረጡ።
```

Buttons:

```text
[🇪🇹 አማርኛ]
[🇬🇧 English]
```

The user should not have to read a long privacy document before even choosing a language.

---

# 5. Language Selection

The bot supports exactly two languages in the MVP:

```text
Amharic
English
```

## 5.1 Amharic

If the user selects:

```text
🇪🇹 አማርኛ
```

all subsequent bot interface messages should use Amharic.

## 5.2 English

If the user selects:

```text
🇬🇧 English
```

all subsequent bot interface messages should use English.

The selected language applies to:

- Menus
- Instructions
- Privacy notices
- Confirmations
- Errors
- Help
- Cancellation
- Safety notices
- Language settings

The actual prayer text remains exactly as the student wrote it.

---

# 6. Main Menu

After language selection and privacy acknowledgment, the user reaches the main menu.

## Amharic

Conceptually:

```text
🙏 የጸሎት ጉዳይዎን በሚስጥር ለመላክ ይችላሉ።

ምን ማድረግ ይፈልጋሉ?

[🙏 የጸሎት ጉዳይ ላክ]
[🌐 ቋንቋ ቀይር]
[🔒 የግላዊነት መረጃ]
[ℹ️ እገዛ]
```

## English

```text
🙏 You can anonymously submit a prayer request.

What would you like to do?

[🙏 Submit Prayer Request]
[🌐 Change Language]
[🔒 Privacy Information]
[ℹ️ Help]
```

---

# 7. Privacy Notice

Before allowing the first submission, the bot should clearly explain the privacy model.

The notice should communicate:

1. The request is intended to be anonymous to the fellowship and Pray Team.
2. The bot needs to receive the Telegram message in order to process it.
3. The application is designed not to retain the sender's Telegram identity together with the prayer request.
4. Users must not put names or identifying information into the request.
5. Requests are collected during the week and published to the Pray Team once per week.
6. Requests are not retained forever.
7. This is not an emergency service.

The privacy notice should be concise enough to read but sufficiently clear to support informed use.

The complete privacy explanation should also be available later through:

```text
🔒 Privacy Information
```

---

# 8. Start Prayer Request Flow

When the user presses:

```text
🙏 Submit Prayer Request
```

the bot gives one final privacy reminder before asking for the content.

## Amharic concept

```text
🙏 የጸሎት ጉዳይዎን ይጻፉ።

በጣም የግል ጉዳይ መሆን ይችላል።

ለግላዊነትዎ እባክዎ:
• ስምዎን አይጻፉ
• የቴሌግራም መለያዎን አይጻፉ
• ስልክ ቁጥርዎን አይጻፉ
• የተማሪ መለያ ቁጥርዎን አይጻፉ
• እርስዎን በቀላሉ ሊለይ የሚችል ዝርዝር አይጨምሩ
```

The English equivalent should communicate the same meaning.

Button:

```text
[❌ Cancel]
```

---

# 9. Prayer Request Input

The student writes the prayer request naturally.

Example:

```text
እባክዎ ለእኔ ጸልዩ። ከአንድ ሱስ ጋር ለመዋጋት
በጣም እቸገራለሁ። እግዚአብሔር እንዲያጠነክረኝ
እና ከዚህ ሁኔታ እንድወጣ እባካችሁ ጸልዩልኝ።
```

or:

```text
Please pray for me. I have been struggling with
an addiction and I want God to help me overcome it.
```

The user should be allowed to write in either language regardless of the interface language.

The bot's interface language and the prayer-request language are therefore separate concepts.

---

# 10. Input Validation

The bot should validate the submitted request before accepting it.

The MVP should validate at least:

### Empty request

Reject:

```text
""
```

or whitespace-only input.

### Maximum length

A maximum prayer-request length should be defined.

For example:

```text
MAX_PRAYER_REQUEST_LENGTH
```

The exact value will be determined during implementation based on Telegram limits and the desired weekly digest size.

### Unsupported input

The MVP should primarily accept text.

The handling of:

```text
images
audio
video
documents
stickers
```

should be explicitly rejected or deferred.

A text-only MVP provides a much simpler privacy model.

---

# 11. Validation Error

When the request is invalid, the user should receive a clear message in their selected language.

For example:

```text
⚠️ Your prayer request is empty.

Please write your prayer request and send it again.

[❌ Cancel]
```

The system should not log the invalid sensitive text merely because validation failed.

---

# 12. Confirmation / Review Stage

Before final storage, the bot should provide a review step.

Example:

```text
🙏 Please review your prayer request.

"Please pray for me as I struggle with..."

Make sure you have not included your name or other
information that could identify you.

[✅ Submit Anonymously]
[✏️ Edit]
[❌ Cancel]
```

This step is particularly important because the user may notice that they accidentally wrote identifying information.

---

# 13. Edit Behavior

When the user selects:

```text
✏️ Edit
```

the system should discard the current draft from the active conversation state and ask the user to write the corrected request.

The system should not preserve multiple versions of sensitive drafts unnecessarily.

The final accepted request is the only version that should become a stored prayer request.

---

# 14. Final Submission

When the user selects:

```text
✅ Submit Anonymously
```

the backend should:

```text
1. Validate again
2. Generate anonymous request ID
3. Encrypt prayer content
4. Create the prayer-request record
5. Store it securely
6. Remove/discard unnecessary Telegram identity data
7. Clear temporary submission state
8. Return confirmation
```

The student should not have to perform any additional step.

---

# 15. Submission Confirmation

## Amharic concept

```text
🙏 የጸሎት ጉዳይዎ በተሳካ ሁኔታ ተቀብሏል።

በሚቀጥለው ሳምንታዊ የጸሎት ጉባኤ ለጸሎት
ቡድኑ በማንነትዎ ሳይገለጽ ይደርሳል።

የጥያቄ መለያ:
PR-7F29
```

## English concept

```text
🙏 Your prayer request has been received successfully.

It will be included anonymously in the next
weekly prayer-team collection.

Request ID:
PR-7F29
```

The request ID should not reveal the student's identity or submission time.

---

# 16. After Submission

After successful submission, the bot should return the user to the main menu or offer:

```text
[🙏 Submit Another Request]
[🌐 Change Language]
[🔒 Privacy Information]
```

Whether multiple submissions should be allowed immediately or limited by the anti-spam policy will be finalized in the architecture/security stage.

---

# 17. Cancellation Flow

Cancellation should be available at every relevant stage.

Example:

```text
Student:
[❌ Cancel]

Bot:
Request cancelled.

No prayer request was submitted.
```

The system should discard any temporary draft associated with that interaction.

---

# 18. Language Change Flow

The user can choose:

```text
🌐 Change Language
```

The bot then shows:

```text
Please choose your language.

[🇪🇹 አማርኛ]
[🇬🇧 English]
```

After selection, the interface immediately changes to the selected language.

Changing the interface language must not alter, translate, or modify existing prayer requests.

---

# 19. Help Flow

The bot should provide a simple help section.

Potential content:

```text
What can I submit?
How anonymous is this?
When will my request be sent?
Can I submit another request?
How do I change language?
How long are requests retained?
```

The help content should be available in Amharic and English.

---

# 20. Important Distinction: Interface Language vs Prayer Language

These must remain independent.

Example:

```text
Interface:
English

Prayer:
እባክዎ ለቤተሰቤ ጸልዩ...
```

This is valid.

Another student may use:

```text
Interface:
Amharic

Prayer:
Please pray for me as I...
```

This is also valid.

The system should not automatically translate requests in the MVP.

---

# 21. Safety Flow

The safety notice should be available in both languages.

Conceptually:

```text
⚠️ Important

This bot is for prayer requests.
It is not an emergency or crisis-response service.

If you or someone else is in immediate danger,
please contact a trusted person or appropriate
emergency/help service directly.
```

The precise local safeguarding wording should be reviewed by the fellowship before production.

---

# 22. Weekly Collection Flow

Requests accumulate throughout the configured collection period.

Conceptually:

```text
Monday
  │
  ├── Request A
  ├── Request B
  │
Tuesday
  │
  ├── Request C
  │
Wednesday
  │
  ├── Request D
  │
Thursday
  │
  └── No request
  │
Friday
  │
  ├── Request E
  │
Weekend
  │
  ▼
Weekly Dispatch
```

The requests remain private during this collection period.

They are not posted to the Pray Team group immediately.

---

# 23. Weekly Dispatch Decision

At the configured weekly dispatch time:

```text
                    Start Job
                        │
                        ▼
              Find eligible requests
                        │
                        ▼
                  Any requests?
                   /          \
                 NO            YES
                 │               │
                 ▼               ▼
          Send NOTHING      Prepare digest
                 │               │
                 │               ▼
                 │          Randomize order
                 │               │
                 │               ▼
                 │        Construct NEW messages
                 │               │
                 │               ▼
                 │        Send to Pray Team
                 │               │
                 │               ▼
                 │       Mark as published
                 │
                 ▼
                End
```

---

# 24. Empty Week Behavior

If zero eligible requests exist:

```text
Eligible requests = 0
```

the bot must send **nothing** to the Pray Team group.

No:

```text
"No requests this week"
```

No:

```text
"Weekly prayer update"
```

No empty digest.

No placeholder message.

The technical system may record:

```text
weekly_dispatch_skipped_no_requests
```

but the Telegram group should remain completely untouched.

---

# 25. Weekly Digest

If there are requests, the bot creates a new digest.

Example:

```text
🙏 Weekly Anonymous Prayer Requests

Please keep these requests in prayer.

────────────────────

PR-7F29

Please pray for me as I struggle with an addiction
and seek God's help to overcome it.

────────────────────

PR-A83C

Please pray for my family and for wisdom
concerning an important situation.

────────────────────

PR-41D2

Please pray for spiritual strength and victory
over temptation.

────────────────────
```

The digest must not reveal:

- submitter name
- Telegram username
- Telegram ID
- submission timestamp
- exact submission order
- chat ID
- internal database ID

---

# 26. Randomized Weekly Order

The requests should not normally be published in chronological order.

For example:

```text
Stored:
A → B → C → D

Published:
C → A → D → B
```

This reduces unnecessary timing/order inference.

The request ID itself should remain stable.

---

# 27. Weekly Digest Language

The weekly heading and bot-generated text should have an appropriate language strategy.

Because individual requests can be in either Amharic or English, the digest may contain both languages.

Example:

```text
🙏 Weekly Anonymous Prayer Requests
የሳምንቱ የጸሎት ጉዳዮች

PR-7F29
[Amharic request]

PR-A83C
[English request]

PR-41D2
[Amharic request]
```

The final bilingual presentation style will be decided during the architecture/UX phase.

---

# 28. Weekly Digest Overflow

Telegram has message-size limitations.

Therefore:

```text
Many requests
     ↓
Digest too large?
   /       \
 No        Yes
 │           │
 ▼           ▼
One       Split into
message   multiple messages
```

If multiple messages are required, the bot should preserve:

- request completeness
- request order
- request IDs
- no duplication
- no truncation

Example:

```text
🙏 Weekly Anonymous Prayer Requests
Part 1/3

...

🙏 Weekly Anonymous Prayer Requests
Part 2/3

...

🙏 Weekly Anonymous Prayer Requests
Part 3/3
```

---

# 29. Publication Success

A request becomes:

```text
published
```

only after the system has determined that its corresponding weekly message was successfully sent.

The implementation must be designed to handle failures without incorrectly marking unsent requests as published.

---

# 30. Publication Failure

Example:

```text
10 requests
      ↓
7 successfully sent
3 failed
```

The three failed requests must remain eligible for safe retry according to the dispatch strategy.

The system must avoid:

```text
sent successfully
        ↓
marked failed
        ↓
sent again
```

and:

```text
send failed
        ↓
marked successful
        ↓
never sent
```

The exact idempotency strategy will be designed in the architecture stage.

---

# 31. Student Does Not Receive Weekly Publication Details

The student should not receive a message such as:

```text
"Your request was sent to the group."
```

unless the system is intentionally designed to provide such confirmation.

For the MVP, the original confirmation should simply say:

> Your request will be included in the next weekly prayer-team collection.

This avoids unnecessarily creating another interaction or revealing publication timing.

---

# 32. Complete Student Flow

```text
┌─────────────────────────────┐
│ Student opens bot           │
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│ /start                      │
│ Initial language: Amharic   │
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│ Choose language             │
│ Amharic / English           │
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│ Privacy notice               │
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│ Main menu                    │
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│ Submit prayer request       │
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│ Privacy reminder             │
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│ Student writes request      │
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│ Validate input              │
└──────────────┬──────────────┘
               ▼
        ┌──────┴──────┐
        │             │
      Invalid        Valid
        │             │
        ▼             ▼
    Error          Review
                      │
                ┌─────┴─────┐
                │           │
              Edit       Submit
                │           │
                │           ▼
                │      Generate ID
                │           │
                │           ▼
                │      Encrypt/store
                │           │
                │           ▼
                │      Confirmation
                │
                └──► Write again
```

---

# 33. Complete Weekly Flow

```text
┌────────────────────────────┐
│ Requests collected all week│
└─────────────┬──────────────┘
              ▼
┌────────────────────────────┐
│ Weekly scheduled job       │
└─────────────┬──────────────┘
              ▼
┌────────────────────────────┐
│ Find eligible requests     │
└─────────────┬──────────────┘
              ▼
       ┌──────┴──────┐
       │             │
      ZERO          > ZERO
       │             │
       ▼             ▼
 Send nothing    Randomize order
       │             │
       │             ▼
       │       Generate digest
       │             │
       │             ▼
       │        Send to group
       │             │
       │             ▼
       │       Mark published
       │
       ▼
      END
```

---

# 34. User Experience Principles

The interaction should follow these principles:

### Minimal steps

A student should be able to submit a request quickly.

### Clear privacy warnings

The student should understand the anonymity model before submitting sensitive information.

### No unnecessary questions

The bot should not ask for personal profile information.

### Bilingual from the beginning

Amharic is the initial language, with English available through language selection.

### No technical language

The student should not see terms such as:

```text
MongoDB
Telegram ID
AES-256
webhook
database
```

The privacy explanation should be understandable without technical knowledge.

### Consistency

The same workflow should exist in both supported interface languages.

---

# 35. UX State Model

The bot can conceptually maintain these temporary interaction states:

```text
START
LANGUAGE_SELECTION
PRIVACY_NOTICE
MAIN_MENU
SUBMISSION_INSTRUCTIONS
WAITING_FOR_PRAYER_TEXT
REVIEWING_REQUEST
SUBMISSION_PROCESSING
SUBMISSION_COMPLETE
CANCELLED
```

These states describe the conversation state only.

They should not be confused with permanent prayer-request database status.

---

# 36. Prayer Request Lifecycle

A stored prayer request has a separate lifecycle:

```text
SUBMITTED
   ↓
STORED
   ↓
ELIGIBLE_FOR_WEEKLY_DISPATCH
   ↓
PUBLISHED
   ↓
EXPIRED
   ↓
DELETED
```

This distinction is important.

Conversation state:

```text
WAITING_FOR_PRAYER_TEXT
```

is not the same thing as:

```text
Prayer Request:
STORED
```

---

# 37. MVP Out-of-Scope User Flows

The following are intentionally excluded:

```text
Student creates account
Student logs in
Student views past requests
Student edits an already submitted request
Prayer team replies to student
Student receives personalized prayer-team response
Public prayer-request feed
Media/file prayer submissions
AI moderation/classification
Automatic translation
Admin web dashboard
```

These may be considered later.

---

# 38. Final User-Flow Principle

The ideal student experience is:

```text
Choose language
      ↓
Understand privacy
      ↓
Write prayer
      ↓
Review
      ↓
Submit
      ↓
Receive confirmation
```

The ideal prayer-team experience is:

```text
Wait during collection period
      ↓
Weekly scheduled publication
      ↓
Receive digest only if requests exist
      ↓
Pray
```

No one should have to perform unnecessary technical or administrative actions.
