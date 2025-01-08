// ================ 视频播放部分（如需HLS） ================
let ws = null;
const video = document.getElementById('video');
video.removeAttribute('controls'); 
const videoSrc = 'hls/123456.m3u8';

if (window.Hls && Hls.isSupported()) {
    const hls = new Hls();
    hls.loadSource(videoSrc);
    hls.attachMedia(video);
} else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = videoSrc;
} else {
    console.warn('HLS not supported in this browser.');
}
// 尝试自动播放
video.play().catch(err => {
    console.log('Autoplay failed:', err);
    // 可以在这里做提示或其他fallback处理
});


// ================ WebSocket ================
// 注意替换为实际的 wss://server.k4ra5u.xyz:18443/ws
// const ws = new WebSocket("wss://server.k4ra5u.xyz:18443/ws");
// let ws = connect()
connect();




    // ========== 第一行(进度 + 时间)默认隐藏，鼠标控制 ==========
    const progressRow = document.getElementById('progress-row');
    const buttonsRow = document.getElementById('buttons-row');
    let hideProgressTimer = null;

    // 当鼠标移到 buttons-row 时 => 显示 progressRow
    buttonsRow.addEventListener('mouseenter', () => {
      showProgressRow();
    });
    // 当鼠标离开 buttonsRow => 5秒后隐藏progressRow
    buttonsRow.addEventListener('mouseleave', () => {
      hideProgressAfterDelay(5000);
    });
    // 如果鼠标又移入 => 取消隐藏
    progressRow.addEventListener('mouseenter', () => {
      clearTimeout(hideProgressTimer);
    });
    // 离开progressRow也同理 => 5秒后隐藏
    progressRow.addEventListener('mouseleave', () => {
      hideProgressAfterDelay(5000);
    });

    function showProgressRow() {
      progressRow.style.display = 'flex';
      clearTimeout(hideProgressTimer);
    }
    function hideProgressAfterDelay(ms) {
      clearTimeout(hideProgressTimer);
      hideProgressTimer = setTimeout(() => {
        progressRow.style.display = 'none';
      }, ms);
    }
    // =============== 播放/暂停 按钮 ===============
    const btnPlayPause = document.getElementById('btn-playpause');
    video.addEventListener('play', () => {
      btnPlayPause.textContent = '暂停';
    });
    video.addEventListener('pause', () => {
      btnPlayPause.textContent = '播放';
    });
    btnPlayPause.addEventListener('click', () => {
      if (video.paused) {
        video.play();
      } else {
        video.pause();
      }
    });
    // ============= 时间显示 + 进度条 =============
    const timeDisplay  = document.getElementById('time-display');
    const progressBar  = document.getElementById('progress-bar');
    const progressFill = document.getElementById('progress-fill');
    const progressHandle = document.getElementById('progress-handle');
    
    // 更新进度及时间
    video.addEventListener('timeupdate', updateProgress);
    video.addEventListener('loadedmetadata', updateProgress);

    function updateProgress() {
        // 显示当前时长 / 总时长
        const current = formatTime(video.currentTime);
        const total   = formatTime(video.duration);
        timeDisplay.textContent = `${current} / ${total}`;

        // 计算进度百分比
        const percent = (video.currentTime / video.duration) * 100;
        progressFill.style.width = `${percent}%`;
        progressHandle.style.left = `${percent}%`;
    }

    // 进度条拖动
    let isDragging = false;
    progressBar.addEventListener('mousedown', (e) => {
        isDragging = true;
        seek(e);
    });
    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
        seek(e);
        }
    });
    document.addEventListener('mouseup', () => {
        isDragging = false;
    });

    // seek 函数
    function seek(e) {
        const rect = progressBar.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const ratio = x / rect.width;
        const clampedRatio = Math.max(0, Math.min(1, ratio));
        video.currentTime = clampedRatio * video.duration;
    }

    function formatTime(sec) {
        if (!sec || isNaN(sec)) return "00:00";
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }
    
    const commentInput = document.getElementById('comment-input');
    // 如果你想保留按钮
    const sendBtn = document.getElementById('btn-send');

    // 给输入框加一个 keydown 监听器
    commentInput.addEventListener('keydown', (e) => {
    // 当按下回车(Enter)键
    if (e.key === 'Enter') {
        // 阻止默认行为(可选，如果想避免在 <form> 中提交刷新页面)
        e.preventDefault();
        // 触发发送逻辑
        sendComment();
    }
    });

    // 如果保留按钮，也可以用来发送
    if (sendBtn) {
    sendBtn.addEventListener('click', () => {
        sendComment();
    });
    }



    // ========== 静音 / 取消静音 + 音量滑块 ==========
    const btnMute = document.getElementById('btn-mute');
    const volumeRange = document.getElementById('volume-range');
    let savedVolume = 1; // 记录用户上一次非静音时的音量

    // 当视频 metadata 就绪后，根据 video.muted 初始化 slider
    video.addEventListener('loadedmetadata', () => {
      if (video.muted) {
        volumeRange.value = 0;
        btnMute.textContent = '取消静音';
      } else {
        volumeRange.value = video.volume;
        btnMute.textContent = '静音';
      }
    });

    // 点击静音按钮
    btnMute.addEventListener('click', () => {
      if (video.muted) {
        // 取消静音 => volumeRange 移到最右(1.0)
        video.muted = false;
        video.volume = 1.0;
        volumeRange.value = 1.0;
        btnMute.textContent = '静音';
      } else {
        // 静音 => slider到左(0)
        video.muted = true;
        volumeRange.value = 0;
        btnMute.textContent = '取消静音';
      }
    });

    // 拖动滑块
    volumeRange.addEventListener('input', () => {
      const vol = parseFloat(volumeRange.value);
      video.volume = vol;
      if (vol === 0) {
        video.muted = true;
        btnMute.textContent = '取消静音';
      } else {
        video.muted = false;
        btnMute.textContent = '静音';
      }
    });


    // =============== 全屏(可再点退出) ===============
    const btnFullscreen = document.getElementById('btn-fullscreen');
    btnFullscreen.addEventListener('click', toggleFullscreen);

    // 切换全屏
    function toggleFullscreen() {
      const container = document.getElementById('video-container');
      if (!document.fullscreenElement) {
        // 进入全屏
        if (container.requestFullscreen) {
          container.requestFullscreen();
        }
      } else {
        // 退出全屏
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    }

    // 监听全屏变化, 改变按钮文字
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement) {
        btnFullscreen.textContent = '全屏';
      } else {
        btnFullscreen.textContent = '退出全屏';
      }
    });

