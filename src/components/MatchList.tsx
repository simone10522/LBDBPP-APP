import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
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

const MatchList: React.FC<MatchListProps> = ({ matches, onSetWinner }) => {
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
    <View style={styles.container}>
      {rounds.map(([round, matches]) => (
        <View key={round}>
          <Text style={styles.roundTitle}>Round {round}</Text>
          <View style={styles.matchesContainer}>
            {matches.map((match) => (
              <View key={match.id} style={styles.matchItem}>
                <View style={styles.playersContainer}>
                  <Text style={match.winner_id === match.player1_id ? styles.winner : {}}>{match.player1}</Text>
                  <Text style={styles.vs}>vs</Text>
                  <Text style={match.winner_id === match.player2_id ? styles.winner : {}}>{match.player2}</Text>
                </View>
                {onSetWinner && match.status !== 'completed' && (
                  <View style={styles.winnerButtons}>
                    <TouchableOpacity
                      onPress={() => onSetWinner(match.id, match.player1_id)}
                      style={styles.winnerButton}
                    >
                      <Image
                        source={{ uri: profileImages[match.player1_id] || '/icons/profile1.png' }}
                        style={styles.profileImage}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => onSetWinner(match.id, match.player2_id)}
                      style={styles.winnerButton}
                    >
                      <Image
                        source={{ uri: profileImages[match.player2_id] || '/icons/profile1.png' }}
                        style={styles.profileImage}
                      />
                    </TouchableOpacity>
                  </View>
                )}
                {match.status === 'completed' && (
                  <View style={styles.completedMatch}>
                    <Image
                      source={{ uri: profileImages[match.player1_id] || '/icons/profile1.png' }}
                      style={[styles.profileImage, match.winner_id !== match.player1_id ? styles.dimmedImage : {}]}
                    />
                    <Image
                      source={{ uri: profileImages[match.player2_id] || '/icons/profile1.png' }}
                      style={[styles.profileImage, match.winner_id !== match.player2_id ? styles.dimmedImage : {}]}
                    />
                  </View>
                )}
              </View>
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
    elevation: 3,
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  winnerButton: {
    padding: 5,
    borderRadius: 5,
  },
  profileImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  completedMatch: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dimmedImage: {
    opacity: 0.5,
  },
});

export default MatchList;
