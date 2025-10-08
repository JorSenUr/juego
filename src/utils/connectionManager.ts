// Gestor de conexiones WiFi Hotspot + WebSocket para modo multijugador

import TcpSocket from 'react-native-tcp-socket';
import { Platform, PermissionsAndroid } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import Zeroconf from 'react-native-zeroconf';


// ========== TIPOS DE EVENTOS ==========
export type GameEvent = 
  | {
      type: 'PLAYER_JOINED';
      data: {
        playerName: string;
      };
    }
  | {
      type: 'PLAYERS_LIST_UPDATE';
      data: {
        players: string[];
      };
    }
  | {
      type: 'PLAYER_LEFT';
      data: {
        playerName: string;
      };
    }
  | {
      type: 'GAME_CONFIG_UPDATE';
      data: {
        paperMode: boolean;
      };
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
      data: {
        playerName: string;
        score: number;
        answers: string[];
      };
    }
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
  | {
      type: 'SCORE_ACK';
      data: {
        playerName: string;
      };
    };

type EventCallback = (event: GameEvent) => void;

const SERVER_PORT = 8765;

class ConnectionManager {
  private isServer: boolean = false;
  private server: any = null;
  private clients: Map<string, any> = new Map(); // playerName -> socket
  private clientSocket: any = null;
  private gameState: 'waiting' | 'playing' | 'scoring' = 'waiting';
  private pendingReconnections: string[] = [];
  private connectedPlayers: string[] = [];
  private submittedScores: Map<string, { score: number; answers: string[] }> = new Map();
  private eventCallbacks: EventCallback[] = [];
  private myName: string = '';
  private serverIp: string = '';
  private zeroconf: Zeroconf = new Zeroconf();
  private discoveredServices: Map<string, { name: string; host: string; port: number; addresses: string[] }> = new Map();


  // ========== OBTENER IP LOCAL ==========
  private async getLocalIpAddress(): Promise<string> {
    try {
      const state = await NetInfo.fetch();
      
      // Buscar IP local en los detalles de la conexión
      if (state.details && typeof state.details === 'object') {
        const details = state.details as any;
        if (details.ipAddress) {
          return details.ipAddress;
        }
      }
      
      // Fallback: IP común de hotspot Android
      return '192.168.43.1';
    } catch (error) {
      console.error('Error obteniendo IP:', error);
      return '192.168.43.1';
    }
  }

  // ========== SERVIDOR (MAESTRO) ==========
  async startServer(playerName: string): Promise<boolean> {
    try {
      this.isServer = true;
      this.myName = playerName;
      this.gameState = 'waiting';
      this.connectedPlayers = [playerName];
      
      // Obtener IP del servidor
      this.serverIp = await this.getLocalIpAddress();

      // Crear servidor TCP
      this.server = TcpSocket.createServer((socket: any) => {
        console.log('✅ Cliente conectado desde:', socket.address());
        
        socket.on('data', (data: any) => {
          try {
            const message = data.toString('utf8');
            const event: GameEvent = JSON.parse(message);
            
            console.log('📩 Mensaje recibido:', event.type);
            
            // Si es PLAYER_JOINED, guardar el socket con el nombre del jugador
            if (event.type === 'PLAYER_JOINED') {
              const playerName = event.data.playerName;
              this.clients.set(playerName, socket);
              this.handlePlayerJoined(playerName);
            }
            
            // Procesar evento
            this.handleReceivedEvent(event);
            
            // Notificar callbacks
            this.eventCallbacks.forEach(callback => callback(event));
          } catch (error) {
            console.error('❌ Error procesando mensaje:', error);
          }
        });
        
        socket.on('error', (error: any) => {
          console.error('❌ Error en socket:', error);
        });
        
        socket.on('close', () => {
          console.log('🔌 Cliente desconectado');
          // Buscar y eliminar el cliente
          for (const [playerName, clientSocket] of this.clients.entries()) {
            if (clientSocket === socket) {
              this.handlePlayerLeft(playerName);
              this.clients.delete(playerName);
              break;
            }
          }
        });
      });

      this.server.listen({ port: SERVER_PORT, host: '0.0.0.0' });
      
      // Publicar servicio mDNS
      this.zeroconf.publishService(
        'scattergories',
        '_scattergories._tcp',
        'local',
        SERVER_PORT,
        {
          name: playerName,
          players: '1'
        }
      );
      
      console.log(`✅ Servidor iniciado en ${this.serverIp}:${SERVER_PORT}`);
      console.log('📡 Servicio mDNS publicado: Partida de ${playerName}');
      return true;
    } catch (error) {
      console.error('❌ Error al iniciar servidor:', error);
      return false;
    }
  }

