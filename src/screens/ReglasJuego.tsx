import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';

interface ReglasJuegoProps {
  navigate: (screen: 'MenuPrincipal' | 'Configuracion' | 'PantallaJuego' | 'Puntuaciones' | 'ReglasJuego' | 'ConfiguracionPartida') => void;
  goBack: () => void;
}

const ReglasJuego = ({ navigate, goBack }: ReglasJuegoProps) => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>        
        <View style={styles.ruleSection}>
          <Text style={styles.sectionTitle}>Objetivo</Text>
          <Text style={styles.ruleText}>
            Escribir palabras que empiecen con la letra indicada para cada categoría. 
            Gana puntos por respuestas únicas que otros jugadores no hayan escrito.
          </Text>
        </View>

        <View style={styles.ruleSection}>
          <Text style={styles.sectionTitle}>Cómo Jugar</Text>
          <Text style={styles.ruleText}>
            1. Se genera una letra aleatoria{'\n'}
            2. Tienes un tiempo limitado para completar 12 categorías{'\n'}
            3. Cada respuesta debe empezar con la letra indicada{'\n'}
            4. Al finalizar, se revisan las respuestas{'\n'}
            5. Se asignan puntos según las reglas
          </Text>
        </View>

        <View style={styles.ruleSection}>
          <Text style={styles.sectionTitle}>Puntuación</Text>
          <Text style={styles.ruleText}>
            • 0 puntos: Respuesta inválida o vacía{'\n'}
            • 1 punto: Respuesta válida y única{'\n'}
            • 2+ puntos: Respuestas muy creativas (criterio de jugadores)
          </Text>
        </View>

        <View style={styles.ruleSection}>
          <Text style={styles.sectionTitle}>Reglas Especiales</Text>
          <Text style={styles.ruleText}>
            • Solo se acepta la primera letra de la palabra{'\n'}
            • Artículos como "el", "la" no cuentan{'\n'}
            • Respuestas iguales se anulan entre jugadores{'\n'}
            • Una respuesta por categoría por ronda
          </Text>
        </View>
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
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#D2691E',
    marginBottom: 30,
    textAlign: 'center',
  },
  ruleSection: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  ruleText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
});

export default ReglasJuego;