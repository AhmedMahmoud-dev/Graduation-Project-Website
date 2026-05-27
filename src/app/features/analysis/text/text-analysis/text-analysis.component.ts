import { Component, signal, inject, computed, OnInit, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TextAnalysisResult } from '../../../../core/models/text-analysis.model';
import { TextAnalysisStore } from '../../../../core/stores/text-analysis.store';
import { QuotaStore } from '../../../../core/stores/quota.store';

import { EmotionIconComponent } from '../../../../shared/components/emotion-icon/emotion-icon.component';
import { FooterSectionComponent } from '../../../../shared/components/footer/footer.component';
import { EmotionTimelineComponent } from '../../../../shared/components/emotion-charts/emotion-timeline/emotion-timeline.component';
import { EmotionDistributionComponent } from '../../../../shared/components/emotion-charts/emotion-distribution/emotion-distribution.component';
import { DominantEmotionHeroComponent } from '../../../../shared/components/analysis/dominant-emotion-hero/dominant-emotion-hero.component';
import { SessionTopBarComponent } from '../../../../shared/components/analysis/session-top-bar/session-top-bar.component';
import { AnalysisBreakdownCardComponent } from '../../../../shared/components/analysis/analysis-breakdown-card/analysis-breakdown-card.component';
import { RawJsonSectionComponent } from '../../../../shared/components/analysis/raw-json-section/raw-json-section.component';
import { ModelInfoGridComponent } from '../../../../shared/components/analysis/model-info-grid/model-info-grid.component';
import { LoadingTipsComponent } from '../../../../shared/components/analysis/loading-tips/loading-tips.component';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../../shared/components/layout/page-header/page-header.component';
import { AnalysisFeedbackComponent } from '../../../../shared/components/analysis-feedback/analysis-feedback.component';
import { AnalysisSectionHeaderComponent } from '../../../../shared/components/analysis-section-header/analysis-section-header.component';
import { QuotaBannerComponent } from '../../../../shared/components/quota-banner/quota-banner.component';

const SAMPLE_TEXTS = [
  // Pure sad
  "I lost my best friend today. Everything feels empty and meaningless. I can't stop crying and I don't know how to move forward.",
  "She left without saying goodbye. I sat by the window for hours waiting, but she never came back. The silence was unbearable.",
  "I feel like I'm disappearing slowly. Nothing excites me anymore and even getting out of bed feels like a burden.",

  // Pure happy / joy
  "I got the job! I've been working towards this for two years and it finally happened. I feel like I'm on top of the world!",
  "Today was the best day of my life. My family surprised me with a party, everyone I love was there, and I felt so grateful.",
  "I can't stop smiling today. Everything just feels right and I'm genuinely happy for the first time in a while.",

  // Pure anger
  "I can't believe he lied to my face again. I trusted him completely and he betrayed that trust without any remorse. I'm furious.",
  "They rejected my proposal without even reading it properly. This is completely unfair and I won't let it go.",
  "I'm so tired of being ignored. It's like my voice doesn't matter at all and it's driving me insane.",

  // Mixed — starts positive, turns negative
  "The morning started beautifully, I felt happy and full of energy. Then I got the news. Everything collapsed in an instant. I was devastated.",
  "We were having a great time at the party, laughing and dancing. Suddenly there was an argument and everything turned dark and tense.",
  "I was so excited to see them again. But the moment we met, I realized things had changed. It felt awkward and painful.",

  // Mixed — starts negative, turns positive
  "I was terrified before the presentation, my hands were shaking. But once I started speaking, the confidence came. By the end I felt proud and relieved.",
  "The diagnosis scared me deeply. But the doctor said it was treatable. I cried from fear first, then cried from relief.",
  "I woke up feeling anxious and overwhelmed. But after talking to a friend, I started to feel lighter and more hopeful.",

  // Complex mix (multiple emotions)
  "I'm so angry at myself for missing the deadline. But honestly I'm also scared of what my manager will say. Part of me just feels numb.",
  "Seeing my old photos made me smile, then feel nostalgic, then a little sad. Time passes so fast and I'm not sure how I feel about that.",
  "I feel excited about the future, but also terrified of failing. It's like hope and fear are fighting inside me.",

  // Anxiety / fear
  "My heart keeps racing and I can't calm down. I feel like something bad is about to happen, even though I don't know what.",
  "I keep overthinking everything I said today. What if I embarrassed myself? What if they think I'm stupid?",
  "I feel this constant tension in my chest. It's exhausting to always be on edge like this.",

  // Neutral / reflective
  "Today was just an ordinary day. Nothing special happened, but nothing bad either.",
  "I spent some time thinking about my life and where I'm heading. I don't have answers yet.",
  "Things are okay, I guess. Not great, not terrible. Just somewhere in between.",

  // Hope / motivation
  "No matter how hard things get, I believe I can get through this. I've made it this far already.",
  "I'm starting to see progress, even if it's small. That gives me hope to keep going.",
  "I decided today that I won't give up on myself anymore. I deserve better.",
  "Every day is a new chance to improve, and I'm ready to take it.",
  "I know things are tough now, but I trust that better days are coming.",
  "I may not be there yet, but I'm getting closer every day.",
  "I believe in my ability to overcome this, no matter how long it takes.",
  "I'm learning to be patient with myself and trust the process.",
  "This is just a phase, and I know I'll come out stronger.",
  "I'm ready to face whatever comes next with determination.",
];

