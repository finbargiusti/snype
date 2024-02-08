import { Player } from "./player";
import { escapeHtml } from "./misc";

const killfeedContainer = document.querySelector("#killfeed") as HTMLElement;

let popups: any[] = [];

export function createKillfeedPopup(source: Player, destination: Player) {
	let div = document.createElement("div");
	div.innerHTML = `<span style="color: ${source.getRgbString()}; font-weight: bold;">${escapeHtml(source.name)}</span> killed <span style="color: ${destination.getRgbString()}; font-weight: bold;">${escapeHtml(destination.name)}</span>`;

	killfeedContainer.appendChild(div);
	popups.push({ div, time: performance.now() });

	div.clientWidth;
	div.classList.add('shown');
}

setInterval(() => {
	let now = performance.now();

	for (let popup of popups.slice()) {
		if (now - popup.time >= 4000) {
			popup.div.classList.remove('shown');

			setTimeout(() => {
				killfeedContainer.removeChild(popup.div);
			}, 1000);

			popups.splice(popups.indexOf(popup), 1);
		}
	}
}, 250);
