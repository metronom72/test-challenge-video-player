import { DashPlayer } from './players/dashPlayer';
import { HlsPlayer } from './players/hlsPlayer';
import { Mp4Player } from './players/mp4Player';
import { VideoStateManager } from './videoStateManager';
import {
  type VideoType,
  type PlayerCallbacks,
  type BasePlayer,
  VideoState,
  type VideoStateChangeEvent
} from './types';

const videoSelect = document.getElementById('videoSelect') as HTMLSelectElement;
const videoPlayer = document.getElementById('videoPlayer') as HTMLVideoElement;
const videoStatus = document.getElementById('videoStatus') as HTMLParagraphElement;

let currentPlayer: BasePlayer | null = null;
let videoStateManager: VideoStateManager | null = null;
let hasUserInteracted = false;

function trackUserInteraction() {
  if (!hasUserInteracted) {
    hasUserInteracted = true;
    console.log('User interaction detected');
  }
}

['click', 'touchstart', 'keydown'].forEach(eventType => {
  document.addEventListener(eventType, trackUserInteraction, { once: true, passive: true });
});

function getVideoType(url: string, dataType?: string): VideoType {
  if (dataType) return dataType as VideoType;

  if (url.includes('.mpd')) return 'dash';
  if (url.includes('.m3u8')) return 'hls';
  if (url.includes('.mp4') || url.includes('.webm') || url.includes('.ogg')) return 'mp4';

  return 'unknown';
}

function updateStatus(message: string): void {
  if (videoStatus) {
    videoStatus.textContent = message;
  }
  console.log('Status:', message);
}

function showError(message: string): void {
  updateStatus(`Error: ${message}`);
  console.error('Player Error:', message);
  if (!message.toLowerCase().includes('autoplay')) {
    console.warn(message);
  }
}

function showReady(message: string): void {
  updateStatus(`Ready: ${message}`);
  console.log('Player Ready:', message);
}

function handleAutoplayBlocked(message: string): void {
  updateStatus(message);
  console.log('Autoplay Info:', message);

  if (videoPlayer) {
    showPlayButton();
  }
}

