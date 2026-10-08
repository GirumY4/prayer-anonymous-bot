export interface PublishablePrayerRequest {
  requestId: string;
  plaintext: string;
}

export interface DigestBuilder {
  build(requests: PublishablePrayerRequest[]): string;
}

export class StandardDigestBuilder implements DigestBuilder {
  build(requests: PublishablePrayerRequest[]): string {
    const header =
      '🙏 Weekly Anonymous Prayer Requests\nChristian Students Fellowship — Pray Team\n\nPlease keep these requests in prayer.\n';
    const separator = '\n────────────────────\n';
    const footer = '\nMay God strengthen everyone who submitted these requests. 🙏';

    const body = requests.map((req) => `${req.requestId}\n${req.plaintext}`).join(separator);

    return `${header}${separator}${body}${separator}${footer}`;
  }
}
