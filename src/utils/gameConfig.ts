// Configuración global del juego

import { saveConfig, loadConfig, resetConfig as resetStorageConfig } from '../data/storage';

export interface GameConfig {
  // Timer settings
  timerMinMinutes: number;
  timerMaxMinutes: number;
  showTimer: boolean;
  warningEnabled: boolean;
  warningSeconds: number;
  
  // Alert settings
  endGameAlertEnabled: boolean;
  endGameAlertTitle: string;
  
  // Player settings
  numberOfPlayers: number;
  playerNames: string[];
  favoritePlayers: string[]; 
  
  // Game settings
  selectedVersionId: string;
  selectedListId: number;
  bluetoothMode: boolean;
  freeMode: boolean;
  paperMode: boolean;
  randomMode: boolean;
  isMasterDevice: boolean;
  onlineGameInProgress: boolean;
  lastServerIdentifier: string;
  
  // Letters settings
  availableLetters: string[];

  // Sound settings
  soundTimerEnabled: boolean;
  soundEndEnabled: boolean;
  soundsMuted: boolean;

}

// Configuración por defecto
export const DEFAULT_CONFIG: GameConfig = {
  // Timer (valores de desarrollo para pruebas rápidas)
  timerMinMinutes: 0.05, // 3 segundos
  timerMaxMinutes: 0.1,  // 6 segundos
  showTimer: true,
  warningEnabled: false,
  warningSeconds: 30,
  
  // Alerts
  endGameAlertEnabled: true,
  endGameAlertTitle: 'TIEMPO TERMINADO',
  
  // Players
  numberOfPlayers: 2,
  playerNames: ['Jugador 1', 'Jugador 2'],
  favoritePlayers: [],
  
  // Game
  selectedVersionId: 'original_1988',
  selectedListId: 1,
  bluetoothMode: false,
  freeMode: false,
  paperMode: false,
  randomMode: false,
  isMasterDevice: true,
  onlineGameInProgress: false,
  lastServerIdentifier: '',
  
  // Letters (letras por defecto sin las difíciles K, Q, W, X, Y, Z)
  availableLetters: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'L', 'M', 'N', 'O', 'P', 'R', 'S', 'T', 'U', 'V'],

  // Sound settings
  soundTimerEnabled: true,
  soundEndEnabled: true,
  soundsMuted: false,

};

// Configuración actual (en memoria)
let currentConfig: GameConfig = { ...DEFAULT_CONFIG };

// Inicializar configuración desde AsyncStorage
export const initializeConfig = async (): Promise<GameConfig> => {
  currentConfig = await loadConfig();
  return currentConfig;
};

export const getCurrentConfig = (): GameConfig => {
  return { ...currentConfig };
};

export const updateConfig = async (newConfig: Partial<GameConfig>): Promise<void> => {
  currentConfig = { ...currentConfig, ...newConfig };
  await saveConfig(currentConfig);
};

export const resetConfigToDefault = async (): Promise<void> => {
  currentConfig = { ...DEFAULT_CONFIG };
  await resetStorageConfig();
  await saveConfig(currentConfig);
};