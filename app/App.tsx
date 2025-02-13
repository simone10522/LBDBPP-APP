import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import screens for navigation
import HomeScreen from './src/screens/HomeScreen';
import TournamentDetailsScreen from './src/screens/TournamentDetailsScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ManageParticipantsScreen from './src/screens/ManageParticipantsScreen';
import ManageDecksScreen from './src/screens/ManageDecksScreen';
import CreateTournamentScreen from './src/screens/CreateTournamentScreen';
import EditTournamentScreen from './src/screens/EditTournamentScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import ProfileScreen from './src/screens/ProfileScreen'; // Import ProfileScreen
import BottomNavigationBar from './src/components/BottomNavigationBar'; // Import BottomNavigationBar
import TournamentPage from './src/screens/TournamentPage'; // Import TournamentPage

// Import React Native components for UI and styling
import { Platform, View, StyleSheet, SafeAreaView } from 'react-native';

//Utils
import { useAuth } from './src/hooks/_useAuth';
const user = true; // Set to true for now, to test both scenarios

// Create a stack navigator for screen navigation
const Stack = createNativeStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      {/* Background for the entire application */}
      <View style={styles.background}>
        <SafeAreaView style={{ flex: 1 }}>
          {/* Stack Navigator setup */}
          <Stack.Navigator
            initialRouteName="Home"
            screenOptions={{
              headerTitleStyle: {
                fontSize: 20,
                fontWeight: 'bold',
              },
              headerStyle: {
                backgroundColor: 'transparent', // Make header transparent to blend with background
                paddingTop: Platform.OS === 'android' ? 25 : 0, // Add paddingTop for Android status bar
              },
              headerTintColor: '#fff', // Set header text color to white
              headerTitleAlign: 'center', // Center align header title
              headerShadowVisible: false, // Hide header shadow for cleaner look
              headerTransparent: Platform.OS === 'android', // Make header transparent for Android
              headerShown: false, // Hide default header to use custom header in components
              transitionSpec: {  // Define transition animations for screen transitions
                open: { animation: 'timing', config: { duration: 300 } },
                close: { animation: 'timing', config: { duration: 300 } },
              },
              cardStyleInterpolator: ({ current, next, layouts }) => {
                // Custom card style interpolation for slide animation
                const translateX = next
                  ? next.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -layouts.screen.width], // Slide out to the left when next screen comes in
                    })
                  : current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [layouts.screen.width, 0], // Slide in from the right when current screen is active
                    });
                return {
                  cardStyle: {
                    opacity: current.progress, // Fade in/out animation
                    transform: [{ translateX }], // Slide animation
                  },
                };
              },
            }}
          >
            {/* Define each screen in the stack navigator */}
            {/* Explicitly include both Login and Home screens */}
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Home" component={HomeScreen} />

            {/* Screen for displaying tournament details */}
            <Stack.Screen name="TournamentDetails" component={TournamentDetailsScreen} />
            {/* Screen for user registration */}
            <Stack.Screen name="Register" component={RegisterScreen} />
            {/* Screen for managing tournament participants */}
            <Stack.Screen name="ManageParticipants" component={ManageParticipantsScreen} />
            {/* Screen for managing decks */}
            <Stack.Screen name="ManageDecks" component={ManageDecksScreen} />
            {/* Screen for creating a new tournament */}
            <Stack.Screen name="CreateTournament" component={CreateTournamentScreen} />
            {/* Screen for editing an existing tournament */}
            <Stack.Screen name="EditTournament" component={EditTournamentScreen} />
            {/* Screen for view leaderboard tournament */}
            <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
            {/* Profile Screen */}
            <Stack.Screen name="Profile" component={ProfileScreen} />
            {/* Tournament Page */}
            <Stack.Screen name="TournamentPage" component={TournamentPage} />
          </Stack.Navigator>
        </SafeAreaView>
        <BottomNavigationBar />
      </View>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#222', // Dark background color for the entire app
  },
});

export default App;
