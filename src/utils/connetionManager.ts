// Gestor de conexiones Bluetooth para modo multijugador

import RNBluetoothClassic, {
  BluetoothDevice,
  BluetoothEventSubscription,
} from 'react-native-bluetooth-classic';
import { Platform, PermissionsAndroid } from 'react-native';

// ========== TIPOS DE EVENTOS ==========
export type GameEvent = 
  // 1. Esclavo se une
  | {
      type: 'PLAYER_JOINED';
      data: {
        playerName: string;
      };
    }
  
  // 2. Maestro actualiza lista de jugadores conectados
  | {
      type: 'PLAYERS_LIST_UPDATE';
      data: {
        players: string[];
      };
    }
  
  // 3. Maestro notifica que alguien se desconectó
  | {
      type: 'PLAYER_LEFT';
      data: {
        playerName: string;
      };
    }
  
  // 4. Maestro actualiza configuración mientras espera
  | {
      type: 'GAME_CONFIG_UPDATE';
      data: {
        paperMode: boolean;
      };
    }
  
  // 5. Maestro inicia la partida
  | {
      type: 'GAME_START';
      data: {
        letter: string;
        listId: number;
        versionId: string;
        listName: string;
        categories?: string[];
        timerDuration: number;
        timestamp: number;
        paperMode: boolean;
        randomMode: boolean;
      };
    }
  
  // 6. Maestro notifica que el tiempo terminó
  | {
      type: 'TIMER_END';
      data: {};
    }
  
  // 7. Esclavo envía su puntuación al maestro
  | {
      type: 'SCORE_SUBMIT';
      data: {
        playerName: string;
        score: number;
        answers: string[];
      };
    }
  
  // 8. Maestro envía todas las puntuaciones a todos
  | {
      type: 'ALL_SCORES';
      data: {
        scores: Array<{
          playerName: string;
          score: number;
          answers: string[];
        }>;
      };
    }
  
  // 9. Maestro confirma recepción de puntuación
  | {
      type: 'SCORE_ACK';
      data: {
        playerName: string;
      };
    };

type EventCallback = (event: GameEvent) => void;

class ConnectionManager {
  private isServer: boolean = false;
  private connectedDevices: BluetoothDevice[] = [];
  private gameState: 'waiting' | 'playing' | 'scoring' = 'waiting';
  private pendingReconnections: string[] = [];
  private connectedPlayers: Map<string, BluetoothDevice | null> = new Map();
  private submittedScores: Map<string, { score: number; answers: string[] }> = new Map();
  private eventCallbacks: EventCallback[] = [];
  private readSubscriptions: Map<string, BluetoothEventSubscription> = new Map();
  private myName: string = '';

  // ========== PERMISOS ==========
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const apiLevel = Platform.Version;
      
