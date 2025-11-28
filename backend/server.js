require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

// Import route handlers
const adminRoutes = require('./routes/admin');
const operatorRoutes = require('./routes/operator');
const candidateRoutes = require('./routes/candidate');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); // Serve static files (Admin Panel)

// Supabase Client (Service Role for Backend)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer for file uploads (memory storage)
const upload = multer({ storage: multer.memoryStorage() });

// In-memory session storage (for active sessions)
const activeSessions = new Map();

// JWT Helper Functions
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// ==================== AUTH ENDPOINTS ====================

// Register (DISABLED - only admins can create users)
app.post('/auth/register', async (req, res) => {
  return res.status(403).json({
    error: 'Public registration is disabled. Contact an administrator.'
  });
});

// Login
app.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Missing credentials' });
    }

    // Get user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if active
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account deactivated' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id);

    // Return user data based on user_type
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        user_type: user.user_type || 'candidate', // New field
        is_active: user.is_active
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Initialize first admin user (one-time use)
// Once an admin exists, this endpoint will be disabled
app.post('/auth/admin-init', async (req, res) => {
  try {
    // Check if any admin exists
    const { data: existingAdmin } = await supabase
      .from('users')
      .select('id')
      .eq('user_type', 'admin')
      .single();

    if (existingAdmin) {
      return res.status(403).json({ error: 'Admin already exists. Use admin panel to create more admins.' });
    }

    const { username, password, email } = req.body;

    if (!username || !password || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const { data: admin, error } = await supabase
      .from('users')
      .insert([
        {
          username,
          email,
          password: hashedPassword,
          user_type: 'admin',
          is_active: true
        }
      ])
      .select('id, username, email, user_type')
      .single();

    if (error) throw error;

    const token = generateToken(admin.id);

    res.json({
      success: true,
      message: 'Admin user created successfully',
      token,
      user: admin
    });
  } catch (error) {
    console.error('Admin init error:', error);
    res.status(500).json({ error: 'Failed to create admin' });
  }
});

// ==================== ROLE-BASED ROUTES ====================

// Mount route handlers
app.use('/admin', adminRoutes);
app.use('/operator', operatorRoutes);
app.use('/candidate', candidateRoutes);

// ==================== SESSION ENDPOINTS ====================

// Get or Create Session
app.post('/session/create', async (req, res) => {
  try {
    const { sessionName, creatorId } = req.body;

    const { data: session, error } = await supabase
      .from('sessions')
      .insert([
        {
          name: sessionName || 'Untitled Session',
          creator_id: creatorId,
          text_content: '',
          image_url: null
        }
      ])
      .select()
      .single();

    if (error) throw error;

    activeSessions.set(session.id, {
      ...session,
      connectedUsers: new Set()
    });

    res.json({ success: true, session });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Get Session
app.get('/session/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: session, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.json({ success: true, session });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(404).json({ error: 'Session not found' });
  }
});

// List Sessions
app.get('/sessions', async (req, res) => {
  try {
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, sessions });
  } catch (error) {
    console.error('List sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Update Text
app.post('/session/:id/update-text', async (req, res) => {
  try {
    const { id } = req.params;
    const { text, userId } = req.body;

    const { data: session, error } = await supabase
      .from('sessions')
      .update({ text_content: text, updated_at: new Date() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Broadcast to all connected clients
    io.to(id).emit('text-update', { text, userId, timestamp: new Date() });

    res.json({ success: true, session });
  } catch (error) {
    console.error('Update text error:', error);
    res.status(500).json({ error: 'Failed to update text' });
  }
});

// Upload Image
app.post('/session/:id/upload-image', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Upload to Cloudinary
    const uploadPromise = new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'overlay-collab' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    const result = await uploadPromise;

    // Update session
    const { data: session, error } = await supabase
      .from('sessions')
      .update({ image_url: result.secure_url, updated_at: new Date() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Broadcast to all connected clients
    io.to(id).emit('image-update', {
      imageUrl: result.secure_url,
      userId,
      timestamp: new Date()
    });

    res.json({ success: true, imageUrl: result.secure_url, session });
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// ==================== SOCKET.IO ====================

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join Session
  socket.on('join-session', async ({ sessionId, userId, username }) => {
    socket.join(sessionId);

    if (!activeSessions.has(sessionId)) {
      try {
        const { data: session } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (session) {
          activeSessions.set(sessionId, {
            ...session,
            connectedUsers: new Set()
          });
        }
      } catch (error) {
        console.error('Error loading session:', error);
      }
    }

    const session = activeSessions.get(sessionId);
    if (session) {
      session.connectedUsers.add({ userId, username, socketId: socket.id });
    }

    // Notify others
    socket.to(sessionId).emit('user-joined', { userId, username });

    // Send current session data
    if (session) {
      socket.emit('session-data', {
        text: session.text_content,
        code: session.code_content,
        imageUrl: session.image_url
      });
    }

    console.log(`User ${username} joined session ${sessionId}`);
  });

  // Real-time text update
  socket.on('text-update', async ({ sessionId, text, userId }) => {
    try {
      await supabase
        .from('sessions')
        .update({ text_content: text, updated_at: new Date() })
        .eq('id', sessionId);

      // Update in-memory
      const session = activeSessions.get(sessionId);
      if (session) {
        session.text_content = text;
      }

      // Broadcast to others in the room
      socket.to(sessionId).emit('text-update', { text, userId, timestamp: new Date() });
    } catch (error) {
      console.error('Socket text update error:', error);
    }
  });

  // Cursor position update (for collaborative awareness)
  socket.on('cursor-position', ({ sessionId, cursorStart, cursorEnd, userId, username }) => {
    // Broadcast cursor position to others in the room (not saved to DB)
    socket.to(sessionId).emit('cursor-position', {
      cursorStart,
      cursorEnd,
      userId,
      username,
      timestamp: new Date()
    });
  });

  // Text selection update (for collaborative awareness)
  socket.on('text-selection', ({ sessionId, selectionStart, selectionEnd, userId, username }) => {
    // Broadcast selection to others in the room (not saved to DB)
    socket.to(sessionId).emit('text-selection', {
      selectionStart,
      selectionEnd,
      userId,
      username,
      timestamp: new Date()
    });
  });

  // Real-time code update
  socket.on('code-update', async ({ sessionId, code, userId }) => {
    try {
      await supabase
        .from('sessions')
        .update({ code_content: code, updated_at: new Date() })
        .eq('id', sessionId);

      // Update in-memory
      const session = activeSessions.get(sessionId);
      if (session) {
        session.code_content = code;
      }

      // Broadcast to others in the room
      socket.to(sessionId).emit('code-update', { code, userId, timestamp: new Date() });
    } catch (error) {
      console.error('Socket code update error:', error);
    }
  });

  // Real-time image update
  socket.on('image-update', ({ sessionId, imageUrl, userId }) => {
    const session = activeSessions.get(sessionId);
    if (session) {
      session.image_url = imageUrl;
    }

    socket.to(sessionId).emit('image-update', { imageUrl, userId, timestamp: new Date() });
  });

  // Leave session
  socket.on('leave-session', ({ sessionId, userId, username }) => {
    socket.leave(sessionId);

    const session = activeSessions.get(sessionId);
    if (session) {
      session.connectedUsers = new Set(
        [...session.connectedUsers].filter(u => u.socketId !== socket.id)
      );
    }

    socket.to(sessionId).emit('user-left', { userId, username });
    console.log(`User ${username} left session ${sessionId}`);
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);

    // Remove from all sessions
    activeSessions.forEach((session, sessionId) => {
      const user = [...session.connectedUsers].find(u => u.socketId === socket.id);
      if (user) {
        session.connectedUsers.delete(user);
        io.to(sessionId).emit('user-left', {
          userId: user.userId,
          username: user.username
        });
      }
    });
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Bluetooth Device Manager API',
    status: 'online',
    version: '2.1.4'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
});
