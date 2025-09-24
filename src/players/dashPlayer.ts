import { MediaPlayer } from 'dashjs';
import { type BasePlayer, type PlayerCallbacks } from '../types.ts';

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

      callbacks.onStatusUpdate('DASH player initialized');

    } catch (error) {
      console.error('DASH player initialization failed:', error);
      callbacks.onError('Failed to initialize DASH player');
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