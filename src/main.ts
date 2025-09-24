import './style.css'

const videoSelect = document.getElementById('videoSelect') as HTMLSelectElement;
const videoPlayer = document.getElementById('videoPlayer') as HTMLVideoElement;

if (videoSelect && videoPlayer) {
  videoSelect.addEventListener('change', (event) => {
    const target = event.target as HTMLSelectElement;
    const selectedVideo = target.value;

    if (selectedVideo) {
      videoPlayer.src = selectedVideo;
      videoPlayer.load();
    } else {
      videoPlayer.removeAttribute('src');
      videoPlayer.load();
    }
  });
}