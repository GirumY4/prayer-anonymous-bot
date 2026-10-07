export const TranslationKey = {
  // Welcome & Language
  WELCOME_TITLE: 'welcome.title',
  LANGUAGE_CHOOSE: 'language.choose',
  LANGUAGE_AMHARIC: 'language.amharic',
  LANGUAGE_ENGLISH: 'language.english',

  // Privacy
  PRIVACY_TITLE: 'privacy.title',
  PRIVACY_NOTICE: 'privacy.notice',
  PRIVACY_ACKNOWLEDGE: 'privacy.acknowledge',
  PRIVACY_DETAILS: 'privacy.details',

  // Menu
  MENU_TITLE: 'menu.title',
  MENU_SUBMIT: 'menu.submit',
  MENU_CHANGE_LANGUAGE: 'menu.change_language',
  MENU_PRIVACY: 'menu.privacy',
  MENU_HELP: 'menu.help',

  // Submission
  SUBMISSION_INSTRUCTIONS: 'submission.instructions',
  SUBMISSION_CANCEL: 'submission.cancel',

  // Review
  REVIEW_TITLE: 'review.title',
  REVIEW_WARNING: 'review.warning',
  REVIEW_SUBMIT: 'review.submit',
  REVIEW_EDIT: 'review.edit',
  REVIEW_CANCEL: 'review.cancel',

  // Confirmation
  CONFIRMATION_SUCCESS: 'confirmation.success',
  CONFIRMATION_REQUEST_ID: 'confirmation.request_id',

  // Errors
  ERROR_EMPTY_REQUEST: 'error.empty_request',
  ERROR_TOO_LONG: 'error.too_long',
  ERROR_UNSUPPORTED_MEDIA: 'error.unsupported_media',
  ERROR_GENERAL: 'error.general',
  ERROR_SESSION_EXPIRED: 'error.session_expired',
  ERROR_INVALID_CALLBACK: 'error.invalid_callback',

  // Help & Safety
  HELP_TITLE: 'help.title',
  HELP_CONTENT: 'help.content',
  SAFETY_WARNING: 'safety.warning',

  // Cancellation & Commands
  CANCELLATION_SUCCESS: 'cancellation.success',
  COMMAND_UNKNOWN: 'command.unknown',
} as const;

export type TranslationKey = (typeof TranslationKey)[keyof typeof TranslationKey];
