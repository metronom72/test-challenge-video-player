import {
  VideoState,
  type VideoStateInfo,
  type VideoStateChangeEvent,
  type VideoStateChangeCallback
} from './types';

export class VideoStateManager {
  private videoElement: HTMLVideoElement;
  private currentStateInfo: VideoStateInfo;
  private previousStateInfo: VideoStateInfo | null = null;
  private eventListeners: Map<string, EventListener> = new Map();
  private stateChangeCallbacks: VideoStateChangeCallback[] = [];
  private bufferingStartTime: number | null = null;
  private bufferingCheckInterval: number | null = null;
  private isDestroyed: boolean = false;

  constructor(videoElement: HTMLVideoElement) {
    this.videoElement = videoElement;
    this.currentStateInfo = this.createStateInfo(VideoState.IDLE);
    this.setupEventListeners();
    this.startBufferingMonitoring();

    console.log('🎬 VideoStateManager initialized');
  }

  public getCurrentState(): VideoState {
    console.log(this.currentStateInfo.state)
    return this.currentStateInfo.state;
  }

  public getCurrentStateInfo(): VideoStateInfo {
    console.log(this.currentStateInfo)
    return { ...this.currentStateInfo };
  }

  public onStateChange(callback: VideoStateChangeCallback): void {
    this.stateChangeCallbacks.push(callback);
  }

  public removeStateChangeCallback(callback: VideoStateChangeCallback): void {
    const index = this.stateChangeCallbacks.indexOf(callback);
    if (index > -1) {
      this.stateChangeCallbacks.splice(index, 1);
    }
  }

  public reset(): void {
    console.log('🔄 VideoStateManager reset');
    this.stopBufferingMonitoring();
    this.bufferingStartTime = null;
    this.previousStateInfo = null;
    this.updateState(VideoState.IDLE);
    this.startBufferingMonitoring();
  }

  public destroy(): void {
    console.log('🗑️ VideoStateManager destroyed');
    this.isDestroyed = true;
    this.removeEventListeners();
    this.stopBufferingMonitoring();
    this.stateChangeCallbacks.length = 0;
  }

  private createStateInfo(state: VideoState, additionalMetadata?: any): VideoStateInfo {
    const baseMetadata = {
      currentTime: this.videoElement.currentTime,
      duration: this.videoElement.duration,
      readyState: this.videoElement.readyState,
      bufferedRanges: this.videoElement.buffered
    };

    return {
      state,
      timestamp: Date.now(),
      previousState: this.currentStateInfo?.state || null,
      metadata: { ...baseMetadata, ...additionalMetadata }
    };
  }

  private updateState(newState: VideoState, additionalMetadata?: any): void {
    if (this.isDestroyed) return;

    const oldState = this.currentStateInfo;
    this.previousStateInfo = oldState;
    this.currentStateInfo = this.createStateInfo(newState, additionalMetadata);

    if (oldState && oldState.state === newState) {
      return;
    }

    const transitionDuration = oldState ?
      this.currentStateInfo.timestamp - oldState.timestamp : 0;

    const event: VideoStateChangeEvent = {
      currentState: this.currentStateInfo,
      previousState: this.previousStateInfo,
      transitionDuration
    };

    this.logStateChange(event);
    this.notifyStateChangeCallbacks(event);
  }

  private logStateChange(event: VideoStateChangeEvent): void {
    const { currentState, previousState, transitionDuration } = event;
    const timeStr = new Date(currentState.timestamp).toLocaleTimeString();

    let logMessage = `🎥 [${timeStr}] State: ${previousState?.state || 'NONE'} → ${currentState.state}`;

    if (transitionDuration > 0) {
      logMessage += ` (${transitionDuration}ms)`;
    }

    switch (currentState.state) {
      case VideoState.BUFFERING:
        if (currentState.metadata?.bufferingDuration !== undefined) {
          logMessage += ` | Duration: ${currentState.metadata.bufferingDuration}ms`;
        }
        break;
      case VideoState.PLAYING:
        logMessage += ` | Time: ${currentState.metadata?.currentTime?.toFixed(2)}s`;
        break;
      case VideoState.READY:
        logMessage += ` | Duration: ${currentState.metadata?.duration?.toFixed(2)}s`;
        break;
      case VideoState.SEEKING:
        logMessage += ` | To: ${currentState.metadata?.currentTime?.toFixed(2)}s`;
        break;
      case VideoState.ENDED:
        logMessage += ` | Total: ${currentState.metadata?.duration?.toFixed(2)}s`;
        break;
    }

    console.log(logMessage);
  }

