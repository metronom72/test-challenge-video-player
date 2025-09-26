import type { BasePlayer, PlayerCallbacks, AutoplayResult } from '../types';

export class DashPlayer implements BasePlayer {
  private player: any = null;

  static async new(
    videoElement: HTMLVideoElement,
    url: string,
    callbacks: PlayerCallbacks
  ): Promise<DashPlayer> {
    const { MediaPlayer } = await import('dashjs');

    const inst = new DashPlayer();

    try {
      inst.player = MediaPlayer().create();
      inst.player.initialize(videoElement, url, true);

      inst.player.on('streamInitialized', () => {
        callbacks.onReady?.('DASH stream initialized');
        console.log('DASH stream initialized:', url);
      });

      inst.player.on('error', (e: any) => {
        console.error('DASH player error:', e);
        callbacks.onError?.('Failed to load DASH stream');
      });

      inst.player.on('streamInitializing', () => {
        callbacks.onStatusUpdate?.('Initializing DASH stream...');
      });

      inst.player.on('qualityChangeRendered', (e: any) => {
        console.log('DASH quality changed:', e);
      });

      inst.player.on('canPlay', async () => {
        console.log('DASH stream ready for playback');
        try {
          const autoplayResult = await inst.attemptAutoplay(videoElement);
          if (autoplayResult.success) {
            callbacks.onStatusUpdate?.(
              autoplayResult.muted
                ? 'DASH playing (muted due to autoplay policy)'
                : 'DASH playing with audio'
            );
          } else {
            callbacks.onAutoplayBlocked?.('Click play button to start DASH video');
          }
        } catch {
          console.log('DASH autoplay attempt completed with restrictions');
        }
      });

      callbacks.onStatusUpdate?.('DASH player initialized');
      return inst;
    } catch (error) {
      console.error('DASH player initialization failed:', error);
      callbacks.onError?.('Failed to initialize DASH player');
      try {
        inst.destroy();
      } catch {}
      throw error;
    }
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
        console.log('DASH autoplay blocked by browser policy');
        return {
          success: false,
          muted: false,
          error: 'Autoplay blocked by browser policy',
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

  static async isSupported(): Promise<boolean> {
    try {
      await import('dashjs');
      return true;
    } catch {
      return false;
    }
  }
}

export default DashPlayer;
