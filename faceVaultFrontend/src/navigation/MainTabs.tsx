import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import {
  createBottomTabNavigator,
  BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import { colors } from '../theme/colors';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import CreatePostScreen from '../screens/CreatePostScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';

// ── Bottom tab navigator (Instagram-style, custom design) ──────────────────────
//
// Five tabs: Home, Search, Create, Notifications, Profile.
// We draw the tab bar ourselves (a custom CustomTabBar below) so we get the
// premium look: a clean white bar, hairline top border, near-black active
// icons, faint inactive icons, and the center "Create" button emphasized.

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Create: undefined;
  Notifications: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

// Maps each tab to its filled (active) and outline (inactive) Ionicons names.
const ICONS: Record<
  keyof MainTabParamList,
  { active: string; inactive: string }
> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Search: { active: 'search', inactive: 'search-outline' },
  Create: { active: 'add-circle', inactive: 'add-circle-outline' },
  Notifications: { active: 'heart', inactive: 'heart-outline' },
  Profile: { active: 'person-circle', inactive: 'person-circle-outline' },
};

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const routeName = route.name as keyof MainTabParamList;
        const icon = ICONS[routeName];

        // "Create" is the emphasized center action, drawn a bit larger.
        const isCreate = routeName === 'Create';
        const size = isCreate ? 32 : 26;
        const color = focused ? colors.ink : colors.textFaint;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tab}
            activeOpacity={0.7}
            onPress={onPress}>
            <Icon
              name={focused ? icon.active : icon.inactive}
              size={size}
              color={color}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function MainTabs() {
  return (
    <Tab.Navigator
      // We render our own tab bar, and hide the default header (each screen
      // draws its own top bar where needed).
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Create" component={CreatePostScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
