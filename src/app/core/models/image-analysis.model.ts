export interface ImageEmotionResult {
  label: string;
  confidence: number;
  confidence_percent: number;
  category: 'positive' | 'negative' | 'neutral';
}

export interface ImageEmotionProbabilities {
  label: string;
  confidence: number;
  confidence_percent: number;
}

export interface FaceAnalysis {
  face_id: number;
  bbox: [number, number, number, number]; // [x, y, w, h]
  detect_score: number;
  combined_final_emotion: ImageEmotionResult;
  combined_results: ImageEmotionProbabilities[];
  confidence_gated: boolean;
}

export interface ImageSceneEmotion {
  label: string;
  confidence: number;
  confidence_percent: number;
  category: 'positive' | 'negative' | 'neutral';
}

export interface ImageFrameQuality {
  original_width: number;
  original_height: number;
  was_downscaled: boolean;
  downscaled_to: [number, number];
}

export interface ImageModelInfo {
  detector: string;
  emotion_model: string;
  tracker: string | null;
  version: string;
}

export interface ImageAnalysisResponse {
  image_filename: string;
  faces_detected: number;
  faces: FaceAnalysis[];
  scene_emotion: ImageSceneEmotion;
  frame_quality: ImageFrameQuality;
  timestamp: string;
  processing_time_ms: number;
  model_info: ImageModelInfo;
}

export interface ImageAnalysisSession {
  id: string;
  type: 'image';
  timestamp: string;
  inputFileName: string;
  result: ImageAnalysisResponse;
  isSynced?: boolean;
  cloudId?: number;
}
