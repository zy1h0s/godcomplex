# Master Admin System - Setup Guide

This guide will help you set up the Admin/Operator/Candidate hierarchy system.

## System Architecture

```
ADMIN (creates) → OPERATOR (manages) → CANDIDATE (uses Electron app)
                      ↓
                  SESSIONS (auto-created & linked)
```

## Prerequisites

Before starting, make sure you have:
- Supabase account with access to project `kfcertiewjczoxekmkib`
- Cloudinary account (for image uploads)
- Node.js 16+ installed

---

## Step 1: Configure Environment Variables

### Backend Configuration

1. Navigate to `backend/` folder
2. Copy `.env.template` to `.env`:
   ```bash
   cp .env.template .env
   ```

3. Get your Supabase credentials:
   - Go to https://supabase.com/dashboard/project/kfcertiewjczoxekmkib
   - Click **Settings** → **API**
   - Copy:
     - `URL` → `SUPABASE_URL`
     - `anon/public` key → `SUPABASE_ANON_KEY`
     - `service_role` key → `SUPABASE_SERVICE_KEY`

4. Generate JWT secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
   Copy the output to `JWT_SECRET`

5. Add your Cloudinary credentials from https://cloudinary.com/console

---

## Step 2: Run Database Migration

1. Go to https://supabase.com/dashboard/project/kfcertiewjczoxekmkib/editor
2. Copy the contents of `backend/migrations/001_master_admin_system.sql`
3. Paste into the SQL Editor
4. Click **RUN**
5. Verify the migration succeeded by checking the output

---

## Step 3: Create Initial Admin User

After migration, you need to create the first admin user.

**Option A: Using Supabase SQL Editor**
```sql
INSERT INTO users (username, email, password, user_type, is_active)
VALUES (
  'admin',
  'admin@godcomplex.com',
  '$2a$10$...',  -- You'll hash this below
  'admin',
  true
);
```

**Option B: Using the backend API (temporary workaround)**

1. Start the backend server:
   ```bash
   cd backend
   npm install
   npm start
   ```

2. Use a tool like Thunder Client or curl:
   ```bash
   curl -X POST http://localhost:3001/auth/admin-init \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"YourSecurePassword123","email":"admin@godcomplex.com"}'
   ```

3. Save the credentials securely!

---

## Step 4: Test the System

### Test Admin Login
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"YourSecurePassword123"}'
```

### Test Creating an Operator
```bash
curl -X POST http://localhost:3001/admin/operators \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"username":"operator1","password":"oppass123","email":"op1@test.com"}'
```

---

## Step 5: Deploy Backend

### Deploy to Render

1. Go to https://dashboard.render.com
2. Select your `godcomplex` service
3. Go to **Environment** tab
4. Add all environment variables from your `.env` file
5. Click **Save Changes**
6. Render will automatically redeploy

---

## Step 6: Access the System

### Admin Panel
- URL: `https://godcomplex.onrender.com/admin` (will be created)
- Login with admin credentials

### Operator Web Interface
- URL: `https://godcomplex.vercel.app`
- Login as operator
- Create candidates from the "My Candidates" section

### Candidate (Electron App)
- Distribute Electron app to candidates
- Provide them with credentials created by operator
- They login and auto-connect to their assigned session

---

## User Roles & Permissions

### Admin
- ✅ Create/edit/delete operators
- ✅ View all candidates across all operators
- ✅ Access dashboard statistics
- ✅ Deactivate any account
- ✅ View all sessions

### Operator
- ✅ Create/edit/delete their own candidates
- ✅ View their own candidates and sessions
- ✅ Reset candidate passwords
- ❌ Cannot see other operators' candidates
- ❌ Cannot create operators

### Candidate
- ✅ Login to Electron app only
- ✅ Auto-connect to assigned session
- ❌ Cannot register
- ❌ Cannot access web interface

---

## Troubleshooting

### Migration Failed
- Check Supabase logs
- Ensure you have proper permissions
- Drop tables and retry if needed

### Can't Create Admin User
- Verify JWT_SECRET is set
- Check Supabase service role key is correct
- Ensure `is_active` column exists

### Candidate Can't Login
- Verify they're using correct credentials
- Check if account is active in database
- Ensure operator-candidate mapping exists

---

## Next Steps

1. ✅ Run database migration
2. ✅ Create admin user
3. ✅ Test admin login
4. ⏳ Create admin panel UI
5. ⏳ Update frontend for operator candidate management
6. ⏳ Update Electron app for login-only mode

---

## Support

If you encounter issues:
1. Check backend logs: `npm start` in `backend/` folder
2. Check Supabase logs in dashboard
3. Verify all environment variables are set correctly
