// app/index.tsx
import React, { useState, useRef, useContext, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Dimensions,
    TouchableWithoutFeedback,
    TouchableOpacity,
    Text,
    PanResponder,
    Modal,
    ScrollView,
    Platform,
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
    // 新增：speakerType，用来控制显示图标和颜色；例如 "NEXO", "JBL", "D&B"
    speakerType?: string;
}

// 楼厅尺寸保持不变
const HALL_WIDTH = 15.1;
const HALL_HEIGHT = 19.4;

// 定义各 FloorPlan 的扬声器数据

// FloorPlan 0: NEXOs（原有数据，使用 NEXOs 的选择逻辑）
const speakers_NEXO: SpeakerData[] = [
    { id: 'nexo1', x: 1.8,  y: 19.4, speakerType: 'NEXO' },
    { id: 'nexo2', x: 13.3, y: 19.4, speakerType: 'NEXO' },
    { id: 'nexo3', x: 15.1, y: 14,   speakerType: 'NEXO' },
    { id: 'nexo4', x: 15.1, y: 5.4,  speakerType: 'NEXO' },
    { id: 'nexo5', x: 12.8, y: 0,    speakerType: 'NEXO' },
    { id: 'nexo6', x: 2.3,  y: 0,    speakerType: 'NEXO' },
    { id: 'nexo7', x: 0,    y: 5.4,  speakerType: 'NEXO' },
    { id: 'nexo8', x: 0,    y: 14,   speakerType: 'NEXO' },
];

// FloorPlan 1: D&Bs —— 扬声器类型为 "D&B"；布局可根据实际需求自行调整
const speakers_DnB: SpeakerData[] = [
    { id: 'D&B1', x: 1,   y: 19.4, speakerType: 'D&B' },
    { id: 'D&B2', x: 12,  y: 19.4, speakerType: 'D&B' },
    { id: 'D&B3', x: 15.1, y: 16,   speakerType: 'D&B' },
    { id: 'D&B4', x: 15.1, y: 8,    speakerType: 'D&B' },
    { id: 'D&B5', x: 13,  y: 0,    speakerType: 'D&B' },
    { id: 'D&B6', x: 3,   y: 0,    speakerType: 'D&B' },
    { id: 'D&B7', x: 0,   y: 7,    speakerType: 'D&B' },
    { id: 'D&B8', x: 0,   y: 15,   speakerType: 'D&B' },
];

// FloorPlan 2: JBLs —— 扬声器类型为 "JBL"，布局与 NEXOs 类似但 id 不同
const speakers_JBL: SpeakerData[] = [
    { id: 'JBL1', x: 1.8,  y: 19.4, speakerType: 'JBL' },
    { id: 'JBL2', x: 13.3, y: 19.4, speakerType: 'JBL' },
    { id: 'JBL3', x: 15.1, y: 14,   speakerType: 'JBL' },
    { id: 'JBL4', x: 15.1, y: 5.4,  speakerType: 'JBL' },
    { id: 'JBL5', x: 12.8, y: 0,    speakerType: 'JBL' },
    { id: 'JBL6', x: 2.3,  y: 0,    speakerType: 'JBL' },
    { id: 'JBL7', x: 0,    y: 5.4,  speakerType: 'JBL' },
    { id: 'JBL8', x: 0,    y: 14,   speakerType: 'JBL' },
];

// FloorPlan 3: STAGE —— 中央放置一个 JBL 扬声器
const speakers_STAGE: SpeakerData[] = [
    { id: 'JBL_STAGE', x: HALL_WIDTH / 2, y: HALL_HEIGHT / 2, speakerType: 'JBL' },
];

// 四个 FloorPlan 的配置
const floorPlans = [
    { label: 'NEXOs', speakers: speakers_NEXO },
    { label: 'D&Bs', speakers: speakers_DnB },
    { label: 'JBLs', speakers: speakers_JBL },
    { label: 'STAGE', speakers: speakers_STAGE },
];

