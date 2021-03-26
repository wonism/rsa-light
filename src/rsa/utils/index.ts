import BigInteger from '../../big-integer';
import SeededRandom from '../../big-integer/utils/seeded-random';

export const parseBigInt = (str: string, r: number): BigInteger => new BigInteger(str, r);

export const pkcs1pad2 = (str: string, n: number): BigInteger => {
  if (n < str.length + 11) {
    throw new Error(`Message too long for RSA (n=${n}, l=${str.length})`);
  }

  const ba = [];
  let i = str.length - 1;

  while (i >= 0 && n > 0) {
    const c = str.charCodeAt(i--);

    if (c < 128) {
      ba[--n] = c;
    } else if ((c > 127) && (c < 2048)) {
      ba[--n] = (c & 63) | 128;
      ba[--n] = (c >> 6) | 192;
    } else {
      ba[--n] = (c & 63) | 128;
      ba[--n] = ((c >> 6) & 63) | 128;
      ba[--n] = (c >> 12) | 224;
    }
  }

  ba[--n] = 0;

  const rng = new SeededRandom();
  const x = [];

  while (n > 2) {
    x[0] = 0;

    while (x[0] === 0) {
      rng.nextBytes(x);
    }

    ba[--n] = x[0];
  }

  ba[--n] = 2;
  ba[--n] = 0;

  return new BigInteger(ba);
}

export const pkcs1unpad2 = (d: BigInteger, n: number): string => {
  const b = d.toByteArray();
  let i = 0;

  while (i < b.length && b[i] === 0) {
    ++i;
  }

  if (b.length - i !== n - 1 || b[i] !== 2) {
    return null;
  }

  ++i;
  while (b[i] !== 0) {
    if (++i >= b.length) {
      return null;
    }
  }

  let ret = '';

  while (++i < b.length) {
    const c = b[i] & 255;

    if (c < 128) {
      ret += String.fromCharCode(c);
    } else if ((c > 191) && (c < 224)) {
      ret += String.fromCharCode(((c & 31) << 6) | (b[i + 1] & 63));
      ++i;
    } else {
      ret += String.fromCharCode(((c & 15) << 12) | ((b[i + 1] & 63) << 6) | (b[i + 2] & 63));
      i += 2;
    }
  }

  return ret;
}
