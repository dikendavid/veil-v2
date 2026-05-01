import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { UserProfile, Match } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import ChatThread from './ChatThread';

interface MatchesProps {
  profile: UserProfile;
}

export default function Matches({ profile }: MatchesProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'matches'),
      where('users', 'array-contains', profile.uid),
      where('isMutual', '==', true),
      orderBy('updatedAt', 'desc')
    );

    const unsub = onSnapshot(q, async (snap) => {
      const matchData: Match[] = [];
      
      for (const d of snap.docs) {
        const m = d.data() as Match;
        m.id = d.id;
        
        // Fetch participant data
        const otherId = m.users.find(id => id !== profile.uid);
        if (otherId) {
          const otherSnap = await getDoc(doc(db, 'users', otherId));
          if (otherSnap.exists()) {
            m.participants = [otherSnap.data() as UserProfile];
          }
        }
        matchData.push(m);
      }
      
      setMatches(matchData);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'matches');
    });

    return () => unsub();
  }, [profile.uid]);

  if (activeMatch) {
    return <ChatThread match={activeMatch} userProfile={profile} onBack={() => setActiveMatch(null)} />;
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#050505]">
      <header className="p-8 pb-4">
        <h2 className="text-3xl font-serif italic mb-1">Encrypted Chats</h2>
        <p className="text-[10px] uppercase tracking-[0.4em] text-[#F27D26] font-bold">End-to-End Secure</p>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Sparkles className="animate-spin text-[#F27D26]/20" />
        </div>
      ) : matches.length > 0 ? (
        <div className="flex-1 px-4 space-y-2 overflow-y-auto pb-24">
          <AnimatePresence>
            {matches.map((m, idx) => (
              <motion.button
                key={m.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => setActiveMatch(m)}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/5 rounded-3xl p-5 flex items-center gap-4 transition-all group"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-800 to-black overflow-hidden border border-white/10 relative">
                  {m.participants?.[0]?.photoURL ? (
                    <img src={m.participants[0].photoURL} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20">
                      <MessageSquare size={20} />
                    </div>
                  )}
                  {m.participants?.[0]?.isVerified && (
                     <div className="absolute top-1 right-1 bg-black rounded-full p-0.5">
                       <ShieldCheck size={10} className="text-[#F27D26]" />
                     </div>
                  )}
                </div>

                <div className="flex-1 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-sm text-white/90">{m.participants?.[0]?.displayName || 'Encrypted User'}</h3>
                    <span className="text-[8px] uppercase tracking-widest text-gray-600 font-bold">
                       {m.updatedAt ? new Date(m.updatedAt.toString()).toLocaleDateString() : 'Now'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate italic">
                    {m.lastMessage || 'Identity verified. Start secure dialogue...'}
                  </p>
                </div>

                <ArrowRight size={16} className="text-gray-700 group-hover:text-[#F27D26] group-hover:translate-x-1 transition-all" />
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-gray-700">
            <MessageSquare size={32} />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-serif italic text-gray-400">Silence is sometimes the best discretion.</p>
            <p className="text-[9px] uppercase tracking-widest text-gray-600">No active dialogues yet.</p>
          </div>
        </div>
      )}
    </div>
  );
}
