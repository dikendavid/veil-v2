import { useState } from 'react';
import { User } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { UserProfile, VerificationStatus, SubscriptionTier } from '../../types';
import { motion } from 'motion/react';
import { ArrowRight, MapPin, Calendar, User as UserIcon, Sparkles } from 'lucide-react';
import { verifyProfileTone } from '../../lib/ai';
import PhotoUpload from '../ui/PhotoUpload';

interface OnboardingProps {
  user: User;
  onComplete: (profile: UserProfile) => void;
}

export default function Onboarding({ user, onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    displayName: user.displayName || '',
    birthDate: '',
    gender: 'male',
    interestedIn: 'all',
    neighborhood: '',
    bio: '',
    photoURL: user.photoURL || '',
    idPhotoURL: '',
    selfiePhotoURL: '',
  });

  const [aiFeedback, setAiFeedback] = useState<{ score?: number, suggestion?: string } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const checkBio = async () => {
    if (!formData.bio || formData.bio.length < 20) return;
    setIsVerifying(true);
    try {
      const feedback = await verifyProfileTone(formData.bio);
      setAiFeedback(feedback);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const profileData: UserProfile = {
      uid: user.uid,
      displayName: formData.displayName,
      birthDate: formData.birthDate,
      gender: formData.gender,
      interestedIn: formData.interestedIn,
      neighborhood: formData.neighborhood,
      bio: formData.bio,
      isVerified: !!(aiFeedback?.score && aiFeedback.score > 8 && formData.idPhotoURL && formData.selfiePhotoURL),
      verificationStatus: (aiFeedback?.score && aiFeedback.score > 8 && formData.idPhotoURL && formData.selfiePhotoURL) ? 'verified' : 'pending' as VerificationStatus,
      photoURL: formData.photoURL || undefined,
      swipeCount: 0,
      subscriptionTier: 'free' as SubscriptionTier,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'users', user.uid), profileData);
      onComplete(profileData);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col p-8 overflow-y-auto"
    >
      <header className="mb-12">
        <h1 className="text-4xl font-serif italic mb-2">Refining the Identity</h1>
        <p className="text-[10px] text-[#F27D26] uppercase tracking-[0.3em] font-bold">Step {step} of 4</p>
      </header>

      <div className="space-y-8">
        {step === 1 && (
          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="space-y-6"
          >
            <PhotoUpload 
              userId={user.uid}
              currentPhotoURL={formData.photoURL}
              onUploadComplete={(url) => setFormData({ ...formData, photoURL: url })}
              label="Official Portrait"
            />

            <InputGroup 
              label="Full Name" 
              icon={<UserIcon size={16}/>}
              value={formData.displayName}
              onChange={(v: string) => setFormData({ ...formData, displayName: v })}
              placeholder="As on your government ID"
            />
            <InputGroup 
              label="Date of Birth" 
              icon={<Calendar size={16}/>}
              value={formData.birthDate}
              type="date"
              onChange={(v: string) => setFormData({ ...formData, birthDate: v })}
            />
            <button 
              onClick={() => setStep(2)}
              disabled={!formData.displayName || !formData.birthDate}
              className="w-full bg-[#F27D26] h-14 rounded-full flex items-center justify-between px-8 text-black font-bold uppercase tracking-widest text-[10px] disabled:opacity-30 transition-opacity"
            >
              Continue
              <ArrowRight size={16} />
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold ml-1">Gender Identity</label>
              <div className="grid grid-cols-2 gap-3">
                {['male', 'female'].map((g) => (
                  <button
                    key={g}
                    onClick={() => setFormData({ ...formData, gender: g })}
                    className={`h-12 rounded-xl border text-[10px] uppercase tracking-tighter font-bold transition-all ${formData.gender === g ? 'bg-white text-black border-white' : 'border-white/10 text-gray-500'}`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold ml-1">Interest</label>
              <div className="grid grid-cols-3 gap-3">
                {['male', 'female', 'all'].map((i) => (
                  <button
                    key={i}
                    onClick={() => setFormData({ ...formData, interestedIn: i })}
                    className={`h-12 rounded-xl border text-[10px] uppercase tracking-tighter font-bold transition-all ${formData.interestedIn === i ? 'bg-[#F27D26] text-black border-[#F27D26]' : 'border-white/10 text-gray-500'}`}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={() => setStep(3)}
              className="w-full bg-white h-14 rounded-full flex items-center justify-between px-8 text-black font-bold uppercase tracking-widest text-[10px]"
            >
              Next Step
              <ArrowRight size={16} />
            </button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="space-y-6"
          >
            <InputGroup 
              label="Professional Base" 
              icon={<MapPin size={16}/>}
              value={formData.neighborhood}
              onChange={(v: string) => setFormData({ ...formData, neighborhood: v })}
              placeholder="e.g. Victoria Island, Lagos"
            />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold ml-1">The Professional Narrative</label>
                <button 
                  onClick={checkBio}
                  disabled={formData.bio.length < 20 || isVerifying}
                  className="text-[8px] uppercase tracking-widest font-bold text-[#F27D26] hover:opacity-80 transition-opacity flex items-center gap-1"
                >
                  {isVerifying ? 'Analyzing...' : <><Sparkles size={10}/> AI Check</>}
                </button>
              </div>
              <textarea 
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="A discreet summary of your persona..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-[#F27D26] transition-all min-h-[120px] resize-none"
              />
              {aiFeedback && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-5 bg-gradient-to-br from-[#F27D26]/10 to-transparent border border-[#F27D26]/20 rounded-3xl space-y-3 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Sparkles size={40} />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] uppercase tracking-[0.3em] text-[#F27D26] font-bold">Concierge Appraisal</p>
                    <div className="px-2 py-0.5 rounded-full bg-[#F27D26] text-black text-[8px] font-black uppercase">
                       {aiFeedback.score}/10
                    </div>
                  </div>
                  <p className="text-xs text-gray-300 italic leading-relaxed">"{aiFeedback.suggestion}"</p>
                  <div className="flex items-center gap-2 pt-1">
                    <div className="h-0.5 flex-1 bg-white/5 rounded-full overflow-hidden">
                       <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(aiFeedback.score || 0) * 10}%` }}
                        className="h-full bg-[#F27D26]" 
                       />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
            
            <button 
              onClick={() => setStep(4)}
              disabled={!formData.neighborhood || formData.bio.length < 20}
              className="w-full bg-white h-14 rounded-full flex items-center justify-between px-8 text-black font-bold uppercase tracking-widest text-[10px] disabled:opacity-30"
            >
              Next Step
              <ArrowRight size={16} />
            </button>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="space-y-6"
          >
            <div className="space-y-8">
              <div className="text-center">
                <h3 className="text-xl font-serif italic text-white mb-2">Identity Verification</h3>
                <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Secure Liveness & ID Check</p>
              </div>

              <PhotoUpload 
                userId={user.uid}
                currentPhotoURL={formData.idPhotoURL}
                onUploadComplete={(url) => setFormData({ ...formData, idPhotoURL: url })}
                label="Government ID (Front)"
              />

              <PhotoUpload 
                userId={user.uid}
                currentPhotoURL={formData.selfiePhotoURL}
                onUploadComplete={(url) => setFormData({ ...formData, selfiePhotoURL: url })}
                label="Liveness Selfie"
              />
            </div>
            
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.idPhotoURL || !formData.selfiePhotoURL}
              className="w-full bg-[#F27D26] h-14 rounded-full flex items-center justify-center gap-3 text-black font-bold uppercase tracking-widest text-[10px] disabled:opacity-30"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : 'Finalize Profile'}
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

function InputGroup({ label, value, onChange, placeholder, icon, type = "text" }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold ml-1">{label}</label>
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600">
          {icon}
        </div>
        <input 
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-white/5 border border-white/10 rounded-2xl h-14 pl-12 pr-4 text-sm focus:outline-none focus:border-[#F27D26] transition-all"
        />
      </div>
    </div>
  );
}
