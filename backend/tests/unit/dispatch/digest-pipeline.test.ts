import { describe, it, expect } from 'vitest';
import { SecureRequestRandomizer } from '../../../src/modules/dispatch/request-randomizer.js';
import { StandardDigestChunker } from '../../../src/modules/dispatch/digest-chunker.js';

describe('Dispatch Pipeline Components', () => {
  describe('SecureRequestRandomizer', () => {
    it('returns an array with identical elements in random order without losing elements', () => {
      const randomizer = new SecureRequestRandomizer();
      const items = ['PR-001', 'PR-002', 'PR-003', 'PR-004', 'PR-005', 'PR-006'];

      const randomized = randomizer.randomize(items);

      expect(randomized).toHaveLength(items.length);
      expect([...randomized].sort()).toEqual([...items].sort());
    });
  });

  describe('StandardDigestChunker', () => {
    it('formats prayer requests into an anonymous weekly digest with headers and footers', () => {
      const chunker = new StandardDigestChunker();
      const requests = [
        { requestId: 'PR-A1B2C3D4', plaintext: 'Please pray for peace.' },
        { requestId: 'PR-E5F6G7H8', plaintext: 'Please pray for healing.' },
      ];

      const chunks = chunker.chunk(requests);

      expect(chunks).toHaveLength(1);
      expect(chunks[0]?.requestIds).toEqual(['PR-A1B2C3D4', 'PR-E5F6G7H8']);
      expect(chunks[0]?.text).toContain('Weekly Anonymous Prayer Requests');
      expect(chunks[0]?.text).toContain('PR-A1B2C3D4');
      expect(chunks[0]?.text).toContain('Please pray for peace.');
      expect(chunks[0]?.text).toContain('PR-E5F6G7H8');
      expect(chunks[0]?.text).toContain('Please pray for healing.');
      expect(chunks[0]?.text).toContain('────────────────────');
    });

    it('contains nothing but the anonymous request ids and the prayer text', () => {
      const chunker = new StandardDigestChunker();

      const chunks = chunker.chunk([{ requestId: 'PR-A1B2C3D4', plaintext: 'Pray for peace.' }]);

      const expected =
        '🙏 Weekly Anonymous Prayer Requests\n' +
        'Christian Students Fellowship — Pray Team\n\n' +
        'Please keep these requests in prayer.\n' +
        '\n────────────────────\n' +
        'PR-A1B2C3D4\nPray for peace.' +
        '\n────────────────────\n' +
        '\nMay God strengthen everyone who submitted these requests. 🙏';

      expect(chunks[0]?.text).toBe(expected);
    });

    it('does not split messages that are within the character limit', () => {
      const chunker = new StandardDigestChunker();
      const requests = [{ requestId: 'PR-1', plaintext: 'Short request within the limit.' }];

      const chunks = chunker.chunk(requests, 4096);

      expect(chunks).toHaveLength(1);
      expect(chunks[0]?.text.length).toBeLessThanOrEqual(4096);
    });

    it('splits oversized digests so that every chunk respects the limit', () => {
      const chunker = new StandardDigestChunker();
      const requests = [
        { requestId: 'PR-1', plaintext: 'A'.repeat(2000) },
        { requestId: 'PR-2', plaintext: 'B'.repeat(2500) },
      ];

      const chunks = chunker.chunk(requests, 4000);

      expect(chunks.length).toBeGreaterThan(1);
      for (const chunk of chunks) {
        expect(chunk.text.length).toBeLessThanOrEqual(4000);
      }
      // Every request must appear exactly once across all chunks
      expect(chunks.flatMap((chunk) => chunk.requestIds)).toEqual(['PR-1', 'PR-2']);
    });

    it('rejects a single request that cannot fit into one message', () => {
      const chunker = new StandardDigestChunker();

      expect(() =>
        chunker.chunk([{ requestId: 'PR-1', plaintext: 'X'.repeat(5000) }], 2000),
      ).toThrow(/too large/i);
    });

    it('returns no chunks when there are no requests', () => {
      const chunker = new StandardDigestChunker();

      expect(chunker.chunk([])).toEqual([]);
    });
  });
});
