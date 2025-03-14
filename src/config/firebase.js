// src/firebase/index.js
import firebase from '@react-native-firebase/app';
import '@react-native-firebase/firestore';

// Initialize Firebase
function initializeFirebase() {
  if (!firebase.apps.length) {
    // No need to pass config here as it's read from the native config files
    firebase.initializeApp();
    console.log('Firebase initialized successfully');
  } else {
    console.log('Firebase already initialized');
  }
  return firebase;
}

// Initialize immediately
const app = initializeFirebase();
const db = firebase.firestore();

export { app, db };