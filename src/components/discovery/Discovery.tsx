import { useState, useEffect } from 'react';
import { collection, query, where, limit, getDocs, doc, setDoc, serverTimestamp, arrayUnion, getDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { UserProfile, Match } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, X, MapPin, ShieldCheck, Sparkles, ShieldAlert, Calendar, MessageCircle, Lock, Settings2 } from 'lucide-react';

const calculateAge = (birthDateStr: string) => {
  if (!birthDateStr) return 0;
  const today = new Date();
  const birthDate = new Date(birthDateStr);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
  }
  return age;
};

interface DiscoveryProps {
  profile: UserProfile;
}

export default function Discovery({ profile }: DiscoveryProps) {
  const [potentialMatches, setPotentialMatches] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matchedWith, setMatchedWith] = useState<UserProfile | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right'>('right');
  const [showFilters, setShowFilters] = useState(false);
  const [tempMinAge, setTempMinAge] = useState(profile.minAgePreference || 30);
  const [tempMaxAge, setTempMaxAge] = useState(profile.maxAgePreference || 60);

  useEffect(() => {
    const fetchPotentials = async () => {
      // Only fetch if we are low on candidates and not already loading
      if (potentialMatches.length > currentIndex + 5) return;
      
      setLoading(true);
      try {
        let q = query(
          collection(db, 'users'),
          where('uid', '!=', profile.uid),
          limit(50) // Fetch a larger batch
        );

        if (profile.interestedIn !== 'all') {
          q = query(q, where('gender', '==', profile.interestedIn));
        }

        const snap = await getDocs(q);
        const minPref = profile.minAgePreference || 30;
        const maxPref = profile.maxAgePreference || 100;
        
        const calculateCompatibilityScore = (p1: UserProfile, p2: UserProfile) => {
          let score = 0;
          
          // Neighborhood match
          if (p1.neighborhood && p2.neighborhood && p1.neighborhood.toLowerCase() === p2.neighborhood.toLowerCase()) {
            score += 15;
          }
          
          // Simple bio keyword matching (professional background / interests proxy)
          if (p1.bio && p2.bio) {
            const getKeywords = (text: string) => {
              const stops = new Set(['the', 'and', 'a', 'to', 'of', 'in', 'i', 'is', 'that', 'it', 'on', 'you', 'this', 'for', 'but', 'with', 'are', 'have', 'be', 'at', 'or', 'as', 'was', 'so', 'if', 'out', 'not', 'my', 'me', 'we', 'from', 'about']);
              return text.toLowerCase().match(/\\b\\w+\\b/g)?.filter(w => w.length > 3 && !stops.has(w)) || [];
            };
            
            const k1 = new Set(getKeywords(p1.bio));
            const k2 = getKeywords(p2.bio);
            
            let sharedWords = 0;
            k2.forEach(w => {
              if (k1.has(w)) sharedWords++;
            });
            score += sharedWords * 5;
          }
          
          // Age proximity
          const ageDiff = Math.abs(calculateAge(p1.birthDate) - calculateAge(p2.birthDate));
          if (ageDiff <= 3) score += 10;
          else if (ageDiff <= 5) score += 5;
          
          return score;
        };

        const users = snap.docs
          .map(d => d.data() as UserProfile)
          .filter(u => {
             const age = calculateAge(u.birthDate);
             return !profile.swipedIds?.includes(u.uid) && !u.isIncognito && !u.isHidden && age >= minPref && age <= maxPref;
          })
          .sort((a, b) => calculateCompatibilityScore(profile, b) - calculateCompatibilityScore(profile, a));
        
        setPotentialMatches(users);
        setCurrentIndex(0); // Reset index for new batch
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'users');
      } finally {
        setLoading(false);
      }
    };

    fetchPotentials();
  }, [profile.interestedIn, profile.minAgePreference, profile.maxAgePreference]); // Only re-fetch if interest changes

  const handleSwipe = async (direction: 'left' | 'right') => {
    const target = potentialMatches[currentIndex];
    if (!target) return;

    setSwipeDirection(direction);

    try {
      // 1. Update swipedIds in sender profile
      await updateDoc(doc(db, 'users', profile.uid), {
        swipedIds: arrayUnion(target.uid),
        swipeCount: (profile.swipeCount || 0) + 1,
        updatedAt: serverTimestamp()
      });

      if (direction === 'right') {
        const matchId = [profile.uid, target.uid].sort().join('_');
        const matchRef = doc(db, 'matches', matchId);
        const matchSnap = await getDoc(matchRef);
        
        if (matchSnap.exists()) {
          const matchData = matchSnap.data() as Match;
          if (matchData.likes[target.uid]) {
            await setDoc(matchRef, {
              likes: { ...matchData.likes, [profile.uid]: serverTimestamp() },
              isMutual: true,
              updatedAt: serverTimestamp(),
              users: arrayUnion(profile.uid, target.uid)
            }, { merge: true });
            setMatchedWith(target);
          }
        } else {
          await setDoc(matchRef, {
            id: matchId,
            users: [profile.uid, target.uid],
            likes: { [profile.uid]: serverTimestamp() },
            isMutual: false,
            updatedAt: serverTimestamp()
          });
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'users/matches');
    }

    setCurrentIndex(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Sparkles className="animate-pulse text-[#F27D26]" size={32} />
          <p className="text-[10px] uppercase tracking-widest text-gray-600">Curating Circle...</p>
        </div>
      </div>
    );
  }

  const currentProfile = potentialMatches[currentIndex];

  return (
    <div className="flex-1 flex flex-col p-6 h-full overflow-hidden relative">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-serif italic text-white/90">Curated View</h2>
          <p className="text-[9px] uppercase tracking-[0.2em] text-[#F27D26]">Daily Professionals</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowFilters(true)}
            className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Settings2 size={18} />
          </button>
          <div className="w-10 h-10 rounded-full border border-[#F27D26]/30 bg-[#F27D26]/10 flex items-center justify-center text-[#F27D26]">
            <ShieldCheck size={20} />
          </div>
        </div>
      </header>

      <div className="flex-1 relative">
        <AnimatePresence mode="popLayout">
          {currentProfile ? (
            <motion.div
              key={currentProfile.uid}
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ 
                x: swipeDirection === 'right' ? 500 : -500, 
                opacity: 0, 
                rotate: swipeDirection === 'right' ? 20 : -20,
                transition: { duration: 0.4 }
              }}
              className="absolute inset-0 bg-[#111] rounded-[2.5rem] overflow-hidden border border-white/5 flex flex-col shadow-2xl z-10"
            >
              <div className="h-[65%] w-full relative">
                {currentProfile.photoURL ? (
                  <img src={currentProfile.photoURL} alt="" className="w-full h-full object-cover opacity-70" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-white/5">
                     <Sparkles size={48} className="text-white/5" />
                  </div>
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
                
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-2xl font-serif italic">{currentProfile.displayName}</h3>
                    {currentProfile.isVerified && <ShieldCheck size={18} className="text-[#F27D26]" />}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                    <span className="flex items-center gap-1.5"><MapPin size={12} className="text-[#F27D26]"/> {currentProfile.neighborhood}</span>
                    <span className="flex items-center gap-1.5"><Calendar size={12} className="text-[#F27D26]"/> {calculateAge(currentProfile.birthDate)}</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 p-6 flex flex-col justify-between">
                <p className="text-xs text-gray-400 leading-relaxed italic line-clamp-4">
                  "{currentProfile.bio || 'Professional integrity and discretion maintained.'}"
                </p>
                
                <div className="flex justify-between gap-4">
                  <button 
                    onClick={() => handleSwipe('left')}
                    className="flex-1 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-600 hover:text-white hover:border-white/20 transition-all active:scale-95"
                  >
                    <X size={24} />
                  </button>
                  <button 
                    onClick={() => handleSwipe('right')}
                    className="flex-1 h-14 rounded-2xl bg-[#F27D26]/5 border border-[#F27D26]/20 flex items-center justify-center text-[#F27D26] hover:bg-[#F27D26]/10 transition-all active:scale-95"
                  >
                    <Heart size={24} fill="currentColor" fillOpacity={0.1} />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full text-center space-y-6"
            >
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-gray-800">
                <ShieldAlert size={40} />
              </div>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500 font-bold">Circle Exhausted</p>
                <p className="text-[10px] text-gray-600 max-w-[200px] mx-auto">Your professional circle will refresh at dawn. Continue building your narrative.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {matchedWith && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-8 text-center"
          >
            <motion.div
              initial={{ scale: 0.8, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              className="space-y-8"
            >
              <div className="relative">
                <Sparkles className="absolute -top-12 -left-12 text-[#F27D26] animate-pulse" size={48} />
                <h2 className="text-6xl font-serif italic text-[#F27D26]">Match</h2>
                <div className="h-px w-24 bg-[#F27D26]/30 mx-auto mt-4" />
              </div>
              
              <div className="flex items-center justify-center -space-x-4">
                <div className="w-24 h-24 rounded-full border-2 border-[#F27D26] overflow-hidden bg-gray-900">
                  {profile.photoURL && <img src={profile.photoURL} className="w-full h-full object-cover" />}
                </div>
                <div className="w-24 h-24 rounded-full border-2 border-[#F27D26] overflow-hidden bg-gray-900">
                  {matchedWith.photoURL && <img src={matchedWith.photoURL} className="w-full h-full object-cover" />}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-lg font-serif italic">{matchedWith.displayName}</p>
                <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500">Mutual interest confirmed</p>
              </div>

              <div className="space-y-4 pt-8">
                <button 
                  onClick={() => setMatchedWith(null)}
                  className="w-full h-14 rounded-full bg-white text-black font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-transform hover:scale-105"
                >
                  <MessageCircle size={16} />
                  Initiate Secure Dialogue
                </button>
                <button 
                  onClick={() => setMatchedWith(null)}
                  className="text-[9px] uppercase tracking-[0.4em] text-gray-500 hover:text-white transition-colors"
                >
                  Continue Discovery
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 opacity-30 pt-12">
                <Lock size={12} />
                <span className="text-[8px] uppercase tracking-widest">End-to-End Encrypted</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] max-w-md mx-auto bg-black/80 backdrop-blur-sm flex items-end justify-center"
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-[#111] border-t border-white/10 rounded-t-[2.5rem] p-8 w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setShowFilters(false)}
                className="absolute top-6 right-6 w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>

              <h3 className="text-xl font-serif italic mb-2">Discovery Pacing</h3>
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-8">Refine Your Professional Circle</p>
              
              <div className="space-y-6 mb-10">
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Minimum Age</span>
                    <span className="font-bold text-[#F27D26]">{tempMinAge}</span>
                  </div>
                  <input 
                    type="range" 
                    min="18" 
                    max="100" 
                    value={tempMinAge}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (val <= tempMaxAge) setTempMinAge(val);
                    }}
                    className="w-full accent-[#F27D26] bg-white/10 rounded-full h-1 appearance-none"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Maximum Age</span>
                    <span className="font-bold text-[#F27D26]">{tempMaxAge}</span>
                  </div>
                  <input 
                    type="range" 
                    min="18" 
                    max="100" 
                    value={tempMaxAge}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (val >= tempMinAge) setTempMaxAge(val);
                    }}
                    className="w-full accent-[#F27D26] bg-white/10 rounded-full h-1 appearance-none"
                  />
                </div>
              </div>

              <button 
                onClick={async () => {
                  try {
                    await updateDoc(doc(db, 'users', profile.uid), {
                      minAgePreference: tempMinAge,
                      maxAgePreference: tempMaxAge,
                      updatedAt: serverTimestamp()
                    });
                    setShowFilters(false);
                    // Reset current match queue to trigger refresh
                    setPotentialMatches([]);
                  } catch(e) {
                    // console.error(e)
                  }
                }}
                className="w-full h-14 rounded-full bg-[#F27D26] text-black font-bold uppercase tracking-widest text-[10px] flex items-center justify-center hover:bg-[#F27D26]/90 transition-colors"
              >
                Apply Constraints
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
