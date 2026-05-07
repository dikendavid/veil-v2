import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { UserProfile, Match } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, ArrowRight, ShieldCheck, Sparkles, Video } from 'lucide-react';
import ChatThread from './ChatThread';
import { useCall, CallData } from '../../hooks/useCall';
import VideoCall from './VideoCall';

interface MatchesProps {
  profile: UserProfile;
}

function MatchListItem({ m, profile, onClick, onStartCall, idx }: { m: Match, profile: UserProfile, onClick: () => void | Promise<void>, onStartCall: (isAnswering: boolean, call: CallData | null) => void, idx: number, key?: string | number }) {
  const { activeCall } = useCall(m.id);
  const isActiveCall = activeCall && !['ended', 'rejected'].includes(activeCall.status);
  const isIncomingCall = isActiveCall && activeCall.callerId !== profile.uid && activeCall.status === 'calling';

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: idx * 0.05 }}
      onClick={onClick}
      className="w-full bg-white/5 hover:bg-white/10 border border-white/5 rounded-3xl p-5 flex items-center gap-4 transition-all group relative"
    >
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-800 to-black overflow-hidden border border-white/10 relative shrink-0">
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

      <div className="flex-1 text-left relative overflow-hidden">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-medium text-sm text-white/90 truncate mr-2">{m.participants?.[0]?.displayName || 'Encrypted User'}</h3>
          <div className="flex items-center gap-2 shrink-0">
            {isActiveCall ? (
              <button 
                onClick={(e) => { e.stopPropagation(); onStartCall(!!isIncomingCall, activeCall); }}
                className="flex items-center gap-1 z-10 relative bg-[#F27D26]/20 py-1 px-2 rounded-full text-[#F27D26] text-[8px] uppercase tracking-widest font-bold hover:bg-[#F27D26]/30 transition-colors"
                title={isIncomingCall ? "Incoming Video Call" : "Active Video Call"}
              >
                 <Video size={10} className={isIncomingCall ? "animate-pulse" : ""} /> 
                 {isIncomingCall ? "Accept" : "Active"}
              </button>
            ) : (
              <button 
                onClick={(e) => { e.stopPropagation(); onStartCall(false, null); }}
                className="flex items-center justify-center z-10 relative p-1.5 rounded-full text-gray-500 hover:text-[#F27D26] hover:bg-white/5 transition-colors"
                title="Start Video Call"
              >
                <Video size={14} />
              </button>
            )}
            <span className="text-[8px] uppercase tracking-widest text-gray-600 font-bold">
               {m.updatedAt ? new Date(m.updatedAt.toString()).toLocaleDateString() : 'Now'}
            </span>
          </div>
        </div>
        <p className={`text-[11px] truncate italic ${m.lastMessageSenderId !== profile.uid && m.lastMessageSenderId && !m.isRead ? 'text-white font-medium' : 'text-gray-500'}`}>
          {isActiveCall ? 'Video session active...' : m.lastMessage || 'Identity verified. Start secure dialogue...'}
        </p>
      </div>
      
      {m.lastMessageSenderId !== profile.uid && m.lastMessageSenderId && !m.isRead && (
        <div className="absolute top-1/2 -translate-y-1/2 right-4 w-2 h-2 rounded-full bg-[#F27D26] animate-pulse" />
      )}

      <ArrowRight size={16} className="text-gray-700 group-hover:text-[#F27D26] group-hover:translate-x-1 transition-all opacity-0 group-hover:opacity-100 shrink-0" />
    </motion.button>
  );
}

export default function Matches({ profile }: MatchesProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [videoMatch, setVideoMatch] = useState<{ match: Match, isAnswering: boolean, existingCall: CallData | null } | null>(null);

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
        
        // Skip unmatched matches
        if (m.unmatchedBy?.includes(profile.uid) || (m.users.find(id => id !== profile.uid) && m.unmatchedBy?.includes(m.users.find(id => id !== profile.uid)!))) {
          continue;
        }

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
              <MatchListItem
                key={m.id}
                m={m}
                profile={profile}
                idx={idx}
                onStartCall={(isAnswering, existingCall) => setVideoMatch({ match: m, isAnswering, existingCall })}
                onClick={async () => {
                  setActiveMatch(m);
                  if (m.lastMessageSenderId && m.lastMessageSenderId !== profile.uid && !m.isRead) {
                    try {
                      await updateDoc(doc(db, 'matches', m.id), { isRead: true });
                    } catch(e) {}
                  }
                }}
              />
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

      <AnimatePresence>
        {videoMatch && videoMatch.match.participants && (
          <VideoCall 
            matchId={videoMatch.match.id}
            currentUser={profile}
            otherUser={videoMatch.match.participants[0]}
            existingCall={videoMatch.existingCall}
            onClose={() => setVideoMatch(null)}
            isAnswering={videoMatch.isAnswering}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
