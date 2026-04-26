# Emotra — Text Model Detail Page
## Prompt for AI Agent

---

## Context

You are a senior frontend developer continuing work on **Emotra**.

The landing page already has a features section where each analysis type (Text, Audio, Image, Video) has a "Read More" button. That button navigates to a dedicated detail page for that model.

Your task is to build the **Text Model Detail Page** — a full documentation-style page (like HuggingFace model cards) that explains how the text emotion detection model works, with real code from the actual Python implementation.

---

## Technology Rules

- Angular (latest, standalone components, no NgModules)
- TailwindCSS as primary styling system
- Plain CSS allowed at any time
- No SCSS
- No UI component libraries — build everything from scratch
- This page uses the **AuthLayout** (same layout as the landing page — no app sidebar)

---

## Route

```
/models/text   →   AuthLayout   →   TextModelComponent
```

Add this route to `app.routes.ts`.

---

## Page Style: Documentation Style

The page must look and feel like a **HuggingFace model card** or a **ReadTheDocs page** — but styled with Emotra's design system (colors, fonts, CSS variables).

### Layout

- **Left side (fixed, sticky):** Table of contents sidebar — shows all section headings, highlights the active section as the user scrolls
- **Right side (scrollable):** The full documentation content
- On mobile: table of contents collapses into a dropdown at the top of the page

### General Style

- Clean white/dark background (uses theme CSS variables)
- Generous line height and spacing — easy to read
- Section headings are large and bold
- Code blocks styled exactly like a real code editor — syntax highlighted for Python
- Fully supports light and dark mode

---

## Table of Contents (Left Sidebar)

Fixed, sticky sidebar showing:

1. Overview
2. The Model
3. Emotion Labels
4. How It Works
5. Sentence Splitting
6. Intensity Weighting
7. Per-Sentence Analysis
8. Full Text Analysis
9. Score Merging
10. API Output Structure
11. Token Handling
12. Performance & Device

Clicking any item smoothly scrolls to that section.
The active section is highlighted in brand color as the user scrolls.

---

## Page Header

At the very top of the content area:

- A breadcrumb: `Home  /  Models  /  Text Analysis`  — "Home" links back to `/`
- A large badge: `NLP Model`  (brand color background)
- Page title: `Text Emotion Detection`
- Subtitle: `Sentence-level emotion analysis using a fine-tuned DistilRoBERTa transformer model`
- Two small info badges below the subtitle:
  - `Model: j-hartmann/emotion-english-distilroberta-base`
  - `Version: weighted-intensity-v3`
  - `7 Emotion Labels`
  - `PyTorch`

---

## Section 1 — Overview

**Heading:** `Overview`

Write a clear paragraph explaining:
- This model analyzes text and detects emotions at both the sentence level and the full text level
- It uses a pre-trained transformer (DistilRoBERTa) fine-tuned for emotion classification
- It does NOT return a single emotion — it returns a full timeline of emotional changes across sentences
- The final result is a weighted combination of per-sentence scores and the overall text score

---

## Section 2 — The Model

**Heading:** `The Model`

Explain:
- Model name: `j-hartmann/emotion-english-distilroberta-base`
- Based on DistilRoBERTa — a distilled (smaller, faster) version of RoBERTa
- Fine-tuned specifically for emotion detection in English text
- Loaded using HuggingFace Transformers library

Show this code block (Python syntax highlighting):

```python
MODEL_NAME = "j-hartmann/emotion-english-distilroberta-base"

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)
```

Explain what `AutoTokenizer` and `AutoModelForSequenceClassification` do in simple terms.

---

## Section 3 — Emotion Labels

**Heading:** `Emotion Labels`

The model detects 7 emotions. Display them as a visual grid of cards — each emotion has:
- The emotion name (capitalized)
- Its category badge: `Positive` (green), `Negative` (red), or `Neutral` (gray)
- A small relevant emoji or icon

| Emotion | Category |
|---|---|
| Anger | Negative |
| Disgust | Negative |
| Fear | Negative |
| Sadness | Negative |
| Joy | Positive |
| Surprise | Positive |
| Neutral | Neutral |

Show the code block:

