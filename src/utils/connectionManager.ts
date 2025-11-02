// Gestor de conexiones WiFi Hotspot + WebSocket para modo multijugador

import TcpSocket from 'react-native-tcp-socket';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';


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
      type: 'GAME_START'; 
      data: {
        paperMode: boolean;
        warningEnabled: boolean;
        warningSeconds: number;
        showTimer: boolean;
        endGameAlertEnabled: boolean;
        endGameAlertTitle: string;
      };
    }
  | {
      type: 'ROUND_START';
      data: {
        letter: string;
        listId: number;
        versionId: string;
        listName: string;
        categories?: string[];
        timerDuration: number;
        timestamp: number;
      };
    }
  | {
    type: 'GAME_FINALIZE';
    data: {};
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
    }
    | {
      type: 'HEARTBEAT_PING';
      data: {
        timestamp: number;
      };
    }
  | {
      type: 'HEARTBEAT_PONG';
      data: {
        playerName: string;
        timestamp: number;
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
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastHeartbeatReceived: Map<string, number> = new Map();
  private readonly HEARTBEAT_INTERVAL = 10000; // 10 segundos
  private readonly HEARTBEAT_TIMEOUT = 30000; // 30 segundos
  private currentGameConfig: {
    paperMode: boolean;
    warningEnabled: boolean;
    warningSeconds: number;
    showTimer: boolean;
    endGameAlertEnabled: boolean;
    endGameAlertTitle: string;
  } | null = null;

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
        
  let buffer = '';
  socket.on('data', (data: any) => {
    try {
      buffer += data.toString('utf8');
      const messages = buffer.split('\n');
      buffer = messages.pop() || ''; // Guardar mensaje incompleto
      
      messages.forEach(message => {
        if (message.trim()) {
          const event: GameEvent = JSON.parse(message);
          console.log(`📩 Mensaje recibido: ${event.type}`);
          
          // Si es PLAYER_JOINED, guardar el socket con el nombre del jugador
          if (event.type === 'PLAYER_JOINED') {
            const playerName = event.data.playerName;
            
            // ⚠️ Limpiar socket viejo ANTES de guardar el nuevo
            const existingSocket = this.clients.get(playerName);
            if (existingSocket && existingSocket !== socket) {
              console.log(`🔄 Cerrando socket antiguo de ${playerName}`);
              existingSocket.destroy();
            }
            
            // Guardar el NUEVO socket
            this.clients.set(playerName, socket);
            
            // Ahora sí, manejar la lógica (el socket ya está guardado)
            this.handlePlayerJoined(playerName);
          }
          
          this.handleReceivedEvent(event);
          this.eventCallbacks.forEach(callback => callback(event));
        }
      });
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
      //this.startHeartbeat();
      return true;
    } catch (error) {
      console.error('❌ Error al iniciar servidor:', error);
      return false;
    }
  }

  // ========== CLIENTE (ESCLAVO) ==========

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

      let buffer = '';
      this.clientSocket.on('data', (data: any) => {
        try {
          buffer += data.toString('utf8');
          const messages = buffer.split('\n');
          buffer = messages.pop() || '';
          
          messages.forEach(message => {
            if (message.trim()) {
              const event: GameEvent = JSON.parse(message);
              console.log('📩 Mensaje recibido:', event.type);
              
              this.handleReceivedEvent(event);
              this.eventCallbacks.forEach(callback => callback(event));
            }
          });
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
    // ========== HEARTBEAT (FUNCIONA PARA AMBOS) ==========
    // Responder a heartbeat ping (ESCLAVO)
    if (event.type === 'HEARTBEAT_PING' && !this.isServer) {
      this.sendEvent({
        type: 'HEARTBEAT_PONG',
        data: {
          playerName: this.myName,
          timestamp: Date.now()
        }
      });
    }
    
    // Procesar heartbeat pong (MASTER)
    if (event.type === 'HEARTBEAT_PONG' && this.isServer) {
      this.lastHeartbeatReceived.set(event.data.playerName, Date.now());
    }
    
    // ========== EVENTOS DEL MASTER ==========
    if (this.isServer) {
      switch (event.type) {
        case 'SCORE_SUBMIT':
          this.handleScoreSubmit(event.data);
          break;
      }
    }

    // ========== EVENTOS DEL ESCLAVO ==========
    if (!this.isServer) {
      switch (event.type) {
        case 'PLAYERS_LIST_UPDATE':
          this.connectedPlayers = event.data.players;
          break;
          
        case 'GAME_START':
          // Solo recibe configuración, no cambia gameState
          break;
          
        case 'ROUND_START':
          this.gameState = 'playing';
          break;
          
        case 'TIMER_END':
          this.gameState = 'scoring';
          break;
          
        case 'ALL_SCORES':
          this.gameState = 'waiting';
          break;

        case 'GAME_FINALIZE':
          // El listener global manejará la lógica
          break;
      }
    }
  }

  private handlePlayerJoined(playerName: string) {
      // Si NO hay partida iniciada (no se ha enviado GAME_START)
      if (this.currentGameConfig === null) {
        if (!this.connectedPlayers.includes(playerName)) {
          this.connectedPlayers.push(playerName);
          this.lastHeartbeatReceived.set(playerName, Date.now());
          this.broadcastPlayersList();
          console.log('✅ Jugador añadido:', playerName);
        }
      } else {
      // Ya hay partida iniciada (se envió GAME_START) → reconexión
      if (!this.pendingReconnections.includes(playerName)) {
        this.pendingReconnections.push(playerName);
        console.log('⏳ Reconexión pendiente:', playerName);
        
        // Reenviar GAME_START solo a este jugador
        this.sendEventToPlayer(playerName, {
          type: 'GAME_START',
          data: this.currentGameConfig
        });
        console.log(`📤 GAME_START reenviado a ${playerName}`);
      }
    }
  }

  private handlePlayerLeft(playerName: string) {
    // Eliminar de connectedPlayers
    const index = this.connectedPlayers.indexOf(playerName);
    if (index > -1) {
      this.connectedPlayers.splice(index, 1);
    }
    
    // Eliminar de pendingReconnections también
    const pendingIndex = this.pendingReconnections.indexOf(playerName);
    if (pendingIndex > -1) {
      this.pendingReconnections.splice(pendingIndex, 1);
      console.log(`🧹 ${playerName} eliminado de reconexiones pendientes`);
    }
    
    // Solo notificar si estaba en alguna de las dos listas
    if (index > -1 || pendingIndex > -1) {
      this.broadcastPlayersList();
      
      const event = {
        type: 'PLAYER_LEFT' as const,
        data: { playerName }
      };
      
      console.log('🔵 ANTES de sendEvent');
      this.sendEvent(event);
      console.log('🟢 DESPUÉS de sendEvent');
      
      this.eventCallbacks.forEach(callback => callback(event));
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
    const message = JSON.stringify(event) + '\n';
    
    if (this.isServer) {
      // Enviar a todos los clientes conectados
      this.clients.forEach((socket, playerName) => {
        try {
          socket.write(message);
          console.log(`📤 Evento enviado: ${event.type} a ${playerName}`);
        } catch (error) {
          console.error('❌ Error al enviar a', playerName, error);
        }
      });
    } else {
      // Enviar al servidor
      if (this.clientSocket) {
        try {
          this.clientSocket.write(message);
          console.log(`📤 Evento enviado: ${event.type}`);
        } catch (error) {
          console.error(`❌ Error al enviar: ${error}`);
        }
      }
    }
  }

  private sendEventToPlayer(playerName: string, event: GameEvent) {
    const socket = this.clients.get(playerName);
    if (socket) {
      const message = JSON.stringify(event) + '\n';
      socket.write(message);
      console.log(`📤 Evento (in sendEventToPlayer) enviado a ${playerName}: ${event.type}`);
    } else {
      console.error(`❌ sendEventToPlayer: No hay socket para ${playerName}`);
      console.log(`🔍 currentGameConfig:`, this.currentGameConfig);
      console.log(`📋 Sockets disponibles:`, Array.from(this.clients.keys()));
    }
  }

  private broadcastPlayersList() {
    this.sendEvent({
      type: 'PLAYERS_LIST_UPDATE',
      data: { players: this.connectedPlayers }
    });
    
  }

  // ========== FUNCIONES PÚBLICAS ==========
  updateGameState(state: 'waiting' | 'playing' | 'scoring') {
    this.gameState = state;
  }

  startGame(gameConfig: {
    paperMode: boolean;
    warningEnabled: boolean;
    warningSeconds: number;
    showTimer: boolean;
    endGameAlertEnabled: boolean;
    endGameAlertTitle: string;
  }) {
    if (this.isServer) {
      this.currentGameConfig = gameConfig;
      this.sendEvent({
        type: 'GAME_START',
        data: gameConfig
      });
    }
  }
    
  startRound(roundData: {
    letter: string;
    listId: number;
    versionId: string;
    listName: string;
    categories?: string[];
    timerDuration: number;
  }) {
    if (this.isServer) {
      this.gameState = 'playing';
      this.sendEvent({
        type: 'ROUND_START',
        data: {
          ...roundData,
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

  getServerIdentifier(): string {
    // Extraer el último octeto de la IP (1-3 dígitos)
    const parts = this.serverIp.split('.');
    return parts[3] || '0';
  }

  async buildIpFromIdentifier(identifier: string): Promise<string> {
    // Obtener nuestra IP local
    const myIp = await this.getLocalIpAddress();
    const parts = myIp.split('.');
    
    // Reemplazar el último octeto con el identificador
    parts[3] = identifier;
    
    return parts.join('.');
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
      // Detener heartbeat si existe
      //rthis.stopHeartbeat();
      
      // SERVIDOR: cerrar servidor y todos los sockets cliente
      if (this.isServer && this.server) {
        // Cerrar todos los sockets de clientes
        this.clients.forEach((socket, playerName) => {
          try {
            socket.destroy();
            console.log(`🔌 Socket cerrado para: ${playerName}`);
          } catch (error) {
            console.error(`Error cerrando socket de ${playerName}:`, error);
          }
        });
        this.clients.clear();
        
        // Cerrar servidor
        this.server.close(() => {
          console.log('🛑 Servidor cerrado completamente');
        });
        this.server = null;
      }
      
      // CLIENTE: cerrar socket cliente
      if (!this.isServer && this.clientSocket) {
        try {
          this.clientSocket.destroy();
          this.clientSocket = null;
          console.log('🔌 Socket cliente cerrado');
        } catch (error) {
          console.error('Error cerrando socket cliente:', error);
        }
      }

      // Limpiar estado
      this.connectedPlayers = [];
      this.isServer = false;
      this.gameState = 'waiting';
      this.pendingReconnections = [];
      this.submittedScores.clear();
      this.lastHeartbeatReceived.clear();
      this.serverIp = '';
      this.myName = '';
      this.currentGameConfig = null;
      
      // ⚠️ NO borrar eventCallbacks aquí - deben persistir entre partidas
      // Los componentes individuales gestionan su limpieza en sus useEffect cleanup
      
      console.log('✅ Desconexión completa');
    } catch (error) {
      console.error('❌ Error al desconectar:', error);
    }
  }

  // ========== HEARTBEAT ==========
  private startHeartbeat() {
    if (!this.isServer) return;
    
    // Limpiar intervalo anterior si existe
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Iniciar nuevo intervalo
    this.heartbeatInterval = setInterval(() => {
      // Enviar ping a todos
      this.sendEvent({
        type: 'HEARTBEAT_PING',
        data: { timestamp: Date.now() }
      });
      
      // Verificar timeouts
      this.checkHeartbeatTimeouts();
    }, this.HEARTBEAT_INTERVAL);
    
    console.log('💓 Heartbeat iniciado');
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log('💔 Heartbeat detenido');
    }
  }

  private checkHeartbeatTimeouts() {
    const now = Date.now();
    const disconnectedPlayers: string[] = [];
    
    this.connectedPlayers.forEach(playerName => {
      // Saltar el master (nosotros mismos)
      if (playerName === this.myName) return;
      
      const lastHeartbeat = this.lastHeartbeatReceived.get(playerName) || 0;
      const timeSinceLastHeartbeat = now - lastHeartbeat;
      
      if (timeSinceLastHeartbeat > this.HEARTBEAT_TIMEOUT) {
        console.log('⚠️ Timeout detectado para:', playerName);
        disconnectedPlayers.push(playerName);
      }
    });
    
    // Eliminar jugadores desconectados
    disconnectedPlayers.forEach(playerName => {
      this.handlePlayerLeft(playerName);
      const socket = this.clients.get(playerName);
      if (socket) {
        socket.destroy();
        this.clients.delete(playerName);
      }
    });
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