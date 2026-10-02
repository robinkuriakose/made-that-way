// Phones (iPhones above all) only raise the keyboard for a focus() made
// inside a tap, or when focus moves from one text box to another. A run ends
// with a tap, but the name box takes the focus a moment later, once the
// score has counted up. So the tap focuses an invisible stand-in box at
// once; with inputmode "none" it holds the focus without showing a
// keyboard. When the real box takes the focus, the keyboard comes up for it,
// and the stand-in is removed.
let standIn = null;
let timer = null;

export function holdKeyboard() {
  releaseKeyboard();
  try {
    const input = document.createElement('input');
    input.type = 'text';
    input.tabIndex = -1;
    input.inputMode = 'none';
    input.dataset.keyboardStandIn = '1';
    input.setAttribute('aria-hidden', 'true');
    // 16px, or iPhones zoom the page in on focus.
    input.style.cssText =
      'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;border:0;padding:0;font-size:16px;pointer-events:none;';
    document.body.appendChild(input);
    input.focus({ preventScroll: true });
    standIn = input;
    // Never left behind if the real box doesn't come.
    timer = setTimeout(releaseKeyboard, 4000);
  } catch {
    standIn = null;
  }
}

export function releaseKeyboard() {
  clearTimeout(timer);
  timer = null;
  if (standIn) {
    if (document.activeElement === standIn) standIn.blur();
    standIn.remove();
    standIn = null;
  }
}