const FloorPlanScreen: React.FC = () => {
    const router = useRouter();
    const { width, height } = Dimensions.get('window');
    const [currentFloorPlanIndex, setCurrentFloorPlanIndex] = useState(0);

    // 设置边缘留白：动态取屏幕宽度的15%
    const MARGIN_RATIO = 0.15;
    const MARGIN = width * MARGIN_RATIO;

    // 竖屏布局：上半部分（80%）显示平面图，下半部分（20%）显示控制区域
    const floorPlanHeight = height * 0.8;
    const controlsHeight = height - floorPlanHeight;

    // 可用绘制区域（扣除边缘留白）
    const availableWidth = width - 2 * MARGIN;
    const availableHeight = floorPlanHeight - 2 * MARGIN;
    const scaleX = availableWidth / HALL_WIDTH;
    const scaleY = availableHeight / HALL_HEIGHT;
    const scale = Math.min(scaleX, scaleY);
    const offsetX = MARGIN + (availableWidth - HALL_WIDTH * scale) / 2;
    const offsetY = MARGIN + (availableHeight - HALL_HEIGHT * scale) / 2;

    // 从 Context 获取选中状态
    const { selectedSpeakers, setSelectedSpeakers } = useContext(SpeakerSelectionContext);
    const [selectionRect, setSelectionRect] = useState<{
        x: number;
        y: number;
        width: number;
        height: number;
    } | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [mutedSpeakerIds, setMutedSpeakerIds] = useState<string[]>([]);

    // 弹窗状态及音量
    const [settingsModalVisible, setSettingsModalVisible] = useState(false);
    const [volume, setVolume] = useState(0.5);

    // 定义扬声器到 channel 的映射
    // 注意：如何增加新扬声器类型和设置映射：在下面对象中添加对应扬声器 id 和 channel 数字
    const speakerToFader: { [key: string]: number } = {
        nexo1: 16, nexo2: 17, nexo3: 18, nexo4: 19, nexo5: 20, nexo6: 21, nexo7: 22, nexo8: 23,
        JBL1: 24, JBL2: 25, JBL3: 26, JBL4: 27, JBL5: 28, JBL6: 29, JBL7: 30, JBL8: 31,
        "D&B1": 32, "D&B2": 33, "D&B3": 34, "D&B4": 35, "D&B5": 36, "D&B6": 37, "D&B7": 38, "D&B8": 39,
        JBL_STAGE: 40,
    };

    // 辅助函数：根据当前 FloorPlan 的扬声器数据计算屏幕坐标
    const getScreenSpeakerPositions = (speakersArray: SpeakerData[]) => {
        return speakersArray.map(sp => {
            const screenX = offsetX + sp.x * scale;
            const screenY = offsetY + (HALL_HEIGHT - sp.y) * scale;
            return { ...sp, screenX, screenY };
        });
    };

    // 当前 FloorPlan 的数据
    const currentFloorPlan = floorPlans[currentFloorPlanIndex];
    const currentScreenSpeakers = getScreenSpeakerPositions(currentFloorPlan.speakers);

    // 修改后的单击选择逻辑（所有 FloorPlan 均使用 NEXOs FloorPlan 的选择逻辑）
    const handleSpeakerPress = (id: string) => {
        setSelectedSpeakers((prev: string[]) => {
            if (prev.includes(id)) {
                return prev.length === 1 ? [] : prev.filter(s => s !== id);
            } else {
                return prev.length === 1 ? [id] : [...prev, id];
            }
        });
    };

    // 长按保持不变
    const handleSpeakerLongPress = (id: string) => {
        if (!selectedSpeakers.includes(id)) return;
        router.push({
            pathname: '/settings',
            params: { speakerIds: selectedSpeakers.join(',') },
        });
    };

    const handleBackgroundPress = () => {
        setSelectedSpeakers([]);
    };

    const handleSoundMovement = () => {
        router.push('/drag');
    };

    const handleParChange = () => {
        if (selectedSpeakers.length > 0) {
            setSettingsModalVisible(true);
        }
    };

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
                    const newSelected = currentScreenSpeakers
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

    useEffect(() => {
        console.log("Slider wrapper dimensions:", { width: 300, height: 50 });
    }, []);

    // 新增：左右箭头按钮用于切换 FloorPlan
    const handleFloorPlanLeft = () => {
        if (currentFloorPlanIndex > 0) {
            setCurrentFloorPlanIndex(currentFloorPlanIndex - 1);
        }
    };
    const handleFloorPlanRight = () => {
        if (currentFloorPlanIndex < floorPlans.length - 1) {
            setCurrentFloorPlanIndex(currentFloorPlanIndex + 1);
        }
    };

    return (
        <TouchableWithoutFeedback onPress={handleBackgroundPress}>
            <View style={styles.container}>
                {/* 固定显示当前 FloorPlan */}
                <View style={styles.floorPlanContainer} {...panResponder.panHandlers}>
                    <Text style={styles.topLabel}>{floorPlans[currentFloorPlanIndex].label}</Text>
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
                    {currentScreenSpeakers.map(sp => (
                        <Speaker
                            key={sp.id}
                            id={sp.id}
                            x={sp.screenX - 25}
                            y={sp.screenY - 25}
                            selected={selectedSpeakers.includes(sp.id)}
                            muted={mutedSpeakerIds.includes(sp.id)}
                            onPress={() => handleSpeakerPress(sp.id)}
                            onLongPress={() => handleSpeakerLongPress(sp.id)}
                            speakerType={sp.speakerType}
                        />
                    ))}
                    {/* 当设置弹窗显示时，在 FloorPlan 底部显示选中扬声器 id 的文字 */}
                    {settingsModalVisible && (
                        <View style={styles.floorPlanLabelContainer}>
                            <Text style={styles.floorPlanLabel}>{selectedSpeakers.join(', ')}</Text>
                        </View>
                    )}
                </View>
                {/* 新增：左右箭头按钮区域用于切换 FloorPlan */}
                <View style={styles.indicatorContainer}>
                    <TouchableOpacity onPress={handleFloorPlanLeft} style={styles.arrowButton}>
                        <Text style={styles.arrowText}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.pageLabel}>
                        {currentFloorPlanIndex + 1} / {floorPlans.length}
                    </Text>
                    <TouchableOpacity onPress={handleFloorPlanRight} style={styles.arrowButton}>
                        <Text style={styles.arrowText}>→</Text>
                    </TouchableOpacity>
                </View>
                {/* 控制区域 */}
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
                {/* 设置弹窗 Modal：点击 Param Change 后显示，仅包含水平滑块 */}
                <Modal
                    animationType="slide"
                    transparent
                    visible={settingsModalVisible}
                    onRequestClose={() => setSettingsModalVisible(false)}
                >
                    <TouchableWithoutFeedback onPress={() => setSettingsModalVisible(false)}>
                        <View style={styles.modalOverlay}>
                            <TouchableWithoutFeedback>
                                {/* 将弹窗放置在 FloorPlan 区域底部，滑块位于选中 id 文本标签上方 */}
                                <View style={[styles.modalContainer, { marginTop: floorPlanHeight - 80 }]}>
                                    <View style={styles.modalSliderContainer}>
                                        <Slider
                                            style={styles.slider}
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

// 辅助函数：计算当前 FloorPlan 的扬声器屏幕坐标
const getScreenSpeakerPositions = (
    speakersArray: SpeakerData[],
    offsetX: number,
    offsetY: number,
    scale: number
) => {
    return speakersArray.map(sp => ({
        ...sp,
        screenX: offsetX + sp.x * scale,
        screenY: offsetY + (HALL_HEIGHT - sp.y) * scale,
    }));
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.lightGray,
    },
    scrollContainer: {
        flex: 0.8,
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
    indicatorContainer: {
        // 新增：左右箭头按钮区域，用于切换 FloorPlan
        height: 30,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    arrowButton: {
        paddingHorizontal: 15,
        paddingVertical: 5,
    },
    arrowText: {
        fontSize: 20,
        color: Colors.primary,
    },
    pageLabel: {
        fontSize: 16,
        marginHorizontal: 10,
        color: Colors.primary,
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
        paddingVertical: 10,
        width: 270,
        alignItems: 'center',
    },
    modalSliderContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    slider: {
        width: 300,
        height: 50,
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
        textAlign: 'center',
        backgroundColor: 'transparent',
    },
});
