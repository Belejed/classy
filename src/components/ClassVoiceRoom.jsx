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
  Signal,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { dbService } from '../utils/db';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export default function ClassVoiceRoom({
  classId,
  currentUser,
  roomId = 'main_lounge',
  roomName = 'Voice Lounge Kelas'
}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isSpeakingLocal, setIsSpeakingLocal] = useState(false);
  const [activePeers, setActivePeers] = useState([]);

  // WebRTC Refs
  const localStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const peerConnectionsRef = useRef(new Map()); // peerId -> RTCPeerConnection
  const remoteAudiosRef = useRef(new Map()); // peerId -> HTMLAudioElement
  const myPeerIdRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);

  const myPeerId = useMemo(() => {
    if (!currentUser) return null;
    return currentUser.uid || currentUser.id || 'usr_' + Math.random().toString(36).substr(2, 6);
  }, [currentUser]);

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

  // Handle joining voice room
  const handleJoinVoice = async () => {
    if (!classId || !currentUser) {
      toast.error('Silakan login terlebih dahulu untuk masuk ke ruang suara.');
      return;
    }

    setIsConnecting(true);
    myPeerIdRef.current = myPeerId;

    try {
      // 1. Get User Media (Microphone)
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }, 
        video: false 
      });
      localStreamRef.current = stream;

      // 2. Setup AudioContext for Live Speaking Indicator (Discord Green Ring)
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
            // Broadcast speaking state
            dbService.voice.updatePeerState(classId, myPeerId, { isSpeaking: isNowSpeaking });
          }

          animFrameRef.current = requestAnimationFrame(checkVolume);
        };
        checkVolume();
      } catch (audioErr) {
        console.warn('AudioContext setup skipped:', audioErr);
      }

      // 3. Register Peer in Firestore
      await dbService.voice.joinRoom(classId, roomId, {
        peerId: myPeerId,
        userId: currentUser.uid || currentUser.id,
        userName: currentUser.displayName || currentUser.name || (currentUser.email ? currentUser.email.split('@')[0] : 'Mahasiswa'),
        userEmail: currentUser.email || '',
        avatar: currentUser.photoURL || currentUser.avatar || '',
        isMuted: false,
        isDeafened: false
      });

      // 4. Heartbeat to maintain active status
      heartbeatIntervalRef.current = setInterval(() => {
        if (myPeerIdRef.current) {
          dbService.voice.updatePeerState(classId, myPeerIdRef.current, { lastSeen: Date.now() });
        }
      }, 15000);

      // 5. Subscribe to WebRTC Signals
      const unsubSignals = dbService.voice.subscribeSignals(classId, myPeerId, async ({ fromPeerId, signal }) => {
        let pc = peerConnectionsRef.current.get(fromPeerId);

        if (signal.type === 'offer') {
          if (!pc) pc = createPeerConnection(fromPeerId);
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await dbService.voice.sendSignal(classId, {
            fromPeerId: myPeerId,
            toPeerId: fromPeerId,
            signal: answer
          });
        } else if (signal.type === 'answer') {
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(signal));
          }
        } else if (signal.candidate) {
          if (pc) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
            } catch (candErr) {
              console.warn('Error adding ICE candidate:', candErr);
            }
          }
        }
      });

      // 6. Connect to Existing Peers
      activePeers.forEach(async (peer) => {
        if (peer.peerId !== myPeerId) {
          initiatePeerConnection(peer.peerId);
        }
      });

      setIsConnected(true);
      toast.success('Terhubung ke Voice Lounge!');
    } catch (err) {
      console.error('Failed to join voice:', err);
      toast.error('Tidak dapat mengakses mikrofon. Pastikan izin mikrofon aktif.');
      handleLeaveVoice();
    } finally {
      setIsConnecting(false);
    }
  };

  // Create RTCPeerConnection Helper
  const createPeerConnection = (targetPeerId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionsRef.current.set(targetPeerId, pc);

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // ICE Candidate Handler
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        dbService.voice.sendSignal(classId, {
          fromPeerId: myPeerIdRef.current,
          toPeerId: targetPeerId,
          signal: { candidate: event.candidate }
        });
      }
    };

    // Remote Audio Stream Handler
    pc.ontrack = (event) => {
      let audio = remoteAudiosRef.current.get(targetPeerId);
      if (!audio) {
        audio = new Audio();
        audio.autoplay = true;
        remoteAudiosRef.current.set(targetPeerId, audio);
      }
      audio.srcObject = event.streams[0];
      audio.muted = isDeafened;
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        pc.close();
        peerConnectionsRef.current.delete(targetPeerId);
      }
    };

    return pc;
  };

  // Initiate call to an existing peer
  const initiatePeerConnection = async (targetPeerId) => {
    try {
      const pc = createPeerConnection(targetPeerId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await dbService.voice.sendSignal(classId, {
        fromPeerId: myPeerIdRef.current,
        toPeerId: targetPeerId,
        signal: offer
      });
    } catch (err) {
      console.warn('Error initiating peer connection:', err);
    }
  };

  // Toggle Mute
  const handleToggleMute = () => {
    if (!localStreamRef.current) return;
    const nextMuted = !isMuted;
    localStreamRef.current.getAudioTracks().forEach(track => {
      track.enabled = !nextMuted;
    });
    setIsMuted(nextMuted);
    dbService.voice.updatePeerState(classId, myPeerId, { isMuted: nextMuted });
    toast(nextMuted ? 'Mikrofon dimatikan (Muted)' : 'Mikrofon aktif (Unmuted)', {
      icon: nextMuted ? '🔇' : '🎙️'
    });
  };

  // Toggle Deafen
  const handleToggleDeafen = () => {
    const nextDeafen = !isDeafened;
    setIsDeafened(nextDeafen);

    // Mute all remote audios
    remoteAudiosRef.current.forEach(audio => {
      if (audio) audio.muted = nextDeafen;
    });

    // If deafening, also mute own mic
    if (nextDeafen && !isMuted) {
      handleToggleMute();
    }

    dbService.voice.updatePeerState(classId, myPeerId, { isDeafened: nextDeafen });
    toast(nextDeafen ? 'Audio dimatikan (Deafened)' : 'Audio aktif', {
      icon: nextDeafen ? '🎧🔇' : '🎧'
    });
  };

  // Leave Voice Room
  const handleLeaveVoice = async () => {
    // 1. Stop local audio stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }

    // 2. Stop audio analysis
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch {}
      audioContextRef.current = null;
    }

    // 3. Close peer connections
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();

    // 4. Remove remote audios
    remoteAudiosRef.current.forEach(audio => {
      audio.srcObject = null;
    });
    remoteAudiosRef.current.clear();

    // 5. Clear heartbeat
    if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);

    // 6. Delete peer record in Firestore
    if (classId && myPeerIdRef.current) {
      await dbService.voice.leaveRoom(classId, myPeerIdRef.current);
    }

    setIsConnected(false);
    setIsMuted(false);
    setIsDeafened(false);
    setIsSpeakingLocal(false);
    toast('Keluar dari Voice Lounge', { icon: '👋' });
  };

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (isConnected) {
        handleLeaveVoice();
      }
    };
  }, [isConnected]);

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-slate-700/60 space-y-4">
      
      {/* Voice Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
            isConnected 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/20' 
              : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}>
            <Radio size={20} className={isConnected ? 'animate-pulse' : ''} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                {roomName}
              </h3>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                isConnected 
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                  : 'bg-slate-700/50 text-slate-400 border-slate-600/50'
              }`}>
                {isConnected ? '🟢 Terhubung' : 'Discord Style WebRTC'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Obrolan suara real-time antar anggota kelas tanpa aplikasi pihak ketiga.
            </p>
          </div>
        </div>

        {/* Action Connect / Disconnect */}
        <div className="flex items-center gap-2">
          {!isConnected ? (
            <button
              type="button"
              onClick={handleJoinVoice}
              disabled={isConnecting}
              className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <PhoneCall size={14} />
              <span>{isConnecting ? 'Menghubungkan...' : 'Masuk Voice Lounge'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Mute Button */}
              <button
                type="button"
                onClick={handleToggleMute}
                className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                  isMuted 
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 hover:bg-rose-500/30' 
                    : 'bg-slate-800/80 text-white border-slate-700 hover:bg-slate-700'
                }`}
                title={isMuted ? 'Buka Mikrofon' : 'Matikan Mikrofon'}
              >
                {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
              </button>

              {/* Deafen Button */}
              <button
                type="button"
                onClick={handleToggleDeafen}
                className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                  isDeafened 
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 hover:bg-rose-500/30' 
                    : 'bg-slate-800/80 text-white border-slate-700 hover:bg-slate-700'
                }`}
                title={isDeafened ? 'Hidupkan Suara' : 'Matikan Suara (Deafen)'}
              >
                {isDeafened ? <VolumeX size={16} /> : <Headphones size={16} />}
              </button>

              {/* Leave Button */}
              <button
                type="button"
                onClick={handleLeaveVoice}
                className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <PhoneOff size={14} />
                <span>Putuskan</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Participants Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span className="flex items-center gap-1.5 font-medium">
            <Users size={13} />
            Peserta di Ruang Suara ({activePeers.length})
          </span>
          {isConnected && (
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Audio Aktif (Mesh P2P)
            </span>
          )}
        </div>

        {activePeers.length === 0 ? (
          <div className="py-6 text-center rounded-2xl bg-slate-800/40 border border-slate-700/40 text-slate-400 text-xs">
            Belum ada yang masuk ke ruang suara. Jadilah yang pertama bergabung!
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {activePeers.map((peer) => {
              const isMe = peer.peerId === myPeerId;
              const isSpeaking = isMe ? isSpeakingLocal : Boolean(peer.isSpeaking);

              return (
                <div 
                  key={peer.peerId}
                  className={`relative p-3 rounded-2xl bg-slate-800/80 border transition-all flex flex-col items-center text-center space-y-2 ${
                    isSpeaking 
                      ? 'border-emerald-400 shadow-lg shadow-emerald-500/20 scale-[1.02]' 
                      : 'border-slate-700/60'
                  }`}
                >
                  {/* Avatar with Discord Speaking Ring */}
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-full overflow-hidden flex items-center justify-center font-bold text-sm transition-all ${
                      isSpeaking 
                        ? 'ring-4 ring-emerald-400 ring-offset-2 ring-offset-slate-900 shadow-md shadow-emerald-400/50' 
                        : 'ring-1 ring-slate-600'
                    } ${
                      peer.avatar ? 'bg-slate-700' : 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white'
                    }`}>
                      {peer.avatar ? (
                        <img src={peer.avatar} alt={peer.userName} className="w-full h-full object-cover" />
                      ) : (
                        (peer.userName || 'M').charAt(0).toUpperCase()
                      )}
                    </div>

                    {/* Mute Indicator Badge */}
                    {peer.isMuted && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-xs">
                        <MicOff size={10} />
                      </div>
                    )}
                    {peer.isDeafened && (
                      <div className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center shadow-xs">
                        <VolumeX size={10} />
                      </div>
                    )}
                  </div>

                  {/* Name & Status */}
                  <div className="w-full">
                    <p className="text-xs font-bold text-white truncate max-w-full">
                      {peer.userName} {isMe && '(Anda)'}
                    </p>
                    <span className="text-[10px] text-slate-400">
                      {isSpeaking ? (
                        <span className="text-emerald-400 font-semibold animate-pulse">Berbicara...</span>
                      ) : peer.isMuted ? (
                        <span className="text-rose-400">Muted</span>
                      ) : (
                        'Mendengarkan'
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
