
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

  // Candidate Management State (Operator Only)
  const [candidates, setCandidates] = useState([]);
  const [showCandidatesModal, setShowCandidatesModal] = useState(false);
  const [newCandidate, setNewCandidate] = useState({ username: '', password: '' });
  const [createdCandidate, setCreatedCandidate] = useState(null); // To show credentials after creation

  // Panel visibility
  const [visiblePanels, setVisiblePanels] = useState({
    text: true,
    code: true,
    image: true
  });

  // Sidebar and layout controls
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [layoutDirection, setLayoutDirection] = useState('horizontal'); // 'horizontal' or 'vertical'

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

  // Fetch candidates for operators
  useEffect(() => {
    if (user.user_type === 'operator') {
      fetchCandidates();
    }
  }, [user]);

  const fetchCandidates = async () => {
    try {
      const response = await axios.get(`${API_URL}/operator/candidates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setCandidates(response.data.candidates);
      }
    } catch (error) {
      console.error('Failed to fetch candidates:', error);
    }
  };

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

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob && currentSession) {
          setUploadingImage(true);
          try {
            const formData = new FormData();
            formData.append('image', blob);
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
            console.error('Failed to upload pasted image:', error);
            alert('Failed to upload pasted image');
          } finally {
            setUploadingImage(false);
          }
        }
        break;
      }
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

  // Candidate Management Functions
  const createCandidate = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        `${API_URL}/operator/candidates`,
        newCandidate,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setCreatedCandidate(response.data.candidate);
        setNewCandidate({ username: '', password: '' });
        fetchCandidates();
        loadSessions();
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create candidate');
    }
  };

  const deleteCandidate = async (candidateId) => {
    if (!window.confirm('Are you sure? This will delete the candidate and their session.')) return;
    try {
      await axios.delete(`${API_URL}/operator/candidates/${candidateId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchCandidates();
      loadSessions();
    } catch (error) {
      alert('Failed to delete candidate');
    }
  };

  const toggleCandidateStatus = async (candidateId, isActive) => {
    try {
      await axios.put(
        `${API_URL}/operator/candidates/${candidateId}`,
        { is_active: isActive },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchCandidates();
    } catch (error) {
      alert('Failed to update status');
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

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleLayoutDirection = () => {
    setLayoutDirection(prev => prev === 'horizontal' ? 'vertical' : 'horizontal');
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
          <h1>Octonix solutions™️</h1>
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

      {/* Sidebar Toggle Button */}
      <button
        className="sidebar-toggle-btn"
        onClick={toggleSidebar}
        title={sidebarCollapsed ? "Show Sessions" : "Hide Sessions"}
      >
        {sidebarCollapsed ? '☰' : '✕'}
      </button>

      <div className="main-content">
        <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
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

          {user.user_type === 'operator' && (
            <div className="candidates-section">
              <div className="sidebar-header">
                <h2>MY CANDIDATES</h2>
                <button onClick={() => setShowCandidatesModal(true)} className="create-btn">MANAGE</button>
              </div>
              <div className="candidates-list-preview">
                {candidates.slice(0, 5).map(c => (
                  <div key={c.mapping_id} className="candidate-item-preview">
                    <span className={`status-dot ${c.candidate.is_active ? 'active' : 'inactive'}`}></span>
                    {c.candidate.username}
                  </div>
                ))}
                {candidates.length > 5 && <div className="more-candidates">+{candidates.length - 5} more</div>}
              </div>
            </div>
          )}
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
                <div className="layout-controls">
                  <button
                    className="layout-toggle-btn"
                    onClick={toggleLayoutDirection}
                    title={`Switch to ${layoutDirection === 'horizontal' ? 'vertical' : 'horizontal'} layout`}
                  >
                    {layoutDirection === 'horizontal' ? '⬍' : '⬌'}
                  </button>
                </div>
              </div>

              {activePanels.length === 0 ? (
                <div className="empty-state">
                  <h2>NO PANELS SELECTED</h2>
                  <p>Select one or more button from code/text/image </p>
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
                          backgroundColor: '#ffffff',
                          fontFamily: 'ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace',
                          minHeight: '100%'
                        }}
                      />
                    </div>
                  )}

                  {visiblePanels.image && (
                    <div className="image-panel" key="image" onPaste={handlePaste} tabIndex="0">
                      <div className="panel-header">
                        <h3>IMAGE</h3>
                      </div>
                      <div className="image-content">
                        {imageUrl ? (
                          <div className="image-preview">
                            <div className="image-scroll-container">
                              <img src={imageUrl} alt="Overlay" />
                            </div>
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
                                  <p>UPLOAD or PASTE (Ctrl+V)</p>
                                  <span>Click to upload or paste image from clipboard</span>
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
                  key={`split-${layoutDirection}-${activePanels.join('-')}`}
                  className={`editor-container ${layoutDirection}`}
                  direction={layoutDirection}
                  sizes={activePanels.map(() => 100 / activePanels.length)}
                  minSize={150}
                  gutterSize={15}
                  snapOffset={30}
                  dragInterval={1}
                  gutterAlign="center"
                  onDragStart={() => console.log('🎯 Drag started!')}
                  onDrag={(sizes) => console.log('🔄 Dragging... sizes:', sizes)}
                  onDragEnd={(sizes) => console.log('✅ Drag ended! Final sizes:', sizes)}
                  gutterStyle={() => {
                    console.log('🎨 Gutter style applied');
                    return {
                      backgroundColor: '#000',
                      cursor: layoutDirection === 'horizontal' ? 'col-resize' : 'row-resize',
                      borderLeft: layoutDirection === 'horizontal' ? '1px solid #222' : 'none',
                      borderRight: layoutDirection === 'horizontal' ? '1px solid #222' : 'none',
                      borderTop: layoutDirection === 'vertical' ? '1px solid #222' : 'none',
                      borderBottom: layoutDirection === 'vertical' ? '1px solid #222' : 'none'
                    };
                  }}
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
                          backgroundColor: '#ffffff',
                          fontFamily: 'ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace',
                          minHeight: '100%'
                        }}
                      />
                    </div>
                  )}

                  {visiblePanels.image && (
                    <div className="image-panel" key="image" onPaste={handlePaste} tabIndex="0">
                      <div className="panel-header">
                        <h3>IMAGE</h3>
                      </div>
                      <div className="image-content">
                        {imageUrl ? (
                          <div className="image-preview">
                            <div className="image-scroll-container">
                              <img src={imageUrl} alt="Overlay" />
                            </div>
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
                                  <p>UPLOAD or PASTE (Ctrl+V)</p>
                                  <span>Click to upload or paste image from clipboard</span>
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
      </div >

      {/* Candidate Management Modal */}
      {
        showCandidatesModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2>Manage Candidates</h2>
                <button onClick={() => setShowCandidatesModal(false)} className="close-btn">×</button>
              </div>

              <div className="create-candidate-form">
                <h3>Create New Candidate</h3>
                <form onSubmit={createCandidate}>
                  <div className="form-row">
                    <input
                      type="text"
                      placeholder="Username (optional)"
                      value={newCandidate.username}
                      onChange={e => setNewCandidate({ ...newCandidate, username: e.target.value })}
                    />
                    <input
                      type="password"
                      placeholder="Password (optional)"
                      value={newCandidate.password}
                      onChange={e => setNewCandidate({ ...newCandidate, password: e.target.value })}
                    />
                    <button type="submit">Create</button>
                  </div>
                  <small>Leave blank to auto-generate credentials</small>
                </form>
              </div>

              {createdCandidate && (
                <div className="credentials-box">
                  <h4>Candidate Created!</h4>
                  <p><strong>Username:</strong> {createdCandidate.username}</p>
                  <p><strong>Password:</strong> {createdCandidate.plain_password}</p>
                  <p><strong>Session:</strong> {createdCandidate.session_name}</p>
                  <button onClick={() => {
                    navigator.clipboard.writeText(
                      `Username: ${createdCandidate.username}\nPassword: ${createdCandidate.plain_password}`
                    );
                    alert('Copied to clipboard!');
                  }}>Copy Credentials</button>
                  <button onClick={() => setCreatedCandidate(null)} className="dismiss-btn">Dismiss</button>
                </div>
              )}

              <div className="candidates-list-full">
                <h3>My Candidates ({candidates.length})</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Session</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map(c => (
                      <tr key={c.mapping_id}>
                        <td>{c.candidate.username}</td>
                        <td>{c.session?.name || 'No Session'}</td>
                        <td>
                          <span className={`status-badge ${c.candidate.is_active ? 'active' : 'inactive'}`}>
                            {c.candidate.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => toggleCandidateStatus(c.candidate.id, !c.candidate.is_active)}
                            className="action-btn"
                          >
                            {c.candidate.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => deleteCandidate(c.candidate.id)}
                            className="action-btn delete"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
    </div>
    </div >
  );
}

export default ControlPanel;
