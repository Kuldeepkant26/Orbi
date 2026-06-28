// ── Seed realistic bot accounts for testing ───────────────────────────────────
//
//   node scripts/seedBots.js
//
// Creates a handful of believable users (real-looking names, avatars, bios),
// gives each 3–4 themed posts with genuine photos, makes them follow each other,
// and seeds a few direct messages so the conversation list has data.
//
// Idempotent-ish: if a bot email already exists it is reused (not duplicated),
// but posts/messages are only created the first time that user is made.
//
// Images use Unsplash's CDN with fixed photo IDs (stable, real photos) sized for
// mobile. Avatars use the same source, square-cropped.

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Post = require('../models/Post');
const Message = require('../models/Message');

const PASSWORD = 'Orbi@Bot2026'; // same password for every bot (test accounts)

// Helper to build an Unsplash image URL of a given size from a photo ID.
const img = (id, w = 1080, h = 1080) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;
const avatar = id => img(id, 400, 400);

// Each bot: a real-sounding identity with a themed avatar, bio, and posts whose
// photos + captions match their "personality".
const BOTS = [
  {
    firstName: 'Aarav',
    lastName: 'Mehta',
    username: 'aarav.travels',
    email: 'aarav.travels@orbi.test',
    bio: '✈️ Chasing sunsets & street food. 27 countries and counting.',
    avatar: avatar('1633332755192-727a05c4013d'), // man portrait
    posts: [
      { img: img('1506905925346-21bda4d32df4'), caption: 'Golden hour over the valley never gets old 🌄' },
      { img: img('1502602898657-3e91760cbb34'), caption: 'Paris, you have my heart 🤍' },
      { img: img('1469854523086-cc02fe5d8800'), caption: 'Roadtrip diaries — endless horizons.' },
      { caption: 'Hot take: the journey really is better than the destination.' },
    ],
  },
  {
    firstName: 'Sofia',
    lastName: 'Rossi',
    username: 'sofia.cooks',
    email: 'sofia.cooks@orbi.test',
    bio: '🍝 Home cook. Pasta is a love language. Recipes in my DMs.',
    avatar: avatar('1438761681033-6461ffad8d80'), // woman portrait
    posts: [
      { img: img('1565299624946-b28f40a0ae38'), caption: 'Fresh margherita, straight from the oven 🍕' },
      { img: img('1473093295043-cdd812d0e601'), caption: 'Sunday sauce simmering all afternoon 🍅' },
      { img: img('1551782450-a2132b4ba21d'), caption: 'Brunch done right.' },
    ],
  },
  {
    firstName: 'Liam',
    lastName: 'Carter',
    username: 'liam.fitness',
    email: 'liam.fitness@orbi.test',
    bio: '💪 Coach. Runner. 5am club. Progress over perfection.',
    avatar: avatar('1500648767791-00dcc994a43e'), // man portrait
    posts: [
      { img: img('1517836357463-d25dfeac3438'), caption: 'Leg day. No excuses. 🏋️' },
      { img: img('1571019613454-1cb2f99b2d8b'), caption: 'Morning sweat session done ✅' },
      { img: img('1476480862126-209bfaa8edc8'), caption: 'Rest days matter too. Recovery is training.' },
      { caption: 'Reminder: consistency beats intensity. Show up daily.' },
    ],
  },
  {
    firstName: 'Maya',
    lastName: 'Patel',
    username: 'maya.designs',
    email: 'maya.designs@orbi.test',
    bio: '🎨 Product designer. Minimalism, type & coffee. Lagos → London.',
    avatar: avatar('1544005313-94ddf0286df2'), // woman portrait
    posts: [
      { img: img('1561070791-2526d30994b5'), caption: 'New brand explorations 🖤' },
      { img: img('1497032628192-86f99bcd76bc'), caption: 'Workspace reset for a fresh week.' },
      { img: img('1498050108023-c5249f4df085'), caption: 'Late night pixels.' },
    ],
  },
  {
    firstName: 'Noah',
    lastName: 'Kim',
    username: 'noah.shoots',
    email: 'noah.shoots@orbi.test',
    bio: '📷 Street & landscape photographer. Light chaser.',
    avatar: avatar('1463453091185-61582044d556'), // man portrait
    posts: [
      { img: img('1470071459604-3b5ec3a7fe05'), caption: 'Misty mornings hit different 🌫️' },
      { img: img('1444723121867-7a241cacace9'), caption: 'City lights, long exposure.' },
      { img: img('1426604966848-d7adac402bff'), caption: 'Found this quiet corner of the world.' },
      { img: img('1501785888041-af3ef285b470'), caption: 'Lake reflections 🏔️' },
    ],
  },
  {
    firstName: 'Emma',
    lastName: 'Nguyen',
    username: 'emma.reads',
    email: 'emma.reads@orbi.test',
    bio: '📚 Bookworm & tea lover. Currently reading everything.',
    avatar: avatar('1487412720507-e7ab37603c6f'), // woman portrait
    posts: [
      { img: img('1512820790803-83ca734da794'), caption: 'This week’s stack 📖' },
      { img: img('1481627834876-b7833e8f5570'), caption: 'Rainy day + good book = perfect.' },
      { img: img('1524995997946-a1c2e315a42f'), caption: 'Cozy reading nook goals ☕' },
    ],
  },
];

