import * as THREE from "three";

export const GRAVITY = new THREE.Vector3(0, 0, -25);
export const PLAYER_SPEED = 4; // Units per seconta
export const PLAYER_SPEED_SPRINTING = 6;

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