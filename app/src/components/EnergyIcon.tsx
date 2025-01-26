import React from 'react';
import { Image, StyleSheet } from 'react-native';

interface EnergyIconProps {
  energy: 'fuoco' | 'terra' | 'acqua' | 'elettro' | 'normale' | 'erba' | 'oscurità' | 'lotta' | 'acciaio' | 'psico';
  style?: any;
}

export const EnergyIcon: React.FC<EnergyIconProps> = ({ energy, style }) => {
  const energyMap = {
    fuoco: 'https://github.com/simone10522/LBDBPP/blob/main/icons/fuoco.png?raw=true',
    terra: 'https://github.com/simone10522/LBDBPP/blob/main/icons/terra.png?raw=true',
    acqua: 'https://github.com/simone10522/LBDBPP/blob/main/icons/acqua.png?raw=true',
    elettro: 'https://github.com/simone10522/LBDBPP/blob/main/icons/elettro.png?raw=true',
    normale: 'https://github.com/simone10522/LBDBPP/blob/main/icons/normale.png?raw=true',
    erba: 'https://github.com/simone10522/LBDBPP/blob/main/icons/erba.png?raw=true',
    oscurità: 'https://github.com/simone10522/LBDBPP/blob/main/icons/oscurit%C3%A0.png?raw=true',
    lotta: 'https://github.com/simone10522/LBDBPP/blob/main/icons/lotta.png?raw=true',
    acciaio: 'https://github.com/simone10522/LBDBPP/blob/main/icons/acciaio.png?raw=true',
    psico: 'https://github.com/simone10522/LBDBPP/blob/main/icons/psico.png?raw=true',
  };
  return <Image source={{ uri: energyMap[energy] }} style={[styles.icon, style]} />;
};

const styles = StyleSheet.create({
  icon: {
    width: 20,
    height: 20,
  },
});
