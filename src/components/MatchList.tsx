import React from 'react';
    import { useAuth } from '../hooks/useAuth';
    import { supabase } from '../lib/supabase';

    interface Match {
      id: string;
      player1: string;
      player1_id: string;
      player2: string;
      player2_id: string;
      winner_id: string | null;
      round: number;
      status: 'scheduled' | 'completed';
    }

    interface MatchListProps {
      matches: Match[];
      onSetWinner?: (matchId: string, winnerId: string) => void;
    }

    export default function MatchList({ matches, onSetWinner }: MatchListProps) {
      const { user } = useAuth();
      const [profileImages, setProfileImages] = React.useState<{ [key: string]: string }>({});

      React.useEffect(() => {
        const fetchProfileImages = async () => {
          const playerIds = matches.reduce((acc, match) => {
            if (match.player1_id) acc.add(match.player1_id);
            if (match.player2_id) acc.add(match.player2_id);
            return acc;
          }, new Set<string>());

          if (playerIds.size > 0) {
            try {
              const { data, error } = await supabase
                .from('profiles')
                .select('id, profile_image')
                .in('id', Array.from(playerIds));

              if (error) {
                console.error("Error fetching profile images:", error);
              } else {
                const imagesMap: { [key: string]: string } = {};
                data.forEach((profile) => {
                  imagesMap[profile.id] = profile.profile_image || '/icons/profile1.png';
                });
                setProfileImages(imagesMap);
              }
            } catch (error) {
              console.error("Error fetching profile images:", error);
            }
          }
        };

        fetchProfileImages();
      }, [matches]);

      const roundsMap = matches.reduce((acc, match) => {
        if (!acc[match.round]) {
          acc[match.round] = [];
        }
        acc[match.round].push(match);
        return acc;
      }, {} as Record<number, Match[]>);

      const rounds = Object.entries(roundsMap).sort(([a], [b]) => Number(a) - Number(b));

      return (
        <div className="space-y-8">
          {rounds.map(([round, matches]) => (
            <div key={round}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Round {round}</h3>
              <div className="space-y-4">
                {matches.map((match) => (
                  <div
                    key={match.id}
                    className="flex items-center justify-between p-4 bg-white rounded-lg shadow"
                  >
                    <div className="flex items-center space-x-4">
                      <span className={match.winner_id === match.player1_id ? 'font-bold' : ''}>
                        {match.player1}
                      </span>
                      <span className="text-gray-500">vs</span>
                      <span className={match.winner_id === match.player2_id ? 'font-bold' : ''}>
                        {match.player2}
                      </span>
                    </div>
                    
                    {onSetWinner && match.status !== 'completed' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => onSetWinner(match.id, match.player1_id)}
                          className="p-2 hover:bg-gray-100 rounded-full"
                          title={`${match.player1} wins`}
                        >
                          <img
                            src={profileImages[match.player1_id] || '/icons/profile1.png'}
                            alt={`${match.player1} profile`}
                            className="h-11 w-11 rounded-full object-cover"
                          />
                        </button>
                        <button
                          onClick={() => onSetWinner(match.id, match.player2_id)}
                          className="p-2 hover:bg-gray-100 rounded-full"
                          title={`${match.player2} wins`}
                        >
                          <img
                            src={profileImages[match.player2_id] || '/icons/profile1.png'}
                            alt={`${match.player2} profile`}
                            className="h-11 w-11 rounded-full object-cover"
                          />
                        </button>
                      </div>
                    )}

                    {match.status === 'completed' && (
                      <div className="flex space-x-2 items-center">
                        <img
                          src={profileImages[match.player1_id] || '/icons/profile1.png'}
                          alt={`${match.player1} profile`}
                          className={`h-11 w-11 rounded-full object-cover ${match.winner_id !== match.player1_id ? 'brightness-75' : ''}`}
                        />
                        <img
                          src={profileImages[match.player2_id] || '/icons/profile1.png'}
                          alt={`${match.player2} profile`}
                          className={`h-11 w-11 rounded-full object-cover ${match.winner_id !== match.player2_id ? 'brightness-75' : ''}`}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }
