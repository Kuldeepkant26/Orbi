/**
 * CallContext — manages the entire lifecycle of a WebRTC video call.
 *
 * How WebRTC calling works (simple version):
 *   1. Caller creates a "peer connection" and an "offer" (SDP).
 *   2. Offer is sent to the callee via Socket.IO (server just relays it).
 *   3. Callee accepts and creates an "answer" (SDP), sends it back.
 *   4. Both sides exchange ICE candidates (network path info).
 *   5. WebRTC connects the two devices directly — video/audio flows peer-to-peer.
 *
 * This context lives at the top of the app so an incoming call can pop up
 * on any screen, not just inside a chat window.
 */

import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';
import { Platform } from 'react-native';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

// iOS Simulator cannot initialise the AUVoiceIO audio unit — WebRTC aborts
// with an RPC timeout crash when audio: true is used there.
// The simulator always has the model identifier "x86_64" or "arm64" in
// Platform.constants, but the safest RN check is the SIMULATOR env var that
// Xcode injects at build time via a compile flag. We read it via NativeModules
// but that requires extra setup; instead we use the reliable fact that
// Platform.constants.systemName is "iPhone OS" on device and something else
// (or absent) on simulator. Fall back to __DEV__ + ios as a broad guard.
const IS_IOS_SIMULATOR = Platform.OS === 'ios' && (
  (Platform.constants as any)?.systemName === 'iPhone Simulator' ||
  (Platform.constants as any)?.systemName === 'iOS Simulator'
);


// ── Types ─────────────────────────────────────────────────────────────────────

type CallStatus =
  | 'idle'           // No call happening
  | 'incoming'       // Someone is calling us
  | 'calling'        // We are calling someone (waiting for them to pick up)
  | 'connected';     // Both sides are in a live call

export type CallParticipant = {
  userId: string;
  name: string;
};

type CallContextType = {
  callStatus: CallStatus;
  caller: CallParticipant | null;     // Who is calling us (incoming)
  callee: CallParticipant | null;     // Who we are calling (outgoing)
  localStream: MediaStream | null;    // Our camera/mic
  remoteStream: MediaStream | null;   // The other person's camera/mic
  isMuted: boolean;
  isCameraOff: boolean;
  startCall: (to: CallParticipant) => Promise<void>;
  answerCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
};

// ── Defaults ──────────────────────────────────────────────────────────────────

const CallContext = createContext<CallContextType>({
  callStatus: 'idle',
  caller: null,
  callee: null,
  localStream: null,
  remoteStream: null,
  isMuted: false,
  isCameraOff: false,
  startCall: async () => {},
  answerCall: async () => {},
  rejectCall: () => {},
  endCall: () => {},
  toggleMute: () => {},
  toggleCamera: () => {},
});

// ── STUN servers — these are Google's free public servers ─────────────────────
// They help two devices find each other across NAT/firewalls.
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.relay.metered.ca:80' },
    {
      urls: 'turn:global.relay.metered.ca:80',
      username: '3b11dbd97ebc15bf756e44cb',
      credential: '2iAc4MuXxNVARrw/',
    },
    {
      urls: 'turn:global.relay.metered.ca:80?transport=tcp',
      username: '3b11dbd97ebc15bf756e44cb',
      credential: '2iAc4MuXxNVARrw/',
    },
    {
      urls: 'turn:global.relay.metered.ca:443',
      username: '3b11dbd97ebc15bf756e44cb',
      credential: '2iAc4MuXxNVARrw/',
    },
    {
      urls: 'turns:global.relay.metered.ca:443?transport=tcp',
      username: '3b11dbd97ebc15bf756e44cb',
      credential: '2iAc4MuXxNVARrw/',
    },
  ],
};

// ── Provider ──────────────────────────────────────────────────────────────────

