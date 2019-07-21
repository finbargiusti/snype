import { localPlayerId, players, updatePlayer, addPlayer, removePlayer } from "./player";

const WEBSOCKET_URL = "ws://" + location.host;

export let socket = new WebSocket(WEBSOCKET_URL);
export let handlers = {};

socket.addEventListener('open', () => {
  socketSend("connect", {
    playerId: localPlayerId
  });
});

socket.addEventListener('message', (e) => {
  let msg = e.data;
  let json = JSON.parse(msg);

  let handler = handlers[json.command];
  if (handler) {
    handler(json.data);
  } else {
    console.warn("Received unhandled command: " + json.command);
  }
});

export let socketSend = (command: string, data: any) => {
  if (socket.readyState !== 1) return;
  socket.send(JSON.stringify({
    command, data
  }));
};

handlers["addPlayer"] = function(data) {
  let player = players.get(data.id);
  if (player) updatePlayer(data);
  else addPlayer(data);
};

handlers["updatePlayer"] = function(data) {
  updatePlayer(data);
};

handlers["removePlayer"] = function(data) {
  removePlayer(data);
};