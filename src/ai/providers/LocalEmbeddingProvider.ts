import { EmbeddingProvider } from '../types';

/** Deterministic lightweight fallback used before an on-device embedding model is installed. */
export class LocalEmbeddingProvider implements EmbeddingProvider {
  readonly id = 'local-hash-embedding';
  readonly local = true;

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async embed(text: string): Promise<number[]> {
    const vector = Array.from({ length: 32 }, () => 0);
    for (let index = 0; index < text.length; index += 1) {
      vector[index % vector.length] = (vector[index % vector.length] + text.charCodeAt(index) / 255) % 1;
    }
    const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
    return vector.map((value) => value / magnitude);
  }
}
