import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ImageBackground, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import background from '../../assets/test.jpg';
import Modal from 'react-native-modal';

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
  player1_loss: number;
  player2_loss: number;
}

interface MatchListProps {
  matches: Match[];
  onSetWinner?: (matchId: string, winnerId: string, player1Score: number, player2Score: number) => void;
  tournamentStatus: 'draft' | 'in_progress' | 'completed';
  onMatchUpdate?: () => void;
  bestOf: number | null;
}

export default function MatchList({ matches, onSetWinner, tournamentStatus, onMatchUpdate, bestOf }: MatchListProps) {
  const { user } = useAuth();
  const [profileImages, setProfileImages] = useState<{ [key: string]: string }>({});
  const [matchScores, setMatchScores] = useState<{ [matchId: string]: string }>({});
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [player1Score, setPlayer1Score] = useState<string>('0');
  const [player2Score, setPlayer2Score] = useState<string>('0');
  const [maxScore, setMaxScore] = useState<number>(0);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

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
      acc[match.id] = `${match.player1_win} - ${match.player2_win}`;
      return acc;
    }, {} as { [matchId: string]: string });
    setMatchScores(initialScores);
  }, [matches]);

  useEffect(() => {
    if (bestOf === 3) {
      setMaxScore(2);
    } else if (bestOf === 5) {
      setMaxScore(3);
    } else {
      setMaxScore(100);
    }
  }, [bestOf]);

  useEffect(() => {
    if (selectedMatchId) {
      const match = matches.find(m => m.id === selectedMatchId);
      setSelectedMatch(match || null);
    } else {
      setSelectedMatch(null);
    }
  }, [selectedMatchId, matches]);

  const roundsMap = matches.reduce((acc, match) => {
    if (!acc[match.round]) {
      acc[match.round] = [];
    }
    acc[match.round].push(match);
    return acc;
  }, {} as Record<number, Match[]>);

  const rounds = Object.entries(roundsMap).sort(([a], [b]) => Number(a) - Number(b));

  const toggleModal = (matchId: string | null = null) => {
    setSelectedMatchId(matchId);
    setModalVisible(!isModalVisible);
    if (!matchId) {
      setPlayer1Score('0');
      setPlayer2Score('0');
    }
  };

  const validateScore = (score: string): string => {
    const parsedScore = parseInt(score, 10) || 0;
    if (parsedScore > maxScore) {
      return String(maxScore);
    }
    return score;
  };

  const handleSetMatchWinner = async () => {
    if (selectedMatchId && onSetWinner) {
      const parsedPlayer1Score = parseInt(player1Score, 10) || 0;
      const parsedPlayer2Score = parseInt(player2Score, 10) || 0;

      if (parsedPlayer1Score + parsedPlayer2Score > maxScore) {
        Alert.alert(
          "Invalid Score",
          `The sum of scores cannot exceed the best of value (${maxScore}). Please adjust the scores.`,
          [{ text: "OK" }]
        );
        return;
      }

      let winnerId = null;

      if (parsedPlayer1Score > parsedPlayer2Score) {
        const match = matches.find(m => m.id === selectedMatchId);
        winnerId = match?.player1_id || null;
      } else if (parsedPlayer2Score > parsedPlayer1Score) {
        const match = matches.find(m => m.id === selectedMatchId);
        winnerId = match?.player2_id || null;
      }

      try {
        const { data: matchData, error: matchError } = await supabase
          .from('matches')
          .update({
            winner_id: winnerId,
            player1_win: parsedPlayer1Score,
            player2_win: parsedPlayer2Score,
            player1_loss: parsedPlayer2Score,
            player2_loss: parsedPlayer1Score,
            status: 'completed'
          })
          .eq('id', selectedMatchId)
          .select('player1_id, player2_id, tournament_id')
          .single();

        if (matchError) {
          console.error("Error updating match:", matchError);
          return;
        }

        // Call the SQL function to update matches_won in tournament_participants
        const { error: rpcError } = await supabase.rpc('update_tournament_participants_matches_won');

        if (rpcError) {
          console.error("Error calling rpc function:", rpcError);
        }

        onSetWinner(selectedMatchId, winnerId, parsedPlayer1Score, parsedPlayer2Score);
        setMatchScores(prevScores => ({
          ...prevScores,
          [selectedMatchId]: `${parsedPlayer1Score} - ${parsedPlayer2Score}`
        }));
        toggleModal();
      } catch (error) {
        console.error("Error updating match:", error);
        // Handle error (e.g., show an alert)
      }
    }
  };

  if (tournamentStatus === 'draft') {
    return <Text style={styles.noMatches}>Tournament not started yet.</Text>;
  }

  return (
    <View style={styles.container}>
      <Modal
        isVisible={isModalVisible}
        onBackdropPress={() => toggleModal()}
        style={styles.modal}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Set Match Results</Text>
          {selectedMatch && (
            <>
              <View style={styles.scoreInputContainer}>
                <Text style={styles.modalText}>{selectedMatch.player1} Score:</Text>
                <TextInput
                  style={styles.scoreInput}
                  keyboardType="number-pad"
                  value={player1Score}
                  onChangeText={(text) => setPlayer1Score(validateScore(text))}
                />
              </View>
              <View style={styles.scoreInputContainer}>
                <Text style={styles.modalText}>{selectedMatch.player2} Score:</Text>
                <TextInput
                  style={styles.scoreInput}
                  keyboardType="number-pad"
                  value={player2Score}
                  onChangeText={(text) => setPlayer2Score(validateScore(text))}
                />
              </View>
            </>
          )}
          <TouchableOpacity style={styles.modalButton} onPress={handleSetMatchWinner}>
            <Text style={styles.modalButtonText}>Confirm Results</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalButton} onPress={() => toggleModal()}>
            <Text style={styles.modalButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
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
                {onSetWinner && tournamentStatus === 'in_progress' && match.status === 'scheduled' ? (
                  <View style={[styles.winnerButtons, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                    <View style={styles.playerContainer}>
                      <Image
                        source={{ uri: profileImages[match.player1_id] || '/icons/profile1.png' }}
                        style={styles.profileImage}
                      />
                      <Text style={[styles.playerName, { width: 100 }]}>{match.player1}</Text>
                    </View>
                      <TouchableOpacity
                        style={styles.setResultsButton}
                        onPress={() => toggleModal(match.id)}
                      >
                        <Text style={styles.setResultsText}>Set Results</Text>
                      </TouchableOpacity>
                    <View style={styles.playerContainer}>
                      <Image
                        source={{ uri: profileImages[match.player2_id] || '/icons/profile1.png' }}
                        style={styles.profileImage}
                      />
                      <Text style={[styles.playerName, { width: 100 }]}>{match.player2}</Text>
                    </View>
                  </View>
                ) : (
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
  noMatches: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },
  setResultsButton: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 5,
  },
  setResultsText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modal: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '90%', // Increased width
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 5,
  },
  modalButton: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  scoreInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  scoreInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 8,
    marginLeft: 10,
  },
});
