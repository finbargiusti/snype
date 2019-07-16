export let socket = new WebSocket("ws://" + location.hostname + ":20003");

export let send = msg => {
  if (socket.readyState == 1) {
    socket.send(msg);
  }
};
