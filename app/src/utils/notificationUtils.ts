import { supabase } from '../lib/supabase';

export const fetchUnreadMatchNotifications = async (userId: string, setTournamentNotifications: (count: number) => void) => {
    try {
        const { data, error } = await supabase
            .from('matches')
            .select('id, read')
            .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
            .eq('read', false);

        if (!error) {
            const count = (data?.length || 0);
            setTournamentNotifications(count);
        } else {
            setTournamentNotifications(0);
        }
    } catch (error) {
        setTournamentNotifications(0);
    }
};