  // ========== CLIENTE (ESCLAVO) ==========
async scanForDevices(): Promise<Array<{ name: string; address: string; playersCount: number }>> {
  return new Promise(async (resolve) => {
    this.discoveredServices.clear();
    
    // Solicitar permisos si es Android
    if (Platform.OS === 'android') {
      try {
        const { PermissionsAndroid } = await import('react-native');
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Permiso de ubicación',
            message: 'Necesario para descubrir dispositivos en red local',
            buttonPositive: 'OK'
          }
        );
        
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.log('❌ Permiso de ubicación denegado');
          resolve([]);
          return;
        }
      } catch (error) {
        console.error('❌ Error solicitando permisos:', error);
        resolve([]);
        return;
      }
    }
      
      // Listener para servicios encontrados
      this.zeroconf.on('resolved', (service: any) => {
        console.log('📡 Servicio encontrado:', service);
        
        if (service.name && service.addresses && service.addresses.length > 0) {
          const playerName = service.txt?.name || service.name;
          const playersCount = parseInt(service.txt?.players || '1');
          
          this.discoveredServices.set(service.name, {
            name: playerName,
            host: service.host,
            port: service.port,
            addresses: service.addresses
          });
        }
      });
      
      // Listener para errores
      this.zeroconf.on('error', (error: any) => {
        console.error('❌ Error en escaneo mDNS:', error);
      });
      
      // Iniciar escaneo
      console.log('🔍 Escaneando servicios mDNS...');
      this.zeroconf.scan('_scattergories._tcp', 'local');
      
