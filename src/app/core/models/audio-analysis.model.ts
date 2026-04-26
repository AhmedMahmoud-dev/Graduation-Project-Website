export interface AudioSegment {
  segment_index: number;
  timestamp_offset: number;             // seconds: 0.0, 1.0, 2.0...
  probabilities: Record<string, number>;
  dominant: {
    label: string;
    confidence: number;
    category: string;
  };
  intensity_weight: number;
  is_speech: boolean;                   // Added field
  frame_reference: string;              // e.g. "audio_seg_0"
}

export interface AudioEmotionTrack {
  timeline: AudioSegment[];
  combined_probs: number[];             // 7 floats: anger, disgust, fear, joy, neutral, sadness, surprise
  segments_count: number;
  duration_seconds: number;
  transitions: any[];                   // Added field
  quality: {                            // Added field
    clipping_detected: boolean;
    original_peak: number;
  };
}

export interface TextEmotionTrack {
  text: string;
  sentences_count: number;
  sentences_analysis: {
    sentence: string;
    probabilities: Record<string, number>;
    dominant: {
      label: string;
      confidence: number;
      category: string;
    };
    intensity_weight: number;
  }[];
  full_text_analysis: {
    probabilities: Record<string, number>;
    dominant: {
      label: string;
      confidence: number;
      category: string;
    };
  };
  combined_final_emotion: {
    label: string;
    confidence: number;
    confidence_percent: number;
    category: string;
  };
  combined_results: {
    label: string;
    confidence: number;
    confidence_percent: number;
  }[];
  input_info: {
    input_length: number;
    token_count: number;
    input_was_truncated: boolean;
  };
  timestamp: string;
  processing_time_ms: number;
  model_info: {
    name: string;
    version: string;
    device_used: string;
  };
}

export interface AudioAnalysisResponse {
  audio_filename: string;
  transcribed_text: string;
  audio_emotion: AudioEmotionTrack;
  text_emotion: TextEmotionTrack;
  final_multimodal_emotion: {
    label: string;
    confidence: number;
    confidence_percent: number;
    category: string;
  };
  final_multimodal_results: {
    label: string;
    confidence: number;
    confidence_percent: number;
  }[];
  timestamp: string;
  processing_time_ms: number;
  model_info: {
    audio_model: string;       // e.g. "superb/hubert-large-superb-er"
    text_model_api: string;
    whisper_model: string;     // e.g. "small"
    fusion_version: string;    // e.g. "v1.0"
  };
}

export interface AudioAnalysisSession {
  id: string;
  type: 'audio';
  timestamp: string;
  inputFileName: string;
  durationSeconds: number;
  result: AudioAnalysisResponse;
  isSynced?: boolean;
  cloudId?: number;
}
