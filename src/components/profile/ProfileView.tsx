import { UserProfile } from '../../types';
import { motion } from 'motion/react';
import { LogOut, ShieldCheck, CreditCard, ChevronRight, MapPin, Eye, Settings, Briefcase } from 'lucide-react';

interface ProfileViewProps {
  profile: UserProfile;
  onLogout: () => void;
}

export default function ProfileView({ profile, onLogout }: ProfileViewProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col h-full bg-[#050505] overflow-y-auto pb-32"
    >
      {/* Hero Header */}
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-[#F27D26] to-[#8B4513] p-1 shadow-2xl">
            <div className="w-full h-full rounded-[1.8rem] bg-[#111] overflow-hidden flex items-center justify-center relative">
              {profile.photoURL ? (
                <img src={profile.photoURL} className="w-full h-full object-cover" alt="" />
              ) : (
                <span className="text-4xl font-serif text-[#F27D26]">V</span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`px-3 py-1 rounded-full text-[8px] uppercase tracking-widest font-bold border ${profile.isVerified ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/5' : 'border-amber-500/30 text-amber-500 bg-amber-500/5'}`}>
              {profile.verificationStatus}
            </span>
            <div className="bg-white/5 border border-white/10 rounded-lg py-1 px-3 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#F27D26] animate-pulse" />
              <span className="text-[8px] uppercase tracking-[0.2em] font-bold text-gray-500">Live Status</span>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-serif italic">{profile.displayName}</h1>
            {profile.isVerified && <ShieldCheck size={18} className="text-[#F27D26]" />}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 uppercase tracking-widest font-medium">
            <span className="flex items-center gap-1"><MapPin size={12}/> {profile.neighborhood}</span>
            <span className="h-1 w-1 bg-gray-800 rounded-full" />
            <span className="flex items-center gap-1"><Briefcase size={12}/> Professional</span>
          </div>
        </div>
      </div>

      {/* Stats/Badges */}
      <div className="px-8 grid grid-cols-2 gap-4">
        <div className="bg-white/5 border border-white/5 rounded-3xl p-5 space-y-1">
           <p className="text-[9px] uppercase tracking-widest text-[#F27D26] font-bold">Circle Reach</p>
           <p className="text-xl font-medium">{profile.swipeCount || 0}</p>
        </div>
        <div className="bg-white/5 border border-white/5 rounded-3xl p-5 space-y-1">
           <p className="text-[9px] uppercase tracking-widest text-[#F27D26] font-bold">Connections</p>
           <p className="text-xl font-medium">--</p>
        </div>
      </div>

      {/* Menu Sections */}
      <div className="p-8 space-y-8">
        <section className="space-y-4">
          <label className="text-[10px] uppercase tracking-[0.4em] text-gray-600 font-bold ml-1">Account & Security</label>
          <div className="bg-white/5 border border-white/5 rounded-[2.5rem] overflow-hidden divide-y divide-white/5">
            <MenuItem icon={<CreditCard size={18}/>} label="Membership Tier" value="Standard" />
            <MenuItem icon={<Eye size={18}/>} label="Incognito Mode" value="Active" />
            <MenuItem icon={<Settings size={18}/>} label="Preference Filters" />
          </div>
        </section>

        <button 
          onClick={onLogout}
          className="w-full h-16 rounded-[2rem] bg-red-500/5 border border-red-500/10 text-red-500 flex items-center justify-center gap-3 uppercase text-[10px] tracking-widest font-bold hover:bg-red-500/10 transition-all"
        >
          <LogOut size={16} />
          Terminate Session
        </button>
      </div>

      <p className="text-center text-[9px] text-gray-700 uppercase tracking-widest mb-12">Veil v2.0.4 • Professional Confidentiality Guaranteed</p>
    </motion.div>
  );
}

function MenuItem({ icon, label, value }: { icon: any, label: string, value?: string }) {
  return (
    <button className="w-full h-14 px-6 flex items-center justify-between group transition-all hover:bg-white/[0.02]">
      <div className="flex items-center gap-4 text-gray-400 group-hover:text-white transition-colors">
        {icon}
        <span className="text-xs uppercase tracking-widest">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {value && <span className="text-[10px] text-[#F27D26] font-bold">{value}</span>}
        <ChevronRight size={14} className="text-gray-700 group-hover:text-white transition-colors" />
      </div>
    </button>
  );
}
