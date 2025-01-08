// ============ 1) 左侧边栏收起/展开逻辑 ============
const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('sidebar-toggle');
let sidebarCollapsed = false;
toggleBtn.addEventListener('click', () => {
sidebarCollapsed = !sidebarCollapsed;
if (sidebarCollapsed) {
    sidebar.classList.add('collapsed');
    toggleBtn.textContent = '展开';
} else {
    sidebar.classList.remove('collapsed');
    toggleBtn.textContent = '收起';
}
});

// (示例) 加载直播间列表
const roomListEl = document.getElementById('room-list');
const mockRooms = [
{ id: "123456", name: "熊熊的直播间", thumb: "/thumbs/123456.jpg" },
{ id: "abcdef", name: "小坏喵直播间", thumb: "/thumbs/abcdef.jpg" },
{ id: "abcdef", name: "小坏喵直播间", thumb: "/thumbs/123456.jpg" },
{ id: "abcdef", name: "小坏喵直播间", thumb: "/thumbs/abcdef.jpg" },
{ id: "abcdef", name: "小坏喵直播间", thumb: "/thumbs/123456.jpg" },
{ id: "abcdef", name: "小坏喵直播间", thumb: "/thumbs/abcdef.jpg" },
{ id: "abcdef", name: "小坏喵直播间", thumb: "/thumbs/123456.jpg" },
{ id: "abcdef", name: "小坏喵直播间", thumb: "/thumbs/abcdef.jpg" },
{ id: "abcdef", name: "小坏喵直播间", thumb: "/thumbs/123456.jpg" },
{ id: "abcdef", name: "小坏喵直播间", thumb: "/thumbs/abcdef.jpg" },
{ id: "abcdef", name: "小坏喵直播间", thumb: "/thumbs/123456.jpg" },
{ id: "abcdef", name: "小坏喵直播间", thumb: "/thumbs/abcdef.jpg" },
{ id: "abcdef", name: "小坏喵直播间", thumb: "/thumbs/123456.jpg" },
{ id: "abcdef", name: "小坏喵直播间", thumb: "/thumbs/abcdef.jpg" },
{ id: "abcdef", name: "小坏喵直播间", thumb: "/thumbs/123456.jpg" },
{ id: "abcdef", name: "小坏喵直播间", thumb: "/thumbs/abcdef.jpg" },
{ id: "abcdef", name: "小坏喵直播间", thumb: "/thumbs/123456.jpg" },
{ id: "abcdef", name: "小坏喵直播间", thumb: "/thumbs/abcdef.jpg" },
{ id: "abcdef", name: "小坏喵直播间", thumb: "/thumbs/123456.jpg" },

];
mockRooms.forEach(room => {
const div = document.createElement('div');
div.className = 'room-item';
div.dataset.roomid = room.id;
div.innerHTML = `
    <img src="${room.thumb}" alt="room screenshot">
    <span>${room.name}</span>
`;
div.addEventListener('click', () => {
    switchRoom(room.id, room.name);
});
roomListEl.appendChild(div);
});
function switchRoom(roomId, roomName) {
console.log("Switch to room:", roomId);
document.getElementById('current-room-title').textContent = `${roomName}`;
// TODO: 更新 video.src / HLS
}

// ============ 2) 用户名下拉菜单: Hover出现 + 点击固定/解锁 ============
const usernameWrapper = document.getElementById('username-wrapper');
const userMenu = document.getElementById('user-menu');

// 用一个布尔值表示是否已“固定” (pinned)
let pinned = false;

usernameWrapper.addEventListener('click', (e) => {
e.stopPropagation(); // 防止冒泡给 body
pinned = !pinned;
if (pinned) {
    // 加上 pinned 类, 强制显示
    userMenu.classList.add('pinned');
} else {
    userMenu.classList.remove('pinned');
}
});

// 如果用户点击页面其他地方, 但 pinned=true时不收起; pinned=false时则照常关掉
document.body.addEventListener('click', () => {
// 当 pinned=false 时, 如果鼠标离开, user-menu 就会通过 :hover 机制隐藏
// 不需要显式隐藏; 但若 pinned=false 且当前没有 hover, 就自动隐藏
// 这里主要是当 pinned=false, 强制
if (!pinned) {
    userMenu.classList.remove('pinned');
}
});

fetch('/api/fullname')
  .then(response => response.json())
  .then(data => {
    if (data.fullname) {
      document.getElementById('username-display').textContent = data.fullname;
    } else {
      document.getElementById('username-display').textContent = '未登录';
    }
  })
  .catch(err => {
    console.error('获取用户名失败:', err);
    document.getElementById('username-display').textContent = '错误';
  });

// // ============ 3) 示例: 设置用户名(可后端获取) ============
// document.getElementById('username-display').textContent = '熊喵';

// ============ 4) 其余: 视频播放/WebSocket/弹幕等, 保持你原有逻辑 ============

