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
  navigate: (screen: any) => void;
  goBack: () => void;
}

const MenuPrincipal = ({ navigate, goBack }: MenuPrincipalProps) => {
  const [hasGameInProgress, setHasGameInProgress] = useState(false);
  const [isOnlineGame, setIsOnlineGame] = useState(false);
  const [isMasterDevice, setIsMasterDevice] = useState(false);

  // ✅ CORRECCIÓN: Eliminado el setInterval.
  // Solo comprobamos el estado cuando se monta el componente (al entrar al menú).
  useEffect(() => {
    checkGameStatus();
  }, []); 

  const checkGameStatus = async () => {
    try {
      console.log('🔄 Comprobando estado del juego...'); // Log para depurar
      const inProgress = await isGameInProgress();
      setHasGameInProgress(inProgress);
      
      const config = getCurrentConfig();
      setIsOnlineGame(config.onlineGameInProgress || false);
      setIsMasterDevice(config.isMasterDevice || false);
    } catch (error) {
      console.error('Error checking game status:', error);
    }
  };

  const handleJuegoOnline = async () => {
    if (isOnlineGame) {
      navigate('PantallaJuego');
      return;
    }

    if (hasGameInProgress && !isOnlineGame) {
      Alert.alert(
        'Partida en curso',
        'Tienes una partida local en curso. Termínala primero para jugar online.',
        [{ text: 'OK' }]
      );
      return;
    }

    await updateConfig({ freeMode: false });
    navigate('SeleccionRol');
  };

  const handleJuegoLocal = async () => {
    if (hasGameInProgress && !isOnlineGame) {
      navigate('PantallaJuego');
      return;
    }

    if (isOnlineGame) {
      Alert.alert(
        'Partida en curso',
        'Tienes una partida online activa. Abandónala o termínala primero.',
        [{ text: 'OK' }]
      );
      return;
    }

    await updateConfig({ freeMode: false, onlineGameInProgress: false });
    navigate('ConfiguracionPartida');
  };

  const handleTerminarPartida = () => {
    if (isOnlineGame && isMasterDevice) {
      Alert.alert(
        'TERMINAR PARTIDA ONLINE',
        '¿Quieres terminar la partida para todos los jugadores?',
        [
          { text: 'CANCELAR', style: 'cancel' },
          { 
            text: 'TERMINAR', 
            onPress: async () => {
              await updateConfig({ onlineGameInProgress: false });              
              connectionManager.sendEvent({ type: 'GAME_FINALIZE', data: {} });
              await new Promise(resolve => setTimeout(resolve, 500));
              await finalizeCurrentGame();
              await connectionManager.disconnect();
              Alert.alert('Partida Terminada', 'La partida se ha guardado en el historial.', [
                { text: 'OK', onPress: () => { checkGameStatus(); } } // Recargar estado al terminar
              ]);
            }
          }
        ]
      );
      return;
    }
    
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
              checkGameStatus(); // Recargar estado
            }
          }
        ]
      );
      return;
    }
    
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
              { text: 'OK', onPress: () => { navigate('Puntuaciones'); } }
            ]);
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image 
          source={require('../assets/titulo.png')} 
          style={styles.titleImage}
          resizeMode="contain"
        />
        
        <Text style={styles.subtitle}>El juego de palabras por categorías</Text>
        
        <View style={styles.buttonContainer}>
          
          <TouchableOpacity 
            style={[
              styles.button, 
              styles.onlineButton,
              (hasGameInProgress && !isOnlineGame) && styles.disabledButton
            ]}
            onPress={handleJuegoOnline}
            disabled={hasGameInProgress && !isOnlineGame}
          >
            <Text style={styles.buttonIcon}>🛜</Text>
            <View>
              <Text style={styles.buttonText}>
                {isOnlineGame ? 'CONTINUAR ONLINE' : 'JUGAR ONLINE'}
              </Text>
              <Text style={styles.buttonSubtext}>
                {isOnlineGame ? 'Volver a la partida en curso' : 'Conexión WiFi Multijugador'}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.button, 
              styles.localButton,
              isOnlineGame && styles.disabledButton
            ]}
            onPress={handleJuegoLocal}
            disabled={isOnlineGame}
          >
            <Text style={styles.buttonIcon}>🏠</Text>
            <View>
              <Text style={styles.buttonText}>
                {(hasGameInProgress && !isOnlineGame) ? 'CONTINUAR LOCAL' : 'JUEGO LOCAL'}
              </Text>
              <Text style={styles.buttonSubtext}>
                {(hasGameInProgress && !isOnlineGame) ? 'Volver a la partida en curso' : 'Sin conexión o un solo dispositivo'}
              </Text>
            </View>
          </TouchableOpacity>

          {(hasGameInProgress || isOnlineGame) && (
            <TouchableOpacity 
              style={[styles.button, styles.terminateButton]}
              onPress={handleTerminarPartida}
            >
              <Text style={styles.buttonIcon}>❌</Text>
              <Text style={styles.buttonText}>
                {isOnlineGame 
                  ? (isMasterDevice ? 'TERMINAR PARTIDA' : 'ABANDONAR PARTIDA') 
                  : 'TERMINAR PARTIDA'}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.separator} />

          <View style={styles.secondaryButtons}>
            <TouchableOpacity 
              style={styles.smallButton}
              onPress={() => navigate('Puntuaciones')}
            >
              <Text style={styles.smallButtonText}>🏆 Puntuaciones</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.smallButton}
              onPress={() => navigate('ReglasJuego')}
            >
              <Text style={styles.smallButtonText}>📜 Reglas</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.configButton}
            onPress={() => navigate('Configuracion')}
          >
            <Text style={styles.smallButtonText}>⚙️ Configuración</Text>
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
  titleImage: {
    width: 300,
    height: 120,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#F5E6D3',
    marginBottom: 30,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 340,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  onlineButton: {
    backgroundColor: '#1E88E5',
    borderWidth: 1,
    borderColor: '#1565C0',
  },
  localButton: {
    backgroundColor: '#D2691E',
    borderWidth: 1,
    borderColor: '#A0522D',
  },
  terminateButton: {
    backgroundColor: '#8B0000',
    borderWidth: 1,
    borderColor: '#B22222',
    justifyContent: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#666',
    borderColor: '#444',
    opacity: 0.5,
  },
  buttonIcon: {
    fontSize: 28,
    marginRight: 15,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
  },
  buttonSubtext: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.9,
    marginTop: 2,
    fontFamily: 'Roboto',
  },
  separator: {
    height: 1,
    backgroundColor: '#8B6F47',
    marginVertical: 15,
    opacity: 0.5,
  },
  secondaryButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  smallButton: {
    backgroundColor: '#5A3825',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    flex: 0.48,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#8B6F47',
  },
  configButton: {
    backgroundColor: '#5A3825',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#8B6F47',
  },
  smallButtonText: {
    color: '#F5E6D3',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default MenuPrincipal;