// Gestor de conexiones Bluetooth para modo multijugador

import RNBluetoothClassic, {
  BluetoothDevice,
  BluetoothEventSubscription,
} from 'react-native-bluetooth-classic';
import { Platform, PermissionsAndroid } from 'react-native';

// ========== TIPOS DE EVENTOS ==========
export type GameEvent =
  | {
      type: 'PLAYER_JOINED';
      data: { playerName: string };
    }
  | {
      type: 'PLAYERS_LIST_UPDATE';
      data: { players: string[] };
    }
  | {
      type: 'PLAYER_LEFT';
      data: { playerName: string };
    }
  | {
      type: 'GAME_CONFIG_UPDATE';
      data: { paperMode: boolean };
    }
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
  | {
      type: 'TIMER_END';
      data: {};
    }
  | {
      type: 'SCORE_SUBMIT';
      data: { playerName: string; score: number; answers: string[] };
    }
  | {
      type: 'ALL_SCORES';
      data: {
        scores: Array<{ playerName: string; score: number; answers: string[] }>;
      };
    }
  | {
      type: 'SCORE_ACK';
      data: { playerName: string };
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

  // 🔧 Control interno
  private acceptLoopActive: boolean = false;
  private connectedAddresses: Set<string> = new Set();

  private sleep(ms: number) {
    return new Promise(res => setTimeout(res, ms));
  }

  // ========== PERMISOS ==========
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      const apiLevel = Platform.Version;

      if (apiLevel >= 31) {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        ]);
        return (
          granted['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED
        );
      } else {
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
      if (!hasPermissions) throw new Error('Permisos Bluetooth denegados');

      this.isServer = true;
      this.myName = playerName;
      this.gameState = 'waiting';

      this.connectedPlayers.set(playerName, null);

      const enabled = await RNBluetoothClassic.isBluetoothEnabled();
      if (!enabled) await RNBluetoothClassic.requestBluetoothEnabled();

      console.log('✅ Servidor iniciado:', playerName);

      // Iniciar bucle de aceptación
      this.startAcceptLoop();
      return true;
    } catch (error) {
      console.error('❌ Error al iniciar servidor:', error);
      return false;
    }
  }

  // 🔧 Bucle de aceptación secuencial
