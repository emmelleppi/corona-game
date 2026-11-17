import { Emitter } from "./Emitter.js";

// Keyboard / mouse / pointer-lock handling. Uses physical key codes so the
// game works with any keyboard layout (WASD on QWERTY == ZQSD on AZERTY).
export class Input extends Emitter {
  constructor(element) {
    super();
    this.element = element;
    this.keys = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.locked = false;

    window.addEventListener("keydown", (e) => {
      if (e.target instanceof HTMLInputElement) return;
      if (!e.repeat) {
        this.keys.add(e.code);
        this.emit("keydown", e.code);
      }
      if (e.code === "Space" || e.code.startsWith("Arrow")) e.preventDefault();
    });
    window.addEventListener("keyup", (e) => {
      this.keys.delete(e.code);
      this.emit("keyup", e.code);
    });
    window.addEventListener("blur", () => this.keys.clear());

    document.addEventListener("mousemove", (e) => {
      if (!this.locked) return;
      this.mouseDX += e.movementX || 0;
      this.mouseDY += e.movementY || 0;
    });

    element.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      this.emit("click", { locked: this.locked });
    });

    document.addEventListener("pointerlockchange", () => {
      this.locked = document.pointerLockElement === this.element;
      this.emit(this.locked ? "lock" : "unlock");
    });
  }

  isDown(...codes) {
    return codes.some((c) => this.keys.has(c));
  }

  get forward() {
    return this.isDown("KeyW", "ArrowUp");
  }
  get backward() {
    return this.isDown("KeyS", "ArrowDown");
  }
  get left() {
    return this.isDown("KeyA", "ArrowLeft");
  }
  get right() {
    return this.isDown("KeyD", "ArrowRight");
  }
  get jump() {
    return this.isDown("Space");
  }
  get boost() {
    return this.isDown("ShiftLeft", "ShiftRight");
  }

  consumeMouse() {
    const d = [this.mouseDX, this.mouseDY];
    this.mouseDX = this.mouseDY = 0;
    return d;
  }

  async lock() {
    if (this.locked) return;
    try {
      await this.element.requestPointerLock({ unadjustedMovement: true });
    } catch {
      try {
        await this.element.requestPointerLock();
      } catch (e) {
        console.warn(e);
      }
    }
  }

  unlock() {
    if (this.locked) document.exitPointerLock();
  }
}
