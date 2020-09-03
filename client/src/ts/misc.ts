import * as THREE from "three";

export const GRAVITY = new THREE.Vector3(0, 0, -25);
export const PLAYER_SPEED = 3.5; // Units per seconta
export const PLAYER_SPEED_SPRINTING = 6.5;

export function clamp(val: number, min: number, max: number) {
    if (val > max) return max;
    if (val < min) return min;
    return val;
}

export function degToRad(deg: number) {
    return deg / 180 * Math.PI;
}

export function radToDeg(rad: number) {
    return rad / Math.PI * 180;
}

function fallbackCopyTextToClipboard(text: string) {
    var textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
  
    try {
      var successful = document.execCommand('copy');
      var msg = successful ? 'successful' : 'unsuccessful';
      console.log('Fallback: Copying text command was ' + msg);
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
    }
  
    document.body.removeChild(textArea);
  }
export function copyTextToClipboard(text: string) {
    if (!navigator.clipboard) {
      fallbackCopyTextToClipboard(text);
      return;
    }
    navigator.clipboard.writeText(text).then(function() {
      console.log('Async: Copying to clipboard was successful!');
    }, function(err) {
      console.error('Async: Could not copy text: ', err);
    });
}

export function removeItemFromArray<T>(arr: T[], item: T) {
    let index = arr.indexOf(item);
    if (index !== -1) arr.splice(index, 1);
}

const INT32_MAX_VALUE = Math.pow(2, 32);
export function stringToRandomNumber(str: string) {
    return xfnv1a(str) / INT32_MAX_VALUE;
}

// https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript/47593316#47593316
// https://softwareengineering.stackexchange.com/questions/49550/which-hashing-algorithm-is-best-for-uniqueness-and-speed/145633#145633
// https://github.com/sindresorhus/fnv1a
// I LOVE THIS HASH <3
function xfnv1a(str: string) {
    for(var i = 0, h = 2166136261 >>> 0; i < str.length; i++)
        h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    h += h << 13; h ^= h >>> 7;
    h += h << 3;  h ^= h >>> 17;
    return (h += h << 5) >>> 0;
}

export function hsvToRgb(h: number, s: number, v: number) {
	var r, g, b;
  
	var i = Math.floor(h * 6);
	var f = h * 6 - i;
	var p = v * (1 - s);
	var q = v * (1 - f * s);
	var t = v * (1 - (1 - f) * s);
  
	switch (i % 6) {
	  case 0: r = v, g = t, b = p; break;
	  case 1: r = q, g = v, b = p; break;
	  case 2: r = p, g = v, b = t; break;
	  case 3: r = p, g = q, b = v; break;
	  case 4: r = t, g = p, b = v; break;
	  case 5: r = v, g = p, b = q; break;
	}
  
	return [ r * 255, g * 255, b * 255 ];
  }

export function escapeHtml(unsafe: string) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }