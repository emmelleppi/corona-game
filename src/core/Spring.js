// Damped springs with the same parametrisation used by react-spring
// (tension / friction / mass, time in seconds), integrated with small
// fixed sub-steps so the result does not depend on the frame rate.

const SUB_STEP = 1 / 500;

export const SPRING_PRESETS = {
  molasses: { tension: 280, friction: 120, mass: 1 },
  bat: { tension: 210, friction: 10, mass: 1 },
  gentle: { tension: 120, friction: 14, mass: 1 },
};

export class Spring {
  constructor(value = 0, config = SPRING_PRESETS.gentle) {
    this.value = value;
    this.target = value;
    this.velocity = 0;
    this.config = config;
  }

  set(target) {
    this.target = target;
  }

  jump(value) {
    this.value = this.target = value;
    this.velocity = 0;
  }

  get isResting() {
    return (
      Math.abs(this.velocity) < 1e-4 &&
      Math.abs(this.value - this.target) < 1e-4
    );
  }

  update(dt) {
    const { tension, friction, mass } = this.config;
    let t = dt;
    while (t > 0) {
      const h = Math.min(SUB_STEP, t);
      const force =
        -tension * (this.value - this.target) - friction * this.velocity;
      this.velocity += (force / mass) * h;
      this.value += this.velocity * h;
      t -= h;
    }
    return this.value;
  }
}

// A group of scalar springs sharing the same configuration.
export class SpringArray {
  constructor(values, config) {
    this.springs = values.map((v) => new Spring(v, config));
  }

  set(values) {
    values.forEach((v, i) => this.springs[i].set(v));
  }

  update(dt) {
    for (const s of this.springs) s.update(dt);
  }

  get(i) {
    return this.springs[i].value;
  }
}