```python
labels = ["anger", "disgust", "fear", "joy", "neutral", "sadness", "surprise"]

emotion_category = {
    "anger": "negative",
    "disgust": "negative",
    "fear": "negative",
    "sadness": "negative",
    "joy": "positive",
    "surprise": "positive",
    "neutral": "neutral"
}
```

---

## Section 4 — How It Works

**Heading:** `How It Works`

Show a visual step-by-step flow diagram using styled HTML/CSS (no external libraries):

```
Input Text
    ↓
Split into Sentences
    ↓
Per-Sentence Analysis  +  Full Text Analysis
    ↓                          ↓
Intensity Weighting       Softmax Probabilities
    ↓                          ↓
Weighted Sentence Scores ←→ Merged (80/20 blend)
    ↓
Final Combined Emotion + Timeline
```

Each step is a styled box connected by arrows. Uses brand colors.

Then write a short paragraph summarizing the two-track approach:
- Track 1: analyze each sentence individually with intensity weighting
- Track 2: analyze the full text as one unit
- Both tracks are merged using a global weight formula

---

## Section 5 — Sentence Splitting

**Heading:** `Sentence Splitting`

Explain how the text is split into individual sentences before analysis.

Show the code block:

```python
def split_into_sentences(text):
    parts = re.split(r'[.!?]+', text)
    return [p.strip() for p in parts if p.strip()]
```

Explain:
- Uses a regular expression to split on `.`, `!`, or `?`
- Strips whitespace and removes empty parts
- Each sentence is analyzed independently
- This is what enables the emotion timeline — one emotion per sentence

Show a visual example:
- Input: `"I was so happy today. Then something terrible happened. I couldn't believe it."`
- Output: 3 sentences → 3 emotion results → timeline

---

## Section 6 — Intensity Weighting

**Heading:** `Intensity Weighting`

This is one of the most important custom parts of the system. Explain it thoroughly.

**What it does:**
- Each sentence is assigned a weight based on the emotional intensity of its words
- Sentences with stronger emotional language have more influence on the final result
- This prevents a very emotional sentence from being diluted by many neutral ones

Show the code block (show the full function):

```python
def intensity_weight(sentence):
    s = sentence.lower()
    weight = 1.0

    # FEAR
    strong_fear = ["heart dropped", "panic", "terrified", "dread", "scared", "fear", "worried", "anxiety"]
    mild_fear = ["uneasy", "nervous"]

    for w in strong_fear:
        if w in s: weight += 1.1
    for w in mild_fear:
        if w in s: weight += 0.5

    # SADNESS
    strong_sadness = ["devastated", "broken", "grief", "heartbroken", "loss"]
    mild_sadness = ["sad", "disappointed", "hurt"]

    for w in strong_sadness:
        if w in s: weight += 1.5
    for w in mild_sadness:
        if w in s: weight += 0.9

    # DISGUST
    strong_disgust = ["revolting", "disgusting", "filth", "repugnant", "gross", "nasty"]
    mild_disgust = ["unclean", "dirty", "messy"]

    for w in strong_disgust:
        if w in s: weight += 1.3
    for w in mild_disgust:
        if w in s: weight += 0.7

    # ANGER
    strong_anger = ["furious", "rage", "angry", "irate"]
    mild_anger = ["frustrated", "annoyed", "upset"]

    for w in strong_anger:
        if w in s: weight += 1.2
    for w in mild_anger:
        if w in s: weight += 0.7

    # SURPRISE
    strong_surprise = ["shocked", "stunned"]
    mild_surprise = ["unexpected", "surprised"]

    for w in strong_surprise:
        if w in s: weight += 0.9
    for w in mild_surprise:
        if w in s: weight += 0.5

    # JOY REDUCTION FOR RELIEF
    relief_words = ["relieved", "calm"]
    for w in relief_words:
        if w in s: weight -= 0.5

    # NEUTRAL REDUCTION
    neutral_words = ["normal", "okay", "fine", "simple"]
    for w in neutral_words:
        if w in s: weight -= 0.7

    if weight < 0.3:
        weight = 0.3

    return weight
```

After the code, show a visual table explaining the weight system:

