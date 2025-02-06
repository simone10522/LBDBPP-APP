import React, { useState, useEffect } from 'react';
    import { supabase } from '../lib/supabase';
    import { useAuth } from '../hooks/useAuth';
    import { useNavigate, useSearchParams } from 'react-router-dom';
    import { EnergyIcon } from '../components/EnergyIcon';

    const energies = ['fuoco', 'acqua', 'elettro', 'normale', 'erba', 'oscurità', 'lotta', 'acciaio', 'psico'];

    export default function ManageDecks() {
      const { user } = useAuth();
      const navigate = useNavigate();
      const [deck1, setDeck1] = useState<string[]>([]);
      const [deck2, setDeck2] = useState<string[]>([]);
      const [error, setError] = useState('');
      const [searchParams] = useSearchParams();
      const [hasDeck, setHasDeck] = useState(false);
      const [participantId, setParticipantId] = useState<string | null>(null);

      useEffect(() => {
        const fetchExistingDeck = async () => {
          const participantIdParam = searchParams.get('participantId');
          if (!participantIdParam || !user) return;
          try {
            const { data, error } = await supabase
              .from('tournament_participants')
              .select('id, deck')
              .eq('id', participantIdParam)
              .single();
            if (error) {
              console.error("Error fetching existing deck:", error);
              setHasDeck(false);
              setError(error.message);
            } else {
              if (data?.deck) {
                setDeck1(data.deck.deck1 || []);
                setDeck2(data.deck.deck2 || []);
                setHasDeck(true);
                setParticipantId(data.id);
              } else {
                setHasDeck(true);
                setParticipantId(data.id);
              }
            }
          } catch (error: any) {
            console.error("Error fetching existing deck:", error);
            setHasDeck(false);
            setParticipantId(null);
          }
        };
        fetchExistingDeck();
      }, [searchParams, user?.id]);

      const handleEnergyChange = (deck: 1 | 2, energy: string, checked: boolean) => {
        const newDeck = checked ? [...(deck === 1 ? deck1 : deck2), energy] : (deck === 1 ? deck1 : deck2).filter(e => e !== energy);
        if (deck === 1) setDeck1(newDeck); else setDeck2(newDeck);
      };

      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (deck1.length === 0 || deck2.length === 0) {
          setError('Devi selezionare almeno un’energia per ogni deck.');
          return;
        }
        try {
          if (!user || !participantId) throw new Error('Utente o partecipante non valido');
          const deckData = { deck1, deck2 };
          if (hasDeck && participantId) {
            const { error } = await supabase
              .from('tournament_participants')
              .update({ deck: deckData })
              .eq('id', participantId);
            if (error) throw error;
          }
          navigate(-1);
        } catch (error: any) {
          setError(error.message);
        }
      };

      return (
        <div className="max-w-4xl mx-auto p-4 bg-gray-50 bg-opacity-50 rounded-lg shadow-md">
          <button onClick={() => navigate(-1)} className="mb-4 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition">
            Back
          </button>
          <h1 className="text-3xl font-bold mb-8">Gestisci Mazzi</h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Deck 1</h2>
              <div className="flex flex-wrap gap-2">
                {energies.map((energy) => (
                  <label key={energy} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={deck1.includes(energy)}
                      onChange={(e) => handleEnergyChange(1, energy, e.target.checked)}
                      className="mr-2"
                    />
                    <EnergyIcon energy={energy} className="h-8 w-8" />
                  </label>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-4">Deck 2</h2>
              <div className="flex flex-wrap gap-2">
                {energies.map((energy) => (
                  <label key={energy} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={deck2.includes(energy)}
                      onChange={(e) => handleEnergyChange(2, energy, e.target.checked)}
                      className="mr-2"
                    />
                    <EnergyIcon energy={energy} className="h-8 w-8" />
                  </label>
                ))}
              </div>
            </div>
            <button type="submit" className="w-full py-2 px-4 bg-gradient-to-r from-indigo-500 to-indigo-700 text-white rounded-md hover:bg-indigo-700 shadow-md">Salva</button>
            {error && <p className="text-red-500 text-lg mt-4">{error}</p>}
          </form>
        </div>
      );
    }
