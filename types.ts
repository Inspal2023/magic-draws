
export enum Screen {
  WELCOME,
  DRAWING,
  CONFIG,
  PREVIEW,
}

export interface AppState {
  screen: Screen;
  lineArt: string | null;
  style: string;
  prompt: string;
  generatedImage: string | null;
  renderTime: number | null;
  isLoading: boolean;
  error: string | null;
  loadingText: string | null;
  loadingType: 'generation' | 'inspiration' | null;
}

export type AppContextType = AppState & {
  setScreen: (screen: Screen) => void;
  setLineArt: (image: string | null) => void;
  setStyle: (style: string) => void;
  setPrompt: (prompt: string) => void;
  setGeneratedImage: (image: string | null) => void;
  setRenderTime: (time: number | null) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLoadingText: (text: string | null) => void;
  setLoadingType: (type: AppState['loadingType']) => void;
  resetToConfig: () => void;
};