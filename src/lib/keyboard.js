// Phones (iPhones above all) only raise the keyboard for a focus() made
// inside the tap itself. A run ends with a tap, but the name box appears a
// moment later, on the next screen. So the tap focuses an invisible stand-in
// box straight away; when the real box takes the focus, the keyboard stays
// up (it does between boxes) and the stand-in is removed.
let standIn = null;
let timer = null;

export function holdKeyboard() {
  releaseKeyboard();
  try {
    const input = document.createElement('input');
    input.type = 'text';
    input.tabIndex = -1;
    input.setAttribute('aria-hidden', 'true');
    // 16px, or iPhones zoom the page in on focus.
    input.style.cssText =
      'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;border:0;padding:0;font-size:16px;pointer-events:none;';
    document.body.appendChild(input);
    input.focus({ preventScroll: true });
    standIn = input;
    // Never left behind holding the keyboard if the real box doesn't come.
    timer = setTimeout(releaseKeyboard, 2000);
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
