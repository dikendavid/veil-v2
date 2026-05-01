import { useState, useEffect } from 'react';
import { collection, query, where, limit, getDocs, doc, setDoc, serverTimestamp, arrayUnion, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { UserProfile, Match } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, X, MapPin, ShieldCheck, Sparkles, ShieldAlert, Calendar } from 'lucide-react';

interface DiscoveryProps {
  profile: UserProfile;
}

export default function Discovery({ profile }: DiscoveryProps) {
  const [potentialMatches, setPotentialMatches] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchPotentials = async () => {
      setLoading(true);
      try {
        // Simple logic: fetch users of interested gender
        let q = query(
          collection(db, 'users'),
          where('uid', '!=', profile.uid),
          limit(20)
        );

        if (profile.interestedIn !== 'all') {
          q = query(q, where('gender', '==', profile.interestedIn));
        }

        const snap = await getDocs(q);
        const users = snap.docs.map(d => d.data() as UserProfile);
        
        // Filter out already swiped/matched (In real app we'd keep track of swipedIds)
        setPotentialMatches(users);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'users');
      } finally {
        setLoading(false);
      }
    };

    fetchPotentials();
  }, [profile.uid, profile.interestedIn]);

  const handleSwipe = async (direction: 'left' | 'right') => {
    const target = potentialMatches[currentIndex];
    if (!target) return;

    if (direction === 'right') {
      // Logic for like
      const matchId = [profile.uid, target.uid].sort().join('_');
      const matchRef = doc(db, 'matches', matchId);
      
      const matchSnap = await getDoc(matchRef);
      
      if (matchSnap.exists()) {
        const matchData = matchSnap.data() as Match;
        if (matchData.likes[target.uid]) {
          // It's a mutual match!
          await setDoc(matchRef, {
            likes: { ...matchData.likes, [profile.uid]: serverTimestamp() },
            isMutual: true,
            updatedAt: serverTimestamp(),
            users: arrayUnion(profile.uid, target.uid)
          }, { merge: true });
          alert("It's a Match! Discreet connection established.");
        }
      } else {
        // Initial like
        await setDoc(matchRef, {
          id: matchId,
          users: [profile.uid, target.uid],
          likes: { [profile.uid]: serverTimestamp() },
          isMutual: false,
          updatedAt: serverTimestamp()
        });
      }
    }

    setCurrentIndex(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Sparkles className="animate-pulse text-[#F27D26]" />
      </div>
    );
  }

  const currentProfile = potentialMatches[currentIndex];

  return (
    <div className="flex-1 flex flex-col p-6 h-full overflow-hidden">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-serif italic text-white/90">Curated View</h2>
          <p className="text-[9px] uppercase tracking-[0.2em] text-[#F27D26]">Daily Professionals</p>
        </div>
        <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-[#F27D26]">
          <ShieldCheck size={20} />
        </div>
      </header>

      <div className="flex-1 relative">
        <AnimatePresence mode="popLayout">
          {currentProfile ? (
            <motion.div
              key={currentProfile.uid}
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 1.1, opacity: 0, x: direction === 'right' ? 300 : -300 }}
              className="absolute inset-0 bg-[#111] rounded-3xl overflow-hidden border border-white/5 flex flex-col shadow-2xl"
            >
              {/* Photo Placeholder */}
              <div className="h-[60%] w-full bg-gradient-to-b from-gray-800 to-black relative">
                {currentProfile.photoURL ? (
                  <img src={currentProfile.photoURL} alt="" className="w-full h-full object-cover opacity-60" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-white/5">
                     <Sparkles size={48} className="text-white/10" />
                  </div>
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
                
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-2xl font-serif italic">{currentProfile.displayName}</h3>
                    {currentProfile.isVerified && <ShieldCheck size={16} className="text-[#F27D26]" />}
                  </div>
                  <div className="flex items-center gap-4 text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                    <span className="flex items-center gap-1"><MapPin size={12}/> {currentProfile.neighborhood}</span>
                    <span className="flex items-center gap-1"><Calendar size={12}/> 30+</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 p-6 space-y-4">
                <p className="text-sm text-gray-300 leading-relaxed italic line-clamp-3">
                  "{currentProfile.bio || 'Maintaining a discreet presence in the upper echelons of Lagos professional circles.'}"
                </p>
                
                <div className="pt-4 flex justify-between gap-4">
                  <button 
                    onClick={() => handleSwipe('left')}
                    className="flex-1 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 hover:border-white/20 transition-all"
                  >
                    <X size={24} />
                  </button>
                  <button 
                    onClick={() => handleSwipe('right')}
                    className="flex-1 h-16 rounded-2xl bg-[#F27D26]/10 border border-[#F27D26]/20 flex items-center justify-center text-[#F27D26] hover:bg-[#F27D26]/20 transition-all"
                  >
                    <Heart size={24} fill="currentColor" fillOpacity={0.1} />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <ShieldAlert className="text-gray-800" size={64} />
              <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Circle Exhausted</p>
              <p className="text-[10px] text-gray-600">Your professional circle will refresh at dawn.</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

let direction: 'left' | 'right' = 'right';