private async startAcceptLoop() {
  if (this.acceptLoopActive || !this.isServer) return;

  this.acceptLoopActive = true;
  console.log('🔧 Iniciando accept único...');

  try {
    const alreadyAccepting = await (RNBluetoothClassic as any).isAccepting?.();
    if (alreadyAccepting) {
      console.log('⚠️ Ya se estaba aceptando una conexión, no se inicia otra.');
      return;
    }

    console.log('🔊 Esperando una conexión entrante...');
    const device: BluetoothDevice = await (RNBluetoothClassic as any).accept?.({
      delimiter: '\n',
    });

    if (device) {
      if (!this.connectedAddresses.has(device.address)) {
        this.connectedAddresses.add(device.address);
        this.connectedDevices.push(device);
        this.startListeningForMessages(device, `__pending_${device.address}`);
        console.log('✅ Cliente conectado (accept único):', device.name || device.address);
      } else {
        console.log('⚠️ Cliente ya conectado:', device.address);
      }
    } else {
      console.log('⏸ No se recibió ninguna conexión entrante.');
    }
  } catch (error) {
    console.error('❌ Error en accept único:', error);
  } finally {
    this.acceptLoopActive = false;
    console.log('🛑 Finalizó accept único.');
  }
}


  // ========== CLIENTE (ESCLAVO) ==========
  async scanForDevices(): Promise<Array<{ name: string; address: string; playersCount: number }>> {
    try {
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) throw new Error('Permisos Bluetooth denegados');

      const enabled = await RNBluetoothClassic.isBluetoothEnabled();
      if (!enabled) await RNBluetoothClassic.requestBluetoothEnabled();

      const paired = await RNBluetoothClassic.getBondedDevices();
      let unpaired: BluetoothDevice[] = [];

      try {
        unpaired = await RNBluetoothClassic.startDiscovery();
      } catch {
        console.warn('⚠️ No se pudieron descubrir nuevos dispositivos, usando solo emparejados');
      }

      const allDevices = [...paired, ...unpaired];
      const devices = allDevices.map(device => ({
        name: device.name || device.address,
        address: device.address,
        playersCount: 1,
      }));

      console.log('📱 Dispositivos encontrados:', devices.length);
      return devices;
    } catch (error) {
      console.error('❌ Error al escanear:', error);
      return [];
    }
  }

  async connectToDevice(address: string, playerName: string): Promise<boolean> {
    try {
      if (this.connectedAddresses.has(address)) {
        console.log('⚠️ Ya había conexión con', address);
        return true;
      }

      const device = await RNBluetoothClassic.connectToDevice(address);
      if (device) {
        this.connectedAddresses.add(device.address);
        if (!this.connectedDevices.find(d => d.address === device.address)) {
          this.connectedDevices.push(device);
        }

        this.connectedPlayers.set(playerName, device);
        this.myName = playerName;
        this.isServer = false;

        this.startListeningForMessages(device, playerName);

        this.sendEvent({
          type: 'PLAYER_JOINED',
          data: { playerName },
        });

        console.log('✅ Conectado a:', device.name || device.address);
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Error al conectar:', error);
      return false;
    }
  }

  // ========== LECTURA DE MENSAJES ==========
  private startListeningForMessages(device: BluetoothDevice, playerName: string) {
    const subscription = device.onDataReceived((data) => {
      try {
        const message = data.data;
        const event: GameEvent = JSON.parse(message);
        console.log('📩 Mensaje recibido:', event.type);
        this.handleReceivedEvent(event, playerName, device);
        this.eventCallbacks.forEach(cb => cb(event));
      } catch (error) {
        console.error('❌ Error al procesar mensaje:', error);
      }
    });

    this.readSubscriptions.set(playerName, subscription);
  }

  private handleReceivedEvent(event: GameEvent, senderName: string, senderDevice: BluetoothDevice) {
    if (this.isServer) {
      switch (event.type) {
        case 'PLAYER_JOINED':
          this.handlePlayerJoined(event.data.playerName, senderDevice);
          break;
        case 'SCORE_SUBMIT':
          this.handleScoreSubmit(event.data);
          break;
      }
    } else {
      switch (event.type) {
        case 'GAME_START':
          this.gameState = 'playing';
          break;
        case 'TIMER_END':
          this.gameState = 'scoring';
          break;
        case 'ALL_SCORES':
          this.gameState = 'waiting';
          break;
      }
    }
  }

  private handlePlayerJoined(playerName: string, device: BluetoothDevice) {
    if (this.gameState !== 'waiting') {
      if (!this.pendingReconnections.includes(playerName)) {
        this.pendingReconnections.push(playerName);
        console.log('⏳ Reconexión pendiente:', playerName);
      }
      return;
    }

    if (this.connectedPlayers.has(playerName)) {
      console.log('⚠️ Jugador ya conectado por nombre:', playerName);
    } else {
      this.connectedPlayers.set(playerName, device);
      const pendingKey = `__pending_${device.address}`;
      const pendingSub = this.readSubscriptions.get(pendingKey);
      if (pendingSub) {
        this.readSubscriptions.delete(pendingKey);
        this.readSubscriptions.set(playerName, pendingSub);
      }
      console.log('✅ Jugador añadido:', playerName);
    }

    this.broadcastPlayersList();
  }

  private handleScoreSubmit(data: { playerName: string; score: number; answers: string[] }) {
    this.submittedScores.set(data.playerName, { score: data.score, answers: data.answers });
    this.sendEventToPlayer(data.playerName, { type: 'SCORE_ACK', data: { playerName: data.playerName } });
    console.log('✅ Puntuación recibida de:', data.playerName);

    if (this.submittedScores.size === this.connectedPlayers.size) {
      this.sendAllScores();
    }
  }

  private sendAllScores() {
    const scores = Array.from(this.submittedScores.entries()).map(([playerName, data]) => ({
      playerName,
      score: data.score,
      answers: data.answers,
    }));

    this.sendEvent({ type: 'ALL_SCORES', data: { scores } });
    this.submittedScores.clear();
    this.gameState = 'waiting';
    this.processPendingReconnections();
    console.log('✅ Todas las puntuaciones enviadas');
  }

  private processPendingReconnections() {
    if (this.pendingReconnections.length > 0) {
      console.log('✅ Procesando reconexiones pendientes:', this.pendingReconnections);
      this.pendingReconnections = [];
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
    } else {
      console.warn('⚠️ No hay device asociado a', playerName);
    }
  }

  private broadcastPlayersList() {
    const players = Array.from(this.connectedPlayers.keys());
    this.sendEvent({ type: 'PLAYERS_LIST_UPDATE', data: { players } });
  }

  // ========== FUNCIONES PÚBLICAS ==========
  updateGameState(state: 'waiting' | 'playing' | 'scoring') {
    this.gameState = state;
    console.log('🎮 Estado del juego:', state);
  }

  notifyConfigUpdate(paperMode: boolean) {
    if (this.isServer) {
      this.sendEvent({ type: 'GAME_CONFIG_UPDATE', data: { paperMode } });
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
      this.sendEvent({ type: 'GAME_START', data: { ...gameData, timestamp: Date.now() } });
    }
  }

  endTimer() {
    if (this.isServer) {
      this.gameState = 'scoring';
      this.sendEvent({ type: 'TIMER_END', data: {} });
    }
  }

  submitScore(playerName: string, score: number, answers: string[]) {
    if (this.isServer) {
      this.handleScoreSubmit({ playerName, score, answers });
    } else {
      this.sendEvent({ type: 'SCORE_SUBMIT', data: { playerName, score, answers } });
    }
  }

  onEvent(callback: EventCallback) {
    this.eventCallbacks.push(callback);
  }

  removeEventListener(callback: EventCallback) {
    this.eventCallbacks = this.eventCallbacks.filter(cb => cb !== callback);
  }

  async disconnect() {
    try {
      console.log('🔧 Solicitando desconexión...');
      // Indicar que el servidor deja de aceptar conexiones
      this.isServer = false;

      // 🔧 Intentar cancelar cualquier accept() activo
      try {
        const accepting = await (RNBluetoothClassic as any).isAccepting?.();
        if (accepting) {
          console.log('🛑 Cancelando accept() pendiente...');
          await (RNBluetoothClassic as any).cancelAccept?.();
        }
      } catch (e) {
        console.warn('⚠️ No se pudo cancelar accept():', e);
      }

      // 🔧 Marcar el loop de aceptación como detenido
      this.acceptLoopActive = false;

      // 🔧 Cancelar subscripciones de lectura
      this.readSubscriptions.forEach(sub => sub.remove());
      this.readSubscriptions.clear();

      // 🔧 Desconectar dispositivos conectados
      for (const device of this.connectedDevices) {
        try {
          const isConnected = await (device as any).isConnected?.();
          if (isConnected) {
            await device.disconnect();
            console.log('🔌 Desconectado de:', device.name || device.address);
          }
        } catch (err) {
          console.warn('⚠️ Error al desconectar de', device.name || device.address, ':', err);
        }
      }

      // 🔧 Limpiar estado interno
      this.connectedDevices = [];
      this.connectedPlayers.clear();
      this.connectedAddresses.clear();
      this.gameState = 'waiting';
      this.pendingReconnections = [];
      this.submittedScores.clear();
      this.eventCallbacks = [];

      console.log('✅ Desconexión completa');
    } catch (error) {
      console.error('❌ Error al desconectar:', error);
    } finally {
      this.acceptLoopActive = false;
      console.log('🧹 Limpieza final del loop de aceptación completada.');
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

export const connectionManager = new ConnectionManager();
