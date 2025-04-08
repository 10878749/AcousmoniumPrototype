import React, { useState, useRef } from 'react';
import {
    StyleSheet,
    View,
    Dimensions,
    PanResponder,
    PanResponderGestureState,
    GestureResponderEvent,
    TouchableOpacity,
    Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Rect, Circle } from 'react-native-svg';
import Speaker from './components/Speaker';
import Colors from './constants/Colors';
import { updateSourceCoord } from './utils/Control';

// 定义音乐厅实际尺寸（单位：米）
const HALL_WIDTH = 15.1;
const HALL_HEIGHT = 19.4;

// 扬声器在音乐厅内的实际坐标（单位：米），以左下角为原点
interface SpeakerData {
    id: string;
    x: number;
    y: number;
}
const initialSpeakers: SpeakerData[] = [
    { id: 'nexo1', x: 1.8,  y: 19.4 },
    { id: 'nexo2', x: 13.3, y: 19.4 },
    { id: 'nexo3', x: 15.1, y: 14 },
    { id: 'nexo4', x: 15.1, y: 5.4 },
    { id: 'nexo5', x: 12.8, y: 0 },
    { id: 'nexo6', x: 2.3,  y: 0 },
    { id: 'nexo7', x: 0,    y: 5.4 },
    { id: 'nexo8', x: 0,    y: 14 },
];

const DragScreen: React.FC = () => {
    const router = useRouter();
    const { width, height } = Dimensions.get('window');

    // 动态边缘留白，留出屏幕宽度的 5%
    const MARGIN_RATIO = 0.05;
    const MARGIN = width * MARGIN_RATIO;

    // 我们把屏幕分为两部分：上半部分（80%）用于显示平面图，下半部分（20%）用于控制
    const floorPlanHeight = height * 0.8;
    const controlsHeight = height - floorPlanHeight;

    // 可用绘制区域：上半部分扣除边缘留白
    const availableWidth = width - 2 * MARGIN;
    const availableHeight = floorPlanHeight - 2 * MARGIN;
    // 根据可用区域与音乐厅实际尺寸计算缩放比例
    const scaleX = availableWidth / HALL_WIDTH;
    const scaleY = availableHeight / HALL_HEIGHT;
    const scale = Math.min(scaleX, scaleY);
    // 计算偏移量，使音乐厅区域在可用区域内居中后，再加上边缘留白
    const offsetX = MARGIN + (availableWidth - HALL_WIDTH * scale) / 2;
    const offsetY = MARGIN + (availableHeight - HALL_HEIGHT * scale) / 2;

    // 保存扬声器数据（用于显示）
    const [speakers] = useState<SpeakerData[]>(initialSpeakers);
    // 当前触控位置（屏幕坐标），用于显示虚拟声源
    const [currentPosition, setCurrentPosition] = useState<{ x: number; y: number } | null>(null);

    // 将屏幕坐标转换为音乐厅实际坐标（单位：米）
    // 注意：屏幕原点在左上角，而音乐厅坐标原点在左下角，所以 y 坐标需要反转
    const convertScreenToHall = (screenX: number, screenY: number) => {
        const hallX = (screenX - offsetX) / scale;
        const hallY = HALL_HEIGHT - ((screenY - offsetY) / scale);
        return { hallX, hallY };
    };

    // 拖动时将触控坐标转换为音乐厅坐标，并发送给服务器
    const updateAllFaders = (touchX: number, touchY: number) => {
        const { hallX, hallY } = convertScreenToHall(touchX, touchY);
        console.log(
            `Converted screen coords (${touchX.toFixed(2)}, ${touchY.toFixed(2)}) -> hall coords (${hallX.toFixed(2)}, ${hallY.toFixed(2)})`
        );
        updateSourceCoord(hallX, hallY);
    };

    // 创建 PanResponder 捕捉拖动事件，只作用于上半部分平面图区域
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
                const { locationX, locationY } = evt.nativeEvent;
                setCurrentPosition({ x: locationX, y: locationY });
                updateAllFaders(locationX, locationY);
            },
            onPanResponderMove: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
                const { locationX, locationY } = evt.nativeEvent;
                setCurrentPosition({ x: locationX, y: locationY });
                updateAllFaders(locationX, locationY);
            },
            onPanResponderRelease: () => {
                // 根据需要在触控结束时处理逻辑
            },
        })
    ).current;

    // 将扬声器的音乐厅坐标转换为屏幕坐标（用于显示），Speaker 组件尺寸为 50×50
    const screenSpeakerPositions = speakers.map(sp => {
        const screenX = offsetX + sp.x * scale;
        const screenY = offsetY + (HALL_HEIGHT - sp.y) * scale;
        return { ...sp, screenX, screenY };
    });

    return (
        <View style={styles.container}>
            {/* 上半部分：音乐厅平面图区域 */}
            <View style={styles.floorPlanContainer} {...panResponder.panHandlers}>
                <Svg height="100%" width="100%">
                    {/* 绘制音乐厅观众席边框 */}
                    <Rect
                        x={offsetX}
                        y={offsetY}
                        width={HALL_WIDTH * scale}
                        height={HALL_HEIGHT * scale}
                        stroke={Colors.primary}
                        strokeWidth={2}
                        fill="none"
                    />
                    {/* 绘制当前虚拟声源位置 */}
                    {currentPosition && (
                        <Circle
                            cx={currentPosition.x}
                            cy={currentPosition.y}
                            r="10"
                            fill={Colors.selectedSpeaker}
                        />
                    )}
                </Svg>
                {/* 绘制扬声器图标（Speaker 组件） */}
                {screenSpeakerPositions.map(sp => (
                    <Speaker
                        key={sp.id}
                        id={sp.id}
                        x={sp.screenX - 25}
                        y={sp.screenY - 25}
                        selected={false}
                        onPress={() => {}}
                        onLongPress={() => {}}
                    />
                ))}
            </View>
            {/* 下半部分：控制区域 */}
            <View style={styles.controls}>
                <TouchableOpacity style={styles.button} onPress={() => router.back()}>
                    <Text style={styles.buttonText}>Close</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default DragScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.lightGray,
    },
    floorPlanContainer: {
        flex: 0.8,
        position: 'relative',
        // 此区域采用半透明背景（不遮挡图形内容）
        opacity: 0.8,
    },
    controls: {
        flex: 0.2,
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
