// Utilidades para el timer del juego

export interface TimerConfig {
  minMinutes: number;
  maxMinutes: number;
  showTimer: boolean;
  warningSeconds: number; // Segundos antes del final para mostrar aviso
}

export const getRandomTimerDuration = (minMinutes: number, maxMinutes: number): number => {
  const minMs = minMinutes * 60 * 1000;
  const maxMs = maxMinutes * 60 * 1000;
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
};

export const formatTime = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export class GameTimer {
  private duration: number = 0;
  private startTime: number = 0;
  private intervalId: NodeJS.Timeout | null = null;
  private onTick: ((timeRemaining: number) => void) | null = null;
  private onComplete: (() => void) | null = null;
  private onWarning: (() => void) | null = null;
  private warningTriggered: boolean = false;
  private warningSeconds: number = 2;

  constructor(config: TimerConfig) {
    this.duration = getRandomTimerDuration(config.minMinutes, config.maxMinutes);
    this.warningSeconds = config.warningSeconds;
  }

  setDuration(durationMs: number): void {
    this.duration = durationMs;
  }

  start(
    onTick: (timeRemaining: number) => void,
    onComplete: () => void,
    onWarning?: () => void
  ): void {
    this.onTick = onTick;
    this.onComplete = onComplete;
    this.onWarning = onWarning ?? null;
    this.startTime = Date.now();
    this.warningTriggered = false;

    this.intervalId = setInterval(() => {
      const elapsed = Date.now() - this.startTime;
      const remaining = Math.max(0, this.duration - elapsed);

      if (this.onTick) {
        this.onTick(remaining);
      }

      // Trigger warning if enabled and time is running out
      if (
        !this.warningTriggered &&
        remaining <= this.warningSeconds * 1000 &&
        remaining > 0 &&
        this.onWarning
      ) {
        this.warningTriggered = true;
        this.onWarning();
      }

      // Timer completed
      if (remaining <= 0) {
        this.stop();
        if (this.onComplete) {
          this.onComplete();
        }
      }
    }, 100); // Update every 100ms for smooth countdown
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  getDuration(): number {
    return this.duration;
  }

  getFormattedDuration(): string {
    return formatTime(this.duration);
  }

  isRunning(): boolean {
    return this.intervalId !== null;
  }

  reset(): void {
    this.stop();
    this.startTime = 0;
    this.warningTriggered = false;
  }
}