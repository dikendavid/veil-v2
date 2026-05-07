import { useState, useEffect, useRef } from 'react';
import { UserProfile, Match } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { Send, ArrowLeft, ShieldCheck, Lock, MoreHorizontal, Loader2, Video, Phone, PhoneOff, AlertTriangle } from 'lucide-react';
import { useChat } from '../../hooks/useChat';
import { useCall } from '../../hooks/useCall';
import VideoCall from './VideoCall';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface ChatThreadProps {
  match: Match;
  userProfile: UserProfile;
  onBack: () => void;
}

export default function ChatThread({ match, userProfile, onBack }: ChatThreadProps) {
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const otherUser = match.participants?.[0];
  const { messages, loading, sendMessage } = useChat(match.id, userProfile);
  const { activeCall } = useCall(match.id);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  
  const [showUnmatchConfirm, setShowUnmatchConfirm] = useState(false);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle active call state syncing
  useEffect(() => {
    if (activeCall) {
      if (activeCall.status === 'accepted' || (activeCall.status === 'calling' && activeCall.callerId === userProfile.uid)) {
        setShowVideoCall(true);
      }
    } else {
      setShowVideoCall(false);
      setIsAnswering(false);
    }
  }, [activeCall, userProfile.uid]);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const text = inputText;
    setInputText('');
    await sendMessage(text);
  };

  const handleStartCall = () => {
    setIsAnswering(false);
    setShowVideoCall(true);
  };

  const handleDeclineCall = async () => {
    if (activeCall?.id) {
      const callDoc = doc(db, 'matches', match.id, 'calls', activeCall.id);
      await updateDoc(callDoc, { status: 'rejected' });
    }
  };

  const handleAcceptCall = () => {
    setIsAnswering(true);
    setShowVideoCall(true);
  };
  
  const confirmUnmatch = async () => {
    // End active call if any
    if (activeCall?.id) {
      const callDoc = doc(db, 'matches', match.id, 'calls', activeCall.id);
      await updateDoc(callDoc, { status: 'ended' });
    }
    await updateDoc(doc(db, 'matches', match.id), {
      unmatchedBy: [userProfile.uid]
    });
    onBack();
  };

  return (
    <motion.div 
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="fixed inset-0 bg-[#050505] z-50 flex flex-col max-w-md mx-auto h-screen"
    >
      <header className="h-20 flex items-center px-6 gap-4 border-b border-white/5 bg-white/5 backdrop-blur-xl shrink-0 z-10">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        
        <div className="flex-1 flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-gray-800 overflow-hidden border border-white/10">
            {otherUser?.photoURL && <img src={otherUser.photoURL} className="w-full h-full object-cover" alt="" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-medium text-sm truncate">{otherUser?.displayName || 'Authorized Member'}</h3>
              {otherUser?.isVerified && <ShieldCheck size={12} className="text-[#F27D26] shrink-0" />}
            </div>
            <p className="text-[8px] uppercase tracking-widest text-emerald-500/80 font-bold truncate">Secure Connection</p>
          </div>
        </div>

        <div className="flex items-center gap-2 relative">
          <button 
            onClick={handleStartCall}
            disabled={!!activeCall}
            className="p-3 bg-[#F27D26]/10 text-[#F27D26] hover:bg-[#F27D26]/20 transition-colors rounded-xl disabled:opacity-50"
          >
            <Video size={18} />
          </button>

          <div className="relative group">
            <button className="text-gray-600 p-2 hover:bg-white/5 rounded-full transition-colors group-focus:text-white">
              <MoreHorizontal size={20} />
            </button>
            <div className="absolute right-0 top-full mt-2 w-48 bg-gray-900 border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-focus-within:opacity-100 group-hover:visible group-focus-within:visible transition-all z-50">
              <button 
                onClick={() => setShowUnmatchConfirm(true)}
                className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/5 transition-colors border-b border-white/5"
              >
                Terminate Session / Unmatch
              </button>
              <button 
                onClick={() => {
                  alert('Thank you for reporting. Our moderation team will review this discreetly.');
                }}
                className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-white/5 transition-colors"
              >
                Report Profile
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Incoming Call Overlay */}
      <AnimatePresence>
        {activeCall?.status === 'calling' && activeCall.callerId !== userProfile.uid && !showVideoCall && (
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="absolute top-24 left-4 right-4 bg-gray-900 border border-[#F27D26]/30 shadow-2xl rounded-2xl p-4 flex items-center gap-4 z-40"
          >
            <div className="w-12 h-12 rounded-full border border-white/10 overflow-hidden">
              {otherUser?.photoURL && <img src={otherUser.photoURL} className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-serif italic text-white">{otherUser?.displayName}</p>
              <p className="text-[10px] uppercase tracking-widest font-bold text-[#F27D26] animate-pulse">Incoming Video Call...</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleDeclineCall}
                className="w-10 h-10 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
              >
                <PhoneOff size={16} />
              </button>
              <button 
                onClick={handleAcceptCall}
                className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center animate-bounce hover:bg-emerald-500 hover:text-white transition-all"
              >
                <Phone size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col">
        <div className="mx-auto flex flex-col items-center gap-2 mb-8 opacity-30">
          <Lock size={12} />
          <p className="text-[9px] uppercase tracking-[0.3em]">End-to-End Encrypted</p>
        </div>

        <AnimatePresence>
          {messages.map((m) => {
            const isMe = m.senderId === userProfile.uid;
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${
                  isMe 
                    ? 'bg-[#F27D26] text-black rounded-tr-none font-medium' 
                    : 'bg-white/10 text-white rounded-tl-none border border-white/5'
                }`}>
                  {m.text}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={scrollRef} />
      </div>

      <footer className="p-6 bg-gradient-to-t from-black to-transparent shrink-0">
        <div className="relative">
          <input 
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Authorized dialogue..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl h-14 pl-6 pr-16 text-sm focus:outline-none focus:border-[#F27D26] transition-all"
          />
          <button 
            onClick={handleSend}
            className="absolute right-2 top-2 w-10 h-10 rounded-xl bg-[#F27D26] flex items-center justify-center text-black hover:scale-105 transition-transform"
          >
            <Send size={18} />
          </button>
        </div>
      </footer>

      <AnimatePresence>
        {showVideoCall && otherUser && (
          <VideoCall 
            matchId={match.id}
            currentUser={userProfile}
            otherUser={otherUser}
            existingCall={activeCall}
            onClose={() => setShowVideoCall(false)}
            isAnswering={isAnswering}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUnmatchConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] max-w-md mx-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-[#111] border border-white/10 rounded-3xl p-6 w-full shadow-2xl space-y-6"
            >
              <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-2">
                <AlertTriangle size={32} />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-serif italic">Terminate Session?</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Ending this session will unmatch you from {otherUser?.displayName} and permanently delete this encrypted thread. Active video calls will be immediately disconnected.
                </p>
                <p className="text-[10px] uppercase tracking-widest text-[#F27D26] font-bold pt-2">This action is irreversible.</p>
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setShowUnmatchConfirm(false)}
                  className="flex-1 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-sm font-medium hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmUnmatch}
                  className="flex-1 h-14 rounded-2xl bg-red-500 text-white flex items-center justify-center text-sm font-medium hover:bg-red-600 transition-colors shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                >
                  Terminate
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
