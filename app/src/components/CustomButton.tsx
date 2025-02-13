import { TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function CustomButton({text, handlePress}) {
    return (
        <TouchableOpacity style={styles.button} onPress={() => handlePress()}>
            <Text>{text}</Text>
        </TouchableOpacity>
    )
}

const styles = StyleSheet.create({
    button: {
        backgroundColor: '#fafafa',
        padding: 16,
        borderRadius: 16,
        margin: 16,
        alignItems: 'center',
        justifyContent: 'center',
        color: '#000',
    }
})