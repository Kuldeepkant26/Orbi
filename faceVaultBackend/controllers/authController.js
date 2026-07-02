const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { generateOtp, sendOtpEmail, sendPasswordResetEmail } = require('../utils/email');

// How long an OTP code stays valid.
const OTP_TTL_MINUTES = 10;

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
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        name: user.name, // derived "First Last" (kept for display fallback)
        email: user.email,
        username: user.username || '',
        avatarUrl: user.avatarUrl || '',
        bio: user.bio || '',
        role: user.role || 'user',
    };
}

// Sign a 7-day JWT for a user.
function signToken(user) {
    return jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// Generate a fresh OTP, hash it, store it on the user with an expiry, and email
// it. Returns nothing — throws if the email fails so the caller can react.
async function issueOtp(user) {
    const code = generateOtp();
    user.otpHash = await bcrypt.hash(code, 10);
    user.otpExpires = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    await user.save();
    await sendOtpEmail(user.email, code);
}

// Same as issueOtp, but emails the "reset your password" template instead of
// the "verify your account" one. Reuses the same otpHash/otpExpires fields —
// a reset code and a pending signup-verification code are never needed at the
// same time for one account (reset only applies to already-verified users).
async function issuePasswordResetOtp(user) {
    const code = generateOtp();
    user.otpHash = await bcrypt.hash(code, 10);
    user.otpExpires = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    await user.save();
    await sendPasswordResetEmail(user.email, code);
}

// ── Signup ────────────────────────────────────────────────────────────────────
// Creates an UNVERIFIED account and emails an OTP. The user is NOT logged in yet
// (no token) — they must verify the code first.
const signup = async (req, res) => {
    try {
        const { firstName, lastName = '', email, password } = req.body;

        if (!firstName || !firstName.trim()) {
            return res.status(400).json({ message: 'First name is required' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            // If they already started signing up but never verified, let them
            // continue by re-sending a fresh code instead of erroring out.
            if (!existingUser.isVerified) {
                await issueOtp(existingUser);
                return res.status(200).json({
                    message: 'Account exists but is not verified. We sent a new code.',
                    needsVerification: true,
                    email: existingUser.email,
                });
            }
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const username = await generateUniqueUsername(
            `${firstName}${lastName}` || email.split('@')[0]
        );

        const user = await User.create({
            firstName: firstName.trim(),
            lastName: (lastName || '').trim(),
            email,
            password: hashedPassword,
            username,
            isVerified: false,
        });

        await issueOtp(user);

        res.status(201).json({
            message: 'Verification code sent to your email',
            needsVerification: true,
            email: user.email,
        });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong', error: error.message });
    }
};

// ── Verify OTP ────────────────────────────────────────────────────────────────
// Checks the code; on success marks the account verified and logs them in
// (returns token + user).
const verifyOtp = async (req, res) => {
    try {
        const { email, code } = req.body;
        if (!email || !code) {
            return res.status(400).json({ message: 'Email and code are required' });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'Account not found' });
        if (user.isVerified) {
            // Already verified — just log them in.
            return res.status(200).json({
                message: 'Email already verified',
                token: signToken(user),
                user: publicUser(user),
            });
        }

        // Code must exist and not be expired.
        if (!user.otpHash || !user.otpExpires || user.otpExpires < new Date()) {
            return res.status(400).json({ message: 'Code expired. Please request a new one.' });
        }

        const isMatch = await bcrypt.compare(String(code), user.otpHash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Incorrect code. Please try again.' });
        }

        // Success — mark verified and clear the code.
        user.isVerified = true;
        user.otpHash = null;
        user.otpExpires = null;
        await user.save();

        res.status(200).json({
            message: 'Email verified',
            token: signToken(user),
            user: publicUser(user),
        });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong', error: error.message });
    }
};

// ── Resend OTP ────────────────────────────────────────────────────────────────
const resendOtp = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email is required' });

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'Account not found' });
        if (user.isVerified) {
            return res.status(400).json({ message: 'This email is already verified' });
        }

        await issueOtp(user);
        res.status(200).json({ message: 'A new code has been sent to your email' });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong', error: error.message });
    }
};

// ── Forgot password ───────────────────────────────────────────────────────────
// Emails a reset code to a verified account. Responds the same way whether or
// not the email exists, so login attempts can't be used to enumerate accounts.
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email is required' });

        const user = await User.findOne({ email });
        if (user && user.isVerified) {
            await issuePasswordResetOtp(user);
        }

        res.status(200).json({
            message: 'If an account exists for that email, a reset code has been sent.',
        });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong', error: error.message });
    }
};

// ── Reset password ───────────────────────────────────────────────────────────
// Verifies the reset code and sets a new password. Returns a token so the app
// can log the user straight in afterward.
const resetPassword = async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;
        if (!email || !code || !newPassword) {
            return res.status(400).json({ message: 'Email, code, and new password are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'Account not found' });

        if (!user.otpHash || !user.otpExpires || user.otpExpires < new Date()) {
            return res.status(400).json({ message: 'Code expired. Please request a new one.' });
        }

        const isMatch = await bcrypt.compare(String(code), user.otpHash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Incorrect code. Please try again.' });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        user.otpHash = null;
        user.otpExpires = null;
        await user.save();

        res.status(200).json({
            message: 'Password reset successful',
            token: signToken(user),
            user: publicUser(user),
        });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong', error: error.message });
    }
};

// ── Login ─────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        // ── Deleted account check ────────────────────────────────────────────
        if (user.isDeleted) {
            return res.status(403).json({
                message: 'This account is no longer available.',
            });
        }

        // ── Ban check ────────────────────────────────────────────────────────
        // If the user is banned, block login. A ban with banExpires in the past
        // has elapsed, so we auto-lift it. A permanent ban has banExpires = null.
        if (user.isBanned) {
            const expired =
                user.banExpires && user.banExpires <= new Date();
            if (expired) {
                user.isBanned = false;
                user.banReason = '';
                user.banExpires = null;
                await user.save();
            } else {
                return res.status(403).json({
                    message: 'Your account has been restricted.',
                    banned: true,
                    banReason: user.banReason || '',
                    banExpires: user.banExpires, // null = permanent
                });
            }
        }

        // Migration safety: accounts created BEFORE email verification existed
        // never went through OTP. We treat them as already verified so they're
        // not locked out. (Such accounts have no OTP state and isVerified=false
        // only because of the new schema default.) We detect them as "no OTP was
        // ever issued" — they have neither an otpHash nor an otpExpires.
        if (!user.isVerified && !user.otpHash && !user.otpExpires) {
            user.isVerified = true;
            await user.save();
        }

        // Block login until the email is verified. We re-send a code and tell
        // the app to send the user to the verification screen.
        if (!user.isVerified) {
            await issueOtp(user);
            return res.status(403).json({
                message: 'Please verify your email. We sent you a new code.',
                needsVerification: true,
                email: user.email,
            });
        }

        // Backfill a username for older accounts created before usernames existed.
        if (!user.username) {
            user.username = await generateUniqueUsername(user.name || email.split('@')[0]);
            await user.save();
        }

        res.status(200).json({
            message: 'Login successful',
            token: signToken(user),
            user: publicUser(user),
        });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong', error: error.message });
    }
};

module.exports = { signup, verifyOtp, resendOtp, login, forgotPassword, resetPassword };
