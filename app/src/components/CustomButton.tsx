import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useContext } from "react";
import ThemeContext from "../context/theme";


export default function CustomButton({text, handlePress}) {
    const theme = useContext(ThemeContext);
    const styles = getStyles(theme);

    return (
        <TouchableOpacity style={styles.button} onPress={() => handlePress()}>
            <View>
                <Text style={styles.text}>{text}</Text>
            </View>
        </TouchableOpacity>
    )
}

function getStyles(theme) {
    return StyleSheet.create({
        button: {
            backgroundColor: theme === 'light' ? darkButton.backgroundColor : '#fafafa',
            padding: 16,
            borderRadius: 16,
            margin: 16,
            alignItems: 'center',
            justifyContent: 'center',
        },
        text: {
            color: theme === 'light' ? '#fafafa' : '#212121',
        }
    });
}

const darkButton = {
    backgroundColor: '#000',
    color: '#fafafa',
}