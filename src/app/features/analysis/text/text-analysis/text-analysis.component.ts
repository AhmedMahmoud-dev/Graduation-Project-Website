import { Component, signal, inject, computed, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastService } from '../../../../core/services/toast.service';
import { TextAnalysisService } from '../../../../core/services/text-analysis.service';
import { ChartThemeService } from '../../../../core/services/chart-theme.service';
import { AnalysisStorageService } from '../../../../core/services/analysis-storage.service';
import { EmotionColorService } from '../../../../core/services/emotion-color.service';
import { TextAnalysisResult } from '../../../../core/models/text-analysis.model';
import { AnalysisV2Service } from '../../../../core/services/analysis-v2.service';
import { AuthService } from '../../../../core/services/auth.service';


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
import { TimelineDataPoint, DistributionDataPoint } from '../../../../core/models/chart-data.model';

type PageState = 'input' | 'loading' | 'results' | 'fetching';

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
    AnalysisFeedbackComponent
  ],
  templateUrl: './app-text-analysis.html',
  styleUrl: './app-text-analysis.css'
})
export class TextAnalysisComponent implements OnInit {
  private analysisService = inject(TextAnalysisService);
  private chartThemeService = inject(ChartThemeService);
  private storageService = inject(AnalysisStorageService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toastService = inject(ToastService);
  private analysisV2Service = inject(AnalysisV2Service);
  private authService = inject(AuthService);
  colorService = inject(EmotionColorService);
  private shouldScrollToFeedback = false;


  state = signal<PageState>('input');
  inputText = signal<string>('');
  error = signal<string | null>(null);
  result = signal<TextAnalysisResult | null>(null);
  sessionId = signal<string>('');

  charCount = computed(() => this.inputText().length);
  tokenEstimate = computed(() => Math.round(this.inputText().length / 4));
  sentenceCount = computed(() => {
    const t = this.inputText().trim();
    if (!t) return 0;
    return (t.match(/[.!?]+/g) || []).length + 1;
  });

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

  timelineData = signal<TimelineDataPoint[]>([]);
  distributionData = signal<DistributionDataPoint[]>([]);

  modelChips = computed(() => {
    const r = this.result();
    if (!r) return [];
    return [
      { label: 'Model', value: r.model_info.name, mono: true },
      { label: 'Processing Time', value: `${r.processing_time_ms.toFixed(0)}ms`, mono: false },
      { label: 'Token Count', value: `${r.input_info.token_count}`, mono: false },
      { label: 'Device', value: r.model_info.device_used.toUpperCase(), mono: false },
    ];
  });

  constructor() {
    // Capture navigation state for scrolling
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state?.['scrollToFeedback']) {
      this.shouldScrollToFeedback = true;
    }

    effect(() => {
      const theme = this.chartThemeService.getChartTheme();
      if (this.result()) {
        this.buildChartOptions(theme);
      }
    });
  }

