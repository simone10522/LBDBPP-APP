import React from 'react';
    
    interface EnergyIconProps {
      energy: 'fuoco' | 'terra' | 'acqua' | 'elettro' | 'normale' | 'erba' | 'oscurità' | 'lotta' | 'acciaio' | 'psico';
    }
    
    export const EnergyIcon: React.FC<EnergyIconProps> = ({ energy }) => {
      const energyMap = {
        fuoco: 'https://github.com/simone10522/LBDBPP/blob/main/icons/fuoco.png?raw=true',
        terra: '/icons/terra.png',
        acqua: 'https://github.com/simone10522/LBDBPP/blob/main/icons/acqua.png?raw=true',
        elettro: 'https://github.com/simone10522/LBDBPP/blob/main/icons/elettro.png?raw=true',
        normale: 'https://github.com/simone10522/LBDBPP/blob/main/icons/normale.png?raw=true',
        erba: 'https://github.com/simone10522/LBDBPP/blob/main/icons/erba.png?raw=true',
        oscurità: 'https://github.com/simone10522/LBDBPP/blob/main/icons/oscurit%C3%A0.png?raw=true',
        lotta: 'https://github.com/simone10522/LBDBPP/blob/main/icons/lotta.png?raw=true',
        acciaio: 'https://github.com/simone10522/LBDBPP/blob/main/icons/acciaio.png?raw=true',
        psico: 'https://github.com/simone10522/LBDBPP/blob/main/icons/psico.png?raw=true',
      };
      return <img src={energyMap[energy]} alt={energy} className="h-8 w-8 inline" />;
    };
