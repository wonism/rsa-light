import { rotateLeft, encodeUtf8 } from './utils';

export default class SHA1 {
  private static cvtHex(val: number): string {
    let str = '';
    let v: number;

    for (let i = 7; i >= 0; i--) {
      v = (val >>> (i * 4)) & 0x0f;
      str += v.toString(16);
    }

    return str;
  }

  public static hex(str: string): string {
    let H0 = 0x67452301;
    let H1 = 0xEFCDAB89;
    let H2 = 0x98BADCFE;
    let H3 = 0x10325476;
    let H4 = 0xC3D2E1F0;
    let A: number;
    let B: number;
    let C: number;
    let D: number;
    let E: number;

    const s = encodeUtf8(str);
    const l = s.length;

    let blockstart: number;
    let i: number;
    let j: number;

    const W = new Array(80);
    const wordArray = [];

    let temp: number;

    for (i = 0; i < l - 3; i += 4) {
      j = s.charCodeAt(i) << 24 | s.charCodeAt(i + 1) << 16 | s.charCodeAt(i + 2) << 8 | s.charCodeAt(i + 3);
      wordArray.push(j);
    }

    switch (l % 4) {
    case 0:
      i = 0x080000000;
      break;
    case 1:
      i = s.charCodeAt(l - 1) << 24 | 0x0800000;
      break;
    case 2:
      i = s.charCodeAt(l - 2) << 24 | s.charCodeAt(l - 1) << 16 | 0x08000;
      break;
    case 3:
      i = s.charCodeAt(l - 3) << 24 | s.charCodeAt(l - 2) << 16 | s.charCodeAt(l - 1) << 8 | 0x80;
      break;
    }

    wordArray.push(i);

    while ((wordArray.length % 16) !== 14 ) {
      wordArray.push( 0 );
    }

    wordArray.push(l >>> 29);
    wordArray.push((l << 3) & 0x0ffffffff);

    for (blockstart = 0; blockstart < wordArray.length; blockstart += 16) {
      for (i = 0; i < 16; i++) {
        W[i] = wordArray[blockstart +i ];
      }

      for (i = 16; i <= 79; i++) {
        W[i] = rotateLeft(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16], 1);
      }

      A = H0;
      B = H1;
      C = H2;
      D = H3;
      E = H4;

      for (i = 0; i <= 19; i++) {
        temp = (rotateLeft(A, 5) + ((B & C) | (~B & D)) + E + W[i] + 0x5A827999) & 0x0ffffffff;
        E = D;
        D = C;
        C = rotateLeft(B, 30);
        B = A;
        A = temp;
      }

      for (i = 20; i <= 39; i++) {
        temp = (rotateLeft(A, 5) + (B ^ C ^ D) + E + W[i] + 0x6ED9EBA1) & 0x0ffffffff;
        E = D;
        D = C;
        C = rotateLeft(B, 30);
        B = A;
        A = temp;
      }

      for (i = 40; i <= 59; i++) {
        temp = (rotateLeft(A, 5) + ((B & C) | (B & D) | (C & D)) + E + W[i] + 0x8F1BBCDC) & 0x0ffffffff;
        E = D;
        D = C;
        C = rotateLeft(B, 30);
        B = A;
        A = temp;
      }

      for (i = 60; i <= 79; i++) {
        temp = (rotateLeft(A, 5) + (B ^ C ^ D) + E + W[i] + 0xCA62C1D6) & 0x0ffffffff;
        E = D;
        D = C;
        C = rotateLeft(B, 30);
        B = A;
        A = temp;
      }

      H0 = (H0 + A) & 0x0ffffffff;
      H1 = (H1 + B) & 0x0ffffffff;
      H2 = (H2 + C) & 0x0ffffffff;
      H3 = (H3 + D) & 0x0ffffffff;
      H4 = (H4 + E) & 0x0ffffffff;
    }

    const result = SHA1.cvtHex(H0) + SHA1.cvtHex(H1) + SHA1.cvtHex(H2) + SHA1.cvtHex(H3) + SHA1.cvtHex(H4);

    return result.toLowerCase();
  }
}
