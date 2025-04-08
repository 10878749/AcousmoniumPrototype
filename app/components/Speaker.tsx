import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, GestureResponderHandlers, GestureResponderEvent } from 'react-native';
import Colors from '../constants/Colors';

interface Props {
    id: string;
    x: number;
    y: number;
    selected: boolean;
    muted?: boolean;
    onPress: (e: GestureResponderEvent) => void;
    onLongPress: () => void;
    panHandlers?: GestureResponderHandlers;
    // 新增：speakerType 用于区分扬声器类型："NEXO" | "JBL" | "D&B"
    speakerType?: string;
}

const Speaker: React.FC<Props> = ({ id, x, y, selected, muted, onPress, onLongPress, panHandlers, speakerType = "NEXO" }) => {
    // 根据扬声器类型选择 icon（可根据需要自行修改）
    const typeIconMap: { [key: string]: string } = {
        NEXO: '🔊',
        JBL: '🔈',
        "D&B": '🔉',
    };
    // 根据扬声器类型选择默认背景颜色（非选中状态），可自定义
    const typeColorMap: { [key: string]: string } = {
        NEXO: Colors.groupA, // 原有蓝色
        JBL: '#1E90FF',      // 例如道奇蓝
        "D&B": '#32CD32',    // 例如青绿色
    };

    // 若被选中，则使用选中颜色；否则用对应类型的默认颜色
    const backgroundColor = selected ? Colors.selectedSpeaker : (typeColorMap[speakerType] || Colors.groupA);

    return (
        <View style={[styles.speaker, { left: x, top: y, backgroundColor }]} {...(panHandlers || {})}>
            <TouchableOpacity onPress={onPress} onLongPress={onLongPress} style={styles.speakerButton}>
                <Text style={styles.speakerText}>{typeIconMap[speakerType] || '🔊'}</Text>
                {muted && (
                    <View style={styles.muteOverlay}>
                        <Text style={styles.muteIcon}>✕</Text>
                    </View>
                )}
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
        position: 'relative',
    },
    speakerText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 24,
    },
    muteOverlay: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    muteIcon: {
        color: 'white',
        fontSize: 40,
        fontWeight: 'bold',
    },
});
