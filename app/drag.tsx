// app/drag/tsx
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
import Svg, { Rect, Circle } from 'react-native-svg';
import Colors from './constants/Colors';
import { updateSourceCoord } from './utils/Control';
import throttle from 'lodash/throttle';


interface DragScreenProps {
    onClose?: () => void;
}

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

const DragScreen: React.FC<DragScreenProps> = ({ onClose }) => {
    const { width, height } = Dimensions.get('window');

    // 动态边缘留白，留出屏幕宽度的 5%
    const MARGIN_RATIO = 0.05;
    const MARGIN = width * MARGIN_RATIO;

    // 将屏幕分为两部分：上半部分（80%）显示平面图，下半部分（20%）用于控制
    const floorPlanHeight = height * 0.8;
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

    // 将屏幕坐标转换为音乐厅实际坐标（单位：米），注意 y 坐标需要反转
    const convertScreenToHall = (screenX: number, screenY: number) => {
        const hallX = (screenX - offsetX) / scale;
        const hallY = HALL_HEIGHT - ((screenY - offsetY) / scale);
        return { hallX, hallY };
    };

    // 节流与阈值判断部分：
    // 设定坐标变化的最小阈值（单位：米），只有超过该阈值才发送更新
    const THRESHOLD = 0.1;
    // 使用 useRef 保存上一次发送的坐标，避免在组件重绘时丢失
    const lastCoordsRef = useRef<{ hallX: number; hallY: number } | null>(null);

    // 定义用于检查阈值和发送消息的函数
    const maybeSendUpdate = (touchX: number, touchY: number) => {
        const { hallX, hallY } = convertScreenToHall(touchX, touchY);
        if (lastCoordsRef.current) {
            const dx = Math.abs(hallX - lastCoordsRef.current.hallX);
            const dy = Math.abs(hallY - lastCoordsRef.current.hallY);
            if (dx < THRESHOLD && dy < THRESHOLD) {
                // 如果坐标变化不足阈值，不发送更新
                return;
            }
        }
        lastCoordsRef.current = { hallX, hallY };
        console.log(
            `Converted screen coords (${touchX.toFixed(2)}, ${touchY.toFixed(2)}) -> hall coords (${hallX.toFixed(2)}, ${hallY.toFixed(2)})`
        );
        updateSourceCoord(hallX, hallY);
    };

    // 利用 throttle 限制发送消息的频率（50 毫秒一次）
    const throttledUpdate = useRef(throttle((touchX: number, touchY: number) => {
        maybeSendUpdate(touchX, touchY);
    }, 50)).current;

    // 创建 PanResponder 捕捉拖动事件（只作用于上半部分平面图区域）
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
                const { locationX, locationY } = evt.nativeEvent;
                setCurrentPosition({ x: locationX, y: locationY });
                throttledUpdate(locationX, locationY);
            },
            onPanResponderMove: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
                const { locationX, locationY } = evt.nativeEvent;
                setCurrentPosition({ x: locationX, y: locationY });
                throttledUpdate(locationX, locationY);
            },
            onPanResponderRelease: () => {
                // 可根据需要添加触控结束逻辑
            },
        })
    ).current;

    // 将扬声器的音乐厅坐标转换为屏幕坐标（用于显示），假设扬声器显示尺寸为 50×50
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
                    {/* 绘制音乐厅边框 */}
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
                {/* 绘制扬声器图标（这里只做简单展示） */}
                {screenSpeakerPositions.map(sp => (
                    <View
                        key={sp.id}
                        style={{
                            position: 'absolute',
                            left: sp.screenX - 25,
                            top: sp.screenY - 25,
                            width: 50,
                            height: 50,
                            backgroundColor: Colors.primary,
                            borderRadius: 25,
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                    >
                        <Text style={{ color: '#fff' }}>{sp.id}</Text>
                    </View>
                ))}
            </View>
            {/* 下半部分：控制区域 */}
            <View style={styles.controls}>
                <TouchableOpacity style={styles.button} onPress={onClose ? onClose : () => {}}>
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
        flex: 0.9,
        position: 'relative',
        opacity: 0.8,
    },
    controls: {
        flex: 0.1,
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
