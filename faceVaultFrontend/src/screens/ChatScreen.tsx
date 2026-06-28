import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../App';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useBadges } from '../context/BadgeContext';
import { apiFetchMessages, Message } from '../api/usersApi';
import { apiFetchProfile, Profile } from '../api/socialApi';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import { ChatSkeleton } from '../components/skeletons';
import {
  CHAT_THEMES,
  ChatTheme,
  DEFAULT_CHAT_THEME,
  loadChatTheme,
  saveChatTheme,
  REACTION_EMOJIS,
} from '../theme/chatBackgrounds';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

type Props = NativeStackScreenProps<AppStackParamList, 'Chat'>;

export default function ChatScreen({ route, navigation }: Props) {
  const { otherUser } = route.params;
  const { user, token } = useAuth();
  const { socket } = useSocket();
  const { clearMessagesFrom } = useBadges();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [otherProfile, setOtherProfile] = useState<Profile | null>(null);
  // The message whose reaction/edit/delete sheet is open (long-pressed).
  const [activeMessage, setActiveMessage] = useState<Message | null>(null);
  // Chosen chat background (per conversation, saved on device).
  const [chatTheme, setChatTheme] = useState<ChatTheme>(DEFAULT_CHAT_THEME);
  const [bgPickerOpen, setBgPickerOpen] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load messages + saved background on mount ─────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetchMessages(token!, otherUser._id);
        setMessages(data);
      } finally {
        setLoading(false);
      }
    })();
    loadChatTheme(otherUser._id).then(setChatTheme);
    // Opening the chat clears this person's unread message badge.
    clearMessagesFrom(otherUser._id);
  }, [token, otherUser._id, clearMessagesFrom]);

  // Fetch the other user's profile for the header (avatar + @username).
  useEffect(() => {
    (async () => {
      try {
        const p = await apiFetchProfile(token!, otherUser._id);
        setOtherProfile(p);
      } catch {
        // Header falls back to the name we already have.
      }
    })();
  }, [token, otherUser._id]);

  // Header: avatar + @username (tap → profile) and a background-picker button.
  // (Video calling stays disabled.)
  useEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: chatTheme.bg },
      headerTintColor: isDark(chatTheme.bg) ? '#FFFFFF' : colors.ink,
      headerShadowVisible: false,
      headerTitle: () => (
        <TouchableOpacity
          style={styles.headerUser}
          activeOpacity={0.7}
          onPress={() =>
            navigation.navigate('UserProfile', { userId: otherUser._id })
          }>
          <Avatar
            uri={otherProfile?.avatarUrl}
            name={otherProfile?.name || otherUser.name}
            size={32}
          />
          <Text
            style={[
              styles.headerName,
              { color: isDark(chatTheme.bg) ? '#FFFFFF' : colors.ink },
            ]}
            numberOfLines={1}>
            {otherProfile?.username ? `@${otherProfile.username}` : otherUser.name}
          </Text>
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity
          style={styles.bgBtn}
          onPress={() => setBgPickerOpen(true)}>
          <Icon
            name="color-palette-outline"
            size={22}
            color={isDark(chatTheme.bg) ? '#FFFFFF' : colors.ink}
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation, otherUser, otherProfile, chatTheme]);

  // Mark as read when the screen opens.
  useEffect(() => {
    if (socket) socket.emit('mark_read', { senderId: otherUser._id });
  }, [socket, otherUser._id]);

  // ── Socket listeners ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    socket.on('receive_message', (msg: Message) => {
      if (msg.sender === otherUser._id) {
        setMessages(prev => [...prev, msg]);
        socket.emit('mark_read', { senderId: otherUser._id });
      }
    });
    socket.on('message_sent', (msg: Message) => {
      setMessages(prev => [...prev, msg]);
    });
    socket.on('message_edited', (m: Message) => {
      setMessages(prev => prev.map(x => (x._id === m._id ? m : x)));
    });
    socket.on('message_deleted', (m: Message) => {
      setMessages(prev => prev.map(x => (x._id === m._id ? m : x)));
    });
    socket.on('message_reacted', (m: Message) => {
      setMessages(prev => prev.map(x => (x._id === m._id ? m : x)));
    });
    socket.on('user_typing', ({ userId }: { userId: string }) => {
      if (userId === otherUser._id) setIsOtherTyping(true);
    });
    socket.on('user_stopped_typing', ({ userId }: { userId: string }) => {
      if (userId === otherUser._id) setIsOtherTyping(false);
    });

    return () => {
      socket.off('receive_message');
      socket.off('message_sent');
      socket.off('message_edited');
      socket.off('message_deleted');
      socket.off('message_reacted');
      socket.off('user_typing');
      socket.off('user_stopped_typing');
    };
  }, [socket, otherUser._id]);

  // Scroll to bottom on new messages.
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length, isOtherTyping]);

  // ── Typing ────────────────────────────────────────────────────────────────
  const handleTyping = (text: string) => {
    setInputText(text);
    if (!socket) return;
    socket.emit('typing_start', { receiverId: otherUser._id });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit('typing_stop', { receiverId: otherUser._id });
    }, 1500);
  };

  // ── Send / edit ───────────────────────────────────────────────────────────
  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed || !socket) return;
    if (editingMessage) {
      socket.emit('edit_message', {
        messageId: editingMessage._id,
        text: trimmed,
        receiverId: otherUser._id,
      });
      setEditingMessage(null);
    } else {
      socket.emit('send_message', { receiverId: otherUser._id, text: trimmed });
    }
    setInputText('');
    socket.emit('typing_stop', { receiverId: otherUser._id });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
  };

  // ── Reactions / edit / delete (from the long-press sheet) ─────────────────
  const react = (emoji: string) => {
    if (!activeMessage || !socket) return;
    // Toggle off if I already reacted with the same emoji.
    const mine = (activeMessage.reactions || []).find(
      r => r.user === user?.id,
    );
    const next = mine?.emoji === emoji ? '' : emoji;
    socket.emit('react_message', {
      messageId: activeMessage._id,
      emoji: next,
      otherUserId: otherUser._id,
    });
    setActiveMessage(null);
  };

  const startEdit = (msg: Message) => {
    setEditingMessage(msg);
    setInputText(msg.text);
    setActiveMessage(null);
  };

  const confirmDelete = (msg: Message) => {
    setActiveMessage(null);
    Alert.alert('Delete message', 'This message will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          socket?.emit('delete_message', {
            messageId: msg._id,
            receiverId: otherUser._id,
          }),
      },
    ]);
  };

  const pickBackground = (t: ChatTheme) => {
    setChatTheme(t);
    saveChatTheme(otherUser._id, t.id);
    setBgPickerOpen(false);
  };

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // ── Render a message bubble ───────────────────────────────────────────────
  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      const isMine = item.sender === user?.id;
      const reactions = item.reactions || [];

      return (
        <View style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs]}>
          <TouchableOpacity
            activeOpacity={0.85}
            onLongPress={() => !item.isDeleted && setActiveMessage(item)}
            style={[
              styles.bubble,
              isMine
                ? { backgroundColor: chatTheme.myBubble, borderBottomRightRadius: 4 }
                : {
                    backgroundColor: chatTheme.theirBubble,
                    borderBottomLeftRadius: 4,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: chatTheme.border,
                  },
            ]}>
            {item.isDeleted ? (
              <Text style={[styles.deleted, { color: chatTheme.meta }]}>
                This message was deleted
              </Text>
            ) : (
              <Text
                style={{ color: isMine ? chatTheme.myText : chatTheme.theirText, fontSize: 15, lineHeight: 21 }}>
                {item.text}
              </Text>
            )}

            <View style={styles.meta}>
              {item.isEdited && !item.isDeleted && (
                <Text style={[styles.metaText, { color: isMine ? fade(chatTheme.myText) : chatTheme.meta }]}>
                  edited ·{' '}
                </Text>
              )}
              <Text style={[styles.metaText, { color: isMine ? fade(chatTheme.myText) : chatTheme.meta }]}>
                {formatTime(item.createdAt)}
              </Text>
              {isMine && !item.isDeleted && (
                <Text style={[styles.metaText, { color: fade(chatTheme.myText) }]}>
                  {item.isRead ? '  ✓✓' : '  ✓'}
                </Text>
              )}
            </View>
          </TouchableOpacity>

          {/* Reactions pill under the bubble */}
          {reactions.length > 0 && (
            <View
              style={[
                styles.reactionPill,
                isMine ? styles.reactionMine : styles.reactionTheirs,
              ]}>
              <Text style={styles.reactionText}>
                {reactions.map(r => r.emoji).join(' ')}
              </Text>
            </View>
          )}
        </View>
      );
    },
    [user?.id, chatTheme],
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: chatTheme.bg }]}>
        <ChatSkeleton />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: chatTheme.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.list}
        renderItem={renderMessage}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: chatTheme.meta }]}>
              Say hello to {otherUser.name} 👋
            </Text>
          </View>
        }
      />

      {/* Typing */}
      {isOtherTyping && (
        <View style={styles.typingRow}>
          <Text style={[styles.typingText, { color: chatTheme.meta }]}>
            {otherUser.name} is typing…
          </Text>
        </View>
      )}

      {/* Edit banner */}
      {editingMessage && (
        <View style={styles.editBanner}>
          <Text style={styles.editBannerText}>Editing message</Text>
          <TouchableOpacity
            onPress={() => {
              setEditingMessage(null);
              setInputText('');
            }}>
            <Icon name="close" size={18} color={colors.ink} />
          </TouchableOpacity>
        </View>
      )}

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Message…"
          placeholderTextColor={colors.textFaint}
          value={inputText}
          onChangeText={handleTyping}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnOff]}
          onPress={handleSend}
          disabled={!inputText.trim()}>
          <Icon
            name={editingMessage ? 'checkmark' : 'arrow-up'}
            size={20}
            color={colors.white}
          />
        </TouchableOpacity>
      </View>

      {/* Long-press action sheet: react / edit / delete */}
      <Modal
        visible={!!activeMessage}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveMessage(null)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setActiveMessage(null)}>
          <Pressable style={styles.sheet}>
            {/* Emoji reactions */}
            <View style={styles.emojiRow}>
              {REACTION_EMOJIS.map(e => (
                <TouchableOpacity key={e} onPress={() => react(e)} style={styles.emojiBtn}>
                  <Text style={styles.emoji}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Edit / Delete only for my own messages */}
            {activeMessage?.sender === user?.id && (
              <>
                <View style={styles.sheetDivider} />
                <TouchableOpacity
                  style={styles.sheetItem}
                  onPress={() => activeMessage && startEdit(activeMessage)}>
                  <Icon name="create-outline" size={20} color={colors.ink} />
                  <Text style={styles.sheetItemText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.sheetItem}
                  onPress={() => activeMessage && confirmDelete(activeMessage)}>
                  <Icon name="trash-outline" size={20} color={colors.danger} />
                  <Text style={[styles.sheetItemText, { color: colors.danger }]}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Background picker */}
      <Modal
        visible={bgPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setBgPickerOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setBgPickerOpen(false)}>
          <Pressable style={styles.bgSheet}>
            <Text style={styles.bgTitle}>Chat background</Text>
            <View style={styles.bgRow}>
              {CHAT_THEMES.map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={styles.bgItem}
                  onPress={() => pickBackground(t)}>
                  <View
                    style={[
                      styles.bgSwatch,
                      { backgroundColor: t.bg },
                      chatTheme.id === t.id && styles.bgSwatchActive,
                    ]}>
                    <View style={[styles.bgDot, { backgroundColor: t.myBubble }]} />
                  </View>
                  <Text style={styles.bgName}>{t.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// Quick luminance check so header text/icons stay readable on dark backgrounds.
function isDark(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 140;
}

// Slightly fade a text color for meta text on my bubble.
function fade(hex: string): string {
  return hex === '#FFFFFF' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.45)';
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerUser: { flexDirection: 'row', alignItems: 'center', maxWidth: 220 },
  headerName: { marginLeft: 8, fontSize: 16, fontWeight: '700' },
  bgBtn: { padding: 6, marginRight: 4 },

  list: { padding: spacing.md, paddingBottom: spacing.sm },
  row: { marginVertical: 4, maxWidth: '80%' },
  rowMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  rowTheirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  deleted: { fontSize: 14, fontStyle: 'italic' },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 3 },
  metaText: { fontSize: 10 },
  reactionPill: {
    marginTop: -6,
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    elevation: 2,
  },
  reactionMine: { marginRight: 6 },
  reactionTheirs: { marginLeft: 6 },
  reactionText: { fontSize: 13 },

  typingRow: { paddingHorizontal: spacing.lg, paddingBottom: 4 },
  typingText: { fontSize: 12, fontStyle: 'italic' },

  editBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  editBannerText: { fontSize: 13, fontWeight: '600', color: colors.ink },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 22,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.ink,
    marginRight: spacing.sm,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnOff: { backgroundColor: colors.textFaint },

  empty: { alignItems: 'center', paddingTop: 100 },
  emptyText: { fontSize: 15 },

  // Action sheet
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  emojiRow: { flexDirection: 'row', justifyContent: 'space-around' },
  emojiBtn: { padding: spacing.sm },
  emoji: { fontSize: 30 },
  sheetDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  sheetItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
  sheetItemText: { marginLeft: spacing.md, fontSize: 16, fontWeight: '600', color: colors.ink },

  // Background picker
  bgSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  bgTitle: { fontSize: 16, fontWeight: '700', color: colors.ink, marginBottom: spacing.lg },
  bgRow: { flexDirection: 'row', justifyContent: 'space-between' },
  bgItem: { alignItems: 'center' },
  bgSwatch: {
    width: 54,
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgSwatchActive: { borderColor: colors.ink, borderWidth: 2 },
  bgDot: { width: 20, height: 20, borderRadius: 10 },
  bgName: { fontSize: 11, color: colors.textMuted, marginTop: 6 },
});
