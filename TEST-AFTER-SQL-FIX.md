# ✅ After Running the SQL Fix

## Test Registration

Run this in Command Prompt to test if registration works:

```bash
curl -X POST http://localhost:3001/auth/register -H "Content-Type: application/json" -d "{\"username\":\"operator1\",\"email\":\"test@test.com\",\"password\":\"pass123\",\"role\":\"operator\"}"
```

**Expected Output:**
```json
{"success":true,"token":"...","user":{"id":"...","username":"operator1","email":"test@test.com","role":"operator"}}
```

If you see this, registration is WORKING! ✅

## Test in Browser

1. Make sure backend is running:
   ```bash
   cd "c:\Users\ff\Downloads\God complex\overlay-collab-system\backend"
   npm start
   ```

2. Start frontend:
   ```bash
   cd "c:\Users\ff\Downloads\God complex\overlay-collab-system\frontend"
   npm start
   ```

3. In browser (http://localhost:3000):
   - Click "Register"
   - Username: `operator1`
   - Email: `test@test.com`
   - Password: `pass123`
   - Role: **Operator**
   - Click Register
   - **Should work now!** ✅

## Test Electron Stealth Mode

1. Start electron app:
   ```bash
   cd "c:\Users\ff\Downloads\God complex\overlay-collab-system\electron-app"
   npm start
   ```

2. Register viewer account
3. Join a session
4. Check:
   - ❌ Should NOT appear in taskbar
   - ❌ Should NOT have shadow
   - ❌ Should NOT be focusable
   - ✅ Should be transparent
   - ✅ Should be always on top
   - ✅ Should work across all desktops

**Note**: Some advanced screen recording software (OBS with specific settings) may still capture it - this is an OS/driver level limitation.
