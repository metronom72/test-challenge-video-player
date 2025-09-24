import Hls from 'hls.js';
import { type BasePlayer, type PlayerCallbacks, type BrowserSupport, type AutoplayResult } from '../types';

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

    const canPlayHandler = async () => {
      callbacks.onReady('HLS ready (native)');
      console.log('HLS loaded natively:', url);

      try {
        const autoplayResult = await this.attemptAutoplay(videoElement);
        if (autoplayResult.success) {
          if (autoplayResult.muted) {
            callbacks.onStatusUpdate('HLS playing (muted due to autoplay policy)');
          } else {
            callbacks.onStatusUpdate('HLS playing with audio');
          }
        } else {
          callbacks.onAutoplayBlocked?.('Click play button to start HLS video');
        }
      } catch (error) {
        console.log('HLS native autoplay attempt completed with restrictions');
      }

      videoElement.removeEventListener('canplay', canPlayHandler);
    };

    videoElement.addEventListener('canplay', canPlayHandler);
    callbacks.onStatusUpdate('HLS loaded (native support)');
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

    this.hlsInstance.on(Hls.Events.MANIFEST_PARSED, async (_, data) => {
      callbacks.onReady('HLS stream ready (hls.js)');
      console.log('HLS manifest parsed. Quality levels:', data.levels.length);

      try {
        const autoplayResult = await this.attemptAutoplay(videoElement);
        if (autoplayResult.success) {
          if (autoplayResult.muted) {
            callbacks.onStatusUpdate('HLS playing (muted due to autoplay policy)');
          } else {
            callbacks.onStatusUpdate('HLS playing with audio');
          }
        } else {
          callbacks.onAutoplayBlocked?.('Click play button to start HLS video');
        }
      } catch (error) {
        console.log('HLS.js autoplay attempt completed with restrictions');
      }
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

  async attemptAutoplay(videoElement: HTMLVideoElement): Promise<AutoplayResult> {
    try {
      await videoElement.play();
      return { success: true, muted: false };
    } catch (error: any) {
      try {
        videoElement.muted = true;
        await videoElement.play();
        return { success: true, muted: true };
      } catch (mutedError: any) {
        console.log('HLS autoplay blocked by browser policy');
        return {
          success: false,
          muted: false,
          error: 'Autoplay blocked by browser policy'
        };
      }
    }
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