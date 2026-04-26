export interface EmotionProbabilities {
  anger: number;
  disgust: number;
  fear: number;
  joy: number;
  neutral: number;
  sadness: number;
  surprise: number;
  [key: string]: number;
}

export interface DominantEmotion {
  label: string;
  confidence: number;
  category: "positive" | "negative" | "neutral";
}

export interface SentenceAnalysis {
  sentence: string;
  probabilities: EmotionProbabilities;
  dominant: DominantEmotion;
  intensity_weight: number;
}

export interface FullTextAnalysis {
  probabilities: EmotionProbabilities;
  dominant: DominantEmotion;
}

export interface CombinedResult {
  label: string;
  confidence: number;
  confidence_percent: number;
}

export interface CombinedFinalEmotion {
  label: string;
  confidence: number;
  confidence_percent: number;
  category: "positive" | "negative" | "neutral";
}

export interface InputInfo {
  input_length: number;
  token_count: number;
  input_was_truncated: boolean;
}

export interface ModelInfo {
  name: string;
  version: string;
  device_used: string;
}

export interface TextAnalysisResult {
  text: string;
  sentences_count: number;
  sentences_analysis: SentenceAnalysis[];
  full_text_analysis: FullTextAnalysis;
  combined_final_emotion: CombinedFinalEmotion;
  combined_results: CombinedResult[];
  input_info: InputInfo;
  timestamp: string;
  processing_time_ms: number;
  model_info: ModelInfo;
}

export interface AnalysisSession {
  id: string;
  type: 'text';
  timestamp: string;
  input: string;
  result: TextAnalysisResult;
  isSynced?: boolean;
  cloudId?: number;
}

export type { AudioAnalysisSession } from './audio-analysis.model';
