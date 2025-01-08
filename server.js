const http = require('http');
const express = require('express');
const WebSocket = require('ws');
const cookieParser = require('cookie-parser');
const path = require('path');
const crypto = require('crypto');
// 你也可以用 bcrypt 等更安全的哈希方案
const sqlite3 = require('sqlite3').verbose();
const cookieParserLib = require('cookie');
const fs = require('fs');
const { exec } = require('child_process');

// 假设 hlsPath 和 thumbsPath 如下：
const hlsPath = path.join(__dirname, 'hls');;
const thumbsPath = path.join(__dirname, 'public/thumbs');
// 确保截图目录存在
if (!fs.existsSync(thumbsPath)) {
  fs.mkdirSync(thumbsPath);
}
setInterval(() => {
  // 读取HLS目录下所有文件
  fs.readdir(hlsPath, (err, files) => {
    if (err) {
      console.error('读取HLS目录出错:', err);
      return;
    }
    
    // 筛选出以 .m3u8 结尾的文件
    files.filter(file => file.endsWith('.m3u8')).forEach(file => {
      // 提取直播间ID，例如 "123456" 来自 "123456.m3u8"
      const id = path.basename(file, '.m3u8');
      const m3u8FilePath = path.join(hlsPath, file);
      const outputImagePath = path.join(thumbsPath, `${id}.jpg`);
      
      // 使用 FFmpeg 对 .m3u8 流生成截图
      // -y 覆盖已有文件; -frames:v 1 截取一帧; -q:v 2 高质量JPEG
      const ffmpegCmd = `ffmpeg -y -i "${m3u8FilePath}" -frames:v 1 -q:v 2 "${outputImagePath}"`;
      
      exec(ffmpegCmd, (error, stdout, stderr) => {
        if (error) {
          console.error(`FFmpeg 截图失败 for ${file}:`, error);
        } 
      });
    });
  });
}, 30000); // 每30秒执行一次

app = express();
app.use(express.static('public')); // 提供静态文件
app.use(express.urlencoded({ extended: true })); // 解析 POST 表单
app.use(cookieParser());

// 打开或创建 SQLite 数据库
const db = new sqlite3.Database('login.db');
// 简化操作：初始化表 (如果不存在)
db.run(`CREATE TABLE IF NOT EXISTS users (
  username TEXT PRIMARY KEY,
  fullname TEXT,
  password_hash TEXT NOT NULL,
  sessionid TEXT
)`);

// 创建 HTTP Server
const server = http.createServer(app);

// 创建 WebSocket Server
const wss = new WebSocket.Server({ server, path: '/ws' });

// 存储历史评论（数组，元素为 { text, time }）
let commentHistory = [];

// 模拟登录的认证中间件
function authMiddleware(req, res, next) {
  const sessionId = req.cookies.sessionid;

  // 如果没有 sessionid，则重定向到登录页面
  if (!sessionId) {
    return res.redirect('/login.html');
  }

  // 假设你有数据库查询逻辑
  db.get('SELECT * FROM users WHERE sessionid = ?', [sessionId], (err, user) => {
    if (err || !user) {
      // 如果 sessionid 无效，则重定向到登录页面
      return res.redirect('/login.html');
    }

    // 用户已通过认证，继续处理请求
    req.user = user;  // 可选：将用户信息附加到请求对象
    next();
  });
}

/********************************************
 * 1) 登录页面
 ********************************************/
app.get('/', (req, res) => {
  const sessionId = req.cookies.sessionid;

  // 如果没有 sessionid，则重定向到登录页面
  if (!sessionId) {
    return res.redirect('/login.html');
  }

  // 查询数据库验证 sessionid
  db.get('SELECT * FROM users WHERE sessionid = ?', [sessionId], (err, user) => {
    if (err || !user) {
      // 出现错误或未找到用户，则跳转到登录页面
      return res.redirect('/login.html');
    }
    // 验证通过后重定向到 live.html
    return res.redirect('/live.html');
  });
});


/********************************************
 * 2) 登录处理 (POST /login)
 ********************************************/
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    // 参数不完整 => 直接回到登录
    return res.redirect('/login.html?error=incorrect_password');
  }

  // 1) 查询数据库
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
    if (err) {
      console.error('DB error:', err);
      return res.redirect('/login.html');
    }
    if (!row) {
      // 用户名不存在
      console.warn(`Username ${username} not found`);
      return res.redirect('/login.html?error=incorrect_password');
    }

    // 2) 校验密码哈希
    const inputHash = getHash(password); // 对明文password做同样的哈希
    // console.log(`[DEBUG] Hash for ${username}: ${inputHash}`);
    if (inputHash !== row.password_hash) {
      // 密码不匹配
      console.warn(`Password mismatch for user ${username}`);
      return res.redirect('/login.html?error=incorrect_password');
    }

    // 3) 生成随机 sessionid
    const sessionid = crypto.randomBytes(16).toString('hex');
    // 4) 写入 db
    db.run('UPDATE users SET sessionid = ? WHERE username = ?', [sessionid, username], (err2) => {
      if (err2) {
        console.error('DB error:', err2);
        return res.redirect('/login.html?error=error');
      }
      // 5) 设置 cookie
      res.cookie('sessionid', sessionid, {
        httpOnly: true,  // 防XSS
        secure: true, // 若是HTTPS, 适当时可加
        maxAge: 60 * 60 * 1000 // 1天
      });
      // 6) 跳转到直播页面
      return res.redirect('/live.html');
    });
  });
});

app.get('/api/fullname', authMiddleware,(req, res) => {
  res.json({ fullname: req.user.fullname });
});

/********************************************
 * 3) 为 live.html 添加受保护的路由
 ********************************************/
