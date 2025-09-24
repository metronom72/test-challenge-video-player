import { DashPlayer } from './players/dashPlayer';
import { HlsPlayer } from './players/hlsPlayer';
import { Mp4Player } from './players/mp4Player';
import { type VideoType, type PlayerCallbacks, type BasePlayer } from './types';

const videoSelect = document.getElementById('videoSelect') as HTMLSelectElement;
const videoPlayer = document.getElementById('videoPlayer') as HTMLVideoElement;
const videoStatus = document.getElementById('videoStatus') as HTMLParagraphElement;

let currentPlayer: BasePlayer | null = null;

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
  alert(message);
}

function showReady(message: string): void {
  updateStatus(`Ready: ${message}`);
  console.log('Player Ready:', message);
}

const playerCallbacks: PlayerCallbacks = {
  onStatusUpdate: updateStatus,
  onError: showError,
  onReady: showReady
};

function destroyCurrentPlayer(): void {
  if (currentPlayer) {
    currentPlayer.destroy();
    currentPlayer = null;
  }
}

function createPlayer(videoType: VideoType): BasePlayer | null {
  switch (videoType) {
    case 'dash':
      if (DashPlayer.isSupported()) {
        return new DashPlayer();
      } else {
        showError('DASH is not supported in this browser');
        return null;
      }

    case 'hls':
      return new HlsPlayer();

    case 'mp4':
      return new Mp4Player();

    default:
      showError(`Unknown video type: ${videoType}`);
      return null;
  }
}

function logBrowserCapabilities(): void {
  console.log('=== Browser Video Capabilities ===');
  console.log('DASH supported:', DashPlayer.isSupported());
  console.log('HLS support:', HlsPlayer.checkSupport());
  console.log('MP4 formats:', Mp4Player.getSupportedFormats());
  console.log('=====================================');
}

function initializeVideoPlayer(): void {
  if (!videoSelect || !videoPlayer) {
    console.error('Required DOM elements not found');
    return;
  }

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
    updateStatus('Select a video to start playing');
    return;
  }

  const selectedOption = target.options[target.selectedIndex];
  const videoType = getVideoType(selectedVideo, selectedOption.dataset.type);
  const videoTitle = selectedOption.text;

  updateStatus(`Initializing ${videoTitle}...`);
  console.log(`Selected video: ${videoTitle} (${videoType})`);

  try {
    currentPlayer = createPlayer(videoType);

    if (!currentPlayer) {
      return;
    }

    currentPlayer.initialize(videoPlayer, selectedVideo, playerCallbacks);

  } catch (error) {
    console.error('Failed to initialize player:', error);
    showError('Failed to initialize video player');
    destroyCurrentPlayer();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeVideoPlayer);
} else {
  initializeVideoPlayer();
}

window.addEventListener('beforeunload', () => {
  destroyCurrentPlayer();
});