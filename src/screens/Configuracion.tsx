import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { getCurrentConfig, updateConfig, resetConfigToDefault, GameConfig } from '../utils/gameConfig';
import { SCATTERGORIES_VERSIONS } from '../data/scattergoriesLists';

interface ConfiguracionProps {
  navigate: (screen: 'MenuPrincipal' | 'Configuracion' | 'PantallaJuego' | 'Puntuaciones' | 'ReglasJuego' | 'ConfiguracionPartida') => void;
  goBack: () => void;
}

const Configuracion = ({ navigate, goBack }: ConfiguracionProps) => {
  const [config, setConfig] = useState<GameConfig>(getCurrentConfig());
  const [minTimeText, setMinTimeText] = useState<string>(getCurrentConfig().timerMinMinutes.toString());
  const [maxTimeText, setMaxTimeText] = useState<string>(getCurrentConfig().timerMaxMinutes.toString());

  useEffect(() => {
    return () => {
      if (config.availableLetters && config.availableLetters.length === 0) {
        const defaultLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'L', 'M', 'N', 'O', 'P', 'R', 'S', 'T', 'U', 'V'];
        updateConfig({ availableLetters: defaultLetters });
      }
    };
  }, [config.availableLetters]);

  const handleConfigChange = (key: keyof GameConfig, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    
    if (key === 'availableLetters' && Array.isArray(value) && value.length === 0) {
      return;
    }
    
    updateConfig({ [key]: value });
  };

  const handleMinTimeChange = (text: string) => {
    setMinTimeText(text);
    const numValue = parseFloat(text);
    if (!isNaN(numValue) && numValue >= 0) {
      handleConfigChange('timerMinMinutes', numValue);
    }
  };

  const handleMaxTimeChange = (text: string) => {
    setMaxTimeText(text);
    const numValue = parseFloat(text);
    if (!isNaN(numValue) && numValue >= 0) {
      handleConfigChange('timerMaxMinutes', numValue);
    }
  };

  const toggleLetter = (letter: string) => {
    const currentLetters = config.availableLetters || [];
    const newLetters = currentLetters.includes(letter)
      ? currentLetters.filter(l => l !== letter)
      : [...currentLetters, letter].sort();
    handleConfigChange('availableLetters', newLetters);
  };

  const selectAllLetters = () => {
    const allLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
    handleConfigChange('availableLetters', allLetters);
  };

  const selectDefaultLetters = () => {
    const defaultLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'L', 'M', 'N', 'O', 'P', 'R', 'S', 'T', 'U', 'V'];
    handleConfigChange('availableLetters', defaultLetters);
  };

  const clearAllLetters = () => {
    handleConfigChange('availableLetters', []);
  };

  const handleResetConfig = () => {
    Alert.alert(
      'RESETEAR CONFIGURACIÓN',
      '¿Estás seguro de que quieres volver a los valores por defecto? Se perderán todos los cambios.',
      [
        { text: 'CANCELAR', style: 'cancel' },
        { 
          text: 'RESETEAR', 
          style: 'destructive',
          onPress: () => {
            resetConfigToDefault();
            const defaultConfig = getCurrentConfig();
            setConfig(defaultConfig);
            setMinTimeText(defaultConfig.timerMinMinutes.toString());
            setMaxTimeText(defaultConfig.timerMaxMinutes.toString());
          }
        }
      ]
    );
  };

  const allLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
  const selectedLetters = config.availableLetters || [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        
        {/* 1. SONIDOS */}
        <Text style={styles.sectionTitleOutside}>SONIDOS</Text>
        <View style={styles.section}>
          <View style={styles.switchRow}>
            <Text style={styles.label}>SONIDO TIMER:</Text>
            <Switch
              value={config.soundTimerEnabled}
              onValueChange={(value) => handleConfigChange('soundTimerEnabled', value)}
              trackColor={{ false: '#767577', true: '#D2691E' }}
              thumbColor={config.soundTimerEnabled ? '#8B0000' : '#f4f3f4'}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.label}>SONIDO FINAL:</Text>
            <Switch
              value={config.soundEndEnabled}
              onValueChange={(value) => handleConfigChange('soundEndEnabled', value)}
              trackColor={{ false: '#767577', true: '#D2691E' }}
              thumbColor={config.soundEndEnabled ? '#8B0000' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* 2. LISTAS */}
        <Text style={styles.sectionTitleOutside}>CONFIGURACIÓN DE LISTAS</Text>
        <View style={styles.section}>
          <View style={styles.switchRow}>
            <Text style={styles.label}>MODO ALEATORIO:</Text>
            <Switch
              value={config.randomMode}
              onValueChange={(value) => handleConfigChange('randomMode', value)}
              trackColor={{ false: '#767577', true: '#D2691E' }}
              thumbColor={config.randomMode ? '#8B0000' : '#f4f3f4'}
            />
          </View>
          
          {!config.randomMode && (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>VERSIÓN DE LISTAS:</Text>
                <View style={styles.versionContainer}>
                  {SCATTERGORIES_VERSIONS.map((version) => (
                    <TouchableOpacity
                      key={version.id}
                      style={[
                        styles.versionButton,
                        config.selectedVersionId === version.id && styles.selectedVersionButton
                      ]}
                      onPress={() => handleConfigChange('selectedVersionId', version.id)}
                    >
                      <Text style={[
                        styles.versionButtonText,
                        config.selectedVersionId === version.id && styles.selectedVersionButtonText
                      ]}>
                        {version.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          )}
        </View>

        {/* 3. LETRAS */}
        <Text style={styles.sectionTitleOutside}>LETRAS DISPONIBLES ({selectedLetters.length})</Text>
        <View style={styles.section}>
          <View style={styles.lettersButtonRow}>
            <TouchableOpacity style={styles.smallButton} onPress={selectDefaultLetters}>
              <Text style={styles.smallButtonText}>POR DEFECTO</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.smallButton} onPress={selectAllLetters}>
              <Text style={styles.smallButtonText}>TODAS</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.smallButton, styles.clearButton]} onPress={clearAllLetters}>
              <Text style={styles.smallButtonText}>NINGUNA</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.lettersGrid}>
            {allLetters.map((letter) => (
              <TouchableOpacity
                key={letter}
                style={[
                  styles.letterButton,
                  selectedLetters.includes(letter) && styles.selectedLetterButton
                ]}
                onPress={() => toggleLetter(letter)}
              >
                <Text style={[
                  styles.letterButtonText,
                  selectedLetters.includes(letter) && styles.selectedLetterButtonText
                ]}>
                  {letter}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedLetters.length === 0 && (
            <Text style={styles.warningText}>
              ⚠️ Al salir se guardarán las letras por defecto si no seleccionas ninguna
            </Text>
          )}
        </View>

        {/* 4. GESTIÓN DE JUGADORES FAVORITOS */}
        <Text style={styles.sectionTitleOutside}>JUGADORES FAVORITOS</Text>
        <View style={styles.section}>
          {config.favoritePlayers && config.favoritePlayers.length > 0 ? (
            <>
              {config.favoritePlayers.map((playerName, index) => (
                <View key={index} style={styles.favoritePlayerRow}>
                  <Text style={styles.favoritePlayerName}>⭐ {playerName}</Text>
                  <TouchableOpacity
                    style={styles.deleteFavoriteButton}
                    onPress={() => {
                      Alert.alert(
                        'ELIMINAR FAVORITO',
                        `¿Quieres eliminar a "${playerName}" de tus favoritos?`,
                        [
                          { text: 'CANCELAR', style: 'cancel' },
                          {
                            text: 'ELIMINAR',
                            style: 'destructive',
                            onPress: () => {
                              const newFavorites = config.favoritePlayers.filter(
                                name => name !== playerName
                              );
                              handleConfigChange('favoritePlayers', newFavorites);
                            }
                          }
                        ]
                      );
                    }}
                  >
                    <Text style={styles.deleteFavoriteButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          ) : (
            <Text style={styles.noFavoritesText}>
              No tienes jugadores favoritos aún.{'\n\n'}
              Marca la estrella (⭐) junto al nombre de un jugador en la pantalla de Configuración de Partida para añadirlo a favoritos.
            </Text>
          )}
        </View>

        {/* 5. TEMPORIZADOR */}
        <Text style={styles.sectionTitleOutside}>CONFIGURACIÓN DEL TEMPORIZADOR</Text>
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>TIEMPO MÍNIMO (MINUTOS):</Text>
            <TextInput
              style={styles.numberInput}
              value={minTimeText}
              onChangeText={handleMinTimeChange}
              keyboardType="decimal-pad"
              placeholder="3.0"
            />
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>TIEMPO MÁXIMO (MINUTOS):</Text>
            <TextInput
              style={styles.numberInput}
              value={maxTimeText}
              onChangeText={handleMaxTimeChange}
              keyboardType="decimal-pad"
              placeholder="4.0"
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.label}>MOSTRAR TIMER VISIBLE:</Text>
            <Switch
              value={config.showTimer}
              onValueChange={(value) => handleConfigChange('showTimer', value)}
              trackColor={{ false: '#767577', true: '#D2691E' }}
              thumbColor={config.showTimer ? '#8B0000' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* 6. AVISOS */}
        <Text style={styles.sectionTitleOutside}>CONFIGURACIÓN DE AVISOS</Text>
        <View style={styles.section}>
          <View style={styles.switchRow}>
            <Text style={styles.label}>AVISO AL TERMINAR EL TIEMPO:</Text>
            <Switch
              value={config.endGameAlertEnabled}
              onValueChange={(value) => handleConfigChange('endGameAlertEnabled', value)}
              trackColor={{ false: '#767577', true: '#D2691E' }}
              thumbColor={config.endGameAlertEnabled ? '#8B0000' : '#f4f3f4'}
            />
          </View>

          {config.endGameAlertEnabled && (
            <View style={styles.row}>
              <Text style={styles.label}>TEXTO DEL AVISO:</Text>
              <TextInput
                style={styles.textInput}
                value={config.endGameAlertTitle}
                onChangeText={(text) => handleConfigChange('endGameAlertTitle', text)}
                placeholder="TIEMPO TERMINADO"
              />
            </View>
          )}

          <View style={styles.switchRow}>
            <Text style={styles.label}>PREAVISO ANTES DE TERMINAR EL TIEMPO:</Text>
            <Switch
              value={config.warningEnabled}
              onValueChange={(value) => handleConfigChange('warningEnabled', value)}
              trackColor={{ false: '#767577', true: '#D2691E' }}
              thumbColor={config.warningEnabled ? '#8B0000' : '#f4f3f4'}
            />
          </View>

          {config.warningEnabled && (
            <View style={styles.row}>
              <Text style={styles.label}>SEGUNDOS DE ANTELACIÓN:</Text>
              <TextInput
                style={styles.numberInput}
                value={config.warningSeconds.toString()}
                onChangeText={(text) => handleConfigChange('warningSeconds', parseInt(text) || 30)}
                keyboardType="numeric"
                placeholder="30"
              />
            </View>
          )}
        </View>

        {/* BOTÓN RESETEAR */}
        <TouchableOpacity style={styles.resetButton} onPress={handleResetConfig}>
          <Text style={styles.resetButtonText}>RESETEAR A VALORES POR DEFECTO</Text>
        </TouchableOpacity>

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
    padding: 16,
  },
  sectionTitleOutside: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F5E6D3',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  section: {
    backgroundColor: '#3D2415',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#D2691E',
  },
  row: {
    flexDirection: 'column',
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F5E6D3',
    fontFamily: 'Roboto',
    marginBottom: 4,
  },
  numberInput: {
    borderWidth: 2,
    borderColor: '#D2691E',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: 'bold',
    backgroundColor: '#FFFFFF',
    color: '#000000',
    fontFamily: 'Roboto',
  },
  textInput: {
    borderWidth: 2,
    borderColor: '#D2691E',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: 'bold',
    backgroundColor: '#FFFFFF',
    color: '#000000',
    fontFamily: 'Roboto',
  },
  versionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  versionButton: {
    width: '48%',
    backgroundColor: '#5A3825',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#8B6F47',
  },
  selectedVersionButton: {
    backgroundColor: '#8B0000',
    borderColor: '#8B0000',
  },
  versionButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F5E6D3',
    textAlign: 'center',
    fontFamily: 'Roboto',
  },
  selectedVersionButtonText: {
    color: '#FFFFFF',
  },
  lettersButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  smallButton: {
    backgroundColor: '#D2691E',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 4,
  },
  clearButton: {
    backgroundColor: '#8B0000',
  },
  smallButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'Roboto',
  },
  lettersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  letterButton: {
    width: '12%',
    aspectRatio: 1,
    backgroundColor: '#5A3825',
    borderWidth: 2,
    borderColor: '#8B6F47',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedLetterButton: {
    backgroundColor: '#8B0000',
    borderColor: '#8B0000',
  },
  letterButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F5E6D3',
    fontFamily: 'Roboto',
  },
  selectedLetterButtonText: {
    color: '#FFFFFF',
  },
  warningText: {
    fontSize: 14,
    color: '#FFD700',
    textAlign: 'center',
    fontWeight: 'bold',
    fontFamily: 'Roboto',
    marginTop: 8,
  },
  resetButton: {
    backgroundColor: '#8B0000',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
  },
  favoritePlayerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#5A3825',
    borderWidth: 2,
    borderColor: '#8B6F47',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  favoritePlayerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F5E6D3',
    fontFamily: 'Roboto',
    flex: 1,
  },
  deleteFavoriteButton: {
    backgroundColor: '#8B0000',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteFavoriteButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
  },
  noFavoritesText: {
    fontSize: 14,
    color: '#F5E6D3',
    textAlign: 'center',
    fontFamily: 'Roboto',
    lineHeight: 20,
  },
});

export default Configuracion;