import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Mic, 
  MicOff, 
  Headphones, 
  Volume2, 
  VolumeX, 
  PhoneCall, 
  PhoneOff, 
  Users, 
  Crown, 
  X, 
  Radio
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
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.relay.metered.ca:80' }
  ]
};

export default function ClassVoiceRoom({
  classId,
  currentUser,
  currentClass,
  roomId = 'main_stage',
  roomName = 'Obrolan Suara Kelas'
}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isSpeakingLocal, setIsSpeakingLocal] = useState(false);
  const [activePeers, setActivePeers] = useState([]);
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
  const wakeLockRef = useRef(null);
  const isDeafenedRef = useRef(false);
  const isMutedRef = useRef(false);
  const myPeerIdRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);

  const myUserId = currentUser?.uid || currentUser?.id;

  const myPeerId = useMemo(() => {
    if (!currentUser) return null;
    const uid = currentUser.uid || currentUser.id || 'usr';
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

  // Is current user a Host / Class Manager?
  const isHostByRole = useMemo(() => {
    if (!currentUser) return false;
    if (isSuperAdmin(currentUser)) return true;
    const role = currentClass?.userRole;
    const isOwner = currentClass?.ownerId === (currentUser.uid || currentUser.id);
    return isClassManager(role, isOwner);
  }, [currentUser, currentClass]);

  // Subscribe to live peers in room + auto-prune stale peers
  useEffect(() => {
    if (!classId) return;

    const unsubscribe = dbService.voice.subscribePeers(classId, roomId, (peers) => {
      setActivePeers(peers);
    });

    // Local prune interval: instantly drops ghost peers if inactive > 35s
    const pruneInterval = setInterval(() => {
      const now = Date.now();
      setActivePeers(prev => {
        let hasStale = false;
        const fresh = prev.filter(p => {
          const lastSeen = Number(p.lastSeen || p.joinedAt || 0);
          const isStale = (now - lastSeen) > 35000;
          if (isStale) {
            hasStale = true;
            if (classId) {
              dbService.voice.leaveRoom(classId, p.peerId);
            }
          }
          return !isStale;
        });
        return hasStale ? fresh : prev;
      });
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(pruneInterval);
    };
  }, [classId, roomId]);

  // Setup Audio Analyser for Speaking Ring
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
        const isNowSpeaking = avg > 14 && !isMutedRef.current;

        if (isNowSpeaking !== speakingDebounce) {
          speakingDebounce = isNowSpeaking;
          setIsSpeakingLocal(isNowSpeaking);
          const now = Date.now();
          if (now - lastSpeakingSyncTime > 1500) {
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

  // Helper to ensure remote audio element exists and is playing
  const handleRemoteTrack = (targetPeerId, track, stream) => {
    if (!track) return;
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

    const mediaStream = (stream && stream.getTracks().length > 0) 
      ? stream 
      : new MediaStream([track]);
    
    audio.srcObject = mediaStream;
    audio.volume = 1.0;
    audio.muted = isDeafenedRef.current;

    const playAudio = () => {
      if (!isDeafenedRef.current) {
        audio.muted = false;
        audio.volume = 1.0;
        const p = audio.play();
        if (p && typeof p.catch === 'function') {
          p.catch(playErr => {
            console.warn(`[ClassVoiceRoom] Audio play error from ${targetPeerId}:`, playErr);
            setAutoplayBlocked(true);
          });
        }
      }
    };

    track.onunmute = () => {
      console.log(`[ClassVoiceRoom] Remote track onunmute from ${targetPeerId}`);
      audio.srcObject = new MediaStream([track]);
      playAudio();
    };

    playAudio();
  };

  // Create RTCPeerConnection Helper
  const createPeerConnection = (targetPeerId) => {
    let pc = peerConnectionsRef.current.get(targetPeerId);
    if (pc && pc.connectionState !== 'closed') {
      return pc;
    }

    pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionsRef.current.set(targetPeerId, pc);

    // Attach local microphone track immediately so connection is full-duplex sendrecv
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
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
      handleRemoteTrack(targetPeerId, event.track, event.streams && event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      console.log(`[ClassVoiceRoom] Connection state with ${targetPeerId}: ${pc.connectionState}`);
      if (pc.connectionState === 'failed') {
        try { pc.restartIce(); } catch {}
      }
    };

    return pc;
  };

  const initiatePeerConnection = async (targetPeerId) => {
    try {
      const pc = createPeerConnection(targetPeerId);
      if (pc.signalingState !== 'stable') return;
      const offer = await pc.createOffer();
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

  // Handle Joining Voice Room
  const handleJoinRoom = async () => {
    if (!classId || !currentUser) {
      toast.error('Silakan login terlebih dahulu untuk masuk ke Obrolan Suara.');
      return;
    }

    // Immediately trigger user-gesture audio unlock so browser won't block incoming WebRTC audio later
    soundFX.playJoinCall();
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const tempCtx = new AudioCtx();
        tempCtx.resume().then(() => {
          try { tempCtx.close(); } catch {}
        }).catch(() => {});
      }
    } catch {}

    try {
      const dummyAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
      dummyAudio.volume = 0.01;
      dummyAudio.play().then(() => {
        try { dummyAudio.pause(); dummyAudio.remove(); } catch {}
      }).catch(() => {});
    } catch {}

    setIsConnecting(true);
    myPeerIdRef.current = myPeerId;

    try {
      // 1. Capture microphone immediately
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, 
        video: false 
      });
      localStreamRef.current = stream;
      setupAudioAnalyser(stream);

      // 2. Register Peer in Firestore
      await dbService.voice.joinRoom(classId, roomId, {
        peerId: myPeerId,
        userId: currentUser.uid || currentUser.id,
        userName: currentUser.displayName || currentUser.name || (currentUser.email ? currentUser.email.split('@')[0] : 'Mahasiswa'),
        userEmail: currentUser.email || '',
        avatar: currentUser.photoURL || currentUser.avatar || '',
        isHost: isHostByRole,
        isMuted: false,
        isDeafened: false
      });

      // 3. Heartbeat every 10s so stale sessions are detected within 35s
      heartbeatIntervalRef.current = setInterval(() => {
        if (myPeerIdRef.current) {
          dbService.voice.updatePeerState(classId, myPeerIdRef.current, { lastSeen: Date.now() });
        }
      }, 10000);

      // 4. Subscribe to WebRTC Signals
      signalsUnsubRef.current = dbService.voice.subscribeSignals(classId, myPeerId, async ({ fromPeerId, signal }) => {
        if (fromPeerId === myPeerId) return;

        let pc = peerConnectionsRef.current.get(fromPeerId);

        if (signal.type === 'offer') {
          if (!pc) pc = createPeerConnection(fromPeerId);

          // Handle offer glare/collision gracefully
          if (pc.signalingState !== 'stable') {
            console.warn(`[ClassVoiceRoom] Offer collision with ${fromPeerId}, state: ${pc.signalingState}`);
            if (myPeerId < fromPeerId) return;
            try { await pc.setLocalDescription({ type: 'rollback' }); } catch {}
          }

          await pc.setRemoteDescription(new RTCSessionDescription(signal));

          // Flush queued candidates
          const queued = pendingCandidatesRef.current.get(fromPeerId) || [];
          for (const cand of queued) {
            try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch (e) {}
          }
          pendingCandidatesRef.current.delete(fromPeerId);

          // Ensure local mic track is added
          if (localStreamRef.current) {
            const senders = pc.getSenders ? pc.getSenders() : [];
            const hasAudioSender = senders.some(s => s.track && s.track.kind === 'audio');
            if (!hasAudioSender) {
              const audioTrack = localStreamRef.current.getAudioTracks()[0];
              if (audioTrack) {
                pc.addTrack(audioTrack, localStreamRef.current);
              }
            }
          }

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          if (myPeerIdRef.current) {
            await dbService.voice.sendSignal(classId, {
              fromPeerId: myPeerIdRef.current,
              toPeerId: fromPeerId,
              signal: answer
            });
          }

          // Ensure receiver track is attached and playing
          try {
            const receivers = pc.getReceivers ? pc.getReceivers() : [];
            const audioReceiver = receivers.find(r => r.track && r.track.kind === 'audio');
            if (audioReceiver && audioReceiver.track) {
              handleRemoteTrack(fromPeerId, audioReceiver.track);
            }
          } catch {}
        } else if (signal.type === 'answer') {
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(signal));
            const queued = pendingCandidatesRef.current.get(fromPeerId) || [];
            for (const cand of queued) {
              try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch (e) {}
            }
            pendingCandidatesRef.current.delete(fromPeerId);

            try {
              const receivers = pc.getReceivers ? pc.getReceivers() : [];
              const audioReceiver = receivers.find(r => r.track && r.track.kind === 'audio');
              if (audioReceiver && audioReceiver.track) {
                handleRemoteTrack(fromPeerId, audioReceiver.track);
              }
            } catch {}
          }
        } else if (signal.candidate) {
          if (pc && pc.remoteDescription && pc.remoteDescription.type) {
            try { await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)); } catch (e) {}
          } else {
            const queued = pendingCandidatesRef.current.get(fromPeerId) || [];
            queued.push(signal.candidate);
            pendingCandidatesRef.current.set(fromPeerId, queued);
          }
        }
      });

      // 5. Connect to Existing Peers (Deterministic rule: lower peerId initiates)
      activePeers.forEach((peer) => {
        if (peer.peerId !== myPeerId) {
          if (myPeerId < peer.peerId) {
            initiatePeerConnection(peer.peerId);
          }
        }
      });

      setIsConnected(true);
      toast.success('Terhubung ke Obrolan Suara Kelas! 🎙️');
    } catch (err) {
      console.error('Failed to join voice room:', err);
      toast.error('Gagal mengakses mikrofon atau terhubung ke ruang suara.');
      handleLeaveRoom();
    } finally {
      setIsConnecting(false);
    }
  };

  // Automatically establish connection with newly joined peers
  useEffect(() => {
    if (!isConnected || !myPeerId) return;

    activePeers.forEach((peer) => {
      if (peer.peerId === myPeerId) return;

      if (!peerConnectionsRef.current.has(peer.peerId)) {
        if (myPeerId < peer.peerId) {
          initiatePeerConnection(peer.peerId);
        }
      }
    });

    // Cleanup closed peer connections
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
  }, [activePeers, isConnected, myPeerId]);

  // MediaSession API & Background Tab Audio
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
          title: roomName || 'Obrolan Suara',
          artist: currentClass?.name || 'Classy Live Voice',
          album: 'Ruang Suara Kelas',
          artwork: [
            { src: '/logo.png', sizes: '192x192', type: 'image/png' },
            { src: '/logo.png', sizes: '512x512', type: 'image/png' }
          ]
        });
        navigator.mediaSession.playbackState = 'playing';
        navigator.mediaSession.setActionHandler('pause', () => {});
        navigator.mediaSession.setActionHandler('play', () => {});
        navigator.mediaSession.setActionHandler('stop', () => {
          handleLeaveRoom();
        });
      } catch (e) {}
    }

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

  // Tab switch listener
  useEffect(() => {
    if (!isConnected) return;

    const handleTabSwitch = () => {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }
      remoteAudiosRef.current.forEach(audio => {
        if (audio && audio.paused && !isDeafened) {
          audio.play().catch(() => {});
        }
      });
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

  // Toggle Mute
  const handleToggleMute = () => {
    if (!localStreamRef.current) return;
    const nextMuted = !isMuted;
    localStreamRef.current.getAudioTracks().forEach(track => {
      track.enabled = !nextMuted;
    });
    setIsMuted(nextMuted);
    isMutedRef.current = nextMuted;
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

    if (classId && myPeerIdRef.current) {
      dbService.voice.updatePeerState(classId, myPeerIdRef.current, { isDeafened: nextDeafen });
    }
    toast(nextDeafen ? 'Audio dinonaktifkan' : 'Audio diaktifkan', {
      icon: nextDeafen ? '🎧🔇' : '🎧'
    });
  };

  // Unlock Audio if blocked by browser autoplay policy
  const handleUnlockAudio = () => {
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(() => {});
    }
    soundFX.getAudioContext();

    remoteAudiosRef.current.forEach(audio => {
      if (audio) {
        audio.muted = false;
        audio.volume = 1.0;
        audio.play().catch(e => console.warn('[ClassVoiceRoom] Unlock play error:', e));
      }
    });

    setAutoplayBlocked(false);
    toast.success('Audio obrolan diaktifkan! 🔊');
  };

  // Host Action: Kick / Remove Peer from Room
  const handleKickPeer = async (peerId, peerName) => {
    await dbService.voice.leaveRoom(classId, peerId);
    toast(`${peerName} telah dikeluarkan dari obrolan suara.`, { icon: '👋' });
  };

  // Leave Room
  const handleLeaveRoom = async () => {
    soundFX.playLeaveCall();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch {}
      audioContextRef.current = null;
    }

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
    isMutedRef.current = false;
    setIsDeafened(false);
    isDeafenedRef.current = false;
    setAutoplayBlocked(false);
    toast('Keluar dari obrolan suara', { icon: '👋' });
  };

  // Leave room immediately when closing tab, closing Chrome, or navigating away
  useEffect(() => {
    if (!isConnected || !classId) return;

    const handleBeforeUnload = () => {
      if (myPeerIdRef.current) {
        try {
          dbService.voice.leaveRoom(classId, myPeerIdRef.current);
        } catch {}
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, [isConnected, classId]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (isConnected) {
        handleLeaveRoom();
      }
    };
  }, [isConnected]);

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-slate-700/60 space-y-5">
      
      {/* 1. ROOM HEADER */}
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
                {isConnected ? '🟢 LIVE' : 'Obrolan Suara'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Ruang obrolan suara langsung kelas. Semua anggota dapat berbicara dan berdiskusi dengan bebas.
            </p>
          </div>
        </div>

        {/* Action Button: Connect / Controls */}
        <div className="flex items-center gap-2">
          {!isConnected ? (
            <button
              type="button"
              onClick={handleJoinRoom}
              disabled={isConnecting}
              className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <PhoneCall size={14} />
              <span>{isConnecting ? 'Menghubungkan...' : 'Masuk Obrolan Suara'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              {/* Mic Toggle */}
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

              {/* Deafen Button */}
              <button
                type="button"
                onClick={handleToggleDeafen}
                className={`p-2 rounded-2xl border transition-all cursor-pointer ${
                  isDeafened 
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 hover:bg-rose-500/30' 
                    : 'bg-slate-800/80 text-white border-slate-700 hover:bg-slate-700'
                }`}
                title={isDeafened ? 'Hidupkan Suara Obrolan' : 'Matikan Suara (Bisu)'}
              >
                {isDeafened ? <VolumeX size={16} /> : <Headphones size={16} />}
              </button>

              {/* Leave Button */}
              <button
                type="button"
                onClick={handleLeaveRoom}
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
            <span>Suara tertahan kebijakan peramban (browser). Klik di sini untuk mengaktifkan suara obrolan! 🔊</span>
          </div>
          <span className="px-3 py-1.5 rounded-xl bg-slate-950 text-white font-extrabold text-xs shrink-0 shadow-md">
            Aktifkan Suara
          </span>
        </div>
      )}

      {/* 2. PARTICIPANTS GRID */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-300 font-semibold px-1">
          <span className="flex items-center gap-2 text-indigo-300 font-bold uppercase tracking-wider text-[11px]">
            <Users size={14} className="text-emerald-400" />
            Peserta di Ruang Suara ({activePeers.length})
          </span>
          <span className="text-[11px] text-slate-400">
            {isConnected ? 'Anda sedang terhubung' : 'Klik Masuk untuk bergabung mengobrol'}
          </span>
        </div>

        {activePeers.length === 0 ? (
          <div className="py-8 text-center rounded-2xl bg-slate-800/40 border border-slate-700/50 text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
            <Users size={24} className="text-slate-500" />
            <span>Belum ada yang terhubung di ruang suara. Klik <strong>"Masuk Obrolan Suara"</strong> untuk memulai obrolan!</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
            {activePeers.map((peer) => {
              const isMe = peer.peerId === myPeerId;
              const isSpeaking = isMe ? isSpeakingLocal : Boolean(peer.isSpeaking);
              const isHost = Boolean(peer.isHost);

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
                  {/* Avatar with Discord Ring */}
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

                    {/* Role Badge (Crown for Host) */}
                    {isHost && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center shadow-md bg-amber-500 text-slate-950 font-bold" title="Komti / Host Kelas">
                        <Crown size={12} className="fill-slate-950" />
                      </div>
                    )}

                    {/* Mute Indicator */}
                    {peer.isMuted && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-xs">
                        <MicOff size={10} />
                      </div>
                    )}
                  </div>

                  {/* Name & Speaking Status */}
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
                      ) : (
                        <span className="text-slate-400 font-normal">Aktif</span>
                      )}
                    </p>
                  </div>

                  {/* Host Kick Control */}
                  {isHostByRole && !isMe && (
                    <div className="pt-1 w-full border-t border-slate-700/50 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => handleKickPeer(peer.peerId, peer.userName)}
                        className="text-[10px] text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 px-2 py-0.5 rounded-md transition-colors cursor-pointer flex items-center gap-1"
                        title="Keluarkan dari obrolan suara"
                      >
                        <X size={11} />
                        <span>Keluarkan</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