// ================ 首次加载时获取历史评论 ================
fetch('/comments')
    .then(res => res.json())
    .then(history => {
    // 这里获取到的是按 time 倒序或顺序
    // 如果后端返回倒序，就直接按它的顺序插入
    // 否则需要自己 sort 一下
    // 在本示例中，server.js 已经做了 time 倒序，所以可直接渲染
    history.forEach(commentObj => {
        appendCommentItem(commentObj);
    });
    })
    .catch(err => console.error('Fetch comments error:', err));

function connect() {
    ws = new WebSocket("wss://server.k4ra5u.xyz:18443/ws");  // 直接赋值给外层 ws

    ws.onopen = () => {
        console.log("WebSocket open");
    };

    ws.onmessage = (event) => {
        // ...
        let msg;
        try {
        msg = JSON.parse(event.data); 
        // { type: 'comment', data: { text: 'xxx', time: 1681234567890 }}
        } catch(e) {
        console.error('WS parse error:', e);
        return;
        }

        if (msg.type === 'comment') {
        // 1) 让它飘弹幕
        addDanmaku(`[${msg.data.user}] ${msg.data.text}`);
        // 2) 加到评论列表顶部
        prependCommentItem(msg.data);
        playMsgAudio();
        }
    };

    ws.onerror = (err) => {
        console.error("WebSocket error:", err);
    };

    ws.onclose = (e) => {
        console.warn("WebSocket closed:", e.reason);
        setTimeout(() => connect(), 2000); // 2秒后重连
    };
}

// 发送逻辑函数
function sendComment() {
const text = commentInput.value.trim();
if (text) {
    // 发送逻辑示例
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(text);
    } else {
        console.warn("Cannot send, ws not open:", msg);
    }
    commentInput.value = '';
}
}



// ================ WebSocket 收到新评论 ================

// ================ 弹幕动画逻辑 ================
const PIXELS_PER_SECOND = 100;

function addDanmaku(commentText) {
    const container = document.getElementById('danmaku-container');
    const danmaku = document.createElement('div');
    danmaku.className = 'danmaku';
    danmaku.textContent = commentText;

    // 先隐藏
    danmaku.style.visibility = 'hidden';
    container.appendChild(danmaku);

    // 测量宽度、容器宽度
    const textWidth = danmaku.offsetWidth;
    const containerWidth = container.offsetWidth;

    // 初始在容器右外侧
    const startX = containerWidth;
    danmaku.style.transform = `translateX(${startX}px)`;

    // 随机纵向位置
    const maxTop = container.offsetHeight - danmaku.offsetHeight;
    danmaku.style.top = Math.random() * maxTop + 'px';

    // 显示
    danmaku.style.visibility = 'visible';

    // 总距离 = startX + textWidth
    const totalDistance = startX + textWidth;
    const durationSec = totalDistance / PIXELS_PER_SECOND;
    danmaku.style.transitionDuration = durationSec + 's';

    // 下一帧让它飞到左外侧
    requestAnimationFrame(() => {
    danmaku.style.transform = `translateX(-${textWidth}px)`;
    });

    // transition结束后移除
    danmaku.addEventListener('transitionend', () => {
    container.removeChild(danmaku);
    });
}

// ================ 评论列表渲染 ================
function appendCommentItem({ text, user, time }) {
    // 将新评论加在列表后面（如果你想最新在上方，可以用 prepend）
    const list = document.getElementById('comment-list');
    const div = document.createElement('div');
    div.className = 'comment-item';

    // 格式化时间
    const dateStr = new Date(time).toLocaleString();

    div.innerHTML = `
    <strong>${escapeHtml(user)}</strong>: 
    <span class="text">${escapeHtml(text)}</span>
    <span class="time">${dateStr}</span>
`;
    list.appendChild(div);
}

// 若想把最新评论放在顶部，用此方法
function prependCommentItem({ text, user, time }) {
const list = document.getElementById('comment-list');
const div = document.createElement('div');
div.className = 'comment-item';

const dateStr = new Date(time).toLocaleString();
// 这里把 user 放到前面
div.innerHTML = `
    <strong>${escapeHtml(user)}</strong>: 
    <span class="text">${escapeHtml(text)}</span>
    <span class="time">${dateStr}</span>
`;

if (list.firstChild) {
    list.insertBefore(div, list.firstChild);
} else {
    list.appendChild(div);
}
}

// 防止XSS的简易转义
function escapeHtml(str) {
    return str.replace(/[<>&"]/g, (c) => {
    switch(c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '"': return '&quot;';
    }
    });
}
// 播放提示音
function playMsgAudio() {
const audioEl = document.getElementById('msg-audio');
if (!audioEl) return;

// 尝试播放
audioEl.play()
    .then(() => {
    console.log('Sound played successfully');
    })
    .catch(err => {
    console.warn('Sound play blocked:', err);
    // 可能因为浏览器策略阻止了自动播放
    });
}
