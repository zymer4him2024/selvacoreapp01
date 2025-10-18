'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SUPPORTED_LANGUAGES } from '@/lib/utils/constants';

export default function SelectLanguagePage() {
  const router = useRouter();
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');

  const handleContinue = () => {
    // Store language preference (we'll implement proper storage later)
    localStorage.setItem('preferredLanguage', selectedLanguage);
    // Redirect to role selection
    router.push('/select-role');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl space-y-8 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Choose Your Language
          </h1>
          <p className="text-lg text-text-secondary">
            Select your preferred language to continue
          </p>
        </div>

        {/* Language Selection Grid */}
        <div className="apple-card">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setSelectedLanguage(lang.code)}
                className={`
                  p-6 rounded-apple transition-all duration-200
                  ${
                    selectedLanguage === lang.code
                      ? 'bg-primary text-white shadow-apple-focus scale-[1.02]'
                      : 'bg-surface hover:bg-surface-elevated border border-border hover:border-border-light'
                  }
                `}
              >
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{lang.flag}</span>
                  <div className="text-left">
                    <div className="font-semibold text-lg">{lang.name}</div>
                    <div
                      className={`text-sm ${
                        selectedLanguage === lang.code
                          ? 'text-white/80'
                          : 'text-text-tertiary'
                      }`}
                    >
                      {lang.code.toUpperCase()}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            className="w-full mt-6 px-8 py-4 bg-primary hover:bg-primary-hover text-white font-semibold rounded-apple transition-all hover:scale-[1.02] shadow-apple"
          >
            Continue
          </button>
        </div>

        {/* Back Link */}
        <div className="text-center">
          <button
            onClick={() => router.push('/')}
            className="text-text-secondary hover:text-text-primary transition-colors text-sm"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

