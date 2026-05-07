import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { PhoneOff, Phone, Video, VideoOff, Mic, MicOff, Loader2 } from 'lucide-react';
import { collection, doc, setDoc, addDoc, onSnapshot, getDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { UserProfile } from '../../types';
import { CallData } from '../../hooks/useCall';

const servers = {
  iceServers: [
    { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }
  ],
  iceCandidatePoolSize: 10,
};

interface VideoCallProps {
  matchId: string;
  currentUser: UserProfile;
  otherUser: UserProfile;
  existingCall: CallData | null;
  onClose: () => void;
  isAnswering?: boolean;
}

export default function VideoCall({ matchId, currentUser, otherUser, existingCall, onClose, isAnswering }: VideoCallProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const [pc, setPc] = useState<RTCPeerConnection | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  
  const [callStatus, setCallStatus] = useState<string>(isAnswering ? 'connecting...' : 'calling...');
  const [activeCallId, setActiveCallId] = useState<string | null>(existingCall?.id || null);

  // Setup WebRTC and Streams
  useEffect(() => {
    let peerConnection = new RTCPeerConnection(servers);
    setPc(peerConnection);

    const setupMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Push tracks from local stream to peer connection
        stream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, stream);
        });

        const rStream = new MediaStream();
        setRemoteStream(rStream);
        
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = rStream;
        }

        // Pull tracks from remote stream, add to video stream
        peerConnection.ontrack = (event) => {
          event.streams[0].getTracks().forEach((track) => {
            rStream.addTrack(track);
          });
        };

        if (isAnswering && existingCall) {
          await answerCall(peerConnection, existingCall.id);
        } else {
          await startCall(peerConnection);
        }

      } catch (err) {
        console.error('Error accessing media devices.', err);
        setCallStatus('Error accessing camera/mic.');
      }
    };

    setupMedia();

    return () => {
      // Cleanup
      peerConnection.close();
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const startCall = async (peerConnection: RTCPeerConnection) => {
    const callDoc = doc(collection(db, 'matches', matchId, 'calls'));
    const callCandidates = collection(callDoc, 'callerCandidates');
    const answerCandidates = collection(callDoc, 'calleeCandidates');

    // Get candidates for caller, save to db
    peerConnection.onicecandidate = (event) => {
      event.candidate && addDoc(callCandidates, event.candidate.toJSON());
    };

    // Create offer
    const offerDescription = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offerDescription);

    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };

    await setDoc(callDoc, {
      callerId: currentUser.uid,
      offer,
      status: 'calling',
      createdAt: new Date().toISOString()
    });
    
    setActiveCallId(callDoc.id);

    // Listen for remote answer
    onSnapshot(callDoc, (snapshot) => {
      const data = snapshot.data();
      if (!peerConnection.currentRemoteDescription && data?.answer) {
        const answerDescription = new RTCSessionDescription(data.answer);
        peerConnection.setRemoteDescription(answerDescription);
        setCallStatus('connected');
      }
      if (data?.status === 'rejected' || data?.status === 'ended') {
        endCallUI();
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, callDoc.path);
    });

    // When answered, add candidate to peer connection
    onSnapshot(answerCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          peerConnection.addIceCandidate(candidate);
        }
      });
    });
  };

  const answerCall = async (peerConnection: RTCPeerConnection, callId: string) => {
    const callDoc = doc(db, 'matches', matchId, 'calls', callId);
    const callCandidates = collection(callDoc, 'callerCandidates');
    const answerCandidates = collection(callDoc, 'calleeCandidates');

    peerConnection.onicecandidate = (event) => {
      event.candidate && addDoc(answerCandidates, event.candidate.toJSON());
    };

    const callData = (await getDoc(callDoc)).data();
    if (!callData) return;

    const offerDescription = callData.offer;
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offerDescription));

    const answerDescription = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answerDescription);

    const answer = {
      type: answerDescription.type,
      sdp: answerDescription.sdp,
    };

    await updateDoc(callDoc, { answer, status: 'accepted' });
    setCallStatus('connected');

    onSnapshot(callCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          peerConnection.addIceCandidate(candidate);
        }
      });
    });

    onSnapshot(callDoc, (snapshot) => {
      const data = snapshot.data();
      if (data?.status === 'ended') {
        endCallUI();
      }
    });
  };

  const endCallUI = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    onClose();
  };

  const hangUp = async () => {
    if (activeCallId) {
      const callDoc = doc(db, 'matches', matchId, 'calls', activeCallId);
      await updateDoc(callDoc, { status: 'ended' });
    }
    endCallUI();
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      className="fixed inset-0 z-[100] bg-black max-w-md mx-auto flex flex-col"
    >
      {/* Remote Video (Full Screen) */}
      <div className="relative flex-1 bg-gray-900 overflow-hidden">
        <video 
          ref={remoteVideoRef} 
          autoPlay 
          playsInline 
          className="w-full h-full object-cover"
        />
        
        {/* Overlay when remote video isn't connected yet */}
        {callStatus !== 'connected' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm space-y-4">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#F27D26]">
              {otherUser.photoURL ? (
                <img src={otherUser.photoURL} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full bg-gray-800" />
              )}
            </div>
            <h2 className="text-2xl font-serif italic">{otherUser.displayName}</h2>
            <div className="flex items-center gap-2 text-[#F27D26] opacity-80">
              <Loader2 className="animate-spin" size={16} />
              <span className="uppercase tracking-[0.2em] text-[10px] font-bold">{callStatus}</span>
            </div>
          </div>
        )}

        {/* Local Video (Picture in Picture) */}
        <div className="absolute top-6 right-6 w-24 h-36 bg-black rounded-lg overflow-hidden border border-white/20 shadow-xl">
           <video 
             ref={localVideoRef} 
             autoPlay 
             playsInline 
             muted 
             className={`w-full h-full object-cover ${isVideoOff ? 'opacity-0' : 'opacity-100'} -scale-x-100`}
           />
           {isVideoOff && (
             <div className="absolute inset-0 flex items-center justify-center text-white/50">
               <VideoOff size={24} />
             </div>
           )}
        </div>
      </div>

      {/* Controls */}
      <div className="p-8 bg-gradient-to-t from-black via-black/90 to-transparent flex items-end justify-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <button 
            onClick={toggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
          </button>
          <span className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">{isMuted ? 'Muted' : 'Mic On'}</span>
        </div>
        
        <div className="flex flex-col items-center gap-2 mb-2">
          <button 
            onClick={hangUp}
            className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:scale-105 transition-transform"
          >
            <PhoneOff size={28} />
          </button>
          <span className="text-[9px] uppercase tracking-widest text-red-500 font-bold">End</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <button 
            onClick={toggleVideo}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isVideoOff ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
          </button>
          <span className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">{isVideoOff ? 'No Video' : 'Video On'}</span>
        </div>
      </div>
    </motion.div>
  );
}
