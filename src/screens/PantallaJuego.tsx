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
} from 'react-native';
import { SCATTERGORIES_VERSIONS, getRandomLetter, getListById, getVersionById, generateRandomList, ScattergoriesList } from '../data/scattergoriesLists';
import { GameTimer } from '../utils/timer';
import { getCurrentConfig } from '../utils/gameConfig';
import { saveGameResult, saveCurrentGameRound, finalizeCurrentGame } from '../data/storage';
import { soundManager } from '../utils/soundManager';
import { updateConfig } from '../utils/gameConfig';
import { connectionManager } from '../utils/connectionManager';



interface PantallaJuegoProps {
  navigate: (screen: 'MenuPrincipal' | 'Configuracion' | 'PantallaJuego' | 'Puntuaciones' | 'ReglasJuego' | 'ConfiguracionPartida' | 'PartidaActual') => void;
  goBack: () => void;
  onGameModeChange?: (mode: 'waiting' | 'playing' | 'scoring' | 'offlineScoring' | 'reviewing') => void;
  gameMode?: 'waiting' | 'playing' | 'scoring' | 'offlineScoring' | 'reviewing';
}

type GameMode = 'waiting' | 'playing' | 'scoring' | 'offlineScoring' | 'reviewing';

const PantallaJuego = ({ navigate, goBack, onGameModeChange, gameMode: gameModeFromApp }: PantallaJuegoProps) => {
  //ESTADOS Y REFERENCIAS
  const [gameMode, setGameMode] = useState<GameMode>(gameModeFromApp || 'waiting');
  const [currentLetter, setCurrentLetter] = useState<string>('?');
  const [currentList, setCurrentList] = useState(() => {
    try {
      const config = getCurrentConfig();
      if (config.randomMode) {
        return generateRandomList();
      } else {
        const version = getVersionById(config.selectedVersionId);
        return version?.lists[0] || SCATTERGORIES_VERSIONS[0].lists[0];
      }
    } catch (error) {
      console.log('Error initializing list:', error);
      return SCATTERGORIES_VERSIONS[0].lists[0];
    }
  });
  const [answers, setAnswers] = useState<string[]>(() => {
    try {
      const config = getCurrentConfig();
      let list;
      if (config.randomMode) {
        list = generateRandomList();
      } else {
        const version = getVersionById(config.selectedVersionId);
        list = version?.lists[0] || SCATTERGORIES_VERSIONS[0].lists[0];
      }
      return Array(list.categories.length).fill('');
    } catch (error) {
      console.log('Error initializing answers:', error);
      return Array(12).fill(''); // Fallback
    }
  });
  const [scores, setScores] = useState<number[]>(() => {
    try {
      const config = getCurrentConfig();
      let list;
      if (config.randomMode) {
        list = generateRandomList();
      } else {
        const version = getVersionById(config.selectedVersionId);
        list = version?.lists[0] || SCATTERGORIES_VERSIONS[0].lists[0];
      }
      return Array(list.categories.length).fill(-1);
    } catch (error) {
      console.log('Error initializing scores:', error);
      return Array(12).fill(-1); // Fallback
    }
  });
  const [playerScores, setPlayerScores] = useState<number[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [showTimer, setShowTimer] = useState<boolean>(false);
  const [isFirstTime, setIsFirstTime] = useState<boolean>(true);
  const [showListDropdown, setShowListDropdown] = useState<boolean>(false);
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);
  const timerRef = useRef<GameTimer | null>(null);
  const [soundsMuted, setSoundsMuted] = useState<boolean>(getCurrentConfig().soundsMuted);


  // FUNCIONES Y EFECTOS
  useEffect(() => {
    initializeGame();
    return () => {
      if (timerRef.current) {
        timerRef.current.stop();
      }
    // Detener sonidos sin reproducir el final
    soundManager.stopTimerSilent();      
    };
  }, []);

  useEffect(() => {
    if (onGameModeChange) {
      onGameModeChange(gameMode);
    }
  }, [gameMode]); // Solo se ejecuta cuando gameMode cambia

  useEffect(() => {
    if (gameModeFromApp && gameModeFromApp !== gameMode) {
      setGameMode(gameModeFromApp);
    }
  }, [gameModeFromApp]);

  // ========== LISTENER PARA MODO ONLINE ==========
  useEffect(() => {
    const config = getCurrentConfig();
    
    // Solo si está en partida online
    if (!config.onlineGameInProgress) return;
    
    const handleOnlineEvents = (event: any) => {
      console.log('🎮 PantallaJuego recibió evento:', event.type);
      
      if (event.type === 'ROUND_START') {
        handleRoundStartReceived(event);
      }
    };
    
    connectionManager.onEvent(handleOnlineEvents);
    
    return () => {
      connectionManager.removeEventListener(handleOnlineEvents);
    };
  }, []); // Solo montar/desmontar

  // ========== HANDLER ROUND_START ==========
  const handleRoundStartReceived = (event: any) => {
    console.log('📩 Procesando ROUND_START:', event.data);
    
    const { letter, listId, versionId, listName, categories, timerDuration, timestamp } = event.data;
    
    // 1. Actualizar letra
    setCurrentLetter(letter);
    
    // 2. Actualizar lista (con datos del evento)
    setCurrentList({
      id: listId,
      name: listName,
      categories: categories || []
    });
    
    // 3. Limpiar arrays
    const numCategories = categories?.length || 12;
    setAnswers(Array(numCategories).fill(''));
    setScores(Array(numCategories).fill(-1));
    
    const config = getCurrentConfig();
    setPlayerScores(Array(config.numberOfPlayers).fill(''));
    
    // 4. Calcular delay de red
    const delay = Date.now() - timestamp;
    const adjustedDuration = timerDuration - delay;
    
    console.log(`⏱️ Timer: duración=${timerDuration}ms, delay=${delay}ms, ajustado=${adjustedDuration}ms`);
    
    // 5. Crear e iniciar timer sincronizado
    const timerConfig = {
      minMinutes: config.timerMinMinutes,
      maxMinutes: config.timerMaxMinutes,
      showTimer: config.showTimer,
      warningSeconds: config.warningSeconds
    };
    
    timerRef.current = new GameTimer(timerConfig);
    
    // Inyectar duración ajustada directamente
    // (Necesitaremos modificar GameTimer para esto)
    timerRef.current.setDuration(adjustedDuration);
    
    setShowTimer(config.showTimer);
    
    // 6. Iniciar timer
    soundManager.startTimer();
    
    timerRef.current.start(
      (remaining) => setTimeRemaining(remaining),
      () => handleTimeUp(),
      config.warningEnabled 
        ? () => Alert.alert('¡ATENCIÓN!', '¡Quedan pocos segundos!')
        : undefined
    );
    
    // 7. Cambiar a playing
    setGameMode('playing');
    setIsFirstTime(false);
    
    console.log('✅ ROUND_START procesado correctamente');
  };

  const initializeGame = () => {
    if (timerRef.current) {
      timerRef.current.stop();
    }
    
    if (isFirstTime) {
      setCurrentLetter('?');
      setGameMode('waiting');
    } else {
      startNewGame();
      return;
    }
    
    // Usar la longitud dinámica de las categorías
    setAnswers(Array(currentList.categories.length).fill(''));
    setScores(Array(currentList.categories.length).fill(-1));
    
    const config = getCurrentConfig();
    setPlayerScores(Array(config.numberOfPlayers).fill(''));
  };

  const startNewGame = () => {
    const gameConfig = getCurrentConfig();
    
    const timerConfig = {
      minMinutes: gameConfig.timerMinMinutes,
      maxMinutes: gameConfig.timerMaxMinutes,
      showTimer: gameConfig.showTimer,
      warningSeconds: gameConfig.warningSeconds
    };

    timerRef.current = new GameTimer(timerConfig);
    setShowTimer(gameConfig.showTimer);
    
    const letter = getRandomLetter(gameConfig.availableLetters);
    setCurrentLetter(letter);

    if (gameConfig.onlineGameInProgress && gameConfig.isMasterDevice) {
      const timerDuration = timerRef.current.getDuration(); // Obtener duración calculada
      
      connectionManager.startRound({
        letter: letter,
        listId: currentList.id,
        versionId: gameConfig.selectedVersionId,
        listName: currentList.name,
        categories: currentList.categories,
        timerDuration: timerDuration
      });
      
      console.log('📤 ROUND_START enviado:', { letter, listName: currentList.name, duration: timerDuration });
    }

    setGameMode('playing');
    setIsFirstTime(false);
    
    setAnswers(Array(currentList.categories.length).fill(''));
    setScores(Array(currentList.categories.length).fill(-1));
    setPlayerScores(Array(gameConfig.numberOfPlayers).fill(''));
    
    if (timerRef.current) {
      soundManager.startTimer();
      
      timerRef.current.start(
        (remaining) => setTimeRemaining(remaining),
        () => handleTimeUp(),
        gameConfig.warningEnabled 
          ? () => Alert.alert('¡ATENCIÓN!', '¡Quedan pocos segundos!')
          : undefined
      );
    }
  };

  const startTimer = () => {
    startNewGame();
  };

const handleLetterContainerPress = () => {
    // Si es ESCLAVO en partida ONLINE
    if (!config.isMasterDevice && config.onlineGameInProgress) {
      // NO hacer nada en waiting, esperar ROUND_START
      return;
    }
    
    // Si es ESCLAVO en partida OFFLINE
    if (!config.isMasterDevice && !config.freeMode) {
      if (gameMode === 'waiting') {
        // 1. Si es dispositivo ESCLAVO (y no freeMode)
        if (!config.isMasterDevice && !config.freeMode) {
          // Solo funciona en waiting para ir a scoring
          if (gameMode === 'waiting') {
            if (config.paperMode) {
              setGameMode('offlineScoring');
            } else {
              setGameMode('scoring');
            }
          }
          return; // ← SALIR AQUÍ, no ejecutar el resto
        }
      }
      return;
    }
    // 2. Si llegamos aquí, es MAESTRO o freeMode
    // → TODO EL CÓDIGO ACTUAL SE MANTIENE IGUAL
    if (gameMode === 'waiting') {
      startTimer();
    } else if (gameMode === 'playing') {
      handleManualTimeUp();
    } else if (gameMode === 'reviewing') {
      initializeGame();
    }
  };

  const handleTimeUp = () => {
    // Detener sonidos
    soundManager.stopTimer();
    const config = getCurrentConfig();
    
    // Modo libre: volver directamente a waiting
    if (config.freeMode) {
      setGameMode('waiting');
      setCurrentLetter('?');
      if (config.endGameAlertEnabled) {
        Alert.alert(
          config.endGameAlertTitle,
          '',
          [{ text: 'OK' }]
        );
      }
      return;
    }
    
    // Modo papel y boli: ir a offlineScoring
    if (config.paperMode) {
      setGameMode('offlineScoring');
      if (config.endGameAlertEnabled) {
        Alert.alert(
          config.endGameAlertTitle,
          '',
          [{ text: 'PUNTUAR' }]
        );
      }
      return;
    }
    
    // Modo normal: ir a scoring por categorías
    setGameMode('scoring');
    if (config.endGameAlertEnabled) {
      Alert.alert(
        config.endGameAlertTitle,
        '',
        [{ text: 'PUNTUAR' }]
      );
    }
  };

  const handleManualTimeUp = () => {
    Alert.alert(
      '¿TERMINAR TIEMPO?',
      '¿Estás seguro de que quieres terminar el tiempo manualmente?',
      [
        { text: 'CANCELAR', style: 'cancel' },
        { 
          text: 'SÍ, TERMINAR', 
          onPress: () => {
            if (timerRef.current) {
              timerRef.current.stop();
            }
            // Detener sonidos
            soundManager.stopTimer();            
            const config = getCurrentConfig();
            
            // Modo libre: volver directamente a waiting SIN alert
            if (config.freeMode) {
              setGameMode('waiting');
              setCurrentLetter('?');
              return;
            }
            
            // Modo papel y boli: ir a offlineScoring SIN alert
            if (config.paperMode) {
              setGameMode('offlineScoring');
              return;
            }
            
            // Modo normal: ir a scoring SIN alert
            setGameMode('scoring');
          }
        }
      ]
    );
  };

  /*
  const updateAnswer = (index: number, text: string) => {
    if (gameMode === 'playing' || (gameMode === 'waiting' && !config.isMasterDevice)) {
      const newAnswers = [...answers];
      newAnswers[index] = text;
      setAnswers(newAnswers);
    }
  };
  */

  const updateAnswer = (index: number, text: string) => {
    const config = getCurrentConfig(); // <-- FIX: Obtener config fresca
    
    // Condición idéntica a la que usaremos en la prop 'editable'
    const isEditable = gameMode === 'playing' || 
                      (gameMode === 'waiting' && !config.isMasterDevice && !config.onlineGameInProgress);

    if (isEditable) {
      const newAnswers = [...answers];
      newAnswers[index] = text;
      setAnswers(newAnswers);
    }
  };

  const updateScore = (index: number, score: number) => {
    const newScores = [...scores];
    newScores[index] = score;
    setScores(newScores);
  };

  const updatePlayerScore = (playerIndex: number, score: string) => {
    const numScore = parseInt(score) || 0;
    const newPlayerScores = [...playerScores];
    newPlayerScores[playerIndex] = numScore;
    setPlayerScores(newPlayerScores);
  };

  const handleScoreButtonPress = (categoryIndex: number, score: number) => {
    if (score === -1) {
      Alert.prompt(
        'Puntuación manual',
        'Introduce la puntuación para esta respuesta:',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'OK', 
            onPress: (value) => {
              const numValue = parseInt(value || '0');
              if (!isNaN(numValue) && numValue >= 0) {
                updateScore(categoryIndex, numValue);
              }
            }
          }
        ],
        'plain-text',
        scores[categoryIndex].toString()
      );
    } else {
      updateScore(categoryIndex, score);
    }
  };

  const getTotalScore = (): number => {
    return scores.reduce((total, score) => {
      return total + (score >= 0 ? score : 0);
    }, 0);
  };

  const handleFinishScoring = () => {
    const config = getCurrentConfig();
    
    // Pre-rellenar la puntuación del jugador 1 con su puntuación calculada
    //const initialScores = [...playerScores];
    const initialScores = Array(config.numberOfPlayers).fill('');
    initialScores[0] = getTotalScore();
    setPlayerScores(initialScores);
    
    // Ir a offlineScoring (reutilizamos la pantalla existente)
    setGameMode('offlineScoring');
  };

 const handleSaveScore = async () => {
  const config = getCurrentConfig();
  
  // Preparar los datos de la partida
  const currentDate = new Date();
  const dateString = `${currentDate.getDate().toString().padStart(2, '0')}/${(currentDate.getMonth() + 1).toString().padStart(2, '0')}/${currentDate.getFullYear()} - ${currentDate.getHours().toString().padStart(2, '0')}:${currentDate.getMinutes().toString().padStart(2, '0')}`;
  
  let playersData: Array<{ name: string; score: number; answers?: string[] }> = [];
  let gameMode: 'normal' | 'paper' | 'free' = 'normal';
  
  if (config.freeMode) {
    gameMode = 'free';
  } else if (config.paperMode) {
    gameMode = 'paper';
    playersData = config.playerNames.slice(0, config.numberOfPlayers).map((name, index) => ({
      name,
      score: playerScores[index] || 0,
      answers: []
    }));
  } else {
    gameMode = 'normal';
    playersData = config.playerNames.slice(0, config.numberOfPlayers).map((name, index) => ({
      name,
      score: index === 0 ? getTotalScore() : (playerScores[index] || 0),
      answers: index === 0 ? [...answers] : []
    }));
  }
  
  // Calcular duración del juego
  let duration = '0:00';
  if (timerRef.current) {
    const totalDuration = timerRef.current.getDuration();
    const elapsed = totalDuration - timeRemaining;
    duration = formatTime(elapsed);
  }
  
  const roundData = {
    date: dateString,
    letter: currentLetter,
    listName: currentList.name,
    listId: currentList.id,
    versionId: config.selectedVersionId,
    players: playersData,
    duration: duration,
    mode: gameMode
  };
  
  // Solo guardar si NO es modo libre
  if (!config.freeMode) {
    try {
      await saveCurrentGameRound(roundData);
      
      console.log('Ronda guardada exitosamente en historial y partida actual');
    } catch (error) {
      console.error('Error al guardar la ronda:', error);
      Alert.alert(
        'Error',
        'No se pudo guardar la ronda. Por favor, intenta de nuevo.',
        [{ text: 'OK' }]
      );
      return;
    }
  }
  
  // Mostrar mensaje de confirmación
  if (config.paperMode || !config.freeMode) {
    Alert.alert(
      'Puntuación guardada',
      'La ronda ha sido registrada.',
      [
        {
    text: 'TERMINAR PARTIDA',
    style: 'destructive',
    onPress: () => {
      Alert.alert(
        'Partida Terminada',
        'La partida se ha guardado en el historial.',
        [{ 
          text: 'OK',
          onPress: async () => {
            await finalizeCurrentGame();
            navigate('Puntuaciones');
          }
        }]
      );
    }
  },
  { 
    text: 'NUEVA RONDA', 
    onPress: () => {
      setGameMode('waiting');
      setCurrentLetter('?');
      setAnswers(Array(currentList.categories.length).fill(''));
      setScores(Array(currentList.categories.length).fill(-1));
      setPlayerScores(Array(config.numberOfPlayers).fill(''));
    }
  },
  { text: 'VER RESULTADOS', onPress: () => navigate('PartidaActual') }
    ]);
  }
  };

  const toggleMute = async () => {
    const newMutedState = !soundsMuted;
    setSoundsMuted(newMutedState);
    await updateConfig({ soundsMuted: newMutedState });
    
    if (newMutedState) {
      soundManager.muteAll();
    } else {
      soundManager.unmuteAll();
    }
  };

  const handleListChange = (listId: number) => {
    const config = getCurrentConfig();
    const newList = getListById(config.selectedVersionId, listId);
    if (newList && gameMode === 'waiting') {
      setCurrentList(newList);
      // Ajustar arrays a la nueva longitud
      setAnswers(Array(newList.categories.length).fill(''));
      setScores(Array(newList.categories.length).fill(-1));
      setShowListDropdown(false);
    }
  };

  const generateNewRandomList = () => {
    if (gameMode === 'waiting') {
      const newList = generateRandomList();
      setCurrentList(newList);
      // Ajustar arrays a la nueva longitud
      setAnswers(Array(newList.categories.length).fill(''));
      setScores(Array(newList.categories.length).fill(-1));
    }
  };

  const toggleListDropdown = () => {
    if (gameMode === 'waiting') {
      setShowListDropdown(!showListDropdown);
    }
  };

  const getContainerColor = (): string => {
    // Esclavo en waiting → Naranja
    if (!config.isMasterDevice && !config.freeMode && gameMode === 'waiting') {
      return '#FF8C00';
    }
    
    // Resto de casos (maestro)
    if (gameMode === 'waiting') return '#8B0000';
    if (gameMode === 'playing') return '#228B22';
    if (gameMode === 'scoring' || gameMode === 'offlineScoring') return '#FF8C00';
    return '#8B0000';
  };

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const config = getCurrentConfig();
  const currentVersion = getVersionById(config.selectedVersionId);

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity 
        style={[
          styles.letterContainer, 
          { backgroundColor: getContainerColor() },
          //!config.isMasterDevice && !config.freeMode && styles.letterContainerDisabled
        ]}
        onPress={handleLetterContainerPress}
        //disabled={!config.isMasterDevice && !config.freeMode}
        disabled={!config.isMasterDevice && config.onlineGameInProgress}
      >