export function CallProvider({ children }: { children: ReactNode }) {
  const { socket } = useSocket();
  const { user } = useAuth();

  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [caller, setCaller] = useState<CallParticipant | null>(null);
  const [callee, setCallee] = useState<CallParticipant | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const pendingOffer = useRef<RTCSessionDescription | null>(null);
  const pendingCaller = useRef<CallParticipant | null>(null);
  // ICE candidates that arrive before remote description is set get queued here
  const iceCandidateQueue = useRef<RTCIceCandidate[]>([]);
  const remoteDescSet = useRef(false);

  // ── Get camera + mic stream ──────────────────────────────────────────────────
  // On iOS Simulator, requesting audio crashes the app because the simulator
  // has no real audio hardware and AUVoiceIO initialization times out (SIGABRT).
  // We disable audio on the simulator so the app stays alive for UI testing.
  const getLocalStream = async (): Promise<MediaStream> => {
    const stream = await mediaDevices.getUserMedia({
      audio: !IS_IOS_SIMULATOR,
      video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
    return stream as MediaStream;
  };

  // ── Create a fresh RTCPeerConnection ─────────────────────────────────────────
  const createPeerConnection = (remoteUserId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // When we discover a network path (ICE candidate), send it to the other side
    (pc as any).onicecandidate = (event: any) => {
      if (event.candidate && socket) {
        socket.emit('ice_candidate', {
          to: remoteUserId,
          candidate: event.candidate,
        });
      }
    };

    // When remote video/audio track arrives, capture it as remoteStream
    (pc as any).ontrack = (event: any) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0] as MediaStream);
      }
    };

    return pc;
  };

  const flushIceCandidates = async () => {
    const pc = peerConnection.current;
    if (!pc) return;
    for (const candidate of iceCandidateQueue.current) {
      try { await pc.addIceCandidate(candidate); } catch (_) {}
    }
    iceCandidateQueue.current = [];
  };

  // ── Cleanup helper — stops streams and closes peer connection ─────────────────
  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setCallStatus('idle');
    setCaller(null);
    setCallee(null);
    setIsMuted(false);
    setIsCameraOff(false);
    pendingOffer.current = null;
    pendingCaller.current = null;
    iceCandidateQueue.current = [];
    remoteDescSet.current = false;
  };

  // ── Socket event listeners ────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // Someone is calling us — store the offer and show the incoming call UI
    socket.on('incoming_call', ({ from, callerName, offer }: any) => {
      pendingOffer.current = new RTCSessionDescription(offer);
      pendingCaller.current = { userId: from, name: callerName };
      setCaller({ userId: from, name: callerName });
      setCallStatus('incoming');
    });

    // The person we called picked up — complete the WebRTC handshake
    socket.on('call_answered', async ({ answer }: any) => {
      if (!peerConnection.current) return;
      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
      remoteDescSet.current = true;
      await flushIceCandidates();
      setCallStatus('connected');
    });

    // The person we called declined (or was offline)
    socket.on('call_rejected', ({ reason }: any) => {
      console.log('Call rejected:', reason);
      cleanup();
    });

    // The other person ended the call
    socket.on('call_ended', () => {
      cleanup();
    });

    // ICE candidate from the other side — queue if remote desc not set yet
    socket.on('ice_candidate', async ({ candidate }: any) => {
      if (!candidate) return;
      const iceCandidate = new RTCIceCandidate(candidate);
      if (peerConnection.current && remoteDescSet.current) {
        try { await peerConnection.current.addIceCandidate(iceCandidate); } catch (_) {}
      } else {
        iceCandidateQueue.current.push(iceCandidate);
      }
    });

    return () => {
      socket.off('incoming_call');
      socket.off('call_answered');
      socket.off('call_rejected');
      socket.off('call_ended');
      socket.off('ice_candidate');
    };
  }, [socket]);

  // ── startCall — we are calling someone ───────────────────────────────────────
  const startCall = async (to: CallParticipant) => {
    if (!socket || !user) return;

    const stream = await getLocalStream();
    setLocalStream(stream);
    setCallee(to);
    setCallStatus('calling');

    const pc = createPeerConnection(to.userId);
    peerConnection.current = pc;

    // Add our audio/video tracks to the peer connection
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    // Create the offer (our side's SDP description)
    const offer = await pc.createOffer({});
    await pc.setLocalDescription(offer);

    // Send the offer to the other person via the server
    socket.emit('call_user', {
      to: to.userId,
      offer,
      callerName: user.name,
    });
  };

  // ── answerCall — we are accepting an incoming call ───────────────────────────
  const answerCall = async () => {
    if (!socket || !pendingOffer.current || !pendingCaller.current) return;

    const stream = await getLocalStream();
    setLocalStream(stream);

    const remotePeer = pendingCaller.current;
    const pc = createPeerConnection(remotePeer.userId);
    peerConnection.current = pc;

    // Add our tracks
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    // Set the caller's offer as the remote description
    await pc.setRemoteDescription(pendingOffer.current);
    remoteDescSet.current = true;
    await flushIceCandidates();

    // Create our answer
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    // Send our answer back to the caller
    socket.emit('answer_call', {
      to: remotePeer.userId,
      answer,
    });

    setCallStatus('connected');
  };

  // ── rejectCall — we decline an incoming call ─────────────────────────────────
  const rejectCall = () => {
    if (!socket || !pendingCaller.current) return;
    socket.emit('reject_call', { to: pendingCaller.current.userId });
    cleanup();
  };

  // ── endCall — either side hangs up ───────────────────────────────────────────
  const endCall = () => {
    if (!socket) return;
    const otherId = callee?.userId ?? caller?.userId;
    if (otherId) socket.emit('end_call', { to: otherId });
    cleanup();
  };

  // ── toggleMute — mute/unmute microphone ──────────────────────────────────────
  const toggleMute = () => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach(track => {
      track.enabled = !track.enabled;
    });
    setIsMuted(prev => !prev);
  };

  // ── toggleCamera — turn camera on/off ────────────────────────────────────────
  const toggleCamera = () => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach(track => {
      track.enabled = !track.enabled;
    });
    setIsCameraOff(prev => !prev);
  };

  return (
    <CallContext.Provider
      value={{
        callStatus,
        caller,
        callee,
        localStream,
        remoteStream,
        isMuted,
        isCameraOff,
        startCall,
        answerCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleCamera,
      }}>
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  return useContext(CallContext);
}
