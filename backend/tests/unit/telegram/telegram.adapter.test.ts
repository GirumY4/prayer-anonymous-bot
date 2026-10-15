import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context } from 'grammy';
import { TelegramAdapter } from '../../../src/modules/telegram/telegram.adapter.js';
import { DefaultConversationService } from '../../../src/modules/conversation/conversation.service.js';
import { InMemorySessionStore } from '../../../src/infrastructure/conversation/in-memory-session.store.js';
import { StaticLocalizationService } from '../../../src/infrastructure/localization/static-localization.service.js';
import { TelegramKeyboards } from '../../../src/modules/telegram/keyboards.js';
import { PrayerRequestValidator } from '../../../src/modules/prayer-requests/prayer-request.validation.js';
import type { PrayerRequestService } from '../../../src/modules/prayer-requests/prayer-request.service.js';
import { ConversationState } from '../../../src/modules/conversation/conversation.state.js';

describe('TelegramAdapter', () => {
  let sessionStore: InMemorySessionStore;
  let conversationService: DefaultConversationService;
  let i18n: StaticLocalizationService;
  let keyboards: TelegramKeyboards;
  let mockPrayerRequestService: PrayerRequestService;
  let validator: PrayerRequestValidator;
  let adapter: TelegramAdapter;

  // Must match the chat id produced by the mock context below
  const chatId = '987';

  function createMockContext(overrides?: Partial<Context>): Context {
    return {
      chat: { id: 987, type: 'private' },
      reply: vi.fn().mockResolvedValue(undefined),
      answerCallbackQuery: vi.fn().mockResolvedValue(undefined),
      ...overrides,
    } as unknown as Context;
  }

  // Only the fields the adapter reads are provided by these helpers
  const textMessage = (text: string): Context['message'] => ({ text }) as Context['message'];

  const photoMessage = (): Context['message'] =>
    ({ photo: [{ file_id: 'photo_id' }] }) as Context['message'];

  const callback = (data: string): Context['callbackQuery'] =>
    ({ data }) as Context['callbackQuery'];

  beforeEach(() => {
    sessionStore = new InMemorySessionStore();
    i18n = new StaticLocalizationService();
    conversationService = new DefaultConversationService(sessionStore, 15, 'am');
    keyboards = new TelegramKeyboards(i18n);
    validator = new PrayerRequestValidator(3000);

    mockPrayerRequestService = {
      submit: vi.fn().mockResolvedValue({ requestId: 'PR-TEST1234' }),
    } as unknown as PrayerRequestService;

    adapter = new TelegramAdapter(
      conversationService,
      i18n,
      keyboards,
      mockPrayerRequestService,
      validator,
    );
  });

  describe('Command Handling', () => {
    it('handles /start by sending welcome message and language keyboard', async () => {
      const ctx = createMockContext({ message: textMessage('/start') });
      await adapter.handleUpdate(ctx);

      expect(ctx.reply).toHaveBeenCalledTimes(1);
      const call = vi.mocked(ctx.reply).mock.calls[0];
      expect(call?.[0]).toContain('እንኳን ወደ ሚስጥራዊ የጸሎት ጥያቄ ማስቀመጫ ቦት በሰላም መጡ።');
    });

    it('handles /help by displaying help and safety information', async () => {
      const ctx = createMockContext({ message: textMessage('/help') });
      await adapter.handleUpdate(ctx);

      expect(ctx.reply).toHaveBeenCalledTimes(1);
      const call = vi.mocked(ctx.reply).mock.calls[0];
      expect(call?.[0]).toContain('ይህ ቦት ለህብረቱ የጸሎት ቡድን');
    });

    it('handles /privacy by displaying privacy details with localized Back button', async () => {
      const ctx = createMockContext({ message: textMessage('/privacy') });
      await adapter.handleUpdate(ctx);

      expect(ctx.reply).toHaveBeenCalledTimes(1);
      const call = vi.mocked(ctx.reply).mock.calls[0];
      expect(call?.[1]?.reply_markup).toBeDefined();
    });

    it('handles unrecognized commands gracefully', async () => {
      const ctx = createMockContext({ message: textMessage('/unknown_cmd') });
      await adapter.handleUpdate(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('ይህን ትዕዛዝ አላውቀውም'));
    });
  });

  describe('Callback Queries (Inline Buttons)', () => {
    it('handles language selection callbacks (lang:en and lang:am)', async () => {
      const ctxEn = createMockContext({ callbackQuery: callback('lang:en') });
      await adapter.handleUpdate(ctxEn);

      expect(ctxEn.answerCallbackQuery).toHaveBeenCalled();
      const session = await conversationService.getSession(chatId);
      expect(session?.language).toBe('en');
      expect(session?.state).toBe(ConversationState.PRIVACY_NOTICE);

      const ctxAm = createMockContext({ callbackQuery: callback('lang:am') });
      await adapter.handleUpdate(ctxAm);
      expect(ctxAm.answerCallbackQuery).toHaveBeenCalled();
      const updatedSession = await conversationService.getSession(chatId);
      expect(updatedSession?.language).toBe('am');
    });

    it('handles privacy acknowledgement callback (privacy:ack)', async () => {
      await conversationService.handleAction(chatId, { type: 'START' });
      await conversationService.handleAction(chatId, { type: 'SELECT_LANGUAGE', language: 'en' });

      const ctx = createMockContext({ callbackQuery: callback('privacy:ack') });
      await adapter.handleUpdate(ctx);

      expect(ctx.answerCallbackQuery).toHaveBeenCalled();
      const session = await conversationService.getSession(chatId);
      expect(session?.state).toBe(ConversationState.MAIN_MENU);
    });

    it('handles nav:back to return from privacy details to previous state', async () => {
      // From privacy notice -> details -> back
      await conversationService.handleAction(chatId, { type: 'START' });
      await conversationService.handleAction(chatId, { type: 'SELECT_LANGUAGE', language: 'en' });
      await conversationService.handleAction(chatId, { type: 'SHOW_PRIVACY_DETAILS' });

      const ctx = createMockContext({ callbackQuery: callback('nav:back') });
      await adapter.handleUpdate(ctx);

      expect(ctx.answerCallbackQuery).toHaveBeenCalled();
      const session = await conversationService.getSession(chatId);
      expect(session?.state).toBe(ConversationState.PRIVACY_NOTICE);
    });

    it('handles unrecognized callback data without throwing', async () => {
      const ctx = createMockContext({ callbackQuery: callback('unrecognized:button') });
      await adapter.handleUpdate(ctx);

      expect(ctx.answerCallbackQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.any(String),
        }),
      );
    });
  });

  describe('Prayer Submission Flow & Validation', () => {
    beforeEach(async () => {
      // Setup session in WAITING_FOR_PRAYER state in English
      await conversationService.handleAction(chatId, { type: 'START' });
      await conversationService.handleAction(chatId, { type: 'SELECT_LANGUAGE', language: 'en' });
      await conversationService.handleAction(chatId, { type: 'ACKNOWLEDGE_PRIVACY' });
      await conversationService.handleAction(chatId, { type: 'START_SUBMISSION' });
    });

    it('rejects empty or whitespace prayer text and stays in WAITING_FOR_PRAYER', async () => {
      const ctx = createMockContext({ message: textMessage('    ') });
      await adapter.handleUpdate(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Your prayer request is empty'),
        expect.anything(),
      );

      const session = await conversationService.getSession(chatId);
      expect(session?.state).toBe(ConversationState.WAITING_FOR_PRAYER);
    });

    it('rejects oversized text and stays in WAITING_FOR_PRAYER', async () => {
      const oversizedText = 'A'.repeat(3001);
      const ctx = createMockContext({ message: textMessage(oversizedText) });
      await adapter.handleUpdate(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Your prayer request is too long'),
        expect.anything(),
      );

      const session = await conversationService.getSession(chatId);
      expect(session?.state).toBe(ConversationState.WAITING_FOR_PRAYER);
    });

    it('accepts valid prayer text and advances to REVIEWING_REQUEST', async () => {
      const validText = 'Please pray for my mother who is having surgery tomorrow.';
      const ctx = createMockContext({ message: textMessage(validText) });
      await adapter.handleUpdate(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining(validText), expect.anything());

      const session = await conversationService.getSession(chatId);
      expect(session?.state).toBe(ConversationState.REVIEWING_REQUEST);
      expect(session?.draftText).toBe(validText);
    });

    it('cancels active draft via review:cancel and sends cancellation reassurance message', async () => {
      // First put valid draft in review
      await conversationService.handleAction(chatId, {
        type: 'SUBMIT_DRAFT_TEXT',
        text: 'Valid draft to cancel',
      });

      const ctx = createMockContext({ callbackQuery: callback('review:cancel') });
      await adapter.handleUpdate(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Your current prayer-request draft was cancelled'),
      );

      const session = await conversationService.getSession(chatId);
      expect(session?.state).toBe(ConversationState.MAIN_MENU);
      expect(session?.draftText).toBeUndefined();
    });

    it('allows editing draft via review:edit and returns to WAITING_FOR_PRAYER', async () => {
      await conversationService.handleAction(chatId, {
        type: 'SUBMIT_DRAFT_TEXT',
        text: 'Original draft',
      });

      const ctx = createMockContext({ callbackQuery: callback('review:edit') });
      await adapter.handleUpdate(ctx);

      const session = await conversationService.getSession(chatId);
      expect(session?.state).toBe(ConversationState.WAITING_FOR_PRAYER);
    });

    it('persists encrypted request on review:submit, clears draft, and returns request ID', async () => {
      await conversationService.handleAction(chatId, {
        type: 'SUBMIT_DRAFT_TEXT',
        text: 'Valid prayer to submit',
      });

      const ctx = createMockContext({ callbackQuery: callback('review:submit') });
      await adapter.handleUpdate(ctx);

      expect(mockPrayerRequestService.submit).toHaveBeenCalledWith('Valid prayer to submit');
      expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('PR-TEST1234'));

      const session = await conversationService.getSession(chatId);
      expect(session?.state).toBe(ConversationState.MAIN_MENU);
      expect(session?.draftText).toBeUndefined();
    });

    it('PREVENTS DUPLICATE SUBMISSION: rapid duplicate clicks on review:submit are dropped', async () => {
      await conversationService.handleAction(chatId, {
        type: 'SUBMIT_DRAFT_TEXT',
        text: 'Double click test',
      });

      // Simulate first click in progress
      vi.mocked(mockPrayerRequestService.submit).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ requestId: 'PR-RACE1' }), 100)),
      );

      const ctx1 = createMockContext({ callbackQuery: callback('review:submit') });
      const ctx2 = createMockContext({ callbackQuery: callback('review:submit') });

      // Fire both almost simultaneously
      const promise1 = adapter.handleUpdate(ctx1);
      const promise2 = adapter.handleUpdate(ctx2);

      await Promise.all([promise1, promise2]);

      // Service should ONLY have been called ONCE
      expect(mockPrayerRequestService.submit).toHaveBeenCalledTimes(1);
    });

    it('rejects unsupported media during WAITING_FOR_PRAYER', async () => {
      const ctx = createMockContext({ message: photoMessage() });
      await adapter.handleUpdate(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Please send your prayer request as text'),
        expect.anything(),
      );
    });
  });
});
