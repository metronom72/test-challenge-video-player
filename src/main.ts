import { MediaPlayer } from 'dashjs';

const videoSelect = document.getElementById('videoSelect') as HTMLSelectElement;
const videoPlayer = document.getElementById('videoPlayer') as HTMLVideoElement;
const videoStatus = document.getElementById('videoStatus') as HTMLParagraphElement;

let dashPlayer: any = null;

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

function destroyCurrentPlayer() {
  if (dashPlayer) {
    dashPlayer.destroy();
    dashPlayer = null;
  }
}

if (videoSelect && videoPlayer) {
  videoSelect.addEventListener('change', (event) => {
    const target = event.target as HTMLSelectElement;
    const selectedVideo = target.value;

    destroyCurrentPlayer();
    videoPlayer.src = '';

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
              console.log('Failed to load DASH stream. Please check your browser compatibility.');
            });

            break;

          case 'hls':
            videoPlayer.src = selectedVideo;
            videoPlayer.load();
            updateStatus(`HLS stream loaded: ${selectedOption.text} (native playback)`);
            console.log(`HLS loaded: ${selectedOption.text}`);
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
          console.log('Failed to load video. Your browser may not support this format.');
        });

      } catch (error) {
        console.error('Player initialization error:', error);
        updateStatus('Error initializing player');
        console.log('Failed to initialize video player.');
      }

    } else {
      updateStatus('Select a video to start playing');
    }
  });
}