'use client';

import { useState, useRef } from 'react';
import { Upload, X, ImageIcon } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/config';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

interface LogoUploadProps {
  currentLogoURL?: string;
  onLogoUploaded: (url: string) => void;
  onLogoRemoved: () => void;
  label?: string;
  hint?: string;
}

export default function LogoUpload({
  currentLogoURL,
  onLogoUploaded,
  onLogoRemoved,
  label = 'Logo',
  hint = 'Upload your company or business logo. Recommended size: 256x256px.',
}: LogoUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    try {
      setUploading(true);
      const fileName = `${uuidv4()}_${file.name}`;
      const storageRef = ref(storage, `logos/${user.uid}/${fileName}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      onLogoUploaded(downloadURL);
      toast.success('Logo uploaded');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to upload logo';
      toast.error(message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      <p className="text-xs text-text-tertiary mb-3">{hint}</p>

      <div className="flex items-center gap-4">
        {/* Preview */}
        <div className="w-24 h-24 rounded-apple border-2 border-dashed border-border bg-surface-elevated flex items-center justify-center overflow-hidden flex-shrink-0">
          {currentLogoURL ? (
            <img
              src={currentLogoURL}
              alt="Logo"
              className="w-full h-full object-contain p-1"
            />
          ) : (
            <ImageIcon className="w-8 h-8 text-text-tertiary" />
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white text-sm font-medium rounded-apple transition-all"
          >
            <Upload className="w-4 h-4" />
            {uploading ? 'Uploading...' : currentLogoURL ? 'Change' : 'Upload'}
          </button>

          {currentLogoURL && (
            <button
              type="button"
              onClick={onLogoRemoved}
              className="flex items-center gap-2 px-4 py-2 text-error text-sm font-medium hover:bg-error/10 rounded-apple transition-all"
            >
              <X className="w-4 h-4" />
              Remove
            </button>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
