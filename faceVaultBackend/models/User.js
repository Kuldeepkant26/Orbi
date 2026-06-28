const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },

    // ── Email verification (OTP) ──────────────────────────────────────────────
    // A new account starts UNVERIFIED. The user must enter the 6-digit code we
    // email them before they can log in. We store the code HASHED (never plain)
    // with an expiry, exactly like a password.
    isVerified: {
        type: Boolean,
        default: false,
    },
    otpHash: {
        type: String,
        default: null,
    },
    otpExpires: {
        type: Date,
        default: null,
    },

    // ── Social / profile fields (added for Orbi) ──────────────────────────────
    // A unique handle shown like "@username". Derived from the name at signup
    // if the user doesn't pick one.
    username: {
        type: String,
        unique: true,
        sparse: true, // allows old users without a username to coexist
        trim: true,
        lowercase: true,
    },
    // Cloudinary URL of the profile picture. Empty string = use a default avatar.
    avatarUrl: {
        type: String,
        default: '',
    },
    // Short "about me" text shown on the profile.
    bio: {
        type: String,
        default: '',
        trim: true,
    },
    // People who follow ME.
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    // People I follow.
    following: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    // How many posts this user has created. We keep a running count (instead of
    // counting documents every time) so the profile screen renders fast.
    postsCount: {
        type: Number,
        default: 0,
    },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
