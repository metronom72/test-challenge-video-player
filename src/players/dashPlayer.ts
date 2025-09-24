import { MediaPlayer } from 'dashjs';
import { type BasePlayer, type PlayerCallbacks, type AutoplayResult } from '../types';

export class DashPlayer implements BasePlayer {
  private player: any = null;

  initialize(videoElement: HTMLVideoElement, url: string, callbacks: PlayerCallbacks): void {
    try {
      this.player = MediaPlayer().create();
      this.player.initialize(videoElement, url, true);

      this.player.on('streamInitialized', () => {
        callbacks.onReady('DASH stream initialized');
        console.log('DASH stream initialized:', url);
      });

      this.player.on('error', (e: any) => {
        console.error('DASH player error:', e);
        callbacks.onError('Failed to load DASH stream');
      });

      this.player.on('streamInitializing', () => {
        callbacks.onStatusUpdate('Initializing DASH stream...');
      });

      this.player.on('qualityChangeRendered', (e: any) => {
        console.log('DASH quality changed:', e);
      });

      this.player.on('canPlay', async () => {
        console.log('DASH stream ready for playback');
        try {
          const autoplayResult = await this.attemptAutoplay(videoElement);
          if (autoplayResult.success) {
            if (autoplayResult.muted) {
              callbacks.onStatusUpdate('DASH playing (muted due to autoplay policy)');
            } else {
              callbacks.onStatusUpdate('DASH playing with audio');
            }
          } else {
            callbacks.onAutoplayBlocked?.('Click play button to start DASH video');
          }
        } catch (error) {
          console.log('DASH autoplay attempt completed with restrictions');
        }
      });

      callbacks.onStatusUpdate('DASH player initialized');

    } catch (error) {
      console.error('DASH player initialization failed:', error);
      callbacks.onError('Failed to initialize DASH player');
    }
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
        console.log('DASH autoplay blocked by browser policy');
        return {
          success: false,
          muted: false,
          error: 'Autoplay blocked by browser policy'
        };
      }
    }
  }

  destroy(): void {
    if (this.player) {
      try {
        this.player.destroy();
        this.player = null;
        console.log('DASH player destroyed');
      } catch (error) {
        console.error('Error destroying DASH player:', error);
      }
    }
  }

  getPlayer(): any {
    return this.player;
  }

  static isSupported(): boolean {
    try {
      return !!MediaPlayer;
    } catch {
      return false;
    }
  }
}