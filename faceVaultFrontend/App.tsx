import React from 'react';
import { View, ActivityIndicator, StyleSheet, Modal } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import { CallProvider, useCall } from './src/context/CallContext';
import { BadgeProvider } from './src/context/BadgeContext';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import VerifyOtpScreen from './src/screens/VerifyOtpScreen';
import MainTabs from './src/navigation/MainTabs';
import UsersScreen from './src/screens/UsersScreen';
import ChatScreen from './src/screens/ChatScreen';
import UserProfileScreen from './src/screens/UserProfileScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import PostDetailScreen from './src/screens/PostDetailScreen';
import CommentsScreen from './src/screens/CommentsScreen';
import ManagePeopleScreen from './src/screens/ManagePeopleScreen';
import ManagePostsScreen from './src/screens/ManagePostsScreen';
import AdminUserDetailScreen from './src/screens/AdminUserDetailScreen';
import AdminReportsScreen from './src/screens/AdminReportsScreen';
import ReportIssueScreen from './src/screens/ReportIssueScreen';
import MyReportsScreen from './src/screens/MyReportsScreen';
import StoryViewerScreen from './src/screens/StoryViewerScreen';
import CreateStoryScreen from './src/screens/CreateStoryScreen';
import FollowListScreen from './src/screens/FollowListScreen';
import HighlightViewerScreen from './src/screens/HighlightViewerScreen';
import CreateHighlightScreen from './src/screens/CreateHighlightScreen';
import IncomingCallScreen from './src/screens/IncomingCallScreen';
import VideoCallScreen from './src/screens/VideoCallScreen';
import OrbiLogo from './src/components/OrbiLogo';
import { colors } from './src/theme/colors';

// ── Navigation param types ────────────────────────────────────────────────────

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  // The email we just sent a code to is passed along to the verify screen.
  VerifyOtp: { email: string };
};

// The logged-in app: a bottom-tab navigator (MainTabs) plus detail screens that
// push ON TOP of the tabs (so the tab bar hides while you're deep in a flow).
export type AppStackParamList = {
  MainTabs: undefined;
  Users: undefined; // the "messages / DM" people list
  Chat: {
    otherUser: { _id: string; name: string; email: string };
  };
  UserProfile: { userId: string };
  EditProfile: undefined;
  PostDetail: { postId: string };
  Comments: { postId: string };
  // Superadmin-only moderation screens.
  ManagePeople: undefined;
  ManagePosts: undefined;
  AdminUserDetail: { userId: string };
  AdminReports: undefined;
  // Reports (any user).
  ReportIssue: undefined;
  MyReports: undefined;
  // Stories & highlights.
  StoryViewer: { userId: string; userName: string };
  CreateStory: undefined;
  HighlightViewer: { highlightId: string; ownerId: string };
  CreateHighlight: undefined;
  // Followers / following list.
  FollowList: { userId: string; kind: 'followers' | 'following'; title: string };
};

// ── Stacks ────────────────────────────────────────────────────────────────────

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
      <AuthStack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
    </AuthStack.Navigator>
  );
}

function AppNavigator() {
  return (
    <AppStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerShadowVisible: false,
      }}>
      {/* The tabs are the home base — no header here, the tabs draw their own. */}
      <AppStack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <AppStack.Screen
        name="Users"
        component={UsersScreen}
        options={{ title: 'Messages' }}
      />
      <AppStack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ route }) => ({ title: route.params.otherUser.name })}
      />
      <AppStack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{ title: 'Profile' }}
      />
      <AppStack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: 'Edit Profile' }}
      />
      <AppStack.Screen
        name="PostDetail"
        component={PostDetailScreen}
        options={{ title: 'Post' }}
      />
      <AppStack.Screen
        name="Comments"
        component={CommentsScreen}
        options={{ title: 'Comments' }}
      />
      <AppStack.Screen
        name="ManagePeople"
        component={ManagePeopleScreen}
        options={{ title: 'Manage People' }}
      />
      <AppStack.Screen
        name="ManagePosts"
        component={ManagePostsScreen}
        options={{ title: 'Manage Posts' }}
      />
      <AppStack.Screen
        name="AdminUserDetail"
        component={AdminUserDetailScreen}
        options={{ title: 'Manage User' }}
      />
      <AppStack.Screen
        name="AdminReports"
        component={AdminReportsScreen}
        options={{ title: 'Reports' }}
      />
      <AppStack.Screen
        name="ReportIssue"
        component={ReportIssueScreen}
        options={{ title: 'Report an Issue' }}
      />
      <AppStack.Screen
        name="MyReports"
        component={MyReportsScreen}
        options={{ title: 'My Reports' }}
      />
      <AppStack.Screen
        name="StoryViewer"
        component={StoryViewerScreen}
        options={{ headerShown: false, presentation: 'fullScreenModal' }}
      />
      <AppStack.Screen
        name="HighlightViewer"
        component={HighlightViewerScreen}
        options={{ headerShown: false, presentation: 'fullScreenModal' }}
      />
      <AppStack.Screen
        name="CreateStory"
        component={CreateStoryScreen}
        options={{ title: 'New Story' }}
      />
      <AppStack.Screen
        name="CreateHighlight"
        component={CreateHighlightScreen}
        options={{ title: 'New Highlight' }}
      />
      <AppStack.Screen
        name="FollowList"
        component={FollowListScreen}
        options={({ route }) => ({ title: route.params.title })}
      />
    </AppStack.Navigator>
  );
}

// ── Call overlay — sits above all screens as a Modal ──────────────────────────
//
// Call UI is shown as a full-screen Modal that overlays whatever screen the
// user is on. (Video calling is currently DISABLED in the UI — the call button
// is greyed out — but we keep this wiring intact so it can be re-enabled later.)

function CallOverlay() {
  const { callStatus } = useCall();

  const showIncoming = callStatus === 'incoming';
  const showInCall = callStatus === 'calling' || callStatus === 'connected';

  return (
    <>
      <Modal visible={showIncoming} animationType="slide">
        <IncomingCallScreen />
      </Modal>
      <Modal visible={showInCall} animationType="slide">
        <VideoCallScreen />
      </Modal>
    </>
  );
}

// ── Root navigator ────────────────────────────────────────────────────────────

function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.splash}>
        <OrbiLogo size={64} />
        <ActivityIndicator
          color={colors.ink}
          size="small"
          style={{ marginTop: 28 }}
        />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
      {/* Call overlay stays mounted while logged in so it can receive events. */}
      {isAuthenticated && <CallOverlay />}
    </NavigationContainer>
  );
}

// ── App entry point ───────────────────────────────────────────────────────────
//
// Provider order matters:
//   AuthProvider   → knows who the user is
//   SocketProvider → opens a socket once we have a token
//   CallProvider   → uses the socket to handle call signaling

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SocketProvider>
          <BadgeProvider>
            <CallProvider>
              <RootNavigator />
            </CallProvider>
          </BadgeProvider>
        </SocketProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
