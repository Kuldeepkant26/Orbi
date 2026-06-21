import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RTCView } from 'react-native-webrtc';
import { useCall } from '../context/CallContext';

/**
 * VideoCallScreen
 *
 * The in-call screen. Shows:
 *   - Remote video (full screen background)
 *   - Local video (small picture-in-picture in the corner)
 *   - Controls: mute, camera off, end call, flip camera
 *
 * This screen is shown when callStatus === 'connected' OR 'calling'.
 * During 'calling' state the remote video is blank (waiting for the other side).
 */
export default function VideoCallScreen() {
  const {
    callStatus,
    caller,
    callee,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    endCall,
    toggleMute,
    toggleCamera,
  } = useCall();

  const [isFrontCamera, setIsFrontCamera] = useState(true);

  // The person we're talking to (works for both incoming and outgoing calls)
  const otherPerson = callee ?? caller;

  const flipCamera = () => {
    if (!localStream) return;
    // react-native-webrtc exposes _switchCamera on video tracks
    localStream.getVideoTracks().forEach((track: any) => {
      if (track._switchCamera) track._switchCamera();
    });
    setIsFrontCamera(prev => !prev);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* ── Remote video (full screen) ─────────────────────────────────────── */}
      {remoteStream ? (
        <RTCView
          streamURL={(remoteStream as any).toURL()}
          style={styles.remoteVideo}
          objectFit="cover"
          mirror={false}
        />
      ) : (
        // Shown while waiting for the other person to connect
        <View style={styles.waitingContainer}>
          <View style={styles.waitingAvatar}>
            <Text style={styles.waitingAvatarText}>
              {otherPerson?.name?.charAt(0).toUpperCase() ?? '?'}
            </Text>
          </View>
          <Text style={styles.waitingName}>{otherPerson?.name}</Text>
          <Text style={styles.waitingStatus}>
            {callStatus === 'calling' ? 'Calling…' : 'Connecting…'}
          </Text>
        </View>
      )}

      {/* ── Local video (picture-in-picture) ──────────────────────────────── */}
      {localStream && !isCameraOff ? (
        <RTCView
          streamURL={(localStream as any).toURL()}
          style={styles.localVideo}
          objectFit="cover"
          mirror={isFrontCamera}
          zOrder={1}
        />
      ) : (
        <View style={[styles.localVideo, styles.localVideoBlanked]}>
          <Text style={styles.cameraOffIcon}>📷</Text>
        </View>
      )}

      {/* ── Top bar — who we're talking to ────────────────────────────────── */}
      <SafeAreaView style={styles.topBar}>
        <Text style={styles.topName}>{otherPerson?.name ?? 'Video Call'}</Text>
        <Text style={styles.topStatus}>
          {callStatus === 'connected' ? 'Connected' : 'Calling…'}
        </Text>
      </SafeAreaView>

      {/* ── Bottom control bar ────────────────────────────────────────────── */}
      <SafeAreaView style={styles.controls}>

        {/* Flip camera */}
        <ControlButton
          icon="🔄"
          label="Flip"
          onPress={flipCamera}
          active={false}
          activeColor="#334155"
        />

        {/* Mute microphone */}
        <ControlButton
          icon={isMuted ? '🔇' : '🎤'}
          label={isMuted ? 'Unmute' : 'Mute'}
          onPress={toggleMute}
          active={isMuted}
          activeColor="#334155"
        />

        {/* End call — centre, red, larger */}
        <TouchableOpacity style={styles.endCallBtn} onPress={endCall}>
          <Text style={styles.endCallIcon}>📵</Text>
        </TouchableOpacity>

        {/* Camera on/off */}
        <ControlButton
          icon={isCameraOff ? '🚫' : '📹'}
          label={isCameraOff ? 'Start Cam' : 'Stop Cam'}
          onPress={toggleCamera}
          active={isCameraOff}
          activeColor="#334155"
        />

        {/* Placeholder to keep end call centred */}
        <View style={styles.placeholder} />
      </SafeAreaView>
    </View>
  );
}

// ── Small reusable control button ─────────────────────────────────────────────

function ControlButton({
  icon,
  label,
  onPress,
  active,
  activeColor,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  active: boolean;
  activeColor: string;
}) {
  return (
    <View style={styles.controlItem}>
      <TouchableOpacity
        style={[
          styles.controlBtn,
          active && { backgroundColor: activeColor },
        ]}
        onPress={onPress}>
        <Text style={styles.controlIcon}>{icon}</Text>
      </TouchableOpacity>
      <Text style={styles.controlLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  // ── Remote video (fills the whole screen) ─────────────────────────────────
  remoteVideo: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0F172A',
  },
  // ── Waiting state (no remote stream yet) ──────────────────────────────────
  waitingContainer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingAvatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  waitingAvatarText: {
    color: '#fff',
    fontSize: 46,
    fontWeight: '700',
  },
  waitingName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  waitingStatus: {
    fontSize: 15,
    color: '#64748B',
  },
  // ── Local (PiP) video ──────────────────────────────────────────────────────
  localVideo: {
    position: 'absolute',
    top: 80,
    right: 16,
    width: 110,
    height: 160,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  localVideoBlanked: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraOffIcon: {
    fontSize: 28,
    opacity: 0.5,
  },
  // ── Top bar ────────────────────────────────────────────────────────────────
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: 52,
    paddingBottom: 16,
    // Dark gradient-like top bar
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  topName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  topStatus: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  // ── Bottom controls ────────────────────────────────────────────────────────
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 36,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  controlItem: {
    alignItems: 'center',
    gap: 6,
  },
  controlBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlIcon: {
    fontSize: 24,
  },
  controlLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 4,
  },
  // End call is bigger and red
  endCallBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  endCallIcon: {
    fontSize: 28,
  },
  placeholder: {
    width: 56,
  },
});
