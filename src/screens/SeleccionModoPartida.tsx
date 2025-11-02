import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { getCurrentConfig, updateConfig } from '../utils/gameConfig';

type Screen = 'MenuPrincipal' | 'Configuracion' | 'PantallaJuego' | 'Puntuaciones' | 'ReglasJuego' | 'ConfiguracionPartida' | 'SeleccionModoPartida' | 'ConfiguracionOnline' | 'PartidaActual';

interface SeleccionModoPartidaProps {
  navigate: (screen: Screen) => void;
  goBack: () => void;
}

const SeleccionModoPartida = ({ navigate, goBack }: SeleccionModoPartidaProps) => {
  
  const config = getCurrentConfig();
  const [isMasterDevice, setIsMasterDevice] = useState<boolean>(config.isMasterDevice);

  const toggleDeviceRole = async () => {
    const newValue = !isMasterDevice;
    setIsMasterDevice(newValue);
    await updateConfig({ isMasterDevice: newValue });
  };

  const handleSinConexion = async () => {
    await updateConfig({ freeMode: false });
    navigate('ConfiguracionPartida');
  };

  const handlePartidaOnline = async () => {
    await updateConfig({ freeMode: false });
    navigate('ConfiguracionOnline');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>¿CÓMO QUIERES JUGAR?</Text>

        {/* Switch Principal/Secundario */}
        <TouchableOpacity 
          style={[
            styles.deviceRoleButton,
            isMasterDevice && styles.deviceRoleButtonActive
          ]}
          onPress={toggleDeviceRole}
        >
          <Text style={styles.deviceRoleIcon}>{isMasterDevice ? '🎩' : '🐇'}</Text>
          <Text style={[
            styles.deviceRoleText,
            isMasterDevice && styles.deviceRoleTextActive
          ]}>
            {isMasterDevice ? 'DISPOSITIVO PRINCIPAL ✓' : 'DISPOSITIVO SECUNDARIO'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          {isMasterDevice 
            ? 'Este dispositivo organizará las partidas online' 
            : 'Este dispositivo se conectará a partidas de otros'}
        </Text>

        {/* Botones de modo */}
        <TouchableOpacity 
          style={styles.modeButton}
          onPress={handleSinConexion}
        >
          <Text style={styles.modeButtonIcon}>📱📱</Text>
          <Text style={styles.modeButtonText}>SIN CONEXIÓN</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.modeButton, styles.onlineButton]}
          onPress={handlePartidaOnline}
        >
          <Text style={styles.modeButtonIcon}>🛜</Text>
          <Text style={styles.modeButtonText}>PARTIDA ONLINE</Text>
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F5E6D3',
    textAlign: 'center',
    marginBottom: 40,
  },
  deviceRoleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5A3825',
    borderWidth: 2,
    borderColor: '#8B6F47',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  deviceRoleButtonActive: {
    backgroundColor: '#D2691E',
    borderColor: '#D2691E',
  },
  deviceRoleIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  deviceRoleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F5E6D3',
  },
  deviceRoleTextActive: {
    color: '#FFFFFF',
  },
  hint: {
    fontSize: 12,
    color: '#F5E6D3',
    textAlign: 'center',
    marginBottom: 40,
    opacity: 0.7,
    fontStyle: 'italic',
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B0000',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  onlineButton: {
    backgroundColor: '#1E88E5',
  },
  modeButtonIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  modeButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default SeleccionModoPartida;