const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Build a unique @username from a name or email. We slugify the base text
// (lowercase, letters/numbers only) and, if that handle is taken, append a
// number until we find one that's free.
async function generateUniqueUsername(base) {
    let slug = String(base)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 20);
    if (!slug) slug = 'user';

    let candidate = slug;
    let counter = 1;
    // Keep trying until the username isn't already in the database.
    while (await User.findOne({ username: candidate })) {
        candidate = `${slug}${counter}`;
        counter += 1;
    }
    return candidate;
}

// Shared shape for the "user" object we send back to the app on auth.
function publicUser(user) {
    return {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username || '',
        avatarUrl: user.avatarUrl || '',
        bio: user.bio || '',
    };
}

const signup = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Pick a unique handle from the name (falling back to the email).
        const username = await generateUniqueUsername(name || email.split('@')[0]);

        // Create new user
        const user = await User.create({ name, email, password: hashedPassword, username });

        // Generate JWT token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            message: 'Account created successfully',
            token,
            user: publicUser(user)
        });

    } catch (error) {
        res.status(500).json({ message: 'Something went wrong', error: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        // Backfill a username for older accounts created before usernames existed.
        if (!user.username) {
            user.username = await generateUniqueUsername(user.name || email.split('@')[0]);
            await user.save();
        }

        // Generate JWT token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(200).json({
            message: 'Login successful',
            token,
            user: publicUser(user)
        });

    } catch (error) {
        res.status(500).json({ message: 'Something went wrong', error: error.message });
    }
};

module.exports = { signup, login };
