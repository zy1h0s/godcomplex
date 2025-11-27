# 🚀 Detailed Deployment Guide

Step-by-step guide to deploy the entire system using FREE services.

## Prerequisites

- GitHub account (to host code)
- Git installed locally
- Node.js installed (v18+)

## Step 1: Prepare Your Code

1. **Create a GitHub repository**:
   ```bash
   cd overlay-collab-system
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/overlay-collab.git
   git push -u origin main
   ```

## Step 2: Setup Supabase

### Create Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in:
   - **Name**: overlay-collab
   - **Database Password**: (generate a strong one)
   - **Region**: (choose closest to you)
4. Click "Create Project" (takes ~2 minutes)

### Setup Database

1. Once ready, go to **SQL Editor** (left sidebar)
2. Click "New Query"
3. Copy the entire contents of `backend/supabase-schema.sql`
4. Paste and click "Run"
5. You should see "Success. No rows returned"

### Get API Credentials

1. Go to **Settings** → **API**
2. Copy these values (you'll need them later):
   ```
   Project URL: https://xxxxx.supabase.co
   anon public key: eyJhbGc...
   service_role key: eyJhbGc... (click "Reveal" to see)
   ```

## Step 3: Setup Cloudinary

### Create Account

1. Go to [cloudinary.com](https://cloudinary.com/users/register/free)
2. Sign up (no credit card required)
3. Verify your email

### Get Credentials

1. From the **Dashboard**, copy:
   ```
   Cloud Name: xxxxx
   API Key: 123456789
   API Secret: xxxxx (click eye icon to reveal)
   ```

## Step 4: Deploy Backend to Render.com

### Create Web Service

1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Click "New +" → "Web Service"
4. Click "Connect GitHub" and authorize
5. Select your `overlay-collab` repository
6. Configure:
   - **Name**: `overlay-backend`
   - **Region**: (choose closest)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

### Add Environment Variables

Click "Advanced" → "Add Environment Variable" for each:

```
NODE_ENV = production
PORT = 3001
SUPABASE_URL = https://xxxxx.supabase.co
SUPABASE_ANON_KEY = eyJhbGc...
SUPABASE_SERVICE_KEY = eyJhbGc...
JWT_SECRET = your_random_secret_here_min_32_chars
CLOUDINARY_CLOUD_NAME = xxxxx
CLOUDINARY_API_KEY = 123456789
CLOUDINARY_API_SECRET = xxxxx
CORS_ORIGIN = *
```

**Generate JWT_SECRET**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Deploy

1. Click "Create Web Service"
2. Wait for deployment (~5 minutes)
3. Once live, copy your URL: `https://your-app.onrender.com`
4. Test it: visit `https://your-app.onrender.com/health`
   - Should return: `{"status":"ok","timestamp":"..."}`

### Keep Alive (Optional)

Render free tier sleeps after 15 minutes. To keep it awake:

1. Go to [cron-job.org](https://cron-job.org)
2. Create free account
3. Create new cron job:
   - **URL**: `https://your-app.onrender.com/health`
   - **Schedule**: Every 10 minutes
   - **Method**: GET

## Step 5: Deploy Frontend to Vercel

### Connect Repository

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click "New Project"
4. Import your `overlay-collab` repository
5. Configure:
   - **Project Name**: `overlay-frontend`
   - **Framework Preset**: Create React App
   - **Root Directory**: `frontend`

### Add Environment Variables

Under "Environment Variables":

```
REACT_APP_API_URL = https://your-app.onrender.com
REACT_APP_WS_URL = https://your-app.onrender.com
```

(Use your Render URL from Step 4)

### Deploy

1. Click "Deploy"
2. Wait ~2 minutes
3. Once deployed, you'll get a URL like: `https://overlay-frontend.vercel.app`
4. Visit it - you should see the login page!

### Update CORS (Important!)

1. Go back to Render.com
2. Open your backend service
3. Go to "Environment"
4. Update `CORS_ORIGIN` to:
   ```
   https://overlay-frontend.vercel.app
   ```
5. Save and wait for auto-redeploy

## Step 6: Build Desktop App

### For Windows Users

1. Open PowerShell in `electron-app` folder:
   ```powershell
   cd electron-app
   npm install
   ```

2. Create `.env` file:
   ```
   API_URL=https://your-app.onrender.com
   WS_URL=https://your-app.onrender.com
   ```

3. Build:
   ```powershell
   npm run build:win
   ```

4. Installer will be in `dist/` folder
5. Share the `.exe` file with viewers!

### For macOS Users

```bash
cd electron-app
npm install
# Create .env file
npm run build:mac
```

Find `.dmg` in `dist/` folder

### For Linux Users

```bash
cd electron-app
npm install
# Create .env file
npm run build:linux
```

Find `.AppImage` in `dist/` folder

## Step 7: Test Everything

### Test Backend

```bash
curl https://your-app.onrender.com/health
```

Should return JSON with status "ok"

### Test Frontend

1. Visit your Vercel URL
2. Register a new account:
   - **Username**: operator1
   - **Email**: test@test.com
   - **Password**: password123
   - **Role**: Operator
3. Login and create a session
4. Copy the session ID

### Test Desktop App

1. Run the built executable
2. Register another account:
   - **Username**: viewer1
   - **Email**: viewer@test.com
   - **Password**: password123
3. Login and paste the session ID
4. You should see two overlay windows appear!

### Test Real-Time Sync

1. In the web control panel, type some text
2. The desktop overlay should update in real-time
3. Upload an image in the web panel
4. The image overlay should show it immediately

## 🎉 You're Done!

Your system is now fully deployed and running on 100% free services!

## 📊 Monitoring Your Deployments

### Render.com
- Dashboard shows logs, metrics, and uptime
- Free tier sleeps after 15 min inactivity
- First wake-up takes ~30 seconds

### Vercel
- Analytics available (100k events/month free)
- Automatic deployments on git push
- Instant rollbacks available

### Supabase
- Table Editor to view data
- Database usage in Settings
- Real-time logs available

### Cloudinary
- Media Library to view uploaded images
- Usage statistics in dashboard
- 25 credits/month free

## 🔄 Updating Your Deployment

### Backend/Frontend Updates

1. Make code changes locally
2. Commit and push:
   ```bash
   git add .
   git commit -m "Update feature"
   git push
   ```
3. Both Render and Vercel auto-deploy on push!

### Desktop App Updates

1. Update code in `electron-app/`
2. Increment version in `package.json`
3. Rebuild:
   ```bash
   npm run build:win  # or mac/linux
   ```
4. Distribute new installer

## 🐛 Common Deployment Issues

### "Module not found" error on Render
- Check `package.json` has all dependencies
- Verify `npm install` in build command

### CORS errors in browser
- Update `CORS_ORIGIN` in Render environment variables
- Include your Vercel URL

### WebSocket connection fails
- Ensure same URL for API and WebSocket
- Check if HTTPS used on both

### Electron app can't connect
- Verify `.env` file exists in electron-app
- Check URLs don't have trailing slashes

### Supabase errors
- Verify SQL schema ran successfully
- Check API keys are correct
- Ensure RLS policies are set up

## 💰 Cost Breakdown

| Service | Free Tier | What You Get |
|---------|-----------|--------------|
| Render.com | 750 hrs/month | Backend hosting (sleeps after 15min) |
| Vercel | Unlimited | Frontend hosting, auto-deploy |
| Supabase | 500MB DB | Database + Auth + Storage |
| Cloudinary | 25 credits/month | ~25GB storage + bandwidth |
| **Total** | **$0/month** | ✅ Everything! |

## 📈 Scaling Beyond Free Tiers

When you outgrow free tiers:

1. **Render.com** ($7/month): No sleep, better performance
2. **Vercel** ($20/month): More bandwidth, better analytics
3. **Supabase** ($25/month): 8GB database, more storage
4. **Cloudinary** ($99/month): 300 credits

But for testing and small teams, free tiers are MORE than enough!

## 🎯 Next Steps

1. Customize the UI with your branding
2. Add more features (drawing, chat, etc.)
3. Set up analytics to track usage
4. Create user documentation
5. Share with your team!

---

Need help? Check the main README.md or create an issue!
