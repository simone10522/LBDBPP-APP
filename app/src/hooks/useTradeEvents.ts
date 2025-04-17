import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useTradeEvents = (onEvent: (payload: any) => void) => {
  useEffect(() => {
    const subscription = supabase
      .channel('trade_events')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public'
      }, (payload) => {
        onEvent(payload);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [onEvent]);
};
