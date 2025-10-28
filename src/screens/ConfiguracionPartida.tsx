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
  TouchableWithoutFeedback,
  Keyboard,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { getCurrentConfig, updateConfig } from '../utils/gameConfig';
import { connectionManager } from '../utils/connectionManager';



interface ConfiguracionPartidaProps {
  navigate: (screen: 'MenuPrincipal' | 'Configuracion' | 'PantallaJuego' | 'Puntuaciones' | 'ReglasJuego' | 'ConfiguracionPartida', options?: { from?: 'ConfiguracionPartida' }) => void;
  goBack: () => void;
  screenHistory?: string[];
}

const ConfiguracionPartida = ({ navigate, goBack, screenHistory = [] }: ConfiguracionPartidaProps) => {
  const config = getCurrentConfig();
  const [paperMode, setPaperMode] = useState<boolean>(config.paperMode);
  const [numberOfPlayers, setNumberOfPlayers] = useState<number>(config.numberOfPlayers);
  const [playerNames, setPlayerNames] = useState<string[]>(config.playerNames);
  const [favoritePlayers, setFavoritePlayers] = useState<string[]>(config.favoritePlayers || []);
  const [showDropdownIndex, setShowDropdownIndex] = useState<number | null>(null);
  const [clickCount, setClickCount] = useState<{ [key: number]: number }>({});
  const [isMasterDevice, setIsMasterDevice] = useState<boolean>(config.isMasterDevice);

  // Referencias para inputs de nombres de jugadores
  const inputRefs = useRef<{ [key: number]: TextInput | null }>({});
  const serverEventListenerRef = useRef<((event: any) => void) | null>(null);


  // ========== NUEVOS ESTADOS PARA MODO ONLINE ==========
  const [onlineMode, setOnlineMode] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<'none' | 'master' | 'slave'>('none');
  const [connectedPlayers, setConnectedPlayers] = useState<string[]>([]);
  const [playerName, setPlayerName] = useState<string>(config.playerNames[0] || 'Nombre');
  // =====================================================
  
  useEffect(() => {
    return () => {
      // Limpiar listener al desmontar
      if (serverEventListenerRef.current) {
        connectionManager.removeEventListener(serverEventListenerRef.current);
      }
    };
  }, []);

  // ========== FUNCIONES MODO ONLINE ==========
  const toggleOnlineMode = () => {
    const newValue = !onlineMode;
    setOnlineMode(newValue);
    
    // Si desactiva online, resetear todo
    if (!newValue) {
      setUserRole('none');
      setConnectedPlayers([]);
    }
  };

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
    await updateConfig({ isMasterDevice: true });
  };


  const handleUnirsePartida = async () => {
    // Solicitar permiso según versión de Android
    if (Platform.OS === 'android') {
      try {
        let granted;
        
        // Android 13+ usa NEARBY_WIFI_DEVICES
        if (Platform.Version >= 33) {
          granted = await PermissionsAndroid.request(
            'android.permission.NEARBY_WIFI_DEVICES' as any,
            {
              title: 'Permiso para buscar dispositivos cercanos',
              message: 'Para buscar partidas en la red WiFi local.',
              buttonPositive: 'Permitir',
              buttonNegative: 'Cancelar',
            }
          );
        } else {
          // Android 12 y anteriores usan ACCESS_FINE_LOCATION
          granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'Permiso de ubicación necesario',
              message: 'Para buscar partidas cercanas en la red WiFi necesitamos acceso a la ubicación.',
              buttonPositive: 'Permitir',
              buttonNegative: 'Cancelar',
            }
          );
        }

        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            'Permiso denegado',
            'Sin el permiso necesario no podemos buscar partidas en la red local.',
            [{ text: 'Entendido' }]
          );
          return;
        }
      } catch (error) {
        console.error('Error solicitando permiso:', error);
        Alert.alert('Error', 'No se pudo solicitar el permiso necesario.');
        return;
      }
    }
    
    // Escanear dispositivos disponibles
    const devices = await connectionManager.scanForDevices();
    
    if (devices.length === 0) {
      Alert.alert(
        'No hay partidas',
        'No se encontraron partidas activas.\n\nAsegúrate de que:\n• El organizador ha pulsado "Iniciar Partida"\n• Ambos dispositivos están en la misma red WiFi',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Si hay dispositivos, mostrar lista
    Alert.alert(
      `${devices.length} ${devices.length === 1 ? 'partida encontrada' : 'partidas encontradas'}`,
      devices.map((d, i) => `${i + 1}. ${d.name} (${d.playersCount} ${d.playersCount === 1 ? 'jugador' : 'jugadores'})`).join('\n'),
      [
        { text: 'Cancelar', style: 'cancel' },
        ...devices.map((device) => ({
          text: `Unirse a ${device.name}`,
          onPress: async () => {
            const connected = await connectionManager.connectToDevice(device.address, playerName);
            
            if (connected) {
              setUserRole('slave');
              await updateConfig({ isMasterDevice: false });
              
              // Escuchar eventos
              connectionManager.onEvent((event) => {
                if (event.type === 'PLAYERS_LIST_UPDATE') {
                  setConnectedPlayers(event.data.players);
                }
              });
              
              console.log('✅ Conectado a partida');
            } else {
              Alert.alert('Error', 'No se pudo conectar. Reintenta.', [{ text: 'OK' }]);
            }
          }
        }))
      ]
    );
  };

  const handleCancelarConexion = async () => {
    await connectionManager.disconnect();
    
    if (serverEventListenerRef.current) {
      connectionManager.removeEventListener(serverEventListenerRef.current);
      serverEventListenerRef.current = null;
    }
    
    setUserRole('none');
    setConnectedPlayers([]);
    await updateConfig({ isMasterDevice: true }); // Resetear a maestro por defecto
  };

  const handleComenzarPartida = async () => {
    const config = getCurrentConfig();
    
    // Preparar datos del juego
    const letter = 'A'; // TODO: Esto debería ser aleatorio basado en availableLetters
    const listId = config.selectedListId;
    const versionId = config.selectedVersionId;
    const listName = "Lista 1"; // TODO: Obtener nombre real de la lista
    
    // Obtener duración del timer
    const minMs = config.timerMinMinutes * 60 * 1000;
    const maxMs = config.timerMaxMinutes * 60 * 1000;
    const timerDuration = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    
    // Enviar evento GAME_START
    connectionManager.startGame({
      letter,
      listId,
      versionId,
      listName,
      timerDuration,
      paperMode: config.paperMode,
      randomMode: config.randomMode
    });
    
    // Navegar a PantallaJuego
    navigate('PantallaJuego');
  };

  // ==========================================



  const togglePaperMode = async () => {
    const newValue = !paperMode;
    setPaperMode(newValue);
    await updateConfig({ paperMode: newValue });
  };

  const addPlayer = async () => {
    if (numberOfPlayers < 6) {
      const newCount = numberOfPlayers + 1;
      const newNames = [...playerNames];
      
      while (newNames.length < newCount) {
        newNames.push(`Jugador ${newNames.length + 1}`);
      }
      
      setNumberOfPlayers(newCount);
      setPlayerNames(newNames);
      await updateConfig({ numberOfPlayers: newCount, playerNames: newNames });
    }
  };

  const removePlayer = async () => {
    if (numberOfPlayers > 1) {
      const newCount = numberOfPlayers - 1;
      const newNames = [...playerNames];
      
      newNames.length = newCount;
      
      setNumberOfPlayers(newCount);
      setPlayerNames(newNames);
      await updateConfig({ numberOfPlayers: newCount, playerNames: newNames });
    }
  };

  const handlePlayerNameChange = async (index: number, name: string) => {
    // Verificar si el nombre ya está en uso por otro jugador
    const trimmedName = name.trim();
    if (trimmedName !== '') {
      const isNameInUse = playerNames.some((existingName, idx) => 
        idx !== index && existingName.trim().toLowerCase() === trimmedName.toLowerCase()
      );
      
      if (isNameInUse) {
        Alert.alert(
          'Jugador duplicado',
          `"${trimmedName}" ya está siendo usado por otro jugador en esta partida.`,
          [{ text: 'OK' }]
        );
        return;
      }
    }
    
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
    await updateConfig({ playerNames: newNames });
  };

  const toggleFavorite = async (playerName: string) => {
    if (!playerName || playerName.trim() === '') return;
    
    const trimmedName = playerName.trim();
    
    // Si ya es favorito, mostrar información
    if (favoritePlayers.includes(trimmedName)) {
      Alert.alert(
        'Jugador Favorito',
        `"${trimmedName}" ya está en tu lista de favoritos.\n\nPara eliminarlo, ve a Configuración > Gestión de Jugadores Favoritos.`,
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Si no es favorito, añadirlo
    const newFavorites = [...favoritePlayers, trimmedName];
    setFavoritePlayers(newFavorites);
    await updateConfig({ favoritePlayers: newFavorites });
    
    Alert.alert(
      '¡Favorito Añadido!',
      `"${trimmedName}" se ha añadido a tus favoritos.`,
      [{ text: 'OK' }]
    );
  };

  const selectFavoriteForPlayer = async (playerIndex: number, favoriteName: string) => {
    // Verificar si el nombre ya está en uso por otro jugador
    const isNameInUse = playerNames.some((name, idx) => 
      idx !== playerIndex && name.trim().toLowerCase() === favoriteName.trim().toLowerCase()
    );
    
    if (isNameInUse) {
      Alert.alert(
        'Jugador duplicado',
        `"${favoriteName}" ya está siendo usado por otro jugador en esta partida.`,
        [{ text: 'OK' }]
      );
      setShowDropdownIndex(null);
      return;
    }
    
    const newNames = [...playerNames];
    newNames[playerIndex] = favoriteName;
    setPlayerNames(newNames);
    await updateConfig({ playerNames: newNames });
    
    // Cerrar dropdown y resetear clicks
    setShowDropdownIndex(null);
    setClickCount({ ...clickCount, [playerIndex]: 0 });
  };

  const isFavorite = (playerName: string): boolean => {
    if (!playerName || playerName.trim() === '') return false;
    return favoritePlayers.includes(playerName.trim());
  };

  const getAvailableFavorites = (currentIndex: number): string[] => {
    return favoritePlayers.filter(favorite => {
      // Mostrar solo favoritos que no están en uso por otros jugadores
      return !playerNames.some((name, idx) => 
        idx !== currentIndex && 
        name.trim().toLowerCase() === favorite.trim().toLowerCase()
      );
    });
  };

  const handleInputPress = (index: number) => {
    const availableFavorites = getAvailableFavorites(index);
    
    // Si no hay favoritos, comportamiento normal
    if (availableFavorites.length === 0) {
      setShowDropdownIndex(null);
      setTimeout(() => {
        inputRefs.current[index]?.focus();
      }, 50);
      return;
    }
    
    const currentClicks = clickCount[index] || 0;
    
    if (currentClicks === 0) {
      // Primer click: mostrar dropdown
      setShowDropdownIndex(index);
      setClickCount({ ...clickCount, [index]: 1 });
      Keyboard.dismiss();
    } else {
      // Segundo click: ocultar dropdown y mostrar teclado
      setShowDropdownIndex(null);
      setClickCount({ ...clickCount, [index]: 0 });
      setTimeout(() => {
        inputRefs.current[index]?.focus();
      }, 100);
    }
  };

  const handleOutsidePress = () => {
    setShowDropdownIndex(null);
    setClickCount({});
    Keyboard.dismiss();
  };

  const handleContinue = () => {
    navigate('PantallaJuego');
  };

  const toggleDeviceRole = async () => {
    const newValue = !isMasterDevice;
    setIsMasterDevice(newValue);
    await updateConfig({ isMasterDevice: newValue });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableWithoutFeedback onPress={handleOutsidePress}>
          <View>

          {/* ========== CONTENIDO MODO OFFLINE ========== */}
          {!onlineMode && (
            <>
              {/* 1. DISPOSITIVO PRINCIPAL/SECUNDARIO */}
              {numberOfPlayers > 1 && (
                <TouchableOpacity 
                  style={[
                    styles.deviceRoleButton,
                    isMasterDevice && styles.deviceRoleButtonActive
                  ]}
                  onPress={toggleDeviceRole}
                >
                  <Text style={styles.deviceRoleIcon}>📱</Text>
                  <Text style={[
                    styles.deviceRoleText,
                    isMasterDevice && styles.deviceRoleTextActive
                  ]}>
                    {isMasterDevice ? 'DISPOSITIVO PRINCIPAL ✓' : 'DISPOSITIVO SECUNDARIO'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* 2. JUGADORES */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>JUGADORES</Text>
                
                <View style={styles.playerCountRow}>
                  <TouchableOpacity 
                    style={[styles.playerButton, numberOfPlayers <= 1 && styles.disabledButton]}
                    onPress={removePlayer}
                    disabled={numberOfPlayers <= 1}
                  >
                    <Text style={styles.playerButtonText}>-</Text>
                  </TouchableOpacity>
                  
                  <Text style={styles.playerCount}>
                    {numberOfPlayers === 1 ? '1 JUGADOR' : `${numberOfPlayers} JUGADORES`}
                  </Text>
                  
                  <TouchableOpacity 
                    style={[styles.playerButton, numberOfPlayers >= 6 && styles.disabledButton]}
                    onPress={addPlayer}
                    disabled={numberOfPlayers >= 6}
                  >
                    <Text style={styles.playerButtonText}>+</Text>
                  </TouchableOpacity>
                </View>

                {playerNames.slice(0, numberOfPlayers).map((name, index) => {
                  const availableFavorites = getAvailableFavorites(index);
                  const showDropdown = showDropdownIndex === index && availableFavorites.length > 0;
                  
                  return (
                    <View key={index} style={styles.nameInputContainer}>
                      <View style={styles.nameHeaderRow}>
                        <Text style={styles.nameLabel}>
                          {numberOfPlayers === 1 ? 'TU NOMBRE:' : 
                          index === 0 ? 'TU NOMBRE:' : `JUGADOR ${index + 1}:`}
                        </Text>
                        
                        <TouchableOpacity
                          style={styles.favoriteButton}
                          onPress={() => toggleFavorite(name)}
                          disabled={!name || name.trim() === ''}
                        >
                          <Text style={styles.favoriteIcon}>
                            {isFavorite(name) ? '⭐' : '☆'}
                          </Text>
                        </TouchableOpacity>
                      </View>                    
                      <View style={styles.inputWrapper}>
                        <TextInput
                          ref={(ref) => inputRefs.current[index] = ref}
                          style={styles.nameInput}
                          value={name}
                          onChangeText={(text) => handlePlayerNameChange(index, text)}
                          onFocus={() => handleInputPress(index)}
                          placeholder={index === 0 ? 'Introduce tu nombre' : `Jugador ${index + 1}`}
                          placeholderTextColor="#999"
                        />
                        
                        {showDropdown && (
                          <View style={styles.dropdown}>
                            <View style={styles.dropdownContent}>
                              {availableFavorites.map((favorite, idx) => (
                                <TouchableOpacity
                                  key={idx}
                                  style={styles.dropdownItem}
                                  onPress={() => selectFavoriteForPlayer(index, favorite)}
                                >
                                  <Text style={styles.dropdownItemIcon}>⭐</Text>
                                  <Text style={styles.dropdownItemText}>{favorite}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* 3. MODO PAPEL Y BOLI */}
              <TouchableOpacity 
                style={[
                  styles.paperModeButton,
                  paperMode && styles.paperModeButtonActive
                ]}
                onPress={togglePaperMode}
              >
                <Text style={styles.paperModeIcon}>📝</Text>
                <Text style={[
                  styles.paperModeText,
                  paperMode && styles.paperModeTextActive
                ]}>
                  MODO PAPEL Y BOLI  {paperMode && '✓'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* 4. CONECTAR DISPOSITIVOS */}
          <TouchableOpacity 
            style={[
              styles.onlineModeButton,
              onlineMode && styles.onlineModeButtonActive
            ]}
            onPress={toggleOnlineMode}
            disabled={userRole !== 'none'}
          >
            <Text style={styles.onlineModeIcon}>📡</Text>
            <Text style={[
              styles.onlineModeText,
              onlineMode && styles.onlineModeTextActive
            ]}>
              CONECTAR DISPOSITIVOS {onlineMode && '✓'}
            </Text>
          </TouchableOpacity>

          {/* ========== CONTENIDO MODO ONLINE ========== */}
          {onlineMode && userRole === 'none' && (
            <View style={styles.onlineContentContainer}>
              <Text style={styles.conectionNameLabel}>TU NOMBRE PARA CONEXIÓN:</Text>
              <TextInput
                style={styles.conectionNameInput}
                value={playerName}
                onChangeText={setPlayerName}
                placeholder="Nombre"
                placeholderTextColor="#999"
              />
              
              <TouchableOpacity 
                style={styles.onlineActionButton}
                onPress={handleIniciarPartida}
              >
                <Text style={styles.onlineActionButtonText}>🎮 INICIAR PARTIDA</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.onlineActionButton}
                onPress={handleUnirsePartida}
              >
                <Text style={styles.onlineActionButtonText}>📱 UNIRME A PARTIDA</Text>
              </TouchableOpacity>
              
              <Text style={styles.warningText}>
                📡 Asegúrate de estar en la misma red WiFi que los demás jugadores
              </Text>
            </View>
          )}

          {/* ========== MAESTRO ESPERANDO JUGADORES ========== */}
          {onlineMode && userRole === 'master' && (
            <View style={styles.waitingContainer}>
              <Text style={styles.waitingTitle}>ESPERANDO JUGADORES...</Text>
              <Text style={styles.waitingSubtitle}>Tu nombre: {playerName}</Text>
              <Text style={styles.waitingSubtitle}>IP: {connectionManager.getServerIp()}</Text>
              
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
                onPress={() => navigate('Configuracion', { from: 'ConfiguracionPartida' })}
              >
                <Text style={styles.configButtonDiscreteText}>⚙️ Ajustar configuración</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.startGameButton,
                  connectedPlayers.length < 2 && styles.startGameButtonDisabled
                ]}
                onPress={handleComenzarPartida}
                disabled={connectedPlayers.length < 2}
              >
                <Text style={styles.onlineActionButtonText}>🚀 COMENZAR PARTIDA</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={handleCancelarConexion}
              >
                <Text style={styles.onlineActionButtonText}>❌ CANCELAR</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ========== ESCLAVO CONECTADO ========== */}
          {onlineMode && userRole === 'slave' && (
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
                onPress={handleCancelarConexion}
              >
                <Text style={styles.onlineActionButtonText}>🔌 DESCONECTAR</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 5. CONTINUAR - solo visible en modo offline */}
          {!onlineMode && (
            <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
              <Text style={styles.continueButtonText}>CONTINUAR</Text>
            </TouchableOpacity>
          )}

          </View>
        </TouchableWithoutFeedback>
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
  section: {
    backgroundColor: '#3D2415',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#D2691E',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F5E6D3',
    textAlign: 'center',
    marginBottom: 16,
  },
  paperModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5A3825',
    borderWidth: 2,
    borderColor: '#8B6F47',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  paperModeButtonActive: {
    backgroundColor: '#D2691E',
    borderColor: '#D2691E',
  },
  paperModeIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  paperModeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F5E6D3',
  },
  paperModeTextActive: {
    color: '#FFFFFF',
  },
  playerCountRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  playerButton: {
    backgroundColor: '#8B0000',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
  },
  disabledButton: {
    backgroundColor: '#555',
  },
  playerButtonText: {
    color: '#FFFFFF', 
    fontSize: 24,
    fontWeight: 'bold',
  },
  playerCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F5E6D3',
  },
  nameInputContainer: {
    marginBottom: 16,
  },
  nameHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  nameLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F5E6D3',
  },
  favoriteButton: {
    padding: 4,
  },
  favoriteIcon: {
    fontSize: 24,
  },
  inputWrapper: {
    position: 'relative',
  },
  nameInput: {
    borderWidth: 2,
    borderColor: '#D2691E',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: 'bold',
    backgroundColor: '#FFFFFF',
    color: '#000000',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  dropdownContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D2691E',
    marginTop: 4,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  dropdownItemIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  dropdownItemText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  continueButton: {
    backgroundColor: '#8B0000',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  deviceRoleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5A3825',
    borderWidth: 2,
    borderColor: '#8B6F47',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  deviceRoleButtonActive: {
    backgroundColor: '#D2691E',
    borderColor: '#D2691E',
  },
  deviceRoleIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  deviceRoleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F5E6D3',
  },
  deviceRoleTextActive: {
    color: '#FFFFFF',
  },
  // ========== ESTILOS MODO ONLINE ==========
    onlineModeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#5A3825',
      borderWidth: 2,
      borderColor: '#8B6F47',
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 20,
      marginBottom: 20,
    },
    onlineModeButtonActive: {
      backgroundColor: '#1E88E5', // Azul para "online"
      borderColor: '#1E88E5',
    },
    onlineModeIcon: {
      fontSize: 24,
      marginRight: 12,
    },
    onlineModeText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#F5E6D3',
    },
    onlineModeTextActive: {
      color: '#FFFFFF',
    },
    onlineContentContainer: {
      backgroundColor: '#3D2415',
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      borderWidth: 2,
      borderColor: '#1E88E5',
    },
    conectionNameLabel: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#F5E6D3',
      marginBottom: 8,
    },
    conectionNameInput: {
      borderWidth: 2,
      borderColor: '#1E88E5',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      fontWeight: 'bold',
      backgroundColor: '#FFFFFF',
      color: '#000000',
      marginBottom: 16,
    },
    onlineActionButton: {
      backgroundColor: '#1E88E5',
      borderWidth: 2,
      borderColor: '#1565C0',
      borderRadius: 8,
      paddingVertical: 14,
      paddingHorizontal: 20,
      marginBottom: 12,
      alignItems: 'center',
    },
    onlineActionButtonText: {
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
      marginBottom: 20,
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
    // =========================================
});

export default ConfiguracionPartida;