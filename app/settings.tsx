// app/settings.tsx
import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';

import Colors from './constants/Colors';
import { updateFader } from './utils/Control';

interface SpeakerFaderItem {
    speakerId: string;
    fader: number;
}

/**
 * Hard-coded mapping: "nexo1" -> fader 16, "nexo2" -> fader 17, etc.
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
    // 从路由参数中获得传入的 speakerIds 查询字符串
    const { speakerIds } = useLocalSearchParams<{ speakerIds: string }>();
    const router = useRouter();

    // 将查询参数转换成数组
    const selectedIds = speakerIds ? speakerIds.split(',') : [];

    // Local slider state (0..1)
    const [volume, setVolume] = useState(0.5);

    /**
     * Called on real-time slider change.
     * Map slider value to 0..1023 and for each selected speaker, call updateFader.
     */
    const handleVolumeChange = (sliderValue: number) => {
        setVolume(sliderValue);
        // Map 0..1 to 0..1023
        const mappedValue = Math.round(sliderValue * 1023);
        selectedIds.forEach((id) => {
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
            {/* 操作区域：上半部分占80% */}
            <View style={styles.operationArea}>
                {/* 顶部文本标签显示选中的扬声器，居中显示 */}
                <Text style={styles.title}>
                    {selectedIds.join(', ')}
                </Text>
                {/* 竖直的音量滑块区域：滑块为矩形且不显示数值 */}
                <View style={styles.verticalSliderContainer}>
                    <Slider
                        style={styles.verticalSlider}
                        value={volume}
                        onValueChange={handleVolumeChange}
                        minimumValue={0}
                        maximumValue={1}
                        step={0.01}
                        minimumTrackTintColor={Colors.primary}
                        maximumTrackTintColor={Colors.controlBackground}
                    />
                </View>
            </View>
            {/* 控制区域：下半部分占20%，仅包含 Close 按钮 */}
            <View style={styles.controlArea}>
                <TouchableOpacity onPress={() => router.back()} style={styles.button}>
                    <Text style={styles.buttonText}>Close</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default SettingsScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    // 操作区域：上半部分
    operationArea: {
        flex: 0.8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // 控制区域：下半部分
    controlArea: {
        flex: 0.2,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.controlBackground,
    },
    title: {
        fontSize: 22,
        marginBottom: 20,
        textAlign: 'center', // 居中显示
        width: '100%',
    },
    // 竖直滑块的容器
    verticalSliderContainer: {
        height: 250,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // 修改后的滑块样式：增大高度、添加背景色和圆角，使其呈现矩形效果
    verticalSlider: {
        width: 250,
        height: 40,
        transform: [{ rotate: '-90deg' }],
        backgroundColor: Colors.controlBackground,
        borderRadius: 5,
    },
    button: {
        padding: 10,
        backgroundColor: Colors.primary,
        borderRadius: 5,
        width: 120,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
    },
});
