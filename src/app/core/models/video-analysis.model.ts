export interface VideoEmotionResult {
  label: string;
  confidence: number;
  confidence_percent: number;
  category: 'positive' | 'negative' | 'neutral';
}

export interface VideoEmotionProbabilities {
  label: string;
  confidence: number;
  confidence_percent: number;
}

export interface VideoEmotionTransition {
  frame_index: number;
  timestamp_sec: number;
  from_emotion: string;
  to_emotion: string;
}

export interface VideoFrameAnalysis {
  frame_index: number;
  timestamp_sec: number;
  probabilities: {
    anger: number;
    contempt: number;
    disgust: number;
    fear: number;
    happiness: number;
    neutral: number;
    sadness: number;
    surprise: number;
  };
  dominant: VideoEmotionResult;
  frame_reference: string;
}

export interface FaceVideoAnalysis {
  face_id: number;
  track_id: number;
  frames_seen: number;
  timeline: VideoFrameAnalysis[];
  combined_final_emotion: VideoEmotionResult;
  combined_results: VideoEmotionProbabilities[];
  transitions: VideoEmotionTransition[];
}

export interface VideoSceneEmotion {
  label: string;
  confidence: number;
  confidence_percent: number;
  category: 'positive' | 'negative' | 'neutral';
}

export interface VideoModelInfo {
  detector: string;
  emotion_model: string;
  tracker: string;
  version: string;
}

export interface VideoAnalysisResponse {
  video_filename: string;
  duration_seconds: number;
  total_frames: number;
  sampled_frames: number;
  faces_tracked: number;
  faces: FaceVideoAnalysis[];
  scene_emotion: VideoSceneEmotion;
  timestamp: string;
  processing_time_ms: number;
  model_info: VideoModelInfo;
}

export interface VideoAnalysisSession {
  id: string;
  type: 'video';
  timestamp: string;
  inputFileName: string;
  result: VideoAnalysisResponse;
  isSynced?: boolean;
  cloudId?: number;
}
