export interface PlayerCallbacks {
  onStatusUpdate: (message: string) => void;
  onError: (message: string) => void;
  onReady: (message: string) => void;
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

export interface BasePlayer {
  initialize(videoElement: HTMLVideoElement, url: string, callbacks: PlayerCallbacks): void;
  destroy(): void;
}