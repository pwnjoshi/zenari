
// index.js
console.log("📦 index.js loaded!");

import React from 'react';
import { AppRegistry } from 'react-native';
import 'react-native-gesture-handler'; // keep at top
import App from './App';
import { name as appName } from './app.json';
import auth from '@react-native-firebase/auth';
import { AuthProvider } from './src/screens/AuthProvider';

// Disable phone-verification in dev
auth().settings.appVerificationDisabledForTesting = __DEV__;

const Root = () => (
  <AuthProvider>
    <App />
  </AuthProvider>
);

AppRegistry.registerComponent(appName, () => Root);
