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
  destroy(): void;
  getPlayer?(): any;
  attemptAutoplay?(videoElement: HTMLVideoElement): Promise<AutoplayResult>;
}

export enum VideoState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  READY = 'READY',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  SEEKING = 'SEEKING',
  BUFFERING = 'BUFFERING',
  ENDED = 'ENDED'
}

export interface VideoStateInfo {
  state: VideoState;
  timestamp: number;
  previousState: VideoState | null;
  metadata?: {
    bufferingDuration?: number;
    bufferingStartTime?: number;
    currentTime?: number;
    duration?: number;
    bufferedRanges?: TimeRanges;
    readyState?: number;
  };
}

export interface VideoStateChangeEvent {
  currentState: VideoStateInfo;
  previousState: VideoStateInfo | null;
  transitionDuration: number;
}

export type VideoStateChangeCallback = (event: VideoStateChangeEvent) => void;