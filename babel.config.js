module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [ // Ensure 'plugins' is an array
    [ // Add this array for react-native-dotenv
      "module:react-native-dotenv", {
        "moduleName": "@env",         // How you'll import it (e.g., import { API_KEY } from '@env')
        "path": ".env",             // The name of your environment file
        "blacklist": null,
        "whitelist": null,
        "safe": false,              // Set to true to require all variables listed in `.env.example`
        "allowUndefined": true      // Set to false to throw error if var is not defined
      }
    ]
    // Add other plugins here if you have them
  ]
};