import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../App';
import { useAuth } from '../context/AuthContext';
import { apiFetchStoryTray, StoryTrayItem } from '../api/storiesApi';
import Avatar from './Avatar';
import Icon from './Icon';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

// The horizontal story tray shown at the top of the feed. The first item is
// always "Your story" (an add button). Authors with active stories follow, with
// a gradient-style ring (unseen = colored ring, seen = grey ring).
//
// `refreshKey` can be changed by the parent (e.g. on pull-to-refresh) to reload.

type Nav = NativeStackNavigationProp<AppStackParamList>;

export default function StoryTray({ refreshKey = 0 }: { refreshKey?: number }) {
  const navigation = useNavigation<Nav>();
  const { user, token } = useAuth();
  const [items, setItems] = useState<StoryTrayItem[]>([]);

  const load = useCallback(async () => {
    try {
      const data = await apiFetchStoryTray(token!);
      setItems(data);
    } catch {
      // ignore
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  // Whether I currently have an active story (so "Your story" shows my ring).
  const myItem = items.find(i => i.author._id === user?.id);
  const others = items.filter(i => i.author._id !== user?.id);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tray}>
      {/* Your story (add) */}
      <TouchableOpacity
        style={styles.item}
        activeOpacity={0.8}
        onPress={() =>
          myItem
            ? navigation.navigate('StoryViewer', {
                userId: user!.id,
                userName: user!.name,
              })
            : navigation.navigate('CreateStory')
        }>
        <View style={[styles.ring, myItem ? ringStyle(myItem.allSeen) : styles.ringPlain]}>
          <Avatar uri={user?.avatarUrl} name={user?.name} size={58} />
          {!myItem && (
            <View style={styles.addBadge}>
              <Icon name="add" size={14} color={colors.white} />
            </View>
          )}
        </View>
        <Text style={styles.label} numberOfLines={1}>
          Your story
        </Text>
      </TouchableOpacity>

      {/* Other people's stories */}
      {others.map(item => (
        <TouchableOpacity
          key={item.author._id}
          style={styles.item}
          activeOpacity={0.8}
          onPress={() =>
            navigation.navigate('StoryViewer', {
              userId: item.author._id,
              userName: item.author.name,
            })
          }>
          <View style={[styles.ring, ringStyle(item.allSeen)]}>
            <Avatar
              uri={item.author.avatarUrl}
              name={item.author.name}
              size={58}
            />
          </View>
          <Text style={styles.label} numberOfLines={1}>
            {item.author.username || item.author.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// An unseen story gets the dark "ink" ring; a fully-seen one gets a grey ring.
function ringStyle(allSeen: boolean) {
  return {
    borderColor: allSeen ? colors.border : colors.ink,
    borderWidth: allSeen ? 1.5 : 2.5,
  };
}

const styles = StyleSheet.create({
  tray: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  item: {
    alignItems: 'center',
    width: 72,
  },
  ring: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPlain: {
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  addBadge: {
    position: 'absolute',
    bottom: 0,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  label: {
    fontSize: 12,
    color: colors.ink,
    marginTop: 4,
    maxWidth: 70,
  },
});
