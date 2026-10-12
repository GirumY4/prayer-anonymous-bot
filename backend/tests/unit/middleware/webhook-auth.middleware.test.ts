import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { createWebhookAuthMiddleware } from '../../../src/middleware/webhook-auth.middleware.js';

describe('createWebhookAuthMiddleware', () => {
  const secret = 'super-secret-telegram-webhook-token-12345';
  const middleware = createWebhookAuthMiddleware(secret);

  function createMockHttp() {
    const req = {
      header: vi.fn(),
    } as unknown as Request;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    const next = vi.fn() as NextFunction;

    return { req, res, next };
  }

  it('allows request with valid secret token in x-telegram-bot-api-secret-token header', () => {
    const { req, res, next } = createMockHttp();
    vi.mocked(req.header).mockReturnValue(secret);

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects request with 401 when header is missing', () => {
    const { req, res, next } = createMockHttp();
    vi.mocked(req.header).mockReturnValue(undefined);

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });

  it('rejects request with 401 when header is wrong length', () => {
    const { req, res, next } = createMockHttp();
    vi.mocked(req.header).mockReturnValue('short');

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('rejects request with 401 when header has identical length but wrong characters', () => {
    const { req, res, next } = createMockHttp();
    const wrongSecret = secret.slice(0, -1) + 'X';
    vi.mocked(req.header).mockReturnValue(wrongSecret);

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
