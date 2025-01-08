if (Hls.isSupported()) {
    var hls = new Hls();
    hls.loadSource(videoSrc);
    hls.attachMedia(video);
} else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = videoSrc;
} else {
    alert('Your browser does not support HLS streaming!');
}

