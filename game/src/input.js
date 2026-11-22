// VELVET HOUR — keyboard and mouse. The game is played with WASD or arrows
// plus Shift to run; number keys use tools; the mouse clicks buttons and aims
// the decoy coin. One-shot presses are consumed once per frame.
export function createInput(canvas) {
  const down = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, inside: false, click: null };

  function toCanvas(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((clientX - r.left) / r.width) * canvas.width,
      y: ((clientY - r.top) / r.height) * canvas.height,
    };
  }

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (!down.has(e.code)) pressed.add(e.code);
    down.add(e.code);
  });
  window.addEventListener('keyup', (e) => down.delete(e.code));
  window.addEventListener('blur', () => {
    down.clear();
    pressed.clear();
  });
  canvas.addEventListener('mousemove', (e) => {
    const p = toCanvas(e.clientX, e.clientY);
    mouse.x = p.x;
    mouse.y = p.y;
    mouse.inside = true;
  });
  canvas.addEventListener('mouseleave', () => {
    mouse.inside = false;
  });
  canvas.addEventListener('click', (e) => {
    const p = toCanvas(e.clientX, e.clientY);
    mouse.click = { x: p.x, y: p.y };
  });

  return {
    get up() {
      return down.has('KeyW') || down.has('ArrowUp');
    },
    get down() {
      return down.has('KeyS') || down.has('ArrowDown');
    },
    get left() {
      return down.has('KeyA') || down.has('ArrowLeft');
    },
    get right() {
      return down.has('KeyD') || down.has('ArrowRight');
    },
    get run() {
      return down.has('ShiftLeft') || down.has('ShiftRight');
    },
    get mouse() {
      return mouse;
    },
    wasPressed(code) {
      return pressed.has(code);
    },
    consumeClick() {
      const c = mouse.click;
      mouse.click = null;
      return c;
    },
    endFrame() {
      pressed.clear();
    },
  };
}
