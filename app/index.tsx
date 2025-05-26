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
} from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import Slider from "@react-native-community/slider";
import Speaker from './components/Speaker';
import Colors from './constants/Colors';
import { updateFader, updateSourceCoord, updateMute } from './utils/Control';
import { SpeakerSelectionContext } from './context/SpeakerSelectionContext';
import DragScreen from './drag';
import throttle from 'lodash/throttle';

interface SpeakerData {
    id: string;
    x: number;
    y: number;
    speakerType?: string;
}

const HALL_WIDTH = 15.1;
const HALL_HEIGHT = 19.4;

// FloorPlan 0: NEXOs
const speakers_NEXO: SpeakerData[] = [
    { id: 'nexo1', x: 1.8,  y: 19.4, speakerType: 'NEXO' },
    { id: 'nexo2', x: 13.3, y: 19.4, speakerType: 'NEXO' },
    { id: 'nexo3', x: 15.1, y: 14,   speakerType: 'NEXO' },
    { id: 'nexo4', x: 15.1, y: 5.4,  speakerType: 'NEXO' },
    { id: 'nexo5', x: 12.8, y: 0,    speakerType: 'NEXO' },
    { id: 'nexo6', x: 2.3,  y: 0,    speakerType: 'NEXO' },
    { id: 'nexo7', x: 0,    y: 5.4,  speakerType: 'NEXO' },
    { id: 'nexo8', x: 0,    y: 14,   speakerType: 'NEXO' },
    { id: 'nexo9', x: 7.55, y: 19.4, speakerType: 'NEXO' }
];

// FloorPlan 1: D&Bs
const speakers_DnB: SpeakerData[] = [
    { id: 'D&B3', x: 16.6, y: 15.4,   speakerType: 'D&B' },
    { id: 'D&B4', x: 16.6, y: 8.4,    speakerType: 'D&B' },
    { id: 'D&B5', x: 16.6, y: 1.4,    speakerType: 'D&B' },
    { id: 'D&B6', x: -1.5, y: 1.4,    speakerType: 'D&B' },
    { id: 'D&B7', x: -1.5, y: 8.4,    speakerType: 'D&B' },
    { id: 'D&B8', x: -1.5, y: 15.4,   speakerType: 'D&B' },
];

// FloorPlan 2: JBLs
const speakers_JBL: SpeakerData[] = [
    { id: 'JBL1', x: 0,   y: 14, speakerType: 'JBL' },
    { id: 'JBL2', x: 15.1, y: 14, speakerType: 'JBL' },
    { id: 'JBL3', x: 15.1, y: 5.4, speakerType: 'JBL' },
    { id: 'JBL4', x: 15.1, y: 0,   speakerType: 'JBL' },
    { id: 'JBL5', x: 12.6, y: -2,  speakerType: 'JBL' },
    { id: 'JBL6', x: 2.5,  y: -2,  speakerType: 'JBL' },
    { id: 'JBL7', x: 0,    y: 0,   speakerType: 'JBL' },
    { id: 'JBL8', x: 0,    y: 5.4, speakerType: 'JBL' },
];

// FloorPlan 3: STAGE
const speakers_STAGE: SpeakerData[] = [
    { id: 'D&B1', x: 4,   y: 13.4, speakerType: 'D&B' },
    { id: 'D&B2', x: 11.1, y: 13.4, speakerType: 'D&B' },
    { id: 'JBL_STAGE', x: HALL_WIDTH / 2, y: HALL_HEIGHT / 2, speakerType: 'JBL' },
];

const floorPlans = [
    { label: 'NEXOs', speakers: speakers_NEXO },
    { label: 'D&Bs', speakers: speakers_DnB },
    { label: 'JBLs', speakers: speakers_JBL },
    { label: 'STAGE', speakers: speakers_STAGE },
];

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

