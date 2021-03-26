import { safeAdd, encodeUtf8, str2binb, binb2hex } from './utils';

export default class SHA256 {
  private static readonly chrsz = 8;

  private static S(X: number, n: number): number {
    return (X >>> n) | (X << (32 - n));
  }

  private static R(X: number, n: number): number {
    return (X >>> n);
  }

  private static Ch(x: number, y: number, z: number): number {
    return ((x & y) ^ ((~x) & z));
  }

  private static Maj(x: number, y: number, z: number): number {
    return ((x & y) ^ (x & z) ^ (y & z));
  }

  private static Sigma0256(x: number): number {
    return (SHA256.S(x, 2) ^ SHA256.S(x, 13) ^ SHA256.S(x, 22));
  }

  private static Sigma1256(x: number): number {
    return (SHA256.S(x, 6) ^ SHA256.S(x, 11) ^ SHA256.S(x, 25));
  }

  private static Gamma0256(x: number): number {
    return (SHA256.S(x, 7) ^ SHA256.S(x, 18) ^ SHA256.R(x, 3));
  }

  private static Gamma1256(x: number): number {
    return (SHA256.S(x, 17) ^ SHA256.S(x, 19) ^ SHA256.R(x, 10));
  }

  public static hex(str: string): string {
    const s = encodeUtf8(str);
    const m = str2binb(s, SHA256.chrsz);
    const l = s.length * SHA256.chrsz;

    // eslint-disable-next-line max-len
    const K = [0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5, 0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5, 0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3, 0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174, 0xE49B69C1, 0xEFBE4786, 0xFC19DC6, 0x240CA1CC, 0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA, 0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7, 0xC6E00BF3, 0xD5A79147, 0x6CA6351, 0x14292967, 0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13, 0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85, 0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3, 0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070, 0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5, 0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3, 0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208, 0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2];
    const HASH = [0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A, 0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19];
    const W = new Array(64);

    let a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number;
    let T1: number, T2: number;

    m[l >> 5] |= 0x80 << (24 - l % 32);
    m[((l + 64 >> 9) << 4) + 15] = l;

    for (let i = 0, len = m.length; i < len; i += 16) {
      a = HASH[0];
      b = HASH[1];
      c = HASH[2];
      d = HASH[3];
      e = HASH[4];
      f = HASH[5];
      g = HASH[6];
      h = HASH[7];

      for (let j = 0; j < 64; j++) {
        if (j < 16) {
          W[j] = m[j + i];
        } else {
          W[j] = safeAdd(safeAdd(safeAdd(SHA256.Gamma1256(W[j - 2]), W[j - 7]), SHA256.Gamma0256(W[j - 15])), W[j - 16]);
        }

        T1 = safeAdd(safeAdd(safeAdd(safeAdd(h, SHA256.Sigma1256(e)), SHA256.Ch(e, f, g)), K[j]), W[j]);
        T2 = safeAdd(SHA256.Sigma0256(a), SHA256.Maj(a, b, c));

        h = g;
        g = f;
        f = e;
        e = safeAdd(d, T1);
        d = c;
        c = b;
        b = a;
        a = safeAdd(T1, T2);
      }

      HASH[0] = safeAdd(a, HASH[0]);
      HASH[1] = safeAdd(b, HASH[1]);
      HASH[2] = safeAdd(c, HASH[2]);
      HASH[3] = safeAdd(d, HASH[3]);
      HASH[4] = safeAdd(e, HASH[4]);
      HASH[5] = safeAdd(f, HASH[5]);
      HASH[6] = safeAdd(g, HASH[6]);
      HASH[7] = safeAdd(h, HASH[7]);
    }

    return binb2hex(HASH);
  }
}
