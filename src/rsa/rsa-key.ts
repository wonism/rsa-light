import { Alg, SIGN_DIHEAD, SIGN_HASH_FN } from './constants';
import { parseBigInt, pkcs1pad2, pkcs1unpad2 } from './utils';
import BigInteger from '../big-integer';
import SeededRandom from '../big-integer/utils/seeded-random';

export default class RSAKey {
  n = null;
  e = 0;
  d = null;
  p = null;
  q = null;
  dmp1 = null;
  dmq1 = null;
  coeff = null;

  public setPublic(N: string, E: string): void {
    if (N != null && E != null && N.length > 0 && E.length > 0) {
      this.n = parseBigInt(N, 16);
      this.e = parseInt(E, 16);
    } else {
      throw new Error('Invalid RSA public key');
    }
  }

  protected doPublic(x: BigInteger): BigInteger {
    return x.modPowInt(this.e, this.n);
  }

  protected doPrivate(x: BigInteger): BigInteger {
    if (this.p == null || this.q == null) {
      return x.modPow(this.d, this.n);
    }

    let xp = x.mod(this.p).modPow(this.dmp1, this.p);
    const xq = x.mod(this.q).modPow(this.dmq1, this.q);

    while (xp.compareTo(xq) < 0) {
      xp = xp.add(this.p);
    }

    return xp.subtract(xq).multiply(this.coeff).mod(this.p).multiply(this.q).add(xq);
  }

  public encrypt(text: string): string {
    const m = pkcs1pad2(text, (this.n.bitLength() + 7) >> 3);

    if (m == null) {
      return null;
    }

    const c = this.doPublic(m);

    if (c == null) {
      return null;
    }

    const h = c.toString(16);

    if ((h.length & 1) === 0) {
      return h;
    }

    return `0${h}`;
  }

  public setPrivate(N: string, E: string, D: string): void {
    if (N != null && E != null && N.length > 0 && E.length > 0) {
      this.n = parseBigInt(N, 16);
      this.e = parseInt(E, 16);
      this.d = parseBigInt(D, 16);
    } else {
      throw new Error('Invalid RSA Private Key');
    }
  }

  public setPrivateEx(N: string, E: string, D: string, P: string, Q: string, DP: string, DQ: string, C: string): void {
    if (N != null && E != null && N.length > 0 && E.length > 0) {
      this.n = parseBigInt(N, 16);
      this.e = parseInt(E, 16);
      this.d = parseBigInt(D, 16);
      this.p = parseBigInt(P, 16);
      this.q = parseBigInt(Q, 16);
      this.dmp1 = parseBigInt(DP, 16);
      this.dmq1 = parseBigInt(DQ, 16);
      this.coeff = parseBigInt(C, 16);
    } else {
      throw new Error('Invalid RSA Private Key');
    }
  }

  public generate(B: number, E: string): void {
    const rng = new SeededRandom();
    const qs = B >> 1;

    this.e = parseInt(E, 16);
    const ee = new BigInteger(E, 16);

    for (;;) {
      for (;;) {
        this.p = new BigInteger(B - qs, 1, rng);

        if (this.p.subtract(BigInteger.ONE).gcd(ee).compareTo(BigInteger.ONE) === 0 && this.p.isProbablePrime(10)) {
          break;
        }
      }

      for (;;) {
        this.q = new BigInteger(qs, 1, rng);

        if (this.q.subtract(BigInteger.ONE).gcd(ee).compareTo(BigInteger.ONE) === 0 && this.q.isProbablePrime(10)) {
          break;
        }
      }

      if (this.p.compareTo(this.q) <= 0) {
        const t = this.p;

        this.p = this.q;
        this.q = t;
      }

      const p1 = this.p.subtract(BigInteger.ONE);
      const q1 = this.q.subtract(BigInteger.ONE);
      const phi = p1.multiply(q1);

      if (phi.gcd(ee).compareTo(BigInteger.ONE) === 0) {
        this.n = this.p.multiply(this.q);
        this.d = ee.modInverse(phi);
        this.dmp1 = this.d.mod(p1);
        this.dmq1 = this.d.mod(q1);
        this.coeff = this.q.modInverse(this.p);

        break;
      }
    }
  }

