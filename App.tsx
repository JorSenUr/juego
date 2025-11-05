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
import { connectionManager } from './src/utils/connectionManager';
import { finalizeCurrentGame } from './src/data/storage';
import { updateConfig } from './src/utils/gameConfig';
import SeleccionModoPartida from './src/screens/SeleccionModoPartida';
import ConfiguracionOnline from './src/screens/ConfiguracionOnline';



type Screen = 'MenuPrincipal' | 'Configuracion' | 'PantallaJuego' | 'Puntuaciones' | 'ReglasJuego' | 'ConfiguracionPartida' | 'SeleccionModoPartida' | 'ConfiguracionOnline' | 'PartidaActual';
type GameMode = 'waiting' | 'playing' | 'scoring' | 'offlineScoring' | 'reviewing';

const App = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('MenuPrincipal');
  const [gameMode, setGameMode] = useState<GameMode>('waiting');
  const [screenTitle, setScreenTitle] = useState<string>('Scattergories');
  // Recordar desde dónde se fue a Configuración para volver correctamente
  const [configReturnScreen, setConfigReturnScreen] = useState<Screen>('MenuPrincipal');
  const [gameReturnScreen, setGameReturnScreen] = useState<Screen>('MenuPrincipal');

  useEffect(() => {
    const init = async () => {
      await initializeConfig();
      // Resetear conexiones al abrir la app
      await connectionManager.disconnect();
        await updateConfig({ 
        onlineGameInProgress: false,
        
      });
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

  // ========== LISTENER GLOBAL PARA GAME FINALIZE==========
  useEffect(() => {
    const handleEvents = async (event: any) => {
      console.log(`👂 App.tsx listener recibió: ${event.type}`);

      if (event.type === 'GAME_FINALIZE') {
        const config = getCurrentConfig();
        
        if (config.isMasterDevice) {
          console.log('🎮 GAME_FINALIZE ignorado (soy maestro)');
          return;
        }
        
        console.log('🎮 GAME_FINALIZE recibido, finalizando partida...');
        
        await finalizeCurrentGame();
        await connectionManager.disconnect();
        connectionManager.onEvent(handleEvents);
        await updateConfig({ onlineGameInProgress: false });
        
        Alert.alert('Partida Terminada', 'El organizador ha terminado la partida. Tus puntuaciones se han guardado.', [
          { text: 'OK', onPress: () => navigate('MenuPrincipal') }
        ]);
      }
      
      if (event.type === 'PLAYER_LEFT') {
        const config = getCurrentConfig();
        
        console.log(`🔍 PLAYER_LEFT - isMaster: ${config.isMasterDevice}, onlineGame: ${config.onlineGameInProgress}, playerName: ${event.data.playerName}`);

        // Solo procesar si es maestro y hay partida online
        if (config.isMasterDevice && config.onlineGameInProgress) {
          const remainingPlayers = connectionManager.getConnectedPlayers();

          console.log(`👥 Jugadores restantes: ${remainingPlayers.length} - ${remainingPlayers.join(', ')}`);
          
          // Si solo queda el maestro (1 jugador)
          if (remainingPlayers.length === 1) {
            Alert.alert(
              'Último jugador desconectado',
              `${event.data.playerName} ha abandonado la partida. Eres el único jugador restante.\n\n¿Quieres terminar la partida?`,
              [
                { text: 'SEGUIR JUGANDO', style: 'cancel' },
                {
                  text: 'TERMINAR PARTIDA',
                  onPress: async () => {
                    // Enviar GAME_FINALIZE (aunque no haya nadie)
                    connectionManager.sendEvent({
                      type: 'GAME_FINALIZE',
                      data: {}
                    });
                    
                    await new Promise(resolve => setTimeout(resolve, 200));
                    await finalizeCurrentGame();
                    await connectionManager.disconnect();
                    await updateConfig({ onlineGameInProgress: false });
                    
                    Alert.alert('Partida Terminada', 'La partida se ha guardado en el historial.', [
                      { text: 'OK', onPress: () => navigate('MenuPrincipal') }
                    ]);
                  }
                }
              ]
            );
          } else {
            // Notificación simple si quedan más jugadores
            Alert.alert('Jugador desconectado', `${event.data.playerName} ha abandonado la partida.`, [
              { text: 'OK' }
            ]);
          }
        }
      }
    };
    
    connectionManager.onEvent(handleEvents);
    console.log('✅ Listener de App.tsx registrado');
    
    return () => {
      connectionManager.removeEventListener(handleEvents);
      console.log('❌ Listener de App.tsx eliminado');
    };
  }, []);

  const navigate = (screen: Screen, options?: { from?: Screen }) => {
    // Si van a Configuración, recordar desde dónde vienen
    if (screen === 'Configuracion' && options?.from) {
      setConfigReturnScreen(options.from);
    }
    
    // Si van a PantallaJuego desde ConfiguracionPartida o ConfiguracionOnline, recordarlo
    if (screen === 'PantallaJuego' && (currentScreen === 'ConfiguracionPartida' || currentScreen === 'ConfiguracionOnline')) {
      setGameReturnScreen(currentScreen);
    }
    
    setCurrentScreen(screen);
  };

  const goBack = async () => {
    console.log('🎮 Current gameMode:', gameMode, 'Screen:', currentScreen);
    // MenuPrincipal: nunca tiene botón atrás
    if (currentScreen === 'MenuPrincipal') {
      return;
    }

    // Configuracion: volver a donde vino
    if (currentScreen === 'Configuracion') {
      setCurrentScreen(configReturnScreen);
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

    // ConfiguracionPartida y ConfiguracionOnline: volver a SeleccionModoPartida
    if (currentScreen === 'ConfiguracionPartida' || currentScreen === 'ConfiguracionOnline') {
      setCurrentScreen('SeleccionModoPartida');
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
      case 'ConfiguracionPartida': return 'Configuración inicial';
      case 'SeleccionModoPartida': return 'Nueva Partida';           // ← AÑADIR
      case 'ConfiguracionOnline': return 'Partida Online';           // ← AÑADIR
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
        
        {currentScreen === 'SeleccionModoPartida' && <SeleccionModoPartida {...navigationProps} />} 
        
        {(currentScreen === 'ConfiguracionOnline' || configReturnScreen === 'ConfiguracionOnline') && (
          <View style={{ display: currentScreen === 'ConfiguracionOnline' ? 'flex' : 'none', flex: 1 }}>
            <ConfiguracionOnline {...navigationProps} />
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