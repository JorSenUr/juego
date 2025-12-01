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
import { getCurrentConfig } from '../utils/gameConfig';
import { loadGameHistory, clearGameHistory, loadCurrentGame, deleteGameEntry } from '../data/storage';
import type { GameHistoryEntry } from '../data/storage';
import PartidaActual from './PartidaActual';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';



interface PuntuacionesProps {
  navigate: (screen: 'MenuPrincipal' | 'Configuracion' | 'PantallaJuego' | 'Puntuaciones' | 'ReglasJuego' | 'ConfiguracionPartida' | 'PartidaActual') => void;
  goBack: () => void;
}

type TabType = 'actual' | 'estadisticas';

  type GroupedGame = {
    gameId: string;
    date: string;
    roundsCount: number;
    totalDuration: string;
    players: Array<{ name: string; totalScore: number }>;
    rounds: GameHistoryEntry[];
  };

  const Puntuaciones = ({ navigate, goBack }: PuntuacionesProps) => {
    const [activeTab, setActiveTab] = useState<TabType>('estadisticas');
    const [gameHistory, setGameHistory] = useState<GameHistoryEntry[]>([]);
    const [selectedGame, setSelectedGame] = useState<string | null>(null);
    const [hasCurrentGame, setHasCurrentGame] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const config = getCurrentConfig();

    useEffect(() => {
      initializeTab();
    }, []);

    const initializeTab = async () => {
      setIsLoading(true);
      
      const currentGame = await loadCurrentGame();
      const hasGame = currentGame !== null && currentGame.rounds.length > 0;
      
      setHasCurrentGame(hasGame);
      
      // Solo cambiar a 'actual' si hay juego en curso
      if (hasGame) {
        setActiveTab('actual');
      }
      
      // Cargar historial
      const history = await loadGameHistory();
      setGameHistory(history);
      
      setIsLoading(false);
    };

  const getWinner = (game: GameHistoryEntry): { name: string; score: number } => {
    return game.players.reduce((prev, current) => 
      prev.score > current.score ? prev : current
    );
  };

const getPlayerStats = () => {
  const config = getCurrentConfig();
  const favoritePlayers = config.favoritePlayers || [];
  
  // Agrupar rondas por gameId
  const gamesByGameId = new Map<string, GameHistoryEntry[]>();
  gameHistory.forEach(entry => {
    const id = entry.gameId || entry.id;
    if (!gamesByGameId.has(id)) {
      gamesByGameId.set(id, []);
    }
    gamesByGameId.get(id)!.push(entry);
  });
  
  // Calcular estadísticas por jugador
  const stats: { 
    [key: string]: { 
      totalRounds: number;
      totalScore: number;
      gamesWon: number;
    } 
  } = {};
  
  // Por cada partida (conjunto de rondas con mismo gameId)
  gamesByGameId.forEach((rounds) => {
    // Calcular totales por jugador en esta partida
    const gameTotals = new Map<string, number>();
    
    rounds.forEach(round => {
      round.players.forEach(player => {
        const current = gameTotals.get(player.name) || 0;
        gameTotals.set(player.name, current + player.score);
        
        // Inicializar stats si no existe
        if (!stats[player.name]) {
          stats[player.name] = {
            totalRounds: 0,
            totalScore: 0,
            gamesWon: 0
          };
        }
        
        stats[player.name].totalRounds++;
        stats[player.name].totalScore += player.score;
      });
    });
    
    // Determinar ganador(es) de esta partida
    const maxScore = Math.max(...Array.from(gameTotals.values()));
    const winners = Array.from(gameTotals.entries())
      .filter(([_, score]) => score === maxScore)
      .map(([name, _]) => name);
    
    // Solo contar victoria si hay UN ÚNICO ganador
    if (winners.length === 1) {
      stats[winners[0]].gamesWon++;
    }
  });
  
  // Filtrar solo favoritos y formatear
  return favoritePlayers
    .filter(name => stats[name]) // Solo incluir favoritos con datos
    .map(name => ({
      name,
      totalRounds: stats[name].totalRounds,
      totalScore: stats[name].totalScore,
      averageScore: Math.round(stats[name].totalScore / stats[name].totalRounds * 10) / 10,
      gamesWon: stats[name].gamesWon
    }))
    .sort((a, b) => b.totalScore - a.totalScore); // Ordenar por puntuación total
};

  const getGroupedGames = (): Array<{
    gameId: string;
    date: string;
    roundsCount: number;
    totalDuration: string;
    players: Array<{ name: string; totalScore: number }>;
    rounds: GameHistoryEntry[];
  }> => {
    const grouped = new Map<string, GameHistoryEntry[]>();
    
    // Agrupar por gameId
    gameHistory.forEach(entry => {
      const id = entry.gameId || entry.id;
      if (!grouped.has(id)) {
        grouped.set(id, []);
      }
      grouped.get(id)!.push(entry);
    });
    
    // Transformar a formato deseado
    return Array.from(grouped.entries()).map(([gameId, rounds]) => {
      // Ordenar rondas por timestamp
      const sortedRounds = rounds.sort((a, b) => a.timestamp - b.timestamp);
      
      // Calcular puntuaciones totales por jugador
      const playerScores = new Map<string, number>();
      sortedRounds.forEach(round => {
        round.players.forEach(player => {
          const current = playerScores.get(player.name) || 0;
          playerScores.set(player.name, current + player.score);
        });
      });
      
      // Convertir a array y ordenar por puntuación descendente
      const players = Array.from(playerScores.entries())
        .map(([name, totalScore]) => ({ name, totalScore }))
        .sort((a, b) => b.totalScore - a.totalScore);
      
      // Calcular duración total
      const totalMs = sortedRounds.reduce((sum, round) => {
        const [min, sec] = round.duration.split(':').map(Number);
        return sum + (min * 60 + sec) * 1000;
      }, 0);
      const totalMin = Math.floor(totalMs / 60000);
      const totalSec = Math.floor((totalMs % 60000) / 1000);
      const totalDuration = `${totalMin}:${totalSec.toString().padStart(2, '0')}`;
      
      // Mantener fecha en formato dd/mm/yyyy
      const firstRound = sortedRounds[0];
      const dateMatch = firstRound.date.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      const formattedDate = dateMatch 
        ? `${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]}`
        : firstRound.date;
      
      return {
        gameId,
        date: formattedDate,
        roundsCount: sortedRounds.length,
        totalDuration,
        players,
        rounds: sortedRounds
      };
    }).sort((a, b) => b.rounds[0].timestamp - a.rounds[0].timestamp); // Más reciente primero
  };

const getChartDataNative = () => {
  const groupedGames = getGroupedGames();
  const playerStatsData = getPlayerStats(); // Usar stats en lugar de config
  
  const totalGames = groupedGames.length;
  const labels = groupedGames.map((_, index) => (totalGames - index).toString()).reverse(); // "7", "6", "5"... -> invertido
  const datasets = playerStatsData.map((player, index) => ({
    data: groupedGames.map(game => {
      const playerInGame = game.players.find(p => p.name === player.name);
      return playerInGame ? playerInGame.totalScore : 0; // Puntuación total, no promedio
    }).reverse(),
    color: () => PLAYER_COLORS[index % PLAYER_COLORS.length],
    strokeWidth: 2
  }));

  return { labels, datasets };
};
  
  const clearHistory = () => {
    Alert.alert(
      'BORRAR HISTORIAL',
      '¿Estás seguro de que quieres eliminar todo el historial de partidas?',
      [
        { text: 'CANCELAR', style: 'cancel' },
        { 
          text: 'BORRAR TODO', 
          style: 'destructive',
          onPress: async () => {
            await clearGameHistory();
            await initializeTab();
          }
        }
      ]
    );
  };

  const deleteGame = (gameId: string) => {
    Alert.alert(
      'ELIMINAR PARTIDA',
      '¿Estás seguro de que quieres eliminar esta partida del historial?',
      [
        { text: 'CANCELAR', style: 'cancel' },
        { 
          text: 'ELIMINAR', 
          style: 'destructive',
          onPress: async () => {
            // Eliminar todas las rondas con este gameId
            const roundsToDelete = gameHistory.filter(entry => entry.gameId === gameId);
            
            for (const round of roundsToDelete) {
              await deleteGameEntry(round.id);
            }
            
            // Recargar historial
            await initializeTab();
          }
        }
      ]
    );
  };

  const playerStats = getPlayerStats();
  const PLAYER_COLORS = [
    '#FF0000', // Rojo
    '#0000FF', // Azul
    '#228B22', // Verde
    '#FF8C00', // Naranja
    '#8B008B', // Púrpura
    '#DC143C'  // Carmesí
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* TABS */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'actual' && styles.activeTab]}
          onPress={() => setActiveTab('actual')}
          disabled={!hasCurrentGame}
        >
          <Text style={[
            styles.tabText, 
            activeTab === 'actual' && styles.activeTabText,
            !hasCurrentGame && styles.disabledTabText
          ]}>
            PARTIDA ACTUAL
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'estadisticas' && styles.activeTab]}
          onPress={() => setActiveTab('estadisticas')}
        >
          <Text style={[styles.tabText, activeTab === 'estadisticas' && styles.activeTabText]}>
            ESTADÍSTICAS
          </Text>
        </TouchableOpacity>
      </View>

      {/* LOADING */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      ) : activeTab === 'actual' ? (
        <PartidaActual navigate={navigate} goBack={goBack} hideTerminarButton={true} />
      ) : (
        <ScrollView style={styles.content}>
          
      {/* ESTADÍSTICAS GENERALES */}
      <View style={styles.section}>
        {playerStats.length > 0 ? (
          <>
            {playerStats.map((player, index) => {
              const color = PLAYER_COLORS[index % PLAYER_COLORS.length];
              return (
                <View key={player.name} style={styles.playerStatsRow}>
                  <View style={[styles.colorBadge, { backgroundColor: color }]} />
                  <View style={styles.playerInfo}>
                    <Text style={styles.playerName}>{player.name}</Text>
                    <Text style={styles.playerGamesWon}>
                      {player.gamesWon} {player.gamesWon === 1 ? 'partida ganada' : 'partidas ganadas'}
                    </Text>
                  </View>
                  <Text style={styles.playerTotalScore}>{player.totalScore}</Text>
                </View>
              );
            })}
          </>
        ) : (
          <Text style={styles.emptyText}>
            No hay estadísticas de jugadores favoritos.{'\n\n'}
            Marca jugadores como favoritos (⭐) en la pantalla de Configuración de Partida.
          </Text>
        )}
      </View>

{/* GRÁFICO DE EVOLUCIÓN */}
{playerStats.length > 0 && getGroupedGames().length > 1 && (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>EVOLUCIÓN</Text>
    <LineChart
      data={getChartDataNative()}
      width={Dimensions.get('window').width - 60}
      height={220}
      chartConfig={{
        backgroundColor: '#FFFFFF',
        backgroundGradientFrom: '#FFFFFF',
        backgroundGradientTo: '#FFFFFF',
        decimalPlaces: 0,
        color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        labelColor: (opacity = 1) => `rgba(102, 102, 102, ${opacity})`,
        style: { borderRadius: 16 },
        propsForDots: { r: '4' }
      }}
      withVerticalLabels={true}
      withHorizontalLabels={true}
      fromZero={true}
      bezier
      style={{ marginVertical: 8, borderRadius: 16 }}
    />
  </View>
)}

{/* HISTORIAL DE PARTIDAS */}
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>HISTORIAL DE PARTIDAS</Text>
    {(() => {
      const groupedGames = getGroupedGames();
      return groupedGames.length > 0 ? (
        <>
          {groupedGames.map((game) => {
            const isPaperMode = game.rounds.every(r => r.mode === 'paper');
            const hasDetails = !isPaperMode;
            
            return (
              <TouchableOpacity 
                key={game.gameId}
                style={styles.gameCard}
                onPress={() => hasDetails && setSelectedGame(selectedGame === game.gameId ? null : game.gameId)}
                disabled={!hasDetails}
              >
                {/* Línea compacta: fecha - rondas - icono paperMode */}
                <Text style={styles.gameCompactHeader}>
                  {game.date} - {game.roundsCount} {game.roundsCount === 1 ? 'ronda' : 'rondas'}
                  {isPaperMode && ' 📝'}
                </Text>
                
                {/* Puntuaciones en una línea */}
                <Text style={styles.gameScoresCompact}>
                  {game.players.map((p, idx) => (
                    `${p.name}: ${p.totalScore} pts${idx < game.players.length - 1 ? ' | ' : ''}`
                  )).join('')}
                </Text>
                
                {/* Botón eliminar - esquina superior derecha */}
                <TouchableOpacity 
                  style={styles.deleteButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    deleteGame(game.gameId);
                  }}
                >
                  <Text style={styles.deleteButtonText}>🗑️</Text>
                </TouchableOpacity>
                
                {/* Vista expandida - solo si NO es papel y boli */}
                {selectedGame === game.gameId && hasDetails && (
                  <View style={styles.gameDetails}>
                    <Text style={styles.detailsTitle}>RONDAS:</Text>
                    {game.rounds.map((round, idx) => (
                      <View key={round.id} style={styles.roundDetail}>
                        <View style={styles.roundHeader}>
                          <Text style={styles.roundNumber}>Ronda {idx + 1}</Text>
                          <Text style={styles.roundLetter}>Letra: {round.letter}</Text>
                        </View>
                        <Text style={styles.roundList}>{round.listName}</Text>
                        <Text style={styles.roundDuration}>Duración: {round.duration}</Text>
                        
                        {/* Puntuaciones de la ronda */}
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
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </>
      ) : (
        <Text style={styles.emptyText}>No hay partidas registradas aún.</Text>
      );
    })()}
  </View>

      {/* BOTÓN LIMPIAR HISTORIAL */}
        {gameHistory.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={clearHistory}>
            <Text style={styles.clearButtonText}>BORRAR HISTORIAL</Text>
          </TouchableOpacity>
        )}

        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 2,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#FF0000',
  },
  tabText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    fontFamily: 'Roboto',
  },
  activeTabText: {
    color: '#FF0000',
  },
  disabledTabText: {
    color: '#CCC',
  },
  content: {
    flex: 1,
    padding: 16,
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
    marginBottom: 16,
    paddingVertical: 8,
  },
  colorBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 12,
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
    color: '#FF0000',
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
  winner: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Roboto',
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
  emptyText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Roboto',
    textAlign: 'center',
    fontStyle: 'italic',
    marginVertical: 20,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Roboto',
  },
  gameCompactHeader: {
  fontSize: 14,
  fontWeight: 'bold',
  color: '#333',
  fontFamily: 'Roboto',
  marginBottom: 6,
},
gameScoresCompact: {
  fontSize: 13,
  color: '#666',
  fontFamily: 'Roboto',
},
roundDetail: {
  backgroundColor: '#F8F8F8',
  borderRadius: 6,
  padding: 12,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: '#E0E0E0',
},
roundHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 6,
},
roundNumber: {
  fontSize: 13,
  fontWeight: 'bold',
  color: '#8B0000',
  fontFamily: 'Roboto',
},
roundLetter: {
  fontSize: 13,
  fontWeight: 'bold',
  color: '#FF8C00',
  fontFamily: 'Roboto',
},
roundList: {
  fontSize: 12,
  color: '#666',
  fontFamily: 'Roboto',
  marginBottom: 4,
},
roundDuration: {
  fontSize: 12,
  color: '#666',
  fontFamily: 'Roboto',
  marginBottom: 8,
},
paperModeIcon: {
  position: 'absolute',
  bottom: 8,
  right: 8,
  fontSize: 16,
},
playerGamesWon: {
  fontSize: 12,
  color: '#666',
  fontFamily: 'Roboto',
  marginTop: 2,
},
playerTotalScore: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#FF0000',
  fontFamily: 'Roboto',
},
deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
  },
  deleteButtonText: {
    fontSize: 20,
    color: '#FF0000',
  },
});

export default Puntuaciones;