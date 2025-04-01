// app/components/EQControl.tsx
import React, { useState, useRef } from 'react';
import { View, StyleSheet, PanResponder, PanResponderGestureState, GestureResponderEvent } from 'react-native';
import Svg, { Polyline, Circle } from 'react-native-svg';
import Colors from '../constants/Colors';

interface EQControlProps {
    width?: number;
    height?: number;
}

const initialPoints = [
    { x: 0, y: 50 },
    { x: 55, y: 50 },
    { x: 110, y: 50 },
    { x: 165, y: 50 },
    { x: 220, y: 50 },
];

const EQControl: React.FC<EQControlProps> = ({ width = 230, height = 100 }) => {
    const [points, setPoints] = useState(initialPoints);

    const updatePoint = (index: number, newY: number) => {
        setPoints(prev => {
            const newPoints = [...prev];
            newPoints[index] = { ...newPoints[index], y: newY };
            return newPoints;
        });
    };

    return (
        <View style={styles.container}>
            <Svg width={width} height={height}>
                <Polyline
                    points={points.map(p => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    stroke={Colors.primary}
                    strokeWidth="2"
                />
                {points.map((point, index) => (
                    <DraggablePoint
                        key={index}
                        point={point}
                        onDrag={(newY) => updatePoint(index, newY)}
                        containerHeight={height}
                    />
                ))}
            </Svg>
        </View>
    );
};

interface DraggablePointProps {
    point: { x: number; y: number };
    onDrag: (newY: number) => void;
    containerHeight: number;
}

const DraggablePoint: React.FC<DraggablePointProps> = ({ point, onDrag, containerHeight }) => {
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderMove: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
                let newY = point.y + gestureState.dy;
                if (newY < 0) newY = 0;
                if (newY > containerHeight) newY = containerHeight;
                onDrag(newY);
            },
        })
    ).current;

    return (
        <Circle
            cx={point.x}
            cy={point.y}
            r="8"
            fill={Colors.selectedSpeaker}
            {...panResponder.panHandlers}
        />
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 20,
        alignSelf: 'center',
    },
});

export default EQControl;
