import React, { useEffect, useState } from 'react';
    import { Link } from 'react-router-dom';
    import { supabase } from '../lib/supabase';
    // import { Trophy } from 'lucide-react'; // Remove Trophy import

    interface Tournament {
      id: string;
      name: string;
      description: string;
      status: 'draft' | 'in_progress' | 'completed';
      created_at: string;
    }

    export default function Home() {
      const [tournaments, setTournaments] = useState<Tournament[]>([]);

      useEffect(() => {
        fetchTournaments();
      }, []);

      const fetchTournaments = async () => {
        const { data, error } = await supabase
          .from('tournaments')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          setTournaments(data);
        }
      };

      return (
        <div>
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-5xl font-bold text-yellow-300" style={{ textShadow: '3px 3px 0 black' }}>Tornei</h1>
            <Link
              to="/tournaments/create"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
            >
              Crea Torneo
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((tournament) => (
              <Link
                key={tournament.id}
                to={`/tournaments/${tournament.id}`}
                className="block bg-white rounded-lg shadow-md hover:shadow-lg transition"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Pok%C3%A9_Ball_icon.svg/2048px-Pok%C3%A9_Ball_icon.svg.png"
                      alt="Pokeball Icon"
                      className="h-8 w-8"
                    />
                    <span className={`px-2 py-1 text-sm rounded-full ${
                      tournament.status === 'completed' ? 'bg-green-100 text-green-800' :
                      tournament.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {tournament.status.replace('_', ' ')}
                    </span>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">{tournament.name}</h2>
                  <p className="text-gray-600 line-clamp-2">{tournament.description}</p>
                  <div className="mt-4 text-sm text-gray-500">
                    Created {new Date(tournament.created_at).toLocaleDateString()}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {tournaments.length === 0 && (
            <div className="text-center py-12 max-w-4xl mx-auto p-4 bg-gray-50 bg-opacity-50 rounded-lg shadow-md">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Pok%C3%A9_Ball_icon.svg/2048px-Pok%C3%A9_Ball_icon.svg.png"
                alt="Pokeball Icon"
                className="h-12 w-12 text-gray-400 mx-auto mb-4"
              />
              <h3 className="text-lg font-medium text-gray-900">Nessun Torneo Disponibile</h3>
              <p className="text-gray-500">Inizia creando un Torneo!</p>
            </div>
          )}
        </div>
      );
    }
