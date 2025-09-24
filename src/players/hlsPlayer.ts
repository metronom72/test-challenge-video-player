import Hls from 'hls.js';
import { type BasePlayer, type PlayerCallbacks, type BrowserSupport } from '../types';

export class HlsPlayer implements BasePlayer {
  private hlsInstance: Hls | null = null;
  private videoElement: HTMLVideoElement | null = null;

  static checkSupport(): BrowserSupport {
    const video = document.createElement('video');
    return {
      hls: Hls.isSupported(),
      nativeHls: video.canPlayType('application/vnd.apple.mpegurl') !== ''
    };
  }

  initialize(videoElement: HTMLVideoElement, url: string, callbacks: PlayerCallbacks): void {
    this.videoElement = videoElement;
    const support = HlsPlayer.checkSupport();

    try {
      if (support.nativeHls) {
        this.initializeNative(videoElement, url, callbacks);
      } else if (support.hls) {
        this.initializeHlsJs(videoElement, url, callbacks);
      } else {
        callbacks.onError('HLS not supported in this browser');
        return;
      }
    } catch (error) {
      console.error('HLS player initialization failed:', error);
      callbacks.onError('Failed to initialize HLS player');
    }
  }

  private initializeNative(videoElement: HTMLVideoElement, url: string, callbacks: PlayerCallbacks): void {
    videoElement.src = url;
    videoElement.load();

    callbacks.onStatusUpdate('HLS loaded (native support)');
    callbacks.onReady('HLS ready (native)');
    console.log('HLS loaded natively:', url);
  }

  private initializeHlsJs(videoElement: HTMLVideoElement, url: string, callbacks: PlayerCallbacks): void {
    this.hlsInstance = new Hls({
      debug: false,
      enableWorker: true,
      lowLatencyMode: true
    });

    this.hlsInstance.loadSource(url);
    this.hlsInstance.attachMedia(videoElement);

    this.hlsInstance.on(Hls.Events.MEDIA_ATTACHED, () => {
      console.log('HLS media attached');
    });

    this.hlsInstance.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
      callbacks.onReady('HLS stream ready (hls.js)');
      console.log('HLS manifest parsed. Quality levels:', data.levels.length);
    });

    this.hlsInstance.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
      console.log('HLS level switched to:', data.level);
    });

    this.hlsInstance.on(Hls.Events.ERROR, (event, data) => {
      console.error('HLS error:', event, data);
      this.handleHlsError(data, callbacks);
    });

    callbacks.onStatusUpdate('HLS player initialized (hls.js)');
  }

  private handleHlsError(data: any, callbacks: PlayerCallbacks): void {
    if (data.fatal) {
      switch (data.type) {
        case Hls.ErrorTypes.NETWORK_ERROR:
          callbacks.onStatusUpdate('HLS network error - attempting recovery');
          console.log('Trying to recover from network error');
          this.hlsInstance?.startLoad();
          break;

        case Hls.ErrorTypes.MEDIA_ERROR:
          callbacks.onStatusUpdate('HLS media error - attempting recovery');
          console.log('Trying to recover from media error');
          this.hlsInstance?.recoverMediaError();
          break;

        default:
          callbacks.onError('Fatal HLS error - cannot recover');
          this.destroy();
          break;
      }
    }
  }

  destroy(): void {
    if (this.hlsInstance) {
      try {
        this.hlsInstance.destroy();
        this.hlsInstance = null;
        console.log('HLS player destroyed');
      } catch (error) {
        console.error('Error destroying HLS player:', error);
      }
    }

    if (this.videoElement) {
      this.videoElement.src = '';
      this.videoElement = null;
    }
  }

  getHlsInstance(): Hls | null {
    return this.hlsInstance;
  }

  getQualityLevels(): any[] {
    return this.hlsInstance?.levels || [];
  }
}