const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, requireOperator } = require('../middleware/auth');
const crypto = require('crypto');

// Supabase client with service role key
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// All operator routes require authentication and operator/admin role
router.use(authenticateToken);
router.use(requireOperator);

// Helper function to generate random credentials
const generateCredentials = () => {
    const username = `cand_${crypto.randomBytes(4).toString('hex')}`;
    const password = crypto.randomBytes(8).toString('hex');
    return { username, password };
};

// ==================== CANDIDATE MANAGEMENT ====================

// Create new candidate with auto-generated credentials and session
router.post('/candidates', async (req, res) => {
    try {
        const { username: customUsername, password: customPassword, email } = req.body;

        // Generate credentials if not provided
        const credentials = customUsername && customPassword
            ? { username: customUsername, password: customPassword }
            : generateCredentials();

        const candidateEmail = email || `${credentials.username}@godcomplex.local`;

        // Check if username exists
        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('username', credentials.username)
            .single();

        if (existing) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(credentials.password, 10);

        // Create candidate
        const { data: candidate, error: candidateError } = await supabase
            .from('users')
            .insert([
                {
                    username: credentials.username,
                    email: candidateEmail,
                    password: hashedPassword,
                    user_type: 'candidate',
                    created_by: req.user.id,
                    is_active: true
                }
            ])
            .select('id, username, email, user_type, is_active, created_at')
            .single();

        if (candidateError) throw candidateError;

        // Auto-create session for this candidate
        const sessionName = `Session for ${credentials.username}`;
        const { data: session, error: sessionError } = await supabase
            .from('sessions')
            .insert([
                {
                    name: sessionName,
                    creator_id: req.user.id,
                    text_content: '',
                    code_content: '',
                    image_url: null
                }
            ])
            .select()
            .single();

        if (sessionError) throw sessionError;

        // Create operator-candidate mapping
        const { data: mapping, error: mappingError } = await supabase
            .from('operator_candidates')
            .insert([
                {
                    operator_id: req.user.id,
                    candidate_id: candidate.id,
                    session_id: session.id
                }
            ])
            .select()
            .single();

        if (mappingError) throw mappingError;

        res.json({
            success: true,
            candidate: {
                ...candidate,
                plain_password: credentials.password, // Send plain password once for operator to share
                session_id: session.id,
                session_name: session.name
            }
        });
    } catch (error) {
        console.error('Create candidate error:', error);
        res.status(500).json({ error: 'Failed to create candidate' });
    }
});

// List operator's candidates
router.get('/candidates', async (req, res) => {
    try {
        const { data: mappings, error } = await supabase
            .from('operator_candidates')
            .select(`
        id,
        created_at,
        candidate:candidate_id (
          id,
          username,
          email,
          is_active,
          created_at
        ),
        session:session_id (
          id,
          name,
          updated_at
        )
      `)
            .eq('operator_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            candidates: mappings.map(m => ({
                mapping_id: m.id,
                candidate: m.candidate,
                session: m.session,
                created_at: m.created_at
            }))
        });
    } catch (error) {
        console.error('List candidates error:', error);
        res.status(500).json({ error: 'Failed to fetch candidates' });
    }
});

// Update candidate (change password, activate/deactivate)
router.put('/candidates/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { password, is_active } = req.body;

        // Verify this candidate belongs to the operator
        const { data: mapping } = await supabase
            .from('operator_candidates')
            .select('id')
            .eq('operator_id', req.user.id)
            .eq('candidate_id', id)
            .single();

        if (!mapping) {
            return res.status(403).json({ error: 'Not your candidate' });
        }

        const updates = {};
        if (password) updates.password = await bcrypt.hash(password, 10);
        if (typeof is_active === 'boolean') updates.is_active = is_active;

        const { data: candidate, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', id)
            .eq('user_type', 'candidate')
            .select('id, username, email, user_type, is_active')
            .single();

        if (error) throw error;

        res.json({
            success: true,
            candidate,
            new_password: password || undefined // Return new password if changed
        });
    } catch (error) {
        console.error('Update candidate error:', error);
        res.status(500).json({ error: 'Failed to update candidate' });
    }
});

// Delete candidate
router.delete('/candidates/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Verify this candidate belongs to the operator
        const { data: mapping } = await supabase
            .from('operator_candidates')
            .select('id')
            .eq('operator_id', req.user.id)
            .eq('candidate_id', id)
            .single();

        if (!mapping) {
            return res.status(403).json({ error: 'Not your candidate' });
        }

        // Delete candidate (mapping will cascade)
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id)
            .eq('user_type', 'candidate');

        if (error) throw error;

        res.json({
            success: true,
            message: 'Candidate deleted successfully'
        });
    } catch (error) {
        console.error('Delete candidate error:', error);
        res.status(500).json({ error: 'Failed to delete candidate' });
    }
});

// ==================== SESSION MANAGEMENT ====================

// List all sessions for operator's candidates
router.get('/sessions', async (req, res) => {
    try {
        const { data: mappings, error } = await supabase
            .from('operator_candidates')
            .select(`
        session:session_id (
          id,
          name,
          text_content,
          code_content,
          image_url,
          created_at,
          updated_at
        ),
        candidate:candidate_id (username, is_active)
      `)
            .eq('operator_id', req.user.id)
            .not('session_id', 'is', null);

        if (error) throw error;

        res.json({
            success: true,
            sessions: mappings.map(m => ({
                ...m.session,
                candidate_username: m.candidate?.username
            }))
        });
    } catch (error) {
        console.error('List sessions error:', error);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
});

// Reset candidate password
router.post('/candidates/:id/reset-password', async (req, res) => {
    try {
        const { id } = req.params;

        // Verify this candidate belongs to the operator
        const { data: mapping } = await supabase
            .from('operator_candidates')
            .select('id')
            .eq('operator_id', req.user.id)
            .eq('candidate_id', id)
            .single();

        if (!mapping) {
            return res.status(403).json({ error: 'Not your candidate' });
        }

        // Generate new password
        const newPassword = crypto.randomBytes(8).toString('hex');
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const { data: candidate, error } = await supabase
            .from('users')
            .update({ password: hashedPassword })
            .eq('id', id)
            .select('id, username')
            .single();

        if (error) throw error;

        res.json({
            success: true,
            username: candidate.username,
            new_password: newPassword
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

module.exports = router;
