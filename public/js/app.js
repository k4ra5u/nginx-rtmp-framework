const WebSocket = require('ws');
const express = require('express');

const app = express();
const port = 3001;

// 创建 WebSocket 服务器
const wss = new WebSocket.Server({ port: 3001 });

// 处理 WebSocket 连接
wss.on('connection', (ws) => {
    console.log('User connected');

    // 监听消息并广播
    ws.on('message', (message) => {
        console.log('Received message:', message);
        // 广播消息给所有客户端
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });

    // 处理连接关闭
    ws.on('close', () => {
        console.log('User disconnected');
    });
});

// 启动 Express 应用
app.use(express.static('public'));
app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});

