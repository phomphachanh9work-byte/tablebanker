# TableBanker 🎰

Digital chip ledger for private card games. Replace physical chips with transparent digital tracking.

## Features

- 👑 **Banker System** - Admin creates room, mints chips, controls the table
- 💸 **P2P Transfers** - Players pay each other with slide-to-pay
- 🏆 **Pot System** - Central pot for pot-based games
- 📜 **Public Ledger** - All transactions visible to everyone
- 💵 **Cash Out** - Settlement screen with paid status tracking
- 🌏 **Multi-Currency** - LAK (₭), THB (฿), USD ($)

## Deploy to Vercel (5 minutes)

### Option A: Deploy via GitHub (Recommended)

1. **Create GitHub Repository**
   - Go to [github.com/new](https://github.com/new)
   - Name it `tablebanker`
   - Keep it public or private

2. **Upload Files**
   - Upload all files from this folder to your repo
   - Or use git:
   ```bash
   cd tablebanker-app
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/tablebanker.git
   git push -u origin main
   ```

3. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com) and sign up/login
   - Click "Add New Project"
   - Import your GitHub repository
   - Click "Deploy"

4. **Done!** 
   - Your app is live at `https://tablebanker.vercel.app` (or similar)
   - Share this URL with your players!

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to project
cd tablebanker-app

# Deploy
vercel

# Follow prompts, then your app is live!
```

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

## How to Use

### As Banker (Admin):
1. Open the app → "Create Room"
2. Enter your name, select currency and game mode
3. Share the room code with players
4. Use 🏦 Mint to add chips when players buy in
5. Use 💵 Cash Out at the end to settle up

### As Player:
1. Open the app → "Join Room"
2. Enter your name and the room code
3. Pick a seat at the table
4. Tap other players to pay them (Direct Pay mode)
5. Tap the pot to bet (Pot mode)

## Important Notes

⚠️ **Current Limitation**: This version uses localStorage for data storage. For true multiplayer where players on different devices see real-time updates, you'll need to add a backend service like Firebase.

### Adding Firebase (for real multiplayer):

1. Create a Firebase project at [firebase.google.com](https://firebase.google.com)
2. Enable Realtime Database
3. Install Firebase: `npm install firebase`
4. Replace the `storage` object in `App.js` with Firebase calls

## File Structure

```
tablebanker-app/
├── public/
│   ├── index.html      # HTML template with PWA meta tags
│   └── manifest.json   # PWA manifest for "Add to Home Screen"
├── src/
│   ├── App.js          # Main application code
│   └── index.js        # React entry point
├── package.json        # Dependencies
└── README.md           # This file
```

## License

MIT - Free to use for personal and commercial purposes.

---

Built with ❤️ for card game nights in Laos 🇱🇦
