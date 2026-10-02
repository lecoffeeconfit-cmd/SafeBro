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
  { id: 'general', label: 'General', icon: '◉', detail: 'Flexible conversation notes and moments.', localOutputs: ['Transcript', 'Bookmarks', 'Notes'], plusOutputs: ['Summary', 'Ask recording'] },
  { id: 'meeting', label: 'Meeting', icon: '▦', detail: 'Decisions, owners, deadlines and follow-ups.', localOutputs: ['Transcript', 'Markers', 'Typed notes'], plusOutputs: ['Decisions', 'Action items', 'Follow-up email'] },
  { id: 'interview', label: 'Interview', icon: '◎', detail: 'Questions, answers, quotes and topics.', localOutputs: ['Transcript', 'Quotes', 'Bookmarks'], plusOutputs: ['Q&A structure', 'Person summary'] },
  { id: 'lecture', label: 'Lecture', icon: '◇', detail: 'Long-form learning with chapters.', localOutputs: ['Transcript', 'Chapters', 'Vocabulary'], plusOutputs: ['Study guide', 'Flashcards', 'Quiz'] },
  { id: 'doctor', label: 'Doctor visit', icon: '＋', detail: 'Organize instructions without diagnosis.', localOutputs: ['Transcript', 'Notes', 'Medication bookmarks'], plusOutputs: ['Instructions', 'Questions', 'Follow-ups'], privacyNote: 'Convenience notes only—not medical advice.' },
  { id: 'therapy', label: 'Reflection', icon: '◌', detail: 'Private topics, goals and things to revisit.', localOutputs: ['Private transcript', 'Personal notes'], plusOutputs: ['Themes', 'Goals', 'Revisit list'], privacyNote: 'Device-only processing is recommended.' },
  { id: 'business', label: 'Business call', icon: '▤', detail: 'Needs, objections, pricing and next steps.', localOutputs: ['Transcript', 'Moments', 'Notes'], plusOutputs: ['Needs', 'Objections', 'Follow-up'] },
  { id: 'sales', label: 'Sales call', icon: '↗', detail: 'Buying signals, objections and competitors.', localOutputs: ['Transcript', 'Money markers'], plusOutputs: ['Buying signals', 'CRM notes'] },
  { id: 'brainstorm', label: 'Brainstorm', icon: '✦', detail: 'Capture ideas and open questions.', localOutputs: ['Idea markers', 'Notes'], plusOutputs: ['Idea groups', 'Next experiments'] },
  { id: 'journal', label: 'Journal', icon: '☼', detail: 'A private spoken journal.', localOutputs: ['Audio', 'Transcript', 'Notes'], plusOutputs: ['Journal entry', 'Goals', 'Tasks'] },
  { id: 'voice_memo', label: 'Voice memo', icon: '●', detail: 'Fast, minimal audio capture.', localOutputs: ['Audio', 'Bookmark'], plusOutputs: ['Clean title', 'Quick summary'] },
  { id: 'conference', label: 'Conference', icon: '⌁', detail: 'Long-duration talks with chapters.', localOutputs: ['Transcript', 'Manual chapters'], plusOutputs: ['Automatic chapters', 'Key concepts'] },
  { id: 'podcast', label: 'Podcast', icon: '◒', detail: 'Multiple speakers, chapters and clean audio.', localOutputs: ['Audio', 'Markers', 'Transcript'], plusOutputs: ['Speaker labels', 'Chapters', 'Show notes'] },
  { id: 'legal', label: 'Legal notes', icon: '⚖', detail: 'Fact-focused notes and quoted statements.', localOutputs: ['Transcript', 'Timestamps', 'Original audio'], plusOutputs: ['Issue outline', 'Quote index'], privacyNote: 'Not legal advice. Follow recording-consent laws.' },
  { id: 'research', label: 'Research', icon: '⌕', detail: 'Sources, claims and questions.', localOutputs: ['Transcript', 'Notes', 'Attachments'], plusOutputs: ['Themes', 'Research outline'] },
  { id: 'customer_interview', label: 'Customer interview', icon: '◇', detail: 'Needs, pain points and product ideas.', localOutputs: ['Transcript', 'Idea markers'], plusOutputs: ['Needs', 'Quotes', 'Opportunities'] },
  { id: 'project_planning', label: 'Project planning', icon: '▣', detail: 'Scope, risks, owners and milestones.', localOutputs: ['Transcript', 'Notes', 'Bookmarks'], plusOutputs: ['Tasks', 'Risks', 'Timeline'] },
];

export const defaultAudioEnhancements: AudioEnhancementSettings = {
  noiseSuppression: false,
  voiceEnhancement: true,
  automaticGain: true,
  echoReduction: false,
  skipSilence: false,
};

export const getConversationTemplate = (id?: string | null) => conversationTemplates.find((template) => template.id === id) ?? conversationTemplates[0];