  ngOnInit() {
    this.shuffleArray(this.shuffledTexts);

    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        // Try local storage by UUID (client_id) first, then by numeric cloudId
        let session = this.storageService.getSessionById(id)
          || this.storageService.getSessions().find(s => s.cloudId === Number(id));

        if (session) {
          this.sessionId.set(session.id);
          this.inputText.set(session.input);
          this.result.set(session.result);
          this.state.set('results');
          this.buildChartOptions(this.chartThemeService.getChartTheme());

          if (this.shouldScrollToFeedback) {
            this.shouldScrollToFeedback = false; // consume it
            setTimeout(() => this.scrollToFeedback(), 150);
          }
        } else {
          // Fallback to API using the id (works with numeric IDs)
          this.state.set('fetching');
          this.analysisV2Service.getAnalysisDetails(id).subscribe({
            next: (res) => {
              if (res.is_success && res.data && res.data.type === 'Text') {
                const fetchedSession = this.analysisV2Service.mapDetailsToSession(res.data) as any;

                this.storageService.saveSession(fetchedSession);

                this.sessionId.set(fetchedSession.id);
                this.inputText.set(fetchedSession.input);
                this.result.set(fetchedSession.result);
                this.state.set('results');
                this.buildChartOptions(this.chartThemeService.getChartTheme());

                if (this.shouldScrollToFeedback) {
                  this.shouldScrollToFeedback = false; // consume it
                  setTimeout(() => this.scrollToFeedback(), 300);
                }
              } else {
                this.toastService.show('Not Found', 'This analysis report could not be found', 'error', 'error');
                this.router.navigate(['/analysis/text']);
              }
            },
            error: () => {
              this.toastService.show('Error', 'Failed to retrieve analysis report', 'error', 'error');
              this.router.navigate(['/analysis/text']);
            }
          });
        }
      } else {
        if (this.state() === 'results') {
          this.resetToInput(false);
        }
      }
    });
  }

  shuffledTexts = [...SAMPLE_TEXTS];
  currentIndex = 0;

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
    if (this.error()) this.error.set(null);
  }

  startAnalysis() {
    this.state.set('loading');
    this.error.set(null);

    this.analysisService.analyze(this.inputText())
      .subscribe({
        next: (res) => {
          setTimeout(() => {
            this.result.set(res);
            const sid = crypto.randomUUID();
            this.sessionId.set(sid);
            this.storageService.saveSession({
              id: sid,
              type: 'text',
              timestamp: new Date().toISOString(),
              input: this.inputText(),
              result: res
            });

            this.buildChartOptions(this.chartThemeService.getChartTheme());
            this.state.set('results');
            this.router.navigate(['/analysis/text', sid], { replaceUrl: true });

            // Background fire-and-forget — only if logged in
            if (this.authService.isAuthenticated()) {
              this.analysisV2Service.saveTextAnalysis(sid, res)
                .subscribe({
                  next: (apiRes) => {
                    if (apiRes.is_success && apiRes.data != null) {
                      this.storageService.markAsSynced(sid, apiRes.data, 'text');
                    } else {
                      this.storageService.deleteSession(sid, 'text');
                      this.toastService.show('Save Failed', 'Analysis could not be saved to cloud.', 'error', 'error');
                    }
                  },
                  error: () => {
                    this.storageService.deleteSession(sid, 'text');
                    this.toastService.show('Save Failed', 'Analysis could not be saved to cloud.', 'error', 'error');
                  }
                });
            }
          }, 500);
        },
        error: (err) => {
          console.error(err);
          const msg = 'Something went wrong. Please try again later.';
          this.error.set(msg);
          this.toastService.show('Analysis Failed', msg, 'error');
          this.state.set('input');
        }
      });
  }


  resetToInput(navigate = true) {
    this.state.set('input');
    this.result.set(null);
    // this.showEditHint.set(false);
    if (navigate) {
      this.router.navigate(['/analysis/text']);
    }
  }

  emotionalInsights = computed(() => {
    const res = this.result();
    if (!res) return null;

    const sorted = [...res.combined_results].sort((a, b) => b.confidence_percent - a.confidence_percent);
    const primary = sorted[0];
    const diversity = res.combined_results.filter(r => r.confidence_percent > 5).length;

    const posKeys = ['joy', 'surprise'];
    const negKeys = ['anger', 'disgust', 'fear', 'sadness'];

    let posScore = 0;
    let negScore = 0;
    res.combined_results.forEach(r => {
      const label = r.label.toLowerCase();
      if (posKeys.includes(label)) posScore += r.confidence_percent;
      else if (negKeys.includes(label)) negScore += r.confidence_percent;
    });

    let polarity = 'Neutral';
    let polarityColor = '#778ca3';

    if (posScore > negScore + 15) {
      polarity = 'Positive';
      polarityColor = '#ffd32a';
    } else if (negScore > posScore + 15) {
      polarity = 'Negative';
      polarityColor = '#ff4757';
    }

    return {
      primary: primary.label,
      diversity,
      polarity,
      polarityColor,
      complexity: diversity > 3 ? 'Complex' : (diversity > 1 ? 'Balanced' : 'Direct')
    };
  });


  private buildChartOptions(theme: any) {
    const res = this.result();
    if (!res) return;

    this.timelineData.set(res.sentences_analysis.map((s, i) => ({
      label: `S${i + 1}`,
      probabilities: s.probabilities as any,
      tooltipTitle: `Sentence ${i + 1}`,
      tooltipDetail: s.sentence
    })));

    this.distributionData.set(res.combined_results.map(r => ({
      label: r.label,
      value: r.confidence_percent
    })));
  }

  scrollToFeedback() {
    const el = document.getElementById('feedback-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
