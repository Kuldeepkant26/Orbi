const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    // ── Name ──────────────────────────────────────────────────────────────────
    // First/last are the source of truth (collected at signup & edit profile).
    // `name` is a derived "First Last" string we keep in sync via the pre-save
    // hook below, so existing code that reads `user.name` keeps working.
    firstName: {
        type: String,
        required: true,
        trim: true,
    },
    lastName: {
        type: String,
        default: '',
        trim: true,
    },
    name: {
        type: String,
        default: '',
        trim: true,
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

    // ── Role & moderation ─────────────────────────────────────────────────────
    // Only "superadmin" gets moderation powers (manage people/posts, ban).
    role: {
        type: String,
        enum: ['user', 'superadmin'],
        default: 'user',
    },
    // A banned user can't log in. We record why and (optionally) when the ban
    // lifts — banExpires === null means a permanent ban.
    isBanned: {
        type: Boolean,
        default: false,
    },
    banReason: {
        type: String,
        default: '',
    },
    banExpires: {
        type: Date,
        default: null, // null = permanent (while isBanned is true)
    },
    // Soft delete: a deleted account can't log in and is hidden everywhere, but
    // the record stays in the DB (for recovery / audit). Set by a superadmin.
    isDeleted: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

// Keep the derived `name` ("First Last") in sync whenever first/last change.
// (Mongoose 9 pre-save hooks use async functions without a `next` callback.)
userSchema.pre('save', async function () {
    if (this.isModified('firstName') || this.isModified('lastName')) {
        this.name = `${this.firstName} ${this.lastName || ''}`.trim();
    }
});

module.exports = mongoose.model('User', userSchema);
