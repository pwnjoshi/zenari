import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ImageBackground 
} from 'react-native';
import Video from 'react-native-video';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Slider from '@react-native-community/slider';
import Sound from 'react-native-sound';

// Enable audio mixing so that video (muted) and audio can play concurrently.
Sound.setCategory('Playback', true);

class SoundTherapy extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isPlaying: false,
      currentSound: null,
      progress: 0,
      duration: 0,
    };
    this.soundRef = null;
    this.progressInterval = null;

    // Sound therapy content options with unique card background images.
    this.soundOptions = [
      {
        id: 1,
        title: 'Ocean Waves',
        duration: '30:00',
        icon: 'waves',
        source: require('../assets/audio/ocean-waves.mp3'),
        background: require('../assets/waves.mp4'),
        cardBackground: require('../assets/bg1.jpg'),
      },
      {
        id: 2,
        title: 'Forest Rainfall',
        duration: '25:00',
        icon: 'cloud',
        source: require('../assets/audio/rainforest.mp3'),
        background: require('../assets/rainforest.mp4'),
        cardBackground: require('../assets/bg2.jpg'),
      },
      {
        id: 3,
        title: 'Zen Garden',
        duration: '20:00',
        icon: 'spa',
        source: require('../assets/audio/zen-garden.mp3'),
        background: require('../assets/zen.mp4'),
        cardBackground: require('../assets/bg3.jpg'),
      },
    ];
  }

  componentWillUnmount() {
    this.clearProgressTimer();
    if (this.soundRef) {
      this.soundRef.release();
      this.soundRef = null;
    }
  }

  clearProgressTimer = () => {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  };

  startProgressTimer = () => {
    this.clearProgressTimer();
    this.progressInterval = setInterval(() => {
      if (this.soundRef) {
        this.soundRef.getCurrentTime((seconds) => {
          this.setState({ progress: seconds * 1000 });
        });
      }
    }, 500);
  };

  playSound = (sound) => {
    console.log('Attempting to load sound:', sound.title);
    if (this.soundRef) {
      this.soundRef.release();
      this.clearProgressTimer();
      this.soundRef = null;
    }

    // Load the sound file.
    const newSound = new Sound(sound.source, (error) => {
      if (error) {
        console.error('Failed to load the sound:', error);
        return;
      }
      console.log('Sound loaded successfully.');
      newSound.setNumberOfLoops(-1);
      newSound.setVolume(1);
      const duration = newSound.getDuration() * 1000;
      // Update state and start playback immediately.
      this.setState({ duration, currentSound: sound, isPlaying: true, progress: 0 });
      this.soundRef = newSound;
      newSound.play((success) => {
        if (!success) {
          console.log('Audio playback failed');
        }
      });
      this.startProgressTimer();
    });
  };

  handleStop = () => {
    if (this.soundRef) {
      this.soundRef.stop(() => {
        this.soundRef.release();
        this.soundRef = null;
        this.clearProgressTimer();
        this.setState({ isPlaying: false, currentSound: null, progress: 0, duration: 0 });
      });
    } else {
      this.clearProgressTimer();
      this.setState({ isPlaying: false, currentSound: null, progress: 0, duration: 0 });
    }
  };

  render() {
    const { currentSound, progress, duration } = this.state;
    return (
      <View style={styles.container}>
        <Text style={styles.header}>Sound Therapy</Text>
        {!currentSound ? (
          <View style={styles.gridContainer}>
            {this.soundOptions.map((sound) => (
              <TouchableOpacity
                key={sound.id}
                style={styles.soundCard}
                onPress={() => this.playSound(sound)}
              >
                <ImageBackground
                  source={sound.cardBackground}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                >
                  <View style={styles.cardContent}>
                    <Icon name={sound.icon} size={32} color="#FFF" />
                    <Text style={styles.cardTitle}>{sound.title}</Text>
                    <Text style={styles.cardDuration}>{sound.duration}</Text>
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.playerContainer}>
            <Video
              source={currentSound.background}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
              repeat
              muted={true}
              paused={false} // Ensure the video plays automatically.
              playInBackground={true}
              playWhenInactive={true}
              onError={(error) => console.log('Player Video error:', error)}
            />
            <View style={styles.playerContent}>
              <Text style={styles.currentTitle}>{currentSound.title}</Text>
              <Slider
                style={styles.progressBar}
                minimumValue={0}
                maximumValue={duration}
                value={progress}
                minimumTrackTintColor="#FFFFFF"
                maximumTrackTintColor="rgba(255,255,255,0.5)"
                thumbTintColor="#FFFFFF"
                disabled
              />
              <View style={styles.controls}>
                <TouchableOpacity onPress={this.handleStop} style={styles.mainButton}>
                  <Icon name="stop" size={32} color="rgba(0, 25, 69, 0.9)" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F8FF',
    padding: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: '600',
    color: '#1A4B7A',
    marginBottom: 30,
    textAlign: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  soundCard: {
    width: '100%',
    height: 150,
    marginBottom: 20,
    borderRadius: 15,
    overflow: 'hidden',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(42, 82, 152, 0.7)',
    padding: 20,
  },
  cardTitle: {
    fontSize: 20,
    color: '#FFF',
    fontWeight: '600',
    marginVertical: 8,
  },
  cardDuration: {
    fontSize: 16,
    color: '#FFF',
    opacity: 0.9,
  },
  playerContainer: {
    flex: 1,
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 70,
  },
  playerContent: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(42, 82, 152, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25,
  },
  currentTitle: {
    fontSize: 24,
    color: '#FFF',
    fontWeight: '600',
    marginBottom: 30,
  },
  progressBar: {
    width: '100%',
    marginVertical: 20,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 20,
  },
  mainButton: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 40,
    elevation: 5,
  },
});

export default SoundTherapy;
