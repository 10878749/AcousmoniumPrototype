// app/index.tsx
import React, { useState, useRef } from 'react';
import {
    StyleSheet,
    View,
    Dimensions,
    TouchableWithoutFeedback,
    TouchableOpacity,
    Text,
    PanResponder,
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Rect } from 'react-native-svg';
import Speaker from './components/Speaker';
import Colors from './constants/Colors';
import { updateFader, updateSourceCoord, updateMute } from './utils/Control';

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
    { id: 'nexo8', x: 0,    y: 14 },
];

const FloorPlanScreen: React.FC = () => {
    const router = useRouter();
    const { width, height } = Dimensions.get('window');

    // 设置边缘留白：动态取屏幕宽度的15%
    const MARGIN_RATIO = 0.15;
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
    // 计算偏移量：使音乐厅区域在可用区域内居中
    const offsetX = MARGIN + (availableWidth - HALL_WIDTH * scale) / 2;
    const offsetY = MARGIN + (availableHeight - HALL_HEIGHT * scale) / 2;

    // 保存扬声器数据（用于显示）
    const [speakers] = useState<SpeakerData[]>(initialSpeakers);
    // 选中扬声器ID数组
    const [selectedSpeakers, setSelectedSpeakers] = useState<string[]>([]);
    // 保存拖动选择矩形的位置与尺寸
    const [selectionRect, setSelectionRect] = useState<{
        x: number;
        y: number;
        width: number;
        height: number;
    } | null>(null);
    // Mute 状态：控制当前选中的扬声器是否处于静音状态
    const [isMuted, setIsMuted] = useState(false);
    // 存储已静音的扬声器ID
    const [mutedSpeakerIds, setMutedSpeakerIds] = useState<string[]>([]);

    // 定义扬声器到 fader 的映射，与服务器端保持一致
    const speakerToFader: { [key: string]: number } = {
        nexo1: 16,
        nexo2: 17,
        nexo3: 18,
        nexo4: 19,
        nexo5: 20,
        nexo6: 21,
        nexo7: 22,
        nexo8: 23,
    };

    // 将扬声器实际坐标转换为屏幕坐标（用于显示），Speaker 组件尺寸为 50×50，所以做居中调整（减25）
    const screenSpeakerPositions = speakers.map(sp => {
        const screenX = offsetX + sp.x * scale;
        const screenY = offsetY + (HALL_HEIGHT - sp.y) * scale;
        return { ...sp, screenX, screenY };
    });

    // 修改后的单击选择逻辑：如果点击已选中的扬声器，则清空选中；否则仅选中当前扬声器
    const handleSpeakerPress = (id: string) => {
        setSelectedSpeakers((prev: string[]) => {
            if (prev.includes(id)) {
                return [];
            } else {
                return [id];
            }
        });
    };

    // 长按：如果扬声器已选中，则跳转到设置页面，并传递所有选中的ID
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

    // ParChange 按钮点击，逻辑同长按选中的扬声器
    const handleParChange = () => {
        if (selectedSpeakers.length > 0) {
            router.push({
                pathname: '/settings',
                params: { speakerIds: selectedSpeakers.join(',') },
            });
        }
    };

    // Mute 按钮点击，发送 mute/unmute 操作给服务器，对选中扬声器进行操作
    const handleMute = () => {
        if (selectedSpeakers.length === 0) {
            console.log("No speakers selected.");
            return;
        }
        if (!isMuted) {
            // 静音操作：对选中扬声器逐个发送 mute 命令
            selectedSpeakers.forEach(id => {
                const fader = speakerToFader[id];
                if (fader !== undefined) {
                    updateMute(fader, true);
                }
            });
            // 将这些扬声器标记为静音
            setMutedSpeakerIds(prev => [...prev, ...selectedSpeakers]);
            setIsMuted(true);
        } else {
            // 取消静音操作
            selectedSpeakers.forEach(id => {
                const fader = speakerToFader[id];
                if (fader !== undefined) {
                    updateMute(fader, false);
                }
            });
            // 从静音状态中移除这些扬声器
            setMutedSpeakerIds(prev => prev.filter(id => !selectedSpeakers.includes(id)));
            setIsMuted(false);
        }
    };

    // ---- 添加滑动选择逻辑 ----
    const selectionStartRef = useRef<{ x: number, y: number } | null>(null);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                const { locationX, locationY } = evt.nativeEvent;
                selectionStartRef.current = { x: locationX, y: locationY };
                setSelectionRect({ x: locationX, y: locationY, width: 0, height: 0 });
                setSelectedSpeakers([]);  // 清空当前选中状态，后续根据矩形区域重新计算
            },
            onPanResponderMove: (evt) => {
                const { locationX, locationY } = evt.nativeEvent;
                if (selectionStartRef.current) {
                    const start = selectionStartRef.current;
                    const rectLeft = Math.min(start.x, locationX);
                    const rectRight = Math.max(start.x, locationX);
                    const rectTop = Math.min(start.y, locationY);
                    const rectBottom = Math.max(start.y, locationY);
                    setSelectionRect({
                        x: rectLeft,
                        y: rectTop,
                        width: rectRight - rectLeft,
                        height: rectBottom - rectTop,
                    });
                    const newSelected = screenSpeakerPositions
                        .filter(sp =>
                            sp.screenX >= rectLeft &&
                            sp.screenX <= rectRight &&
                            sp.screenY >= rectTop &&
                            sp.screenY <= rectBottom
                        )
                        .map(sp => sp.id);
                    setSelectedSpeakers(newSelected);
                }
            },
            onPanResponderRelease: () => {
                selectionStartRef.current = null;
                setSelectionRect(null);
            },
            onPanResponderTerminate: () => {
                selectionStartRef.current = null;
                setSelectionRect(null);
            },
        })
    ).current;
    // ------------------------------

    return (
        <TouchableWithoutFeedback onPress={handleBackgroundPress}>
            <View style={styles.container}>
                {/* 上半部分：音乐厅平面图 */}
                <View style={styles.floorPlanContainer} {...panResponder.panHandlers}>
                    {/* 顶部显示 “NEXOs” 标签 */}
                    <Text style={styles.topLabel}>NEXOs</Text>
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
                    {/* 绘制可见的拖动选择矩形 */}
                    {selectionRect && (
                        <View
                            style={[
                                styles.selectionRect,
                                {
                                    left: selectionRect.x,
                                    top: selectionRect.y,
                                    width: selectionRect.width,
                                    height: selectionRect.height,
                                },
                            ]}
                        />
                    )}
                    {screenSpeakerPositions.map(sp => (
                        <Speaker
                            key={sp.id}
                            id={sp.id}
                            x={sp.screenX - 25}
                            y={sp.screenY - 25}
                            selected={selectedSpeakers.includes(sp.id)}
                            muted={mutedSpeakerIds.includes(sp.id)}
                            onPress={() => handleSpeakerPress(sp.id)}
                            onLongPress={() => handleSpeakerLongPress(sp.id)}
                        />
                    ))}
                </View>
                {/* 下半部分：控制区域 */}
                <View style={styles.controls}>
                    <TouchableOpacity onPress={handleSoundMovement} style={styles.button}>
                        <Text style={styles.buttonText}>Sound Move</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleParChange} style={styles.button}>
                        <Text style={styles.buttonText}>Param Change</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleMute} style={styles.button}>
                        <Text style={styles.buttonText}>{isMuted ? 'UnMute' : 'Mute'}</Text>
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
        opacity: 0.8,
    },
    topLabel: {
        position: 'absolute',
        top: 5,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontSize: 20,
        color: Colors.primary,
        zIndex: 1,
    },
    controls: {
        flex: 0.2,
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'center',
        backgroundColor: Colors.controlBackground,
    },
    button: {
        padding: 10,
        backgroundColor: Colors.primary,
        borderRadius: 5,
        width: 120,        // 固定按钮宽度
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
    },
    selectionRect: {
        position: 'absolute',
        borderWidth: 1,
        borderColor: Colors.primary,
        backgroundColor: 'rgba(0,0,255,0.2)',
    },
});
