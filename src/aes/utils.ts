import { AES_SBOX } from './constants';

export const subWord = (w: number[]): number[] => {
  for (let i = 0; i < 4; i++) {
    w[i] = AES_SBOX[16 * ((w[i] & 0xf0) >> 4) + (w[i] & 0x0f)];
  }

  return w;
}

export const rotWord = (w: number[]): number[] => {
  w.push(w.shift());

  return w;
}

export const gmult = (a: number, b: number): number => {
  let p = 0, hbs = 0;

  for (let i = 0; i < 8; i++) {
    if (b & 1) {
      p ^= a;
    }

    hbs = a & 0x80;
    a <<= 1;

    if (hbs) {
      a ^= 0x1b;
    }

    b >>= 1;
  }

  return p;
}

export const coefAdd = (a: number[], b: number[]): number[] => [
  a[0] ^ b[0],
  a[1] ^ b[1],
  a[2] ^ b[2],
  a[3] ^ b[3],
];

export const coefMult = (a: number[], b: number[]): number[] => [
  gmult(a[0], b[0]) ^ gmult(a[3], b[1]) ^ gmult(a[2], b[2]) ^ gmult(a[1], b[3]),
  gmult(a[1], b[0]) ^ gmult(a[0], b[1]) ^ gmult(a[3], b[2]) ^ gmult(a[2], b[3]),
  gmult(a[2], b[0]) ^ gmult(a[1], b[1]) ^ gmult(a[0], b[2]) ^ gmult(a[3], b[3]),
  gmult(a[3], b[0]) ^ gmult(a[2], b[1]) ^ gmult(a[1], b[2]) ^ gmult(a[0], b[3]),
];