<Text style={{ 
  color: '#fff', 
  fontSize: 14, 
  marginTop: 6, 
  opacity: 0.8 
}}>
  gameMode: {gameMode}
</Text>

        {((config.isMasterDevice || config.freeMode) || 
          (config.onlineGameInProgress && !config.isMasterDevice)) && 
          <Text style={styles.letter}>{currentLetter}</Text>
        }
        {gameMode === 'waiting' && (
          <>
            {(config.isMasterDevice || config.freeMode) ? (
              <Text style={styles.statusText}>PULSA PARA COMENZAR</Text>
            ) : (              
              // MODO ONLINE ESCLAVO
              config.onlineGameInProgress ? (
                <Text style={[styles.statusText, { fontSize: 14, textAlign: 'center'  }]}>
                  ESPERANDO A QUE EL ORGANIZADOR COMIENCE LA RONDA
                </Text>
              ) : (
              <>
                <Text style={[styles.statusText, { fontSize: 14, textAlign: 'center' }]}>
                  LA LETRA Y EL TEMPORIZADOR SÓLO SE MOSTRARÁN EN EL DISPOSITIVO PRINCIPAL
                </Text>
                <Text style={[styles.statusText, { marginTop: 12, fontSize: 14, textAlign: 'center' }]}>
                  PULSA AQUÍ PARA INTRODUCIR LAS PUNTUACIONES CUANDO ACABE EL TIEMPO
                </Text>
              </>
              )
            )}
          </>
        )}
        {gameMode === 'playing' && (
          <Text style={styles.statusText}>PULSA PARA TERMINAR</Text>
        )}
        {gameMode === 'scoring' && (
          <Text style={styles.statusText}>PUNTUANDO: {getTotalScore()} PUNTOS</Text>
        )}
        {gameMode === 'reviewing' && (
          <View style={styles.reviewingContainer}>
            <Text style={styles.statusText}>PULSA PARA NUEVA LETRA</Text>
          </View>
        )}
        {showTimer && gameMode === 'playing' && 
          ((config.isMasterDevice || config.freeMode) || 
          (config.onlineGameInProgress && !config.isMasterDevice)) && (
          <Text style={styles.timer}>{formatTime(timeRemaining)}</Text>
        )}
      </TouchableOpacity>

      <ScrollView style={styles.content}>
        {/* MODO PAPEL Y BOLI: Puntuaciones simples por jugador */}
        {gameMode === 'offlineScoring' && (
          <View style={styles.offlineScoringContainer}>
            <Text style={styles.offlineScoringTitle}>INTRODUCE LAS PUNTUACIONES</Text>
            {config.playerNames.slice(0, config.numberOfPlayers).map((name, index) => {
              // En modo online, solo mostrar MI puntuación (índice 0)
              if (config.onlineGameInProgress && index !== 0) {
                return null;
              }
              
              return (
                <View key={index} style={styles.playerScoreRow}>
                  <Text style={styles.playerScoreName}>{name}:</Text>
                  {index === 0 && !config.paperMode ? (
                    // Jugador 1 en modo normal: no editable
                    <View style={styles.playerScoreInputDisabled}>
                      <Text style={styles.playerScoreTextDisabled}>
                        {playerScores[0]?.toString() || '0'}
                      </Text>
                    </View>
                  ) : (
                    // Demás jugadores o modo papel: editable
                    <TextInput
                      style={styles.playerScoreInput}
                      value={playerScores[index]?.toString() || ''}
                      onChangeText={(text) => updatePlayerScore(index, text)}
                      keyboardType="numeric"
                      placeholder=""
                    />
                  )}
                </View>
              );
            })}
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveScore}>
              <Text style={styles.saveButtonText}>GUARDAR PUNTUACIÓN</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* RESTO DE MODOS: Mostrar categorías */}
        {gameMode !== 'offlineScoring' && (
          <View style={styles.categoriesContainer}>
            {config.randomMode ? (
              <TouchableOpacity 
                style={styles.listTitleContainer}
                onPress={generateNewRandomList}
                disabled={gameMode !== 'waiting'}
              >
                <Text style={styles.listTitle}>{currentList.name.toUpperCase()}</Text>
                <Text style={styles.generateText}>PULSA PARA GENERAR NUEVA</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity 
                  style={styles.listTitleContainer}
                  onPress={toggleListDropdown}
                  disabled={gameMode !== 'waiting'}
                >
                  <Text style={styles.listTitle}>{currentList.name.toUpperCase()}</Text>
                  <Text style={styles.dropdownArrow}>{showListDropdown ? '▲' : '▼'}</Text>
                </TouchableOpacity>

                {showListDropdown && currentVersion && (
                  <View style={styles.dropdown}>
                    {currentVersion.lists.map((list: ScattergoriesList) => (
                      <TouchableOpacity
                        key={list.id}
                        style={[
                          styles.dropdownItem,
                          currentList.id === list.id && styles.selectedDropdownItem
                        ]}
                        onPress={() => handleListChange(list.id)}
                      >
                        <Text style={[
                          styles.dropdownText,
                          currentList.id === list.id && styles.selectedDropdownText
                        ]}>
                          {list.name.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}
            
            {currentList.categories.map((category: string, index: number) => (
              <View key={index} style={styles.categoryRowFlat}>
                <View style={styles.categoryLine}>
                  <Text style={styles.categoryNumber}>{index + 1}.</Text>
                  <Text style={styles.categoryText}>{category.toUpperCase()}</Text>
                  
                  {gameMode === 'scoring' && (
                    <View style={styles.scoreDropdownSimple}>
                      <TouchableOpacity
                        style={styles.scoreButton}
                        onPress={() => setOpenDropdownIndex(openDropdownIndex === index ? null : index)}
                      >
                        <Text style={styles.scoreButtonText}>
                          {scores[index] === -1 ? 0 : scores[index]}
                        </Text>
                      </TouchableOpacity>
                      
                      {openDropdownIndex === index && (
                        <View style={styles.scoreOptions}>
                          {[3, 2, 1, 0].map(value => (
                            <TouchableOpacity
                              key={value}
                              style={[styles.scoreOption, value === 3 && { borderRightWidth: 0 }]}
                              onPress={() => {
                                updateScore(index, value);
                                setOpenDropdownIndex(null);
                              }}
                            >
                              <Text style={styles.scoreOptionText}>{value}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </View>
                
                {!config.paperMode && !config.freeMode && (gameMode === 'waiting' || gameMode === 'playing') && (
                  <TextInput
                    style={styles.answerInputFlat}
                    value={answers[index]}
                    onChangeText={(text) => updateAnswer(index, text)}
                    editable={
                      gameMode === 'playing' || 
                      (gameMode === 'waiting' && !config.isMasterDevice && !config.onlineGameInProgress)
                      //(gameMode === 'waiting' && !config.isMasterDevice)
                    }
                  />
                )}
                                
                {gameMode === 'scoring' && !config.paperMode && (
                  <Text style={styles.answerTextFlat}>
                    {answers[index] || '(sin respuesta)'}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {gameMode === 'scoring' && (
          <View style={styles.confirmContainer}>
            <TouchableOpacity 
              style={styles.confirmButton} 
              onPress={handleFinishScoring}
            >
              <Text style={styles.confirmButtonText}>
                CONTINUAR ({getTotalScore()} puntos)
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.buttonContainer} />
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
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  letterContainer: {
    backgroundColor: '#8B0000',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  letter: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'sans-serif',
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8,
    fontFamily: 'sans-serif',
  },
  reviewingContainer: {
    alignItems: 'center',
  },
  timer: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 10,
    fontFamily: 'sans-serif',
  },
  offlineScoringContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  offlineScoringTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B0000',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Roboto',
  },
  playerScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  playerScoreName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    fontFamily: 'Roboto',
  },
  playerScoreInput: {
    borderWidth: 2,
    borderColor: '#D2691E',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: 'bold',
    backgroundColor: '#FFFFFF',
    color: '#000000',
    width: 100,
    textAlign: 'center',
    fontFamily: 'Roboto',
  },
  saveButton: {
    backgroundColor: '#8B0000',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
  },
  categoriesContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  listTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B0000',
    fontFamily: 'Roboto',
    flex: 1,
    textAlign: 'center',
  },
  generateText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#8B0000',
    fontFamily: 'Roboto',
    opacity: 0.7,
  },
  dropdownArrow: {
    fontSize: 16,
    color: '#8B0000',
    fontWeight: 'bold',
    marginLeft: 8,
    fontFamily: 'Roboto',
  },
  dropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8B0000',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 6,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  selectedDropdownItem: {
    backgroundColor: '#8B0000',
  },
  dropdownText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Roboto',
    textAlign: 'center',
  },
  selectedDropdownText: {
    color: '#FFFFFF',
  },
  categoryRowFlat: {
    marginBottom: 12,
  },
  categoryLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B0000',
    width: 30,
    fontFamily: 'serif',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    fontFamily: 'serif',
    marginLeft: 8,
  },
  answerInputFlat: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: 'bold',
    backgroundColor: '#FFFFFF',
    color: '#000000',
    fontFamily: 'Roboto',
    marginTop: 4,
  },
  answerTextFlat: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
    fontFamily: 'Roboto',
  },
  scoreDropdownSimple: {
    position: 'relative',
  },
  scoreButton: {
    backgroundColor: '#F0F0F0',
    borderWidth: 2,
    borderColor: '#CCC',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
    minWidth: 40,
    alignItems: 'center',
  },
  scoreButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Roboto',
  },
  scoreOptions: {
    position: 'absolute',
    right: 40,
    top: 0,
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderWidth: 2,
    borderColor: '#888',
    borderRadius: 6,
    zIndex: 1000,
  },
  scoreOption: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: '#CCC',
    minWidth: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreOptionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Roboto',
    textAlign: 'center',
  },
  confirmContainer: {
    padding: 16,
  },
  confirmButton: {
    backgroundColor: '#8B0000',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
  },
  buttonContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  playerScoreInputDisabled: {
    borderWidth: 2,
    borderColor: '#999',
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerScoreTextDisabled: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    fontFamily: 'Roboto',
    textAlign: 'center',
  },
  letterContainerDisabled: {
    opacity: 0.5,
  },
});

export default PantallaJuego;