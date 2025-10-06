import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameConfig, DEFAULT_CONFIG } from '../utils/gameConfig';

// Keys para AsyncStorage
const STORAGE_KEYS = {
  CONFIG: '@scattergories:config',
  GAME_HISTORY: '@scattergories:game_history',
  CURRENT_GAME: '@scattergories:current_game',
};

// Interfaces para el historial
export interface PlayerResult {
  name: string;
  score: number;
  answers?: string[];
}

export interface GameHistoryEntry {
  id: string;
  gameId?: string;
  date: string;
  timestamp: number;
  letter: string;
  listName: string;
  listId: number;
  versionId: string;
  players: PlayerResult[];
  duration: string;
  mode: 'normal' | 'paper' | 'free';
}

export interface CurrentGame {
  id: string;
  startDate: string;
  startTimestamp: number;
  players: string[]; // Nombres de los jugadores de esta partida
  rounds: GameHistoryEntry[]; // Array de rondas
}

// ==================== CONFIGURACIÓN ====================

export const saveConfig = async (config: GameConfig): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(config);
    await AsyncStorage.setItem(STORAGE_KEYS.CONFIG, jsonValue);
  } catch (error) {
    console.error('Error saving config:', error);
  }
};

export const loadConfig = async (): Promise<GameConfig> => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEYS.CONFIG);
    if (jsonValue != null) {
      const loadedConfig = JSON.parse(jsonValue);
      // Merge con DEFAULT_CONFIG para asegurar que nuevas propiedades existan
      return { ...DEFAULT_CONFIG, ...loadedConfig };
    }
    return DEFAULT_CONFIG;
  } catch (error) {
    console.error('Error loading config:', error);
    return DEFAULT_CONFIG;
  }
};

export const resetConfig = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.CONFIG);
  } catch (error) {
    console.error('Error resetting config:', error);
  }
};

// ==================== HISTORIAL DE PARTIDAS ====================

export const saveGameResult = async (gameResult: Omit<GameHistoryEntry, 'id' | 'timestamp'>): Promise<void> => {
  try {
    const history = await loadGameHistory();
    
    const newEntry: GameHistoryEntry = {
      ...gameResult,
      id: Date.now().toString(),
      timestamp: Date.now(),
    };
    
    // Añadir al principio (más reciente primero)
    history.unshift(newEntry);
    
    // Limitar a las últimas 100 partidas
    const limitedHistory = history.slice(0, 100);
    
    const jsonValue = JSON.stringify(limitedHistory);
    await AsyncStorage.setItem(STORAGE_KEYS.GAME_HISTORY, jsonValue);
  } catch (error) {
    console.error('Error saving game result:', error);
  }
};

export const loadGameHistory = async (): Promise<GameHistoryEntry[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEYS.GAME_HISTORY);
    if (jsonValue != null) {
      return JSON.parse(jsonValue);
    }
    return [];
  } catch (error) {
    console.error('Error loading game history:', error);
    return [];
  }
};

export const clearGameHistory = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.GAME_HISTORY);
  } catch (error) {
    console.error('Error clearing game history:', error);
  }
};

export const deleteGameEntry = async (id: string): Promise<void> => {
  try {
    const history = await loadGameHistory();
    const updatedHistory = history.filter(entry => entry.id !== id);
    const jsonValue = JSON.stringify(updatedHistory);
    await AsyncStorage.setItem(STORAGE_KEYS.GAME_HISTORY, jsonValue);
  } catch (error) {
    console.error('Error deleting game entry:', error);
  }
};

// ==================== PARTIDA ACTUAL ====================

export const saveCurrentGameRound = async (round: Omit<GameHistoryEntry, 'id' | 'timestamp'>): Promise<void> => {
  try {
    let currentGame = await loadCurrentGame();
    
    // Si no hay partida actual, crear una nueva
    if (!currentGame) {
      const now = Date.now();
      const currentDate = new Date(now);
      const dateString = `${currentDate.getDate().toString().padStart(2, '0')}/${(currentDate.getMonth() + 1).toString().padStart(2, '0')}/${currentDate.getFullYear()} - ${currentDate.getHours().toString().padStart(2, '0')}:${currentDate.getMinutes().toString().padStart(2, '0')}`;
      
      currentGame = {
        id: now.toString(),
        startDate: dateString,
        startTimestamp: now,
        players: round.players.map(p => p.name),
        rounds: []
      };
    }
    
    // Añadir la ronda con id y timestamp
    const newRound: GameHistoryEntry = {
      ...round,
      id: Date.now().toString(),
      timestamp: Date.now(),
      gameId: currentGame.id
    };
    
    currentGame.rounds.push(newRound);
    
    // Guardar partida actualizada
    const jsonValue = JSON.stringify(currentGame);
    await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_GAME, jsonValue);
  } catch (error) {
    console.error('Error saving current game round:', error);
  }
};

export const loadCurrentGame = async (): Promise<CurrentGame | null> => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_GAME);
    if (jsonValue != null) {
      return JSON.parse(jsonValue);
    }
    return null;
  } catch (error) {
    console.error('Error loading current game:', error);
    return null;
  }
};

export const clearCurrentGame = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_GAME);
  } catch (error) {
    console.error('Error clearing current game:', error);
  }
};

export const finalizeCurrentGame = async (): Promise<void> => {
  try {
    const currentGame = await loadCurrentGame();
    
    if (!currentGame || currentGame.rounds.length === 0) {
      // No hay nada que finalizar
      await clearCurrentGame();
      return;
    }
    
    // Mover todas las rondas al historial permanente
    const history = await loadGameHistory();
    
    // Asegurar que todas las rondas tienen el gameId
    const roundsWithGameId = currentGame.rounds.map(round => ({
      ...round,
      gameId: round.gameId || currentGame.id  // ← Por si acaso alguna no lo tiene
    }));
    
    // Añadir todas las rondas al historial (ya tienen id, timestamp y gameId)
    history.unshift(...roundsWithGameId);
    
    // Limitar a las últimas 100 partidas
    const limitedHistory = history.slice(0, 100);
    
    const jsonValue = JSON.stringify(limitedHistory);
    await AsyncStorage.setItem(STORAGE_KEYS.GAME_HISTORY, jsonValue);
    
    // Limpiar partida actual
    await clearCurrentGame();
  } catch (error) {
    console.error('Error finalizing current game:', error);
  }
};

export const isGameInProgress = async (): Promise<boolean> => {
  try {
    const currentGame = await loadCurrentGame();
    return currentGame !== null && currentGame.rounds.length > 0;
  } catch (error) {
    console.error('Error checking if game is in progress:', error);
    return false;
  }
};

// ==================== UTILIDADES ====================

export const clearAllData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.CONFIG,
      STORAGE_KEYS.GAME_HISTORY,
      STORAGE_KEYS.CURRENT_GAME,
    ]);
  } catch (error) {
    console.error('Error clearing all data:', error);
  }
};

export const getStorageInfo = async (): Promise<{
  configExists: boolean;
  historyCount: number;
  currentGameExists: boolean;
  currentGameRounds: number;
}> => {
  try {
    const config = await AsyncStorage.getItem(STORAGE_KEYS.CONFIG);
    const history = await loadGameHistory();
    const currentGame = await loadCurrentGame();
    
    return {
      configExists: config !== null,
      historyCount: history.length,
      currentGameExists: currentGame !== null,
      currentGameRounds: currentGame?.rounds.length || 0,
    };
  } catch (error) {
    console.error('Error getting storage info:', error);
    return {
      configExists: false,
      historyCount: 0,
      currentGameExists: false,
      currentGameRounds: 0,
    };
  }
};