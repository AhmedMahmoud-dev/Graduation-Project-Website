import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ParticleBackgroundComponent } from '../../shared/components/particle-background/app-particle-background';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet, ParticleBackgroundComponent],
  templateUrl: './app-auth-layout.html',
  styleUrl: './app-auth-layout.css'
})
export class AuthLayoutComponent { }
