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
import { updateConfig } from '../utils/gameConfig';
import { isGameInProgress, finalizeCurrentGame } from '../data/storage';

interface MenuPrincipalProps {
  navigate: (screen: 'MenuPrincipal' | 'Configuracion' | 'PantallaJuego' | 'Puntuaciones' | 'ReglasJuego' | 'ConfiguracionPartida' | 'PartidaActual') => void;
  goBack: () => void;
}

const MenuPrincipal = ({ navigate, goBack }: MenuPrincipalProps) => {
  const [hasGameInProgress, setHasGameInProgress] = useState(false);

  useEffect(() => {
    checkGameStatus();
  }, []);

  const checkGameStatus = async () => {
    const inProgress = await isGameInProgress();
    setHasGameInProgress(inProgress);
  };

  const handleJuegoRapido = async () => {
    await updateConfig({ freeMode: true });
    navigate('PantallaJuego');
  };

  const handleComenzarPartida = async () => {
    await updateConfig({ freeMode: false });
    
    if (hasGameInProgress) {
      navigate('PantallaJuego');
    } else {
      navigate('ConfiguracionPartida');
    }
  };

const handleTerminarPartida = () => {
  Alert.alert(
    'TERMINAR PARTIDA',
    '¿Quieres terminar esta partida? Todas las rondas se guardarán en el historial permanente.',
    [
      { text: 'CANCELAR', style: 'cancel' },
      { 
        text: 'TERMINAR', 
        onPress: async () => {
          await finalizeCurrentGame();
          Alert.alert(
            'Partida Terminada',
            'La partida se ha guardado en el historial.',
            [{ 
              text: 'OK', 
              onPress: () => navigate('Puntuaciones') // ← Cambiar de MenuPrincipal a Puntuaciones
            }]
          );
        }
      }
    ]
  );
};

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image 
          source={require('../assets/logo.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        
        <Text style={styles.title}>Scattergories</Text>
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
              {hasGameInProgress ? 'Continuar Partida' : 'Comenzar Partida'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.button, 
              hasGameInProgress ? styles.redBrightButton : styles.disabledButton
            ]}
            onPress={handleTerminarPartida}
            disabled={!hasGameInProgress}
          >
            <Text style={[
              styles.buttonText,
              !hasGameInProgress && styles.disabledButtonText
            ]}>
              Terminar Partida
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
    height: 160,
    marginBottom: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#D2691E',
    marginBottom: 10,
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
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