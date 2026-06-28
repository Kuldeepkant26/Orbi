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
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../App';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { apiFetchMessages, Message } from '../api/usersApi';
import { apiFetchProfile, Profile } from '../api/socialApi';
import Avatar from '../components/Avatar';

type Props = NativeStackScreenProps<AppStackParamList, 'Chat'>;

export default function ChatScreen({ route, navigation }: Props) {
  const { otherUser } = route.params;
  const { user, token } = useAuth();
  const { socket } = useSocket();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [otherProfile, setOtherProfile] = useState<Profile | null>(null);
  // Which of my messages is currently showing its inline Edit/Delete actions.
  const [activeActionsId, setActiveActionsId] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load existing messages on mount ──────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetchMessages(token!, otherUser._id);
        setMessages(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [token, otherUser._id]);

  // Fetch the other user's profile so we can show their avatar + @username in
  // the chat header (instead of just their name).
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

  // Custom header: tappable avatar + @username, opening the user's profile.
  //
  // NOTE: Video calling is intentionally DISABLED for now — the call button is
  // greyed out. The call wiring (CallContext) is left intact for later.
  useEffect(() => {
    navigation.setOptions({
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
          <Text style={styles.headerName} numberOfLines={1}>
            {otherProfile?.username
              ? `@${otherProfile.username}`
              : otherUser.name}
          </Text>
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity
          style={styles.callHeaderBtn}
          disabled
          onPress={() =>
            Alert.alert('Calls are off', 'Video calling is disabled for now.')
          }>
          <Text style={[styles.callHeaderIcon, styles.callHeaderIconDisabled]}>
            📹
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, otherUser, otherProfile]);

  // ── Mark messages as read when screen opens ───────────────────────────────
  useEffect(() => {
    if (socket) {
      socket.emit('mark_read', { senderId: otherUser._id });
    }
  }, [socket, otherUser._id]);

  // ── Socket event listeners ────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // A new message arrived for me
    socket.on('receive_message', (msg: Message) => {
      // Only add if it's from the user we're chatting with
      if (msg.sender === otherUser._id) {
        setMessages(prev => [...prev, msg]);
        // Mark it read immediately since screen is open
        socket.emit('mark_read', { senderId: otherUser._id });
      }
    });

    // My own message was saved — replace optimistic version or add
    socket.on('message_sent', (msg: Message) => {
      setMessages(prev => [...prev, msg]);
    });

    // A message was edited (by either side)
    socket.on('message_edited', (updatedMsg: Message) => {
      setMessages(prev =>
        prev.map(m => (m._id === updatedMsg._id ? updatedMsg : m))
      );
    });

    // A message was deleted
    socket.on('message_deleted', (deletedMsg: Message) => {
      setMessages(prev =>
        prev.map(m => (m._id === deletedMsg._id ? deletedMsg : m))
      );
    });

    // Typing events
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
      socket.off('user_typing');
      socket.off('user_stopped_typing');
    };
  }, [socket, otherUser._id]);

  // ── Scroll to bottom when messages change ─────────────────────────────────
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length, isOtherTyping]);

  // ── Handle typing indicator ───────────────────────────────────────────────
  const handleTyping = (text: string) => {
    setInputText(text);
    if (!socket) return;

    socket.emit('typing_start', { receiverId: otherUser._id });

    // Stop typing event after 1.5s of no keypresses
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit('typing_stop', { receiverId: otherUser._id });
    }, 1500);
  };

  // ── Send or Edit message ──────────────────────────────────────────────────
  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed || !socket) return;

    if (editingMessage) {
      // Editing an existing message
      socket.emit('edit_message', {
        messageId: editingMessage._id,
        text: trimmed,
        receiverId: otherUser._id,
      });
      setEditingMessage(null);
    } else {
      // New message
      socket.emit('send_message', {
        receiverId: otherUser._id,
        text: trimmed,
      });
    }

    setInputText('');
    socket.emit('typing_stop', { receiverId: otherUser._id });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
  };

  // Start editing a message (fills the input with its text).
  const startEdit = (msg: Message) => {
    setEditingMessage(msg);
    setInputText(msg.text);
    setActiveActionsId(null);
  };

  // Delete a message (with a confirm).
  const confirmDelete = (msg: Message) => {
    setActiveActionsId(null);
    Alert.alert('Delete message', 'This message will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          socket?.emit('delete_message', {
            messageId: msg._id,
            receiverId: otherUser._id,
          });
        },
      },
    ]);
  };

  // Tapping one of MY messages toggles its inline Edit/Delete actions.
  // (Long-press still works as a shortcut to the same actions.)
  const toggleActions = (msg: Message) => {
    if (msg.sender !== user?.id || msg.isDeleted) return;
    setActiveActionsId(prev => (prev === msg._id ? null : msg._id));
  };

  // ── Format time e.g. "2:45 PM" ───────────────────────────────────────────
  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // ── Render each message bubble ────────────────────────────────────────────
  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      const isMine = item.sender === user?.id;
      const showActions = isMine && !item.isDeleted && activeActionsId === item._id;

      return (
        <View style={[styles.bubbleRow, isMine ? styles.myRow : styles.theirRow]}>
          <View style={styles.bubbleWrap}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => toggleActions(item)}
              onLongPress={() => toggleActions(item)}
              style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble]}>
              {item.isDeleted ? (
                <Text style={styles.deletedText}>This message was deleted</Text>
              ) : (
                <Text style={[styles.bubbleText, isMine ? styles.myText : styles.theirText]}>
                  {item.text}
                </Text>
              )}
              {/* Time + status row */}
              <View style={styles.metaRow}>
                {item.isEdited && !item.isDeleted && (
                  <Text style={[styles.editedLabel, isMine ? styles.myMeta : styles.theirMeta]}>
                    edited ·{' '}
                  </Text>
                )}
                <Text style={[styles.timeText, isMine ? styles.myMeta : styles.theirMeta]}>
                  {formatTime(item.createdAt)}
                </Text>
                {/* Read receipt — double tick for my messages */}
                {isMine && !item.isDeleted && (
                  <Text style={[styles.tickText, item.isRead ? styles.tickRead : styles.tickUnread]}>
                    {item.isRead ? ' ✓✓' : ' ✓'}
                  </Text>
                )}
              </View>
            </TouchableOpacity>

            {/* Visible Edit / Delete actions for my own messages (tap to reveal) */}
            {showActions && (
              <View style={styles.actionsRow}>
                <TouchableOpacity onPress={() => startEdit(item)} style={styles.actionPill}>
                  <Text style={styles.actionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmDelete(item)} style={styles.actionPill}>
                  <Text style={[styles.actionText, styles.actionDelete]}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id, activeActionsId]
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}>

      {/* Messages list */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.messageList}
        renderItem={renderMessage}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatText}>
              Say hello to {otherUser.name}! 👋
            </Text>
          </View>
        }
      />

      {/* Typing indicator */}
      {isOtherTyping && (
        <View style={styles.typingRow}>
          <View style={styles.typingBubble}>
            <Text style={styles.typingDots}>• • •</Text>
          </View>
          <Text style={styles.typingLabel}>{otherUser.name} is typing</Text>
        </View>
      )}

      {/* Edit mode banner */}
      {editingMessage && (
        <View style={styles.editBanner}>
          <Text style={styles.editBannerText}>Editing message</Text>
          <TouchableOpacity
            onPress={() => {
              setEditingMessage(null);
              setInputText('');
            }}>
            <Text style={styles.editCancel}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Type a message…"
          placeholderTextColor="#94A3B8"
          value={inputText}
          onChangeText={handleTyping}
          multiline
          maxLength={1000}
          returnKeyType="default"
        />
        <TouchableOpacity
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim()}>
          <Text style={styles.sendIcon}>{editingMessage ? '✓' : '↑'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageList: {
    padding: 12,
    paddingBottom: 8,
  },
  // ── Header (avatar + @username) ────────────────────────────────────────────
  headerUser: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 220,
  },
  headerName: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  // ── Bubble rows ────────────────────────────────────────────────────────────
  bubbleRow: {
    marginVertical: 3,
    flexDirection: 'row',
  },
  bubbleWrap: {
    maxWidth: '78%',
  },
  // ── Inline message actions (Edit / Delete) ─────────────────────────────────
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  actionPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginLeft: 6,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionDelete: {
    color: '#E5484D',
  },
  myRow: {
    justifyContent: 'flex-end',
  },
  theirRow: {
    justifyContent: 'flex-start',
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
  },
  myBubble: {
    backgroundColor: '#4F46E5',
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
  },
  myText: {
    color: '#fff',
  },
  theirText: {
    color: '#0F172A',
  },
  deletedText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#94A3B8',
  },
  // ── Message meta (time + read receipt) ────────────────────────────────────
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 3,
  },
  editedLabel: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  timeText: {
    fontSize: 10,
  },
  myMeta: {
    color: 'rgba(255,255,255,0.65)',
  },
  theirMeta: {
    color: '#94A3B8',
  },
  tickText: {
    fontSize: 10,
    fontWeight: '700',
  },
  tickRead: {
    color: '#A5F3D4', // light green on blue bubble
  },
  tickUnread: {
    color: 'rgba(255,255,255,0.55)',
  },
  // ── Typing indicator ───────────────────────────────────────────────────────
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  typingBubble: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  typingDots: {
    fontSize: 14,
    color: '#64748B',
    letterSpacing: 3,
  },
  typingLabel: {
    marginLeft: 8,
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  // ── Edit banner ────────────────────────────────────────────────────────────
  editBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E7FF',
  },
  editBannerText: {
    fontSize: 13,
    color: '#4F46E5',
    fontWeight: '600',
  },
  editCancel: {
    fontSize: 16,
    color: '#4F46E5',
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  // ── Input bar ──────────────────────────────────────────────────────────────
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  input: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    color: '#0F172A',
    maxHeight: 120,
    marginRight: 8,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  sendBtnDisabled: {
    backgroundColor: '#C7D2FE',
    shadowOpacity: 0,
    elevation: 0,
  },
  sendIcon: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  // ── Header call button ─────────────────────────────────────────────────────
  callHeaderBtn: {
    padding: 6,
    marginRight: 4,
  },
  callHeaderIcon: {
    fontSize: 22,
  },
  callHeaderIconDisabled: {
    opacity: 0.3,
  },
  // ── Empty state ────────────────────────────────────────────────────────────
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyChatText: {
    fontSize: 15,
    color: '#94A3B8',
  },
});