      // Esperar 5 segundos y retornar resultados
      setTimeout(() => {
        this.zeroconf.stop();
        
        const devices = Array.from(this.discoveredServices.values()).map(service => ({
          name: `Partida de ${service.name}`,
          address: service.addresses[0], // Primera IP encontrada
          playersCount: 1 // TODO: Obtener del txt record
        }));
        
        console.log('📱 Dispositivos encontrados:', devices.length);
        resolve(devices);
      }, 5000);
    });
  }

  async connectToDevice(serverIp: string, playerName: string): Promise<boolean> {
    try {
      this.isServer = false;
      this.myName = playerName;
      
      // Crear socket cliente
      this.clientSocket = TcpSocket.createConnection(
        {
          port: SERVER_PORT,
          host: serverIp,
        },
        () => {
          console.log('✅ Conectado al servidor');
          
          // Enviar PLAYER_JOINED
          this.sendEvent({
            type: 'PLAYER_JOINED',
            data: { playerName }
          });
        }
      );

      this.clientSocket.on('data', (data: any) => {
        try {
          const message = data.toString('utf8');
          const event: GameEvent = JSON.parse(message);
          
          console.log('📩 Mensaje recibido:', event.type);
          
          // Procesar evento
          this.handleReceivedEvent(event);
          
          // Notificar callbacks
          this.eventCallbacks.forEach(callback => callback(event));
        } catch (error) {
          console.error('❌ Error procesando mensaje:', error);
        }
      });

      this.clientSocket.on('error', (error: any) => {
        console.error('❌ Error en conexión:', error);
      });

      this.clientSocket.on('close', () => {
        console.log('🔌 Desconectado del servidor');
      });

      return true;
    } catch (error) {
      console.error('❌ Error al conectar:', error);
      return false;
    }
  }

  // ========== MANEJO DE EVENTOS ==========
  private handleReceivedEvent(event: GameEvent) {
    if (this.isServer) {
      switch (event.type) {
        case 'SCORE_SUBMIT':
          this.handleScoreSubmit(event.data);
          break;
      }
    }
    
    if (!this.isServer) {
      switch (event.type) {
        case 'PLAYERS_LIST_UPDATE':
          this.connectedPlayers = event.data.players;
          break;
          
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

  private handlePlayerJoined(playerName: string) {
    if (this.gameState === 'waiting') {
      if (!this.connectedPlayers.includes(playerName)) {
        this.connectedPlayers.push(playerName);
        this.broadcastPlayersList();
        console.log('✅ Jugador añadido:', playerName);
      }
    } else {
      if (!this.pendingReconnections.includes(playerName)) {
        this.pendingReconnections.push(playerName);
        console.log('⏳ Reconexión pendiente:', playerName);
      }
    }
  }

  private handlePlayerLeft(playerName: string) {
    const index = this.connectedPlayers.indexOf(playerName);
    if (index > -1) {
      this.connectedPlayers.splice(index, 1);
      this.broadcastPlayersList();
      
      this.sendEvent({
        type: 'PLAYER_LEFT',
        data: { playerName }
      });
    }
  }

  private handleScoreSubmit(data: { playerName: string; score: number; answers: string[] }) {
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
    
    if (this.submittedScores.size === this.connectedPlayers.length) {
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
    
    this.submittedScores.clear();
    this.gameState = 'waiting';
    this.processPendingReconnections();
    
    console.log('✅ Todas las puntuaciones enviadas');
  }

  private processPendingReconnections() {
    if (this.pendingReconnections.length > 0) {
      console.log('✅ Procesando reconexiones pendientes:', this.pendingReconnections);
      
      this.pendingReconnections.forEach(playerName => {
        if (!this.connectedPlayers.includes(playerName)) {
          this.connectedPlayers.push(playerName);
        }
      });
      
      this.pendingReconnections = [];
      this.broadcastPlayersList();
    }
  }

  // ========== ENVÍO DE MENSAJES ==========
  sendEvent(event: GameEvent) {
    const message = JSON.stringify(event);
    
    if (this.isServer) {
      // Enviar a todos los clientes conectados
      this.clients.forEach((socket, playerName) => {
        try {
          socket.write(message);
          console.log('📤 Evento enviado:', event.type, 'a', playerName);
        } catch (error) {
          console.error('❌ Error al enviar a', playerName, error);
        }
      });
    } else {
      // Enviar al servidor
      if (this.clientSocket) {
        try {
          this.clientSocket.write(message);
          console.log('📤 Evento enviado:', event.type);
        } catch (error) {
          console.error('❌ Error al enviar:', error);
        }
      }
    }
  }

  private sendEventToPlayer(playerName: string, event: GameEvent) {
    const socket = this.clients.get(playerName);
    if (socket) {
      const message = JSON.stringify(event);
      socket.write(message);
    }
  }

  private broadcastPlayersList() {
    this.sendEvent({
      type: 'PLAYERS_LIST_UPDATE',
      data: { players: this.connectedPlayers }
    });
    
    // Actualizar servicio mDNS con número de jugadores
    if (this.isServer) {
      this.zeroconf.unpublishService('scattergories');
      this.zeroconf.publishService(
        'scattergories',
        '_scattergories._tcp',
        'local',
        SERVER_PORT,
        {
          name: this.myName,
          players: this.connectedPlayers.length.toString()
        }
      );
    }
  }

  // ========== FUNCIONES PÚBLICAS ==========
  updateGameState(state: 'waiting' | 'playing' | 'scoring') {
    this.gameState = state;
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
    if (this.isServer) {
      this.handleScoreSubmit({ playerName, score, answers });
    } else {
      this.sendEvent({
        type: 'SCORE_SUBMIT',
        data: { playerName, score, answers }
      });
    }
  }

  getServerIp(): string {
    return this.serverIp;
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
      if (this.isServer && this.server) {
      // Despublicar servicio mDNS
      try {
        this.zeroconf.unpublishService('scattergories');
        console.log('📡 Servicio mDNS despublicado');
      } catch (e) {
        // Ignorar si no estaba publicado
      }
        this.clients.forEach(socket => socket.destroy());
        this.clients.clear();
        this.server.close();
        this.server = null;
        console.log('🛑 Servidor cerrado');
      }
      
      if (!this.isServer && this.clientSocket) {
        this.clientSocket.destroy();
        this.clientSocket = null;
        console.log('🔌 Desconectado del servidor');
      }

      this.connectedPlayers = [];
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
    return this.connectedPlayers;
  }

  isConnected(): boolean {
    return this.connectedPlayers.length > 0;
  }

  getRole(): 'server' | 'client' | 'none' {
    if (this.connectedPlayers.length === 0) return 'none';
    return this.isServer ? 'server' : 'client';
  }

  getGameState(): 'waiting' | 'playing' | 'scoring' {
    return this.gameState;
  }
}

// Singleton
export const connectionManager = new ConnectionManager();