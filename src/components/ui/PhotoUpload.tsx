import { useState, useRef, ChangeEvent } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import { Camera, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface PhotoUploadProps {
  userId: string;
  currentPhotoURL?: string;
  onUploadComplete: (url: string) => void;
  label?: string;
}

export default function PhotoUpload({ userId, currentPhotoURL, onUploadComplete, label }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic validation
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const storageRef = ref(storage, `profiles/${userId}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      onUploadComplete(url);
    } catch (err: any) {
      console.error(err);
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {label && <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold ml-1">{label}</label>}
      
      <div 
        onClick={() => fileInputRef.current?.click()}
        className="relative aspect-square w-full max-w-[200px] mx-auto group cursor-pointer"
      >
        <div className="absolute inset-0 rounded-[2.5rem] bg-white/5 border border-white/10 group-hover:border-[#F27D26]/30 transition-all flex flex-col items-center justify-center overflow-hidden">
          {currentPhotoURL ? (
            <img 
              src={currentPhotoURL} 
              alt="Profile" 
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-gray-600 group-hover:text-[#F27D26] transition-colors">
              <Camera size={32} strokeWidth={1.5} />
              <span className="text-[9px] uppercase tracking-widest font-bold">Upload Portrait</span>
            </div>
          )}

          {uploading && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
              <Loader2 className="animate-spin text-[#F27D26]" size={24} />
            </div>
          )}
        </div>

        <div className="absolute -bottom-2 -right-2 bg-[#F27D26] text-black p-2 rounded-2xl shadow-xl group-hover:scale-110 transition-transform">
          <Camera size={16} />
        </div>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept="image/*"
      />

      {error ? (
        <motion.div 
          initial={{ opacity: 0, y: 5 }} 
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-red-500 text-[10px] uppercase tracking-wider justify-center"
        >
          <AlertCircle size={12} />
          {error}
        </motion.div>
      ) : currentPhotoURL && !uploading ? (
        <p className="text-[9px] text-emerald-500/60 uppercase tracking-widest text-center flex items-center justify-center gap-1">
          <CheckCircle2 size={10} /> Image Verified
        </p>
      ) : null}
    </div>
  );
}
