# 🎨 Real-Time Overlay Collaboration System

A complete real-time collaboration system where operators control content that appears as transparent overlay windows on viewers' screens. Built with 100% FREE services!

## 🌟 Features

### Web Control Panel (Operator)
- Login/Register system
- Split-screen interface:
  - Left: Real-time text editor
  - Right: Image upload area
- Session management
- Instant synchronization to all viewers

### Desktop Overlay App (Viewer)
- Two transparent floating windows:
  - Text overlay (editable, two-way sync)
  - Image overlay
- Fully customizable:
  - Draggable and resizable
  - Always on top
  - Adjustable opacity (background & text)
  - Font customization
  - Color customization
- Hotkey controls:
  - `Ctrl+Shift+T` - Toggle click-through mode
  - `Ctrl+Shift+S` - Open settings

## 🛠️ Tech Stack (100% FREE)

- **Backend**: Node.js + Express + Socket.io (Render.com free tier)
- **Database**: Supabase (500MB free)
- **Authentication**: JWT + bcrypt (built-in)
- **Image Storage**: Cloudinary (25GB free)
- **Frontend**: React (Vercel free)
- **Desktop**: Electron
- **Real-time**: Socket.io

## 📁 Project Structure

```
overlay-collab-system/
├── backend/              # Node.js server
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   ├── supabase-schema.sql
│   └── render.yaml
├── frontend/             # React web app
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.js
│   │   │   ├── ControlPanel.js
│   │   │   └── ...
│   │   ├── App.js
│   │   └── index.js
│   ├── package.json
│   ├── .env.example
│   └── vercel.json
└── electron-app/         # Desktop overlay app
    ├── main.js
    ├── login.html
    ├── text-overlay.html
    ├── image-overlay.html
    ├── settings.html
    ├── package.json
    └── .env.example
```

## 🚀 Setup Instructions

### 1. Setup Supabase (Database)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to SQL Editor and run the SQL from `backend/supabase-schema.sql`
4. Go to Settings → API and copy:
   - Project URL
   - anon/public key
   - service_role key

### 2. Setup Cloudinary (Image Storage)

1. Go to [cloudinary.com](https://cloudinary.com) and create a free account
2. From the dashboard, copy:
   - Cloud Name
   - API Key
   - API Secret

### 3. Deploy Backend (Render.com)

1. Go to [render.com](https://render.com) and create a free account
2. Click "New +" → "Web Service"
3. Connect your GitHub repository (or deploy manually)
4. Configure:
   - **Name**: overlay-backend
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add Environment Variables:
   ```
   NODE_ENV=production
   PORT=3001
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_KEY=your_supabase_service_key
   JWT_SECRET=your_random_secret_string
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   CORS_ORIGIN=*
   ```
6. Deploy! Note the URL (e.g., `https://your-app.onrender.com`)

**Note**: Render free tier sleeps after 15 minutes of inactivity. First request may be slow.

### 4. Deploy Frontend (Vercel)

1. Go to [vercel.com](https://vercel.com) and create a free account
2. Click "New Project" → Import your repository
3. Configure:
   - **Framework Preset**: Create React App
   - **Root Directory**: `frontend`
4. Add Environment Variables:
   ```
   REACT_APP_API_URL=https://your-app.onrender.com
   REACT_APP_WS_URL=https://your-app.onrender.com
   ```
5. Deploy!

### 5. Build Desktop App (Electron)

#### Development Mode

1. Navigate to `electron-app` folder:
   ```bash
   cd electron-app
   npm install
   ```

2. Create `.env` file:
   ```
   API_URL=https://your-app.onrender.com
   WS_URL=https://your-app.onrender.com
   ```

3. Run in development:
   ```bash
   npm start
   ```

#### Build for Production

**Windows:**
```bash
npm run build:win
```

**macOS:**
```bash
npm run build:mac
```

**Linux:**
```bash
npm run build:linux
```

The installer will be in the `dist` folder.

## 📖 Usage Guide

### For Operators (Control Panel)

1. Open the web control panel at your Vercel URL
2. Register an account with role "Operator"
3. Login and create a new session
4. Copy the session ID
5. Share the session ID with viewers
6. Start typing or uploading images - they sync instantly!

### For Viewers (Desktop App)

1. Download and install the Electron app
2. Register an account with role "Viewer" (or use the web panel to register)
3. Login with your credentials and enter the session ID
4. Two overlay windows will appear:
   - **Text Window**: Shows live text from operator (you can edit too!)
   - **Image Window**: Shows uploaded images
5. Customize via settings (Ctrl+Shift+S):
   - Font size, family, colors
   - Background opacity
   - Text opacity
6. Use Ctrl+Shift+T to toggle click-through mode

## ⌨️ Keyboard Shortcuts

- `Ctrl+Shift+T` - Toggle click-through mode
- `Ctrl+Shift+S` - Open settings panel

## 🔧 Local Development

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with API URLs
npm start
```

### Electron App
```bash
cd electron-app
npm install
cp .env.example .env
# Edit .env with API URLs
npm start
```

## 🆓 Free Tier Limits

- **Render.com**: Free (sleeps after 15 min, 750 hours/month)
- **Vercel**: Unlimited projects, 100GB bandwidth
- **Supabase**: 500MB database, 1GB file storage
- **Cloudinary**: 25 credits (~25GB storage + bandwidth)

## 🐛 Troubleshooting

### Backend sleeps on Render
- First request after sleep takes ~30 seconds to wake up
- Consider using [cron-job.org](https://cron-job.org) to ping your backend every 10 minutes

### WebSocket connection fails
- Check CORS settings in backend
- Ensure WS_URL uses same protocol (http/https)
- Check firewall/antivirus settings

### Images not uploading
- Verify Cloudinary credentials
- Check file size (Cloudinary free tier has limits)
- Ensure image format is supported (JPG, PNG, GIF)

### Overlay windows not transparent on Linux
- Install required dependencies:
  ```bash
  sudo apt-get install libx11-dev libxext-dev libxss-dev
  ```

## 📝 Environment Variables Summary

### Backend (.env)
```
PORT=3001
NODE_ENV=production
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
JWT_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CORS_ORIGIN=*
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:3001
REACT_APP_WS_URL=http://localhost:3001
```

### Electron (.env)
```
API_URL=http://localhost:3001
WS_URL=http://localhost:3001
```

## 🎯 Features Roadmap

- [ ] Multiple image upload
- [ ] Drawing/annotation tools
- [ ] Voice chat integration
- [ ] Screen sharing
- [ ] Session recording
- [ ] Mobile app (React Native)

## 📄 License

MIT License - Feel free to use this for any purpose!

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first.

## 💡 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the setup instructions
3. Create an issue on GitHub

---

Built with ❤️ using only FREE services!
