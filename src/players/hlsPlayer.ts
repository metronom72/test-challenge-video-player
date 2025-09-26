import type Hls from 'hls.js';
import type { BasePlayer, PlayerCallbacks, AutoplayResult } from '../types';

export class HlsPlayer implements BasePlayer {
  private hlsInstance: Hls | null = null;
  private videoElement: HTMLVideoElement | null = null;

  static async new(
    videoElement: HTMLVideoElement,
    url: string,
    callbacks: PlayerCallbacks
  ): Promise<HlsPlayer> {
    const inst = new HlsPlayer();
    inst.videoElement = videoElement;

    const nativeHls = HlsPlayer.hasNativeHlsSupport();

    try {
      if (nativeHls) {
        inst.initializeNative(videoElement, url, callbacks);
        callbacks.onStatusUpdate?.('HLS loaded (native support)');
        return inst;
      }

      const hlsMod = await import('hls.js');
      const HlsCtor = hlsMod.default;

      if (HlsCtor && HlsCtor.isSupported()) {
        inst.initializeHlsJs(HlsCtor, videoElement, url, callbacks);
        callbacks.onStatusUpdate?.('HLS player initialized (hls.js)');
        return inst;
      }

      callbacks.onError?.('HLS not supported in this browser');
      throw new Error('HLS not supported');
    } catch (error) {
      console.error('HLS player initialization failed:', error);
      callbacks.onError?.('Failed to initialize HLS player');
      try { inst.destroy(); } catch {}
      throw error;
    }
  }

  static async isSupported(): Promise<boolean> {
    if (HlsPlayer.hasNativeHlsSupport()) return true;
    try {
      const hlsMod = await import('hls.js');
      const HlsCtor = hlsMod.default;
      return  (HlsCtor && HlsCtor.isSupported());
    } catch {
      return false;
    }
  }

  private static hasNativeHlsSupport(): boolean {
    const video = document.createElement('video');
    return video.canPlayType('application/vnd.apple.mpegurl') !== '';
  }

  private initializeNative(
    videoElement: HTMLVideoElement,
    url: string,
    callbacks: PlayerCallbacks
  ): void {
    videoElement.src = url;
    videoElement.load();

    const canPlayHandler = async () => {
      callbacks.onReady?.('HLS ready (native)');
      console.log('HLS loaded natively:', url);

      try {
        const autoplayResult = await this.attemptAutoplay(videoElement);
        if (autoplayResult.success) {
          callbacks.onStatusUpdate?.(
            autoplayResult.muted
              ? 'HLS playing (muted due to autoplay policy)'
              : 'HLS playing with audio'
          );
        } else {
          callbacks.onAutoplayBlocked?.('Click play button to start HLS video');
        }
      } catch {
        console.log('HLS native autoplay attempt completed with restrictions');
      }

      videoElement.removeEventListener('canplay', canPlayHandler);
    };

    videoElement.addEventListener('canplay', canPlayHandler);
  }

  private initializeHlsJs(
    HlsCtor: typeof import('hls.js').default,
    videoElement: HTMLVideoElement,
    url: string,
    callbacks: PlayerCallbacks
  ): void {
    this.hlsInstance = new HlsCtor({
      debug: false,
      enableWorker: true,
      lowLatencyMode: true,
    });

    this.hlsInstance.loadSource(url);
    this.hlsInstance.attachMedia(videoElement);

    this.hlsInstance.on(HlsCtor.Events.MEDIA_ATTACHED, () => {
      console.log('HLS media attached');
    });

    this.hlsInstance.on(HlsCtor.Events.MANIFEST_PARSED, async (_evt, data) => {
      callbacks.onReady?.('HLS stream ready (hls.js)');
      console.log('HLS manifest parsed. Quality levels:', data.levels.length);

      try {
        const autoplayResult = await this.attemptAutoplay(videoElement);
        if (autoplayResult.success) {
          callbacks.onStatusUpdate?.(
            autoplayResult.muted
              ? 'HLS playing (muted due to autoplay policy)'
              : 'HLS playing with audio'
          );
        } else {
          callbacks.onAutoplayBlocked?.('Click play button to start HLS video');
        }
      } catch {
        console.log('HLS.js autoplay attempt completed with restrictions');
      }
    });

    this.hlsInstance.on(HlsCtor.Events.LEVEL_SWITCHED, (_evt, data) => {
      console.log('HLS level switched to:', data.level);
    });

    this.hlsInstance.on(HlsCtor.Events.ERROR, (event, data) => {
      console.error('HLS error:', event, data);
      this.handleHlsError(HlsCtor, data, callbacks);
    });
  }

  async attemptAutoplay(videoElement: HTMLVideoElement): Promise<AutoplayResult> {
    try {
      await videoElement.play();
      return { success: true, muted: false };
    } catch {
      try {
        videoElement.muted = true;
        await videoElement.play();
        return { success: true, muted: true };
      } catch {
        console.log('HLS autoplay blocked by browser policy');
        return {
          success: false,
          muted: false,
          error: 'Autoplay blocked by browser policy',
        };
      }
    }
  }

  private handleHlsError(
    HlsCtor: typeof import('hls.js').default,
    data: any,
    callbacks: PlayerCallbacks
  ): void {
    if (data.fatal) {
      switch (data.type) {
        case HlsCtor.ErrorTypes.NETWORK_ERROR:
          callbacks.onStatusUpdate?.('HLS network error - attempting recovery');
          console.log('Trying to recover from network error');
          this.hlsInstance?.startLoad();
          break;

        case HlsCtor.ErrorTypes.MEDIA_ERROR:
          callbacks.onStatusUpdate?.('HLS media error - attempting recovery');
          console.log('Trying to recover from media error');
          this.hlsInstance?.recoverMediaError();
          break;

        default:
          callbacks.onError?.('Fatal HLS error - cannot recover');
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
}

export default HlsPlayer;
