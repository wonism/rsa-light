import { base64Chars } from './constants';
import RSAKey from './rsa-key';
import { MD5 } from '../hash';
import AES from '../aes';
import SeededRandom from '../big-integer/utils/seeded-random';
import { int2char } from '../big-integer/utils/integer';

interface DecryptionResult {
  plainText: string;
  signature: 'verified' | 'unsigned' | 'forged';
  publicKey?: string;
}

export default class RSA {
  private static b256to64(t: string): string {
    let a: number, c: number, n: number;
    let r = '';
    let s = 0;
    const tl = t.length;

    for (n = 0; n < tl; n++) {
      c = t.charCodeAt(n);

      if (s === 0) {
        r += base64Chars.charAt((c >> 2) & 63);
        a = (c & 3) << 4;
      } else if (s === 1) {
        r += base64Chars.charAt((a | (c >> 4) & 15));
        a = (c & 15) << 2;
      } else if (s === 2) {
        r += base64Chars.charAt(a | ((c >> 6) & 3));
        r += base64Chars.charAt(c & 63);
      }

      s += 1;

      if (s === 3) {
        s = 0;
      }
    }

    if (s > 0) {
      r += base64Chars.charAt(a);
      r += '=';
    }

    if (s === 1) {
      r += '=';
    }

    return r;
  }

  private static b64to256(t: string): string {
    let c: number, n: number;
    let r = '', s = 0, a = 0;
    const tl = t.length;

    for (n = 0; n < tl; n++) {
      c = base64Chars.indexOf(t.charAt(n));
      if (c >= 0) {
        if (s) {
          r += String.fromCharCode(a | (c >> (6 - s)) & 255);
        }

        s = (s + 2) & 7;
        a = (c << s) & 255;
      }
    }

    return r;
  }

  private static b16to64(h: string): string {
    let i: number, c: number;
    let ret = '';

    if (h.length % 2 === 1) {
      h = '0' + h;
    }

    const len = h.length;
    for (i = 0; i + 3 <= len; i += 3) {
      c = parseInt(h.substring(i, i + 3), 16);
      ret += base64Chars.charAt(c >> 6) + base64Chars.charAt(c & 63);
    }

    if (i + 1 === h.length) {
      c = parseInt(h.substring(i, i + 1), 16);
      ret += base64Chars.charAt(c << 2);
    } else if (i + 2 === h.length) {
      c = parseInt(h.substring(i, i + 2), 16);
      ret += base64Chars.charAt(c >> 2) + base64Chars.charAt((c & 3) << 4);
    }

    while ((ret.length & 3) > 0) {
      ret += '=';
    }

    return ret;
  }

  private static b64to16(s: string): string {
    let ret = '';
    let k = 0;
    let slop: number;

    for (let i = 0, len = s.length; i < len; ++i) {
      if (s.charAt(i) === '=') {
        break;
      }

      const v = base64Chars.indexOf(s.charAt(i));

      if (v < 0) {
        continue;
      }

      if (k === 0) {
        ret += int2char(v >> 2);
        slop = v & 3;
        k = 1;
      } else if (k === 1) {
        ret += int2char((slop << 2) | (v >> 4));
        slop = v & 0xf;
        k = 2;
      } else if (k === 2) {
        ret += int2char(slop);
        ret += int2char(v >> 2);
        slop = v & 3;
        k = 3;
      } else {
        ret += int2char((slop << 2) | (v >> 4));
        ret += int2char(v & 0xf);
        k = 0;
      }
    }

    if (k === 1) {
      ret += int2char(slop << 2);
    }

    return ret;
  }

  private static string2bytes(str: string): number[] {
    const bytes = [];

    for(let i = 0, len = str.length; i < len; i++) {
      bytes.push(str.charCodeAt(i));
    }

    return bytes;
  }

  private static bytes2string(bytes: number[]): string {
    let str = '';

    for (let i = 0, len = bytes.length; i < len; i++) {
      str += String.fromCharCode(bytes[i]);
    }

    return str;
  }

  private static blockXOR(a: number[], b: number[]): number[] {
    return new Array(16).fill(null).map((_, i) => a[i] ^ b[i]);
  }

  private static blockIV(): number[] {
    const r = new SeededRandom();
    const IV = new Array(16);

    r.nextBytes(IV);

    return IV;
  }

  private static pad16(bytes: number[]): number[] {
    const newBytes = bytes.slice(0);
    const padding = (16 - (bytes.length % 16)) % 16;

    for(let len = bytes.length, i = len; i < len + padding; i++) {
      newBytes.push(0);
    }

    return newBytes;
  }

