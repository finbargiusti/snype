import { gameState } from "./game_state";

const WEBSOCKET_URL = (location.protocol.startsWith('https')? "wss" : "ws") + "://" + location.host;

export function openSocket() {
    socket = new WebSocket(WEBSOCKET_URL);

    socket.addEventListener("open", socketOnOpen);
    socket.addEventListener("message", socketOnMessage);
}

export let socket: WebSocket = null;
export let handlers: { [command: string]: Function } = {};

function socketOnOpen() {
    // Run when socket opens
}

function socketOnMessage(e: MessageEvent) {
    let msg = e.data;
    let json = JSON.parse(msg);

    let handler = handlers[json.command];
    if (handler) {
        handler(json.data);
    } else {
        console.warn("Received unhandled command: " + json.command);
    }
}

export let socketSend = (command: string, data: any) => {
    if (!socket || socket.readyState !== 1) return;

    socket.send(
        JSON.stringify({
            command,
            data
        })
    );
};
