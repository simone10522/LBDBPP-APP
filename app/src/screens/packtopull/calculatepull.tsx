import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from "react-native";
import { useAuth } from '../../hooks/useAuth';
import { lightPalette, darkPalette } from '../../context/themes';
import cardDataSetsA1 from '../../../assets/cards/modified/A1.json';
import cardDataSetsA2 from '../../../assets/cards/modified/A2.json';
import cardDataSetsA3 from '../../../assets/cards/modified/A3.json';
import { supabase } from '../../lib/supabase';
import boosterListA1 from '../../../assets/cards/boosterpack/A1list.json';
import boosterListA2 from '../../../assets/cards/boosterpack/A2list.json';
import boosterListA3 from '../../../assets/cards/boosterpack/A3list.json';
import { SafeAreaView } from 'react-native-safe-area-context';

const rarityRatesA1 = {
    "One Diamond": [100.0, 100.0, 100.0, 0, 0],
    "Two Diamond": [0, 0, 0, 90.000, 60.000],
    "Three Diamond": [0, 0, 0, 5.0, 20.0],
    "Four Diamond": [0, 0, 0, 1.666, 6.664],
    "One Star": [0, 0, 0, 2.572, 10.288],
    "Two Star": [0, 0, 0, 0.500, 2.000],
    "Three Star": [0, 0, 0, 0.222, 0.888],
    "Crown": [0, 0, 0, 0.040, 0.160],
};
const rarityRatesA2 = {
    "One Diamond": [100.0, 100.0, 100.0, 0, 0],
    "Two Diamond": [0, 0, 0, 90.000, 60.000],
    "Three Diamond": [0, 0, 0, 5.0, 20.0],
    "Four Diamond": [0, 0, 0, 1.666, 6.664],
    "One Star": [0, 0, 0, 2.572, 10.288],
    "Two Star": [0, 0, 0, 0.500, 2.000],
    "Three Star": [0, 0, 0, 0.222, 0.888],
    "Crown": [0, 0, 0, 0.040, 0.160],
};
const rarityRatesA3 = {
    "One Diamond": [100.0, 100.0, 100.0, 0, 0],
    "Two Diamond": [0, 0, 0, 89.000, 56.000],
    "Three Diamond": [0, 0, 0, 4.952, 19.810],
    "Four Diamond": [0, 0, 0, 1.666, 6.664],
    "One Star": [0, 0, 0, 2.572, 10.288],
    "Two Star": [0, 0, 0, 0.500, 2.000],
    "Three Star": [0, 0, 0, 0.222, 0.888],
    "One Shiny": [0, 0, 0, 0.714, 2.857],
    "Two Shiny": [0, 0, 0, 0.333, 1.333],
    "Crown": [0, 0, 0, 0.040, 0.160],
};

function normalizeRarity(rarity: string | null | undefined): string {
  if (!rarity || typeof rarity !== 'string') {
    console.warn("Invalid rarity value:", rarity);
    return "None";
  }

  try {
    const r = rarity.toLowerCase().trim();
    const rarityMap: Record<string, string> = {
      "one diamond": "One Diamond",
      "two diamond": "Two Diamond",
      "three diamond": "Three Diamond",
      "four diamond": "Four Diamond",
      "one star": "One Star",
      "two star": "Two Star",
      "three star": "Three Star",
      "crown": "Crown",
      "one shiny": "One Shiny",      // <-- aggiunto
      "two shiny": "Two Shiny",      // <-- aggiunto
    };

    for (const [key, value] of Object.entries(rarityMap)) {
      if (r === key) {
        return value;
      }
    }
    console.warn("Unknown rarity format:", rarity);
    return "None";
  } catch (error) {
    console.warn("Error in normalizeRarity:", error);
    return "None";
  }
}

const EXPANSIONS = [
  { key: 'A1', name: 'Genetic Apex', boosterList: boosterListA1, dbKey: 'genetic_apex', rarityRates: rarityRatesA1 },
  { key: 'A2', name: 'Space-Time Smackdown', boosterList: boosterListA2, dbKey: 'space_time_smackdown', rarityRates: rarityRatesA2 },
  { key: 'A3', name: 'Celestial Guardians', boosterList: boosterListA3, dbKey: 'celestial_guardians', rarityRates: rarityRatesA3 }, // <--- usa la variabile importata
];

