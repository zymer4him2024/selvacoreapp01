'use client';

import { SUPPORTED_LANGUAGES } from '@/lib/utils/constants';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  const handleLanguageSelect = (languageCode: string) => {
    // Store selected language
    localStorage.setItem('selectedLanguage', languageCode);
    // Go to login
    router.push('/login');
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="w-full max-w-4xl space-y-12 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-6xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Selvacore
          </h1>
          <p className="text-2xl text-text-secondary">
            Installation Management Platform
          </p>
          <p className="text-lg text-text-tertiary mt-4">
            Select your language to continue
          </p>
        </div>
        
        {/* Language Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageSelect(lang.code)}
              className="apple-card hover:scale-[1.05] transition-all p-8 text-center group cursor-pointer"
            >
              <div className="text-6xl mb-4">{lang.flag}</div>
              <h3 className="text-2xl font-semibold mb-2 group-hover:text-primary transition-colors">
                {lang.name}
              </h3>
              <p className="text-sm text-text-tertiary">
                Click to continue
              </p>
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-text-tertiary">
          Professional installation management platform 🚀
        </p>
      </div>
    </main>
  );
}