      if (apiLevel >= 31) {
        // Android 12+
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        ]);
        
        return (
          granted['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED
        );
      } else {
        // Android 6-11
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
        );
        
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }

  // ========== SERVIDOR (MAESTRO) ==========
  async startServer(playerName: string): Promise<boolean> {
    try {
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        throw new Error('Permisos Bluetooth denegados');
      }

      this.isServer = true;
      this.myName = playerName;
      this.gameState = 'waiting';
      
      // Añadirse a sí mismo como primer jugador
      this.connectedPlayers.set(playerName, null);
      
      const enabled = await RNBluetoothClassic.isBluetoothEnabled();
      if (!enabled) {
        await RNBluetoothClassic.requestBluetoothEnabled();
      }

      console.log('✅ Servidor iniciado:', playerName);
      return true;
    } catch (error) {
      console.error('❌ Error al iniciar servidor:', error);
      return false;
    }
  }

  // ========== CLIENTE (ESCLAVO) ==========
  async scanForDevices(): Promise<Array<{ name: string; address: string; playersCount: number }>> {
    try {
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        throw new Error('Permisos Bluetooth denegados');
      }

      const enabled = await RNBluetoothClassic.isBluetoothEnabled();
      if (!enabled) {
        await RNBluetoothClassic.requestBluetoothEnabled();
      }

      // Escanear dispositivos disponibles
      const unpaired = await RNBluetoothClassic.startDiscovery();
      const paired = await RNBluetoothClassic.getBondedDevices();
      
      const allDevices = [...paired, ...unpaired];
      
      // Filtrar solo dispositivos con nombre "Scattergories"
      const scattergoriesDevices = allDevices
        .filter(device => device.name && device.name.includes('Scattergories'))
        .map(device => ({
          name: device.name || 'Desconocido',
          address: device.address,
          playersCount: 1, // TODO: Obtener del dispositivo real
        }));

      console.log('📱 Dispositivos encontrados:', scattergoriesDevices.length);
      return scattergoriesDevices;
    } catch (error) {
      console.error('❌ Error al escanear:', error);
      return [];
    }
  }

  async connectToDevice(address: string, playerName: string): Promise<boolean> {
    try {
      const device = await RNBluetoothClassic.connectToDevice(address);
      
      if (device) {
        this.connectedDevices.push(device);
        this.connectedPlayers.set(playerName, device);
        this.myName = playerName;
        this.isServer = false;
        
        // Empezar a escuchar mensajes
        this.startListeningForMessages(device, playerName);
        
        // Enviar evento de JOIN
        this.sendEvent({
          type: 'PLAYER_JOINED',
          data: { playerName }
        });
        
        console.log('✅ Conectado a:', device.name);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error al conectar:', error);
      return false;
    }
  }

  // ========== MANEJO DE EVENTOS RECIBIDOS ==========
  private startListeningForMessages(device: BluetoothDevice, playerName: string) {
    const subscription = device.onDataReceived((data) => {
      try {
        const message = data.data;
        const event: GameEvent = JSON.parse(message);
        
        console.log('📩 Mensaje recibido:', event.type);
        
        // Procesar evento según tipo
        this.handleReceivedEvent(event, playerName, device);
        
        // Notificar a todos los callbacks
        this.eventCallbacks.forEach(callback => callback(event));
      } catch (error) {
        console.error('❌ Error al procesar mensaje:', error);
      }
    });
    
    this.readSubscriptions.set(playerName, subscription);
  }

  private handleReceivedEvent(event: GameEvent, senderName: string, senderDevice: BluetoothDevice) {
    // Si soy servidor
    if (this.isServer) {
      switch (event.type) {
        case 'PLAYER_JOINED':
          this.handlePlayerJoined(event.data.playerName, senderDevice);
          break;
          
        case 'SCORE_SUBMIT':
          this.handleScoreSubmit(event.data);
          break;
      }
    }
    
    // Si soy cliente
    if (!this.isServer) {
      switch (event.type) {
        case 'GAME_START':
          this.gameState = 'playing';
          break;
          
        case 'TIMER_END':
          this.gameState = 'scoring';
          break;
          
        case 'ALL_SCORES':
          this.gameState = 'waiting'; // Volver a waiting tras recibir puntuaciones
          break;
      }
    }
  }

  private handlePlayerJoined(playerName: string, device: BluetoothDevice) {
    // Si el juego está en waiting, añadir directamente
    if (this.gameState === 'waiting') {
      this.connectedDevices.push(device);
      this.connectedPlayers.set(playerName, device);
      
      // Empezar a escuchar mensajes de este jugador
      this.startListeningForMessages(device, playerName);
      
      // Enviar lista actualizada a todos
      this.broadcastPlayersList();
      
      console.log('✅ Jugador añadido:', playerName);
    } else {
      // Si está jugando o puntuando, guardar en cola
      if (!this.pendingReconnections.includes(playerName)) {
        this.pendingReconnections.push(playerName);
        console.log('⏳ Reconexión pendiente:', playerName);
      }
    }
  }

  private handleScoreSubmit(data: { playerName: string; score: number; answers: string[] }) {
    // Guardar puntuación
    this.submittedScores.set(data.playerName, {
      score: data.score,
      answers: data.answers
    });
    
    // Enviar ACK
    this.sendEventToPlayer(data.playerName, {
      type: 'SCORE_ACK',
      data: { playerName: data.playerName }
    });
    
    console.log('✅ Puntuación recibida de:', data.playerName);
    
    // Si ya tenemos todas las puntuaciones, enviar ALL_SCORES
    if (this.submittedScores.size === this.connectedPlayers.size) {
      this.sendAllScores();
    }
  }

  private sendAllScores() {
    const scores = Array.from(this.submittedScores.entries()).map(([playerName, data]) => ({
      playerName,
      score: data.score,
      answers: data.answers
    }));
    
    this.sendEvent({
      type: 'ALL_SCORES',
      data: { scores }
    });
    
    // Limpiar puntuaciones
    this.submittedScores.clear();
    
    // Cambiar a waiting y procesar reconexiones pendientes
    this.gameState = 'waiting';
    this.processPendingReconnections();
    
    console.log('✅ Todas las puntuaciones enviadas');
  }

  private processPendingReconnections() {
    if (this.pendingReconnections.length > 0) {
      console.log('✅ Procesando reconexiones pendientes:', this.pendingReconnections);
      
      // TODO: Implementar lógica de reconexión real cuando tengamos servidor completo
      // Por ahora solo limpiamos la cola
      this.pendingReconnections = [];
      
      // Actualizar lista de jugadores
      this.broadcastPlayersList();
    }
  }

  // ========== ENVÍO DE MENSAJES ==========
  sendEvent(event: GameEvent) {
    const message = JSON.stringify(event);
    
    this.connectedDevices.forEach(async (device) => {
      try {
        await device.write(message);
        console.log('📤 Evento enviado:', event.type, 'a', device.name);
      } catch (error) {
        console.error('❌ Error al enviar a', device.name, error);
      }
    });
  }

  private sendEventToPlayer(playerName: string, event: GameEvent) {
    const device = this.connectedPlayers.get(playerName);
    if (device && device !== null) {
      const message = JSON.stringify(event);
      device.write(message).catch(error => {
        console.error('❌ Error al enviar a', playerName, error);
      });
    }
  }

  private broadcastPlayersList() {
    const players = Array.from(this.connectedPlayers.keys());
    this.sendEvent({
      type: 'PLAYERS_LIST_UPDATE',
      data: { players }
    });
  }

  // ========== FUNCIONES PÚBLICAS PARA UI ==========
  updateGameState(state: 'waiting' | 'playing' | 'scoring') {
    this.gameState = state;
    console.log('🎮 Estado del juego:', state);
  }

  notifyConfigUpdate(paperMode: boolean) {
    if (this.isServer) {
      this.sendEvent({
        type: 'GAME_CONFIG_UPDATE',
        data: { paperMode }
      });
    }
  }

  startGame(gameData: {
    letter: string;
    listId: number;
    versionId: string;
    listName: string;
    categories?: string[];
    timerDuration: number;
    paperMode: boolean;
    randomMode: boolean;
  }) {
    if (this.isServer) {
      this.gameState = 'playing';
      this.sendEvent({
        type: 'GAME_START',
        data: {
          ...gameData,
          timestamp: Date.now()
        }
      });
    }
  }

  endTimer() {
    if (this.isServer) {
      this.gameState = 'scoring';
      this.sendEvent({
        type: 'TIMER_END',
        data: {}
      });
    }
  }

  submitScore(playerName: string, score: number, answers: string[]) {
    // Si soy servidor, guardar directamente
    if (this.isServer) {
      this.handleScoreSubmit({ playerName, score, answers });
    } else {
      // Si soy cliente, enviar al servidor
      this.sendEvent({
        type: 'SCORE_SUBMIT',
        data: { playerName, score, answers }
      });
    }
  }

  // ========== CALLBACKS ==========
  onEvent(callback: EventCallback) {
    this.eventCallbacks.push(callback);
  }

  removeEventListener(callback: EventCallback) {
    this.eventCallbacks = this.eventCallbacks.filter(cb => cb !== callback);
  }

  // ========== DESCONEXIÓN ==========
  async disconnect() {
    try {
      // Cancelar todas las subscripciones
      this.readSubscriptions.forEach(sub => sub.remove());
      this.readSubscriptions.clear();

      // Desconectar todos los dispositivos
      for (const device of this.connectedDevices) {
        await device.disconnect();
        console.log('🔌 Desconectado de:', device.name);
      }

      this.connectedDevices = [];
      this.connectedPlayers.clear();
      this.isServer = false;
      this.gameState = 'waiting';
      this.pendingReconnections = [];
      this.submittedScores.clear();
      this.eventCallbacks = [];
      
      console.log('✅ Desconexión completa');
    } catch (error) {
      console.error('❌ Error al desconectar:', error);
    }
  }

  // ========== GETTERS ==========
  getConnectedPlayers(): string[] {
    return Array.from(this.connectedPlayers.keys());
  }

  isConnected(): boolean {
    return this.connectedPlayers.size > 0;
  }

  getRole(): 'server' | 'client' | 'none' {
    if (this.connectedPlayers.size === 0) return 'none';
    return this.isServer ? 'server' : 'client';
  }

  getGameState(): 'waiting' | 'playing' | 'scoring' {
    return this.gameState;
  }
}

// Singleton
export const connectionManager = new ConnectionManager(); 