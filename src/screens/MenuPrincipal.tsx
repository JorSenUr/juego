import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Alert,
} from 'react-native';
import { updateConfig, getCurrentConfig } from '../utils/gameConfig';
import { isGameInProgress, finalizeCurrentGame } from '../data/storage';
import { connectionManager } from '../utils/connectionManager';



interface MenuPrincipalProps {
  navigate: (screen: 'MenuPrincipal' | 'Configuracion' | 'PantallaJuego' | 'Puntuaciones' | 'ReglasJuego' | 'ConfiguracionPartida' | 'SeleccionModoPartida' | 'ConfiguracionOnline' | 'PartidaActual') => void;
  goBack: () => void;
}

const MenuPrincipal = ({ navigate, goBack }: MenuPrincipalProps) => {
  const [hasGameInProgress, setHasGameInProgress] = useState(false);
  const [isOnlineGame, setIsOnlineGame] = useState(false);
  const [isMasterDevice, setIsMasterDevice] = useState(false);


  useEffect(() => {
    checkGameStatus();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      checkGameStatus();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const checkGameStatus = async () => {
    const inProgress = await isGameInProgress();
    setHasGameInProgress(inProgress);
    
  const config = getCurrentConfig();
  setIsOnlineGame(config.onlineGameInProgress || false);
  setIsMasterDevice(config.isMasterDevice || false);

    
    //console.log('🔍 Estado:', { inProgress, onlineGameInProgress: config.onlineGameInProgress });
  };

  const handleJuegoRapido = async () => {
    await updateConfig({ freeMode: true });
    navigate('PantallaJuego');
  };

  const handleComenzarPartida = async () => {
    await updateConfig({ freeMode: false });
    
    if (hasGameInProgress || isOnlineGame) {
      navigate('PantallaJuego');
    } else {
      navigate('SeleccionModoPartida'); // ← Era ConfiguracionPartida
    }
  };
  
  const handleTerminarPartida = () => {
    const config = getCurrentConfig();
    
    // CASO 1: MAESTRO en partida online
    if (isOnlineGame && isMasterDevice) {
      Alert.alert(
        'TERMINAR PARTIDA ONLINE',
        '¿Quieres terminar la partida para todos los jugadores?',
        [
          { text: 'CANCELAR', style: 'cancel' },
          { 
            text: 'TERMINAR', 
            onPress: async () => {
              // Marcar false antes de GAME_FINALIZE para eitar falso abandono
              await updateConfig({ onlineGameInProgress: false });              
              
              // Enviar GAME_FINALIZE a todos
              connectionManager.sendEvent({
                type: 'GAME_FINALIZE',
                data: {}
              });

              await new Promise(resolve => setTimeout(resolve, 500));

              await finalizeCurrentGame();
              await connectionManager.disconnect();
              
              Alert.alert('Partida Terminada', 'La partida se ha guardado en el historial.', [
                //{ text: 'OK', onPress: () => navigate('Puntuaciones') }
                { text: 'OK', onPress: () => navigate('MenuPrincipal') }
              ]);
            }
          }
        ]
      );
      return;
    }
    
    // CASO 2: ESCLAVO en partida online
    if (isOnlineGame && !isMasterDevice) {
      Alert.alert(
        'ABANDONAR PARTIDA',
        '¿Quieres abandonar la partida?\n\nTus rondas se guardarán en el historial.',
        [
          { text: 'CANCELAR', style: 'cancel' },
          { 
            text: 'ABANDONAR', 
            style: 'destructive',
            onPress: async () => {
              await finalizeCurrentGame();
              await connectionManager.disconnect();
              await updateConfig({ onlineGameInProgress: false });
              navigate('MenuPrincipal');
            }
          }
        ]
      );
      return;
    }
    
    // CASO 3: Partida offline normal
    Alert.alert(
      'TERMINAR PARTIDA',
      '¿Quieres terminar esta partida? Todas las rondas se guardarán en el historial permanente.',
      [
        { text: 'CANCELAR', style: 'cancel' },
        { 
          text: 'TERMINAR', 
          onPress: async () => {
            await finalizeCurrentGame();
            await updateConfig({ onlineGameInProgress: false });
            Alert.alert('Partida Terminada', 'La partida se ha guardado en el historial.', [
              { text: 'OK', onPress: () => navigate('Puntuaciones') }
            ]);
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/*<Image 
          source={require('../assets/logo.png')} 
          style={styles.logo}
          resizeMode="contain"
        />*/}

        <Image 
          source={require('../assets/titulo.png')} 
          style={styles.title}
          resizeMode="contain"
        />
        
        {/* <Text style={styles.title}>Scattergories</Text> */}
        <Text style={styles.subtitle}>El juego de palabras por categorías</Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.button}
            onPress={handleJuegoRapido}
          >
            <Text style={styles.buttonText}>Juego Rápido</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, hasGameInProgress && styles.orangeButton]}
            onPress={handleComenzarPartida}
          >
            <Text style={styles.buttonText}>
              {(hasGameInProgress || isOnlineGame) ? 'Continuar Partida' : 'Partida Nueva'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.button, 
              (hasGameInProgress || isOnlineGame) ? styles.redBrightButton : styles.disabledButton
            ]}
            onPress={handleTerminarPartida}
            disabled={!hasGameInProgress && !isOnlineGame}
          >
            <Text style={[
              styles.buttonText,
              !hasGameInProgress && styles.disabledButtonText
            ]}>
              {isOnlineGame 
                ? (isMasterDevice ? 'Terminar Partida' : 'Abandonar Partida') 
                : 'Terminar Partida'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.buttonWithSeparation]}
            onPress={() => navigate('Puntuaciones')}
          >
            <Text style={styles.buttonText}>Puntuaciones</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.button}
            onPress={() => navigate('ReglasJuego')}
          >
            <Text style={styles.buttonText}>Reglas del Juego</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.button}
            onPress={() => navigate('Configuracion')}
          >
            <Text style={styles.buttonText}>Configuración</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2C1810',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    width: 250,
    height: 140,
    marginBottom: -40,
  },
  title: {
    width: 350,
    height: 140,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#F5E6D3',
    marginBottom: 50,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
  },
  button: {
    backgroundColor: '#8B0000',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  orangeButton: {
    backgroundColor: '#D2691E',
  },
  redBrightButton: {
    backgroundColor: '#DC143C',
  },
  disabledButton: {
    backgroundColor: '#666666',
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButtonText: {
    opacity: 0.7,
  },
  buttonWithSeparation: {
    marginTop: 30,
  },
});

export default MenuPrincipal;