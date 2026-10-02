import { LocalEmbeddingProvider } from './providers/LocalEmbeddingProvider';
import { SemanticSearchResult } from './types';

interface IndexedDocument extends SemanticSearchResult { embedding: number[]; }

const cosineSimilarity = (a: number[], b: number[]) => {
  const length = Math.min(a.length, b.length);
  let dot = 0;
  let aNorm = 0;
  let bNorm = 0;
  for (let index = 0; index < length; index += 1) { dot += a[index] * b[index]; aNorm += a[index] ** 2; bNorm += b[index] ** 2; }
  return dot / ((Math.sqrt(aNorm) * Math.sqrt(bNorm)) || 1);
};

export class LocalSemanticSearchIndex {
  private readonly embeddingProvider = new LocalEmbeddingProvider();
  private documents: IndexedDocument[] = [];

  async index(document: SemanticSearchResult): Promise<void> {
    this.documents = [...this.documents.filter((item) => !(item.sessionId === document.sessionId && item.timestampMs === document.timestampMs)), { ...document, embedding: await this.embeddingProvider.embed(document.snippet) }];
  }

  async search(query: string, limit = 8): Promise<SemanticSearchResult[]> {
    const queryEmbedding = await this.embeddingProvider.embed(query);
    return this.documents.map(({ embedding, ...document }) => ({ ...document, score: cosineSimilarity(queryEmbedding, embedding) })).sort((a, b) => b.score - a.score).slice(0, limit);
  }
}
