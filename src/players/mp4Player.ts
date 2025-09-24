import { type BasePlayer, type PlayerCallbacks, type AutoplayResult } from '../types';

export class Mp4Player implements BasePlayer {
  private videoElement: HTMLVideoElement | null = null;
  private listeners: { [key: string]: EventListener } = {};

  initialize(videoElement: HTMLVideoElement, url: string, callbacks: PlayerCallbacks): void {
    this.videoElement = videoElement;

    try {
      videoElement.src = url;

      this.setupEventListeners(callbacks);

      videoElement.load();

      callbacks.onStatusUpdate('MP4 video loading...');
      console.log('MP4 video initialized:', url);

    } catch (error) {
      console.error('MP4 player initialization failed:', error);
      callbacks.onError('Failed to initialize MP4 player');
    }
  }

  private setupEventListeners(callbacks: PlayerCallbacks): void {
    if (!this.videoElement) return;

    this.removeEventListeners();

    // Load events
    this.listeners.loadstart = () => {
      callbacks.onStatusUpdate('Started loading video');
    };

    this.listeners.loadedmetadata = () => {
      callbacks.onReady('Video metadata loaded');
      this.logVideoInfo();
    };

    this.listeners.loadeddata = () => {
      callbacks.onStatusUpdate('Video data loaded');
    };

    this.listeners.canplay = async () => {
      callbacks.onReady('Video ready to play');

      if (this.videoElement) {
        try {
          const autoplayResult = await this.attemptAutoplay(this.videoElement);
          if (autoplayResult.success) {
            if (autoplayResult.muted) {
              callbacks.onStatusUpdate('MP4 playing (muted due to autoplay policy)');
            } else {
              callbacks.onStatusUpdate('MP4 playing with audio');
            }
          } else {
            callbacks.onAutoplayBlocked?.('Click play button to start MP4 video');
          }
        } catch (error) {
          console.log('MP4 autoplay attempt completed with restrictions');
        }
      }
    };

    this.listeners.canplaythrough = () => {
      callbacks.onReady('Video can play through');
    };

    this.listeners.progress = () => {
      this.updateBufferedProgress();
    };

    this.listeners.error = (event) => {
      console.error('MP4 video error:', event);
      callbacks.onError('Error loading video');
      this.handleVideoError();
    };

    this.listeners.stalled = () => {
      callbacks.onStatusUpdate('Video loading stalled');
    };

    this.listeners.play = () => {
      console.log('Video started playing');
    };

    this.listeners.pause = () => {
      console.log('Video paused');
    };

    this.listeners.ended = () => {
      console.log('Video playback ended');
    };

    Object.entries(this.listeners).forEach(([event, listener]) => {
      this.videoElement?.addEventListener(event, listener);
    });
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
        // Both attempts failed
        console.log('MP4 autoplay blocked by browser policy');
        return {
          success: false,
          muted: false,
          error: 'Autoplay blocked by browser policy'
        };
      }
    }
  }

  private removeEventListeners(): void {
    if (!this.videoElement) return;

    Object.entries(this.listeners).forEach(([event, listener]) => {
      this.videoElement?.removeEventListener(event, listener);
    });

    this.listeners = {};
  }

  private logVideoInfo(): void {
    if (!this.videoElement) return;

    console.log('Video info:', {
      duration: this.videoElement.duration,
      videoWidth: this.videoElement.videoWidth,
      videoHeight: this.videoElement.videoHeight,
      readyState: this.videoElement.readyState
    });
  }

  private updateBufferedProgress(): void {
    if (!this.videoElement) return;

    const buffered = this.videoElement.buffered;
    if (buffered.length > 0) {
      const bufferedEnd = buffered.end(buffered.length - 1);
      const duration = this.videoElement.duration;
      if (duration > 0) {
        const percent = Math.round((bufferedEnd / duration) * 100);
        console.log(`Buffered: ${percent}%`);
      }
    }
  }

  private handleVideoError(): void {
    if (!this.videoElement) return;

    const error = this.videoElement.error;
    if (error) {
      let errorMessage = 'Unknown video error';

      switch (error.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          errorMessage = 'Video loading aborted';
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          errorMessage = 'Network error while loading video';
          break;
        case MediaError.MEDIA_ERR_DECODE:
          errorMessage = 'Video decode error';
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = 'Video format not supported';
          break;
      }

      console.error('Video error details:', errorMessage, error);
    }
  }

  destroy(): void {
    this.removeEventListeners();

    if (this.videoElement) {
      this.videoElement.src = '';
      this.videoElement.load();
      this.videoElement = null;
    }

    console.log('MP4 player destroyed');
  }

  getVideoElement(): HTMLVideoElement | null {
    return this.videoElement;
  }

  static canPlayType(type: string): boolean {
    const video = document.createElement('video');
    return video.canPlayType(type) !== '';
  }

  static getSupportedFormats(): string[] {
    const video = document.createElement('video');
    const formats = [
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/avi',
      'video/mov'
    ];

    return formats.filter(format => video.canPlayType(format) !== '');
  }
}