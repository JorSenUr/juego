// src/utils/soundManager.ts
import Sound from 'react-native-sound';
import { getCurrentConfig } from './gameConfig';

Sound.setCategory('Playback');

class SoundManager {
  private timerStart: Sound | null = null;
  private timerEnd: Sound | null = null;
  private loopA: Sound | null = null;
  private loopB: Sound | null = null;
  private current: 'A' | 'B' = 'A';
  private isLooping: boolean = false;
  private isLoaded: boolean = false;
  private crossfadeDuration = 500; // ms
  private loopTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.preloadSounds();
  }

  private preloadSounds() {
    let loaded = 0;
    const total = 4;
    const done = () => {
      loaded++;
      if (loaded === total) {
        this.isLoaded = true;
        //console.log('🎧 [SoundManager] Todos los sonidos cargados');
      }
    };

    const load = (label: string, file: any) =>
      new Sound(file, (err) => {
        if (err) console.log(`⚠️ Error cargando ${label}:`, err);
        //else console.log(`✅ Cargado ${label}`);
        done();
      });

    this.timerStart = load('timer_start', require('../assets/timer_start.mp3'));
    this.timerEnd = load('timer_end', require('../assets/timer_end.mp3'));
    this.loopA = load('timer_loop (A)', require('../assets/timer_loop.mp3'));
    this.loopB = load('timer_loop (B)', require('../assets/timer_loop.mp3'));
  }

  private async waitUntilLoaded(): Promise<void> {
    if (this.isLoaded) return;
    await new Promise<void>((resolve) => {
      const i = setInterval(() => {
        if (this.isLoaded) {
          clearInterval(i);
          resolve();
        }
      }, 100);
    });
  }

  async startTimer() {
    const config = getCurrentConfig();
    if (!config.soundTimerEnabled) return;

    await this.waitUntilLoaded();
    this.isLooping = true;
    //console.log('▶️ [SoundManager] startTimer llamado');

    if (this.timerStart) {
      this.timerStart.play((success) => {
        if (success && this.isLooping) {
          this.startDoubleLoop();
        } else if (!success) {
          this.startDoubleLoop();
        }
      });
    } else {
      this.startDoubleLoop();
    }
  }

  private startDoubleLoop() {
    if (!this.loopA || !this.loopB) return;

    this.current = 'A';
    this.loopA.setCurrentTime(0);
    this.loopA.setVolume(1);
    const loopDuration = this.loopA.getDuration() * 1000;
    const fade = this.crossfadeDuration;
    //console.log(`🎵 [SoundManager] Loop doble iniciado: duración ${loopDuration}ms`);

    const scheduleNext = () => {
      if (!this.isLooping) return;

      const nextLoop = this.current === 'A' ? this.loopB! : this.loopA!;
      const currentLoop = this.current === 'A' ? this.loopA! : this.loopB!;

      setTimeout(() => {
        if (!this.isLooping) return;

        nextLoop.setCurrentTime(0);
        nextLoop.setVolume(0);
        nextLoop.play();

        // Crossfade suave
        const steps = 20;
        const stepTime = fade / steps;
        for (let i = 0; i <= steps; i++) {
          setTimeout(() => {
            const p = i / steps;
            currentLoop.setVolume(1 - p);
            nextLoop.setVolume(p);
          }, i * stepTime);
        }

        this.current = this.current === 'A' ? 'B' : 'A';
        scheduleNext();
      }, loopDuration - fade);
    };

    this.loopA.play();
    scheduleNext();
  }

  stopTimer() {
    const config = getCurrentConfig();
    this.isLooping = false;

    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }

    [this.loopA, this.loopB].forEach((s) => {
      s?.stop(() => s.setCurrentTime(0));
    });

    if (config.soundEndEnabled && this.timerEnd) this.timerEnd.play();

    //console.log('⏹️ [SoundManager] Timer detenido');
  }

  stopTimerSilent() {
    this.isLooping = false;
    [this.loopA, this.loopB].forEach((s) => {
      s?.stop(() => s.setCurrentTime(0));
    });
    //console.log('🔇 [SoundManager] Timer detenido sin sonido');
  }

  muteAll() {
    [this.timerStart, this.timerEnd, this.loopA, this.loopB].forEach((s) => {
      s?.setVolume(0);
    });
    //console.log('🔇 [SoundManager] Todos los sonidos muteados');
  }

  unmuteAll() {
    // Restaurar volumen de los efectos de sonido
    this.timerStart?.setVolume(1);
    this.timerEnd?.setVolume(1);
    
    // Solo restaurar loops si están activos
    if (this.isLooping) {
      this.loopA?.setVolume(this.current === 'A' ? 1 : 0);
      this.loopB?.setVolume(this.current === 'B' ? 1 : 0);
    }   
    //console.log('🔊 [SoundManager] Sonidos restaurados');
  }

  release() {
    [this.timerStart, this.timerEnd, this.loopA, this.loopB].forEach((s) => s?.release());
    //console.log('🧹 [SoundManager] Recursos liberados');
  }
}

export const soundManager = new SoundManager();
