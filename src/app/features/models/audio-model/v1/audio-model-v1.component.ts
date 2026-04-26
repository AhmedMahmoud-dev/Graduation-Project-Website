import { Component, HostListener } from '@angular/core';
import { ModelDocTocComponent, TocItem } from '../../../../shared/components/model-docs/model-doc-toc/model-doc-toc.component';
import { ModelDocSectionComponent } from '../../../../shared/components/model-docs/model-doc-section/model-doc-section.component';
import { PythonCodeBlockComponent } from '../../../../shared/components/model-docs/python-code-block/python-code-block.component';
import { EmotionIconComponent } from '../../../../shared/components/emotion-icon/emotion-icon.component';
import { ModelDocScrollspyBase } from '../../../../shared/components/model-docs/model-doc-scrollspy.base';

@Component({
  selector: 'app-audio-model-v1',
  standalone: true,
  imports: [
    ModelDocTocComponent,
    ModelDocSectionComponent,
    PythonCodeBlockComponent,
    EmotionIconComponent
],
  templateUrl: './audio-model-v1.component.html'
})
export class AudioModelV1Component extends ModelDocScrollspyBase {

  tocItems: TocItem[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'pipeline-architecture', label: 'Pipeline Architecture' },
    { id: 'emotion-classes', label: 'Emotion Classes' },
    { id: 'speech-to-text', label: 'Speech to Text' },
    { id: 'audio-emotion', label: 'Voice Tone Analysis' },
    { id: 'emotion-mapping', label: '4→7 Emotion Mapping' },
    { id: 'energy-weighting', label: 'Energy Weighting' },
    { id: 'multimodal-fusion', label: 'Multimodal Fusion' },
    { id: 'output-format', label: 'Output Format' },
    { id: 'limitations', label: 'Limitations' }
  ];

  emotions = [
    { label: 'anger', category: 'negative', description: 'Frustration, rage, irritation — detected from both vocal tone and word choice.' },
    { label: 'disgust', category: 'negative', description: 'Revulsion or disapproval — synthesized from anger patterns in the audio signal' },
    { label: 'fear', category: 'negative', description: 'Anxiety, worry — synthesized from sadness patterns in the audio signal.' },
    { label: 'joy', category: 'positive', description: 'Happiness, excitement — one of the 4 natively detected audio emotions.' },
    { label: 'neutral', category: 'neutral', description: 'Calm, flat tone — baseline emotional state detected from both channels.' },
    { label: 'sadness', category: 'negative', description: 'Grief, sorrow — one of the 4 natively detected audio emotions.' },
    { label: 'surprise', category: 'positive', description: 'Astonishment — synthesized from joy patterns in the audio signal.' }
  ];

  // Python code snippets from model_loader_audio.py
  codeTranscribe = `def transcribe_audio(file_path):
    result = whisper_model.transcribe(file_path)
    return result["text"]`;

  codeAnalyzeAudio = `def analyze_audio_emotion(file_path):
    y, sr = librosa.load(file_path, sr=16000, mono=True)
    duration = librosa.get_duration(y=y, sr=sr)

    window_sec = 3.0   # Sliding window size
    hop_sec = 1.0       # Step between windows

    segments = []
    i = 0
    while i < len(y):
        s = i
        e = min(i + int(window_sec * sr), len(y))

        # Skip chunks smaller than 0.5s
        if (e - s) < (sr * 0.5):
            break

        segments.append(y[s:e])
        i += int(hop_sec * sr)

    # Analyze each segment
    for seg in segments:
        probs = predict_audio_probs(seg, sr)
        w = rms_weight(seg)
        # Accumulate weighted probabilities...

    return timeline, combined_probs`;

  codeMapping = `def convert_4_to_7_classes(probs4):
    """Convert HuBERT's 4 emotions to 7-class system."""
    neutral = float(probs4[0])
    joy     = float(probs4[1])
    anger   = float(probs4[2])
    sadness = float(probs4[3])

    # Normalize the 4 real emotions
    real_sum = neutral + joy + anger + sadness
    if real_sum > 0:
        neutral /= real_sum
        joy     /= real_sum
        anger   /= real_sum
        sadness /= real_sum

    # 90% real emotions, 10% synthetic budget
    REAL_BUDGET = 0.90
    SYNTH_BUDGET = 0.10

    # Distribute synthetic emotions from parents
    synth_total = anger + sadness + joy
    if synth_total > 0:
        disgust  = SYNTH_BUDGET * (anger / synth_total)
        fear     = SYNTH_BUDGET * (sadness / synth_total)
        surprise = SYNTH_BUDGET * (joy / synth_total)

    # Scale real emotions
    anger   *= REAL_BUDGET
    joy     *= REAL_BUDGET
    neutral *= REAL_BUDGET
    sadness *= REAL_BUDGET

    return [anger, disgust, fear, joy, neutral, sadness, surprise]`;

  codeRmsWeight = `def rms_weight(segment):
    """Energy-based weighting — suppresses silence."""
    if segment.size == 0:
        return 1.0
    rms = np.sqrt(np.mean(segment ** 2) + 1e-12)
    w = 1.0 + float(rms * 3)
    w = max(0.5, min(w, 2.5))
    return w`;

  codeFusion = `def fuse_audio_text(audio_probs, text_probs):
    """Balanced 50/50 fusion for equal weight."""
    final = []
    for i in range(7):
        fused = (audio_probs[i] + text_probs[i]) / 2.0
        final.append(float(fused))
    return final`;

  codeOutputFormat = `return {
    "audio_filename": os.path.basename(file_path),
    "transcribed_text": transcribed_text,
    "audio_emotion": {
        "timeline": audio_result["timeline"],
        "combined_probs": audio_result["combined_probs"],
        "segments_count": audio_result["segments_count"],
        "duration_seconds": audio_result["duration"]
    },
    "text_emotion": text_result,
    "final_multimodal_emotion": {
        "label": fusion_labels[dom],
        "confidence": float(fused_probs[dom]),
        "confidence_percent": round(float(fused_probs[dom]) * 100, 2),
        "category": emotion_category.get(fusion_labels[dom])
    },
    "final_multimodal_results": [...],
    "processing_time_ms": float(processing_ms),
    "model_info": {
        "audio_model": AUDIO_MODEL_NAME,
        "text_model_api": TEXT_API_URL,
        "whisper_model": WHISPER_MODEL_NAME,
        "fusion_version": "v1.0"
    }
}`;

  @HostListener('window:scroll')
  override onScroll(): void {
    super.onScroll();
  }
}