app.get('/live.html', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'private', 'live.html'));
});


/********************************************
 * 4) 退出登录 (可选)
 ********************************************/
app.get('/logout',authMiddleware, (req, res) => {
  const sess = req.cookies.sessionid;
  if (sess) {
    db.run('UPDATE users SET sessionid = NULL WHERE sessionid = ?', [sess]);
  }
  // 清空cookie
  res.clearCookie('sessionid');
  return res.redirect('/login.html');
});

app.get('/reset-password', (req, res) => {
  return res.redirect('/reset-password.html');
});

app.post('/reset-password', (req, res) => {
  const { username, oldPassword, newPassword } = req.body;
  if (!username || !oldPassword || !newPassword) {
    // 参数不完整，直接返回或重定向回表单
    return res.redirect('/reset-password.html?error="error"');
  }

  // 先查询数据库中是否有这个用户
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
    if (err) {
      console.error(err);
      // 返回错误或者提示
      return res.redirect('/reset-password.html?error=incorrect_password');
    }
    if (!row) {
      // 用户名不存在
      return res.redirect('/reset-password.html?error=incorrect_password');
    }
    // 校验原密码是否匹配
    const oldHash = getHash(oldPassword);
    if (row.password_hash !== oldHash) {
      // 原密码不匹配 => 重定向回 /reset-password 并带上一个错误标记
      return res.redirect('/reset-password.html?error=incorrect_password');
    }
    // 如果匹配 => 用新密码更新
    const newHash = getHash(newPassword);
    db.run('UPDATE users SET password_hash = ? WHERE username = ?', [newHash, username], (err2) => {
      if (err2) {
        console.error(err2);
        return res.redirect('/reset-password.html?error=incorrect_password');
      }
      // 更新成功 => 重定向到登录页面
      return res.redirect('/login.html');
    });
  });
});

/**
 * 5) 新增 HTTP API，用于前端获取所有历史评论
 *    - 这里返回时按时间降序
 */
app.get('/comments',authMiddleware, (req, res) => {
    // 获取访问者IP
    // 如果经过反向代理，IP可能在 req.headers['x-forwarded-for'] 中
    const xff = req.headers['x-forwarded-for'];
    const xri = req.headers['x-real-ip'];
    let ip = xff
      ? xff.split(',')[0].trim()  // 多个时，取第一个
      : xri || req.socket.remoteAddress;
    

    const welcomeComment = {
        text: `${req.user.fullname} 跳进了直播间！[${ip}]`,
        user: '系统消息',
        time: Date.now()
      };
    
    // 广播
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'comment',
            data: welcomeComment
          }));
        }
    });
    console.log(`[INFO] New visitor from IP: ${ip}`);
    // 插入到历史评论
    commentHistory.push(welcomeComment);
    // 按 time 倒序
    const sorted = [...commentHistory].sort((a, b) => b.time - a.time);
    res.json(sorted);
});


// 创建一个 /hls 路由，受 authMiddleware 保护
app.use('/hls', authMiddleware, express.static(hlsPath, {
  setHeaders: function (res, filePath) {
    // 设置 Cache-Control 和跨域头
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // 根据文件扩展名设置 Content-Type
    if (filePath.endsWith('.m3u8')) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    } else if (filePath.endsWith('.ts')) {
      res.setHeader('Content-Type', 'video/mp2t');
    }
  }
}));

/**
 * 6) WebSocket 连接逻辑
 */
wss.on('connection', (ws, request) => {
  // 1) 从请求头里拿到 Cookie
  const cookieHeader = request.headers.cookie || '';
  // 2) 解析成为一个对象
  const cookies = cookieParserLib.parse(cookieHeader); 
  // 3) 获取 sessionid
  const sessionid = cookies.sessionid;
  
  // 如果没有 sessionid，可以选择直接关闭连接或标记为匿名
  if (!sessionid) {
    console.log('No sessionid cookie, treat as anonymous or close ws');
    ws.close(); // 或者让 ws.user = null;
    // return;
  }

  // 4) 去数据库查询对应用户
  db.get('SELECT * FROM users WHERE sessionid = ?', [sessionid], (err, user) => {
    if (err) {
      console.error('DB error:', err);
      // 你可自行决定是否关闭连接
      ws.close();
      return;
    }
    if (!user) {
      console.warn('sessionid invalid, no user found');
      ws.close();
      return;
    }

    // 5) 把 user 信息挂到 ws 上
    ws.user = user;
    console.log(`[${ws.user.fullname}] connected`);  
    // 这里 user 里含有 row.username、row.fullname 等字段
    // console.log('WS connected user:', user.fullname);
  });

  // 监听新消息
  ws.on('message', (data, isBinary) => {
    const message = isBinary ? data : data.toString().trim();
    console.log('Received message:', message);

    if (message) {
      // 6) 生成带fullname的评论对象
      const newComment = {
        // 如果 ws.user 存在且有 fullname，就用它；否则写 “匿名”
        text: message,
        user: ws.user && ws.user.fullname ,
        time: Date.now()
      };
      commentHistory.push(newComment);

      // 7) 广播给所有 WebSocket 客户端
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'comment',
            data: newComment
          }));
        }
      });
    }
  });

  ws.on('close', (code, reason) => {
    if (code === 1001) {
      console.log(`[${ws.user.fullname}] disconnected`);
    }
  });
});

// 启动服务器
server.listen(3000, () => {
  console.log('Server is running on http://127.0.0.1:3000');
});

/********************************************
 * 6) 简易哈希函数
 *   注意生产环境应使用 bcrypt / argon2
 ********************************************/
function getHash(password) {
  // 这里用最简单的 sha256 演示
  return crypto
    .createHash('sha256')
    .update(password)
    .digest('hex');
}
