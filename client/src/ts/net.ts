import {
    localPlayerId,
    players,
    updatePlayer,
    addPlayer,
    removePlayer
} from "./player";

const WEBSOCKET_URL = "ws://" + location.host;

export function openSocket() {
    socket = new WebSocket(WEBSOCKET_URL);

    socket.addEventListener("open", socketOnOpen);
    socket.addEventListener("message", socketOnMessage);
}

export let socket: WebSocket = null;
export let handlers: { [command: string]: Function } = {};

function socketOnOpen() {
    socketSend("connect", {
        playerId: localPlayerId
    });
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
    if (socket.readyState !== 1) return;
    socket.send(
        JSON.stringify({
            command,
            data
        })
    );
};

let crappyCode = 5;

handlers["addPlayer"] = function(data: any) {
    let player = players.get(data.id);
    if (player) updatePlayer(data);
    else addPlayer(data);
};

handlers["updatePlayer"] = function(data: any) {
    updatePlayer(data);
};

handlers["removePlayer"] = function(data: any) {
    removePlayer(data);
};
