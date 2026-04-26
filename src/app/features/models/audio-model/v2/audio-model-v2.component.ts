import { Component, HostListener } from '@angular/core';
import { ModelDocTocComponent, TocItem } from '../../../../shared/components/model-docs/model-doc-toc/model-doc-toc.component';
import { ModelDocSectionComponent } from '../../../../shared/components/model-docs/model-doc-section/model-doc-section.component';
import { PythonCodeBlockComponent } from '../../../../shared/components/model-docs/python-code-block/python-code-block.component';
import { EmotionIconComponent } from '../../../../shared/components/emotion-icon/emotion-icon.component';
import { ModelDocScrollspyBase } from '../../../../shared/components/model-docs/model-doc-scrollspy.base';

@Component({
  selector: 'app-audio-model-v2',
  standalone: true,
  imports: [
    ModelDocTocComponent,
    ModelDocSectionComponent,
    PythonCodeBlockComponent,
    EmotionIconComponent
  ],
  templateUrl: './audio-model-v2.component.html'
})
export class AudioModelV2Component extends ModelDocScrollspyBase {

  tocItems: TocItem[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'pipeline-v5', label: 'Production Pipeline v5.0' },
    { id: 'preprocessing', label: 'Noise & Quality Control' },
    { id: 'segmentation-vad', label: 'Segmentation + VAD' },
    { id: 'emotion2vec', label: 'emotion2vec Engine' },
    { id: 'smoothing', label: 'Bidirectional Smoothing' },
    { id: 'entropy-fusion', label: 'Entropy-Weighted Fusion' },
    { id: 'output-rich', label: 'Rich Output Format' },
    { id: 'quality-flags', label: 'Quality Verification' }
  ];

  emotions = [
    { label: 'anger', category: 'negative', description: 'Detected natively from acoustic features like high intensity and sharp pitch shifts.' },
    { label: 'disgust', category: 'negative', description: 'Recognized from low-frequency spectral patterns and specific vocal timbres.' },
    { label: 'fear', category: 'negative', description: 'Identified through rapid pitch variations and breathy vocal quality.' },
    { label: 'joy', category: 'positive', description: 'Higher fundamental frequency and positive spectral slope indicators.' },
    { label: 'neutral', category: 'neutral', description: 'Steady pitch and balanced energy levels — the baseline calibration.' },
    { label: 'sadness', category: 'negative', description: 'Lower intensity, slower speech rate, and falling pitch contours.' },
    { label: 'surprise', category: 'positive', description: 'Abrupt energy spikes and wide pitch range expansion.' }
  ];

  // Python code snippets from model_loader_audio_v2.py
  codePreprocess = `def _load_and_preprocess(file_path):
    # Mono 16 kHz load
    y, sr = librosa.load(file_path, sr=16000, mono=True)

    # Clipping detection run
    if len(y) > 0 and np.max(np.abs(y)) >= 0.999:
        quality["clipping_detected"] = True

    # Adaptive Noise Reduction
    y = nr.reduce_noise(y=y, sr=sr, stationary=False)

    # Signal Normalization
    y = librosa.util.normalize(y)
    return y, sr, quality`;

  codeSegmentation = `def _build_segments(y, sr):
    win_len = int(2.0 * sr)  # 2s Analysis window
    hop_len = int(1.0 * sr)  # 1s overlap hop

    # Voice Activity Detection (VAD)
    # Energy-based gates filter out silence
    for seg in segments:
        rms_db = 20.0 * np.log10(np.mean(librosa.feature.rms(y=seg)) + 1e-9)
        if rms_db < -35:     # Silence Gate
            weights.append(0.0)
        elif rms_db < -20:   # Quiet Gate
            weights.append(0.3)
        else:                # Clear Speech
            weights.append(1.0)
    return segments, weights`;

  codeSmoothing = `def _smooth_bidirectional(raw_probs, num_segments):
    """Forward-Backward EMA Smoothing."""
    # Adaptive alpha based on clip length
    alpha = 0.30

    # Forward pass (causal)
    for p in raw_probs:
        fwd_state = alpha * p + (1.0 - alpha) * fwd_state

    # Backward pass (future-aware)
    for p in reversed(raw_probs):
        bwd_state = alpha * p + (1.0 - alpha) * bwd_state

    # Average both to eliminate causal lag
    smoothed = (fwd + bwd) / 2.0
    return smoothed`;

  codeEntropyFusion = `def _fuse_probabilities(audio_probs, text_probs):
    """Entropy-aware Multimodal Fusion."""
    ent_a = shannon_entropy(audio_probs)
    ent_t = shannon_entropy(text_probs)

    # Inverse-entropy weighting
    w_a = 1.0 / (ent_a + 0.1)
    w_t = 1.0 / (ent_t + 0.1)

    # Text gets a bias boost for semantic clarity
    w_t *= 1.5

    # Fuse with normalized confidence scores
    fused = (audio_probs * w_a + text_probs * w_t) / (w_a + w_t)
    return fused`;

  codePredictMultimodal = `def predict_emotion_audio(file_path):
    # 1. Transcribe (Whisper Small)
    text = transcribe_audio(file_path)

    # 2. Text Emotion (DistilRoBERTa)
    text_res = get_text_emotion(text)

    # 3. Audio Emotion (emotion2vec + biEMA)
    audio_res = analyze_audio_emotion(file_path)

    # 4. Multimodal Fusion (Entropy-Weighted)
    fused, w_a, w_t = _fuse_probabilities(audio_res["probs"], text_res["probs"])

    return {
        "final_emotion": fused,
        "modality_weights": {"audio": w_a, "text": w_t},
        "quality_metadata": audio_res["quality"]
    }`;

  @HostListener('window:scroll')
  override onScroll(): void {
    super.onScroll();
  }
}
