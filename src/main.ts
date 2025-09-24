import { MediaPlayer } from 'dashjs';
import Hls from 'hls.js';

const videoSelect = document.getElementById('videoSelect') as HTMLSelectElement;
const videoPlayer = document.getElementById('videoPlayer') as HTMLVideoElement;
const videoStatus = document.getElementById('videoStatus') as HTMLParagraphElement;

let dashPlayer: any = null;
let hlsPlayer: Hls | null = null;

function getVideoType(url: string, dataType?: string): string {
  if (dataType) return dataType;

  if (url.includes('.mpd')) return 'dash';
  if (url.includes('.m3u8')) return 'hls';
  if (url.includes('.mp4')) return 'mp4';

  return 'unknown';
}

function updateStatus(message: string) {
  if (videoStatus) {
    videoStatus.textContent = message;
  }
}

function destroyCurrentPlayers() {
  if (dashPlayer) {
    dashPlayer.destroy();
    dashPlayer = null;
  }

  if (hlsPlayer) {
    hlsPlayer.destroy();
    hlsPlayer = null;
  }

  videoPlayer.src = '';
}

function checkBrowserSupport() {
  return {
    hls: Hls.isSupported(),
    nativeHls: videoPlayer.canPlayType('application/vnd.apple.mpegurl') !== ''
  };
}

if (videoSelect && videoPlayer) {
  const browserSupport = checkBrowserSupport();
  console.log('Browser support:', browserSupport);

  videoSelect.addEventListener('change', (event) => {
    const target = event.target as HTMLSelectElement;
    const selectedVideo = target.value;

    destroyCurrentPlayers();

    if (selectedVideo) {
      const selectedOption = target.options[target.selectedIndex];
      const videoType = getVideoType(selectedVideo, selectedOption.dataset.type);

      updateStatus(`Loading ${selectedOption.text}...`);

      try {
        switch (videoType) {
          case 'dash':
            dashPlayer = MediaPlayer().create();
            dashPlayer.initialize(videoPlayer, selectedVideo, true);

            dashPlayer.on('streamInitialized', () => {
              updateStatus(`DASH stream loaded: ${selectedOption.text}`);
              console.log(`DASH stream initialized: ${selectedOption.text}`);
            });

            dashPlayer.on('error', (e: any) => {
              console.error('DASH player error:', e);
              updateStatus('Error loading DASH stream');
              console.error('Failed to load DASH stream. Please check your browser compatibility.');
            });

            break;

          case 'hls':
            if (browserSupport.nativeHls) {
              videoPlayer.src = selectedVideo;
              videoPlayer.load();
              updateStatus(`HLS stream loaded: ${selectedOption.text} (native support)`);
              console.log(`HLS loaded natively: ${selectedOption.text}`);
            } else if (browserSupport.hls) {
              hlsPlayer = new Hls({
                debug: false,
                enableWorker: true
              });

              hlsPlayer.loadSource(selectedVideo);
              hlsPlayer.attachMedia(videoPlayer);

              hlsPlayer.on(Hls.Events.MANIFEST_PARSED, () => {
                updateStatus(`HLS stream loaded: ${selectedOption.text} (hls.js)`);
                console.log(`HLS manifest parsed: ${selectedOption.text}`);
              });

              hlsPlayer.on(Hls.Events.ERROR, (event, data) => {
                console.error('HLS error:', event, data);

                if (data.fatal) {
                  switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                      updateStatus('HLS network error');
                      console.log('Trying to recover from network error');
                      hlsPlayer?.startLoad();
                      break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                      updateStatus('HLS media error');
                      console.log('Trying to recover from media error');
                      hlsPlayer?.recoverMediaError();
                      break;
                    default:
                      updateStatus('Fatal HLS error');
                      hlsPlayer?.destroy();
                      hlsPlayer = null;
                      console.error('Fatal HLS error. Cannot recover.');
                      break;
                  }
                }
              });

            } else {
              updateStatus('HLS not supported in this browser');
              console.error('HLS streams are not supported in your browser.');
            }

            break;

          case 'mp4':
          default:
            videoPlayer.src = selectedVideo;
            videoPlayer.load();
            updateStatus(`Video loaded: ${selectedOption.text}`);
            console.log(`MP4 loaded: ${selectedOption.text}`);
            break;
        }

        videoPlayer.addEventListener('loadedmetadata', () => {
          updateStatus(`Ready to play: ${selectedOption.text}`);
        });

        videoPlayer.addEventListener('error', (e) => {
          console.error('Video loading error:', e);
          updateStatus('Error loading video');
          console.error('Failed to load video. Your browser may not support this format.');
        });

      } catch (error) {
        console.error('Player initialization error:', error);
        updateStatus('Error initializing player');
        console.error('Failed to initialize video player.');
      }

    } else {
      updateStatus('Select a video to start playing');
    }
  });

  const supportInfo = [];
  if (browserSupport.nativeHls) supportInfo.push('Native HLS');
  if (browserSupport.hls) supportInfo.push('HLS.js');

  if (supportInfo.length > 0) {
    console.log(`HLS support available: ${supportInfo.join(', ')}`);
  } else {
    console.warn('No HLS support detected');
  }
}