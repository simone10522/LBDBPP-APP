// Utility function to generate round-robin tournament schedule
export function generateRoundRobin(participants: string[]): Array<Array<[string, string]>> {
  const rounds: Array<Array<[string, string]>> = [];
  const n = participants.length;

  // If odd number of participants, add a "bye" player
  const players = n % 2 === 0 ? [...participants] : [...participants, "bye"];
  const numRounds = players.length - 1;
  const numMatchesPerRound = Math.floor(players.length / 2);

  for (let round = 0; round < numRounds; round++) {
    const roundMatches: Array<[string, string]> = [];
    
    for (let match = 0; match < numMatchesPerRound; match++) {
      const home = players[match];
      const away = players[players.length - 1 - match];
      
      if (home !== "bye" && away !== "bye") {
        roundMatches.push([home, away]);
      }
    }
    
    rounds.push(roundMatches);
    
    // Rotate players for next round (first player stays fixed)
    players.splice(1, 0, players.pop()!);
  }

  return rounds;
}
