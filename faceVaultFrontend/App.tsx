import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Modal } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import { CallProvider, useCall } from './src/context/CallContext';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import UsersScreen from './src/screens/UsersScreen';
import ChatScreen from './src/screens/ChatScreen';
import IncomingCallScreen from './src/screens/IncomingCallScreen';
import VideoCallScreen from './src/screens/VideoCallScreen';

// ── Navigation param types ────────────────────────────────────────────────────

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export type AppStackParamList = {
  Home: undefined;
  Profile: undefined;
  Users: undefined;
  Chat: {
    otherUser: { _id: string; name: string; email: string };
  };
};

// ── Stacks ────────────────────────────────────────────────────────────────────

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
    </AuthStack.Navigator>
  );
}

function AppNavigator() {
  return (
    <AppStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#0F172A',
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerShadowVisible: false,
      }}>
      <AppStack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <AppStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'My Profile' }}
      />
      <AppStack.Screen
        name="Users"
        component={UsersScreen}
        options={{ title: 'People' }}
      />
      <AppStack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ route }) => ({ title: route.params.otherUser.name })}
      />
    </AppStack.Navigator>
  );
}

// ── Call overlay — sits above all screens as a Modal ──────────────────────────
//
// Instead of navigating to a new screen (which would break back-stack),
// call UI is shown as a full-screen Modal that overlays whatever screen
// the user is currently on. This means an incoming call pops up everywhere.

function CallOverlay() {
  const { callStatus } = useCall();

  const showIncoming = callStatus === 'incoming';
  const showInCall = callStatus === 'calling' || callStatus === 'connected';

  return (
    <>
      {/* Incoming call — full-screen modal */}
      <Modal visible={showIncoming} animationType="slide">
        <IncomingCallScreen />
      </Modal>

      {/* In-call (outgoing or connected) — full-screen modal */}
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
        <View style={styles.splashLogo}>
          <Text style={styles.splashEmoji}>🔐</Text>
        </View>
        <Text style={styles.splashName}>FaceVault</Text>
        <ActivityIndicator color="#4F46E5" size="small" style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
      {/* Call overlay is always mounted when logged in so it can receive events */}
      {isAuthenticated && <CallOverlay />}
    </NavigationContainer>
  );
}

// ── App entry point ───────────────────────────────────────────────────────────
//
// Provider order matters:
//   AuthProvider  → knows who the user is
//   SocketProvider → opens a socket once we have a token
//   CallProvider  → uses the socket to handle call signaling

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SocketProvider>
          <CallProvider>
            <RootNavigator />
          </CallProvider>
        </SocketProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  splashEmoji: {
    fontSize: 42,
  },
  splashName: {
    fontSize: 30,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 16,
    letterSpacing: 0.5,
  },
});
