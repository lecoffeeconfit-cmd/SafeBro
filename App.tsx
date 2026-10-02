import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Linking } from 'react-native';

import { AppProvider } from './src/context/AppContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { parseQuickCaptureUrl } from './src/features/quickCapture/config';
import { useApp } from './src/context/AppContext';

function QuickCaptureLinkHandler() {
  const { requestQuickCapture } = useApp();

  React.useEffect(() => {
    const handleUrl = (url: string) => {
      const mode = parseQuickCaptureUrl(url);
      if (!mode) return;
      requestQuickCapture(mode);
    };
    Linking.getInitialURL().then((url) => { if (url) handleUrl(url); });
    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => subscription.remove();
  }, [requestQuickCapture]);

  return null;
}

export default function App() {
  return <AppProvider><StatusBar style="dark" /><QuickCaptureLinkHandler /><AppNavigator /></AppProvider>;
}
