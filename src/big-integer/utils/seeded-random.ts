let rngState: Arcfour | null = null;
let rngPool: number[];
let rngPptr = 0;

const rngPsize = 256;

const rngSeedInt = (x: number): void => {
  rngPool[rngPptr++] ^= x & 255;
  rngPool[rngPptr++] ^= (x >> 8) & 255;
  rngPool[rngPptr++] ^= (x >> 16) & 255;
  rngPool[rngPptr++] ^= (x >> 24) & 255;

  if (rngPptr >= rngPsize) {
    rngPptr -= rngPsize;
  }
};

export const rngSeedTime = (): void => {
  rngSeedInt(new Date().getTime());
};

if (typeof rngPool === 'undefined') {
  rngPool = [];

  let t: number;

  if (typeof window !== 'undefined' && window.crypto) {
    if (typeof window.crypto.getRandomValues === 'function') {
      const ua = new Uint8Array(32);

      window.crypto.getRandomValues(ua);

      for (t = 0; t < 32; ++t) {
        rngPool[rngPptr++] = ua[t];
      }
    }
  }

  while (rngPptr < rngPsize) {
    t = Math.floor(65536 * Math.random());

    rngPool[rngPptr++] = t >>> 8;
    rngPool[rngPptr++] = t & 255;
  }

  rngPptr = 0;
  rngSeedTime();
}

const rngGetByte = (): number => {
  if (rngState === null) {
    rngSeedTime();
    rngState = prngNewstate();
    rngState.init(rngPool);

    for (rngPptr = 0; rngPptr < rngPool.length; ++rngPptr) {
      rngPool[rngPptr] = 0;
    }

    rngPptr = 0;
  }

  return rngState.next();
};

const rngGetBytes = (ba: Array<number>): void => {
  for (let i = 0; i < ba.length; ++i) {
    ba[i] = rngGetByte();
  }
};

const prngNewstate = (): Arcfour => new Arcfour();

export class Arcfour {
  private i = 0;
  private j = 0;
  private S: Array<number> = [];

  public init(key: Array<number>): void {
    let i: number;
    let j: number;
    let t: number;

    for (i = 0; i < 256; ++i) {
      this.S[i] = i;
    }

    j = 0;

    for (i = 0; i < 256; ++i) {
      j = (j + this.S[i] + key[i % key.length]) & 255;
      t = this.S[i];

      this.S[i] = this.S[j];
      this.S[j] = t;
    }

    this.i = 0;
    this.j = 0;
  }

  public next(): number {
    this.i = (this.i + 1) & 255;
    this.j = (this.j + this.S[this.i]) & 255;

    const t = this.S[this.i];

    this.S[this.i] = this.S[this.j];
    this.S[this.j] = t;

    return this.S[(t + this.S[this.i]) & 255];
  }
}

export default class SeededRandom {
  public nextBytes: (ba: Array<number>) => void;

  public constructor() {
    this.nextBytes = rngGetBytes;
  }
}
