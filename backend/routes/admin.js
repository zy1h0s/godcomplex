const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Supabase client with service role key for admin operations
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// ==================== OPERATOR MANAGEMENT ====================

// Create new operator
router.post('/operators', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if username exists
        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('username', username)
            .single();

        if (existing) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create operator
        const { data: operator, error } = await supabase
            .from('users')
            .insert([
                {
                    username,
                    email,
                    password: hashedPassword,
                    user_type: 'operator',
                    created_by: req.user.id,
                    is_active: true
                }
            ])
            .select('id, username, email, user_type, is_active, created_at')
            .single();

        if (error) throw error;

        res.json({
            success: true,
            operator
        });
    } catch (error) {
        console.error('Create operator error:', error);
        res.status(500).json({ error: 'Failed to create operator' });
    }
});

// List all operators
router.get('/operators', async (req, res) => {
    try {
        const { data: operators, error } = await supabase
            .from('users')
            .select(`
        id,
        username,
        email,
        user_type,
        is_active,
        created_at,
        created_by
      `)
            .eq('user_type', 'operator')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Get candidate counts for each operator
        const operatorIds = operators.map(op => op.id);
        const { data: candidateCounts } = await supabase
            .from('operator_candidates')
            .select('operator_id')
            .in('operator_id', operatorIds);

        const countsMap = {};
        candidateCounts?.forEach(row => {
            countsMap[row.operator_id] = (countsMap[row.operator_id] || 0) + 1;
        });

        const operatorsWithCounts = operators.map(op => ({
            ...op,
            candidate_count: countsMap[op.id] || 0
        }));

        res.json({
            success: true,
            operators: operatorsWithCounts
        });
    } catch (error) {
        console.error('List operators error:', error);
        res.status(500).json({ error: 'Failed to fetch operators' });
    }
});

// Update operator
router.put('/operators/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, password, is_active } = req.body;

        const updates = {};
        if (username) updates.username = username;
        if (email) updates.email = email;
        if (password) updates.password = await bcrypt.hash(password, 10);
        if (typeof is_active === 'boolean') updates.is_active = is_active;

        const { data: operator, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', id)
            .eq('user_type', 'operator')
            .select('id, username, email, user_type, is_active, created_at')
            .single();

        if (error) throw error;

        res.json({
            success: true,
            operator
        });
    } catch (error) {
        console.error('Update operator error:', error);
        res.status(500).json({ error: 'Failed to update operator' });
    }
});

// Delete operator (cascades to candidates and sessions)
router.delete('/operators/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id)
            .eq('user_type', 'operator');

        if (error) throw error;

        res.json({
            success: true,
            message: 'Operator deleted successfully'
        });
    } catch (error) {
        console.error('Delete operator error:', error);
        res.status(500).json({ error: 'Failed to delete operator' });
    }
});

// ==================== DASHBOARD STATS ====================

// Get admin dashboard statistics
router.get('/dashboard', async (req, res) => {
    try {
        // Get counts
        const { count: operatorCount } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('user_type', 'operator');

        const { count: candidateCount } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('user_type', 'candidate');

        const { count: sessionCount } = await supabase
            .from('sessions')
            .select('*', { count: 'exact', head: true });

        const { count: activeCount } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true);

        // Get recent activity (last 10 sessions)
        const { data: recentSessions } = await supabase
            .from('sessions')
            .select(`
        id,
        name,
        created_at,
        updated_at,
        creator:creator_id (username, user_type)
      `)
            .order('updated_at', { ascending: false })
            .limit(10);

        res.json({
            success: true,
            stats: {
                operators: operatorCount || 0,
                candidates: candidateCount || 0,
                sessions: sessionCount || 0,
                active_users: activeCount || 0
            },
            recent_activity: recentSessions || []
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

// ==================== ALL CANDIDATES VIEW ====================

// View all candidates across all operators
router.get('/candidates', async (req, res) => {
    try {
        const { data: mappings, error } = await supabase
            .from('operator_candidates')
            .select(`
        id,
        created_at,
        operator:operator_id (id, username, email),
        candidate:candidate_id (id, username, email, is_active, created_at),
        session:session_id (id, name)
      `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            candidates: mappings
        });
    } catch (error) {
        console.error('List all candidates error:', error);
        res.status(500).json({ error: 'Failed to fetch candidates' });
    }
});

// Deactivate/activate any candidate
router.patch('/candidates/:id/toggle-active', async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;

        const { data: candidate, error } = await supabase
            .from('users')
            .update({ is_active })
            .eq('id', id)
            .eq('user_type', 'candidate')
            .select('id, username, is_active')
            .single();

        if (error) throw error;

        res.json({
            success: true,
            candidate
        });
    } catch (error) {
        console.error('Toggle candidate active error:', error);
        res.status(500).json({ error: 'Failed to update candidate' });
    }
});

module.exports = router;
