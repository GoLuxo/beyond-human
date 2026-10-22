import { getState } from '../state/store.js';
import { sound } from './sound.js';
import { celebrate } from './events.js';

export function play(name) {
  if (getState().settings.sound) sound[name]?.();
}

export function completed(source, intensity = 0.6) {
  play('check');
  celebrate(source, intensity);
}
