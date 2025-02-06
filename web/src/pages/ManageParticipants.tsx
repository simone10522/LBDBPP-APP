// src/pages/ManageParticipants.tsx
    import React, { useEffect, useState, useCallback } from 'react';
    import { useParams, useNavigate, Link } from 'react-router-dom';
    import { supabase } from '../lib/supabase';
    import { useAuth } from '../hooks/useAuth';
    import ParticipantList from '../components/ParticipantList';
    import { EnergyIcon } from '../components/EnergyIcon';

    type Energy = 'fuoco' | 'terra' | 'acqua' | 'elettro' | 'normale' | 'erba' | 'oscurità' | 'lotta' | 'acciaio' | 'psico';

    interface TournamentParticipant {
      id: string;
      username: string;
      deck: { deck1: Energy[]; deck2: Energy[] } | null;
    }

    export default function ManageParticipants() {
      const { id } = useParams<{ id: string }>();
      const { user } = useAuth();
      const navigate = useNavigate();
      const [tournamentParticipants, setTournamentParticipants] = useState<TournamentParticipant[]>([]);
      const [error, setError] = useState<string | null>(null);
      const [loading, setLoading] = useState(true);
      const [maxPlayers, setMaxPlayers] = useState<number | null>(null);
      const [isParticipating, setIsParticipating] = useState(false);
      const [participantId, setParticipantId] = useState<string | null>(null);
      const [tournamentStatus, setTournamentStatus] = useState<'draft' | 'in_progress' | 'completed'>('draft');

      const fetchParticipants = useCallback(async () => {
        setLoading(true);
        try {
          const { data: participantsData, error } = await supabase
            .from('tournament_participants')
            .select(`
              id,
              profiles:participant_id (id, username),
              deck
            `)
            .eq('tournament_id', id);

          if (error) {
            throw new Error(`Errore durante il recupero dei partecipanti: ${error.message}`);
          }

          if (participantsData) {
            setTournamentParticipants(
              participantsData.map((p) => ({
                id: p.id,
                username: p.profiles.username,
                deck: p.deck,
              }))
            );
          } else {
            setTournamentParticipants([]);
          }
        } catch (error: any) {
          setError(error.message);
        } finally {
          setLoading(false);
        }
      }, [id]);

      useEffect(() => {
        fetchParticipants();
        fetchMaxPlayers();
        checkIfParticipating();
      }, [fetchParticipants, user]);

      const fetchMaxPlayers = async () => {
        try {
          const { data, error } = await supabase
            .from('tournaments')
            .select('max_players')
            .eq('id', id)
            .single();
          if (error) {
            console.error("Error fetching max players:", error);
            setMaxPlayers(null);
          } else {
            setMaxPlayers(data?.max_players);
          }
        } catch (error) {
          console.error("Error fetching max players:", error);
          setMaxPlayers(null);
        }
      };

      const checkIfParticipating = async () => {
        if (!user || !id) {
          setIsParticipating(false);
          return;
        }
        try {
          const { data, error } = await supabase
            .from('tournament_participants')
            .select('id')
            .eq('tournament_id', id)
            .eq('participant_id', user.id)
            .single();
          if (error) {
            setIsParticipating(false);
            setParticipantId(null);
          } else {
            setIsParticipating(true);
            setParticipantId(data.id);
          }
        } catch (error) {
          console.error("Error checking participation:", error);
          setIsParticipating(false);
          setParticipantId(null);
        }
      };

      const handleJoinTournament = async () => {
        if (!user) {
          setError('Devi essere loggato per partecipare al torneo.');
          return;
        }

        if (maxPlayers !== null && tournamentParticipants.length >= maxPlayers) {
          setError('Il torneo ha raggiunto il numero massimo di partecipanti.');
          return;
        }

        try {
          const { error } = await supabase
            .from('tournament_participants')
            .insert([{ tournament_id: id, participant_id: user.id }]);
          if (error) throw new Error(`Errore durante l'iscrizione: ${error.message}`);
          fetchParticipants();
          checkIfParticipating();
        } catch (error: any) {
          setError(error.message);
        }
      };

      const handleLeaveTournament = async () => {
        if (!user || !id) {
          setError('Devi essere loggato per uscire dal torneo.');
          return;
        }

        try {
          const { error } = await supabase
            .from('tournament_participants')
            .delete()
            .eq('tournament_id', id)
            .eq('participant_id', user.id);
          if (error) throw new Error(`Errore durante l'uscita dal torneo: ${error.message}`);
          fetchParticipants();
          checkIfParticipating();
        } catch (error: any) {
          setError(error.message);
        }
      };

      const handleRemoveParticipant = async (participantId: string) => {
        try {
          const { error } = await supabase
            .from('tournament_participants')
            .delete()
            .eq('id', participantId);
          if (error) throw new Error(`Errore durante la rimozione del partecipante: ${error.message}`);
          fetchParticipants();
        } catch (error: any) {
          setError(error.message);
        }
      };

      const formatDeck = (deck: { deck1: Energy[]; deck2: Energy[] } | null): React.ReactNode => {
        if (!deck) return 'Non selezionato';
        return (
          <>
            Deck 1: {deck.deck1.map((e) => <EnergyIcon key={e} energy={e} className="h-8 w-8" />)}{' '}
            Deck 2: {deck.deck2.map((e) => <EnergyIcon key={e} energy={e} className="h-8 w-8" />)}
          </>
        );
      };

      const isTournamentActive = tournamentStatus === 'in_progress' || tournamentStatus === 'completed';

      return (
        <div className="max-w-4xl mx-auto p-4 bg-gray-200 bg-opacity-50 rounded-lg shadow-md">
          <button onClick={() => navigate(-1)} className="mb-4 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition">
            Back
          </button>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Lista Partecipanti</h1>
            <span className="text-gray-600">
              ({tournamentParticipants.length}/{maxPlayers === null ? '∞' : maxPlayers})
            </span>
          </div>
          {error && <p className="text-red-500 text-lg">{error}</p>}
          {loading && <p>Caricamento...</p>}
          {user && (
            <div className="flex flex-col space-y-4">
              {!isParticipating ? (
                <button onClick={handleJoinTournament} className="bg-gradient-to-r from-indigo-500 to-indigo-700 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded shadow-md" disabled={isTournamentActive}>
                  Partecipa al Torneo
                </button>
              ) : (
                <button onClick={handleLeaveTournament} className="bg-gradient-to-r from-red-500 to-red-700 hover:bg-red-700 text-white font-bold py-2 px-4 rounded shadow-md" disabled={isTournamentActive}>
                  Esci dal Torneo
                </button>
              )}
              {isParticipating && participantId && (
                <Link to={`/managedecks?participantId=${participantId}`} className={`bg-gradient-to-r from-indigo-500 to-indigo-700 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded text-center shadow-md ${isTournamentActive ? 'opacity-50 pointer-events-none' : ''}`}>
                  Gestisci Mazzi
                </Link>
              )}
            </div>
          )}
          <ul className="mt-4 text-lg">
            {tournamentParticipants.map((p) => (
              <li key={p.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                <span className="font-medium">{p.username}</span>
                <span>{formatDeck(p.deck)}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    }
