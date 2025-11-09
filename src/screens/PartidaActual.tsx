import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { loadCurrentGame, clearCurrentGame, finalizeCurrentGame, CurrentGame } from '../data/storage';
import { getCurrentConfig } from '../utils/gameConfig';
import { connectionManager } from '../utils/connectionManager';




interface PartidaActualProps {
  navigate: (screen: 'MenuPrincipal' | 'Configuracion' | 'PantallaJuego' | 'Puntuaciones' | 'ReglasJuego' | 'ConfiguracionPartida') => void;
  goBack: () => void;
  hideTerminarButton?: boolean;
}

const PartidaActual = ({ navigate, goBack, hideTerminarButton = false }: PartidaActualProps) => {
  const [currentGame, setCurrentGame] = useState<CurrentGame | null>(null);
  const [selectedRound, setSelectedRound] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const config = getCurrentConfig();

  useEffect(() => {
    loadCurrentGameData();
  }, []);

  // ========== LISTENER PARA EVENTOS ONLINE ==========
  useEffect(() => {
    const handleOnlineEvents = (event: any) => {
      if (event.type === 'RETURN_TO_WAITING') {
        console.log('🎮 PartidaActual recibió RETURN_TO_WAITING, navegando a PantallaJuego');
        navigate('PantallaJuego');
      }
    };
    
    connectionManager.onEvent(handleOnlineEvents);
    
    return () => {
      connectionManager.removeEventListener(handleOnlineEvents);
    };
  }, []);

  const loadCurrentGameData = async () => {
    const game = await loadCurrentGame();
    setCurrentGame(game);
    setIsLoading(false);
  };

  const getPlayerStats = () => {
    if (!currentGame || currentGame.rounds.length === 0) return [];

    const stats: { [key: string]: { rounds: number, totalScore: number, wins: number } } = {};
    
    currentGame.rounds.forEach(round => {
      // Encontrar ganador de esta ronda
      const winner = round.players.reduce((prev, current) => 
        prev.score > current.score ? prev : current
      );
      
      round.players.forEach(player => {
        if (!stats[player.name]) {
          stats[player.name] = { rounds: 0, totalScore: 0, wins: 0 };
        }
        stats[player.name].rounds++;
        stats[player.name].totalScore += player.score;
        if (player.name === winner.name) {
          stats[player.name].wins++;
        }
      });
    });

    return Object.entries(stats).map(([name, data]) => ({
      name,
      averageScore: Math.round(data.totalScore / data.rounds * 10) / 10,
      winRate: Math.round(data.wins / data.rounds * 100),
      ...data
    })).sort((a, b) => b.totalScore - a.totalScore);
  };

  const handleClearCurrentGame = () => {
    Alert.alert(
      'BORRAR PARTIDA ACTUAL',
      '¿Estás seguro de que quieres eliminar todas las rondas de la partida actual? Esta acción no se puede deshacer.',
      [
        { text: 'CANCELAR', style: 'cancel' },
        { 
          text: 'BORRAR TODO', 
          style: 'destructive',
          onPress: async () => {
            await clearCurrentGame();
            await loadCurrentGameData();
          }
        }
      ]
    );
  };

  const handleFinalizeGame = () => {
    Alert.alert(
      'TERMINAR PARTIDA',
      '¿Quieres terminar esta partida? Todas las rondas se guardarán en el historial permanente.',
      [
        { text: 'CANCELAR', style: 'cancel' },
        { 
          text: 'TERMINAR', 
          onPress: async () => {
            await finalizeCurrentGame();
            Alert.alert(
              'Partida Terminada',
              'La partida se ha guardado en el historial.',
              [{ 
                text: 'OK', 
                onPress: () => navigate('Puntuaciones') // ← Cambiar de MenuPrincipal a Puntuaciones
              }]
            );
          }
        }
      ]
    );
  };

  const playerStats = getPlayerStats();

  // Mostrar loading mientras carga
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentGame || currentGame.rounds.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No hay partida en curso</Text>
          <Text style={styles.emptyText}>
            Inicia una nueva partida desde "Comenzar Partida" en el menú principal.
          </Text>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => navigate('MenuPrincipal')}
          >
            <Text style={styles.buttonText}>IR AL MENÚ</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        
        {/* TABLA DE PUNTUACIONES (con totales integrados) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PUNTUACIÓN</Text>
          <View style={styles.tableContainer}>
  <View style={styles.table}>
    {/* Cabecera */}
    <View style={styles.tableRow}>
      <Text style={[styles.tableCell, styles.tableHeader, styles.roundColumn]}>Ronda</Text>
      {playerStats.map(stat => (
        <Text key={stat.name} style={[styles.tableCell, styles.tableHeader, styles.scoreColumnFlex]}>
          {stat.name}
        </Text>
      ))}
    </View>
    
    {/* Fila TOTAL */}
    <View style={[styles.tableRow, styles.totalRow]}>
      <Text style={[styles.tableCell, styles.roundColumn, styles.totalCell]}>
        Total
      </Text>
        {playerStats.map(stat => {
          const maxScore = Math.max(...playerStats.map(p => p.totalScore));
          const winnersCount = playerStats.filter(p => p.totalScore === maxScore).length;
          const isWinner = stat.totalScore === maxScore && winnersCount === 1;  // ← Solo resaltar si es único ganador
          
          return (
            <Text 
              key={stat.name} 
              style={[
                styles.tableCell, 
                styles.scoreColumnFlex,
                styles.totalCell,
                isWinner && styles.winnerTotalCell
              ]}
            >
              {stat.totalScore}
            </Text>
          );
        })}
    </View>
    
    {/* Filas de datos - orden inverso para mostrar más reciente primero */}
    {[...currentGame.rounds].reverse().map((round, index) => {
      const roundNumber = currentGame.rounds.length - index;
      return (
        <View key={round.id} style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.roundColumn]}>
            {roundNumber}
          </Text>
          {playerStats.map(stat => {
            const player = round.players.find(p => p.name === stat.name);
            const maxScore = Math.max(...round.players.map(p => p.score));
            const winnersCount = round.players.filter(p => p.score === maxScore).length;
            const isWinner = player?.score === maxScore && winnersCount === 1;  // ← Solo resaltar si es único ganador
            
            return (
              <Text 
                key={stat.name} 
                style={[
                  styles.tableCell, 
                  styles.scoreColumnFlex,
                  isWinner && styles.winnerCell
                ]}
              >
                {player?.score ?? '-'}
              </Text>
            );
          })}
        </View>
      );
    })}
  </View>
