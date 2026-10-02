import { AnalysisEvent } from '../types/models';

export interface ConservativeInterpretation {
  observation: string;
  possibleInterpretations: string[];
  confidence: 'low' | 'moderate' | 'high';
}

/** Conservative wording is deliberate: observable signals are never converted into a character judgment. */
export function interpretSignal(event: AnalysisEvent): ConservativeInterpretation {
  return { observation: event.observation, possibleInterpretations: event.possibleInterpretations ?? ['context-dependent change'], confidence: event.confidence };
}
