// app/settings.tsx
import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';

import EQControl from './components/EQControl';
import Colors from './constants/Colors';
import { updateFader } from './utils/Control';

interface SpeakerFaderItem {
    speakerId: string;
    fader: number;
}

/**
 * Hard-coded mapping: "nexo1" -> fader 1, "nexo2" -> fader 2, etc.
 */
const hardcodedMapping: SpeakerFaderItem[] = [
    { speakerId: 'nexo1', fader: 16 },
    { speakerId: 'nexo2', fader: 17 },
    { speakerId: 'nexo3', fader: 18 },
    { speakerId: 'nexo4', fader: 19 },
    { speakerId: 'nexo5', fader: 20 },
    { speakerId: 'nexo6', fader: 21 },
    { speakerId: 'nexo7', fader: 22 },
    { speakerId: 'nexo8', fader: 23 }
];

const SettingsScreen: React.FC = () => {
    // We expect multiple IDs or a single ID? For simplicity assume multiple
    const { speakerIds } = useLocalSearchParams<{ speakerIds: string }>();
    const router = useRouter();

    // Convert query param to array of IDs
    const selectedIds = speakerIds ? speakerIds.split(',') : [];

    // Local slider state (0..1)
    const [volume, setVolume] = useState(0.5);

    /**
     * Called on real-time slider change.
     * For each speakerId in selectedIds, find the fader from our hardcoded mapping
     * and call updateFader(...).
     */
    const handleVolumeChange = (sliderValue: number) => {
        setVolume(sliderValue);

        // Map 0..1 to 0..1023
        const mappedValue = Math.round(sliderValue * 1023);

        selectedIds.forEach((id) => {
            // Find fader
            const item = hardcodedMapping.find((m) => m.speakerId === id);
            if (!item) {
                console.warn(`No hardcoded mapping found for speakerId: ${id}`);
                return;
            }
            updateFader(item.fader, mappedValue);
        });
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>
                Selected Speakers: {selectedIds.join(', ')}
            </Text>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Volume</Text>
                <Slider
                    value={volume}
                    onValueChange={handleVolumeChange}
                    minimumValue={0}
                    maximumValue={1}
                    step={0.01}
                    style={styles.slider}
                    minimumTrackTintColor={Colors.primary}
                    maximumTrackTintColor={Colors.controlBackground}
                />
                <Text style={styles.valueText}>{Math.round(volume * 1023)}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>EQ</Text>
                <EQControl width={220} height={100} />
            </View>

            <TouchableOpacity onPress={() => router.back()} style={styles.button}>
                <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
        </View>
    );
};

export default SettingsScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
        alignItems: 'center',
    },
    title: {
        fontSize: 22,
        marginBottom: 20,
    },
    section: {
        width: '100%',
        marginBottom: 30,
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        marginBottom: 10,
    },
    slider: {
        width: '80%',
        height: 40,
    },
    valueText: {
        fontSize: 16,
        marginTop: 5,
    },
    button: {
        padding: 10,
        backgroundColor: Colors.primary,
        borderRadius: 5,
        marginTop: 20,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
    },
});
