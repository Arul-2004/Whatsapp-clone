import React, { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, PhoneIncoming } from 'lucide-react';

const getAvatar = (name) =>
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=008069&color=fff&size=128&bold=true`;

/* ─────────────────────────────────────────────────────────────────
   INCOMING CALL OVERLAY
───────────────────────────────────────────────────────────────── */
export const IncomingCallOverlay = ({ callInfo, onAccept, onReject }) => {
    if (!callInfo) return null;
    return (
        <div style={styles.backdrop}>
            <div style={styles.card}>
                {/* Animated ring */}
                <div style={styles.avatarRing}>
                    <div style={styles.ringPulse1} />
                    <div style={styles.ringPulse2} />
                    <img
                        src={getAvatar(callInfo.fromName)}
                        alt={callInfo.fromName}
                        style={styles.callerAvatar}
                    />
                </div>

                <h2 style={styles.callerName}>{callInfo.fromName}</h2>
                <p style={styles.callTypeLabel}>
                    {callInfo.callType === 'video' ? '📹 Incoming Video Call' : '📞 Incoming Voice Call'}
                </p>

                <div style={styles.btnRow}>
                    <div style={styles.btnGroup}>
                        <button style={styles.rejectBtn} onClick={onReject}>
                            <PhoneOff size={28} color="#fff" />
                        </button>
                        <span style={styles.btnLabel}>Decline</span>
                    </div>
                    <div style={styles.btnGroup}>
                        <button style={styles.acceptBtn} onClick={() => onAccept(callInfo.callType)}>
                            <Phone size={28} color="#fff" />
                        </button>
                        <span style={styles.btnLabel}>Accept</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────────────────────────
   ACTIVE CALL OVERLAY
───────────────────────────────────────────────────────────────── */
export const ActiveCallOverlay = ({
    callType,
    callerName,
    localStream,
    remoteStream,
    onEndCall,
    isCalling           // true = we initiated, waiting for answer
}) => {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const remoteAudioRef = useRef(null); // Dedicated Audio Bridge
    const [muted, setMuted] = useState(false);
    const [camOff, setCamOff] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const timerRef = useRef(null);

    // Bind streams to video/audio elements
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
        if (remoteAudioRef.current && remoteStream) {
            remoteAudioRef.current.srcObject = remoteStream;
            // Explicit play() required by browser autoplay policy
            remoteAudioRef.current.play().catch(e => console.warn('Audio play error:', e));
        }
    }, [remoteStream]);

    // Timer — starts when remote stream arrives, resets on new call
    useEffect(() => {
        setCallDuration(0); // reset on mount
        return () => {
            if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        };
    }, []);

    useEffect(() => {
        if (remoteStream && !timerRef.current) {
            timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
        }
    }, [remoteStream]);

    const formatDuration = (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec < 10 ? '0' : ''}${sec}`;
    };

    const toggleMute = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
            setMuted(p => !p);
        }
    };

    const toggleCamera = () => {
        if (localStream && callType === 'video') {
            localStream.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
            setCamOff(p => !p);
        }
    };

    const statusLabel = isCalling
        ? 'Calling...'
        : remoteStream
            ? formatDuration(callDuration)
            : 'Connecting...';

    return (
        <div style={callType === 'video' ? styles.videoCallBackdrop : styles.audioCallBackdrop}>
            {/* Dedicated Audio Speaker (Hidden) */}
            <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />

            {/* Remote video (full bg) */}
            {callType === 'video' && (
                <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    style={styles.remoteVideo}
                />
            )}

            {/* Audio call avatar */}
            {callType === 'audio' && (
                <div style={styles.audioAvatar}>
                    <img src={getAvatar(callerName)} alt={callerName} style={styles.audioAvatarImg} />
                </div>
            )}

            {/* Caller info */}
            <div style={styles.callInfo}>
                <h2 style={styles.callName}>{callerName}</h2>
                <p style={styles.callStatus}>{statusLabel}</p>
            </div>

            {/* Local video PiP */}
            {callType === 'video' && (
                <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    style={camOff ? { ...styles.pipVideo, opacity: 0 } : styles.pipVideo}
                />
            )}

            {/* Controls */}
            <div style={styles.controls}>
                <button style={styles.ctrlBtn} onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'}>
                    {muted ? <MicOff size={24} color="#fff" /> : <Mic size={24} color="#fff" />}
                    <span style={styles.ctrlLabel}>{muted ? 'Unmute' : 'Mute'}</span>
                </button>

                {callType === 'video' && (
                    <button style={styles.ctrlBtn} onClick={toggleCamera} title={camOff ? 'Camera On' : 'Camera Off'}>
                        {camOff ? <VideoOff size={24} color="#fff" /> : <Video size={24} color="#fff" />}
                        <span style={styles.ctrlLabel}>{camOff ? 'Cam On' : 'Cam Off'}</span>
                    </button>
                )}

                <button style={styles.endBtn} onClick={onEndCall} title="End Call">
                    <PhoneOff size={28} color="#fff" />
                    <span style={styles.ctrlLabel}>End</span>
                </button>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────────────────────────
   STYLES
───────────────────────────────────────────────────────────────── */
const styles = {
    // Incoming
    backdrop: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.88)', zIndex: 3000,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
    },
    card: {
        background: 'linear-gradient(145deg,#1a2b2b,#0d1f1f)',
        borderRadius: '24px', padding: '48px 40px 36px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '16px', minWidth: '320px', boxShadow: '0 20px 60px rgba(0,0,0,0.7)'
    },
    avatarRing: { position: 'relative', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    ringPulse1: {
        position: 'absolute', borderRadius: '50%',
        width: '120px', height: '120px',
        border: '2px solid rgba(0,168,132,0.6)',
        animation: 'ringPulse 2s infinite'
    },
    ringPulse2: {
        position: 'absolute', borderRadius: '50%',
        width: '95px', height: '95px',
        border: '2px solid rgba(0,168,132,0.4)',
        animation: 'ringPulse 2s infinite 0.5s'
    },
    callerAvatar: { width: '80px', height: '80px', borderRadius: '50%', position: 'relative', zIndex: 1 },
    callerName: { fontSize: '24px', fontWeight: '600', color: '#fff', margin: 0 },
    callTypeLabel: { fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: 0 },
    btnRow: { display: 'flex', gap: '60px', marginTop: '20px', alignItems: 'center' },
    btnGroup: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' },
    rejectBtn: {
        width: '64px', height: '64px', borderRadius: '50%',
        background: '#ef4444', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(239,68,68,0.5)',
        transition: 'transform 0.15s', animation: 'rejectShake 1.5s infinite'
    },
    acceptBtn: {
        width: '64px', height: '64px', borderRadius: '50%',
        background: '#00a884', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(0,168,132,0.5)',
        transition: 'transform 0.15s', animation: 'acceptBounce 1.5s infinite'
    },
    btnLabel: { fontSize: '12px', color: 'rgba(255,255,255,0.7)' },

    // Active call - video
    videoCallBackdrop: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: '#1a1a2e', zIndex: 3000,
        display: 'flex', flexDirection: 'column', alignItems: 'center'
    },
    remoteVideo: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1 },
    pipVideo: {
        position: 'absolute', bottom: '120px', right: '20px',
        width: '120px', height: '180px', borderRadius: '12px',
        objectFit: 'cover', border: '2px solid #fff', zIndex: 10,
        boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
    },

    // Active call - audio
    audioCallBackdrop: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'linear-gradient(160deg,#0d2137 0%,#0a3d2a 100%)',
        zIndex: 3000, display: 'flex', flexDirection: 'column', alignItems: 'center'
    },
    audioAvatar: {
        marginTop: '80px', width: '140px', height: '140px', borderRadius: '50%',
        border: '3px solid rgba(0,168,132,0.6)', padding: '4px',
        boxShadow: '0 0 40px rgba(0,168,132,0.3)', zIndex: 2
    },
    audioAvatarImg: { width: '100%', height: '100%', borderRadius: '50%' },

    // Call info
    callInfo: { marginTop: '24px', textAlign: 'center', zIndex: 2, position: 'relative' },
    callName: { fontSize: '26px', fontWeight: '600', color: '#fff', margin: 0 },
    callStatus: { fontSize: '14px', color: 'rgba(255,255,255,0.65)', margin: '6px 0 0', letterSpacing: '0.5px' },

    // Controls
    controls: {
        position: 'absolute', bottom: '40px',
        display: 'flex', gap: '28px', alignItems: 'center', zIndex: 10
    },
    ctrlBtn: {
        background: 'rgba(255,255,255,0.15)', border: 'none',
        width: '58px', height: '58px', borderRadius: '50%',
        cursor: 'pointer', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '4px',
        transition: 'background 0.2s', backdropFilter: 'blur(10px)'
    },
    endBtn: {
        background: '#ef4444', border: 'none',
        width: '68px', height: '68px', borderRadius: '50%',
        cursor: 'pointer', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '4px',
        boxShadow: '0 4px 20px rgba(239,68,68,0.5)',
        transition: 'transform 0.15s'
    },
    ctrlLabel: { fontSize: '10px', color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap' },
};

// Inject animations
const callAnimStyle = document.createElement('style');
callAnimStyle.innerText = `
@keyframes ringPulse {
    0%   { transform: scale(1); opacity: 0.8; }
    50%  { transform: scale(1.15); opacity: 0.3; }
    100% { transform: scale(1); opacity: 0.8; }
}
@keyframes rejectShake {
    0%,100% { transform: rotate(0deg); }
    20%      { transform: rotate(-8deg); }
    40%      { transform: rotate(8deg); }
    60%      { transform: rotate(-8deg); }
    80%      { transform: rotate(8deg); }
}
@keyframes acceptBounce {
    0%,100% { transform: scale(1); }
    50%      { transform: scale(1.08); }
}
`;
document.head.appendChild(callAnimStyle);
