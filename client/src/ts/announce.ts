import { Player } from "./player";
import { escapeHtml } from "./misc";

const announceContainer = document.querySelector("#announce") as HTMLElement;

let popups: any[] = [];

function createPopup(text: string) {
	let div = document.createElement("div");
	div.innerHTML = text;

	announceContainer.appendChild(div);
	popups.push({ div, time: performance.now() });

	div.clientWidth;
	div.classList.add('shown');
}

export const createKillfeedPopup = (source: Player, destination: Player) => 
	createPopup(`<span style="color: ${source.getRgbString()}; font-weight: bold;">${escapeHtml(source.name)}</span> killed <span style="color: ${destination.getRgbString()}; font-weight: bold;">${escapeHtml(destination.name)}</span>`);

export const createJoinedPopup = (player: Player) => 
	createPopup(
	`<span style="color: ${player.getRgbString()}; font-weight: bold;">${escapeHtml(player.name)}</span> joined the game`);

setInterval(() => {
	let now = performance.now();

	for (let popup of popups.slice()) {
		if (now - popup.time >= 4000) {
			popup.div.classList.remove('shown');

			setTimeout(() => {
				announceContainer.removeChild(popup.div);
			}, 1000);

			popups.splice(popups.indexOf(popup), 1);
		}
	}
}, 250);
