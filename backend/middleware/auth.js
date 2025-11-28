// Middleware for role-based access control
const jwt = require('jsonwebtoken');

// Verify JWT token and attach user to request
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({ error: 'Access token required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch user from database
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY // Use service key for admin operations
        );

        const { data: user, error } = await supabase
            .from('users')
            .select('id, username, email, user_type, is_active, created_by')
            .eq('id', decoded.userId)
            .single();

        if (error || !user) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        if (!user.is_active) {
            return res.status(403).json({ error: 'Account deactivated' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};

// Require admin role
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.user_type !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    next();
};

// Require operator or admin role
const requireOperator = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (!['operator', 'admin'].includes(req.user.user_type)) {
        return res.status(403).json({ error: 'Operator access required' });
    }

    next();
};

// Require candidate role
const requireCandidate = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.user_type !== 'candidate') {
        return res.status(403).json({ error: 'Candidate access required' });
    }

    next();
};

module.exports = {
    authenticateToken,
    requireAdmin,
    requireOperator,
    requireCandidate
};
