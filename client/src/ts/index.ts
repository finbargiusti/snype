import "./rendering";
import "./net";
import { parse } from "./smfparser.js";
import { SnypeMap } from "./map";
import { gameState } from "./game_state";
import { createLocalPlayer, players } from "./player";
import { openSocket, socketSend, socket } from "./net";
import { initEditor } from "./editor";
import { mainCanvas } from "./rendering";
import { currentPowerUps } from "./power_up";

let gameEl = document.querySelector(".game") as HTMLElement;

let loadLevel = async (text: string, url: string) => {
	if (socket && socket.readyState !== 1) {
		alert("No connection to the server (yet).");
		return;
	}

    gameEl.style.filter = "";

    let rawSMFData = parse(text);

    let newMap = new SnypeMap(rawSMFData);

    gameState.currentMap = newMap;

    createLocalPlayer();
    if (!gameState.isEditor) {
        socketSend("connect", {
            playerId: gameState.localPlayer.id,
			mapUrl: url,
			name: localStorage.getItem('displayName') || ''
        });
        gameState.localPlayer.spawn();
    } else {
        initEditor();
    }
};

let listMaps = async (url: any) => {
    gameEl.style.filter = "blur(30px)";
    let mapEl = document.getElementById("maps") as HTMLDivElement;
    mapEl.style.display = "block";
    let response = await fetch(url);
    let text = await response.text();

    let maps = JSON.parse(text);

    mapEl.querySelectorAll("p").forEach(child => {
        mapEl.removeChild(child);
    });

    maps.forEach((map: any) => {
        let button = document.createElement("p");
        button.innerText = `${map.metadata.name} by ${map.metadata.author ||
            "anon"}`;
        button.onclick = async () => {
            mapEl.style.display = "none";
            let response = await fetch(map.path);
            let text = await response.text();
            loadLevel(text, map.path);
        };
        mapEl.appendChild(button);
    });

    if (gameState.isEditor) {
        let textarea = document.getElementById("smf-clipboard");
        let pasteButton = document.createElement("p");
        (pasteButton.innerText = "Load from Clipboard"),
            (pasteButton.onclick = async () => {
                mapEl.style.display = "none";
                textarea.focus();
                let text = await navigator.clipboard.readText();
                loadLevel(text, "/clipboard");
            });
        mapEl.appendChild(pasteButton);
    }
};

let init = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    let isEditor = urlParams.get("editor") === "true";
    gameState.isEditor = isEditor;

    if (isEditor) {
        listMaps("/templatemaps");
    } else {
		listMaps("/defaultmaps");
		
		do {
			let oldValue = localStorage.getItem('displayName') || '';
			let newValue = prompt("Choose your name:", oldValue);
			if (newValue) {
				if (newValue.length > 24) newValue = '';
				localStorage.setItem('displayName', newValue);
			}
		} while (!localStorage.getItem('displayName'));
    }
    if (!isEditor) openSocket();

    window.addEventListener("beforeunload", e => {
        let confirm = "Are you sure you want to leave?";

        e.returnValue = confirm;
        return confirm;
	});
};

let leaveLobby = async () => {
    for (let a of currentPowerUps) {
        a.start = -Infinity; // Force a remove
    }

    gameState.currentMap = null;
    players.clear();
    gameState.localPlayer = null;
    socketSend("leave", {});
    listMaps("/defaultmaps");
};

document.getElementById("leave").addEventListener("mousedown", leaveLobby);

window.addEventListener("load", init);
