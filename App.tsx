import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import MenuPrincipal from './src/screens/MenuPrincipal';
import Configuracion from './src/screens/Configuracion';
import PantallaJuego from './src/screens/PantallaJuego';
import Puntuaciones from './src/screens/Puntuaciones';
import ReglasJuego from './src/screens/ReglasJuego';
import ConfiguracionPartida from './src/screens/ConfiguracionPartida';
import PartidaActual from './src/screens/PartidaActual';
import { initializeConfig, getCurrentConfig } from './src/utils/gameConfig';
import { isGameInProgress, loadCurrentGame } from './src/data/storage';
import { AppState } from 'react-native';
import { soundManager } from './src/utils/soundManager';



type Screen = 'MenuPrincipal' | 'Configuracion' | 'PantallaJuego' | 'Puntuaciones' | 'ReglasJuego' | 'ConfiguracionPartida' | 'PartidaActual';
type GameMode = 'waiting' | 'playing' | 'scoring' | 'offlineScoring' | 'reviewing';

const App = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('MenuPrincipal');
  const [gameMode, setGameMode] = useState<GameMode>('waiting');
  const [screenTitle, setScreenTitle] = useState<string>('Scattergories');
  // Recordar desde dónde se fue a Configuración para volver correctamente
  const [configReturnScreen, setConfigReturnScreen] = useState<Screen>('MenuPrincipal');

  useEffect(() => {
    const init = async () => {
      await initializeConfig();
    };
    init();
  }, []);

  useEffect(() => {
    const updateTitle = async () => {
      const title = await getScreenTitle(currentScreen);
      setScreenTitle(title);
    };
    updateTitle();
  }, [currentScreen]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        soundManager.muteAll();
      } else if (nextAppState === 'active') {
        soundManager.unmuteAll();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const navigate = (screen: Screen, options?: { from?: Screen }) => {
    // Si van a Configuración, recordar desde dónde vienen
    if (screen === 'Configuracion' && options?.from) {
      setConfigReturnScreen(options.from);
    }
    setCurrentScreen(screen);
  };

  const goBack = async () => {
    console.log('🎮 Current gameMode:', gameMode, 'Screen:', currentScreen);
    // MenuPrincipal: nunca tiene botón atrás
    if (currentScreen === 'MenuPrincipal') {
      return;
    }

    // PantallaJuego: depende del modo
    if (currentScreen === 'PantallaJuego') {
      if (gameMode === 'scoring') {
        // No hacer nada, el botón no debe estar visible
        return;
      }
      
      if (gameMode === 'offlineScoring') {
        // Volver a scoring
        setGameMode('scoring');
        return;
      }
      
      if (gameMode === 'playing') {
        // Mostrar warning cuando el temporizador está corriendo
        Alert.alert(
          '¿ABANDONAR RONDA?',
          '¿Estás seguro de que quieres abandonar la ronda actual?',
          [
            { text: 'CANCELAR', style: 'cancel' },
            { 
              text: 'ABANDONAR', 
              onPress: () => setCurrentScreen('MenuPrincipal')
            }
          ]
        );
        return;
      }
      
      // Si es 'waiting', ir directamente a MenuPrincipal sin warning
      setCurrentScreen('MenuPrincipal');
      return;
    }

    // PartidaActual: ir a PantallaJuego en modo waiting
    if (currentScreen === 'PartidaActual') {
      setGameMode('waiting');
      setCurrentScreen('PantallaJuego');
      return;
    }

    if (currentScreen === 'Configuracion') {
      // Volver a la pantalla desde donde vino
      setCurrentScreen(configReturnScreen);
      // Resetear a MenuPrincipal para próximas veces
      setConfigReturnScreen('MenuPrincipal');
      return;
    }

    // Todas las demás pantallas: ir a MenuPrincipal
    setCurrentScreen('MenuPrincipal');
  };

  const getScreenTitle = async (screen: Screen): Promise<string> => {
    switch (screen) {
      case 'MenuPrincipal': return 'Scattergories';
      case 'Configuracion': return 'Configuración';
      case 'PantallaJuego': {
        const config = getCurrentConfig();
        if (config.freeMode) {
          return 'Juego Rápido';
        }
        const currentGame = await loadCurrentGame();
        const roundNumber = currentGame ? currentGame.rounds.length + 1 : 1;
        return `Ronda ${roundNumber}`;
      }
      case 'Puntuaciones': return 'Puntuaciones';
      case 'ReglasJuego': return 'Reglas del Juego';
      case 'ConfiguracionPartida': return 'Configuación inicial';
      case 'PartidaActual': return 'Partida Actual';
      default: return 'Scattergories';
    }
  };

  const shouldShowBackButton = (): boolean => {
    // MenuPrincipal: nunca
    if (currentScreen === 'MenuPrincipal') {
      return false;
    }

    // PantallaJuego: mostrar en todos los modos EXCEPTO scoring
    if (currentScreen === 'PantallaJuego') {
      return gameMode !== 'scoring';
    }

    // Todas las demás pantallas: sí
    return true;
  };

const renderScreen = () => {
  const navigationProps = { navigate, goBack };
  
  return (
    <>
      {currentScreen === 'MenuPrincipal' && <MenuPrincipal {...navigationProps} />}
      
      {currentScreen === 'Configuracion' && <Configuracion {...navigationProps} />}
      
      {/* ConfiguracionPartida se mantiene montada si volvemos de Configuracion */}
      {(currentScreen === 'ConfiguracionPartida' || configReturnScreen === 'ConfiguracionPartida') && (
        <View style={{ display: currentScreen === 'ConfiguracionPartida' ? 'flex' : 'none', flex: 1 }}>
          <ConfiguracionPartida {...navigationProps} />
        </View>
      )}
      
      {currentScreen === 'PantallaJuego' && (
        <PantallaJuego {...navigationProps} onGameModeChange={setGameMode} gameMode={gameMode} />
      )}
      
      {currentScreen === 'Puntuaciones' && <Puntuaciones {...navigationProps} />}
      
      {currentScreen === 'ReglasJuego' && <ReglasJuego {...navigationProps} />}
      
      {currentScreen === 'PartidaActual' && <PartidaActual {...navigationProps} />}
    </>
  );
};

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#8B0000" barStyle="light-content" />
      
      <View style={styles.header}>
        {shouldShowBackButton() ? (
          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <Text style={styles.backButtonText}>← Atrás</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
        <Text style={styles.headerTitle}>{screenTitle}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.screenContainer}>
        {renderScreen()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B0000',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerTitle: {
    flex: 1,
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 70,
  },
  screenContainer: {
    flex: 1,
  },
});

export default App;