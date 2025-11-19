import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import CodeEditor from '@uiw/react-textarea-code-editor';
import Split from 'react-split';
import './ControlPanel.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const WS_URL = process.env.REACT_APP_WS_URL || 'http://localhost:3001';

function ControlPanel({ user, token, onLogout }) {
  const [socket, setSocket] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [textContent, setTextContent] = useState('');
  const [codeContent, setCodeContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const lastCursorPosition = useRef({ start: -1, end: -1 });

  // Panel visibility
  const [visiblePanels, setVisiblePanels] = useState({
    text: true,
    code: true,
    image: true
  });

  // Initialize Socket.IO
  useEffect(() => {
    const newSocket = io(WS_URL, {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Connected to WebSocket');
    });

    newSocket.on('text-update', ({ text }) => {
      setTextContent(text);
    });

    newSocket.on('code-update', ({ code }) => {
      setCodeContent(code);
    });

    newSocket.on('image-update', ({ imageUrl }) => {
      setImageUrl(imageUrl);
    });

    newSocket.on('user-joined', ({ username }) => {
      setConnectedUsers(prev => [...prev, username]);
    });

    newSocket.on('user-left', ({ username }) => {
      setConnectedUsers(prev => prev.filter(u => u !== username));
    });

    newSocket.on('session-data', ({ text, code, imageUrl }) => {
      setTextContent(text || '');
      setCodeContent(code || '');
      setImageUrl(imageUrl || '');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Real-time cursor tracking (Google Docs style)
  useEffect(() => {
    if (!currentSession || !socket) return;

    // Poll cursor position every 50ms for smooth real-time updates
    const cursorInterval = setInterval(() => {
      if (textareaRef.current && document.activeElement === textareaRef.current) {
        const cursorStart = textareaRef.current.selectionStart;
        const cursorEnd = textareaRef.current.selectionEnd;

        // Only emit if cursor position changed
        if (cursorStart !== lastCursorPosition.current.start ||
            cursorEnd !== lastCursorPosition.current.end) {

          lastCursorPosition.current = { start: cursorStart, end: cursorEnd };

          if (cursorStart !== cursorEnd) {
            // There's a selection
            socket.emit('text-selection', {
              sessionId: currentSession.id,
              selectionStart: cursorStart,
              selectionEnd: cursorEnd,
              userId: user.id,
              username: user.username
            });
          } else {
            // Just cursor position, no selection
            socket.emit('cursor-position', {
              sessionId: currentSession.id,
              cursorStart: cursorStart,
              cursorEnd: cursorEnd,
              userId: user.id,
              username: user.username
            });
          }
        }
      }
    }, 50); // 50ms = 20 updates per second (smooth like Google Docs)

    return () => clearInterval(cursorInterval);
  }, [currentSession, socket, user]);

  // Load sessions
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const response = await axios.get(`${API_URL}/sessions`);
      if (response.data.success) {
        setSessions(response.data.sessions);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const createSession = async () => {
    const sessionName = prompt('Enter session name:');
    if (!sessionName) return;

    try {
      const response = await axios.post(`${API_URL}/session/create`, {
        sessionName,
        creatorId: user.id
      });

      if (response.data.success) {
        setSessions([response.data.session, ...sessions]);
        joinSession(response.data.session);
      }
    } catch (error) {
      console.error('Failed to create session:', error);
      alert('Failed to create session');
    }
  };

  const joinSession = (session) => {
    if (currentSession && socket) {
      socket.emit('leave-session', {
        sessionId: currentSession.id,
        userId: user.id,
        username: user.username
      });
    }

    setCurrentSession(session);
    setTextContent(session.text_content || '');
    setCodeContent(session.code_content || '');
    setImageUrl(session.image_url || '');
    setConnectedUsers([]);

    if (socket) {
      socket.emit('join-session', {
        sessionId: session.id,
        userId: user.id,
        username: user.username
      });
    }
  };

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setTextContent(newText);

    if (socket && currentSession) {
      socket.emit('text-update', {
        sessionId: currentSession.id,
        text: newText,
        userId: user.id
      });
    }
  };

  const handleCodeChange = (e) => {
    const newCode = e.target.value;
    setCodeContent(newCode);

    if (socket && currentSession) {
      socket.emit('code-update', {
        sessionId: currentSession.id,
        code: newCode,
        userId: user.id
      });
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    setUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('userId', user.id);

      const response = await axios.post(
        `${API_URL}/session/${currentSession.id}/upload-image`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        setImageUrl(response.data.imageUrl);
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const clearImage = () => {
    setImageUrl('');
    if (socket && currentSession) {
      socket.emit('image-update', {
        sessionId: currentSession.id,
        imageUrl: '',
        userId: user.id
      });
    }
  };

  const copySessionId = () => {
    if (currentSession) {
      navigator.clipboard.writeText(currentSession.id);
      alert('Session ID copied to clipboard!');
    }
  };

  const togglePanel = (panel) => {
    setVisiblePanels(prev => ({
      ...prev,
      [panel]: !prev[panel]
    }));
  };

  // Get active panels
  const activePanels = [];
  if (visiblePanels.text) activePanels.push('text');
  if (visiblePanels.code) activePanels.push('code');
  if (visiblePanels.image) activePanels.push('image');

  return (
    <div className="control-panel">
      <header className="header">
        <div className="header-left">
          <h1>OVERLAY CONTROL</h1>
          <span className="user-badge">{user.username.toUpperCase()}</span>
        </div>
        <div className="header-right">
          {currentSession && (
            <div className="session-info">
              <div className="session-details">
                <span className="session-name">{currentSession.name}</span>
                <span className="users-count">{connectedUsers.length} connected</span>
              </div>
              <div className="session-id-container">
                <span className="session-id-label">SESSION ID</span>
                <code className="session-id">{currentSession.id}</code>
                <button onClick={copySessionId} className="copy-btn">
                  COPY
                </button>
              </div>
            </div>
          )}
          <button onClick={onLogout} className="logout-btn">LOGOUT</button>
        </div>
      </header>

      <div className="main-content">
        <aside className="sidebar">
          <div className="sidebar-header">
            <h2>SESSIONS</h2>
            <button onClick={createSession} className="create-btn">NEW</button>
          </div>
          <div className="sessions-list">
            {sessions.map(session => (
              <div
                key={session.id}
                className={`session-item ${currentSession?.id === session.id ? 'active' : ''}`}
                onClick={() => joinSession(session)}
              >
                <div className="session-name">{session.name}</div>
                <div className="session-time">
                  {new Date(session.updated_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div className="workspace">
          {!currentSession ? (
            <div className="empty-state">
              <h2>NO SESSION SELECTED</h2>
              <p>Create or select a session</p>
              <button onClick={createSession} className="create-session-btn">
                NEW SESSION
              </button>
            </div>
          ) : (
            <>
              <div className="panel-controls">
                <div className="panel-toggles">
                  <button
                    className={`toggle-btn ${visiblePanels.text ? 'active' : ''}`}
                    onClick={() => togglePanel('text')}
                  >
                    TEXT
                  </button>
                  <button
                    className={`toggle-btn ${visiblePanels.code ? 'active' : ''}`}
                    onClick={() => togglePanel('code')}
                  >
                    CODE
                  </button>
                  <button
                    className={`toggle-btn ${visiblePanels.image ? 'active' : ''}`}
                    onClick={() => togglePanel('image')}
                  >
                    IMAGE
                  </button>
                </div>
              </div>

              {activePanels.length === 0 ? (
                <div className="empty-state">
                  <h2>NO PANELS SELECTED</h2>
                  <p>Select at least one panel above</p>
                </div>
              ) : activePanels.length === 1 ? (
                <div className="single-panel-container">
                  {visiblePanels.text && (
                    <div className="editor-panel" key="text">
                      <div className="panel-header">
                        <h3>TEXT</h3>
                      </div>
                      <textarea
                        ref={textareaRef}
                        className="text-editor"
                        value={textContent}
                        onChange={handleTextChange}
                      />
                    </div>
                  )}

                  {visiblePanels.code && (
                    <div className="editor-panel code-panel" key="code">
                      <div className="panel-header">
                        <h3>CODE</h3>
                      </div>
                      <CodeEditor
                        value={codeContent}
                        language="js"
                        placeholder=""
                        onChange={handleCodeChange}
                        padding={20}
                        className="code-editor"
                        style={{
                          fontSize: 14,
                          backgroundColor: '#1e1e1e',
                          fontFamily: 'ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace',
                          minHeight: '100%'
                        }}
                      />
                    </div>
                  )}

                  {visiblePanels.image && (
                    <div className="image-panel" key="image">
                      <div className="panel-header">
                        <h3>IMAGE</h3>
                      </div>
                      <div className="image-content">
                        {imageUrl ? (
                          <div className="image-preview">
                            <img src={imageUrl} alt="Overlay" />
                            <button onClick={clearImage} className="clear-image-btn">
                              CLEAR
                            </button>
                          </div>
                        ) : (
                          <div className="image-upload-area">
                            <input
                              type="file"
                              ref={fileInputRef}
                              onChange={handleImageUpload}
                              accept="image/*"
                              style={{ display: 'none' }}
                            />
                            <div
                              className="upload-box"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              {uploadingImage ? (
                                <div className="uploading">
                                  <div className="spinner"></div>
                                  <p>UPLOADING</p>
                                </div>
                              ) : (
                                <>
                                  <p>UPLOAD</p>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Split
                  key={`horizontal-${activePanels.join('-')}`}
                  className="editor-container"
                  direction="horizontal"
                  sizes={activePanels.map(() => 100 / activePanels.length)}
                  minSize={100}
                  gutterSize={10}
                  gutterStyle={() => ({
                    backgroundColor: '#000',
                    cursor: 'col-resize'
                  })}
                >
                  {visiblePanels.text && (
                    <div className="editor-panel" key="text">
                      <div className="panel-header">
                        <h3>TEXT</h3>
                      </div>
                      <textarea
                        ref={textareaRef}
                        className="text-editor"
                        value={textContent}
                        onChange={handleTextChange}
                      />
                    </div>
                  )}

                  {visiblePanels.code && (
                    <div className="editor-panel code-panel" key="code">
                      <div className="panel-header">
                        <h3>CODE</h3>
                      </div>
                      <CodeEditor
                        value={codeContent}
                        language="js"
                        placeholder=""
                        onChange={handleCodeChange}
                        padding={20}
                        className="code-editor"
                        style={{
                          fontSize: 14,
                          backgroundColor: '#1e1e1e',
                          fontFamily: 'ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace',
                          minHeight: '100%'
                        }}
                      />
                    </div>
                  )}

                  {visiblePanels.image && (
                    <div className="image-panel" key="image">
                      <div className="panel-header">
                        <h3>IMAGE</h3>
                      </div>
                      <div className="image-content">
                        {imageUrl ? (
                          <div className="image-preview">
                            <img src={imageUrl} alt="Overlay" />
                            <button onClick={clearImage} className="clear-image-btn">
                              CLEAR
                            </button>
                          </div>
                        ) : (
                          <div className="image-upload-area">
                            <input
                              type="file"
                              ref={fileInputRef}
                              onChange={handleImageUpload}
                              accept="image/*"
                              style={{ display: 'none' }}
                            />
                            <div
                              className="upload-box"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              {uploadingImage ? (
                                <div className="uploading">
                                  <div className="spinner"></div>
                                  <p>UPLOADING</p>
                                </div>
                              ) : (
                                <>
                                  <p>UPLOAD</p>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Split>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ControlPanel;
