// app/index.tsx
import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Dimensions,
    TouchableWithoutFeedback,
    TouchableOpacity,
    Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Rect } from 'react-native-svg';
import Speaker from './components/Speaker';
import Colors from './constants/Colors';

interface SpeakerData {
    id: string;
    x: number;
    y: number;
}

// 音乐厅实际尺寸（单位：米）
const HALL_WIDTH = 15.1;
const HALL_HEIGHT = 19.4;

// 根据实际测量得到的扬声器坐标（以左下角为原点）
const initialSpeakers: SpeakerData[] = [
    { id: 'nexo1', x: 1.8,  y: 19.4 },
    { id: 'nexo2', x: 13.3, y: 19.4 },
    { id: 'nexo3', x: 15.1, y: 14 },
    { id: 'nexo4', x: 15.1, y: 5.4 },
    { id: 'nexo5', x: 12.8, y: 0 },
    { id: 'nexo6', x: 2.3,  y: 0 },
    { id: 'nexo7', x: 0,    y: 5.4 },
    { id: 'nexo8', x: 0,    y: 15.1 },
];

const FloorPlanScreen: React.FC = () => {
    const router = useRouter();
    const { width, height } = Dimensions.get('window');

    // 设置边缘留白：动态取屏幕宽度的5%
    const MARGIN_RATIO = 0.05;
    const MARGIN = width * MARGIN_RATIO;

    // 将屏幕分为两部分：上半部分（80%）显示平面图，下半部分（20%）为控制区域
    const floorPlanHeight = height * 0.8;
    const controlsHeight = height - floorPlanHeight;

    // 可用绘制区域（扣除边缘留白）
    const availableWidth = width - 2 * MARGIN;
    const availableHeight = floorPlanHeight - 2 * MARGIN;
    const scaleX = availableWidth / HALL_WIDTH;
    const scaleY = availableHeight / HALL_HEIGHT;
    const scale = Math.min(scaleX, scaleY);
    // 计算偏移量：使音乐厅区域在可用区域内居中后再加上边缘留白
    const offsetX = MARGIN + (availableWidth - HALL_WIDTH * scale) / 2;
    const offsetY = MARGIN + (availableHeight - HALL_HEIGHT * scale) / 2;

    // 保存扬声器数据（用于显示）
    const [speakers] = useState<SpeakerData[]>(initialSpeakers);
    // 选中扬声器ID数组
    const [selectedSpeakers, setSelectedSpeakers] = useState<string[]>([]);

    // 单击扬声器：切换选中状态
    const handleSpeakerPress = (id: string) => {
        setSelectedSpeakers((prev) => {
            if (prev.includes(id)) {
                return prev.filter((s) => s !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    // 长按：如果扬声器已选中，则跳转到设置界面，并传递所有选中的ID
    const handleSpeakerLongPress = (id: string) => {
        if (!selectedSpeakers.includes(id)) return;
        router.push({
            pathname: '/settings',
            params: { speakerIds: selectedSpeakers.join(',') },
        });
    };

    // 点击背景清除所有选中状态
    const handleBackgroundPress = () => {
        setSelectedSpeakers([]);
    };

    // "Sound Movement" 按钮，跳转到拖动界面
    const handleSoundMovement = () => {
        router.push('/drag');
    };

    // 将扬声器实际坐标转换为屏幕坐标（用于显示），Speaker组件尺寸为50×50，所以做居中调整（减25）
    const screenSpeakerPositions = speakers.map(sp => {
        const screenX = offsetX + sp.x * scale;
        const screenY = offsetY + (HALL_HEIGHT - sp.y) * scale;
        return { ...sp, screenX, screenY };
    });

    return (
        <TouchableWithoutFeedback onPress={handleBackgroundPress}>
            <View style={styles.container}>
                {/* 上半部分：音乐厅平面图 */}
                <View style={styles.floorPlanContainer}>
                    <Svg height="100%" width="100%">
                        <Rect
                            x={offsetX}
                            y={offsetY}
                            width={HALL_WIDTH * scale}
                            height={HALL_HEIGHT * scale}
                            stroke={Colors.primary}
                            strokeWidth={2}
                            fill="none"
                        />
                    </Svg>
                    {screenSpeakerPositions.map(sp => (
                        <Speaker
                            key={sp.id}
                            id={sp.id}
                            x={sp.screenX - 25}
                            y={sp.screenY - 25}
                            selected={selectedSpeakers.includes(sp.id)}
                            onPress={() => handleSpeakerPress(sp.id)}
                            onLongPress={() => handleSpeakerLongPress(sp.id)}
                        />
                    ))}
                </View>
                {/* 下半部分：控制区域 */}
                <View style={styles.controls}>
                    <TouchableOpacity onPress={handleSoundMovement} style={styles.button}>
                        <Text style={styles.buttonText}>Sound Movement</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableWithoutFeedback>
    );
};

export default FloorPlanScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: 'relative',
        backgroundColor: Colors.lightGray,
    },
    floorPlanContainer: {
        flex: 0.8,
        position: 'relative',
        // 背景区域半透明
        opacity: 0.8,
    },
    controls: {
        flex: 0.2,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.controlBackground,
    },
    button: {
        padding: 10,
        backgroundColor: Colors.primary,
        borderRadius: 5,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
    },
});