const FloorPlanScreen: React.FC = () => {
    const { width, height } = Dimensions.get('window');
    const [currentFloorPlanIndex, setCurrentFloorPlanIndex] = useState(0);
    const [planSelections, setPlanSelections] = useState<{ [index: number]: string[] }>({});
    const MARGIN_RATIO = 0.15;
    const MARGIN = width * MARGIN_RATIO;
    const floorPlanHeight = height * 0.8;
    const availableWidth = width - 2 * MARGIN;
    const availableHeight = floorPlanHeight - 2 * MARGIN;
    const scaleX = availableWidth / HALL_WIDTH;
    const scaleY = availableHeight / HALL_HEIGHT;
    const scale = Math.min(scaleX, scaleY);
    const offsetX = MARGIN + (availableWidth - HALL_WIDTH * scale) / 2;
    const offsetY = MARGIN + (availableHeight - HALL_HEIGHT * scale) / 2;

    const { selectedSpeakers, setSelectedSpeakers } = useContext(SpeakerSelectionContext);
    const updateCurrentSelection = (newSelected: string[]) => {
        setPlanSelections(prev => ({ ...prev, [currentFloorPlanIndex]: newSelected }));
        setSelectedSpeakers(newSelected);
    };

    const [selectionRect, setSelectionRect] = useState<{
        x: number;
        y: number;
        width: number;
        height: number;
    } | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [mutedSpeakerIds, setMutedSpeakerIds] = useState<string[]>([]);
    const [settingsModalVisible, setSettingsModalVisible] = useState(false);
    const [volume, setVolume] = useState(0.5);
    const [containerHeight, setContainerHeight] = useState(0);
    const isPageSwipeRef = useRef(false);

    const speakerToFader: { [key: string]: number } = {
        nexo1: 16, nexo2: 17, nexo3: 18, nexo4: 19, nexo5: 20, nexo6: 21, nexo7: 22, nexo8: 23,
        JBL1: 24, JBL2: 25, JBL3: 26, JBL4: 27, JBL5: 28, JBL6: 29, JBL7: 30, JBL8: 31,
        "D&B1": 32, "D&B2": 33, "D&B3": 34, "D&B4": 35, "D&B5": 36, "D&B6": 37, "D&B7": 38, "D&B8": 39,
        JBL_STAGE: 40, nexo9: 41
    };

    const currentFloorPlan = floorPlans[currentFloorPlanIndex];

    const borderElement =
        currentFloorPlan.label === "STAGE" ? (() => {
            const stageRectWidth = HALL_WIDTH * scale;
            const stageRectHeight = stageRectWidth * 0.5;
            const stageRectY = offsetY + ((HALL_HEIGHT * scale) - stageRectHeight) / 2;
            return (
                <Rect
                    x={offsetX}
                    y={stageRectY}
                    width={stageRectWidth}
                    height={stageRectHeight}
                    stroke={Colors.primary}
                    strokeWidth={2}
                    fill="none"
                />
            );
        })() : (
            <Rect
                x={offsetX}
                y={offsetY}
                width={HALL_WIDTH * scale}
                height={HALL_HEIGHT * scale}
                stroke={Colors.primary}
                strokeWidth={2}
                fill="none"
            />
        );

    const selectionStartRef = useRef<{ x: number; y: number } | null>(null);

    const [panResponder, setPanResponder] = useState(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                const { locationX, locationY } = evt.nativeEvent;
                if (locationY >= containerHeight * 0.9) {
                    isPageSwipeRef.current = true;
                    selectionStartRef.current = { x: locationX, y: locationY };
                } else {
                    isPageSwipeRef.current = false;
                    selectionStartRef.current = { x: locationX, y: locationY };
                    setSelectionRect({ x: locationX, y: locationY, width: 0, height: 0 });
                    updateCurrentSelection([]);
                }
            },
            onPanResponderMove: (evt) => {
                const { locationX, locationY } = evt.nativeEvent;
                if (!isPageSwipeRef.current && selectionStartRef.current) {
                    const start = selectionStartRef.current;
                    const rectLeft = Math.min(start.x, locationX);
                    const rectRight = Math.max(start.x, locationX);
                    const rectTop = Math.min(start.y, locationY);
                    const rectBottom = Math.max(start.y, locationY);
                    const newRect = {
                        x: rectLeft,
                        y: rectTop,
                        width: rectRight - rectLeft,
                        height: rectBottom - rectTop,
                    };
                    setSelectionRect(newRect);
                    const freshScreenSpeakers = getScreenSpeakerPositions(
                        currentFloorPlan.speakers,
                        offsetX,
                        offsetY,
                        scale
                    );
                    const newSelected = freshScreenSpeakers
                        .filter(sp =>
                            sp.screenX >= rectLeft &&
                            sp.screenX <= rectRight &&
                            sp.screenY >= rectTop &&
                            sp.screenY <= rectBottom
                        )
                        .map(sp => sp.id);
                    updateCurrentSelection(newSelected);
                }
            },
            onPanResponderRelease: (evt) => {
                if (isPageSwipeRef.current && selectionStartRef.current) {
                    const { locationX } = evt.nativeEvent;
                    const deltaX = locationX - selectionStartRef.current.x;
                    const threshold = 50;
                    if (deltaX > threshold) {
                        handleFloorPlanLeft();
                    } else if (deltaX < -threshold) {
                        handleFloorPlanRight();
                    }
                }
                selectionStartRef.current = null;
                setSelectionRect(null);
                isPageSwipeRef.current = false;
            },
            onPanResponderTerminate: () => {
                selectionStartRef.current = null;
                setSelectionRect(null);
                isPageSwipeRef.current = false;
            },
        })
    );

    useEffect(() => {
        setPanResponder(
            PanResponder.create({
                onStartShouldSetPanResponder: () => true,
                onPanResponderGrant: (evt) => {
                    const { locationX, locationY } = evt.nativeEvent;
                    if (locationY >= containerHeight * 0.9) {
                        isPageSwipeRef.current = true;
                        selectionStartRef.current = { x: locationX, y: locationY };
                    } else {
                        isPageSwipeRef.current = false;
                        selectionStartRef.current = { x: locationX, y: locationY };
                        setSelectionRect({ x: locationX, y: locationY, width: 0, height: 0 });
                        updateCurrentSelection([]);
                    }
                },
                onPanResponderMove: (evt) => {
                    const { locationX, locationY } = evt.nativeEvent;
                    if (!isPageSwipeRef.current && selectionStartRef.current) {
                        const start = selectionStartRef.current;
                        const rectLeft = Math.min(start.x, locationX);
                        const rectRight = Math.max(start.x, locationX);
                        const rectTop = Math.min(start.y, locationY);
                        const rectBottom = Math.max(start.y, locationY);
                        const newRect = {
                            x: rectLeft,
                            y: rectTop,
                            width: rectRight - rectLeft,
                            height: rectBottom - rectTop,
                        };
                        setSelectionRect(newRect);
                        const freshScreenSpeakers = getScreenSpeakerPositions(
                            currentFloorPlan.speakers,
                            offsetX,
                            offsetY,
                            scale
                        );
                        const newSelected = freshScreenSpeakers
                            .filter(sp =>
                                sp.screenX >= rectLeft &&
                                sp.screenX <= rectRight &&
                                sp.screenY >= rectTop &&
                                sp.screenY <= rectBottom
                            )
                            .map(sp => sp.id);
                        updateCurrentSelection(newSelected);
                    }
                },
                onPanResponderRelease: (evt) => {
                    if (isPageSwipeRef.current && selectionStartRef.current) {
                        const { locationX } = evt.nativeEvent;
                        const deltaX = locationX - selectionStartRef.current.x;
                        const threshold = 50;
                        if (deltaX > threshold) {
                            handleFloorPlanLeft();
                        } else if (deltaX < -threshold) {
                            handleFloorPlanRight();
                        }
                    }
                    selectionStartRef.current = null;
                    setSelectionRect(null);
                    isPageSwipeRef.current = false;
                },
                onPanResponderTerminate: () => {
                    selectionStartRef.current = null;
                    setSelectionRect(null);
                    isPageSwipeRef.current = false;
                },
            })
        );
    }, [currentFloorPlan, offsetX, offsetY, scale, containerHeight]);

    const handleFloorPlanLeft = () => {
        if (currentFloorPlanIndex > 0) {
            const newIndex = currentFloorPlanIndex - 1;
            setCurrentFloorPlanIndex(newIndex);
            setSelectedSpeakers(planSelections[newIndex] || []);
        }
    };
    const handleFloorPlanRight = () => {
        if (currentFloorPlanIndex < floorPlans.length - 1) {
            const newIndex = currentFloorPlanIndex + 1;
            setCurrentFloorPlanIndex(newIndex);
            setSelectedSpeakers(planSelections[newIndex] || []);
        }
    };

    const handleSpeakerPress = (id: string) => {
        setSelectedSpeakers((prev: string[]) => {
            let newSelected: string[];
            if (prev.includes(id)) {
                newSelected = prev.length === 1 ? [] : prev.filter(s => s !== id);
            } else {
                newSelected = prev.length === 1 ? [id] : [...prev, id];
            }
            updateCurrentSelection(newSelected);
            return newSelected;
        });
    };

    const handleSpeakerLongPress = (id: string) => {
        if (!selectedSpeakers.includes(id)) return;
        // Handle long press logic here (e.g., open settings)
    };

    const handleBackgroundPress = () => {
        updateCurrentSelection([]);
    };

    // Use Modal to show DragScreen when "Sound Move" button is pressed
    const [isDragModalVisible, setIsDragModalVisible] = useState(false);
    const handleSoundMovement = () => {
        setIsDragModalVisible(true);
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
        const mutedCount = selectedSpeakers.filter(id => mutedSpeakerIds.includes(id)).length;
        const currentlyMuted = mutedCount > selectedSpeakers.length / 2;

        if (currentlyMuted) {
            selectedSpeakers.forEach(id => {
                const fader = speakerToFader[id];
                if (fader !== undefined) {
                    updateMute(fader, true);
                }
            });
            setMutedSpeakerIds(prev => prev.filter(id => !selectedSpeakers.includes(id)));
        } else {
            selectedSpeakers.forEach(id => {
                const fader = speakerToFader[id];
                if (fader !== undefined) {
                    updateMute(fader, false);
                }
            });
            setMutedSpeakerIds(prev => {
                const updated = new Set(prev);
                selectedSpeakers.forEach(id => updated.add(id));
                return Array.from(updated);
            });
        }
    };

    const isSelectionMuted =
        selectedSpeakers.length > 0 &&
        selectedSpeakers.filter(id => mutedSpeakerIds.includes(id)).length > selectedSpeakers.length / 2;

    // Volume control section
    const lastVolumeRef = useRef<number>(volume);
    const updateVolumeThrottled = useRef(throttle((sliderValue: number, selected: string[]) => {
        const THRESHOLD_VOLUME = 0.01;
        if (Math.abs(sliderValue - lastVolumeRef.current) < THRESHOLD_VOLUME) return;
        lastVolumeRef.current = sliderValue;
        const mappedValue = Math.round(sliderValue * 1023);
        selected.forEach((id) => {
            const itemFader = speakerToFader[id];
            if (itemFader) {
                updateFader(itemFader, mappedValue);
            }
        });
    }, 50)).current;

    const handleVolumeChange = (sliderValue: number) => {
        setVolume(sliderValue);
        updateVolumeThrottled(sliderValue, selectedSpeakers);
    };

    return (
        <TouchableWithoutFeedback onPress={handleBackgroundPress}>
            <View style={styles.container}>
                {/* FloorPlan area */}
                <View
                    style={styles.floorPlanContainer}
                    {...panResponder.panHandlers}
                    onLayout={(event) => {
                        setContainerHeight(event.nativeEvent.layout.height);
                    }}
                >
                    <Text style={styles.topLabel}>{currentFloorPlan.label}</Text>
                    {/* Select All button just below the label */}
                    <TouchableOpacity
                        style={styles.selectAllButton}
                        onPress={() => updateCurrentSelection(currentFloorPlan.speakers.map(sp => sp.id))}
                    >
                        <Text style={styles.selectAllButtonText}>Select All</Text>
                    </TouchableOpacity>
                    <Svg height="100%" width="100%">
                        {borderElement}
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
                    {getScreenSpeakerPositions(currentFloorPlan.speakers, offsetX, offsetY, scale).map(sp => (
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
                    {settingsModalVisible && (
                        <View style={styles.floorPlanLabelContainer}>
                            <Text style={styles.floorPlanLabel}>{selectedSpeakers.join(', ')}</Text>
                        </View>
                    )}
                </View>
                {/* Indicator arrows */}
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
                {/* Control buttons */}
                <View style={styles.controls}>
                    <TouchableOpacity onPress={handleSoundMovement} style={styles.button}>
                        <Text style={styles.buttonText}>Sound Move</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleParChange} style={styles.button}>
                        <Text style={styles.buttonText}>Volume</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleMute} style={styles.button}>
                        <Text style={styles.buttonText}>{isSelectionMuted ? 'UnMute' : 'Mute'}</Text>
                    </TouchableOpacity>
                </View>
                {/* DragScreen modal */}
                <Modal
                    animationType="slide"
                    transparent={false}
                    visible={isDragModalVisible}
                    onRequestClose={() => setIsDragModalVisible(false)}
                >
                    <View style={{ flex: 1 }}>
                        <TouchableOpacity
                            style={{ padding: 10, backgroundColor: 'gray', alignSelf: 'flex-end' }}
                            onPress={() => setIsDragModalVisible(false)}
                        >
                            <Text style={{ color: '#fff' }}>Close</Text>
                        </TouchableOpacity>
                        <DragScreen onClose={() => setIsDragModalVisible(false)} />
                    </View>
                </Modal>
                {/* Volume modal */}
                <Modal
                    animationType="slide"
                    transparent
                    visible={settingsModalVisible}
                    onRequestClose={() => setSettingsModalVisible(false)}
                >
                    <TouchableWithoutFeedback onPress={() => setSettingsModalVisible(false)}>
                        <View style={styles.modalOverlay}>
                            <TouchableWithoutFeedback>
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
    /* NEW POSITIONING FOR SELECT ALL BUTTON */
    selectAllButton: {
        position: 'absolute',
        top: 40, // slightly below the top label
        alignSelf: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: Colors.primary,
        borderRadius: 5,
        zIndex: 1,
    },
    selectAllButtonText: {
        color: '#fff',
        fontSize: 16,
    },
    indicatorContainer: {
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
        flex: 0.1,
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