</View>
        </View>

        {/* RONDAS JUGADAS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RONDAS JUGADAS</Text>
          {[...currentGame.rounds].reverse().map((round, displayIndex) => {
            const maxScore = Math.max(...round.players.map(p => p.score));
            const winnersCount = round.players.filter(p => p.score === maxScore).length;
            const isPaperMode = round.mode === 'paper';
            const hasDetails = !isPaperMode;
            
            return (
              <TouchableOpacity 
                key={round.id} 
                style={styles.gameCard}
                onPress={() => hasDetails && setSelectedRound(selectedRound === round.id ? null : round.id)}
                disabled={!hasDetails}
              >
                <View style={styles.gameHeader}>
                  <Text style={styles.gameDate}>{round.date}</Text>
                  <Text style={styles.gameLetter}>
                    Letra: <Text style={styles.letterHighlight}>{round.letter}</Text>
                  </Text>
                </View>
                <View style={styles.gameInfo}>
                  <Text style={styles.gameList}>{round.listName}</Text>
                  <Text style={styles.gameDuration}>Duración: {round.duration}</Text>
                </View>
                
                {/* PUNTUACIONES DE TODOS LOS JUGADORES */}
                <View style={styles.playersScores}>
                  {round.players.map((player) => {
                    const isWinner = player.score === maxScore && winnersCount === 1;
                    return (
                      <Text 
                        key={player.name} 
                        style={[
                          styles.playerScore,
                          isWinner && styles.winnerScore
                        ]}
                      >
                        {player.name}: {player.score}
                      </Text>
                    );
                  })}
                </View>
                
                {/* Icono papel y boli */}
                {isPaperMode && (
                  <Text style={styles.paperModeIcon}>📝</Text>
                )}
                
                {selectedRound === round.id && hasDetails && (
                  <View style={styles.gameDetails}>
                    <Text style={styles.detailsTitle}>DETALLES:</Text>
                    {round.players.map((player) => (
                      <View key={player.name} style={styles.playerDetail}>
                        <Text style={styles.playerDetailName}>
                          {player.name}: {player.score} puntos
                        </Text>
                        {player.answers && player.answers.length > 0 && (
                          <View style={styles.answersGrid}>
                            {player.answers.map((answer, index) => (
                              <Text key={index} style={styles.answer}>
                                {index + 1}. {answer || '(sin respuesta)'}
                              </Text>
                            ))}
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* BOTONES - Solo maestros o partidas offline */}
        {(!config.onlineGameInProgress || config.isMasterDevice) && (
          <>
            <TouchableOpacity 
              style={styles.continueButton}
              onPress={() => {
                // Si es maestro online, avisar a esclavos
                if (config.onlineGameInProgress && config.isMasterDevice) {
                  connectionManager.sendEvent({
                    type: 'RETURN_TO_WAITING',
                    data: {}
                  });
                }
                navigate('PantallaJuego');
              }}
            >
              <Text style={styles.buttonText}>CONTINUAR A SIGUIENTE RONDA</Text>
            </TouchableOpacity>

            {!hideTerminarButton && (
              <TouchableOpacity style={styles.finalizeButton} onPress={handleFinalizeGame}>
                <Text style={styles.finalizeButtonText}>TERMINAR PARTIDA</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity style={styles.clearButton} onPress={handleClearCurrentGame}>
              <Text style={styles.clearButtonText}>BORRAR PARTIDA ACTUAL</Text>
            </TouchableOpacity>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#8B0000',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  buttonText: {
  color: '#FFFFFF',
  fontSize: 16,
  fontWeight: 'bold',
  fontFamily: 'Roboto',
},
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Roboto',
    textAlign: 'center',
    marginBottom: 16,
  },
  playerStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
  },
  positionBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FF0000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  positionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Roboto',
  },
  playerDetails: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Roboto',
    marginTop: 2,
  },
  totalScore: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF0000',
    fontFamily: 'Roboto',
  },
  gameCard: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#F8F8F8',
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  gameDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Roboto',
  },
  gameLetter: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Roboto',
  },
  letterHighlight: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF8C00',
    fontFamily: 'Roboto',
  },
  gameInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  gameList: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Roboto',
  },
  gameDuration: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Roboto',
  },
  playersScores: {
    marginTop: 4,
  },
  playerScore: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'Roboto',
    marginBottom: 2,
  },
  winnerScore: {
    fontWeight: 'bold',
    color: '#228B22',
  },
  gameDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  detailsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Roboto',
    marginBottom: 8,
  },
  playerDetail: {
    marginBottom: 12,
  },
  playerDetailName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Roboto',
    marginBottom: 4,
  },
  answersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  answer: {
    fontSize: 10,
    color: '#666',
    fontFamily: 'Roboto',
    width: '50%',
    marginBottom: 2,
  },
  finalizeButton: {
    backgroundColor: '#228B22',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  finalizeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
  },
  clearButton: {
    backgroundColor: '#FF0000',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tableCell: {
    padding: 10,
    fontSize: 14,
    fontFamily: 'Roboto',
    textAlign: 'center',
    color: '#333',
  },
  tableHeader: {
    fontWeight: 'bold',
    backgroundColor: '#F0F0F0',
    color: '#333',
  },
  roundColumn: {
    width: 70,
    minWidth: 70,
  },
  winnerCell: {
    fontWeight: 'bold',
    color: '#228B22',
    backgroundColor: '#E8F5E9',
  },
  totalRow: {
    backgroundColor: '#F5F5F5',
    borderTopWidth: 2,
    borderTopColor: '#333',
  },
  totalCell: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
  },
  winnerTotalCell: {
    color: '#228B22',
    fontSize: 18,
  },
  tableContainer: {
    width: '100%',
  },
  table: {
    width: '100%',
  },
  scoreColumnFlex: {
    flex: 1,
    paddingHorizontal: 8,
  },
  paperModeIcon: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    fontSize: 16,
  },
  buttonContainer: {
    marginTop: 16,
  },
  continueButton: {
  backgroundColor: '#FF8C00',  // Naranja
  paddingVertical: 16,
  paddingHorizontal: 24,
  borderRadius: 8,
  alignItems: 'center',
  marginHorizontal: 16,
  marginBottom: 12,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 6,
  elevation: 8,
},
});

export default PartidaActual;