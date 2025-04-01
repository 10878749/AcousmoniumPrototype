// app/components/Speaker.tsx
import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, GestureResponderHandlers, GestureResponderEvent } from 'react-native';
import Colors from '../constants/Colors';

interface Props {
    id: string;
    x: number;
    y: number;
    selected: boolean;
    onPress: (e: GestureResponderEvent) => void;
    onLongPress: () => void;
    panHandlers?: GestureResponderHandlers;
}

const Speaker: React.FC<Props> = ({ id, x, y, selected, onPress, onLongPress, panHandlers }) => {
    // Just a speaker icon
    const icon = '🔊';

    // If selected, use highlight color; otherwise groupA color
    const backgroundColor = selected ? Colors.selectedSpeaker : Colors.groupA;

    return (
        <View style={[styles.speaker, { left: x, top: y, backgroundColor }]} {...(panHandlers || {})}>
            <TouchableOpacity onPress={onPress} onLongPress={onLongPress} style={styles.speakerButton}>
                <Text style={styles.speakerText}>{icon}</Text>
            </TouchableOpacity>
        </View>
    );
};

export default Speaker;

const styles = StyleSheet.create({
    speaker: {
        position: 'absolute',
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    speakerButton: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    speakerText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 24,
    },
});
