import { useState, useEffect, useRef } from 'react';
import { UserProfile, Match } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { Send, ArrowLeft, ShieldCheck, Lock, MoreHorizontal, Loader2 } from 'lucide-react';
import { useChat } from '../../hooks/useChat';

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

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const text = inputText;
    setInputText('');
    await sendMessage(text);
  };

  return (
    <motion.div 
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="fixed inset-0 bg-[#050505] z-50 flex flex-col max-w-md mx-auto h-screen"
    >
      <header className="h-20 flex items-center px-6 gap-4 border-b border-white/5 bg-white/5 backdrop-blur-xl">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        
        <div className="flex-1 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-800 overflow-hidden border border-white/10">
            {otherUser?.photoURL && <img src={otherUser.photoURL} className="w-full h-full object-cover" alt="" />}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-medium text-sm">{otherUser?.displayName || 'Authorized Member'}</h3>
              {otherUser?.isVerified && <ShieldCheck size={12} className="text-[#F27D26]" />}
            </div>
            <p className="text-[8px] uppercase tracking-widest text-emerald-500/80 font-bold">Secure Connection</p>
          </div>
        </div>

        <button className="text-gray-600">
          <MoreHorizontal size={20} />
        </button>
      </header>

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

      <footer className="p-6 bg-gradient-to-t from-black to-transparent">
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
    </motion.div>
  );
}
