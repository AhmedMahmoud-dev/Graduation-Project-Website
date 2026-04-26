import { Component, HostListener } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FooterSectionComponent } from '../../../shared/components/footer/footer.component';
import { ModelDocTocComponent, TocItem } from '../../../shared/components/model-docs/model-doc-toc/model-doc-toc.component';
import { ModelDocSectionComponent } from '../../../shared/components/model-docs/model-doc-section/model-doc-section.component';
import { PythonCodeBlockComponent } from '../../../shared/components/model-docs/python-code-block/python-code-block.component';
import { EmotionIconComponent } from '../../../shared/components/emotion-icon/emotion-icon.component';
import { ModelDocScrollspyBase } from '../../../shared/components/model-docs/model-doc-scrollspy.base';

@Component({
  selector: 'app-text-model',
  standalone: true,
  imports: [
    RouterModule,
    FooterSectionComponent,
    ModelDocTocComponent,
    ModelDocSectionComponent,
    PythonCodeBlockComponent,
    EmotionIconComponent
],
  templateUrl: './text-model.component.html',
  styleUrl: './text-model.component.css'
})
export class TextModelComponent extends ModelDocScrollspyBase {

  tocItems: TocItem[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'model-architecture', label: 'Model Architecture' },
    { id: 'emotion-classes', label: 'Emotion Classes' },
    { id: 'how-it-works', label: 'How It Works' },
    { id: 'sentence-analysis', label: 'Sentence Analysis' },
    { id: 'intensity-weighting', label: 'Intensity Weighting' },
    { id: 'prediction-pipeline', label: 'Prediction Pipeline' },
    { id: 'score-fusion', label: 'Score Fusion' },
    { id: 'output-format', label: 'Output Format' },
    { id: 'limitations', label: 'Limitations' }
  ];

  emotions = [
    { label: 'anger', category: 'negative', description: 'Frustration, rage, irritation — from mild annoyance to intense fury.' },
    { label: 'disgust', category: 'negative', description: 'Revulsion or strong disapproval toward something unpleasant.' },
    { label: 'fear', category: 'negative', description: 'Anxiety, worry, dread — sensing threat or danger.' },
    { label: 'joy', category: 'positive', description: 'Happiness, delight, gratitude — positive emotional state.' },
    { label: 'neutral', category: 'neutral', description: 'Calm, factual, or emotionally flat — no strong sentiment.' },
    { label: 'sadness', category: 'negative', description: 'Grief, sorrow, disappointment — a sense of loss or unhappiness.' },
    { label: 'surprise', category: 'positive', description: 'Unexpected reaction — astonishment or disbelief.' }
  ];

  // Python code snippets from model_loader_text.py
  codeSentenceSplit = `def split_into_sentences(text):
    parts = re.split(r'[.!?]+', text)
    return [p.strip() for p in parts if p.strip()]`;

  codeIntensityWeight = `def intensity_weight(sentence):
    s = sentence.lower()
    weight = 1.0

    # Strong emotional keywords boost the weight
    strong_fear = ["heart dropped", "panic", "terrified", "dread"]
    for w in strong_fear:
        if w in s: weight += 1.1

    strong_sadness = ["devastated", "broken", "grief", "heartbroken"]
    for w in strong_sadness:
        if w in s: weight += 1.5

    strong_anger = ["furious", "rage", "angry", "irate"]
    for w in strong_anger:
        if w in s: weight += 1.2

    # Relief words reduce joy weight
    relief_words = ["relieved", "calm"]
    for w in relief_words:
        if w in s: weight -= 0.5

    # Floor at 0.3 to prevent zero-weight
    if weight < 0.3:
        weight = 0.3

    return weight`;

  codePredictSingle = `def predict_single(sentence, device, max_length=512):
    inputs = tokenizer(
        sentence,
        return_tensors="pt",
        truncation=True,
        max_length=max_length
    )
    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        logits = model(**inputs).logits
        probs = torch.softmax(logits.cpu(), dim=1)[0].tolist()

    return probs`;

  codeScoreFusion = `# Per-sentence weighted accumulation
for s in sentences:
    probs = predict_single(s, device)
    w = intensity_weight(s)

    total_weight += w
    for i, p in enumerate(probs):
        combined_probs[i] += p * w

# Normalize sentence-level scores
combined_probs = [x / total_weight for x in combined_probs]

# Full-text analysis (global context)
full_text_probs = predict_full_text(text, device)

# Merge: sentence-level + full-text (80% weight)
global_weight = 0.8
for i in range(len(labels)):
    combined_probs[i] = (
        combined_probs[i] + full_text_probs[i] * global_weight) / (1 + global_weight)`;

  codeOutputFormat = `return {
    "text": text,
    "sentences_count": len(sentences),
    "sentences_analysis": sentences_analysis,
    "full_text_analysis": full_text_analysis,
    "combined_final_emotion": {
        "label": top["label"],
        "confidence": top["confidence"],
        "confidence_percent": top["confidence_percent"],
        "category": emotion_category.get(top["label"])
    },
    "combined_results": results,
    "input_info": {
        "input_length": len(text),
        "token_count": token_count,
        "input_was_truncated": input_was_truncated,
    },
    "timestamp": datetime.now().isoformat(),
    "processing_time_ms": processing_time,
    "model_info": {
        "name": MODEL_NAME,
        "version": "weighted-intensity-v3",
        "device_used": str(device)
    }
}`;

  @HostListener('window:scroll')
  override onScroll(): void {
    super.onScroll();
  }
}
