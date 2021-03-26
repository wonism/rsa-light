export const and = (x: number, y: number): number => x & y;
export const or = (x: number, y: number): number => x | y;
export const xor = (x: number, y: number): number => x ^ y;
export const andNot = (x: number, y: number): number => x & ~y;

export const nbits = (x: number): number => {
  let r = 1;
  let t: number;

  if ((t = x >>> 16) !== 0) {
    x = t;
    r += 16;
  }

  if ((t = x >> 8) !== 0) {
    x = t;
    r += 8;
  }

  if ((t = x >> 4) !== 0) {
    x = t;
    r += 4;
  }

  if ((t = x >> 2) !== 0) {
    x = t;
    r += 2;
  }

  if ((t = x >> 1) !== 0) {
    x = t;
    r += 1;
  }

  return r;
};

export const lbit = (x: number): number => {
  if (x === 0) {
    return -1;
  }

  let r = 0;

  if ((x & 0xffff) === 0) {
    x >>= 16;
    r += 16;
  }

  if ((x & 0xff) === 0) {
    x >>= 8;
    r += 8;
  }

  if ((x & 0xf) === 0) {
    x >>= 4;
    r += 4;
  }

  if ((x & 3) === 0) {
    x >>= 2;
    r += 2;
  }

  if ((x & 1) === 0) {
    r += 1;
  }

  return r;
};

export const cbit = (x: number): number => {
  let r = 0;

  while (x !== 0) {
    x &= x - 1;
    r += 1;
  }

  return r;
};
