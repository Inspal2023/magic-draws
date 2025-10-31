
import React from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import WelcomeScreen from './components/WelcomeScreen';
import DrawingScreen from './components/DrawingScreen';
import ConfigScreen from './components/ConfigScreen';
import PreviewScreen from './components/PreviewScreen';
import { Screen } from './types';
import LoadingOverlay from './components/common/LoadingOverlay';
import Toast from './components/common/Toast';

const ScreenRenderer: React.FC = () => {
  const { screen, isLoading, error, setError, loadingText, loadingType } = useAppContext();

  return (
    <>
      {(() => {
        switch (screen) {
          case Screen.WELCOME:
            return <WelcomeScreen />;
          case Screen.DRAWING:
            return <DrawingScreen />;
          case Screen.CONFIG:
            return <ConfigScreen />;
          case Screen.PREVIEW:
            return <PreviewScreen />;
          default:
            return <WelcomeScreen />;
        }
      })()}
      <LoadingOverlay isLoading={isLoading} customText={loadingText} loadingType={loadingType} />
      <Toast message={error} onDismiss={() => setError(null)} />
    </>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <ScreenRenderer />
    </AppProvider>
  );
};

export default App;