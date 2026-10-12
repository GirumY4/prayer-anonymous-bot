import { ApplicationError } from '../../shared/errors/application-error.js';
import { ErrorCode } from '../../shared/errors/error-codes.js';

export interface PublishablePrayerRequest {
  requestId: string;
  plaintext: string;
}

export interface DigestChunk {
  requestIds: string[];
  text: string;
}

export interface DigestChunker {
  chunk(requests: PublishablePrayerRequest[], maxLength?: number): DigestChunk[];
}

export class StandardDigestChunker implements DigestChunker {
  private readonly header =
    '🙏 Weekly Anonymous Prayer Requests\nChristian Students Fellowship — Pray Team\n\nPlease keep these requests in prayer.\n';

  private readonly separator = '\n────────────────────\n';

  private readonly footer = '\nMay God strengthen everyone who submitted these requests. 🙏';

  private readonly defaultMaxLength = 4096;

  chunk(
    requests: PublishablePrayerRequest[],
    maxLength: number = this.defaultMaxLength,
  ): DigestChunk[] {
    const chunks: DigestChunk[] = [];

    let currentBlocks: string[] = [];
    let currentRequestIds: string[] = [];

    const flush = (): void => {
      if (currentBlocks.length === 0) {
        return;
      }

      chunks.push({
        requestIds: currentRequestIds,
        text: this.compose(currentBlocks),
      });

      currentBlocks = [];
      currentRequestIds = [];
    };

    for (const request of requests) {
      const block = this.createBlock(request, maxLength);

      const candidateBlocks = [...currentBlocks, block];
      const candidateText = this.compose(candidateBlocks);

      if (candidateText.length <= maxLength) {
        currentBlocks = candidateBlocks;

        if (!currentRequestIds.includes(request.requestId)) {
          currentRequestIds.push(request.requestId);
        }

        continue;
      }

      flush();

      const singleBlockText = this.compose([block]);

      if (singleBlockText.length > maxLength) {
        throw new ApplicationError(
          ErrorCode.DIGEST_REQUEST_TOO_LARGE,
          'A prayer request is too large to fit into a Telegram digest message.',
          500,
        );
      }

      currentBlocks = [block];
      currentRequestIds = [request.requestId];
    }

    flush();

    return chunks;
  }

  private createBlock(request: PublishablePrayerRequest, maxLength: number): string {
    const block = `${request.requestId}\n${request.plaintext}`;
    const testText = this.compose([block]);

    if (testText.length > maxLength) {
      throw new ApplicationError(
        ErrorCode.DIGEST_REQUEST_TOO_LARGE,
        'A prayer request is too large to fit into a Telegram digest message.',
        500,
      );
    }

    return block;
  }

  private compose(blocks: string[]): string {
    if (blocks.length === 0) {
      return '';
    }

    return `${this.header}${this.separator}${blocks.join(this.separator)}${this.separator}${this.footer}`;
  }
}