| Intensity Level | Example Words | Weight Added |
|---|---|---|
| Strong Fear | panic, terrified, dread | +1.1 |
| Strong Sadness | devastated, heartbroken, grief | +1.5 |
| Strong Disgust | revolting, repugnant, filth | +1.3 |
| Strong Anger | furious, rage, irate | +1.2 |
| Strong Surprise | shocked, stunned | +0.9 |
| Mild emotions | nervous, disappointed, annoyed | +0.5 to +0.9 |
| Relief/Calm words | relieved, calm | -0.5 |
| Neutral words | okay, fine, normal | -0.7 |
| Minimum weight | (floor) | 0.3 |

Also explain: weight starts at `1.0` and is adjusted up or down. Minimum is `0.3` so no sentence is completely ignored.

---

## Section 7 — Per-Sentence Analysis

**Heading:** `Per-Sentence Analysis`

Show the code block:

```python
def predict_single(sentence, device, max_length=512):
    inputs = tokenizer(sentence, return_tensors="pt", truncation=True, max_length=max_length)
    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        logits = model(**inputs).logits
        probs = torch.softmax(logits.cpu(), dim=1)[0].tolist()

    return probs
```

Explain:
- Tokenizes the sentence into tokens the model understands
- Passes through the model to get raw logit scores
- `torch.no_grad()` disables gradient computation — not needed for inference, saves memory
- `torch.softmax` converts logits into probabilities that sum to 1.0
- Returns a list of 7 probabilities — one per emotion label

Show an example output for one sentence:

```json
{
  "sentence": "I was terrified when I heard the news.",
  "probabilities": {
    "anger": 0.0312,
    "disgust": 0.0187,
    "fear": 0.7841,
    "joy": 0.0214,
    "neutral": 0.0521,
    "sadness": 0.0743,
    "surprise": 0.0182
  },
  "dominant": {
    "label": "fear",
    "confidence": 0.7841,
    "category": "negative"
  },
  "intensity_weight": 2.2
}
```

---

## Section 8 — Full Text Analysis

**Heading:** `Full Text Analysis`

Explain that in addition to per-sentence analysis, the entire text is also analyzed as one unit.

Show the code block:

```python
def predict_full_text(text, device, max_length=512):
    inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=max_length)
    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        logits = model(**inputs).logits
        probs = torch.softmax(logits.cpu(), dim=1)[0].tolist()

    return probs
```

Explain why this matters:
- The full text captures overall emotional context that individual sentences might miss
- A single sentence might be fearful, but the full text tone might be more neutral
- Both analyses are combined to produce a balanced result

---

## Section 9 — Score Merging

**Heading:** `Score Merging`

This is the final combination step. Explain it clearly.

Show the code block:

```python
global_weight = 0.8  # influence of full text score

for i in range(len(labels)):
    combined_probs[i] = (combined_probs[i] + full_text_probs[i] * global_weight) / (1 + global_weight)
```

Explain the formula:
- `combined_probs[i]` = the weighted average of all sentence scores
- `full_text_probs[i]` = the score from analyzing the full text as one unit
- `global_weight = 0.8` means the full text score contributes 80% of its value relative to the sentence scores
- The formula blends both to produce the final probability per emotion
- Final results are sorted by confidence (highest first)

Show a visual formula box:

```
Final Score = (Sentence Score + Full Text Score × 0.8) / (1 + 0.8)
```

---

## Section 10 — API Output Structure

**Heading:** `API Output Structure`

Show the complete JSON output structure with explanations for each field:

```json
{
  "text": "The original input text",
  "sentences_count": 3,

  "sentences_analysis": [
    {
      "sentence": "Individual sentence text",
      "probabilities": { "anger": 0.03, "fear": 0.78, "..." : "..." },
      "dominant": {
        "label": "fear",
        "confidence": 0.78,
        "category": "negative"
      },
      "intensity_weight": 2.2
    }
  ],

  "full_text_analysis": {
    "probabilities": { "anger": 0.05, "fear": 0.61, "...": "..." },
    "dominant": {
      "label": "fear",
      "confidence": 0.61,
      "category": "negative"
    }
  },

  "combined_final_emotion": {
    "label": "fear",
    "confidence": 0.693,
    "confidence_percent": 69.3,
    "category": "negative"
  },

  "combined_results": [
    { "label": "fear", "confidence": 0.693, "confidence_percent": 69.3 },
    { "label": "sadness", "confidence": 0.142, "confidence_percent": 14.2 }
  ],

  "input_info": {
    "input_length": 214,
    "token_count": 48,
    "input_was_truncated": false
  },

  "timestamp": "2025-01-15T14:32:10.123456",
  "processing_time_ms": 312.5,

  "model_info": {
    "name": "j-hartmann/emotion-english-distilroberta-base",
    "version": "weighted-intensity-v3",
    "device_used": "cuda"
  }
}
```