  private static depad(bytes: number[]): number[] {
    let newBytes = bytes.slice(0);

    while (newBytes[newBytes.length - 1] === 0) {
      newBytes = newBytes.slice(0, newBytes.length - 1);
    }

    return newBytes;
  }

  private static encryptAESCBC(plainText: string, key: number[]): string {
    const exKey = key.slice(0);
    const aes = new AES(exKey);

    const blocks = RSA.pad16(RSA.string2bytes(plainText));
    let encryptedBlocks = RSA.blockIV();

    for (let i = 0, len = blocks.length / 16; i < len; i++) {
      let tempBlock = blocks.slice(i * 16, i * 16 + 16);
      const prevBlock = encryptedBlocks.slice(i * 16, i * 16 + 16);

      tempBlock = RSA.blockXOR(prevBlock, tempBlock);
      aes.encrypt(tempBlock);
      encryptedBlocks = encryptedBlocks.concat(tempBlock);
    }

    const cipherText = RSA.bytes2string(encryptedBlocks);

    return RSA.b256to64(cipherText);
  }

  private static decryptAESCBC(encryptedText: string, key: number[]): string {
    const exKey = key.slice(0);
    const aes = new AES(exKey);

    const encryptedBlocks = RSA.string2bytes(RSA.b64to256(encryptedText));
    let decryptedBlocks = [];

    for (let i = 1, len = encryptedBlocks.length / 16; i < len; i++) {
      let tempBlock = encryptedBlocks.slice(i * 16, i * 16 + 16);
      const prevBlock = encryptedBlocks.slice((i-1) * 16, (i-1) * 16 + 16);

      aes.decrypt(tempBlock);
      tempBlock = RSA.blockXOR(prevBlock, tempBlock);
      decryptedBlocks = decryptedBlocks.concat(tempBlock);
    }

    return RSA.bytes2string(RSA.depad(decryptedBlocks));
  }

  private static generateAESKey(): number[] {
    const key = new Array(32);
    const r = new SeededRandom();

    r.nextBytes(key);

    return key;
  }

  /**
   * @todo: Make Random with Seed(passPhrase)
   */
  public static generateRSAKey(bitLength: number): RSAKey {
    const rsa = new RSAKey();

    rsa.generate(bitLength, '03');

    return rsa;
  }

  public static publicKeyString(rsaKey: RSAKey): string {
    const pubkey = RSA.b16to64(rsaKey.n.toString(16));

    return pubkey;
  }

  public static publicKeyId(publicKeyString: string): string {
    return MD5.hex(publicKeyString);
  }

  private static publicKeyFromString(publicKeyString: string): RSAKey{
    const N = RSA.b64to16(publicKeyString.split('|')[0]);
    const E = '03';
    const rsa = new RSAKey();

    rsa.setPublic(N, E);

    return rsa;
  }

  public static encrypt(plainText: string, publicKeyString: string, signingKey?: RSAKey): string {
    let cipherBlock = '';
    const aesKey = RSA.generateAESKey();

    try {
      const publicKey = RSA.publicKeyFromString(publicKeyString);

      cipherBlock += RSA.b16to64(publicKey.encrypt(RSA.bytes2string(aesKey))) + '?';
    } catch(err) {
      throw new Error('Invalid public key');
    }

    if (signingKey != null) {
      const signString = RSA.b16to64(signingKey.signString(plainText, 'sha256'));

      plainText += '::52cee64bb3a38f6403386519a39ac91c::';
      plainText += RSA.publicKeyString(signingKey);
      plainText += '::52cee64bb3a38f6403386519a39ac91c::';
      plainText += signString;
    }

    cipherBlock += RSA.encryptAESCBC(plainText, aesKey);

    return cipherBlock;
  }

  public static decrypt(encryptedText: string, key: RSAKey): DecryptionResult {
    const cipherBlock = encryptedText.split('?');
    const aesKey = key.decrypt(RSA.b64to16(cipherBlock[0]));

    if (aesKey == null) {
      throw new Error('Failed to decrypt');
    }

    const aesKeyString = RSA.string2bytes(aesKey);
    const plainText = RSA.decryptAESCBC(cipherBlock[1], aesKeyString).split('::52cee64bb3a38f6403386519a39ac91c');

    if (plainText.length === 3) {
      const publicKey = RSA.publicKeyFromString(plainText[1]);
      const signature = RSA.b64to16(plainText[2]);

      if (publicKey.verifyString(plainText[0], signature)) {
        return {
          plainText: plainText[0],
          signature: 'verified',
          publicKey: RSA.publicKeyString(publicKey),
        };
      }

      return {
        plainText: plainText[0],
        signature: 'forged',
        publicKey: RSA.publicKeyString(publicKey),
      };
    }

    return {
      plainText: plainText[0],
      signature: 'unsigned',
    };
  }
}
