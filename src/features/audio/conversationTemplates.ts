import { AudioEnhancementSettings, ConversationTemplateId } from '../../types/models';

export interface ConversationTemplate {
  id: ConversationTemplateId;
  label: string;
  icon: string;
  detail: string;
  localOutputs: string[];
  plusOutputs: string[];
  privacyNote?: string;
}

export const conversationTemplates: ConversationTemplate[] = [
  { id: 'general', label: 'General', icon: 'conversation', detail: 'Flexible conversation notes and moments.', localOutputs: ['Transcript', 'Bookmarks', 'Notes'], plusOutputs: ['Summary', 'Ask recording'] },
  { id: 'meeting', label: 'Meeting', icon: 'meeting', detail: 'Decisions, owners, deadlines and follow-ups.', localOutputs: ['Transcript', 'Markers', 'Typed notes'], plusOutputs: ['Decisions', 'Action items', 'Follow-up email'] },
  { id: 'interview', label: 'Interview', icon: 'interview', detail: 'Questions, answers, quotes and topics.', localOutputs: ['Transcript', 'Quotes', 'Bookmarks'], plusOutputs: ['Q&A structure', 'Person summary'] },
  { id: 'lecture', label: 'Lecture', icon: 'lecture', detail: 'Long-form learning with chapters.', localOutputs: ['Transcript', 'Chapters', 'Vocabulary'], plusOutputs: ['Study guide', 'Flashcards', 'Quiz'] },
  { id: 'doctor', label: 'Doctor visit', icon: 'doctor-notes', detail: 'Organize instructions without diagnosis.', localOutputs: ['Transcript', 'Notes', 'Medication bookmarks'], plusOutputs: ['Instructions', 'Questions', 'Follow-ups'], privacyNote: 'Convenience notes only—not medical advice.' },
  { id: 'therapy', label: 'Reflection', icon: 'reflection', detail: 'Private topics, goals and things to revisit.', localOutputs: ['Private transcript', 'Personal notes'], plusOutputs: ['Themes', 'Goals', 'Revisit list'], privacyNote: 'Device-only processing is recommended.' },
  { id: 'business', label: 'Business call', icon: 'business-call', detail: 'Needs, objections, pricing and next steps.', localOutputs: ['Transcript', 'Moments', 'Notes'], plusOutputs: ['Needs', 'Objections', 'Follow-up'] },
  { id: 'sales', label: 'Sales call', icon: 'sales-call', detail: 'Buying signals, objections and competitors.', localOutputs: ['Transcript', 'Money markers'], plusOutputs: ['Buying signals', 'CRM notes'] },
  { id: 'brainstorm', label: 'Brainstorm', icon: 'idea', detail: 'Capture ideas and open questions.', localOutputs: ['Idea markers', 'Notes'], plusOutputs: ['Idea groups', 'Next experiments'] },
  { id: 'journal', label: 'Journal', icon: 'journal', detail: 'A private spoken journal.', localOutputs: ['Audio', 'Transcript', 'Notes'], plusOutputs: ['Journal entry', 'Goals', 'Tasks'] },
  { id: 'voice_memo', label: 'Voice memo', icon: 'microphone', detail: 'Fast, minimal audio capture.', localOutputs: ['Audio', 'Bookmark'], plusOutputs: ['Clean title', 'Quick summary'] },
  { id: 'conference', label: 'Conference', icon: 'conference', detail: 'Long-duration talks with chapters.', localOutputs: ['Transcript', 'Manual chapters'], plusOutputs: ['Automatic chapters', 'Key concepts'] },
  { id: 'podcast', label: 'Podcast', icon: 'podcast', detail: 'Multiple speakers, chapters and clean audio.', localOutputs: ['Audio', 'Markers', 'Transcript'], plusOutputs: ['Speaker labels', 'Chapters', 'Show notes'] },
  { id: 'legal', label: 'Legal notes', icon: 'balance', detail: 'Fact-focused notes and quoted statements.', localOutputs: ['Transcript', 'Timestamps', 'Original audio'], plusOutputs: ['Issue outline', 'Quote index'], privacyNote: 'Not legal advice. Follow recording-consent laws.' },
  { id: 'research', label: 'Research', icon: 'search', detail: 'Sources, claims and questions.', localOutputs: ['Transcript', 'Notes', 'Attachments'], plusOutputs: ['Themes', 'Research outline'] },
  { id: 'customer_interview', label: 'Customer interview', icon: 'interview', detail: 'Needs, pain points and product ideas.', localOutputs: ['Transcript', 'Idea markers'], plusOutputs: ['Needs', 'Quotes', 'Opportunities'] },
  { id: 'project_planning', label: 'Project planning', icon: 'planning', detail: 'Scope, risks, owners and milestones.', localOutputs: ['Transcript', 'Notes', 'Bookmarks'], plusOutputs: ['Tasks', 'Risks', 'Timeline'] },
];

export const defaultAudioEnhancements: AudioEnhancementSettings = {
  noiseSuppression: false,
  voiceEnhancement: true,
  automaticGain: true,
  echoReduction: false,
  skipSilence: false,
};

export const getConversationTemplate = (id?: string | null) => conversationTemplates.find((template) => template.id === id) ?? conversationTemplates[0];
