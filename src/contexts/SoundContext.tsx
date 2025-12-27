'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { soundManager, SoundType } from '@/lib/sounds';

interface SoundContextType {
  isEnabled: boolean;
  toggle: () => void;
  setEnabled: (enabled: boolean) => void;
  play: (type: SoundType) => void;
  initialized: boolean;
}

const SoundContext = createContext<SoundContextType | null>(null);

interface SoundProviderProps {
  children: ReactNode;
  defaultEnabled?: boolean;
}

export function SoundProvider({ children, defaultEnabled = true }: SoundProviderProps) {
  const [isEnabled, setIsEnabled] = useState(defaultEnabled);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Initialize on first user interaction to comply with browser autoplay policies
    const initSound = async () => {
      await soundManager.initialize();
      setInitialized(true);
      setIsEnabled(soundManager.isEnabled());

      // Play boot sound on first initialization
      if (soundManager.isEnabled()) {
        soundManager.play('boot');
      }
    };

    const handleInteraction = () => {
      if (!initialized) {
        initSound();
        // Remove listeners after initialization
        document.removeEventListener('click', handleInteraction);
        document.removeEventListener('keydown', handleInteraction);
        document.removeEventListener('touchstart', handleInteraction);
      }
    };

    // Add interaction listeners
    document.addEventListener('click', handleInteraction);
    document.addEventListener('keydown', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);

    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, [initialized]);

  const toggle = useCallback(() => {
    const newState = soundManager.toggle();
    setIsEnabled(newState);
    if (newState) {
      soundManager.play('click');
    }
  }, []);

  const setEnabledState = useCallback((enabled: boolean) => {
    soundManager.setEnabled(enabled);
    setIsEnabled(enabled);
  }, []);

  const play = useCallback(
    (type: SoundType) => {
      if (initialized) {
        soundManager.play(type);
      }
    },
    [initialized]
  );

  return (
    <SoundContext.Provider
      value={{
        isEnabled,
        toggle,
        setEnabled: setEnabledState,
        play,
        initialized,
      }}
    >
      {children}
    </SoundContext.Provider>
  );
}

export function useSound() {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error('useSound must be used within a SoundProvider');
  }
  return context;
}

// Hook for components that want sound effects on interactions
export function useSoundEffects() {
  const { play, initialized, toggle, isEnabled } = useSound();

  const playClick = useCallback(() => {
    if (initialized) play('click');
  }, [play, initialized]);

  const playHover = useCallback(() => {
    if (initialized) play('hover');
  }, [play, initialized]);

  const playSuccess = useCallback(() => {
    if (initialized) play('success');
  }, [play, initialized]);

  const playError = useCallback(() => {
    if (initialized) play('error');
  }, [play, initialized]);

  const playNotification = useCallback(() => {
    if (initialized) play('notification');
  }, [play, initialized]);

  const toggleSound = useCallback(() => {
    toggle();
  }, [toggle]);

  return {
    playClick,
    playHover,
    playSuccess,
    playError,
    playNotification,
    toggleSound,
    isEnabled,
  };
}