  public decrypt(ctext: string): string {
    const c = parseBigInt(ctext, 16);
    const m = this.doPrivate(c);

    if (m == null) {
      return null;
    }

    return pkcs1unpad2(m, (this.n.bitLength() + 7) >> 3);
  }

  protected getHexPaddedDigestInfoForString(s: string, keySize: number, hashAlg: Alg): string {
    const pmStrLen = keySize / 4;
    const hashFunc = SIGN_HASH_FN[hashAlg];
    const sHashHex = hashFunc(s);

    const sHead = '0001';
    const sTail = `00${SIGN_DIHEAD[hashAlg]}${sHashHex}`;
    let sMid = '';

    const fLen = pmStrLen - sHead.length - sTail.length;

    for (let i = 0; i < fLen; i += 2) {
      sMid += 'ff';
    }

    return sHead + sMid + sTail;
  }

  public signString(s: string, hashAlg: Alg = 'sha256'): string {
    const hPM = this.getHexPaddedDigestInfoForString(s, this.n.bitLength(), hashAlg);
    const biPaddedMessage = parseBigInt(hPM, 16);
    const biSign = this.doPrivate(biPaddedMessage);
    const hexSign = biSign.toString(16);

    return hexSign;
  }

  protected getAlgNameAndHashFromHexDisgestInfo(hDigestInfo: string): [Alg, string] | [] {
    for (const algName in SIGN_DIHEAD) {
      const head = SIGN_DIHEAD[algName];
      const len = head.length;

      if (hDigestInfo.substring(0, len) === head) {
        const a = [algName, hDigestInfo.substring(len)];

        return a as [Alg, string];
      }
    }

    return [];
  }

  public verifyString(sMsg: string, hSig: string): boolean {
    const biSig = parseBigInt(hSig.replace(/[ \n]+/g, ''), 16);
    const biDecryptedSig = this.doPublic(biSig);
    const hDigestInfo = biDecryptedSig.toString(16).replace(/^1f+00/, '');
    const digestInfoAry = this.getAlgNameAndHashFromHexDisgestInfo(hDigestInfo);

    if (digestInfoAry.length === 0) {
      return false;
    }

    const algName = digestInfoAry[0];
    const diHashValue = digestInfoAry[1];
    const ff = SIGN_HASH_FN[algName];
    const msgHashValue = ff(sMsg);

    return diHashValue === msgHashValue;
  }

  protected getDecryptSignatureBI(biSig: BigInteger, hN: string, hE: string): BigInteger {
    const rsa = new RSAKey();

    rsa.setPublic(hN, hE);

    const biDecryptedSig = rsa.doPublic(biSig);

    return biDecryptedSig;
  }

  protected getHexDigestInfoFromSig(biSig: BigInteger, hN: string, hE: string): string {
    const biDecryptedSig = this.getDecryptSignatureBI(biSig, hN, hE);
    const hDigestInfo = biDecryptedSig.toString(16).replace(/^1f+00/, '');

    return hDigestInfo;
  }

  protected verifySignatureWithArgs(sMsg: string, biSig: BigInteger, hN: string, hE: string): boolean {
    const hDigestInfo = this.getHexDigestInfoFromSig(biSig, hN, hE);
    const digestInfoAry = this.getAlgNameAndHashFromHexDisgestInfo(hDigestInfo);

    if (digestInfoAry.length === 0) {
      return false;
    }

    const algName = digestInfoAry[0];
    const diHashValue = digestInfoAry[1];
    const ff = SIGN_HASH_FN[algName];
    const msgHashValue = ff(sMsg);

    return diHashValue === msgHashValue;
  }

  public verifyHexSignatureForMessage(hSig: string, sMsg: string): boolean{
    const biSig = parseBigInt(hSig, 16);
    const result = this.verifySignatureWithArgs(sMsg, biSig, this.n.toString(16), this.e.toString(16));

    return result;
  }
}
