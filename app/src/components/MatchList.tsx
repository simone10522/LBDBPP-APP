import React, { useState, useEffect, useRef } from 'react';
    import { View, Text, StyleSheet, TouchableOpacity, Image, ImageBackground } from 'react-native';
    import { useAuth } from '../hooks/useAuth';
    import { supabase } from '../lib/supabase';
    import background from '../../assets/test.jpg'

    interface Match {
      id: string;
      player1: string;
      player1_id: string;
      player2: string;
      player2_id: string;
      winner_id: string | null;
      round: number;
      status: 'scheduled' | 'completed';
      player1_win: number;
      player2_win: number;
    }

    interface MatchListProps {
      matches: Match[];
      onSetWinner?: (matchId: string, winnerId: string) => void;
      tournamentStatus: 'draft' | 'in_progress' | 'completed';
      onMatchUpdate?: () => void;
      bestOf: number | null;
    }

    // Utility function for debouncing
    function debounce<T extends (...args: any[]) => void>(func: T, delay: number): T {
      let timeoutId: NodeJS.Timeout | null = null;
      return function (...args: any[]) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
          func(...args);
          timeoutId = null;
        }, delay);
      } as T;
    }

    export default function MatchList({ matches, onSetWinner, tournamentStatus, onMatchUpdate, bestOf }: MatchListProps) {
      const { user } = useAuth();
      const [profileImages, setProfileImages] = useState<{ [key: string]: string }>({});
      const [matchScores, setMatchScores] = useState<{ [matchId: string]: string }>({});
      const [localMatches, setLocalMatches] = useState([...matches]);
      const [localScores, setLocalScores] = useState<{ [matchId: string]: { player1: number, player2: number } }>({});

      useEffect(() => {
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

      useEffect(() => {
        const initialScores = matches.reduce((acc, match) => {
          acc[match.id] = { player1: match.player1_win, player2: match.player2_win };
          return acc;
        }, {} as { [matchId: string]: { player1: number, player2: number } });
        setLocalScores(initialScores);
        setLocalMatches([...matches]);
      }, [matches]);

      useEffect(() => {
        const initialScores = Object.keys(localScores).reduce((acc, matchId) => {
          const score = localScores[matchId];
          acc[matchId] = `${score.player1} - ${score.player2}`;
          return acc;
        }, {} as { [matchId: string]: string });
        setMatchScores(initialScores);
      }, [localScores]);

      const roundsMap = localMatches.reduce((acc, match) => {
        if (!acc[match.round]) {
          acc[match.round] = [];
        }
        acc[match.round].push(match);
        return acc;
      }, {} as Record<number, Match[]>);

      const rounds = Object.entries(roundsMap).sort(([a], [b]) => Number(a) - Number(b));

      const handleScoreChange = (matchId: string, player: 1 | 2, increment: boolean) => {
        const matchIndex = localMatches.findIndex(m => m.id === matchId);
        if (matchIndex === -1) {
          console.error("Match not found");
          return;
        }

        const currentLocalScores = { ...localScores[matchId] };
        const maxWins = bestOf ? Math.ceil(bestOf / 2) : 1;
        const opponent = player === 1 ? 2 : 1;

        if (increment) {
          if (opponent === 1 && currentLocalScores.player1 === maxWins) {
            return;
          }
          if (opponent === 2 && currentLocalScores.player2 === maxWins) {
            return;
          }
        }

        let updatedScore = player === 1
          ? increment ? currentLocalScores.player1 + 1 : Math.max(0, currentLocalScores.player1 - 1)
          : increment ? currentLocalScores.player2 + 1 : Math.max(0, currentLocalScores.player2 - 1);

        if (player === 1) {
          updatedScore = Math.min(updatedScore, maxWins);
          currentLocalScores.player1 = updatedScore;
        } else {
          updatedScore = Math.min(updatedScore, maxWins);
          currentLocalScores.player2 = updatedScore;
        }

        // Create a new object for localScores
        setLocalScores(prevScores => {
          const newScores = {
            ...prevScores,
            [matchId]: { ...currentLocalScores }
          };
          return newScores;
        });

        debouncedUpdateScore(matchId, player, updatedScore);
      };

      const updateScore = async (matchId: string, player: 1 | 2, updatedScore: number) => {
        try {
          const updateData = player === 1
            ? { player1_win: updatedScore }
            : { player2_win: updatedScore };

          console.log("Updating match:", matchId, "with data:", updateData);

          const { data, error } = await supabase
            .from('matches')
            .update(updateData)
            .eq('id', matchId)
            .select('*');

          if (error) {
            console.error("Error updating match score:", error);
          } else {
            console.log("Match updated successfully:", data);
            onMatchUpdate?.();
          }
        } catch (error) {
          console.error("Error updating match score:", error);
        }
      };

      const debouncedUpdateScore = useRef(debounce(updateScore, 500)).current;

      if (tournamentStatus === 'draft') {
        return <Text style={styles.noMatches}>Tournament not started yet.</Text>;
      }

      return (
        <View style={styles.container}>
          {rounds.map(([round, matches]) => (
            <View key={round}>
              <Text style={styles.roundTitle}>Round {round}</Text>
              <View style={styles.matchesContainer}>
                {matches.map((match) => (
                  <ImageBackground
                    key={match.id}
                    source={background}
                    style={styles.matchItem}
                    resizeMode="stretch"
                    imageStyle={styles.matchItemBackground}
                  >
                    {onSetWinner && match.status !== 'completed' && (
                      <View style={[styles.winnerButtons, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                        <View style={styles.playerContainer}>
                          <Image
                            source={{ uri: profileImages[match.player1_id] || '/icons/profile1.png' }}
                            style={styles.profileImage}
                          />
                          <Text style={[styles.playerName, { width: 100 }]}>{match.player1}</Text>
                        </View>
                        <View style={styles.scoreContainer}>
                          <View style={styles.scoreButtons}>
                            <TouchableOpacity
                              onPress={() => handleScoreChange(match.id, 1, true)}
                              style={[styles.scoreButton, localScores[match.id]?.player1 === (bestOf ? Math.ceil(bestOf / 2) : 1) || (localScores[match.id]?.player2 === (bestOf ? Math.ceil(bestOf / 2) : 1) && localScores[match.id]?.player1 < (bestOf ? Math.ceil(bestOf / 2) : 1)) ? styles.disabledButton : {}]}
                              disabled={localScores[match.id]?.player1 === (bestOf ? Math.ceil(bestOf / 2) : 1) || (localScores[match.id]?.player2 === (bestOf ? Math.ceil(bestOf / 2) : 1) && localScores[match.id]?.player1 < (bestOf ? Math.ceil(bestOf / 2) : 1))}
                            >
                              <Text style={styles.scoreButtonText}>+</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleScoreChange(match.id, 1, false)} style={[styles.scoreButton, { marginTop: 5 }]}>
                              <Text style={styles.scoreButtonText}>-</Text>
                            </TouchableOpacity>
                          </View>
                          <Text style={[styles.scoreText, { width: 50 }]}>{matchScores[match.id] || '0 - 0'}</Text>
                          <View style={styles.scoreButtons}>
                            <TouchableOpacity
                              onPress={() => handleScoreChange(match.id, 2, true)}
                              style={[styles.scoreButton, localScores[match.id]?.player2 === (bestOf ? Math.ceil(bestOf / 2) : 1) || (localScores[match.id]?.player1 === (bestOf ? Math.ceil(bestOf / 2) : 1) && localScores[match.id]?.player2 < (bestOf ? Math.ceil(bestOf / 2) : 1)) ? styles.disabledButton : {}]}
                              disabled={localScores[match.id]?.player2 === (bestOf ? Math.ceil(bestOf / 2) : 1) || (localScores[match.id]?.player1 === (bestOf ? Math.ceil(bestOf / 2) : 1) && localScores[match.id]?.player2 < (bestOf ? Math.ceil(bestOf / 2) : 1))}
                            >
                              <Text style={styles.scoreButtonText}>+</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleScoreChange(match.id, 2, false)} style={[styles.scoreButton, { marginTop: 5 }]}>
                              <Text style={styles.scoreButtonText}>-</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                        <View style={styles.playerContainer}>
                          <Image
                            source={{ uri: profileImages[match.player2_id] || '/icons/profile1.png' }}
                            style={styles.profileImage}
                          />
                          <Text style={[styles.playerName, { width: 100 }]}>{match.player2}</Text>
                        </View>
                      </View>
                    )}
                    {match.status === 'completed' && (
                      <View style={[styles.completedMatch, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                        <View style={styles.playerContainer}>
                          <Image
                            source={{ uri: profileImages[match.player1_id] || '/icons/profile1.png' }}
                            style={[styles.profileImage, match.winner_id !== match.player1_id ? styles.dimmedImage : {}]}
                          />
                          <Text style={[styles.playerName, { width: 100 }]}>{match.player1}</Text>
                        </View>
                        <Text style={[styles.scoreText, { width: 50 }]}>{matchScores[match.id] || '0 - 0'}</Text>
                        <View style={styles.playerContainer}>
                          <Image
                            source={{ uri: profileImages[match.player2_id] || '/icons/profile1.png' }}
                            style={[styles.profileImage, match.winner_id !== match.player2_id ? styles.dimmedImage : {}]}
                          />
                          <Text style={[styles.playerName, { width: 100 }]}>{match.player2}</Text>
                        </View>
                      </View>
                    )}
                  </ImageBackground>
                ))}
              </View>
            </View>
          ))}
        </View>
      );
    };

    const styles = StyleSheet.create({
      container: {
        marginBottom: 20,
      },
      roundTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
      },
      matchesContainer: {
        marginBottom: 10,
      },
      matchItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 10,
        borderRadius: 5,
        marginBottom: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 10,
      },
      matchItemBackground: {
        borderRadius: 5,
      },
      playersContainer: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      vs: {
        marginHorizontal: 5,
        color: '#666',
      },
      winner: {
        fontWeight: 'bold',
      },
      winnerButtons: {
        alignItems: 'center',
      },
      winnerButton: {
        padding: 5,
        borderRadius: 5,
      },
      profileImage: {
        width: 70,
        height: 70,
        borderRadius: 20,
      },
      completedMatch: {
        alignItems: 'center',
      },
      dimmedImage: {
        opacity: 0.5,
      },
      playerName: {
        fontSize: 24,
        color: '#333',
        textAlign: 'center',
      },
      playerContainer: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
      },
      scoreContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
      },
        scoreText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginHorizontal: 10,
      },
        scoreButton: {
        backgroundColor: '#7D7D7D',
        padding: 5,
        borderRadius: 5,
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 40,
        flex: 1,
        elevation: 5,
      },
        scoreButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
      },
        scoreButtons: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 5,
      },
        noMatches: {
        fontSize: 18,
        textAlign: 'center',
        marginTop: 20,
        color: '#666',
      },
      disabledButton: {
        backgroundColor: '#95a5a6',
      }
        });

        export default MatchList;
