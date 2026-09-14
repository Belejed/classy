import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Mic, 
  MicOff, 
  Headphones, 
  Volume2, 
  VolumeX, 
  PhoneCall, 
  PhoneOff, 
  Radio, 
  Users, 
  Sparkles,
  Hand,
  Crown,
  Check,
  X,
  UserCheck,
  Volume1,
  ArrowDownCircle,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { dbService, isSuperAdmin } from '../utils/db';
import soundFX from '../utils/soundEffects';
import { isClassManager } from '../utils/permissions';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' }
  ]
};

export default function ClassVoiceRoom({
  classId,
  currentUser,
  currentClass,
  roomId = 'main_stage',
  roomName = 'Stage Kelas'
}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isSpeakingLocal, setIsSpeakingLocal] = useState(false);
  const [activePeers, setActivePeers] = useState([]);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  // WebRTC Refs
  const localStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const peerConnectionsRef = useRef(new Map()); // peerId -> RTCPeerConnection
  const remoteAudiosRef = useRef(new Map()); // peerId -> HTMLAudioElement
  const pendingCandidatesRef = useRef(new Map()); // peerId -> RTCIceCandidateInit[]
  const signalsUnsubRef = useRef(null);
  const audioContainerRef = useRef(null);
  const wakeLockRef = useRef(null);
  const isDeafenedRef = useRef(false);
  const myPeerIdRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const prevRoleRef = useRef(null);

  const myUserId = currentUser?.uid || currentUser?.id;

  const myPeerId = useMemo(() => {
    if (!currentUser) return null;
    const uid = currentUser.uid || currentUser.id || 'usr';
    // Unique session ID per device / browser tab to prevent multi-device signaling clashes
    let sess = '';
    const sessionKey = `classy_v_sess_${classId}`;
    try {
      sess = sessionStorage.getItem(sessionKey);
      if (!sess) {
        sess = Math.random().toString(36).substring(2, 7);
        sessionStorage.setItem(sessionKey, sess);
      }
    } catch {
      sess = Math.random().toString(36).substring(2, 7);
    }
    return `${uid}_${sess}`;
  }, [currentUser, classId]);

  // Is current user a Host by class role or superadmin?
  const isHostByRole = useMemo(() => {
    if (!currentUser) return false;
    if (isSuperAdmin(currentUser)) return true;
    const role = currentClass?.userRole;
    const isOwner = currentClass?.ownerId === (currentUser.uid || currentUser.id);
    return isClassManager(role, isOwner);
  }, [currentUser, currentClass]);

  // My current peer entry in active room
  const myPeerData = useMemo(() => {
    return activePeers.find(p => p.peerId === myPeerId);
  }, [activePeers, myPeerId]);

  // My active stage role: 'host' | 'speaker' | 'listener'
  const myStageRole = useMemo(() => {
    if (myPeerData?.role) return myPeerData.role;
    return isHostByRole ? 'host' : 'listener';
  }, [myPeerData, isHostByRole]);

  const canSpeak = myStageRole === 'host' || myStageRole === 'speaker';
  const isRaisingHand = Boolean(myPeerData?.raisingHand);

  // Separate participants into Stage Speakers vs Audience Listeners
  const speakers = useMemo(() => {
    return activePeers.filter(p => p.role === 'host' || p.role === 'speaker');
  }, [activePeers]);

  const listeners = useMemo(() => {
    return activePeers.filter(p => p.role !== 'host' && p.role !== 'speaker');
  }, [activePeers]);

  const handsRaisedList = useMemo(() => {
    return listeners.filter(p => p.raisingHand);
  }, [listeners]);

  // Subscribe to live peers in room
  useEffect(() => {
    if (!classId) return;

    const unsubscribe = dbService.voice.subscribePeers(classId, roomId, (peers) => {
      setActivePeers(peers);
    });

    return () => {
      unsubscribe();
    };
  }, [classId, roomId]);

  // Watch for role promotions / demotions while connected
  useEffect(() => {
    if (!isConnected) return;

    const currentRole = myStageRole;
    const previousRole = prevRoleRef.current;

    if (previousRole && previousRole !== currentRole) {
      if ((currentRole === 'speaker' || currentRole === 'host') && previousRole === 'listener') {
        soundFX.playJoinCall();
        // Promoted to Stage Speaker!
        toast.success('🎉 Anda sekarang berada di panggung! Mikrofon Anda telah diaktifkan.', {
          duration: 5000,
          icon: '🎙️'
        });
        startMicrophoneCapture();
      } else if (currentRole === 'listener' && (previousRole === 'speaker' || previousRole === 'host')) {
        soundFX.playLeaveCall();
        // Demoted to Listener!
        toast('Anda dipindahkan kembali ke barisan penonton (Muted).', {
          icon: '👥'
        });
        stopMicrophoneCapture();
      }
    }

    prevRoleRef.current = currentRole;
  }, [myStageRole, isConnected]);

  // Helper: Start capturing local microphone & broadcasting
  const startMicrophoneCapture = async () => {
    try {
      if (localStreamRef.current) return;

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }, 
        video: false 
      });
      localStreamRef.current = stream;

      // Broadcast audio to all connected peers via instant replaceTrack
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        for (const [targetPeerId, pc] of peerConnectionsRef.current.entries()) {
          try {
            const transceivers = pc.getTransceivers ? pc.getTransceivers() : [];
            const audioTransceiver = transceivers.find(t => t.receiver?.track?.kind === 'audio' || t.sender);
            if (audioTransceiver && audioTransceiver.sender) {
              await audioTransceiver.sender.replaceTrack(audioTrack);
            } else {
              const senders = pc.getSenders ? pc.getSenders() : [];
              if (senders[0]) await senders[0].replaceTrack(audioTrack);
            }
          } catch (trackErr) {
            console.warn(`Failed to replaceTrack for peer ${targetPeerId}:`, trackErr);
          }
        }
      }

      // Setup audio analyser for green speaking ring
      setupAudioAnalyser(stream);
      setIsMuted(false);
      if (classId && myPeerIdRef.current) {
        dbService.voice.updatePeerState(classId, myPeerIdRef.current, { isMuted: false });
      }
    } catch (err) {
      console.warn('Microphone access denied or failed:', err);
      toast.error('Gagal mengakses mikrofon. Pastikan izin mikrofon browser aktif.');
    }
  };

  // Helper: Stop capturing local microphone
  const stopMicrophoneCapture = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }

    // Set sender track to null across all peer connections instantly
    peerConnectionsRef.current.forEach(pc => {
      try {
        const transceivers = pc.getTransceivers ? pc.getTransceivers() : [];
        const audioTransceiver = transceivers.find(t => t.receiver?.track?.kind === 'audio' || t.sender);
        if (audioTransceiver && audioTransceiver.sender) {
          audioTransceiver.sender.replaceTrack(null).catch(() => {});
        } else {
          const senders = pc.getSenders ? pc.getSenders() : [];
          if (senders[0]) senders[0].replaceTrack(null).catch(() => {});
        }
      } catch (e) {}
    });

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch {}
      audioContextRef.current = null;
    }
    setIsSpeakingLocal(false);
    setIsMuted(true);
    if (classId && myPeerIdRef.current) {
      dbService.voice.updatePeerState(classId, myPeerIdRef.current, { isMuted: true, isSpeaking: false });
    }
  };

  // Setup Audio Analyser for Discord-style Speaking Ring
  const setupAudioAnalyser = (stream) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let speakingDebounce = false;
      let lastSpeakingSyncTime = 0;

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const isNowSpeaking = avg > 14 && !isMuted;

        if (isNowSpeaking !== speakingDebounce) {
          speakingDebounce = isNowSpeaking;
          setIsSpeakingLocal(isNowSpeaking);
          const now = Date.now();
          if (now - lastSpeakingSyncTime > 2000) {
            lastSpeakingSyncTime = now;
            if (classId && myPeerIdRef.current) {
              dbService.voice.updatePeerState(classId, myPeerIdRef.current, { isSpeaking: isNowSpeaking });
            }
          }
        }

        animFrameRef.current = requestAnimationFrame(checkVolume);
      };
      checkVolume();
    } catch (e) {
      console.warn('AudioContext setup skipped:', e);
    }
  };

  // Create RTCPeerConnection Helper
  const createPeerConnection = (targetPeerId) => {
    let pc = peerConnectionsRef.current.get(targetPeerId);
    if (pc && pc.connectionState !== 'closed') {
      return pc;
    }

    pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionsRef.current.set(targetPeerId, pc);

    // Always configure a sendrecv audio transceiver
    const transceiver = pc.addTransceiver('audio', { direction: 'sendrecv' });

    // If local microphone stream is already active, attach its track to the sender immediately
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        transceiver.sender.replaceTrack(audioTrack).catch(e => console.warn('replaceTrack err:', e));
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && myPeerIdRef.current) {
        dbService.voice.sendSignal(classId, {
          fromPeerId: myPeerIdRef.current,
          toPeerId: targetPeerId,
          signal: { candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate }
        });
      }
    };

    pc.ontrack = (event) => {
      console.log(`[ClassVoiceRoom] ontrack from ${targetPeerId}`, event);
      let audio = remoteAudiosRef.current.get(targetPeerId);
      if (!audio) {
        audio = document.createElement('audio');
        audio.autoplay = true;
        audio.playsInline = true;
        audio.setAttribute('playsinline', '');
        audio.setAttribute('autoplay', '');
        // Append directly to document.body so CSS display:none on any container NEVER silences the audio
        audio.style.position = 'fixed';
        audio.style.top = '-9999px';
        audio.style.left = '-9999px';
        audio.style.width = '1px';
        audio.style.height = '1px';
        audio.style.opacity = '0.001';
        audio.style.pointerEvents = 'none';
        document.body.appendChild(audio);
        remoteAudiosRef.current.set(targetPeerId, audio);
      }
      const stream = event.streams[0] || new MediaStream([event.track]);
      audio.srcObject = stream;
      audio.muted = isDeafenedRef.current;
      audio.play().catch(playErr => {
        console.warn('[ClassVoiceRoom] Audio play error:', playErr);
        setAutoplayBlocked(true);
      });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        try {
          pc.restartIce();
        } catch {}
      }
    };

    return pc;
  };

  const initiatePeerConnection = async (targetPeerId) => {
    try {
      const pc = createPeerConnection(targetPeerId);
      // Avoid initiating offer if peer connection is already busy in an offer/answer exchange
      if (pc.signalingState !== 'stable') {
        return;
      }
      const offer = await pc.createOffer({
        offerToReceiveAudio: true
      });
      await pc.setLocalDescription(offer);
      if (myPeerIdRef.current) {
        await dbService.voice.sendSignal(classId, {
          fromPeerId: myPeerIdRef.current,
          toPeerId: targetPeerId,
          signal: offer
        });
      }
    } catch (err) {
      console.warn('Error initiating peer connection:', err);
    }
  };

  // Handle Joining Stage
  const handleJoinStage = async () => {
    if (!classId || !currentUser) {
      toast.error('Silakan login terlebih dahulu untuk masuk ke Stage.');
      return;
    }

    setIsConnecting(true);
    myPeerIdRef.current = myPeerId;

    const initialRole = isHostByRole ? 'host' : 'listener';
    prevRoleRef.current = initialRole;

    try {
      // 1. If Host, capture mic right away. If Listener, join silently (listen only)
      if (initialRole === 'host') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, 
            video: false 
          });
          localStreamRef.current = stream;
          setupAudioAnalyser(stream);
        } catch (micErr) {
          console.warn('Host microphone permission issue:', micErr);
          toast('Masuk ke panggung tanpa mic (bisa diaktifkan nanti).', { icon: 'ℹ️' });
        }
      }

      // 2. Register Peer in Firestore
      await dbService.voice.joinRoom(classId, roomId, {
        peerId: myPeerId,
        userId: currentUser.uid || currentUser.id,
        userName: currentUser.displayName || currentUser.name || (currentUser.email ? currentUser.email.split('@')[0] : 'Mahasiswa'),
        userEmail: currentUser.email || '',
        avatar: currentUser.photoURL || currentUser.avatar || '',
        role: initialRole,
        raisingHand: false,
        isMuted: initialRole === 'listener',
        isDeafened: false
      });

      // 3. Heartbeat
      heartbeatIntervalRef.current = setInterval(() => {
        if (myPeerIdRef.current) {
          dbService.voice.updatePeerState(classId, myPeerIdRef.current, { lastSeen: Date.now() });
        }
      }, 15000);

      // 4. Subscribe to WebRTC Signals
      signalsUnsubRef.current = dbService.voice.subscribeSignals(classId, myPeerId, async ({ fromPeerId, signal }) => {
        // Prevent feedback loop between multiple tabs of same user
        const fromPeer = activePeers.find(p => p.peerId === fromPeerId);
        if (fromPeer && fromPeer.userId === myUserId) {
          return;
        }

        let pc = peerConnectionsRef.current.get(fromPeerId);

        if (signal.type === 'offer') {
          if (!pc) pc = createPeerConnection(fromPeerId);

          // Handle offer glare/collision gracefully
          if (pc.signalingState !== 'stable') {
            console.warn(`[ClassVoiceRoom] Offer collision with ${fromPeerId}, state: ${pc.signalingState}`);
            // If myPeerId < fromPeerId (impolite peer), ignore incoming offer and let existing offer proceed
            if (myPeerId < fromPeerId) {
              return;
            }
            try {
              await pc.setLocalDescription({ type: 'rollback' });
            } catch {}
          }

          await pc.setRemoteDescription(new RTCSessionDescription(signal));

          // Flush any queued ICE candidates for this peer
          const queued = pendingCandidatesRef.current.get(fromPeerId) || [];
          for (const cand of queued) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch (e) {
              console.warn('Error flushing candidate:', e);
            }
          }
          pendingCandidatesRef.current.delete(fromPeerId);

          const answer = await pc.createAnswer({ offerToReceiveAudio: true });
          await pc.setLocalDescription(answer);
          if (myPeerIdRef.current) {
            await dbService.voice.sendSignal(classId, {
              fromPeerId: myPeerIdRef.current,
              toPeerId: fromPeerId,
              signal: answer
            });
          }
        } else if (signal.type === 'answer') {
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(signal));
            // Flush queued ICE candidates
            const queued = pendingCandidatesRef.current.get(fromPeerId) || [];
            for (const cand of queued) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              } catch (e) {
                console.warn('Error flushing candidate:', e);
              }
            }
            pendingCandidatesRef.current.delete(fromPeerId);
          }
        } else if (signal.candidate) {
          if (pc && pc.remoteDescription && pc.remoteDescription.type) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
            } catch (candErr) {
              console.warn('Error adding candidate:', candErr);
            }
          } else {
            // Buffer candidate until remote description is set
            const queued = pendingCandidatesRef.current.get(fromPeerId) || [];
            queued.push(signal.candidate);
            pendingCandidatesRef.current.set(fromPeerId, queued);
          }
        }
      });

      // 5. Connect to Existing Peers (Deterministic rule: lower peerId initiates)
      activePeers.forEach((peer) => {
        if (peer.peerId !== myPeerId && peer.userId !== myUserId) {
          if (myPeerId < peer.peerId) {
            initiatePeerConnection(peer.peerId);
          }
        }
      });

      setIsConnected(true);
      soundFX.playJoinCall();
      if (initialRole === 'host') {
        toast.success('Membuka Panggung Suara sebagai Host! 👑');
      } else {
        toast.success('Terhubung ke Panggung Suara (Mode Mendengar) 🎧');
      }
    } catch (err) {
      console.error('Failed to join stage:', err);
      toast.error('Gagal terhubung ke panggung suara.');
      handleLeaveStage();
    } finally {
      setIsConnecting(false);
    }
  };

  // Automatically establish connection with newly joined peers
  useEffect(() => {
    if (!isConnected || !myPeerId) return;

    activePeers.forEach((peer) => {
      if (peer.peerId === myPeerId) return;
      if (peer.userId === myUserId) return;

      // Deterministic initiation rule: peer with alphabetically lower peerId initiates
      if (!peerConnectionsRef.current.has(peer.peerId)) {
        if (myPeerId < peer.peerId) {
          initiatePeerConnection(peer.peerId);
        }
      }
    });

    // Only cleanup peers whose WebRTC connection is closed (Never drop live audio connections)
    peerConnectionsRef.current.forEach((pc, pId) => {
      if (pc.connectionState === 'closed') {
        peerConnectionsRef.current.delete(pId);
        const audioEl = remoteAudiosRef.current.get(pId);
        if (audioEl) {
          try {
            audioEl.pause();
            audioEl.srcObject = null;
            audioEl.remove();
          } catch {}
          remoteAudiosRef.current.delete(pId);
        }
        pendingCandidatesRef.current.delete(pId);
      }
    });
  }, [activePeers, isConnected, myPeerId, myUserId]);

  // MediaSession API & Background Tab Audio Management
  useEffect(() => {
    if (!isConnected) {
      if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'none';
      }
      return;
    }

    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: roomName || 'Panggung Suara',
          artist: currentClass?.name || 'Classy Live Stage',
          album: 'Ruang Suara Kelas',
          artwork: [
            { src: '/logo.png', sizes: '192x192', type: 'image/png' },
            { src: '/logo.png', sizes: '512x512', type: 'image/png' }
          ]
        });
        navigator.mediaSession.playbackState = 'playing';

        // Do NOT mute or deafen on background media pause
        navigator.mediaSession.setActionHandler('pause', () => {});
        navigator.mediaSession.setActionHandler('play', () => {});
        navigator.mediaSession.setActionHandler('stop', () => {
          handleLeaveStage();
        });
      } catch (msErr) {
        console.warn('MediaSession handler error:', msErr);
      }
    }

    // Screen Wake Lock API (keeps mobile browser awake during call)
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      navigator.wakeLock.request('screen').then(lock => {
        wakeLockRef.current = lock;
      }).catch(() => {});
    }

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [isConnected, roomName, currentClass]);

  // Browser Tab Switching (Visibility Change & Window Focus) Listeners
  useEffect(() => {
    if (!isConnected) return;

    const handleTabSwitch = () => {
      // Resume AudioContext if browser suspended it during tab switch
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }
      // Ensure all remote audio elements are actively playing
      remoteAudiosRef.current.forEach(audio => {
        if (audio && audio.paused && !isDeafened) {
          audio.play().catch(() => {});
        }
      });
      // Ping presence heartbeat so connection stays fresh
      if (classId && myPeerIdRef.current) {
        dbService.voice.updatePeerState(classId, myPeerIdRef.current, { lastSeen: Date.now() });
      }
    };

    document.addEventListener('visibilitychange', handleTabSwitch);
    window.addEventListener('focus', handleTabSwitch);

    return () => {
      document.removeEventListener('visibilitychange', handleTabSwitch);
      window.removeEventListener('focus', handleTabSwitch);
    };
  }, [isConnected, isDeafened, classId]);

  // Toggle Mute (For Host & Speakers)
  const handleToggleMute = () => {
    if (!localStreamRef.current) return;
    const nextMuted = !isMuted;
    localStreamRef.current.getAudioTracks().forEach(track => {
      track.enabled = !nextMuted;
    });
    setIsMuted(nextMuted);
    if (classId && myPeerIdRef.current) {
      dbService.voice.updatePeerState(classId, myPeerIdRef.current, { isMuted: nextMuted });
    }
    toast(nextMuted ? 'Mikrofon dimatikan (Muted)' : 'Mikrofon aktif (Unmuted)', {
      icon: nextMuted ? '🔇' : '🎙️'
    });
  };

  // Toggle Deafen
  const handleToggleDeafen = () => {
    const nextDeafen = !isDeafened;
    setIsDeafened(nextDeafen);
    isDeafenedRef.current = nextDeafen;

    remoteAudiosRef.current.forEach(audio => {
      if (audio) audio.muted = nextDeafen;
    });

    if (nextDeafen && !isMuted && canSpeak) {
      handleToggleMute();
    }

    if (classId && myPeerIdRef.current) {
      dbService.voice.updatePeerState(classId, myPeerIdRef.current, { isDeafened: nextDeafen });
    }
    toast(nextDeafen ? 'Audio panggung dimatikan' : 'Audio panggung aktif', {
      icon: nextDeafen ? '🎧🔇' : '🎧'
    });
  };

  // Unlock Audio if blocked by browser autoplay policy
  const handleUnlockAudio = () => {
    remoteAudiosRef.current.forEach(audio => {
      if (audio) {
        audio.play().catch(() => {});
      }
    });
    setAutoplayBlocked(false);
    toast.success('Audio panggung diaktifkan! 🔊');
  };

  // Toggle Raise Hand (Request to Speak)
  const handleToggleRaiseHand = async () => {
    if (!isConnected || canSpeak) return;
    const nextRaising = !isRaisingHand;
    await dbService.voice.requestToSpeak(classId, myPeerId, nextRaising);
    if (nextRaising) {
      soundFX.playRaiseHand();
      toast('Tangan diangkat! Menunggu izin Host untuk berbicara ✋', {
        icon: '✋',
        duration: 4000
      });
    } else {
      toast('Permintaan berbicara dibatalkan.', { icon: '👌' });
    }
  };

  // Host Action: Approve Request to Speak (Promote to Speaker)
  const handleApproveSpeaker = async (peerId, peerName) => {
    await dbService.voice.promoteToSpeaker(classId, peerId);
    toast.success(`${peerName} diizinkan ke panggung sebagai pembicara! 🎙️`);
  };

  // Host Action: Reject Request to Speak
  const handleRejectSpeaker = async (peerId) => {
    await dbService.voice.requestToSpeak(classId, peerId, false);
    toast('Permintaan bicara ditolak.', { icon: '❌' });
  };

  // Host Action: Move Speaker Back to Audience
  const handleDemoteSpeaker = async (peerId, peerName) => {
    await dbService.voice.demoteToListener(classId, peerId);
    toast(`${peerName} diturunkan kembali ke penonton.`);
  };

  // Speaker Self-Demote: Step Down from Stage
  const handleStepDown = async () => {
    await dbService.voice.demoteToListener(classId, myPeerId);
    stopMicrophoneCapture();
    toast('Anda telah turun dari panggung ke penonton.', { icon: '👥' });
  };

  // Leave Stage
  const handleLeaveStage = async () => {
    soundFX.playLeaveCall();
    stopMicrophoneCapture();

    if (signalsUnsubRef.current) {
      signalsUnsubRef.current();
      signalsUnsubRef.current = null;
    }

    peerConnectionsRef.current.forEach(pc => {
      try { pc.close(); } catch {}
    });
    peerConnectionsRef.current.clear();

    remoteAudiosRef.current.forEach(audio => {
      try {
        audio.pause();
        audio.srcObject = null;
        audio.remove();
      } catch {}
    });
    remoteAudiosRef.current.clear();
    pendingCandidatesRef.current.clear();

    if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);

    if (classId && myPeerIdRef.current) {
      await dbService.voice.leaveRoom(classId, myPeerIdRef.current);
    }

    setIsConnected(false);
    setIsMuted(false);
    setIsDeafened(false);
    isDeafenedRef.current = false;
    setAutoplayBlocked(false);
    prevRoleRef.current = null;
    setShowRequestsModal(false);
    toast('Keluar dari panggung suara', { icon: '👋' });
  };

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (isConnected) {
        handleLeaveStage();
      }
    };
  }, [isConnected]);

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-slate-700/60 space-y-5">
      
      {/* 1. STAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
            isConnected 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-md shadow-emerald-500/20' 
              : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}>
            <Radio size={22} className={isConnected ? 'animate-pulse text-emerald-400' : ''} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                {roomName}
              </h3>
              <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                isConnected 
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' 
                  : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
              }`}>
                {isConnected ? '🔴 LIVE' : 'Panggung Suara'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Format panggung: pembicara diizinkan bicara, penonton menyimak & dapat mengangkat tangan untuk berbicara.
            </p>
          </div>
        </div>

        {/* Action Button: Connect / Controls */}
        <div className="flex items-center gap-2">
          {!isConnected ? (
            <button
              type="button"
              onClick={handleJoinStage}
              disabled={isConnecting}
              className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <PhoneCall size={14} />
              <span>{isConnecting ? 'Menghubungkan...' : (isHostByRole ? 'Buka Panggung (Host)' : 'Masuk (Menyimak)')}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              {/* Speaker Mic Toggle */}
              {canSpeak && (
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className={`px-3.5 py-2 rounded-2xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
                    isMuted 
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 hover:bg-rose-500/30' 
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                  }`}
                  title={isMuted ? 'Buka Mikrofon' : 'Matikan Mikrofon'}
                >
                  {isMuted ? <MicOff size={15} /> : <Mic size={15} />}
                  <span>{isMuted ? 'Muted' : 'Mic Aktif'}</span>
                </button>
              )}

              {/* Speaker Step Down Button */}
              {myStageRole === 'speaker' && (
                <button
                  type="button"
                  onClick={handleStepDown}
                  className="px-3 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Turun dari panggung ke penonton"
                >
                  <ArrowDownCircle size={14} />
                  <span>Turun</span>
                </button>
              )}

              {/* Listener Raise Hand Button */}
              {!canSpeak && (
                <button
                  type="button"
                  onClick={handleToggleRaiseHand}
                  className={`px-4 py-2 rounded-2xl border transition-all cursor-pointer flex items-center gap-2 text-xs font-extrabold ${
                    isRaisingHand
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/30 animate-pulse'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 shadow-xs'
                  }`}
                >
                  <Hand size={15} className={isRaisingHand ? 'animate-bounce' : ''} />
                  <span>{isRaisingHand ? '✋ Menunggu Izin...' : '✋ Minta Izin Bicara'}</span>
                </button>
              )}

              {/* Deafen Button */}
              <button
                type="button"
                onClick={handleToggleDeafen}
                className={`p-2 rounded-2xl border transition-all cursor-pointer ${
                  isDeafened 
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 hover:bg-rose-500/30' 
                    : 'bg-slate-800/80 text-white border-slate-700 hover:bg-slate-700'
                }`}
                title={isDeafened ? 'Hidupkan Suara Panggung' : 'Matikan Suara (Deafen)'}
              >
                {isDeafened ? <VolumeX size={16} /> : <Headphones size={16} />}
              </button>

              {/* Leave Button */}
              <button
                type="button"
                onClick={handleLeaveStage}
                className="px-4 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <PhoneOff size={14} />
                <span>Keluar</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* AUTOPLAY UNLOCK BANNER */}
      {isConnected && autoplayBlocked && (
        <div 
          onClick={handleUnlockAudio}
          className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 border border-amber-300 text-slate-950 font-bold flex items-center justify-between gap-3 cursor-pointer shadow-lg animate-bounce"
        >
          <div className="flex items-center gap-2.5 text-xs">
            <Volume2 size={20} className="shrink-0 animate-pulse" />
            <span>Suara tertahan kebijakan peramban (browser). Klik di sini untuk mengaktifkan suara panggung! 🔊</span>
          </div>
          <span className="px-3 py-1.5 rounded-xl bg-slate-950 text-white font-extrabold text-xs shrink-0 shadow-md">
            Aktifkan Suara
          </span>
        </div>
      )}

      {/* 2. HOST NOTIFICATION BANNER (HANDS RAISED ALERT) */}
      {isHostByRole && isConnected && handsRaisedList.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5 text-xs font-bold">
            <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-extrabold text-xs shrink-0">
              ✋
            </span>
            <span>
              {handsRaisedList.length} mahasiswa meminta izin berbicara di panggung:
            </span>
            <div className="hidden sm:flex items-center gap-1.5">
              {handsRaisedList.slice(0, 3).map(p => (
                <span key={p.peerId} className="px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-100 text-[11px] font-semibold truncate max-w-[120px]">
                  {p.userName}
                </span>
              ))}
              {handsRaisedList.length > 3 && (
                <span className="text-[11px] text-amber-300">+{handsRaisedList.length - 3} lainnya</span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowRequestsModal(true)}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold cursor-pointer transition-colors shrink-0 shadow-xs"
          >
            Tinjau Permintaan ({handsRaisedList.length})
          </button>
        </div>
      )}

      {/* 3. SECTION: 🎤 PEMBICARA DI PANGGUNG (THE STAGE SPEAKERS) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-300 font-semibold px-1">
          <span className="flex items-center gap-2 text-indigo-300 font-bold uppercase tracking-wider text-[11px]">
            <Radio size={14} className="text-emerald-400" />
            Panggung Pembicara ({speakers.length})
          </span>
          <span className="text-[11px] text-slate-400">
            Hanya pembicara yang memiliki mikrofon aktif
          </span>
        </div>

        {speakers.length === 0 ? (
          <div className="py-8 text-center rounded-2xl bg-slate-800/40 border border-slate-700/50 text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
            <MicOff size={20} className="text-slate-500" />
            <span>Belum ada pembicara di panggung. Host dapat memulai atau penonton dapat mengangkat tangan!</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
            {speakers.map((peer) => {
              const isMe = peer.peerId === myPeerId;
              const isSpeaking = isMe ? isSpeakingLocal : Boolean(peer.isSpeaking);
              const isHost = peer.role === 'host';

              return (
                <div 
                  key={peer.peerId}
                  className={`relative p-3.5 rounded-2xl bg-slate-800/90 border transition-all flex flex-col items-center text-center space-y-2.5 ${
                    isSpeaking 
                      ? 'border-emerald-400 shadow-xl shadow-emerald-500/25 scale-[1.02] bg-slate-800' 
                      : isHost 
                        ? 'border-amber-500/40 shadow-xs' 
                        : 'border-slate-700/70'
                  }`}
                >
                  {/* Speaker Avatar with Discord Ring */}
                  <div className="relative">
                    <div className={`w-14 h-14 rounded-full overflow-hidden flex items-center justify-center font-bold text-base transition-all ${
                      isSpeaking 
                        ? 'ring-4 ring-emerald-400 ring-offset-2 ring-offset-slate-900 shadow-lg shadow-emerald-400/60' 
                        : isHost
                          ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900'
                          : 'ring-1 ring-slate-600'
                    } ${
                      peer.avatar ? 'bg-slate-700' : isHost ? 'bg-gradient-to-tr from-amber-600 to-orange-600 text-white' : 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white'
                    }`}>
                      {peer.avatar ? (
                        <img src={peer.avatar} alt={peer.userName} className="w-full h-full object-cover" />
                      ) : (
                        (peer.userName || 'M').charAt(0).toUpperCase()
                      )}
                    </div>

                    {/* Role Badge (Crown for Host, Mic for Speaker) */}
                    <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center shadow-md text-white ${
                      isHost ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-indigo-600'
                    }`} title={isHost ? 'Host Panggung' : 'Pembicara'}>
                      {isHost ? <Crown size={12} className="fill-slate-950" /> : <Mic size={12} />}
                    </div>

                    {/* Mute Indicator */}
                    {peer.isMuted && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-xs">
                        <MicOff size={10} />
                      </div>
                    )}
                  </div>

                  {/* Name & Role */}
                  <div className="w-full">
                    <div className="flex items-center justify-center gap-1">
                      <p className="text-xs font-bold text-white truncate max-w-[120px]">
                        {peer.userName}
                      </p>
                      {isMe && <span className="text-[10px] text-emerald-400 font-semibold">(Anda)</span>}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {isSpeaking ? (
                        <span className="text-emerald-400 font-bold animate-pulse">Berbicara... 🎙️</span>
                      ) : peer.isMuted ? (
                        <span className="text-rose-400 font-medium">Muted</span>
                      ) : isHost ? (
                        <span className="text-amber-300 font-medium">Host Panggung</span>
                      ) : (
                        <span className="text-indigo-300 font-medium">Pembicara</span>
                      )}
                    </p>
                  </div>

                  {/* Host Quick Control for Speaker */}
                  {isHostByRole && !isMe && (
                    <div className="pt-1.5 w-full border-t border-slate-700/50 flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDemoteSpeaker(peer.peerId, peer.userName)}
                        className="text-[10px] text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 px-2 py-0.5 rounded-md transition-colors cursor-pointer flex items-center gap-1"
                        title="Turunkan ke penonton"
                      >
                        <ArrowDownCircle size={11} />
                        <span>Turunkan</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. SECTION: 👥 PENONTON & PENDENGAR (AUDIENCE - LISTENERS) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between text-xs text-slate-300 font-semibold px-1">
          <span className="flex items-center gap-2 text-slate-300 font-bold uppercase tracking-wider text-[11px]">
            <Users size={14} className="text-slate-400" />
            Penonton & Pendengar ({listeners.length})
          </span>
          <span className="text-[11px] text-slate-400">
            Otomatis senyap / mendengarkan
          </span>
        </div>

        {listeners.length === 0 ? (
          <div className="py-4 text-center rounded-2xl bg-slate-800/30 border border-slate-700/40 text-slate-500 text-xs">
            Belum ada penonton di ruang ini.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {listeners.map((peer) => {
              const isMe = peer.peerId === myPeerId;
              const hasRaisedHand = Boolean(peer.raisingHand);

              return (
                <div 
                  key={peer.peerId}
                  className={`relative p-3 rounded-2xl bg-slate-800/60 border transition-all flex flex-col items-center text-center space-y-2 ${
                    hasRaisedHand 
                      ? 'border-amber-400/80 bg-amber-500/10 shadow-md shadow-amber-500/15' 
                      : 'border-slate-700/50'
                  }`}
                >
                  {/* Listener Avatar */}
                  <div className="relative">
                    <div className={`w-11 h-11 rounded-full overflow-hidden flex items-center justify-center font-bold text-xs transition-all ${
                      hasRaisedHand 
                        ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900' 
                        : 'ring-1 ring-slate-700'
                    } ${
                      peer.avatar ? 'bg-slate-700' : 'bg-slate-700 text-slate-300'
                    }`}>
                      {peer.avatar ? (
                        <img src={peer.avatar} alt={peer.userName} className="w-full h-full object-cover" />
                      ) : (
                        (peer.userName || 'M').charAt(0).toUpperCase()
                      )}
                    </div>

                    {/* Raised Hand Badge */}
                    {hasRaisedHand && (
                      <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center shadow-xs animate-bounce" title="Meminta izin berbicara">
                        ✋
                      </div>
                    )}

                    {/* Muted Icon */}
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-slate-700 text-slate-400 flex items-center justify-center shadow-xs">
                      <MicOff size={8} />
                    </div>
                  </div>

                  {/* Name */}
                  <div className="w-full">
                    <p className="text-xs font-semibold text-slate-200 truncate max-w-full">
                      {peer.userName} {isMe && '(Anda)'}
                    </p>
                    <span className="text-[10px] text-slate-400">
                      {hasRaisedHand ? (
                        <span className="text-amber-300 font-semibold animate-pulse">✋ Minta bicara</span>
                      ) : (
                        'Mendengarkan'
                      )}
                    </span>
                  </div>

                  {/* Host Quick Approval for Raised Hand */}
                  {isHostByRole && hasRaisedHand && (
                    <div className="w-full pt-1 border-t border-slate-700/60 flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleApproveSpeaker(peer.peerId, peer.userName)}
                        className="px-2 py-0.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-extrabold transition-colors cursor-pointer"
                        title="Izinkan bicara di panggung"
                      >
                        Izinkan 🎙️
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectSpeaker(peer.peerId)}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Tolak permintaan"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}

                  {/* Host Invite Listener Directly */}
                  {isHostByRole && !hasRaisedHand && (
                    <button
                      type="button"
                      onClick={() => handleApproveSpeaker(peer.peerId, peer.userName)}
                      className="text-[10px] text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/10 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                      title="Undang ke panggung"
                    >
                      + Panggung
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. MODAL: HOST REVIEW SPEAK REQUESTS */}
      {showRequestsModal && (
        <div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">✋</span>
                <h4 className="text-base font-bold text-white">Permintaan Bicara Panggung</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowRequestsModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
              {handsRaisedList.length === 0 ? (
                <p className="text-center py-6 text-xs text-slate-400">
                  Tidak ada permintaan bicara saat ini.
                </p>
              ) : (
                handsRaisedList.map(peer => (
                  <div 
                    key={peer.peerId}
                    className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-white shrink-0">
                        {(peer.userName || 'M').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{peer.userName}</p>
                        <p className="text-[10px] text-amber-300 font-medium">Ingin berbicara di panggung</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleApproveSpeaker(peer.peerId, peer.userName)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                      >
                        <Check size={13} />
                        <span>Izinkan</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectSpeaker(peer.peerId)}
                        className="p-1.5 rounded-xl bg-slate-700 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Tolak"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowRequestsModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
