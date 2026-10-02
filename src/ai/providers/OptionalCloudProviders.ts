import { AdvancedAnalysisProvider } from '../types';

/**
 * Cloud providers are intentionally stubs. Screens should ask a configured provider
 * explicitly; no provider is constructed or called by default.
 */
export class UnconfiguredAdvancedProvider implements AdvancedAnalysisProvider {
  readonly id = 'none';
  readonly local = false;
  readonly providerType = 'local_llm' as const;

  async summarize(): Promise<string> {
    throw new Error('ADVANCED_AI_NOT_CONFIGURED');
  }

  async analyze(): Promise<string> {
    throw new Error('ADVANCED_AI_NOT_CONFIGURED');
  }
}
