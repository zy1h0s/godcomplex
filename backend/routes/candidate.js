const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, requireCandidate } = require('../middleware/auth');

// Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// All candidate routes require authentication and candidate role
router.use(authenticateToken);
router.use(requireCandidate);

// Get candidate's assigned session
router.get('/session', async (req, res) => {
    try {
        // Find the mapping for this candidate
        const { data: mapping, error } = await supabase
            .from('operator_candidates')
            .select(`
        session_id,
        session:session_id (
          id,
          name,
          text_content,
          code_content,
          image_url,
          created_at,
          updated_at
        ),
        operator:operator_id (username, email)
      `)
            .eq('candidate_id', req.user.id)
            .single();

        if (error || !mapping) {
            return res.status(404).json({ error: 'No session assigned' });
        }

        res.json({
            success: true,
            session: mapping.session,
            operator: mapping.operator
        });
    } catch (error) {
        console.error('Get candidate session error:', error);
        res.status(500).json({ error: 'Failed to fetch session' });
    }
});

// Get candidate info
router.get('/info', async (req, res) => {
    try {
        res.json({
            success: true,
            user: {
                id: req.user.id,
                username: req.user.username,
                email: req.user.email,
                user_type: req.user.user_type,
                is_active: req.user.is_active
            }
        });
    } catch (error) {
        console.error('Get candidate info error:', error);
        res.status(500).json({ error: 'Failed to fetch user info' });
    }
});

module.exports = router;