  private notifyStateChangeCallbacks(event: VideoStateChangeEvent): void {
    this.stateChangeCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in state change callback:', error);
      }
    });
  }

  private setupEventListeners(): void {
    const events = [
      'loadstart',
      'loadedmetadata',
      'loadeddata',
      'canplay',
      'canplaythrough',
      'play',
      'playing',
      'pause',
      'seeking',
      'seeked',
      'ended',
      'waiting',
      'stalled',
      'progress',
      'emptied',
      'error'
    ];

    events.forEach(eventName => {
      const handler = this.createEventHandler(eventName);
      this.eventListeners.set(eventName, handler);
      this.videoElement.addEventListener(eventName, handler);
    });
  }

  private removeEventListeners(): void {
    this.eventListeners.forEach((handler, eventName) => {
      this.videoElement.removeEventListener(eventName, handler);
    });
    this.eventListeners.clear();
  }

  private createEventHandler(eventName: string): EventListener {
    return (event: Event) => {
      if (this.isDestroyed) return;
      this.handleVideoEvent(eventName, event);
    };
  }

  private handleVideoEvent(eventName: string, _: Event): void {
    const video = this.videoElement;

    switch (eventName) {
      case 'emptied':
        this.updateState(VideoState.IDLE);
        this.bufferingStartTime = null;
        break;

      case 'loadstart':
        this.updateState(VideoState.LOADING);
        break;

      case 'loadedmetadata':
      case 'loadeddata':
      case 'canplay':
        if (!video.paused || this.currentStateInfo.state === VideoState.LOADING) {
          this.updateState(VideoState.READY);
        }
        break;

      case 'canplaythrough':
        if (this.currentStateInfo.state !== VideoState.PLAYING &&
          this.currentStateInfo.state !== VideoState.PAUSED) {
          this.updateState(VideoState.READY);
        }
        break;

      case 'play':
        break;

      case 'playing':
        this.stopBufferingTimer();
        this.updateState(VideoState.PLAYING);
        break;

      case 'pause':
        this.stopBufferingTimer();
        this.updateState(VideoState.PAUSED);
        break;

      case 'seeking':
        this.updateState(VideoState.SEEKING);
        break;

      case 'seeked':
        if (!video.paused && video.readyState >= 2) {
          this.updateState(VideoState.PLAYING);
        } else if (video.paused) {
          this.updateState(VideoState.PAUSED);
        } else {
          this.updateState(VideoState.READY);
        }
        break;

      case 'waiting':
      case 'stalled':
        this.startBufferingTimer();
        break;

      case 'ended':
        this.stopBufferingTimer();
        this.updateState(VideoState.ENDED);
        break;

      case 'error':
        this.stopBufferingTimer();
        console.error('🚨 Video error detected:', video.error);
        break;

      case 'progress':
        if (this.currentStateInfo.state === VideoState.BUFFERING) {
          this.checkBufferingState();
        }
        break;
    }
  }

  private startBufferingMonitoring(): void {
    this.bufferingCheckInterval = window.setInterval(() => {
      if (!this.isDestroyed) {
        this.checkBufferingState();
      }
    }, 100);
  }

  private stopBufferingMonitoring(): void {
    if (this.bufferingCheckInterval) {
      clearInterval(this.bufferingCheckInterval);
      this.bufferingCheckInterval = null;
    }
  }

  private startBufferingTimer(): void {
    if (this.bufferingStartTime === null) {
      this.bufferingStartTime = Date.now();
      this.updateState(VideoState.BUFFERING);
    }
  }

  private stopBufferingTimer(): void {
    this.bufferingStartTime = null;
  }

  private checkBufferingState(): void {
    const video = this.videoElement;

    if (this.currentStateInfo.state === VideoState.BUFFERING) {
      const canContinue = this.canPlayContinuously();

      if (canContinue) {
        const bufferingDuration = this.bufferingStartTime ?
          Date.now() - this.bufferingStartTime : 0;

        this.stopBufferingTimer();

        if (!video.paused && video.readyState >= 3) {
          this.updateState(VideoState.PLAYING, { bufferingDuration });
        } else if (video.paused) {
          this.updateState(VideoState.PAUSED, { bufferingDuration });
        } else {
          this.updateState(VideoState.READY, { bufferingDuration });
        }
      }
    }
    else if (this.shouldBeBuffering() && this.bufferingStartTime === null) {
      this.startBufferingTimer();
    }
  }

  private canPlayContinuously(): boolean {
    const video = this.videoElement;

    if (video.buffered.length === 0) return false;

    const currentTime = video.currentTime;
    const buffered = video.buffered;

    for (let i = 0; i < buffered.length; i++) {
      const start = buffered.start(i);
      const end = buffered.end(i);

      if (currentTime >= start && currentTime <= end) {
        const bufferAhead = end - currentTime;
        return bufferAhead > 2.0 || video.readyState >= 3;
      }
    }

    return video.readyState >= 3;
  }

  private shouldBeBuffering(): boolean {
    const video = this.videoElement;

    if (video.paused || video.ended || this.currentStateInfo.state === VideoState.SEEKING) {
      return false;
    }

    return (this.currentStateInfo.state === VideoState.PLAYING) &&
      !this.canPlayContinuously() &&
      video.readyState < 3;
  }

  public getDebugInfo(): object {
    return {
      currentState: this.currentStateInfo.state,
      videoElement: {
        paused: this.videoElement.paused,
        ended: this.videoElement.ended,
        currentTime: this.videoElement.currentTime,
        duration: this.videoElement.duration,
        readyState: this.videoElement.readyState,
        networkState: this.videoElement.networkState,
        buffered: this.getBufferedRanges()
      },
      buffering: {
        isBuffering: this.bufferingStartTime !== null,
        startTime: this.bufferingStartTime,
        duration: this.bufferingStartTime ? Date.now() - this.bufferingStartTime : 0
      }
    };
  }

  private getBufferedRanges(): Array<{start: number, end: number}> {
    const ranges = [];
    const buffered = this.videoElement.buffered;

    for (let i = 0; i < buffered.length; i++) {
      ranges.push({
        start: buffered.start(i),
        end: buffered.end(i)
      });
    }

    return ranges;
  }
}