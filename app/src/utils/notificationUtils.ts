import { supabase } from '../lib/supabase';

export const fetchUnreadMatchNotifications = async (userId: string, setTournamentNotifications: (count: number) => void) => {
    console.log('Fetching unread matches for user:', userId);
    try {
        const { data, error } = await supabase
            .from('matches')
            .select('id, read')
            .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
            .eq('read', false);

        if (!error) {
            const count = (data?.length || 0);
            console.log('Setting notifications count to:', count);
            setTournamentNotifications(count);
            console.log('Notifications count should now be:', count);
        } else {
            console.error('Error fetching unread matches:', error);
            setTournamentNotifications(0);
        }
    } catch (error) {
        console.error('Error in fetchUnreadMatchNotifications:', error);
        setTournamentNotifications(0);
    }
};
