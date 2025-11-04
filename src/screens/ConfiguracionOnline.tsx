import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { getCurrentConfig, updateConfig } from '../utils/gameConfig';
import { connectionManager } from '../utils/connectionManager';

type Screen = 'MenuPrincipal' | 'Configuracion' | 'PantallaJuego' | 'Puntuaciones' | 'ReglasJuego' | 'ConfiguracionPartida' | 'SeleccionModoPartida' | 'ConfiguracionOnline' | 'PartidaActual';

interface ConfiguracionOnlineProps {
  navigate: (screen: Screen, options?: { from?: Screen }) => void;
  goBack: () => void;
}

const ConfiguracionOnline = ({ navigate, goBack }: ConfiguracionOnlineProps) => {
  const config = getCurrentConfig();
  const [isMasterDevice, setIsMasterDevice] = useState<boolean>(config.isMasterDevice);
  const [userRole, setUserRole] = useState<'none' | 'master' | 'slave'>('none');
  const [connectedPlayers, setConnectedPlayers] = useState<string[]>([]);
  const [playerName, setPlayerName] = useState<string>(config.playerNames[0] || 'Nombre');
  const [serverIdentifier, setServerIdentifier] = useState<string>(config.lastServerIdentifier || '');
  
  const serverEventListenerRef = useRef<((event: any) => void) | null>(null);

  useEffect(() => {
    return () => {
      if (serverEventListenerRef.current) {
        connectionManager.removeEventListener(serverEventListenerRef.current);
      }
    };
  }, []);

  const handleIniciarPartida = async () => {
    const trimmedName = playerName.trim() || 'Organizador';

    const started = await connectionManager.startServer(trimmedName);
    if (!started) {
      Alert.alert('Error', 'No se pudo iniciar la partida. Reintenta.');
      return;
    }

    if (serverEventListenerRef.current) {
      connectionManager.removeEventListener(serverEventListenerRef.current);
    }

    const listener = (event: any) => {
      if (event.type === 'PLAYERS_LIST_UPDATE') {
        setConnectedPlayers(event.data.players);
        return;
      }

      if (event.type === 'PLAYER_JOINED') {
        setConnectedPlayers(prev => {
          if (prev.includes(event.data.playerName)) {
            return prev;
          }
          return [...prev, event.data.playerName];
        });
      }

      if (event.type === 'PLAYER_LEFT') {
        setConnectedPlayers(prev => prev.filter(name => name !== event.data.playerName));
      }
    };

    connectionManager.onEvent(listener);
    serverEventListenerRef.current = listener;

    setUserRole('master');
    setPlayerName(trimmedName);
    const currentPlayers = connectionManager.getConnectedPlayers();
    setConnectedPlayers(currentPlayers.length > 0 ? [...currentPlayers] : [trimmedName]);
    await updateConfig({ 
      isMasterDevice: true,
      onlineGameInProgress: true,
    });
  };

  const handleUnirseAPartida = async (identifier: string) => {
    if (!identifier || identifier.trim() === '') {
      Alert.alert('Error', 'Debes introducir el identificador del organizador');
      return;
    }

    const idNum = identifier.trim();
    if (!/^\d{1,3}$/.test(idNum)) {
      Alert.alert('Error', 'El identificador debe ser un número de 1 a 3 dígitos');
      return;
    }

    const serverIp = await connectionManager.buildIpFromIdentifier(idNum);
    console.log(`🔗 Conectando a: ${serverIp}`);

    const connected = await connectionManager.connectToDevice(serverIp, playerName.trim() || 'Jugador');
    
    if (connected) {
      setUserRole('slave');
      await updateConfig({
        isMasterDevice: false,
        onlineGameInProgress: true,
        lastServerIdentifier: idNum,
      });
      
      connectionManager.onEvent(async (event) => {
        if (event.type === 'PLAYERS_LIST_UPDATE') {
          setConnectedPlayers(event.data.players);
        }
        
        if (event.type === 'GAME_START') {
          console.log('🎮 Esclavo recibió GAME_START, sincronizando config...');
          
          await updateConfig({ 
            onlineGameInProgress: true,
            paperMode: event.data.paperMode,
            warningEnabled: event.data.warningEnabled,
            warningSeconds: event.data.warningSeconds,
            showTimer: event.data.showTimer,
            endGameAlertEnabled: event.data.endGameAlertEnabled,
            endGameAlertTitle: event.data.endGameAlertTitle
          });
          
          console.log('✅ Config sincronizado, navegando a PantallaJuego');
          navigate('PantallaJuego');
        }
      });
        
      console.log('✅ Conectado a partida');
    } else {
      Alert.alert(
        'Error de conexión', 
        `No se pudo conectar al dispositivo ${idNum}.\n\nVerifica:\n• Que el organizador haya iniciado partida\n• Que estén en la misma red WiFi\n• Que el identificador sea correcto`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleCancelar = async () => {
    await connectionManager.disconnect();
    
    if (serverEventListenerRef.current) {
      connectionManager.removeEventListener(serverEventListenerRef.current);
      serverEventListenerRef.current = null;
    }
    
    setUserRole('none');
    setConnectedPlayers([]);
    await updateConfig({ onlineGameInProgress: false });
  };

  const handleIniciarJuego = async () => {
    const config = getCurrentConfig();
    
    connectionManager.startGame({
      paperMode: config.paperMode,
      warningEnabled: config.warningEnabled,
      warningSeconds: config.warningSeconds,
      showTimer: config.showTimer,
      endGameAlertEnabled: config.endGameAlertEnabled,
      endGameAlertTitle: config.endGameAlertTitle
    });
    
    navigate('PantallaJuego');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        {userRole === 'none' && (
          <View style={styles.setupContainer}>
            <Text style={styles.nameLabel}>TU NOMBRE:</Text>
            <TextInput
              style={styles.nameInput}
              value={playerName}
              onChangeText={setPlayerName}
              placeholder="Nombre"
              placeholderTextColor="#999"
            />
            
            {isMasterDevice ? (
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={handleIniciarPartida}
              >
                <Text style={styles.actionButtonText}>🎮 INICIAR PARTIDA</Text>
              </TouchableOpacity>
            ) : (
              <>
                <Text style={styles.nameLabel}>IDENTIFICADOR DEL ORGANIZADOR:</Text>
                <TextInput
                  style={styles.identifierInput}
                  value={serverIdentifier}
                  onChangeText={setServerIdentifier}
                  placeholder="Ej: 202"
                  placeholderTextColor="#999"
                  keyboardType="number-pad"
                  maxLength={3}
                />
                
                <TouchableOpacity 
                  style={[
                    styles.actionButton,
                    (!serverIdentifier.trim()) && styles.actionButtonDisabled
                  ]}
                  onPress={() => handleUnirseAPartida(serverIdentifier)}
                  disabled={!serverIdentifier.trim()}
                >
                  <Text style={styles.actionButtonText}>🔗 CONECTAR</Text>
                </TouchableOpacity>
              </>
            )}
            
            <Text style={styles.warningText}>
              📡 Asegúrate de estar en la misma red WiFi que los demás jugadores
            </Text>
          </View>
        )}

        {userRole === 'master' && (
          <View style={styles.waitingContainer}>
            <Text style={styles.waitingTitle}>ESPERANDO JUGADORES...</Text>
            <Text style={styles.waitingSubtitle}>Tu nombre: {playerName}</Text>
            
            <View style={styles.identifierBox}>
              <Text style={styles.identifierLabel}>Tu identificador:</Text>
              <Text style={styles.identifierValue}>{connectionManager.getServerIdentifier()}</Text>
            </View>
            
            <View style={styles.playersList}>
              <Text style={styles.playersListTitle}>Jugadores conectados:</Text>
              {connectedPlayers.map((player, index) => (
                <Text key={index} style={styles.playerItem}>
                  {index === 0 ? '✓ Tú (organizador)' : `✓ ${player}`}
                </Text>
              ))}
              {connectedPlayers.length === 1 && (
                <Text style={styles.playerItem}>⏳ Esperando...</Text>
              )}
            </View>

            <TouchableOpacity 
              style={styles.configButtonDiscrete}
              onPress={() => navigate('Configuracion', { from: 'ConfiguracionOnline' })}
            >
              <Text style={styles.configButtonDiscreteText}>⚙️ Ajustar configuración</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.startGameButton,
                connectedPlayers.length < 2 && styles.startGameButtonDisabled
              ]}
              onPress={handleIniciarJuego}
              disabled={connectedPlayers.length < 2}
            >
              <Text style={styles.actionButtonText}>🚀 COMENZAR PARTIDA</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={handleCancelar}
            >
              <Text style={styles.actionButtonText}>❌ CANCELAR</Text>
            </TouchableOpacity>
          </View>
        )}

        {userRole === 'slave' && (
          <View style={styles.waitingContainer}>
            <Text style={styles.waitingTitle}>CONECTADO A PARTIDA</Text>
            <Text style={styles.waitingSubtitle}>Organizador: {connectedPlayers[0]}</Text>
            
            <View style={styles.playersList}>
              <Text style={styles.playersListTitle}>Jugadores conectados:</Text>
              {connectedPlayers.map((player, index) => (
                <Text key={index} style={styles.playerItem}>
                  ✓ {player}
                </Text>
              ))}
            </View>
            
            <Text style={styles.warningText}>
              Esperando que el organizador inicie la partida...
            </Text>
            
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={handleCancelar}
            >
              <Text style={styles.actionButtonText}>🔌 DESCONECTAR</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
    padding: 20,
  },
  setupContainer: {
    backgroundColor: '#3D2415',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#1E88E5',
  },
  nameLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F5E6D3',
    marginBottom: 8,
  },
  nameInput: {
    borderWidth: 2,
    borderColor: '#1E88E5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: 'bold',
    backgroundColor: '#FFFFFF',
    color: '#000000',
    marginBottom: 20,
  },
  identifierInput: {
    borderWidth: 2,
    borderColor: '#1E88E5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 20,
    fontWeight: 'bold',
    backgroundColor: '#FFFFFF',
    color: '#000000',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 2,
  },
  actionButton: {
    backgroundColor: '#1E88E5',
    borderWidth: 2,
    borderColor: '#1565C0',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 12,
    alignItems: 'center',
  },
  actionButtonDisabled: {
    backgroundColor: '#666666',
    borderColor: '#555555',
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  warningText: {
    fontSize: 12,
    color: '#FFD700',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
  waitingContainer: {
    backgroundColor: '#3D2415',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#1E88E5',
  },
  waitingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F5E6D3',
    textAlign: 'center',
    marginBottom: 16,
  },
  waitingSubtitle: {
    fontSize: 14,
    color: '#F5E6D3',
    marginBottom: 8,
  },
  identifierBox: {
    backgroundColor: '#1E88E5',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#1565C0',
  },
  identifierLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  identifierValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  playersList: {
    marginTop: 12,
    marginBottom: 16,
  },
  playersListTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F5E6D3',
    marginBottom: 8,
  },
  playerItem: {
    fontSize: 14,
    color: '#F5E6D3',
    marginBottom: 4,
  },
  configButtonDiscrete: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  configButtonDiscreteText: {
    fontSize: 14,
    color: '#1E88E5',
    textDecorationLine: 'underline',
  },
  startGameButton: {
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#388E3C',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 12,
    alignItems: 'center',
  },
  startGameButtonDisabled: {
    backgroundColor: '#666666',
    borderColor: '#555555',
    opacity: 0.6,
  },
  cancelButton: {
    backgroundColor: '#D32F2F',
    borderWidth: 2,
    borderColor: '#B71C1C',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
});

export default ConfiguracionOnline;