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
                <h2>MY CANDIDATES</h2>
                <button onClick={() => setShowModal(true)} className="manage-btn">
                    MANAGE
                </button>
            </div>

            <div className="candidates-preview">
                {candidates.slice(0, 5).map(c => (
                    <div key={c.mapping_id} className="candidate-preview-item">
                        <span className={`status-dot ${c.candidate.is_active ? 'active' : 'inactive'}`}></span>
                        <span className="candidate-name">{c.candidate.username}</span>
                    </div>
                ))}
                {candidates.length > 5 && (
                    <div className="more-candidates">+{candidates.length - 5} more</div>
                )}
                {candidates.length === 0 && (
                    <div className="no-candidates">No candidates yet</div>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Manage Candidates</h2>
                            <button onClick={() => setShowModal(false)} className="close-btn">×</button>
                        </div>

                        <div className="create-candidate-section">
                            <h3>Create New Candidate</h3>
                            <form onSubmit={createCandidate}>
                                <div className="form-row">
                                    <input
                                        type="text"
                                        placeholder="Username (optional - auto-generated)"
                                        value={newCandidate.username}
                                        onChange={e => setNewCandidate({ ...newCandidate, username: e.target.value })}
                                    />
                                    <input
                                        type="password"
                                        placeholder="Password (optional - auto-generated)"
                                        value={newCandidate.password}
                                        onChange={e => setNewCandidate({ ...newCandidate, password: e.target.value })}
                                    />
                                    <button type="submit" disabled={loading}>
                                        {loading ? 'Creating...' : 'Create'}
                                    </button>
                                </div>
                                <small>Leave blank to auto-generate credentials</small>
                            </form>
                        </div>

                        {createdCandidate && (
                            <div className="credentials-box">
                                <h4>✅ Candidate Created!</h4>
                                <div className="credentials-info">
                                    <p><strong>Username:</strong> {createdCandidate.username}</p>
                                    <p><strong>Password:</strong> {createdCandidate.plain_password}</p>
                                    <p><strong>Session:</strong> {createdCandidate.session_name}</p>
                                </div>
                                <div className="credentials-actions">
                                    <button onClick={copyCredentials} className="copy-btn">
                                        Copy Credentials
                                    </button>
                                    <button onClick={() => setCreatedCandidate(null)} className="dismiss-btn">
                                        Dismiss
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="candidates-list">
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
    );
}

export default CandidateManager;
