import { Component, signal } from '@angular/core';


interface FAQItem {
  question: string;
  answer: string;
}

@Component({
  selector: 'app-faq-section',
  standalone: true,
  imports: [],
  templateUrl: './faq-section.component.html',
  styleUrl: './faq-section.component.css'
})
export class FAQSectionComponent {
  activeIndex = signal<number | null>(0);

  faqs: FAQItem[] = [
    {
      question: "What types of emotions can Emotra detect?",
      answer: "Emotra detects 7 core emotions: Joy, Sadness, Anger, Fear, Disgust, Surprise, and Neutral. Each analysis returns confidence scores for all emotions, not just the dominant one."
    },
    {
      question: "How accurate are the emotion models?",
      answer: "Our text model is built on fine-tuned transformer architecture achieving over 92% accuracy on benchmark datasets. Audio analysis uses a separate model trained on prosodic and spectral features."
    },
    {
      question: "Is my data stored or used for training?",
      answer: "Analysis results are stored in your account history for your personal use only. We do not use your data to retrain or improve our models without explicit consent."
    },
    {
      question: "Can I use Emotra through an API?",
      answer: "API access is planned as part of the Intelligence Pro tier. You will be able to integrate emotion analysis directly into your own applications."
    },
    {
      question: "Does it work in languages other than English?",
      answer: "Currently our models are optimized for English. Multi-language support is on the roadmap for future releases."
    }
  ];

  toggle(index: number) {
    if (this.activeIndex() === index) {
      this.activeIndex.set(null);
    } else {
      this.activeIndex.set(index);
    }
  }
}
