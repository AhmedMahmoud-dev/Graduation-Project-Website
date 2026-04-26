# AI Development Prompt: Text Emotion Analysis Page

## **Objective**
Explain the technical architecture, UI/UX design, and functional logic of the "Text Emotion Analysis" model page in the Emotra application. This document serves as a comprehensive briefing for an AI model to understand how this specific page is built and what it represents.

---

## **1. Page Overview & Purpose**
The page (`src\app\features\models\text-model`) is a technical documentation and showcase page for the **NLP Text Emotion Detection** model. It explains how the model works, the labels it predicts, and the underlying Python logic (which will be provided alongside this prompt).

### **Visual Aesthetics**
- **Theme**: Modern, premium dark mode.
- **Color Palette**: 
  - Primary Background: `var(--bg-primary)` (Deep dark)
  - Secondary Background: `var(--bg-secondary)` / `var(--bg-card)` (Slightly lighter dark/navy)
  - Brand Color: `var(--brand-primary)` (Vibrant purple/blue)
  - Accent Colors: Green (Success/Live), Amber (Warning/Notes), Red (Negative emotions).
- **Typography**: Clean sans-serif for UI, **'JetBrains Mono'** for code sections.

---

## **2. Layout Structure**
The page uses a responsive two-column layout on desktop:

### **Left Side: Navigation (TOC)**
- **Component**: `app-text-model-toc`
- **Behavior**: Sticky sidebar that tracks the user's scroll position using `IntersectionObserver`.
- **UI Details**:
  - A vertical list of navigation items (Overview, The Model, Emotion Labels, etc.).
  - **Active State**: The active section is highlighted with a 1.5px glowing vertical bar on the left, a subtle purple gradient background, and bold text.
  - **Mobile View**: Converts to a fixed top dropdown menu with a backdrop blur effect (`backdrop-blur-2xl`).

### **Right Side: Main Content**
- **Container**: Max-width limited (`max-w-4xl`) for readability.
- **Top Section**:
    - **Breadcrumb**: Navigation path (Home / Models / Text Analysis).
    - **Badges**: Pill-shaped badges labeling the technology (e.g., "NLP Model" in purple, "PyTorch" in gray-bordered secondary).
    - **Hero**: Large bold title "Text Emotion Detection" followed by a descriptive subtitle.
    - **Model Details**: Two small info cards showing the model string (`j-hartmann/emotion-english-distilroberta-base`) and version (`weighted-intensity-v3`) with low-opacity SVG icons.
    - **Call to Action**: A "Launch Analysis" button in a vibrant green box with an icon.

---

## **3. Detailed Section Breakdown**

Each section is separated by a bottom border and follows a consistent title style (a vertical brand-colored rounded bar next to the heading).

### **A. Overview**
- Uses a `prose-lg` styling for text.
- Features a bulleted list where each item has a green SVG checkmark.
- Focuses on the "Temporal Timeline" and "Intensity Weighting" features.

### **B. Code Sections (The Model, Splitting, Intensity, etc.)**
- **Container**: Rounded boxes (`rounded-[20px]`) with a dark background (`#1e1e2e`).
- **Syntax Highlighting**: Custom-themed highlighting (simulated colors via HTML spans):
    - **Keywords (`def`, `import`, `return`, `if`)**: Purple-ish (`#c792ea`).
    - **Functions**: Light blue (`#82aaff`).
    - **Strings**: Lime green (`#c3e88d`).
    - **Comments**: Muted gray/blue (`#546e7a`) italicized.
    - **Numbers**: Orange (`#f78c6c`).
- **Copy Button**: A small floating button in the top-right of the code block. It uses an SVG "copy" icon that transforms into a green "checkmark" for 2 seconds upon interaction.

### **C. Emotion Labels Grid**
- A responsive grid (4 columns on desktop) of "Emotion Cards."
- **Card Content**:
  - Large Emoji (grayscale by default, becomes colored on hover).
  - Bold label name (e.g., "Anger", "Joy").
  - **Category Badge**: A tiny pill with "Positive" (green), "Negative" (red), or "Neutral" (gray) labels.

### **D. "How It Works" Visual Flow**
- A custom-built vertical flowchart using HTML/CSS.
- **Steps**: "Input Text" -> "Split into Sentences" -> (Splits into two tracks) -> "Score Merging" -> "Final Emotion".
- **Visuals**: Includes dashed borders, background tints (purple for Track 1, blue for Track 2), and centered "down" arrow indicators.

### **E. Data Tables (Intensity Weighting)**
- A clean, modern table showing emotional arousal levels.
- **Rows**: Strong Emotions (Red), Mild Emotions (Blue), Neutral (Gray).
- **Styling**: Hover effects on rows, mono-spaced font for weight modifiers (e.g., `+1.2 to +1.5`).

### **F. Mathematical Formula (Score Merging)**
- A prominent "Formula Box" with a diagonal gradient background (`#1e1e2e` to `#2d2d44`).
- Shows the calculation logic for blending "Per-Sentence" and "Full Text" scores using an 80/20 ratio.

### **G. API Output Structure**
- A large JSON code block displaying the exact data structure returned by the Python backend (Sentiment labels, confidence scores, and model metadata).

---

## **4. Technical Context for the AI**
When analyzing the Python code provided alongside this prompt, keep these UI elements in mind:
- The `split_into_sentences` function in Python is what drives the "Sentence Splitting" section.
- The `intensity_weight` dictionary/logic is directly represented in the "Intensity Weighting" table.
- The `predict_single` function is what the "Per-Sentence Analysis" section explains.
- The final response structure in the Python code must match the "API Output Structure" shown in the UI.

**Goal**: Be prepared to explain how to modify the Python code while ensuring the UI stays in sync, or vice-versa.
