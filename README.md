# Anonymous Prayer Request Bot

A privacy-first Telegram bot for a Christian Students Fellowship.

The bot allows students to submit prayer requests anonymously. Requests are collected during the week and sent to the Pray Team Telegram group as a weekly anonymous digest.

## Privacy Principles

- No Telegram identity is stored with a prayer request.
- Original Telegram messages are never forwarded.
- Prayer content is encrypted before storage.
- Empty weekly collections send nothing to the Pray Team group.
- Sensitive information is retained only for a limited period.
- Production logs must not contain prayer content or unnecessary identity data.

## Repository Structure

```text
prayer-anonymous-bot/
├── backend/
├── docs/
├── README.md
└── .gitignore
```