// A few message threads to seed (by username). Each line alternates sender.
const THREADS = [
  {
    a: 'aarav.travels',
    b: 'sofia.cooks',
    lines: [
      ['aarav.travels', 'That pizza post made me so hungry 😂'],
      ['sofia.cooks', 'Haha come over, I’ll make you one!'],
      ['aarav.travels', 'Deal. Next time I’m in town 🍕'],
      ['sofia.cooks', 'Bring stories from your travels!'],
    ],
  },
  {
    a: 'liam.fitness',
    b: 'maya.designs',
    lines: [
      ['maya.designs', 'Your 5am routine is insane 😅 any tips?'],
      ['liam.fitness', 'Start with 6am, then shift earlier. Sleep is key!'],
      ['maya.designs', 'Makes sense, thanks coach 💪'],
    ],
  },
  {
    a: 'noah.shoots',
    b: 'emma.reads',
    lines: [
      ['noah.shoots', 'Your reading nook would make a great photo 📷'],
      ['emma.reads', 'Omg yes! Let’s collab sometime'],
    ],
  },
];

async function run() {
  await mongoose.connect(process.env.MONGO_URL);
  console.log('Connected to DB');

  const hashed = await bcrypt.hash(PASSWORD, 10);
  const byUsername = {};

  // 1) Create (or reuse) each bot, with posts.
  for (const bot of BOTS) {
    let user = await User.findOne({ email: bot.email });
    let isNew = false;

    if (!user) {
      user = await User.create({
        firstName: bot.firstName,
        lastName: bot.lastName,
        username: bot.username,
        email: bot.email,
        password: hashed,
        avatarUrl: bot.avatar,
        bio: bot.bio,
        isVerified: true, // skip OTP for test accounts
      });
      isNew = true;
      console.log(`Created ${bot.username}`);
    } else {
      console.log(`Reusing ${bot.username}`);
    }
    byUsername[bot.username] = user;

    // Posts only on first creation (avoid duplicates on re-run).
    if (isNew) {
      let count = 0;
      for (const p of bot.posts) {
        await Post.create({
          author: user._id,
          imageUrl: p.img || '',
          caption: p.caption || '',
        });
        count += 1;
      }
      user.postsCount = count;
      await user.save();
    }
  }

  // 2) Everyone follows everyone else (a small, lively network).
  const all = Object.values(byUsername);
  for (const u of all) {
    const others = all.filter(o => String(o._id) !== String(u._id));
    u.following = others.map(o => o._id);
    u.followers = others.map(o => o._id);
    await u.save();
  }
  console.log('Wired up follows.');

  // 3) Seed message threads (only if that pair has none yet).
  for (const t of THREADS) {
    const a = byUsername[t.a];
    const b = byUsername[t.b];
    if (!a || !b) continue;

    const existing = await Message.findOne({
      $or: [
        { sender: a._id, receiver: b._id },
        { sender: b._id, receiver: a._id },
      ],
    });
    if (existing) {
      console.log(`Thread ${t.a}↔${t.b} already exists, skipping.`);
      continue;
    }

    let when = Date.now() - t.lines.length * 60000;
    for (const [fromUsername, text] of t.lines) {
      const sender = byUsername[fromUsername];
      const receiver = sender._id.equals(a._id) ? b : a;
      await Message.create({
        sender: sender._id,
        receiver: receiver._id,
        text,
        isRead: true,
        createdAt: new Date(when),
      });
      when += 60000;
    }
    console.log(`Seeded thread ${t.a}↔${t.b}.`);
  }

  await mongoose.disconnect();
  console.log('\n✅ Done. Bot accounts (password for all: ' + PASSWORD + '):');
  BOTS.forEach(b => console.log(`   ${b.email}`));
}

run().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