After the code block, add a table explaining each top-level field:

| Field | Description |
|---|---|
| `sentences_analysis` | Array of per-sentence results — this is the emotion timeline |
| `full_text_analysis` | Result of analyzing the entire text as one unit |
| `combined_final_emotion` | The final dominant emotion after merging both tracks |
| `combined_results` | All 7 emotions sorted by confidence — useful for charts |
| `input_info` | Token count, length, truncation status |
| `processing_time_ms` | How long the analysis took in milliseconds |
| `model_info` | Model name, version, and which device was used |

---

## Section 11 — Token Handling

**Heading:** `Token Handling`

Show the code block:

```python
max_length = 512
inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=max_length)
token_count = inputs["input_ids"].shape[1]
input_was_truncated = token_count == max_length
```

Explain:
- The model has a maximum input size of 512 tokens
- A token is roughly 0.75 words on average
- If the text exceeds 512 tokens it is automatically truncated
- `input_was_truncated` is `true` in the output when this happens
- The API always reports the actual token count used

Show a simple info box:
- `512 tokens ≈ 380 words approximately`
- For longer texts, the per-sentence analysis still captures all sentences — only the full text track is truncated

---

## Section 12 — Performance & Device

**Heading:** `Performance & Device`

Show the code:

```python
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model.to(device)
```

Explain:
- The model automatically uses GPU (CUDA) if available
- Falls back to CPU if no GPU is present
- The `device_used` field in the output tells you which was used
- Processing time is measured in milliseconds and included in every response

Show a small comparison box:
| Device | Typical Processing Time |
|---|---|
| GPU (CUDA) | 50 – 150ms |
| CPU | 300 – 800ms |

---

## Code Block Styling Requirements

This is critical — the code blocks must look exactly like a real code editor:

- Dark background for code blocks in BOTH light and dark mode (do not invert in light mode)
- Background: `#1e1e2e` (dark, like VS Code dark theme)
- Text colors must follow Python syntax highlighting:
  - Keywords (`def`, `for`, `if`, `in`, `return`, `import`, `with`, `not`): `#c792ea` (purple)
  - Strings (`"text"`, `'text'`): `#c3e88d` (green)
  - Numbers (`0.8`, `512`, `1.0`): `#f78c6c` (orange)
  - Comments (`# FEAR`, `# SADNESS`): `#546e7a` (gray, italic)
  - Function names: `#82aaff` (blue)
  - Built-in names (`torch`, `True`, `False`, `None`): `#ffcb6b` (yellow)
  - Default text: `#cdd3de` (light gray)
- Font: monospace (`JetBrains Mono`, `Fira Code`, or fallback `monospace`)
- Font size: `14px`
- Line height: `1.6`
- Padding: `24px`
- Border radius: `12px`
- A small label in the top-right corner of each code block: `Python`
- A copy button in the top-right corner (copies code to clipboard)
- Do NOT use any syntax highlighting libraries — implement with `<span>` tags and CSS classes

---

## Component Structure

```
src/app/features/models/
  text-model/
    text-model.component.ts       ← main page component
    text-model-toc.component.ts   ← table of contents sidebar
```

Both are standalone components.

---

## Output Requirements

- Every file complete, no TODOs
- Page must look stunning — documentation-quality, not a school assignment
- Code blocks must be properly syntax highlighted using span + CSS, no libraries
- Table of contents must highlight the active section on scroll using IntersectionObserver
- Both light and dark mode must look great
- Fully responsive — TOC collapses on mobile
- No errors on `ng serve`
