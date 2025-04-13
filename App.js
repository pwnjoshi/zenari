// App.js
import { NavigationContainer } from '@react-navigation/native';
import Navigation from './src/Navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  return (
    <NavigationContainer>
      <Navigation />
    </NavigationContainer>
  );
}