const CalculatePullScreen = () => {
	const [selectedExpansion, setSelectedExpansion] = useState(EXPANSIONS[0]);
	const boosterList = selectedExpansion.boosterList;
	const [ownedCardIds, setOwnedCardIds] = useState<string[]>([]);
	const { isDarkMode, user } = useAuth();
	const currentPalette = isDarkMode ? darkPalette : lightPalette;
	const [refreshing, setRefreshing] = useState(false);
	const [ownedCardsByPack, setOwnedCardsByPack] = useState<Record<string, string[]>>({});
	const [ownedCardsByPackA2, setOwnedCardsByPackA2] = useState<Record<string, string[]>>({});
	const [ownedCardsByPackA3, setOwnedCardsByPackA3] = useState<Record<string, string[]>>({});

	const fetchOwnedCards = async () => {
		if (!user) return;
		try {
			const { data, error } = await supabase
				.from('cardpack')
				.select('genetic_apex, space_time_smackdown, celestial_guardians')
				.eq('user_id', user.id)
				.single();

			if (error) throw error;

			// Genetic Apex
			const ownedA1: Record<string, string[]> = {
				'CHARIZARD': [],
				'MEWTWO': [],
				'PIKACHU': []
			};
			if (data?.genetic_apex) {
				Object.entries(data.genetic_apex).forEach(([packName, packData]) => {
					if (packData && 'cards' in packData) {
							ownedA1[packName.toUpperCase()] = packData.cards.map((card: { id: string }) => card.id);
					}
				});
			}
			setOwnedCardsByPack(ownedA1);

			// Space-Time Smackdown
			const ownedA2: Record<string, string[]> = {};
			if (data?.space_time_smackdown) {
				Object.entries(data.space_time_smackdown).forEach(([packName, packData]) => {
					if (packData && 'cards' in packData) {
						ownedA2[packName.toUpperCase()] = packData.cards.map((card: { id: string }) => card.id);
					}
				});
			}
			setOwnedCardsByPackA2(ownedA2);

			// Celestial Guardians
			const ownedA3: Record<string, string[]> = {};
			if (data?.celestial_guardians) {
				Object.entries(data.celestial_guardians).forEach(([packName, packData]) => {
					if (packData && 'cards' in packData) {
						ownedA3[packName.toUpperCase()] = packData.cards.map((card: { id: string }) => card.id);
					}
				});
			}
			setOwnedCardsByPackA3(ownedA3);

		} catch (error) {
			console.error('Error fetching cards from Supabase:', error);
			// Inizializza con array vuoti in caso di errore
			setOwnedCardsByPack({
				'CHARIZARD': [],
				'MEWTWO': [],
				'PIKACHU': []
				});
			setOwnedCardsByPackA2({});
			setOwnedCardsByPackA3({});
		}
	};

	useEffect(() => {
		fetchOwnedCards();
	}, []);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		await fetchOwnedCards();
		setRefreshing(false);
	}, []);

	// Usa A1list.json come fonte unica per le informazioni del pacchetto
	// BoosterData è un oggetto con chiave "CHARIZARD", "MEWTWO", "PIKACHU" e un array "cards" (con id e rarity)

	// Raggruppa una lista di carte per rarità
	function groupByRarity(list: any[]) {
		const groups: Record<string, any[]> = {};
		list.forEach(card => {
			const rarity = card.rarity;
			if (!groups[rarity]) groups[rarity] = [];
			groups[rarity].push(card);
		});
		return groups;
	}

	// Nuovo algoritmo basato su A1list.json:
	// 1. Estrae il booster data dal file in base al packName (convertito in uppercase).
	// 2. Determina quali carte sono mancanti confrontando l'id con ownedCardIds.
	// 3. Raggruppa le carte per rarità.
	// 4. Per ogni posizione (0-4), calcola:
	//      p_pos = ∑ ( dropRate[r][pos] * (missingCount[r] / totalCount[r]) )
	// 5. Booster chance = (1 - ∏ (1 - p_pos)) * 100, con limiti a [0,100].
	function getPackChanceOld(packName: string) {
		const boosterData = boosterList[packName.toUpperCase()];
		if (!boosterData || !boosterData.cards || boosterData.cards.length === 0) return 0;
		
		// Carte mancanti: quelle in boosterData ma non possedute
		const missingBoosterCards = boosterData.cards.filter(card => !ownedCardIds.includes(card.id));
		
		if (boosterData.cards.length > 0 && missingBoosterCards.length === boosterData.cards.length) return 100;
		if (missingBoosterCards.length === 0) return 0;

		// Raggruppa le carte dell'intero booster per rarità
		const boosterGroups = groupByRarity(boosterData.cards);
		
		let productNoNew = 1.0;
		// Per ogni posizione (le posizioni sono fisse: 0 a 4)
		for (let pos = 0; pos < 5; pos++) {
			let pPos = 0;
			Object.keys(boosterGroups).forEach(rarity => {
				const group = boosterGroups[rarity];
				const totalCount = group.length;
				// Conta quante carte mancanti di questa rarità
				const missingCount = group.filter(card => !ownedCardIds.includes(card.id)).length;
				const dropRate = rarityRates[rarity] ? rarityRates[rarity][pos] / 100 : 0;
				if (totalCount > 0 && dropRate > 0) {
					pPos += dropRate * (missingCount / totalCount);
				};
			});
			productNoNew *= (1 - pPos);
		}
		const chance = (1 - productNoNew) * 100;
		return Math.max(0, Math.min(chance, 100));
	}

	// Helper to get owned cards for a specific pack
	function getOwnedForPack(packName: string): string[] {
		return ownedCardsByPack[packName.toUpperCase()] ?? [];
	}

  // Tutte le funzioni che usano boosterList devono stare qui dentro!
  function getSlotChances(packName: string, ownedCardIds: string[], boosterList: any, rarityRates: any): number[] {
    if (!packName || !ownedCardIds) {
      console.warn("Invalid parameters in getSlotChances");
      return [0, 0, 0, 0, 0];
    }
  
    const boosterData = boosterList[packName.toUpperCase()];
    if (!boosterData?.cards?.length) {
      console.warn("No booster data found for pack:", packName);
      return [0, 0, 0, 0, 0];
    }
  
    // Group cards by rarity
    const groups = boosterData.cards.reduce((acc: Record<string, any[]>, card) => {
      if (!card) return acc;
      const normalizedRarity = normalizeRarity(card.rarity);
      if (!acc[normalizedRarity]) acc[normalizedRarity] = [];
      acc[normalizedRarity].push(card);
      return acc;
    }, {});
  
    const slotChances: number[] = [];
    for (let pos = 0; pos < 5; pos++) {
      // Calculate probability to find a new card in this slot
      let pNew = 0;
      Object.keys(groups).forEach(rarity => {
        const group = groups[rarity];
        const totalCount = group.length;
        // Normalize rarity here
        const normalizedRarity = normalizeRarity(rarity);
        const dropRate = rarityRates[normalizedRarity] ? rarityRates[normalizedRarity][pos] / 100 : 0;
        if (totalCount > 0 && dropRate > 0) {
          const ownedCount = group.filter(card => ownedCardIds.includes(card.id)).length;
          const missingCount = totalCount - ownedCount;
          pNew += dropRate * (missingCount / totalCount);
        }
      });
      slotChances.push(Math.min(pNew, 1) * 100);
    }
    return slotChances;
  }
  
  function getCombinedSlotChance(packName: string, ownedCardIds: string[], boosterList: any, rarityRates: any): number {
    const slots = getSlotChances(packName, ownedCardIds, boosterList, rarityRates);
    if (slots.length < 3) return 0;
    // Combined chance for positions 1-3 = 1 - product of (1 - slotChance)
    const combined = 1 - ((1 - slots[0] / 100) * (1 - slots[1] / 100) * (1 - slots[2] / 100));
    return combined * 100;
  }
  
  function getPackChance(packName: string, ownedCardIds: string[], boosterList: any, rarityRates: any): number {
    const slots = getSlotChances(packName, ownedCardIds, boosterList, rarityRates);
    const productNoNew = slots.reduce((prod, slotChance) => prod * (1 - slotChance / 100), 1);
    const overallChance = (1 - productNoNew) * 100;
    return Math.max(0, Math.min(overallChance, 100));
  }
  
  function getOneDiamondNewPercent(packName: string, ownedCardIds: string[]): number {
      const boosterData = boosterList[packName.toUpperCase()];
      const oneDiamondCards = boosterData.cards.filter(card => card.rarity === "One Diamond");
      if (oneDiamondCards.length === 0) return 100;
      const missingOneDiamond = oneDiamondCards.filter(card => !ownedCardIds.includes(card.id));
      return (missingOneDiamond.length / oneDiamondCards.length) * 100;
  }
  
  function getNewPercentByRarity(packName: string, ownedCardIds: string[], rarity: string): number | null {
    const boosterData = boosterList[packName.toUpperCase()];
    const normalized = normalizeRarity(rarity);
    const cards = boosterData.cards.filter(card => normalizeRarity(card.rarity) === normalized);
    const missing = cards.filter(card => !(ownedCardIds ?? []).includes(card.id));
    if (cards.length === 0) return null;
    return (missing.length / cards.length) * 100;
  }
  
  function getRaritiesForSlot(slot: number, rarityRates: any): string[] {
      return Object.keys(rarityRates).filter(rarity => rarityRates[rarity][slot] > 0);
  }
  
  function getSlotProbabilityLikeReference(packName, ownedCardIds, slot, boosterList, rarityRates) {
    const boosterData = boosterList[packName.toUpperCase()];
    if (!boosterData) return "—";
    
    // Totale carte che possono uscire in questo slot e quante mancano
    const possibleRarities = getRaritiesForSlot(slot, rarityRates);
    let totalCards = 0;
    let missingCards = 0;
    
    possibleRarities.forEach(rarity => {
      const cardsOfRarity = boosterData.cards.filter(card => 
        normalizeRarity(card.rarity) === rarity
      );
      totalCards += cardsOfRarity.length;
      missingCards += cardsOfRarity.filter(card => 
        !ownedCardIds.includes(card.id)
      ).length;
    });
    
    if (totalCards === 0) return "—";
    
    // Percentuale base di carte mancanti, da 0 a 100
    return (missingCards / totalCards * 100).toFixed(3) + "%";
  }

	// Helper to get owned cards for a specific pack and expansion
	function getOwnedForPack(packName: string, expansionKey: string): string[] {
		if (expansionKey === 'A1') {
			return ownedCardsByPack[packName.toUpperCase()] ?? [];
		}
		if (expansionKey === 'A2') {
			return ownedCardsByPackA2[packName.toUpperCase()] ?? [];
		}
		if (expansionKey === 'A3') {
			return ownedCardsByPackA3[packName.toUpperCase()] ?? [];
		}
		return [];
	}

	// Helper to get all pack names for the selected expansion
	function getPackNamesForExpansion(expansion: typeof EXPANSIONS[0]) {
		return Object.keys(expansion.boosterList);
	}

	// Helper to get pack chances for a given expansion
	function getPackChancesForExpansion(expansion: typeof EXPANSIONS[0]) {
		const packNames = getPackNamesForExpansion(expansion);
		const chances: Record<string, number> = {};
		packNames.forEach(pack => {
			chances[pack.toLowerCase()] = getPackChance(pack, getOwnedForPack(pack, expansion.key), expansion.boosterList, expansion.rarityRates);
		});
		return chances;
	}

	// Helper to get slot details for a given expansion
	function getPackSlotDetailsForExpansion(expansion: typeof EXPANSIONS[0]) {
		const packNames = getPackNamesForExpansion(expansion);
		const details: Record<string, any> = {};
		packNames.forEach(pack => {
			details[pack.toLowerCase()] = {
				combined: getCombinedSlotChance(pack, getOwnedForPack(pack, expansion.key), expansion.boosterList, expansion.rarityRates),
				slot4: getSlotChances(pack, getOwnedForPack(pack, expansion.key), expansion.boosterList, expansion.rarityRates)[3],
				slot5: getSlotChances(pack, getOwnedForPack(pack, expansion.key), expansion.boosterList, expansion.rarityRates)[4]
			};
		});
		return details;
	}

	// Nuova funzione ottimizzata per il calcolo delle probabilità con drop rate ufficiali
	function getOfficialDropRateProbability(packName: string, ownedCardIds: string[], slot: number, boosterList: any, rarityRates: any): string {
		const boosterData = boosterList[packName.toUpperCase()];
		if (!boosterData) return "—";
		
		const rarities = getRaritiesForSlot(slot, rarityRates);
		if (rarities.length === 0) return "—";
		
		let totalProbability = 0;
		
		// Per ogni rarità che può apparire in questo slot
		rarities.forEach(rarity => {
			// Trova tutte le carte di questa rarità
			const cards = boosterData.cards.filter(card => 
				normalizeRarity(card.rarity) === rarity
			);
			
			if (cards.length > 0) {
				// Prendi il drop rate ufficiale
				const dropRate = rarityRates[rarity][slot];
				
				// Calcola quante carte mancano
				const missingCards = cards.filter(card => !ownedCardIds.includes(card.id));
				const missingPercent = missingCards.length / cards.length;
				
				// Calcola la probabilità di trovare una nuova carta di questa rarità
				totalProbability += (dropRate * missingPercent);
			}
		});
		
		return totalProbability.toFixed(3) + "%";
	}

	// Calcola la probabilità per gli slot 1-3 (che sono tutte carte One Diamond)
	function getSlots1to3Probability(packName: string, ownedCardIds: string[], boosterList: any): string {
		const boosterData = boosterList[packName.toUpperCase()];
		if (!boosterData) return "—";
		
		// Trova tutte le carte One Diamond
		const oneDiamondCards = boosterData.cards.filter(card => 
			normalizeRarity(card.rarity) === "One Diamond"
		);
		
		if (oneDiamondCards.length === 0) return "—";
		
		// Calcola quante carte One Diamond mancano
		const missingCards = oneDiamondCards.filter(card => !ownedCardIds.includes(card.id));
		const missingPercent = missingCards.length / oneDiamondCards.length;
		
		// Probabilità di non trovare una nuova carta in nessuno dei 3 slot
		const probNoNewCard = Math.pow(1 - missingPercent, 3);
		
		// Probabilità di trovare almeno una nuova carta nei 3 slot
		const probAtLeastOneNew = (1 - probNoNewCard) * 100;
		
		return probAtLeastOneNew.toFixed(3) + "%";
	}

	// Render a table for a given expansion
	function renderExpansionTable(expansion: typeof EXPANSIONS[0]) {
		const packNames = getPackNamesForExpansion(expansion);
		const packChances = getPackChancesForExpansion(expansion);

		return (
			<View style={styles.tableContainer} key={expansion.key}>
				<Text style={[styles.title, { color: currentPalette.text }]}>
					{expansion.name}
				</Text>
				<View style={styles.tableHeader}>
					<Text style={[styles.headerCell, { color: 'white' }]}>Pacchetto</Text>
					<Text style={[styles.headerCell, { color: 'white' }]}>Slot 1-3</Text>
					<Text style={[styles.headerCell, { color: 'white' }]}>Slot 4</Text>
					<Text style={[styles.headerCell, { color: 'white' }]}>Slot 5</Text>
				</View>
				{packNames.map(pack => {
					const owned = getOwnedForPack(pack, expansion.key).length;
					const total = expansion.boosterList[pack.toUpperCase()]?.cards?.length ?? 0;
					return (
						<View key={pack} style={[styles.tableRow, { backgroundColor: currentPalette.cardBackground }]}>
							<Text style={[styles.cell, { color: currentPalette.text }]}>
								{pack.charAt(0).toUpperCase() + pack.slice(1).toLowerCase()} ({owned}/{total})
							</Text>
							{/* Slot 1-3: probabilità combinata con nuovo calcolo */}
							<Text style={[styles.cell, { color: currentPalette.text }]}>
								{getSlots1to3Probability(pack, getOwnedForPack(pack, expansion.key), expansion.boosterList)}
							</Text>
							{/* Slot 4 - usa il calcolo con drop rate ufficiali */}
							<Text style={[styles.cell, { color: currentPalette.text }]}>
								{getOfficialDropRateProbability(pack, getOwnedForPack(pack, expansion.key), 3, expansion.boosterList, expansion.rarityRates)}
							</Text>
							{/* Slot 5 - usa il calcolo con drop rate ufficiali */}
							<Text style={[styles.cell, { color: currentPalette.text }]}>
								{getOfficialDropRateProbability(pack, getOwnedForPack(pack, expansion.key), 4, expansion.boosterList, expansion.rarityRates)}
							</Text>
						</View>
					);
				})}
			</View>
		);
	}

	// Find best pack for each expansion
	function getBestPackName(packChances: Record<string, number>) {
		const best = Object.entries(packChances).reduce((a, b) => a[1] > b[1] ? a : b)[0];
		return best.charAt(0).toUpperCase() + best.slice(1);
	}

	return (
			<SafeAreaView style={{ flex: 1, backgroundColor: currentPalette.background }}>
				<ScrollView
					style={[styles.container, { backgroundColor: currentPalette.background }]}
					refreshControl={
						<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
					}
				>
					{/* Table for Genetic Apex */}
					{renderExpansionTable(EXPANSIONS[0])}
					<View style={[styles.totalBlock, { backgroundColor: currentPalette.cardBackground }]}>
						<Text style={[styles.totalTitle, { color: currentPalette.text }]}>
							Pacchetto Consigliato:{' '}
							{getBestPackName(getPackChancesForExpansion(EXPANSIONS[0]))}
						</Text>
					</View>

					{/* Table for Space-Time Smackdown */}
					{renderExpansionTable(EXPANSIONS[1])}
					<View style={[styles.totalBlock, { backgroundColor: currentPalette.cardBackground }]}>
						<Text style={[styles.totalTitle, { color: currentPalette.text }]}>
							Pacchetto Consigliato:{' '}
							{getBestPackName(getPackChancesForExpansion(EXPANSIONS[1]))}
						</Text>
					</View>

					{/* Table for Celestial Guardians */}
					{renderExpansionTable(EXPANSIONS[2])}
					<View style={[styles.totalBlock, { backgroundColor: currentPalette.cardBackground }]}>
						<Text style={[styles.totalTitle, { color: currentPalette.text }]}>
							Pacchetto Consigliato:{' '}
							{getBestPackName(getPackChancesForExpansion(EXPANSIONS[2]))}
						</Text>
					</View>
					            
								{/* Spacer per evitare che la bottom bar copra il contenuto */}
								<View style={{ height: 50 }} />
				</ScrollView>
			</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: { 
		flex: 1, 
		padding: 16,
		paddingBottom: 100 
	},
	title: { 
		fontSize: 24, 
		fontWeight: "bold", 
		marginBottom: 20,
		textAlign: 'center'
	},
	tableContainer: {
		margin: 10,
		borderRadius: 1,
		overflow: 'hidden'
	},
	tableHeader: {
		flexDirection: 'row',
		padding: 10,
		backgroundColor: '#2196F3',
		alignItems: 'center', // aggiunto
	},
	tableRow: {
		flexDirection: 'row',
		padding: 10,
		borderBottomWidth: 1,
		borderBottomColor: '#ddd',
		alignItems: 'center', // aggiunto
        minHeight: 40, // opzionale per migliore allineamento
	},
	headerCell: {
		flex: 1,
		fontWeight: 'bold',
		fontSize: 16,
		textAlign: 'center',
		color: 'white',
		textAlignVertical: 'center', // aggiunto
	},
	cell: {
		flex: 1,
		fontSize: 14,
		textAlign: 'center',
		textAlignVertical: 'center', // aggiunto
	},
	totalBlock: { 
		marginTop: 20, 
		padding: 15, 
		borderRadius: 8,
		alignItems: 'center'
	},
	totalTitle: { 
		fontWeight: "bold", 
		fontSize: 18 
	},
});

export default CalculatePullScreen;