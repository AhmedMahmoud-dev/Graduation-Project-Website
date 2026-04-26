import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, HostListener, inject, PLATFORM_ID, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ThemeService } from '../../../core/services/theme.service';

interface Particle {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  originalVx: number;
  originalVy: number;
}

@Component({
  selector: 'app-particle-background',
  standalone: true,
  imports: [],
  templateUrl: './app-particle-background.html',
  styleUrl: './app-particle-background.css'
})
export class ParticleBackgroundComponent implements AfterViewInit, OnDestroy {
  @ViewChild('particleCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private animationFrameId: number = 0;
  private isBrowser: boolean;
  private themeService = inject(ThemeService);
  private ngZone = inject(NgZone);
  private mouse = { x: -1000, y: -1000 };

  constructor() {
    this.isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  }

  ngAfterViewInit() {
    if (this.isBrowser && this.canvasRef) {
      this.initCanvas();

      this.ngZone.runOutsideAngular(() => {
        this.animate();
      });
    }
  }

  ngOnDestroy() {
    if (this.isBrowser) {
      window.cancelAnimationFrame(this.animationFrameId);
    }
  }

  @HostListener('window:resize')
  onResize() {
    if (this.isBrowser && this.canvasRef) {
      this.initCanvas();
    }
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    this.mouse.x = event.clientX;
    this.mouse.y = event.clientY;
  }

  @HostListener('window:mouseleave')
  onMouseLeave() {
    this.mouse.x = -1000;
    this.mouse.y = -1000;
  }

  private initCanvas() {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    this.ctx = canvas.getContext('2d')!;

    const particleCount = window.innerWidth < 768 ? 70 : 140;
    this.particles = [];

    for (let i = 0; i < particleCount; i++) {
      const radius = Math.random() * 1 + 1.5;
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;

      const speed = Math.random() * 0.5 + 0.3;
      const angle = Math.random() * Math.PI * 2;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      this.particles.push({ x, y, radius, vx, vy, originalVx: vx, originalVy: vy });
    }
  }

  private animate = () => {
    const canvas = this.canvasRef.nativeElement;
    const isDark = this.themeService.currentTheme() === 'dark';

    // Get dynamic primary color from CSS variables
    const rootStyle = getComputedStyle(document.documentElement);
    const primaryHex = rootStyle.getPropertyValue('--color-primary').trim() || '#6c63ff';

    const hexToRgba = (hex: string, alpha: number) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    const particleColor = isDark ? hexToRgba(primaryHex, 0.9) : hexToRgba(primaryHex, 0.6);
    const baseLineOp = isDark ? 0.7 : 0.3;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      const dx = this.mouse.x - p.x;
      const dy = this.mouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 150) {
        const forceDirectionX = dx / dist;
        const forceDirectionY = dy / dist;
        const force = (150 - dist) / 150;

        p.vx = p.originalVx - forceDirectionX * force * 2;
        p.vy = p.originalVy - forceDirectionY * force * 2;
      } else {
        p.vx += (p.originalVx - p.vx) * 0.05;
        p.vy += (p.originalVy - p.vy) * 0.05;
      }

      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > canvas.width) {
        p.vx *= -1;
        p.originalVx *= -1;
      }
      if (p.y < 0 || p.y > canvas.height) {
        p.vy *= -1;
        p.originalVy *= -1;
      }

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = particleColor;
      this.ctx.fill();

      for (let j = i + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j];
        const distance = Math.sqrt(Math.pow(p.x - p2.x, 2) + Math.pow(p.y - p2.y, 2));

        if (distance < 160) {
          this.ctx.beginPath();
          const opacity = baseLineOp * (1 - distance / 160);
          this.ctx.strokeStyle = hexToRgba(primaryHex, opacity);
          this.ctx.lineWidth = isDark ? 1.5 : 1.2;
          this.ctx.moveTo(p.x, p.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.stroke();
        }
      }
    }

    this.animationFrameId = window.requestAnimationFrame(this.animate);
  }
}