@Component({
  selector: 'app-text-analysis',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    EmotionIconComponent,
    FooterSectionComponent,
    EmotionTimelineComponent,
    EmotionDistributionComponent,
    DominantEmotionHeroComponent,
    SessionTopBarComponent,
    AnalysisBreakdownCardComponent,
    RawJsonSectionComponent,
    ModelInfoGridComponent,
    LoadingTipsComponent,
    LoadingStateComponent,
    PageHeaderComponent,
    AnalysisFeedbackComponent,
    AnalysisSectionHeaderComponent,
    QuotaBannerComponent
  ],
  providers: [TextAnalysisStore],
  templateUrl: './app-text-analysis.html',
  styleUrl: './app-text-analysis.css'
})
export class TextAnalysisComponent implements OnInit {
  private store = inject(TextAnalysisStore);
  private quotaStore = inject(QuotaStore);

  isBlocked = computed(() => this.quotaStore.text()?.is_blocked ?? false);

  // Expose store state / signals directly for the template
  state = this.store.state;
  error = this.store.error;
  result = this.store.result;
  sessionId = this.store.sessionId;
  timelineData = this.store.timelineData;
  distributionData = this.store.distributionData;
  inputText = this.store.inputText;

  charCount = this.store.charCount;
  tokenEstimate = this.store.tokenEstimate;
  sentenceCount = this.store.sentenceCount;
  modelChips = this.store.modelChips;
  emotionalInsights = this.store.emotionalInsights;

  colorService = this.store.colorService;

  shuffledTexts = [...SAMPLE_TEXTS];
  currentIndex = 0;

  loadingTips = [
    'Humans use over 3000 words just to describe emotions across all languages',
    'A single sentence can carry multiple emotions at the same time depending on context',
    'Negation completely changes emotion — "I am not happy" is very different from "I am happy"',
    'The same words can mean different emotions depending on the order they appear in',
    'Reading emotional tone in text is something even humans disagree on 30 percent of the time',
    'Emotra analyzes each sentence individually before combining them into a final result',
    'Subtle word choices like "a bit" or "quite" shift the emotional intensity significantly',
    'Context from earlier sentences influences how later sentences are interpreted'
  ];

  constructor() {
    // Reactive scroll-to-feedback handling
    effect(() => {
      if (this.store.shouldScrollToFeedback()) {
        untracked(() => {
          this.store.shouldScrollToFeedback.set(false);
        });
        setTimeout(() => this.scrollToFeedback(), 150);
      }
    });
  }

  ngOnInit() {
    this.shuffleArray(this.shuffledTexts);
    this.store.subscribeToRouteParams();
  }

  scrollToFeedback(): void {
    const el = document.getElementById('feedback-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  startAnalysis() {
    this.store.startAnalysis();
  }

  resetToInput() {
    this.store.resetToInput();
  }

  shuffleArray(array: string[]) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  useSample() {
    if (this.currentIndex >= this.shuffledTexts.length) {
      this.shuffleArray(this.shuffledTexts);
      this.currentIndex = 0;
    }
    this.inputText.set(this.shuffledTexts[this.currentIndex++]);
    this.onTextChange();
  }

  onTextChange() {
    if (this.error()) {
      this.error.set(null);
    }
  }
}

