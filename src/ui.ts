import { state } from './state.js';

export function showError(msg: string): void {
  const box = document.getElementById('error-box');
  const label = document.getElementById('error-message');
  if (!box || !label) return;
  label.innerText = msg;
  box.classList.remove('hidden');
  setTimeout(() => box.classList.add('hidden'), 5000);
}

export function showOverlay(visible: boolean): void {
  document.getElementById('gen-overlay')?.classList.toggle('hidden', !visible);
}

export function updateUI(): void {
  const panel = document.getElementById('selection-box');
  const nameEl = document.getElementById('unit-name');
  if (!panel || !nameEl) return;

  if (state.selection.units.length > 0) {
    panel.classList.remove('hidden');
    nameEl.innerText =
      state.selection.units.length > 1 ? `${state.selection.units.length} Units` : 'Field Unit';
  } else {
    panel.classList.add('hidden');
  }
}

export function updateResourceUI(): void {
  const goldEl = document.getElementById('gold-val');
  const unitsEl = document.getElementById('units-val');
  if (goldEl) goldEl.innerText = String(state.resources.aether);
  if (unitsEl) unitsEl.innerText = String(state.units.length);
}
