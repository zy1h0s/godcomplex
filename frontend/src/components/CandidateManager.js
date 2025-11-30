import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './CandidateManager.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function CandidateManager({ token, userType }) {
    const [candidates, setCandidates] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [newCandidate, setNewCandidate] = useState({ username: '', password: '' });
    const [createdCandidate, setCreatedCandidate] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (userType === 'operator') {
            fetchCandidates();
        }
    }, [userType]);

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

    const createCandidate = async (e) => {
        e.preventDefault();
        setLoading(true);
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
            }
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to create candidate');
        } finally {
            setLoading(false);
        }
    };

    const deleteCandidate = async (candidateId) => {
        if (!window.confirm('Delete this candidate? This will also delete their session.')) return;

        try {
            await axios.delete(`${API_URL}/operator/candidates/${candidateId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchCandidates();
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

    const copyCredentials = () => {
        if (createdCandidate) {
            navigator.clipboard.writeText(
                `Username: ${createdCandidate.username}\nPassword: ${createdCandidate.plain_password}`
            );
            alert('Credentials copied to clipboard!');
        }
    };

    if (userType !== 'operator') return null;

    return (
        <div className="candidate-manager">
            <div className="candidate-section-header">
                <h2>SESSIONS</h2>
                <button onClick={() => setShowModal(true)} className="manage-btn">
                    NEW
                </button>
            </div>

            <div className="candidates-preview">
                {candidates.slice(0, 5).map(c => (
                    <div key={c.mapping_id} className="candidate-preview-item">
                        <div className="preview-info">
                            <span className={`status-dot ${c.candidate.is_active ? 'active' : 'inactive'}`}></span>
                            <span className="candidate-name">{c.session?.name || c.candidate.username}</span>
                        </div>
                        <button
                            className="mini-delete-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                deleteCandidate(c.candidate.id);
                            }}
                            title="Delete Session"
                        >
                            ×
                        </button>
                    </div>
                ))}
                {candidates.length > 5 && (
                    <div className="more-candidates">+{candidates.length - 5} more</div>
                )}
                {candidates.length === 0 && (
                    <div className="no-candidates">No active sessions</div>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>New Session</h2>
                            <button onClick={() => setShowModal(false)} className="close-btn">×</button>
                        </div>

                        <div className="create-candidate-section">
                            <form onSubmit={createCandidate}>
                                <div className="form-group">
                                    <label>Username (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="Auto-generated if empty"
                                        value={newCandidate.username}
                                        onChange={e => setNewCandidate({ ...newCandidate, username: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Password (Optional)</label>
                                    <input
                                        type="password"
                                        placeholder="Auto-generated if empty"
                                        value={newCandidate.password}
                                        onChange={e => setNewCandidate({ ...newCandidate, password: e.target.value })}
                                    />
                                </div>
                                <button type="submit" disabled={loading} className="create-submit-btn">
                                    {loading ? 'Creating...' : 'Create Session'}
                                </button>
                            </form>
                        </div>

                        {createdCandidate && (
                            <div className="credentials-box">
                                <h4>✅ Session Created!</h4>
                                <div className="credentials-info">
                                    <div className="cred-row">
                                        <span className="label">Username:</span>
                                        <span className="value">{createdCandidate.username}</span>
                                    </div>
                                    <div className="cred-row">
                                        <span className="label">Password:</span>
                                        <span className="value">{createdCandidate.plain_password}</span>
                                    </div>
                                    <div className="cred-row">
                                        <span className="label">Session ID:</span>
                                        <span className="value">{createdCandidate.session_id}</span>
                                    </div>
                                </div>
                                <div className="credentials-actions">
                                    <button onClick={copyCredentials} className="copy-btn">
                                        Copy Details
                                    </button>
                                    <button onClick={() => setCreatedCandidate(null)} className="dismiss-btn">
                                        Done
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="candidates-list">
                            <h3>Active Sessions ({candidates.length})</h3>
                            <div className="session-list-container">
                                {candidates.map(c => (
                                    <div key={c.mapping_id} className="session-list-item">
                                        <div className="session-info">
                                            <span className="session-name">{c.session?.name || c.candidate.username}</span>
                                            <span className="candidate-username">User: {c.candidate.username}</span>
                                        </div>
                                        <div className="session-actions">
                                            <button
                                                onClick={() => deleteCandidate(c.candidate.id)}
                                                className="delete-icon-btn"
                                                title="Delete Session"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CandidateManager;
