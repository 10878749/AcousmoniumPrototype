// app/index.tsx
import React, { useState, useRef, useContext } from 'react';
import {
    StyleSheet,
    View,
    Dimensions,
    TouchableWithoutFeedback,
    TouchableOpacity,
    Text,
    PanResponder,
    Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Rect } from 'react-native-svg';
import Slider from "@react-native-community/slider";
import Speaker from './components/Speaker';
import Colors from './constants/Colors';
import { updateFader, updateSourceCoord, updateMute } from './utils/Control';
import { SpeakerSelectionContext } from './context/SpeakerSelectionContext';

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

    // 分为上半部分（80%）显示平面图，下半部分（20%）为控制区域
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
    // 使用 Context 保留选中状态，确保从其他界面返回时选中信息不丢失
    const { selectedSpeakers, setSelectedSpeakers } = useContext(SpeakerSelectionContext);
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

    // 设置弹窗状态以及音量值(0..1)
    const [settingsModalVisible, setSettingsModalVisible] = useState(false);
    const [volume, setVolume] = useState(0.5);

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

    // 将扬声器实际坐标转换为屏幕坐标（用于显示），Speaker 组件尺寸为50×50，所以居中需要减25
    const screenSpeakerPositions = speakers.map(sp => {
        const screenX = offsetX + sp.x * scale;
        const screenY = offsetY + (HALL_HEIGHT - sp.y) * scale;
        return { ...sp, screenX, screenY };
    });

    // 修改后的单击选择逻辑：
    // 如果当前选中列表仅有一个（单击选中状态），则覆盖选择；
    // 如果当前已存在多个选中（来自拖动多选），则添加/移除该项。
    const handleSpeakerPress = (id: string) => {
        setSelectedSpeakers((prev: string[]) => {
            if (prev.includes(id)) {
                // 如果已经存在，若为单个则清空，否则移除该项
                return prev.length === 1 ? [] : prev.filter(s => s !== id);
            } else {
                // 如果不包含，判断当前是否为单击模式（只有一项）
                if (prev.length === 1) {
                    // 单击模式：覆盖之前的选中
                    return [id];
                } else {
                    // 如果为拖动多选则追加
                    return [...prev, id];
                }
            }
        });
    };

    // 长按：如果扬声器已选中，则跳转到设置页面（逻辑保持不变）
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

    // 点击 Param Change 按钮后显示设置弹窗
    const handleParChange = () => {
        if (selectedSpeakers.length > 0) {
            setSettingsModalVisible(true);
        }
    };

    // Mute 按钮：发送 mute/unmute 命令，并更新状态
    const handleMute = () => {
        if (selectedSpeakers.length === 0) {
            console.log("No speakers selected.");
            return;
        }
        if (!isMuted) {
            selectedSpeakers.forEach(id => {
                const fader = speakerToFader[id];
                if (fader !== undefined) {
                    updateMute(fader, true);
                }
            });
            setMutedSpeakerIds(prev => [...prev, ...selectedSpeakers]);
            setIsMuted(true);
        } else {
            selectedSpeakers.forEach(id => {
                const fader = speakerToFader[id];
                if (fader !== undefined) {
                    updateMute(fader, false);
                }
            });
            setMutedSpeakerIds(prev => prev.filter(id => !selectedSpeakers.includes(id)));
            setIsMuted(false);
        }
    };

    // 处理设置弹窗中音量变化
    const handleVolumeChange = (sliderValue: number) => {
        setVolume(sliderValue);
        const mappedValue = Math.round(sliderValue * 1023);
        selectedSpeakers.forEach((id) => {
            const itemFader = speakerToFader[id];
            if (!itemFader) {
                console.warn(`No mapping found for speakerId: ${id}`);
                return;
            }
            updateFader(itemFader, mappedValue);
        });
    };

    // ---- 拖动选择逻辑 ----
    const selectionStartRef = useRef<{ x: number, y: number } | null>(null);
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                const { locationX, locationY } = evt.nativeEvent;
                selectionStartRef.current = { x: locationX, y: locationY };
                setSelectionRect({ x: locationX, y: locationY, width: 0, height: 0 });
                setSelectedSpeakers([]);  // 清空当前选中状态，根据拖动重新计算
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
                    {/* 当设置弹窗显示时，在上半部分底部显示选中id的文字，不遮挡弹窗 */}
                    {settingsModalVisible && (
                        <View style={styles.floorPlanLabelContainer}>
                            <Text style={styles.floorPlanLabel}>{selectedSpeakers.join(', ')}</Text>
                        </View>
                    )}
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

                {/* 设置弹窗 Modal：点击 Param Change 时显示，仅包含竖直滑块 */}
                <Modal
                    animationType="slide"
                    transparent
                    visible={settingsModalVisible}
                    onRequestClose={() => setSettingsModalVisible(false)}
                >
                    <TouchableWithoutFeedback onPress={() => setSettingsModalVisible(false)}>
                        <View style={styles.modalOverlay}>
                            <TouchableWithoutFeedback>
                                {/* 将弹窗放置在上半部分中间 */}
                                <View style={[styles.modalContainer, { marginTop: floorPlanHeight / 2 - 30 }]}>
                                    <View style={styles.modalSliderContainer}>
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
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>
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
        width: 120,
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-start',
        alignItems: 'center',
    },
    modalContainer: {
        // 弹窗不使用背景包裹，仅包裹滑块
        paddingVertical: 10,
        width: 270,
        alignItems: 'center',
    },
    modalSliderContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    verticalSlider: {
        width: 300,
        height: 50,
        transform: [{ rotate: '-90deg' }],
        backgroundColor: Colors.controlBackground,
        borderRadius: 5,
    },
    floorPlanLabelContainer: {
        position: 'absolute',
        bottom: 5,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    floorPlanLabel: {
        fontSize: 16,
        color: Colors.primary,
        textAlign: 'center', // 确保文字居中
        backgroundColor: 'transparent',
    },
});
