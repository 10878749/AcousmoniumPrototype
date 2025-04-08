// app/_layout.tsx
import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { Slot } from 'expo-router';
import Colors from './constants/Colors';
import { SpeakerSelectionProvider } from './context/SpeakerSelectionContext';

export default function Layout() {
    return (
        <SpeakerSelectionProvider>
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
                <Slot />
            </SafeAreaView>
        </SpeakerSelectionProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.lightGray
    },
});
