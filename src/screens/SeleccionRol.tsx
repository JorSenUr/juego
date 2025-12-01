import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { updateConfig } from '../utils/gameConfig';

type Screen = 'MenuPrincipal' | 'ConfiguracionOnline';

interface SeleccionRolProps {
  navigate: (screen: any) => void;
  goBack: () => void;
}

const SeleccionRol = ({ navigate, goBack }: SeleccionRolProps) => {

  const handleCrearPartida = async () => {
    // El organizador es el Maestro
    await updateConfig({ isMasterDevice: true });
    navigate('ConfiguracionOnline');
  };

  const handleUnirsePartida = async () => {
    // Quien se une es Esclavo
    await updateConfig({ isMasterDevice: false });
    navigate('ConfiguracionOnline');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>¿CUÁL ES TU ROL?</Text>
        <Text style={styles.subtitle}>Selecciona tu función en esta partida online</Text>

        {/* OPCIÓN A: ORGANIZADOR */}
        <TouchableOpacity 
          style={styles.roleButton}
          onPress={handleCrearPartida}
        >
          <Text style={styles.roleIcon}>🎩</Text>
          <View style={styles.textContainer}>
            <Text style={styles.roleTitle}>CREAR PARTIDA</Text>
            <Text style={styles.roleDescription}>
              Soy el Organizador. Configuro el juego y controlo el tiempo.
            </Text>
          </View>
        </TouchableOpacity>

        {/* OPCIÓN B: JUGADOR */}
        <TouchableOpacity 
          style={[styles.roleButton, styles.playerButton]}
          onPress={handleUnirsePartida}
        >
          <Text style={styles.roleIcon}>👤</Text>
          <View style={styles.textContainer}>
            <Text style={styles.roleTitle}>UNIRSE A PARTIDA</Text>
            <Text style={styles.roleDescription}>
              Soy un Jugador. Me conectaré al dispositivo del Organizador.
            </Text>
          </View>
        </TouchableOpacity>

      </View>
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
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F5E6D3',
    textAlign: 'center',
    marginBottom: 10,
    fontFamily: 'Roboto',
  },
  subtitle: {
    fontSize: 16,
    color: '#F5E6D3',
    textAlign: 'center',
    marginBottom: 40,
    opacity: 0.8,
    fontFamily: 'Roboto',
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B0000',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#A52A2A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  playerButton: {
    backgroundColor: '#1E88E5',
    borderColor: '#1565C0',
  },
  roleIcon: {
    fontSize: 40,
    marginRight: 20,
  },
  textContainer: {
    flex: 1,
  },
  roleTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    fontFamily: 'Roboto',
  },
  roleDescription: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.9,
    fontFamily: 'Roboto',
  },
});

export default SeleccionRol;