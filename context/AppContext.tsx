import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { AppState, Screen, AppContextType } from '../types';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>({
    screen: Screen.WELCOME,
    lineArt: null,
    style: '',
    prompt: '',
    generatedImage: null,
    renderTime: null,
    isLoading: false,
    error: null,
    loadingText: null,
    loadingType: null,
  });

  const setScreen = (screen: Screen) => setState(s => ({ ...s, screen }));
  const setLineArt = (image: string | null) => setState(s => ({ ...s, lineArt: image }));
  const setStyle = (style: string) => setState(s => ({ ...s, style }));
  const setPrompt = (prompt: string) => setState(s => ({ ...s, prompt }));
  const setGeneratedImage = (image: string | null) => setState(s => ({ ...s, generatedImage: image }));
  const setRenderTime = (time: number | null) => setState(s => ({ ...s, renderTime: time }));
  const setIsLoading = (loading: boolean) => setState(s => ({ ...s, isLoading: loading }));
  const setError = (error: string | null) => setState(s => ({ ...s, error }));
  const setLoadingText = (text: string | null) => setState(s => ({...s, loadingText: text}));
  const setLoadingType = (type: AppState['loadingType']) => setState(s => ({ ...s, loadingType: type }));

  const resetToConfig = useCallback(() => {
    setState(s => ({
      ...s,
      screen: Screen.CONFIG,
      generatedImage: null,
      renderTime: null,
    }));
  }, []);

  const value: AppContextType = {
    ...state,
    setScreen,
    setLineArt,
    setStyle,
    setPrompt,
    setGeneratedImage,
    setRenderTime,
    setIsLoading,
    setError,
    setLoadingText,
    setLoadingType,
    resetToConfig,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};