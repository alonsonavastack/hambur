import { AnimationCallbackEvent, Injectable } from '@angular/core';
import { animate, stagger } from 'animejs';

@Injectable({ providedIn: 'root' })
export class AnimateService {

  fadeUp(event: AnimationCallbackEvent) {
    animate(event.target, {
      translateY: [40, 0],
      opacity: [0, 1],
      duration: 700,
      easing: 'easeOutCubic',
    });
  }

  fadeIn(event: AnimationCallbackEvent) {
    animate(event.target, {
      opacity: [0, 1],
      duration: 900,
      easing: 'easeOutCubic',
      delay: 200,
    });
  }

  fadeUpDelayed(event: AnimationCallbackEvent) {
    animate(event.target, {
      translateY: [30, 0],
      opacity: [0, 1],
      duration: 700,
      easing: 'easeOutCubic',
      delay: 350,
    });
  }

  scaleIn(event: AnimationCallbackEvent) {
    animate(event.target, {
      scale: [0.85, 1],
      opacity: [0, 1],
      duration: 600,
      easing: 'easeOutBack',
      delay: 150,
    });
  }

  slideLeft(event: AnimationCallbackEvent) {
    animate(event.target, {
      translateX: [-40, 0],
      opacity: [0, 1],
      duration: 650,
      easing: 'easeOutCubic',
      delay: 100,
    });
  }

  slideRight(event: AnimationCallbackEvent) {
    animate(event.target, {
      translateX: [40, 0],
      opacity: [0, 1],
      duration: 650,
      easing: 'easeOutCubic',
      delay: 100,
    });
  }

  cardStagger(event: AnimationCallbackEvent) {
    animate(event.target, {
      translateY: [50, 0],
      opacity: [0, 1],
      scale: [0.95, 1],
      duration: 600,
      easing: 'easeOutCubic',
      delay: stagger(120),
    });
  }

  neonPop(event: AnimationCallbackEvent) {
    animate(event.target, {
      scale: [0.7, 1.05, 1],
      opacity: [0, 1],
      duration: 800,
      easing: 'easeOutElastic(1, 0.6)',
    });
  }

  footerSlideUp(event: AnimationCallbackEvent) {
    animate(event.target, {
      translateY: [60, 0],
      opacity: [0, 1],
      duration: 600,
      easing: 'easeOutCubic',
      delay: 500,
    });
  }
}
