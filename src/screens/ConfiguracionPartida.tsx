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
} from 'react-native';
import { getCurrentConfig, updateConfig } from '../utils/gameConfig';
import { connectionManager } from '../utils/connectionManager';
import RNBluetoothClassic from 'react-native-bluetooth-classic';



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


  // ========== NUEVOS ESTADOS PARA MODO ONLINE ==========
  const [onlineMode, setOnlineMode] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<'none' | 'master' | 'slave'>('none');
  const [connectedPlayers, setConnectedPlayers] = useState<string[]>([]);
  const [bluetoothName, setBluetoothName] = useState<string>(config.playerNames[0] || 'Nombre');
  // 🔧 NUEVOS ESTADOS PARA LISTA DE PARTIDAS DISPONIBLES
  const [isScanning, setIsScanning] = useState(false);
  const [foundDevices, setFoundDevices] = useState<Array<{ name: string; address: string; playersCount: number }>>([]);

  // =====================================================
  
  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      // Si salimos de la pantalla, desconectar
      if (userRole !== 'none') {
        connectionManager.disconnect();
      }
    };
  }, [userRole]);

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

  // 🔧 CORREGIDO: Servidor se anuncia con nombre ScattergoriesHost_ + nombre
  const handleInitiarPartida = async () => {
    try {
      // Cambiar temporalmente el nombre Bluetooth del host
      const hostName = `ScattergoriesHost_${bluetoothName}`;
      console.log('📡 Estableciendo nombre Bluetooth:', hostName);
      await (RNBluetoothClassic as any).setAdapterName?.(hostName);

      // Escuchar eventos de conexión ANTES de iniciar el servidor
      connectionManager.onEvent((event) => {
        if (event.type === 'PLAYERS_LIST_UPDATE') {
          console.log('📡 Lista de jugadores actualizada:', event.data.players);
          setConnectedPlayers(event.data.players);
        }
      });

      const success = await connectionManager.startServer(hostName);

      if (success) {
        setUserRole('master');
        setConnectedPlayers([bluetoothName]);
        setOnlineMode(true);
        await updateConfig({ isMasterDevice: true });
        console.log('✅ Servidor iniciado como', hostName);
      } else {
        Alert.alert(
          'Error',
          'No se pudieron obtener permisos de Bluetooth o activar Bluetooth.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ Error iniciando partida:', error);
    }
  };


  // 🔧 NUEVA FUNCIÓN - lobby visual con filtro de hosts activos
  const handleUnirsePartida = async () => {
    if (userRole !== 'none') {
      console.log('🔒 Ya conectado, se ignora nueva búsqueda.');
      return;
    }

    setIsScanning(true);
    setFoundDevices([]); // limpiar lista previa

    const devices = await connectionManager.scanForDevices();

    // 🔧 Mostrar solo partidas: nombres que empiecen con ScattergoriesHost_
    const filtered = devices.filter(d => {
      if (!d.name) return false;
      const n = d.name.toLowerCase();
      return (
        n.startsWith('scattergorieshost_') ||  // nuevo formato
        n.includes('pixel') ||                 // teléfonos Pixel
        n.includes('galaxy') ||                // teléfonos Samsung
        n.includes('scattergories')            // cualquier otro nombre que contenga la palabra
      );
    });


    console.log(`🔍 Encontradas ${filtered.length} partidas activas.`);
    setFoundDevices(filtered);

    if (filtered.length === 0) {
      Alert.alert(
        'No se encontraron partidas',
        'Asegúrate de que el organizador ha iniciado la partida y de que tu Bluetooth está activado.',
        [{ text: 'OK', onPress: () => setIsScanning(false) }]
      );
    }
  };

  const handleDeviceSelect = async (device: { name: string; address: string }) => {
    console.log('🔗 Intentando conexión con', device.name);
    setIsScanning(false);

    const connected = await connectionManager.connectToDevice(device.address, bluetoothName);

    if (connected) {
      setUserRole('slave');
      setOnlineMode(true);
      await updateConfig({ isMasterDevice: false });

      connectionManager.onEvent((event) => {
        if (event.type === 'PLAYERS_LIST_UPDATE') {
          console.log('📡 Lista de jugadores actualizada (cliente):', event.data.players);
          setConnectedPlayers(event.data.players);
        }
      });

      console.log('✅ Conectado a partida con', device.name);
    } else {
      Alert.alert('Error', 'No se pudo conectar al dispositivo.', [
        { text: 'OK', onPress: () => setIsScanning(true) },
      ]);
    }
  };


  const handleCancelarConexion = async () => {
    await connectionManager.disconnect();
    setUserRole('none');
    setConnectedPlayers([]);
  };

  const handleDesconectar = async () => {
    await connectionManager.disconnect();
    setUserRole('none');
    setConnectedPlayers([]);
  };

  const handleComenzarPartida = () => {
    const config = getCurrentConfig();
    
    // Preparar datos del juego
    const gameData = {
      letter: 'A', // TODO: Obtener letra aleatoria
      listId: config.selectedListId || 1,
      versionId: config.selectedVersionId,
      listName: 'Lista 1', // TODO: Obtener nombre real de la lista
      categories: config.randomMode ? [] : undefined, // TODO: Si randomMode, enviar categorías
      timerDuration: 180000, // TODO: Obtener de config
      paperMode: paperMode,
      randomMode: config.randomMode,
    };
    
    // Enviar evento GAME_START a todos
    connectionManager.startGame(gameData);
    
    // Ir a PantallaJuego
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
                    
          {/* ========== TOGGLE CONECTAR DISPOSITIVOS ========== */}
          <TouchableOpacity 
            style={[
              styles.onlineModeButton,
              onlineMode && styles.onlineModeButtonActive
            ]}
            onPress={toggleOnlineMode}
            disabled={userRole !== 'none'} // Bloquear si ya está en un rol
          >
            <Text style={styles.onlineModeIcon}>📡</Text>
            <Text style={[
              styles.onlineModeText,
              onlineMode && styles.onlineModeTextActive
            ]}>
              CONECTAR DISPOSITIVOS {onlineMode && '✓'}
            </Text>
          </TouchableOpacity>

            {/* ========== MODO PAPEL Y BOLI (condicional) ========== */}
            {(!onlineMode || userRole === 'master') && (
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
            )}

{/* ========== CONTENIDO MODO OFFLINE ========== */}
{!onlineMode && (
  <>
    {/* Jugadores */}
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
  </>
)}

{/* ========== CONTENIDO MODO ONLINE ========== */}
{onlineMode && userRole === 'none' && (
  <View style={styles.onlineContentContainer}>
    <Text style={styles.bluetoothNameLabel}>TU NOMBRE PARA CONEXIÓN:</Text>
    <TextInput
      style={styles.bluetoothNameInput}
      value={bluetoothName}
      onChangeText={setBluetoothName}
      placeholder="Nombre"
      placeholderTextColor="#999"
    />
    
    <TouchableOpacity 
      style={styles.onlineActionButton}
      onPress={handleInitiarPartida}
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
      ⚠️ La lista de jugadores se configurará automáticamente al conectar
    </Text>
  </View>
)}

{/* ========== MAESTRO ESPERANDO JUGADORES ========== */}
{onlineMode && userRole === 'master' && (
  <View style={styles.waitingContainer}>
    <Text style={styles.waitingTitle}>ESPERANDO JUGADORES...</Text>
    <Text style={styles.waitingSubtitle}>Tu nombre: {bluetoothName}</Text>
    
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
      onPress={handleDesconectar}
    >
      <Text style={styles.onlineActionButtonText}>🔌 DESCONECTAR</Text>
    </TouchableOpacity>
  </View>
)}

{/* Botón CONTINUAR solo visible en modo offline */}
{!onlineMode && (
  <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
    <Text style={styles.continueButtonText}>CONTINUAR</Text>
  </TouchableOpacity>
)}
{/* 🔧 LOBBY DE PARTIDAS DISPONIBLES */}
{isScanning && (
  <View style={styles.deviceListContainer}>
    <Text style={styles.deviceListTitle}>PARTIDAS DISPONIBLES</Text>

    <ScrollView style={styles.deviceList}>
      {foundDevices.length === 0 ? (
        <Text style={styles.deviceItemEmpty}>Buscando dispositivos...</Text>
      ) : (
        foundDevices.map((device) => (
          <TouchableOpacity
            key={device.address}
            style={styles.deviceItem}
            onPress={() => handleDeviceSelect(device)}
          >
            <Text style={styles.deviceName}>
              🎮 {device.name.replace('ScattergoriesHost_', '')}
            </Text>
            <Text style={styles.deviceSub}>{device.address}</Text>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>

    <View style={styles.deviceActions}>
      <TouchableOpacity
        style={[styles.deviceButton, styles.deviceButtonRetry]}
        onPress={handleUnirsePartida}
      >
        <Text style={styles.deviceButtonText}>🔄 Reintentar</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.deviceButton, styles.deviceButtonCancel]}
        onPress={() => setIsScanning(false)}
      >
        <Text style={styles.deviceButtonText}>❌ Cancelar</Text>
      </TouchableOpacity>
    </View>
  </View>
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
    bluetoothNameLabel: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#F5E6D3',
      marginBottom: 8,
    },
    bluetoothNameInput: {
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
    // 🔧 NUEVOS ESTILOS PARA LOBBY DE PARTIDAS
deviceListContainer: {
  backgroundColor: '#2C1810',
  borderRadius: 12,
  padding: 20,
  marginBottom: 20,
  borderWidth: 2,
  borderColor: '#1E88E5',
},
deviceListTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#F5E6D3',
  textAlign: 'center',
  marginBottom: 12,
},
deviceList: {
  maxHeight: 250,
  marginBottom: 16,
},
deviceItem: {
  backgroundColor: '#3D2415',
  borderWidth: 1,
  borderColor: '#8B6F47',
  borderRadius: 8,
  padding: 12,
  marginBottom: 8,
},
deviceName: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#F5E6D3',
},
deviceSub: {
  fontSize: 12,
  color: '#CCC',
},
deviceItemEmpty: {
  textAlign: 'center',
  color: '#AAA',
  fontStyle: 'italic',
  paddingVertical: 20,
},
deviceActions: {
  flexDirection: 'row',
  justifyContent: 'space-around',
},
deviceButton: {
  paddingVertical: 10,
  paddingHorizontal: 20,
  borderRadius: 8,
  alignItems: 'center',
  flex: 1,
  marginHorizontal: 4,
},
deviceButtonRetry: {
  backgroundColor: '#1E88E5',
},
deviceButtonCancel: {
  backgroundColor: '#8B0000',
},
deviceButtonText: {
  color: '#FFF',
  fontWeight: 'bold',
  textAlign: 'center',
},

});

export default ConfiguracionPartida;