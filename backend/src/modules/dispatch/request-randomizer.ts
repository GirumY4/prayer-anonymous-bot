import { randomInt } from 'node:crypto';

export interface RequestRandomizer {
  randomize<T>(items: T[]): T[];
}

export class SecureRequestRandomizer implements RequestRandomizer {
  randomize<T>(items: T[]): T[] {
    const array = [...items];
    // Fisher-Yates shuffle using cryptographically secure random integers
    for (let i = array.length - 1; i > 0; i--) {
      const j = randomInt(0, i + 1);
      [array[i], array[j]] = [array[j]!, array[i]!];
    }
    return array;
  }
}
