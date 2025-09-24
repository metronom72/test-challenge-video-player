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

      const selectedOption = target.options[target.selectedIndex];
      console.log(`Loaded: ${selectedOption.text}`);

      videoPlayer.addEventListener('error', (e) => {
        console.error('Video loading error:', e);
        alert('Failed to load video. Your browser may not support this format.');
      });

    } else {
      videoPlayer.removeAttribute('src');
      videoPlayer.load();
    }
  });
}