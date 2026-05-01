import { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { motion } from 'motion/react';
import { Shield, Lock } from 'lucide-react';

interface LoginPortalProps {
  onLoginStart: () => void;
  onLoginEnd: () => void;
}

export default function LoginPortal({ onLoginStart, onLoginEnd }: LoginPortalProps) {
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    onLoginStart();
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error(err);
      setError('Authentication failed. Please try again.');
    } finally {
      onLoginEnd();
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm space-y-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-[#F27D26]">
            <Shield size={20} />
            <h2 className="text-xs uppercase tracking-[0.2em] font-bold">Privacy First</h2>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">
            Veil is a closed community. Access is restricted to verified high-value professionals. Your data is encrypted and never shared.
          </p>
        </div>

        <button
          onClick={handleLogin}
          className="w-full bg-white text-black h-14 rounded-full font-bold uppercase tracking-widest text-[10px] hover:bg-[#F27D26] hover:text-white transition-all flex items-center justify-center gap-3 group"
        >
          <Lock size={14} className="group-hover:translate-y-[-1px] transition-transform" />
          Request Access via Google
        </button>

        {error && (
          <p className="text-red-500 text-[10px] uppercase tracking-wider text-center">{error}</p>
        )}
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="text-[9px] text-gray-500/50 uppercase tracking-[0.3em]">Identity Verification Required</p>
      </div>
    </div>
  );
}
