import { rotateLeft, addUnsigned, convertToWordArray, encodeUtf8, wordToHex } from './utils';

export default class MD5 {
  private static F(x: number, y: number, z: number): number {
    return (x & y) | ((~x) & z);
  }

  private static G(x: number, y: number, z: number): number {
    return (x & z) | (y & (~z));
  }

  private static H(x: number, y: number, z: number): number {
    return (x ^ y ^ z);
  }

  private static I(x: number, y: number, z: number): number {
    return (y ^ (x | (~z)));
  }

  private static FF(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(MD5.F(b, c, d), x), ac));

    return addUnsigned(rotateLeft(a, s), b);
  }

  private static GG(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(MD5.G(b, c, d), x), ac));

    return addUnsigned(rotateLeft(a, s), b);
  }

  private static HH(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(MD5.H(b, c, d), x), ac));

    return addUnsigned(rotateLeft(a, s), b);
  }

  private static II(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(MD5.I(b, c, d), x), ac));

    return addUnsigned(rotateLeft(a, s), b);
  }

  public static hex(str: string): string {
    let k: number, AA: number, BB: number, CC: number, DD: number, a: number, b: number, c: number, d: number;
    const S11 = 7, S12 = 12, S13 = 17, S14 = 22;
    const S21 = 5, S22 = 9 , S23 = 14, S24 = 20;
    const S31 = 4, S32 = 11, S33 = 16, S34 = 23;
    const S41 = 6, S42 = 10, S43 = 15, S44 = 21;

    const s = encodeUtf8(str);
    const x = convertToWordArray(s);

    a = 0x67452301;
    b = 0xEFCDAB89;
    c = 0x98BADCFE;
    d = 0x10325476;

    for (k = 0; k < x.length; k += 16) {
      AA = a; BB = b; CC = c; DD = d;
      a = MD5.FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
      d = MD5.FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
      c = MD5.FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
      b = MD5.FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
      a = MD5.FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
      d = MD5.FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
      c = MD5.FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
      b = MD5.FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
      a = MD5.FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
      d = MD5.FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
      c = MD5.FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
      b = MD5.FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
      a = MD5.FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
      d = MD5.FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
      c = MD5.FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
      b = MD5.FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
      a = MD5.GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
      d = MD5.GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
      c = MD5.GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
      b = MD5.GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
      a = MD5.GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
      d = MD5.GG(d, a, b, c, x[k + 10], S22, 0x2441453);
      c = MD5.GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
      b = MD5.GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
      a = MD5.GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
      d = MD5.GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
      c = MD5.GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
      b = MD5.GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
      a = MD5.GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
      d = MD5.GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
      c = MD5.GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
      b = MD5.GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
      a = MD5.HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
      d = MD5.HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
      c = MD5.HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
      b = MD5.HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
      a = MD5.HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
      d = MD5.HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
      c = MD5.HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
      b = MD5.HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
      a = MD5.HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
      d = MD5.HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
      c = MD5.HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
      b = MD5.HH(b, c, d, a, x[k + 6], S34, 0x4881D05);
      a = MD5.HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
      d = MD5.HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
      c = MD5.HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
      b = MD5.HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
      a = MD5.II(a, b, c, d, x[k + 0], S41, 0xF4292244);
      d = MD5.II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
      c = MD5.II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
      b = MD5.II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
      a = MD5.II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
      d = MD5.II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
      c = MD5.II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
      b = MD5.II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
      a = MD5.II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
      d = MD5.II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
      c = MD5.II(c, d, a, b, x[k + 6], S43, 0xA3014314);
      b = MD5.II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
      a = MD5.II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
      d = MD5.II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
      c = MD5.II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
      b = MD5.II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
      a = addUnsigned(a, AA);
      b = addUnsigned(b, BB);
      c = addUnsigned(c, CC);
      d = addUnsigned(d, DD);
    }

    const result = wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d);

    return result.toLowerCase();
  }
}
