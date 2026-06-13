const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const initSqlJs = require('sql.js');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 4000;

let db;

async function initDatabase() {
  const SQL = await initSqlJs();
  
  try {
    const fileBuffer = fs.readFileSync('deathmarket.db');
    db = new SQL.Database(fileBuffer);
  } catch {
    db = new SQL.Database();
  }
  
  db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, email TEXT, full_name TEXT, balance_btc REAL DEFAULT 0.5, balance_eth REAL DEFAULT 5.0, balance_usdt REAL DEFAULT 10000.00, role TEXT DEFAULT 'user', api_key TEXT, api_secret TEXT, wallet_address TEXT, phone TEXT, kyc_status TEXT DEFAULT 'pending', referral_code TEXT, notes TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS trades (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, pair TEXT, type TEXT, amount REAL, price REAL, total REAL, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  db.run(`CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, pair TEXT, type TEXT, amount REAL, price REAL, status TEXT DEFAULT 'open', timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  db.run(`CREATE TABLE IF NOT EXISTS wallets (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, currency TEXT, balance REAL, address TEXT, private_key TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS admin_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT, user TEXT, ip TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  db.run(`CREATE TABLE IF NOT EXISTS support_tickets (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, subject TEXT, message TEXT, status TEXT DEFAULT 'open', timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  db.run(`CREATE TABLE IF NOT EXISTS news (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, content TEXT, author TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  db.run(`CREATE TABLE IF NOT EXISTS withdrawal_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, currency TEXT, amount REAL, wallet_address TEXT, status TEXT DEFAULT 'pending', timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  db.run(`CREATE TABLE IF NOT EXISTS internal_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, content TEXT, access_level TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  db.run(`CREATE TABLE IF NOT EXISTS api_credentials (id INTEGER PRIMARY KEY AUTOINCREMENT, service TEXT, api_key TEXT, api_secret TEXT, endpoint TEXT)`);

  const result = db.exec('SELECT COUNT(*) as count FROM users');
  const count = result[0]?.values[0]?.[0] || 0;
  
  if (count === 0) {
    const users = [
      ['admin', 'admin123!', 'admin@deathmarket.io', 'System Administrator', 100.0, 1000.0, 500000.00, 'admin', 'dm_admin_key_2024', 'dm_admin_secret_hash_890', '0xDeadMarketAdminWallet001', '+1-555-0100', 'verified', 'ADMIN2024', 'SSH: root@10.0.0.50 password: DeathMarket2024! Vault seed: abandon abandon abandon artist'],
      ['crypto_whale', 'Wh4le!2024', 'whale@crypto.io', 'Crypto Whale', 50.0, 500.0, 250000.00, 'user', '', '', '0xWhaleWallet002', '+1-555-0101', 'verified', '', 'Cold storage: 0xColdStorageWhale003 - Private key in wallet table'],
      ['trader_joe', 'TraderJoe99', 'joe@trading.io', 'Joe Trader', 2.5, 25.0, 15000.00, 'user', '', '', '0xJoeWallet004', '+1-555-0102', 'verified', '', ''],
      ['new_investor', 'Investor1', 'newbie@email.com', 'New Investor', 0.1, 1.0, 500.00, 'user', '', '', '0xNewbieWallet005', '+1-555-0103', 'pending', '', ''],
      ['exchange_bot', 'B0t!Exchange', 'bot@deathmarket.internal', 'Trading Bot', 200.0, 2000.0, 1000000.00, 'bot', 'dm_bot_key_2024', 'dm_bot_secret_777', '0xBotWallet006', null, 'verified', '', 'Trading algorithm: buy when RSI < 30, sell when RSI > 70. API key has full access.'],
      ['developer', 'Dev@2024!', 'dev@deathmarket.internal', 'Lead Developer', 5.0, 50.0, 50000.00, 'dev', '', '', '0xDevWallet007', null, 'verified', '', 'JWT secret: deathmarket_jwt_signing_key_2024. DB backup at /backup/market_backup.db. Admin panel at /admin'],
    ];
    
    const stmt = db.prepare('INSERT INTO users (username, password, email, full_name, balance_btc, balance_eth, balance_usdt, role, api_key, api_secret, wallet_address, phone, kyc_status, referral_code, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const user of users) {
      stmt.run(user);
    }
    stmt.free();

    const walletStmt = db.prepare('INSERT INTO wallets (user_id, currency, balance, address, private_key) VALUES (?, ?, ?, ?, ?)');
    walletStmt.run([2, 'BTC', 200.0, '0xWhaleColdStorageBTC', '5KWhalePrivateKey789012345678901234567890']);
    walletStmt.run([2, 'ETH', 5000.0, '0xWhaleColdStorageETH', '0xWhaleETHPrivateKey890123456789012345678901']);
    walletStmt.run([1, 'BTC', 500.0, '0xAdminColdStorageBTC', '5KAdminPrivateKey123456789012345678901234']);
    walletStmt.run([6, 'BTC', 1000.0, '0xDevColdStorageBTC', '5KDevPrivateKey456789012345678901234567']);
    walletStmt.free();
  }

  const msgResult = db.exec('SELECT COUNT(*) as count FROM internal_messages');
  const msgCount = msgResult[0]?.values[0]?.[0] || 0;
  
  if (msgCount === 0) {
    const messages = [
      ['Database Backup', 'Full database backup accessible at /backup/market_backup.db - NO authentication required! Fix ASAP!', 'public'],
      ['Admin Credentials', 'Production admin: admin@deathmarket.io / admin123! - Change after deployment!', 'public'],
      ['SSH Access', 'Production server SSH: root@10.0.0.50 password: DeathMarket2024!', 'admin'],
      ['JWT Secret', 'JWT signing key: deathmarket_jwt_signing_key_2024 - stored in developer notes', 'admin'],
      ['API Keys Exposed', 'API credentials stored in api_credentials table - accessible via SQL injection', 'admin'],
      ['Wallet Private Keys', 'Private keys stored in wallets table - viewable via /api/wallets endpoint', 'admin'],
      ['Command Injection', 'Market data updater at /api/update-prices executes system commands - do NOT expose to users!', 'admin'],
      ['Mass Assignment', 'User profile update endpoint accepts any parameter including balance and role', 'admin'],
      ['IDOR Vulnerability', 'User wallets visible by changing user ID in /api/wallets/:id', 'admin'],
      ['Race Condition', 'Withdrawal endpoint has race condition - possible double-spend attack', 'admin'],
      ['Exchange Rate Manipulation', 'Exchange rates via /api/exchange-rate can be manipulated through blind SQL injection', 'public'],
      ['KYC Bypass', 'KYC status can be changed via mass assignment on profile update', 'admin'],
      ['Referral Exploit', 'Referral system has no validation - infinite referral bonuses possible', 'admin'],
      ['WebSocket Hijack', 'Trading WebSocket at /ws uses no authentication', 'admin'],
      ['GraphQL Endpoint', 'GraphQL at /api/graphql has introspection enabled - full schema visible', 'admin'],
    ];
    
    const msgStmt = db.prepare('INSERT INTO internal_messages (title, content, access_level) VALUES (?, ?, ?)');
    for (const msg of messages) {
      msgStmt.run(msg);
    }
    msgStmt.free();
  }

  const apiResult = db.exec('SELECT COUNT(*) as count FROM api_credentials');
  const apiCount = apiResult[0]?.values[0]?.[0] || 0;
  
  if (apiCount === 0) {
    const apis = [
      ['Binance', 'binance_api_key_12345', 'binance_secret_abcdef', 'https://api.binance.com'],
      ['Coinbase', 'coinbase_api_key_67890', 'coinbase_secret_ghijkl', 'https://api.coinbase.com'],
      ['Infura', 'infura_project_id_abc123', 'infura_secret_def456', 'https://mainnet.infura.io/v3/'],
      ['Alchemy', 'alchemy_key_ghi789', 'alchemy_secret_jkl012', 'https://eth-mainnet.alchemyapi.io/v2/'],
      ['Internal', 'deathmarket_internal_key', 'deathmarket_internal_secret_2024', 'http://localhost:4000/api/internal'],
    ];
    
    const apiStmt = db.prepare('INSERT INTO api_credentials (service, api_key, api_secret, endpoint) VALUES (?, ?, ?, ?)');
    for (const api of apis) {
      apiStmt.run(api);
    }
    apiStmt.free();
  }
  
  saveDatabase();
}

function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync('deathmarket.db', buffer);
}

function queryAll(sql) {
  try {
    const results = db.exec(sql);
    if (results.length === 0) return [];
    const columns = results[0].columns;
    return results[0].values.map(row => {
      const obj = {};
      columns.forEach((col, i) => obj[col.toLowerCase()] = row[i]);
      return obj;
    });
  } catch (e) {
    throw e;
  }
}

function queryOne(sql) {
  const results = queryAll(sql);
  return results.length > 0 ? results[0] : null;
}

function runQuery(sql) {
  db.run(sql);
  saveDatabase();
}

function requireAuthForPage(req, res, next) {
  const publicPages = ['/', '/login', '/register', '/market', '/support', '/learn'];
  if (req.path.startsWith('/api/')) return next();
  if (req.path.startsWith('/backup/')) return next();
  if (publicPages.includes(req.path)) return next();
  if (req.path.match(/\.(css|js|png|jpg|ico|svg|txt)$/)) return next();
  if (!req.session.userId) return res.redirect('/login');
  next();
}

initDatabase().then(() => {
  
  app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.text({ type: 'application/xml', limit: '50mb' }));
  app.use(cookieParser());
  app.use(session({
    secret: 'deathmarket_session_secret_2024',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, httpOnly: false }
  }));

  app.use(express.static('public'));
  app.use(requireAuthForPage);

  // SQL Injection in Login
  app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
    try {
      const user = queryOne(query);
      if (user) {
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.role = user.role;
        runQuery(`INSERT INTO admin_logs (action, user, ip) VALUES ('login', '${user.username}', '${req.ip}')`);
        res.json({ success: true, user: { id: user.id, username: user.username, role: user.role, balance_btc: user.balance_btc, balance_eth: user.balance_eth, balance_usdt: user.balance_usdt } });
      } else {
        res.json({ success: false, message: 'Invalid credentials' });
      }
    } catch (e) {
      res.json({ success: false, message: 'Login error' });
    }
  });

  // Registration
  app.post('/api/register', (req, res) => {
    const { username, password, email, full_name } = req.body;
    if (!username || !password) return res.json({ success: false, message: 'Username and password required' });
    const exists = queryOne(`SELECT id FROM users WHERE username = '${username}'`);
    if (exists) return res.json({ success: false, message: 'Username taken' });
    try {
      const walletAddr = '0x' + crypto.randomBytes(20).toString('hex');
      runQuery(`INSERT INTO users (username, password, email, full_name, wallet_address) VALUES ('${username}', '${password}', '${email || ''}', '${full_name || ''}', '${walletAddr}')`);
      const newUser = queryOne(`SELECT * FROM users WHERE username = '${username}'`);
      req.session.userId = newUser.id;
      req.session.username = newUser.username;
      req.session.role = newUser.role;
      res.json({ success: true, user: newUser });
    } catch (e) {
      res.json({ success: false, message: 'Registration failed' });
    }
  });

  // NoSQL Injection
  app.post('/api/nosql-login', (req, res) => {
    const { username } = req.body;
    try {
      const parsed = JSON.parse(username);
      if (parsed.$ne || parsed.$gt || parsed.$regex) {
        const users = queryAll("SELECT * FROM users WHERE username != ''");
        return res.json({ success: true, users: users });
      }
    } catch (e) {}
    res.json({ success: false });
  });

  // IDOR - View any user
  app.get('/api/user/:id', (req, res) => {
    const user = queryOne(`SELECT u.*, w.private_key FROM users u LEFT JOIN wallets w ON u.id = w.user_id WHERE u.id = ${req.params.id}`);
    user ? res.json(user) : res.json({ error: 'Not found' });
  });

  // Wallets exposed
  app.get('/api/wallets', (req, res) => res.json(queryAll('SELECT * FROM wallets')));
  app.get('/api/wallets/:id', (req, res) => res.json(queryOne(`SELECT * FROM wallets WHERE user_id = ${req.params.id}`)));

  // SQL Injection in Search
  app.get('/api/search', (req, res) => {
    const q = req.query.q || '';
    res.json(queryAll(`SELECT id, username, email, balance_btc, balance_eth, balance_usdt, wallet_address FROM users WHERE username LIKE '%${q}%' OR email LIKE '%${q}%'`));
  });

  // Command Injection
  app.post('/api/ping', (req, res) => {
    exec(`ping ${req.body.host} 2>&1`, { timeout: 10000 }, (err, stdout, stderr) => {
      res.json({ output: stdout || stderr || err?.message });
    });
  });

  // Stored XSS in Support
  app.post('/api/support', (req, res) => {
    const { subject, message } = req.body;
    runQuery(`INSERT INTO support_tickets (user_id, subject, message) VALUES (${req.session.userId || 0}, '${subject}', '${message}')`);
    res.json({ success: true });
  });
  app.get('/api/support-tickets', (req, res) => res.json(queryAll('SELECT * FROM support_tickets')));

  // Reflected XSS
  app.get('/api/notification', (req, res) => {
    res.send(`<html><body><div style="padding:20px;background:#1a1a2e;color:#fff;">${req.query.msg || ''}</div></body></html>`);
  });

  // CSRF
  app.post('/api/update-profile', (req, res) => {
    if (!req.session.userId) return res.json({ success: false, message: 'Not logged in' });
    const { email, full_name, phone } = req.body;
    runQuery(`UPDATE users SET email = '${email}', full_name = '${full_name}', phone = '${phone}' WHERE id = ${req.session.userId}`);
    res.json({ success: true });
  });

  // Mass Assignment
  app.post('/api/update-user', (req, res) => {
    if (!req.session.userId) return res.json({ success: false, message: 'Not logged in' });
    let clauses = [];
    for (let [k, v] of Object.entries(req.body)) {
      if (k !== 'id') clauses.push(`${k} = '${v}'`);
    }
    if (clauses.length > 0) {
      runQuery(`UPDATE users SET ${clauses.join(', ')} WHERE id = ${req.session.userId}`);
      res.json({ success: true, message: 'Updated' });
    }
  });

  // Path Traversal
  app.get('/api/file', (req, res) => {
    const fileName = req.query.name || 'welcome.txt';
    try {
      const filePath = path.resolve(path.join(__dirname, 'public', 'files', fileName));
      const content = fs.readFileSync(filePath, 'utf8');
      res.type('text/plain').send(content);
    } catch (e) {
      try {
        const content = fs.readFileSync(path.resolve(fileName), 'utf8');
        res.type('text/plain').send(content);
      } catch (e2) {
        res.status(404).send('File not found: ' + fileName);
      }
    }
  });

  // Open Redirect
  app.get('/redirect', (req, res) => res.redirect(req.query.url || '/dashboard'));

  // Session Fixation
  app.get('/api/set-session', (req, res) => {
    if (req.query.id) {
      req.session.userId = parseInt(req.query.id);
      const user = queryOne(`SELECT * FROM users WHERE id = ${req.query.id}`);
      if (user) { req.session.username = user.username; req.session.role = user.role; }
      res.json({ success: true });
    }
  });

  // Info Leakage Headers
  app.use((req, res, next) => {
    res.setHeader('X-Powered-By', 'DeathMarket/2.0.1');
    res.setHeader('Server', 'DeathMarket-Trading-Engine/2.0');
    res.setHeader('X-Internal-IP', '10.0.0.50');
    res.setHeader('X-Admin-Contact', 'admin@deathmarket.io');
    res.setHeader('X-DB-Path', path.join(__dirname, 'deathmarket.db'));
    next();
  });

  // Weak JWT Token
  app.get('/api/generate-token', (req, res) => {
    const userId = req.query.id || req.session.userId || 1;
    const payload = { user: userId, role: 'admin', exp: Date.now() + 999999999, iat: Date.now() };
    const token = Buffer.from(JSON.stringify(payload)).toString('base64');
    const sig = crypto.createHmac('sha256', 'deathmarket_jwt_signing_key_2024').update(token).digest('hex').substring(0, 32);
    res.json({ token: `${token}.${sig}`, decoded: payload });
  });

  // Race Condition in Withdrawal
  app.post('/api/withdraw', (req, res) => {
    if (!req.session.username) return res.json({ success: false, message: 'Not logged in' });
    const { currency, amount, wallet_address } = req.body;
    const user = queryOne(`SELECT balance_${currency} as bal FROM users WHERE username = '${req.session.username}'`);
    if (!user || user.bal < parseFloat(amount)) return res.json({ success: false, message: 'Insufficient balance' });
    setTimeout(() => {
      runQuery(`UPDATE users SET balance_${currency} = balance_${currency} - ${amount} WHERE username = '${req.session.username}'`);
      runQuery(`INSERT INTO withdrawal_requests (user_id, currency, amount, wallet_address, status) VALUES (${req.session.userId}, '${currency}', ${amount}, '${wallet_address}', 'approved')`);
      res.json({ success: true, message: `Withdrawal of ${amount} ${currency.toUpperCase()} to ${wallet_address} processed` });
    }, 500);
  });

  // Blind SQL Injection
  app.get('/api/user-exists', (req, res) => {
    const result = queryOne(`SELECT COUNT(*) as count FROM users WHERE username = '${req.query.username || ''}'`);
    res.json({ exists: !!(result && result.count > 0) });
  });

  // Database Backup
  app.get('/backup/market_backup.db', (req, res) => {
    const dbPath = path.join(__dirname, 'deathmarket.db');
    if (fs.existsSync(dbPath)) res.download(dbPath, 'market_backup.db');
    else res.status(404).send('Not found');
  });

  // Debug Endpoint
  app.get('/api/debug', (req, res) => {
    res.json({
      server: 'DeathMarket', version: '2.0.1', node: process.version,
      memory: process.memoryUsage(), uptime: process.uptime(),
      db_path: path.join(__dirname, 'deathmarket.db'),
      ssh: 'root@10.0.0.50 password: DeathMarket2024!',
      jwt_secret: 'deathmarket_jwt_signing_key_2024',
      admin: { user: 'admin', pass: 'admin123!' }, internal_api: '/api/internal'
    });
  });

  // Config Exposure
  app.get('/api/config', (req, res) => {
    res.json({
      app: 'DeathMarket', version: '2.0.1',
      db: { type: 'sqlite', path: './deathmarket.db', backup: '/backup/market_backup.db' },
      jwt: 'deathmarket_jwt_signing_key_2024', admin: 'admin / admin123!',
      ssh: 'root@10.0.0.50 / DeathMarket2024!', internal: '/api/internal'
    });
  });

  // Internal API
  app.get('/api/internal', (req, res) => {
    res.json({
      users: queryAll('SELECT id, username, password, email, balance_btc, balance_eth, balance_usdt, role, wallet_address, api_key, api_secret, notes FROM users'),
      wallets: queryAll('SELECT * FROM wallets'),
      api_keys: queryAll('SELECT * FROM api_credentials'),
      messages: queryAll('SELECT * FROM internal_messages'),
      ssh: 'root@10.0.0.50 password: DeathMarket2024!', jwt_secret: 'deathmarket_jwt_signing_key_2024'
    });
  });

  // Export All Data
  app.get('/api/export', (req, res) => {
    const format = req.query.format || 'json';
    if (format === 'csv') {
      const users = queryAll('SELECT * FROM users');
      let csv = 'id,username,password,email,balance_btc,balance_eth,balance_usdt,role,wallet_address,api_key,api_secret\n';
      users.forEach(u => csv += `${u.id},${u.username},${u.password},${u.email},${u.balance_btc},${u.balance_eth},${u.balance_usdt},${u.role},${u.wallet_address},${u.api_key},${u.api_secret}\n`);
      res.setHeader('Content-Type', 'text/csv');
      res.send(csv);
    } else { res.json(queryAll('SELECT * FROM users')); }
  });

  // User Enumeration
  app.post('/api/verify-user', (req, res) => {
    const start = Date.now();
    const user = queryOne(`SELECT * FROM users WHERE username = '${req.body.username}'`);
    setTimeout(() => res.json({ valid: !!user, time_ms: Date.now() - start }), user ? 100 : 500);
  });

  // SSRF
  app.post('/api/fetch-url', (req, res) => {
    const url = req.body.url || '';
    if (!url) return res.json({ error: 'No URL' });
    try {
      const protocol = url.startsWith('https') ? require('https') : require('http');
      protocol.get(url, (resp) => { let data = ''; resp.on('data', c => data += c); resp.on('end', () => res.json({ data: data.substring(0, 5000) })); }).on('error', e => res.json({ error: e.message }));
    } catch (e) {
      exec(`curl -s "${url}" 2>&1 | head -50`, { timeout: 5000 }, (err, stdout) => { res.json({ output: stdout || err?.message }); });
    }
  });

  // XXE
  app.post('/api/import-trades', (req, res) => {
    const xmlData = req.body;
    if (typeof xmlData === 'string' && xmlData.includes('<!ENTITY')) {
      const match = xmlData.match(/<!ENTITY\s+(\w+)\s+SYSTEM\s+"([^"]+)"/);
      if (match) {
        try { const content = fs.readFileSync(match[2], 'utf8').substring(0, 1000); return res.json({ file: match[1], content }); }
        catch (e) { return res.json({ error: 'File not readable' }); }
      }
    }
    res.json({ message: 'Send XML with XXE payload' });
  });

  // GraphQL Introspection
  app.post('/api/graphql', (req, res) => {
    if (req.body.query && req.body.query.includes('__schema')) {
      return res.json({ data: { __schema: { types: [{ name: 'User', fields: [{name:'id'},{name:'username'},{name:'password'},{name:'email'},{name:'balance_btc'},{name:'api_key'}] }, { name: 'Wallet', fields: [{name:'id'},{name:'user_id'},{name:'currency'},{name:'private_key'}] }]}}});
    }
    res.json({ data: { message: 'GraphQL ready' } });
  });

  // Exchange Rate
  app.get('/api/exchange-rate', (req, res) => {
    const pair = req.query.pair || 'BTC-USD';
    const result = queryOne(`SELECT * FROM trades WHERE pair = '${pair}' ORDER BY timestamp DESC LIMIT 1`);
    res.json({ pair, price: result ? result.price : 50000, timestamp: new Date().toISOString() });
  });

  // Place Order
  app.post('/api/order', (req, res) => {
    if (!req.session.userId) return res.json({ success: false, message: 'Not logged in' });
    const { pair, type, amount, price } = req.body;
    runQuery(`INSERT INTO orders (user_id, pair, type, amount, price, total) VALUES (${req.session.userId}, '${pair}', '${type}', ${amount}, ${price}, ${parseFloat(amount)*parseFloat(price)})`);
    res.json({ success: true, message: 'Order placed' });
  });

  // Get Orders
  app.get('/api/orders/:userId', (req, res) => {
    res.json(queryAll(`SELECT * FROM orders WHERE user_id = ${req.params.userId} ORDER BY timestamp DESC`));
  });

  // API Keys
  app.get('/api/api-keys', (req, res) => res.json(queryAll('SELECT * FROM api_credentials')));

  // Internal Messages
  app.get('/api/messages', (req, res) => res.json(queryAll('SELECT * FROM internal_messages')));

  // Password Reset
  app.post('/api/reset-password', (req, res) => {
    const user = queryOne(`SELECT * FROM users WHERE username = '${req.body.username}' AND email = '${req.body.email}'`);
    if (user) { res.json({ success: true, password: user.password }); }
    else { res.json({ success: false, message: 'Invalid' }); }
  });

  // Referral
  app.post('/api/referral', (req, res) => {
    if (!req.session.userId) return res.json({ success: false, message: 'Not logged in' });
    runQuery(`UPDATE users SET balance_usdt = balance_usdt + 100 WHERE id = ${req.session.userId}`);
    res.json({ success: true, message: '$100 USDT referral bonus added!' });
  });

  // Direct SQL Execution (GET + POST)
  app.get('/api/query', (req, res) => {
    try {
      const sql = req.query.sql || 'SELECT * FROM users';
      if (sql.toLowerCase().startsWith('select')) res.json({ results: queryAll(sql) });
      else { runQuery(sql); res.json({ success: true, message: 'Query executed' }); }
    } catch (e) { res.json({ error: e.message }); }
  });
  app.post('/api/query', (req, res) => {
    try {
      const sql = req.body.sql || '';
      if (sql.toLowerCase().startsWith('select')) res.json({ results: queryAll(sql) });
      else { runQuery(sql); res.json({ success: true, message: 'Query executed' }); }
    } catch (e) { res.json({ error: e.message }); }
  });

  // KYC Bypass
  app.post('/api/kyc', (req, res) => {
    if (!req.session.userId) return res.json({ success: false, message: 'Not logged in' });
    runQuery(`UPDATE users SET kyc_status = 'verified' WHERE id = ${req.session.userId}`);
    res.json({ success: true, message: 'KYC verified' });
  });

  // News (Stored XSS)
  app.post('/api/news', (req, res) => {
    const { title, content } = req.body;
    runQuery(`INSERT INTO news (title, content, author) VALUES ('${title}', '${content}', '${req.session.username || 'anonymous'}')`);
    res.json({ success: true });
  });
  app.get('/api/news', (req, res) => res.json(queryAll('SELECT * FROM news ORDER BY timestamp DESC')));

  // Logs
  app.get('/api/logs', (req, res) => res.json(queryAll('SELECT * FROM admin_logs ORDER BY timestamp DESC LIMIT 100')));

  // Prototype Pollution
  app.post('/api/settings', (req, res) => {
    const settings = req.body;
    if (settings.__proto__ && settings.__proto__.isAdmin) { req.session.role = 'admin'; return res.json({ success: true, message: 'Admin granted' }); }
    res.json({ success: true, settings });
  });

  // External redirect
  app.get('/api/external-link', (req, res) => res.redirect(req.query.url || 'https://deathmarket.io'));

  // Transfer
  app.post('/api/transfer', (req, res) => {
    if (!req.session.username) return res.json({ success: false, message: 'Not logged in' });
    const { toUser, amount, currency } = req.body;
    const curr = currency || 'usdt';
    const sender = queryOne(`SELECT balance_${curr} as bal FROM users WHERE username = '${req.session.username}'`);
    if (!sender || sender.bal < parseFloat(amount)) return res.json({ success: false, message: 'Insufficient funds' });
    const recipient = queryOne(`SELECT username FROM users WHERE username = '${toUser}'`);
    if (!recipient) return res.json({ success: false, message: 'Recipient does not exist' });
    runQuery(`UPDATE users SET balance_${curr} = balance_${curr} - ${amount} WHERE username = '${req.session.username}'`);
    runQuery(`UPDATE users SET balance_${curr} = balance_${curr} + ${amount} WHERE username = '${toUser}'`);
    runQuery(`INSERT INTO trades (user_id, pair, type, amount, price, total) VALUES (${req.session.userId}, '${curr.toUpperCase()}/USDT', 'transfer', ${amount}, 0, 0)`);
    res.json({ success: true, message: `Transferred ${amount} ${curr.toUpperCase()} to ${toUser}` });
  });

  app.get('/api/me', (req, res) => {
    if (req.session.userId) { const user = queryOne(`SELECT * FROM users WHERE id = ${req.session.userId}`); user ? res.json(user) : res.json({ error: 'Not found' }); }
    else { res.json({ error: 'Not logged in' }); }
  });

  app.get('/api/balances', (req, res) => {
    if (req.session.userId) { const user = queryOne(`SELECT balance_btc, balance_eth, balance_usdt FROM users WHERE id = ${req.session.userId}`); res.json(user || { balance_btc: 0, balance_eth: 0, balance_usdt: 0 }); }
    else { res.json({ balance_btc: 0, balance_eth: 0, balance_usdt: 0 }); }
  });

  // Pages
  app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
  app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
  app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
  app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
  app.get('/trade', (req, res) => res.sendFile(path.join(__dirname, 'public', 'trade.html')));
  app.get('/market', (req, res) => res.sendFile(path.join(__dirname, 'public', 'market.html')));
  app.get('/wallet', (req, res) => res.sendFile(path.join(__dirname, 'public', 'wallet.html')));
  app.get('/profile', (req, res) => res.sendFile(path.join(__dirname, 'public', 'profile.html')));
  app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
  app.get('/support', (req, res) => res.sendFile(path.join(__dirname, 'public', 'support.html')));
  app.get('/learn', (req, res) => res.sendFile(path.join(__dirname, 'public', 'learn.html')));

  app.listen(PORT, () => {
    console.log('');
    console.log('  💀 DeathMarket running on http://localhost:' + PORT);
    console.log('');
  });

}).catch(err => {
  console.error('Failed to initialize:', err);
  process.exit(1);
});