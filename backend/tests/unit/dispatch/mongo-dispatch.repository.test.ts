import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MongoDispatchRepository } from '../../../src/infrastructure/database/repositories/mongo-dispatch.repository.js';
import { DispatchRecordModel } from '../../../src/infrastructure/database/models/dispatch.model.js';
import type { DispatchRecordAttrs } from '../../../src/infrastructure/database/models/dispatch.model.js';

describe('MongoDispatchRepository & Dispatch Model Schema', () => {
  let repo: MongoDispatchRepository;

  beforeEach(() => {
    repo = new MongoDispatchRepository();
    vi.restoreAllMocks();
  });

  describe('Schema Invariants', () => {
    it('defines occurrenceKey as required and unique in DispatchRecord schema', () => {
      const occurrenceKeyPath = DispatchRecordModel.schema.paths['occurrenceKey'];
      expect(occurrenceKeyPath).toBeDefined();
      expect(occurrenceKeyPath?.isRequired).toBe(true);
      // In Mongoose schema, unique can be boolean true or an index definition
      expect(occurrenceKeyPath?.options.unique).toBe(true);
    });

    it('defines dispatchId as required and unique in DispatchRecord schema', () => {
      const dispatchIdPath = DispatchRecordModel.schema.paths['dispatchId'];
      expect(dispatchIdPath).toBeDefined();
      expect(dispatchIdPath?.isRequired).toBe(true);
      expect(dispatchIdPath?.options.unique).toBe(true);
    });

    it('allows weekKey as optional without a unique constraint', () => {
      const weekKeyPath = DispatchRecordModel.schema.paths['weekKey'];
      expect(weekKeyPath).toBeDefined();
      expect(weekKeyPath?.isRequired).toBeFalsy();
      expect(weekKeyPath?.options.unique).toBeFalsy();
    });
  });

  describe('Repository Method Mapping', () => {
    it('getByOccurrenceKey queries DispatchRecordModel with occurrenceKey', async () => {
      const mockDoc = {
        _id: 'mongo-id-123',
        dispatchId: 'DISPATCH-2026-10-18',
        occurrenceKey: '2026-10-18',
        weekKey: '2026-10-18',
        collectionStartAt: new Date('2026-10-11T18:00:00Z'),
        collectionEndAt: new Date('2026-10-18T18:00:00Z'),
        scheduledAt: new Date('2026-10-18T18:00:00Z'),
        status: 'completed',
        eligibleRequestCount: 3,
        startedAt: new Date(),
        completedAt: new Date(),
        sentChunks: [
          {
            telegramMessageId: 101,
            requestIds: ['PR-001', 'PR-002'],
            sentAt: new Date(),
          },
        ],
      };

      vi.spyOn(DispatchRecordModel, 'findOne').mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockDoc),
      } as unknown as ReturnType<typeof DispatchRecordModel.findOne>);

      const result = await repo.getByOccurrenceKey('2026-10-18');

      expect(DispatchRecordModel.findOne).toHaveBeenCalledWith({
        occurrenceKey: '2026-10-18',
      });
      expect(result).toBeDefined();
      expect(result?.dispatchId).toBe('DISPATCH-2026-10-18');
      expect(result?.occurrenceKey).toBe('2026-10-18');
      expect(result?.status).toBe('completed');
      expect(result?.sentChunks).toHaveLength(1);
      expect(result?.sentChunks[0]?.requestIds).toEqual(['PR-001', 'PR-002']);
    });

    it('getByWeekKey delegates to getByOccurrenceKey for backward compatibility', async () => {
      const spy = vi.spyOn(repo, 'getByOccurrenceKey').mockResolvedValue(null);

      await repo.getByWeekKey('2026-10-18');

      expect(spy).toHaveBeenCalledWith('2026-10-18');
    });

    it('create invokes DispatchRecordModel.create and returns mapped domain object', async () => {
      const newAttrs: DispatchRecordAttrs = {
        dispatchId: 'DISPATCH-2026-10-21',
        occurrenceKey: '2026-10-21',
        weekKey: '2026-10-21',
        collectionStartAt: new Date('2026-10-14T18:00:00Z'),
        collectionEndAt: new Date('2026-10-21T18:00:00Z'),
        scheduledAt: new Date('2026-10-21T18:00:00Z'),
        status: 'scheduled',
        eligibleRequestCount: 0,
        startedAt: null,
        completedAt: null,
        sentChunks: [],
      };

      const createdDoc = {
        _id: 'new-id-456',
        ...newAttrs,
      };

      vi.spyOn(DispatchRecordModel, 'create').mockResolvedValue(
        createdDoc as unknown as Awaited<ReturnType<typeof DispatchRecordModel.create>>,
      );

      const created = await repo.create(newAttrs);

      expect(DispatchRecordModel.create).toHaveBeenCalledWith(newAttrs);
      expect(created.id).toBe('new-id-456');
      expect(created.dispatchId).toBe('DISPATCH-2026-10-21');
      expect(created.occurrenceKey).toBe('2026-10-21');
    });
  });
});
