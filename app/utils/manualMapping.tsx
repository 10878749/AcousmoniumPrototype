// // app/manualMapping.tsx
// import React, { useState, useEffect } from 'react';
// import {
//     View,
//     Text,
//     TextInput,
//     TouchableOpacity,
//     StyleSheet,
//     ScrollView,
//     Alert,
// } from 'react-native';
// import AsyncStorage from '@react-native-async-storage/async-storage';
//
// /**
//  * Each mapping item has a speakerId (e.g. "nexo1") and a numeric fader.
//  */
// interface SpeakerFaderItem {
//     speakerId: string;
//     fader: number;
// }
//
// // Default mapping using nexo1–nexo7
// const defaultMapping: SpeakerFaderItem[] = [
//     { speakerId: 'nexo1', fader: 1 },
//     { speakerId: 'nexo2', fader: 2 },
//     { speakerId: 'nexo3', fader: 3 },
//     { speakerId: 'nexo4', fader: 4 },
//     { speakerId: 'nexo5', fader: 5 },
//     { speakerId: 'nexo6', fader: 6 },
//     { speakerId: 'nexo7', fader: 7 },
// ];
//
// const ManualMappingScreen: React.FC = () => {
//     const [speakerFaderConfig, setSpeakerFaderConfig] = useState<SpeakerFaderItem[]>(defaultMapping);
//
//     useEffect(() => {
//         (async () => {
//             try {
//                 const storedConfig = await AsyncStorage.getItem('speakerFaderConfig');
//                 if (storedConfig) {
//                     // If there's existing data, parse and use it
//                     setSpeakerFaderConfig(JSON.parse(storedConfig));
//                 } else {
//                     // If no config found, store the default mapping
//                     await AsyncStorage.setItem('speakerFaderConfig', JSON.stringify(defaultMapping));
//                     console.log('No stored config found. Default mapping applied and saved.');
//                 }
//             } catch (error) {
//                 console.log('Error loading config:', error);
//             }
//         })();
//     }, []);
//
//     /**
//      * Save the current mapping to AsyncStorage
//      */
//     const handleSave = async () => {
//         try {
//             await AsyncStorage.setItem('speakerFaderConfig', JSON.stringify(speakerFaderConfig));
//             Alert.alert('Saved', 'Configuration saved successfully');
//         } catch (error) {
//             console.log('Error saving config:', error);
//         }
//     };
//
//     /**
//      * Update fader value for a specific item in the list
//      */
//     const handleFaderChange = (index: number, text: string) => {
//         const newFader = parseInt(text, 10) || 0; // fallback to 0 if NaN
//         const updatedConfig = [...speakerFaderConfig];
//         updatedConfig[index].fader = newFader;
//         setSpeakerFaderConfig(updatedConfig);
//     };
//
//     return (
//         <View style={styles.container}>
//             <Text style={styles.title}>Manual Speaker-Fader Mapping</Text>
//
//             <ScrollView style={styles.table}>
//                 {speakerFaderConfig.map((item, index) => (
//                     <View style={styles.row} key={index}>
//                         <Text style={styles.cell}>{item.speakerId}</Text>
//                         <TextInput
//                             style={[styles.cell, styles.input]}
//                             keyboardType="numeric"
//                             value={String(item.fader)}
//                             onChangeText={(text) => handleFaderChange(index, text)}
//                         />
//                     </View>
//                 ))}
//             </ScrollView>
//
//             <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
//                 <Text style={styles.saveButtonText}>Save</Text>
//             </TouchableOpacity>
//         </View>
//     );
// };
//
// export default ManualMappingScreen;
//
// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//         padding: 16,
//         backgroundColor: '#fff',
//     },
//     title: {
//         fontSize: 20,
//         marginBottom: 12,
//         textAlign: 'center',
//     },
//     table: {
//         flex: 1,
//         marginBottom: 16,
//     },
//     row: {
//         flexDirection: 'row',
//         borderBottomWidth: 1,
//         borderColor: '#ccc',
//         paddingVertical: 8,
//         alignItems: 'center',
//     },
//     cell: {
//         flex: 1,
//         fontSize: 16,
//     },
//     input: {
//         borderWidth: 1,
//         borderColor: '#ccc',
//         marginHorizontal: 8,
//         paddingHorizontal: 8,
//         borderRadius: 4,
//         textAlign: 'center',
//     },
//     saveButton: {
//         backgroundColor: '#007bff',
//         borderRadius: 4,
//         padding: 12,
//         alignItems: 'center',
//     },
//     saveButtonText: {
//         color: '#fff',
//         fontSize: 16,
//     },
// });
