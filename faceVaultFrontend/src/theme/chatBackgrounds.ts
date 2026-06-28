import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Chat backgrounds ──────────────────────────────────────────────────────────
//
// 5 premium preset backgrounds for the chat screen. Each defines the screen
// background color plus the bubble colors that look good on it, so the whole
// conversation stays readable and on-theme.
//
// The user's choice per-conversation is saved on the device (AsyncStorage).

export type ChatTheme = {
  id: string;
  name: string;
  bg: string; // screen background
  myBubble: string; // my message bubble
  myText: string;
  theirBubble: string; // their message bubble
  theirText: string;
  meta: string; // timestamp / meta text on their side
  border: string; // bubble hairline (their bubble on light bgs)
};

export const CHAT_THEMES: ChatTheme[] = [
  {
    id: 'classic',
    name: 'Classic',
    bg: '#FFFFFF',
    myBubble: '#0A0A0A',
    myText: '#FFFFFF',
    theirBubble: '#F4F4F2',
    theirText: '#0A0A0A',
    meta: '#9A9A9A',
    border: '#ECECEC',
  },
  {
    id: 'cream',
    name: 'Cream',
    bg: '#FAFAF8',
    myBubble: '#1C1C1E',
    myText: '#FFFFFF',
    theirBubble: '#FFFFFF',
    theirText: '#0A0A0A',
    meta: '#9A9A9A',
    border: '#ECECEC',
  },
  {
    id: 'graphite',
    name: 'Graphite',
    bg: '#101012',
    myBubble: '#FFFFFF',
    myText: '#0A0A0A',
    theirBubble: '#2A2A2E',
    theirText: '#FFFFFF',
    meta: '#9A9A9A',
    border: '#2A2A2E',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    bg: '#0B1020',
    myBubble: '#3A4DE0',
    myText: '#FFFFFF',
    theirBubble: '#1A2238',
    theirText: '#EAEAF2',
    meta: '#8A93B0',
    border: '#1A2238',
  },
  {
    id: 'sand',
    name: 'Sand',
    bg: '#F3EEE6',
    myBubble: '#3B2F23',
    myText: '#FFF8EF',
    theirBubble: '#FFFFFF',
    theirText: '#2A2018',
    meta: '#9A8C7A',
    border: '#E7DECF',
  },
];

export const DEFAULT_CHAT_THEME = CHAT_THEMES[0];

// Persist & load the chosen background per conversation (keyed by the other
// user's id). Returns the matching ChatTheme (or the default).
function storageKey(otherUserId: string) {
  return `chat_bg_${otherUserId}`;
}

export async function loadChatTheme(otherUserId: string): Promise<ChatTheme> {
  try {
    const id = await AsyncStorage.getItem(storageKey(otherUserId));
    return CHAT_THEMES.find(t => t.id === id) || DEFAULT_CHAT_THEME;
  } catch {
    return DEFAULT_CHAT_THEME;
  }
}

export async function saveChatTheme(
  otherUserId: string,
  themeId: string,
): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(otherUserId), themeId);
  } catch {
    // best-effort
  }
}

// The emoji set offered when reacting to a message.
export const REACTION_EMOJIS = ['❤️', '😂', '👍', '😮', '😢', '🙏'];
