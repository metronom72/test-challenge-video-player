export interface PlayerCallbacks {
  onStatusUpdate: (message: string) => void;
  onError: (message: string) => void;
  onReady: (message: string) => void;
  onAutoplayBlocked?: (message: string) => void;
}

export interface VideoOption {
  text: string;
  value: string;
  type: string;
}

export type VideoType = 'dash' | 'hls' | 'mp4' | 'unknown';

export interface BrowserSupport {
  hls: boolean;
  nativeHls: boolean;
}

export interface AutoplayResult {
  success: boolean;
  muted: boolean;
  error?: string;
}

export interface BasePlayer {
  initialize(videoElement: HTMLVideoElement, url: string, callbacks: PlayerCallbacks): void;
  destroy(): void;
  attemptAutoplay?(videoElement: HTMLVideoElement): Promise<AutoplayResult>;
}