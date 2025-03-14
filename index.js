/**
 * @format
 */

import { AppRegistry } from 'react-native';
import 'react-native-gesture-handler'; // Ensure this is at the top
import App from './App';
import { name as appName } from './app.json';



// Register the main component
AppRegistry.registerComponent(appName, () => App);
