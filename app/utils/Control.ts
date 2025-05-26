// app/utils/Control.ts
import io from 'socket.io-client';

//const SOCKET_SERVER_URL = 'http://192.168.192.100:3000';//local@home
 //const SOCKET_SERVER_URL = 'http://192.168.192.252:3000';//raspberrypi@home
//const SOCKET_SERVER_URL = 'http://192.168.0.17:3000';//raspberrypi@auditorium
const SOCKET_SERVER_URL = 'http://192.168.0.79:3000';//local@auditorium

const socket = io(SOCKET_SERVER_URL, {
    transports: ['websocket'],
});

socket.on('connect', () => {
    console.log('Connected to server via Socket.io');
});
socket.on('disconnect', () => {
    console.log('Disconnected from server');
});

// 已有的 updateFader 函数…
export const updateFader = (fader: number, value: number) => {
    console.log(`Sending fader update => fader: ${fader}, value: ${value}`);
    socket.emit('updateFader', { fader, value });
};

// 新增：仅发送位置坐标到服务器
export const updateSourceCoord = (x: number, y: number) => {
    console.log(`Sending source coordinates: x=${x}, y=${y}`);
    socket.emit('updateSource', { x, y });
};

// 新增：发送静音/取消静音消息到服务器
export const updateMute = (fader: number, mute: boolean) => {
    console.log(`Sending mute update => fader: ${fader}, mute: ${mute}`);
    socket.emit('updateMute', { fader, mute });
};

export default socket;
