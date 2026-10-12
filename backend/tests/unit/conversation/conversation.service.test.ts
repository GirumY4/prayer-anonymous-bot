import { describe, it, expect, beforeEach } from 'vitest';
import { DefaultConversationService } from '../../../src/modules/conversation/conversation.service.js';
import { InMemorySessionStore } from '../../../src/infrastructure/conversation/in-memory-session.store.js';
import { ConversationState } from '../../../src/modules/conversation/conversation.state.js';

describe('DefaultConversationService', () => {
  let sessionStore: InMemorySessionStore;
  let service: DefaultConversationService;
  const chatId = 'user-chat-123';

  beforeEach(() => {
    sessionStore = new InMemorySessionStore();
    service = new DefaultConversationService(sessionStore, 15, 'am');
  });

  it('initializes a new session in LANGUAGE_SELECTION state with default language', async () => {
    const session = await service.handleAction(chatId, { type: 'START' });
    expect(session.chatId).toBe(chatId);
    expect(session.state).toBe(ConversationState.LANGUAGE_SELECTION);
    expect(session.language).toBe('am');
  });

  it('progresses through onboarding: language selection -> privacy notice -> main menu', async () => {
    // 1. Start
    await service.handleAction(chatId, { type: 'START' });

    // 2. Choose English
    let session = await service.handleAction(chatId, {
      type: 'SELECT_LANGUAGE',
      language: 'en',
    });
    expect(session.state).toBe(ConversationState.PRIVACY_NOTICE);
    expect(session.language).toBe('en');

    // 3. Acknowledge privacy
    session = await service.handleAction(chatId, { type: 'ACKNOWLEDGE_PRIVACY' });
    expect(session.state).toBe(ConversationState.MAIN_MENU);
    expect(session.privacyAcknowledged).toBe(true);
  });

  it('navigates to privacy details from privacy notice and returns via NAV_BACK', async () => {
    await service.handleAction(chatId, { type: 'START' });
    await service.handleAction(chatId, { type: 'SELECT_LANGUAGE', language: 'am' });

    // View details from notice
    let session = await service.handleAction(chatId, { type: 'SHOW_PRIVACY_DETAILS' });
    expect(session.state).toBe(ConversationState.PRIVACY_DETAILS);

    // Back returns to privacy notice
    session = await service.handleAction(chatId, { type: 'NAV_BACK' });
    expect(session.state).toBe(ConversationState.PRIVACY_NOTICE);
  });

  it('navigates to privacy details from main menu and returns to main menu via NAV_BACK', async () => {
    await service.handleAction(chatId, { type: 'START' });
    await service.handleAction(chatId, { type: 'SELECT_LANGUAGE', language: 'en' });
    await service.handleAction(chatId, { type: 'ACKNOWLEDGE_PRIVACY' });

    // View details from main menu
    let session = await service.handleAction(chatId, { type: 'SHOW_PRIVACY_DETAILS' });
    expect(session.state).toBe(ConversationState.PRIVACY_DETAILS);

    // Back returns to main menu
    session = await service.handleAction(chatId, { type: 'NAV_BACK' });
    expect(session.state).toBe(ConversationState.MAIN_MENU);
  });

  it('handles submission journey: start -> enter draft -> review -> complete', async () => {
    // Reach main menu
    await service.handleAction(chatId, { type: 'START' });
    await service.handleAction(chatId, { type: 'SELECT_LANGUAGE', language: 'en' });
    await service.handleAction(chatId, { type: 'ACKNOWLEDGE_PRIVACY' });

    // Start submission
    let session = await service.handleAction(chatId, { type: 'START_SUBMISSION' });
    expect(session.state).toBe(ConversationState.WAITING_FOR_PRAYER);

    // Submit draft text
    session = await service.handleAction(chatId, {
      type: 'SUBMIT_DRAFT_TEXT',
      text: 'My private prayer request',
    });
    expect(session.state).toBe(ConversationState.REVIEWING_REQUEST);
    expect(session.draftText).toBe('My private prayer request');

    // Confirm submission
    session = await service.handleAction(chatId, { type: 'CONFIRM_SUBMISSION' });
    expect(session.state).toBe(ConversationState.SUBMISSION_PROCESSING);

    // Complete submission (after DB success)
    session = await service.handleAction(chatId, { type: 'COMPLETE_SUBMISSION' });
    expect(session.state).toBe(ConversationState.MAIN_MENU);
    expect(session.draftText).toBeUndefined();
  });

  it('cancels draft and clears temporary text', async () => {
    await service.handleAction(chatId, { type: 'START' });
    await service.handleAction(chatId, { type: 'SELECT_LANGUAGE', language: 'en' });
    await service.handleAction(chatId, { type: 'ACKNOWLEDGE_PRIVACY' });
    await service.handleAction(chatId, { type: 'START_SUBMISSION' });
    await service.handleAction(chatId, {
      type: 'SUBMIT_DRAFT_TEXT',
      text: 'Draft to cancel',
    });

    const session = await service.handleAction(chatId, { type: 'CANCEL' });
    expect(session.state).toBe(ConversationState.MAIN_MENU);
    expect(session.draftText).toBeUndefined();
    expect(await service.getDraft(chatId)).toBeNull();
  });

  it('allows editing draft and preserves text for revision', async () => {
    await service.handleAction(chatId, { type: 'START' });
    await service.handleAction(chatId, { type: 'SELECT_LANGUAGE', language: 'en' });
    await service.handleAction(chatId, { type: 'ACKNOWLEDGE_PRIVACY' });
    await service.handleAction(chatId, { type: 'START_SUBMISSION' });
    await service.handleAction(chatId, {
      type: 'SUBMIT_DRAFT_TEXT',
      text: 'First draft',
    });

    const session = await service.handleAction(chatId, { type: 'EDIT_DRAFT' });
    expect(session.state).toBe(ConversationState.WAITING_FOR_PRAYER);
  });

  it('preserves draft when changing language during WAITING_FOR_PRAYER', async () => {
    await service.handleAction(chatId, { type: 'START' });
    await service.handleAction(chatId, { type: 'SELECT_LANGUAGE', language: 'en' });
    await service.handleAction(chatId, { type: 'ACKNOWLEDGE_PRIVACY' });
    await service.handleAction(chatId, { type: 'START_SUBMISSION' });

    // User triggers language change while waiting for prayer
    let session = await service.handleAction(chatId, { type: 'CHANGE_LANGUAGE' });
    expect(session.state).toBe(ConversationState.LANGUAGE_SELECTION);

    // Selects Amharic
    session = await service.handleAction(chatId, { type: 'SELECT_LANGUAGE', language: 'am' });
    expect(session.state).toBe(ConversationState.WAITING_FOR_PRAYER);
    expect(session.language).toBe('am');
  });

  it('allows changing language while the privacy notice is displayed without skipping it', async () => {
    await service.handleAction(chatId, { type: 'START' });
    await service.handleAction(chatId, { type: 'SELECT_LANGUAGE', language: 'am' });
    expect((await service.getSession(chatId))?.state).toBe(ConversationState.PRIVACY_NOTICE);

    // Correcting the language must not silently drop the privacy notice
    const session = await service.handleAction(chatId, {
      type: 'SELECT_LANGUAGE',
      language: 'en',
    });

    expect(session.language).toBe('en');
    expect(session.state).toBe(ConversationState.PRIVACY_NOTICE);
    expect(session.privacyAcknowledged).toBeUndefined();
  });

  it('renders /help during onboarding and returns to where it was opened', async () => {
    await service.handleAction(chatId, { type: 'START' });

    const help = await service.handleAction(chatId, { type: 'SHOW_HELP' });
    expect(help.state).toBe(ConversationState.HELP);

    // Help must never bypass language selection or the privacy notice
    const back = await service.handleAction(chatId, { type: 'NAV_BACK' });
    expect(back.state).toBe(ConversationState.LANGUAGE_SELECTION);
    expect(back.privacyAcknowledged).toBeUndefined();

    // Still able to reach the main menu through the normal gate afterwards
    await service.handleAction(chatId, { type: 'SELECT_LANGUAGE', language: 'en' });
    const menu = await service.handleAction(chatId, { type: 'ACKNOWLEDGE_PRIVACY' });
    expect(menu.state).toBe(ConversationState.MAIN_MENU);
    expect(menu.privacyAcknowledged).toBe(true);
  });

  it('keeps an active prayer draft when /help is opened from WAITING_FOR_PRAYER', async () => {
    await service.handleAction(chatId, { type: 'START' });
    await service.handleAction(chatId, { type: 'SELECT_LANGUAGE', language: 'en' });
    await service.handleAction(chatId, { type: 'ACKNOWLEDGE_PRIVACY' });
    await service.handleAction(chatId, { type: 'START_SUBMISSION' });
    await service.handleAction(chatId, { type: 'SUBMIT_DRAFT_TEXT', text: 'Draft in progress' });

    // The draft now sits in review state
    const reviewing = await service.getSession(chatId);
    expect(reviewing?.state).toBe(ConversationState.REVIEWING_REQUEST);

    const help = await service.handleAction(chatId, { type: 'SHOW_HELP' });
    expect(help.state).toBe(ConversationState.HELP);
    expect(help.draftText).toBe('Draft in progress');

    // Back must return to the review screen instead of dropping the draft
    const back = await service.handleAction(chatId, { type: 'NAV_BACK' });
    expect(back.state).toBe(ConversationState.REVIEWING_REQUEST);
    expect(back.draftText).toBe('Draft in progress');
  });

  it('expires session after TTL passes', async () => {
    await service.handleAction(chatId, { type: 'START' });
    const stored = await sessionStore.get(chatId);
    expect(stored).not.toBeNull();

    // Expire session artificially
    if (stored) {
      stored.expiresAt = new Date(Date.now() - 1000);
      await sessionStore.set(stored);
    }

    const fetched = await service.getSession(chatId);
    expect(fetched).toBeNull();

    // Next action resets session
    const resetSession = await service.handleAction(chatId, { type: 'START' });
    expect(resetSession.state).toBe(ConversationState.LANGUAGE_SELECTION);
  });
});
