const jwt = require('jsonwebtoken');
const User = require('../models/User');

const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1]; // Expects: Bearer <token>

    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token.' });
    }
};

// Only allow superadmins through. Must run AFTER verifyToken (it needs req.userId).
// Loads the user, checks their role, and stashes the user on req for handlers.
const requireSuperadmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.userId);
        if (!user || user.role !== 'superadmin') {
            return res.status(403).json({ message: 'Admin access required.' });
        }
        req.currentUser = user;
        next();
    } catch (error) {
        return res.status(500).json({ message: 'Something went wrong', error: error.message });
    }
};

// Export as both names so old and new code both work
module.exports = { verifyToken, authenticate: verifyToken, requireSuperadmin };