function showPlayButton(): void {
  const existingButton = document.querySelector('.autoplay-button');
  if (existingButton) {
    existingButton.remove();
  }

  const playButton = document.createElement('div');
  playButton.className = 'autoplay-button';
  playButton.innerHTML = `
    <div class="play-overlay">
      <button class="play-btn">
        <svg width="50" height="50" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
        <span>Click to Play</span>
      </button>
    </div>
  `;

  playButton.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.7);
    color: white;
    cursor: pointer;
    z-index: 1000;
  `;

  const playBtnElement = playButton.querySelector('.play-btn') as HTMLButtonElement;
  if (playBtnElement) {
    playBtnElement.style.cssText = `
      background: rgba(255,255,255,0.1);
      border: 2px solid white;
      border-radius: 50px;
      padding: 20px 30px;
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 16px;
      transition: all 0.3s ease;
    `;

    playBtnElement.addEventListener('mouseover', () => {
      playBtnElement.style.background = 'rgba(255,255,255,0.2)';
      playBtnElement.style.transform = 'scale(1.05)';
    });

    playBtnElement.addEventListener('mouseout', () => {
      playBtnElement.style.background = 'rgba(255,255,255,0.1)';
      playBtnElement.style.transform = 'scale(1)';
    });
  }

  const videoContainer = videoPlayer.parentElement;
  if (videoContainer) {
    videoContainer.style.position = 'relative';
    videoContainer.appendChild(playButton);
  }

  playButton.addEventListener('click', async () => {
    try {
      videoPlayer.muted = false;
      await videoPlayer.play();
      updateStatus('Playing with audio');
    } catch (error) {
      try {
        videoPlayer.muted = true;
        await videoPlayer.play();
        updateStatus('Playing (muted)');
      } catch (mutedError) {
        updateStatus('Failed to start playback');
        console.error('Manual play failed:', mutedError);
      }
    }
    playButton.remove();
  });
}

function handleVideoStateChange(event: VideoStateChangeEvent): void {
  const { currentState, previousState: _previousState, transitionDuration: _transitionDuration } = event;

  switch (currentState.state) {
    case VideoState.IDLE:
      updateStatus('No content loaded');
      break;
    case VideoState.LOADING:
      updateStatus('Loading video content...');
      break;
    case VideoState.READY:
      updateStatus('Ready to play');
      break;
    case VideoState.PLAYING:
      updateStatus('Playing');
      const playButton = document.querySelector('.autoplay-button');
      if (playButton) {
        playButton.remove();
      }
      break;
    case VideoState.PAUSED:
      updateStatus('Paused');
      break;
    case VideoState.SEEKING:
      updateStatus(`Seeking to ${currentState.metadata?.currentTime?.toFixed(1)}s`);
      break;
    case VideoState.BUFFERING:
      updateStatus('Buffering...');
      break;
    case VideoState.ENDED:
      updateStatus('Playback ended');
      break;
  }

  if (currentState.state === VideoState.BUFFERING && currentState.metadata?.bufferingDuration) {
    console.log(`Buffering completed in ${currentState.metadata.bufferingDuration}ms`);
  }
}

const playerCallbacks: PlayerCallbacks = {
  onStatusUpdate: updateStatus,
  onError: showError,
  onReady: showReady,
  onAutoplayBlocked: handleAutoplayBlocked
};

function destroyCurrentPlayer(): void {
  if (currentPlayer) {
    currentPlayer.destroy();
    currentPlayer = null;
  }

  if (videoStateManager) {
    videoStateManager.destroy();
    videoStateManager = null;
  }

  const existingButton = document.querySelector('.autoplay-button');
  if (existingButton) {
    existingButton.remove();
  }
}

function initializeVideoStateManager(): void {
  if (videoStateManager) {
    videoStateManager.destroy();
  }

  videoStateManager = new VideoStateManager(videoPlayer);
  videoStateManager.getCurrentState()
  videoStateManager.onStateChange(handleVideoStateChange);

  console.log('Video state manager initialized');
}

function createPlayer(videoType: VideoType, videoPlayer: HTMLVideoElement, selectedVideo: string, playerCallbacks: PlayerCallbacks): BasePlayer | null {
  switch (videoType) {
    case 'dash':
      if (DashPlayer.isSupported()) {
        return new DashPlayer(videoPlayer, selectedVideo, playerCallbacks);
      } else {
        showError('DASH is not supported in this browser');
        return null;
      }

    case 'hls':
      return new HlsPlayer(videoPlayer, selectedVideo, playerCallbacks);

    case 'mp4':
      return new Mp4Player(videoPlayer, selectedVideo, playerCallbacks);

    default:
      showError(`Unknown video type: ${videoType}`);
      return null;
  }
}

function logBrowserCapabilities(): void {
  console.log('=== Browser Video Capabilities ===');
  console.log('DASH supported:', DashPlayer.isSupported());
  console.log('HLS support:', HlsPlayer.isSupported());
  console.log('MP4 formats:', Mp4Player.getSupportedFormats());

  console.log('=== Autoplay Policy Information ===');
  console.log('User has interacted with page:', hasUserInteracted);

  if ('userActivation' in navigator) {
    console.log('User activation (modern API):', {
      hasBeenActive: (navigator as any).userActivation.hasBeenActive,
      isActive: (navigator as any).userActivation.isActive
    });
  }

  const testVideo = document.createElement('video');
  testVideo.muted = true;
  testVideo.playsInline = true;
  const canAutoplay = testVideo.play();
  if (canAutoplay instanceof Promise) {
    canAutoplay.then(() => {
      console.log('Muted autoplay: likely supported');
      testVideo.pause();
    }).catch(() => {
      console.log('Muted autoplay: likely blocked');
    });
  }

  console.log('=====================================');
}

function initializeVideoPlayer(): void {
  if (!videoSelect || !videoPlayer) {
    console.error('Required DOM elements not found');
    return;
  }

  videoPlayer.playsInline = true;
  videoPlayer.preload = 'metadata';

  initializeVideoStateManager();

  logBrowserCapabilities();

  videoSelect.addEventListener('change', handleVideoSelection);

  updateStatus('Select a video to start playing');

  console.log('Video player initialized successfully');
}

function handleVideoSelection(event: Event): void {
  const target = event.target as HTMLSelectElement;
  const selectedVideo = target.value;

  destroyCurrentPlayer();

  if (!selectedVideo) {
    initializeVideoStateManager();
    updateStatus('Select a video to start playing');
    return;
  }

  initializeVideoStateManager();

  const selectedOption = target.options[target.selectedIndex];
  const videoType = getVideoType(selectedVideo, selectedOption.dataset.type);
  const videoTitle = selectedOption.text;

  updateStatus(`Initializing ${videoTitle}...`);
  console.log(`Selected video: ${videoTitle} (${videoType})`);
  console.log(`Video URL: ${selectedVideo}`);

  try {
    currentPlayer = createPlayer(videoType, videoPlayer, selectedVideo, playerCallbacks);

    if (!currentPlayer) {
      return;
    }
  } catch (error) {
    console.error('Failed to initialize player:', error);
    showError('Failed to initialize video player');
    destroyCurrentPlayer();
  }
}

// Optional
function addKeyboardShortcuts(): void {
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
      event.preventDefault();
      if (videoStateManager) {
        console.log('Video State Debug Info:', videoStateManager.getDebugInfo());
      }
    }

    if ((event.ctrlKey || event.metaKey) && event.key === 'r' && videoSelect.value) {
      event.preventDefault();
      console.log('Restarting video...');
      videoPlayer.currentTime = 0;
      videoPlayer.play().catch(() => {
        console.log('Play failed, user interaction may be required');
      });
    }
  });

  console.log('Keyboard shortcuts enabled:');
  console.log('  Ctrl/Cmd + D: Show debug info');
  console.log('  Ctrl/Cmd + R: Restart current video');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeVideoPlayer();
    addKeyboardShortcuts();
  });
} else {
  initializeVideoPlayer();
  addKeyboardShortcuts();
}

window.addEventListener('beforeunload', () => {
  destroyCurrentPlayer();
});