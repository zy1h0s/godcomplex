# ⚡ Quick Start Guide

Get up and running in 15 minutes!

## 🎯 What You'll Build

A real-time overlay system where:
- **Operator** controls content via web browser
- **Viewer** sees transparent overlays on their desktop
- Everything syncs in real-time via WebSocket

## 🚀 5-Minute Local Test

### 1. Setup Backend (2 minutes)

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` - you need Supabase + Cloudinary (see below)

```bash
npm start
# Should see: "🚀 Server running on port 3001"
```

### 2. Setup Frontend (1 minute)

```bash
cd frontend
npm install
cp .env.example .env
npm start
# Opens http://localhost:3000
```

### 3. Setup Desktop App (2 minutes)

```bash
cd electron-app
npm install
cp .env.example .env
npm start
# Desktop app opens
```

## 🔑 Getting Free API Keys (10 minutes)

### Supabase (3 minutes)

1. Visit [supabase.com](https://supabase.com) → Sign up
2. New Project → Name it "overlay-test"
3. Wait ~2 minutes for creation
4. SQL Editor → Paste `backend/supabase-schema.sql` → Run
5. Settings → API → Copy URL and keys

### Cloudinary (2 minutes)

1. Visit [cloudinary.com](https://cloudinary.com/users/register/free)
2. Sign up (no credit card!)
3. Dashboard → Copy Cloud Name, API Key, API Secret

### Update .env files

**backend/.env**:
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_KEY=eyJhbGc...
JWT_SECRET=any_random_string_here_make_it_long
CLOUDINARY_CLOUD_NAME=xxxxx
CLOUDINARY_API_KEY=123456
CLOUDINARY_API_SECRET=xxxxx
```

**frontend/.env** & **electron-app/.env**:
```
API_URL=http://localhost:3001
WS_URL=http://localhost:3001
```

(or REACT_APP_API_URL for frontend)

## 🧪 Test It Out

### As Operator (Web)

1. Open [http://localhost:3000](http://localhost:3000)
2. Register → Username: "operator1", Email: "test@test.com", Password: "pass123", Role: "Operator"
3. Login → Create Session → Name it "Test Session"
4. **Copy the Session ID** (you'll need this!)
5. Type something in the text editor
6. Upload an image

### As Viewer (Desktop)

1. Open the Electron app
2. Register → Username: "viewer1", Email: "viewer@test.com", Password: "pass123"
3. Login → Paste the Session ID from above
4. **Two overlay windows appear!**
5. See your text and image in real-time
6. Try editing the text in the overlay - it syncs back!

### Test Real-Time Sync

1. Type in the web panel → See it appear on desktop overlay
2. Upload image in web → See it on desktop overlay
3. Edit text in desktop overlay → See it update in web panel
4. Press **Ctrl+Shift+T** → Toggle click-through mode
5. Press **Ctrl+Shift+S** → Open settings

## 🎨 Customize the Overlay

In settings (Ctrl+Shift+S):
- Change font size (10-48px)
- Pick font family
- Change colors
- Adjust opacity (background & text)
- Make it YOUR style!

## 🌐 Deploy to Production

Once it works locally, deploy for free:

1. **Backend** → [render.com](https://render.com) (FREE)
2. **Frontend** → [vercel.com](https://vercel.com) (FREE)
3. **Desktop App** → Build with `npm run build:win`

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full guide.

## 🎯 Common Use Cases

### Remote Presentations
- Operator shares notes/images during call
- Viewers see transparent overlays over their screen

### Gaming Overlays
- Stream overlays with custom text/images
- Real-time updates during gameplay

### Live Event Subtitles
- Operator types captions
- Viewers see them overlaid on their screen

### Collaborative Notes
- Team shares live notes
- Everyone can edit in real-time

### Digital Signage
- Control multiple screens remotely
- Update content instantly

## 🐛 Troubleshooting

**"Cannot find module"**
```bash
npm install
```

**"Port already in use"**
- Backend: Change PORT in .env
- Frontend: It'll ask to use another port

**"Failed to fetch"**
- Make sure backend is running
- Check API_URL in frontend .env

**Overlay not transparent**
- Linux: Install `libx11-dev`
- May not work in some VMs

**WebSocket errors**
- Restart backend server
- Check firewall settings

## 📚 Learn More

- [README.md](./README.md) - Full documentation
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide
- Code is well-commented - explore!

## 🎉 You're Ready!

That's it! You now have a working overlay collaboration system.

**Next Steps**:
1. Customize the UI
2. Add more features
3. Deploy to production
4. Share with friends!

---

Questions? Check the main README or create an issue.
