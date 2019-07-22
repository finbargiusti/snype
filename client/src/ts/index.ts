import "./rendering";
import "./net";
import { parse } from "./smfparser";
import { Map } from "./map-load";
import { gameState } from "./game_state";
import { createLocalPlayer } from "./player";
import { openSocket } from "./net";

async function loadLevel(url: any) {
    let response = await fetch(url);
    let text = await response.text();

    let rawSMFData = parse(text);
    console.log(rawSMFData);

    let newMap = new Map(rawSMFData);
    console.log(newMap);

    gameState.currentMap = newMap;

    createLocalPlayer();
    openSocket();
}

async function init() {
    await loadLevel("/static/ascent.smf");
}

init();
