import type { TranslationKey } from '../../translation-keys.js';

export const enMessages: Record<TranslationKey, string> = {
  // Welcome & Language
  'welcome.title': '🙏 Welcome to the Anonymous Prayer Request Bot!',
  'language.choose': 'Please choose your language.',
  'language.amharic': '🇪🇹 አማርኛ',
  'language.english': '🇬🇧 English',

  // Privacy
  'privacy.title': '🔒 Privacy Notice',
  'privacy.notice':
    'This bot allows you to submit prayer requests anonymously to the Pray Team. The application does not store your Telegram identity with your prayer request. Please do not include your name, phone number, or identifying details in your prayer. This is not an emergency service.',
  'privacy.acknowledge': '✅ I Understand',
  'privacy.details': '🔒 Privacy Details',

  // Menu
  'menu.title': '🙏 Main Menu\nWhat would you like to do?',
  'menu.submit': '🙏 Submit Prayer Request',
  'menu.change_language': '🌐 Change Language',
  'menu.privacy': '🔒 Privacy Information',
  'menu.help': 'ℹ️ Help',

  // Submission
  'submission.instructions':
    '🙏 Please write the prayer request you would like the Pray Team to pray for.\n\nYou may share something deeply personal. For your privacy, please DO NOT include:\n• Your name\n• Telegram username\n• Phone number\n• Student ID\n• Details that could easily identify you\n\nPlease send your prayer request as a text message.',
  'submission.cancel': '❌ Cancel',

  // Review
  'review.title': '🙏 Please review your prayer request:',
  'review.warning':
    'Make sure you have not included your name or other information that could identify you.',
  'review.submit': '✅ Submit Anonymously',
  'review.edit': '✏️ Edit',
  'review.cancel': '❌ Cancel',

  // Confirmation
  'confirmation.success':
    '🙏 Your prayer request has been received successfully.\n\nIt will be included anonymously in the next weekly prayer-team collection.',
  'confirmation.request_id': 'Request ID:',

  // Errors
  'error.empty_request':
    '⚠️ Your prayer request is empty. Please write your prayer request and send it again.',
  'error.too_long': '⚠️ Your prayer request is too long. Please shorten it and try again.',
  'error.unsupported_media':
    '⚠️ Please send your prayer request as text. Images, voice messages, and files are not supported.',
  'error.general': '⚠️ Something went wrong. Please try again.',
  'error.session_expired':
    '⚠️ Your session expired for privacy reasons. Please use /start to begin again.',
  'error.invalid_callback': '⚠️ That action is no longer valid. Please use the current menu.',

  // Help & Safety
  'help.title': 'ℹ️ Help',
  'help.content':
    "This bot collects anonymous prayer requests for the fellowship's Pray Team.\n\n1. Press 'Submit Prayer Request'.\n2. Write your prayer (do not include your name).\n3. Review and submit.\n4. Your request will be sent anonymously in the weekly digest.\n\nCommands:\n/cancel - Cancel current draft\n/language - Change language\n/privacy - View privacy info",
  'safety.warning':
    '⚠️ Important: This bot is for prayer requests. It is not an emergency or crisis-response service. If you or someone else is in immediate danger, please contact a trusted person or appropriate emergency/help service directly.',

  // Cancellation & Commands
  'cancellation.success':
    '❌ Your current prayer-request draft was cancelled. No prayer request was submitted.',
  'command.unknown': "I don't recognize that command. Use /help to see available options.",
};
