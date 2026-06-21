import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';

type NavItem = {
  label: string;
  icon: string;
  onPress: () => void;
};

type Props = {
  items: NavItem[];
};

// A floating action button that expands to show navigation options
export default function FloatingNav({ items }: Props) {
  const [open, setOpen] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  const toggleMenu = () => {
    const toValue = open ? 0 : 1;
    Animated.spring(animation, {
      toValue,
      useNativeDriver: true,
      friction: 6,
      tension: 80,
    }).start();
    setOpen(!open);
  };

  const closeMenu = () => {
    Animated.spring(animation, {
      toValue: 0,
      useNativeDriver: true,
      friction: 6,
    }).start();
    setOpen(false);
  };

  // Rotate the "+" icon to "×" when open
  const rotation = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      {/* Menu items — rendered above the FAB */}
      {items.map((item, index) => {
        // Each item slides up from the FAB position
        const translateY = animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -(index + 1) * 68],
        });

        const opacity = animation.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0, 0, 1],
        });

        return (
          <Animated.View
            key={item.label}
            style={[styles.menuItem, { opacity, transform: [{ translateY }] }]}>
            {/* Label */}
            <View style={styles.labelBubble}>
              <Text style={styles.labelText}>{item.label}</Text>
            </View>
            {/* Icon button */}
            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => {
                closeMenu();
                item.onPress();
              }}>
              <Text style={styles.menuIcon}>{item.icon}</Text>
            </TouchableOpacity>
          </Animated.View>
        );
      })}

      {/* Main FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={toggleMenu}
        activeOpacity={0.85}>
        <Animated.Text style={[styles.fabIcon, { transform: [{ rotate: rotation }] }]}>
          +
        </Animated.Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 36 : 24,
    right: 24,
    alignItems: 'center',
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 10,
  },
  fabIcon: {
    fontSize: 30,
    color: '#fff',
    fontWeight: '300',
    lineHeight: 34,
  },
  menuItem: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 9,
  },
  menuBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  menuIcon: {
    fontSize: 22,
  },
  labelBubble: {
    marginRight: 10,
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  labelText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
