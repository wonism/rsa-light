/*!
 * Original copyright
 * Copyright (c) 2003-2005 Tom Wu
 * All Rights Reserved.
 *
 * Reference http://www-cs-students.stanford.edu/~tjw/jsbn
 */

import { lowprimes, lplim } from './constants/primes';
import { Algorithm, Classic, NullExp, Barrett, Montgomery } from './algorithm';
import { and, or, xor, andNot, cbit, lbit, nbits } from './utils/bits';
import SeededRandom from './utils/seeded-random';
import { intAt, int2char } from './utils/integer';

const nbi = (): BigInteger => new BigInteger(null);

const nbv = (i: number): BigInteger => {
  const r = nbi();

  r.fromInt(i);

  return r;
};

class BigInteger {
  [key: number]: number;

  static get ZERO(): BigInteger {
    return nbv(0);
  }

  static get ONE(): BigInteger {
    return nbv(1);
  }

  public t: number;
  public s: number;
  public DB = 28;
  public DM = 268435455; // (1 << 28) - 1
  public DV = 268435456; // 1 << 28
  protected FV = 4503599627370496; // 2 ^ 52
  protected F1 = 24; // 52 - 28
  protected F2 = 4; // 28 * 2 - 52

  public am = (
    i: number,
    x: number,
    w: BigInteger,
    j: number,
    c: number,
    n: number
  ): number => {
    const xl = x & 0x3fff;
    const xh = x >> 14;

    while (--n >= 0) {
      let l = this[i] & 0x3fff;
      const h = this[i++] >> 14;
      const m = xh * l + h * xl;

      l = xl * l + ((m & 0x3fff) << 14) + w[j] + c;
      c = (l >> 28) + (m >> 14) + xh * h;
      w[j++] = l & 0xfffffff;
    }

    return c;
  };

  public constructor(
    a: string | number | number[] | null,
    b?: number | SeededRandom,
    c?: number | SeededRandom
  ) {
    if (a != null) {
      if (typeof a === 'number') {
        this.fromNumber(a, b!, c);
      } else if (b == null && typeof a !== 'string') {
        this.fromString(a, 256);
      } else {
        this.fromString(a, b as number);
      }
    }
  }

  public copyTo(r: BigInteger): void {
    for (let i = this.t - 1; i >= 0; --i) {
      r[i] = this[i];
    }

    r.t = this.t;
    r.s = this.s;
  }

  public fromInt(x: number): void {
    this.t = 1;
    this.s = x < 0 ? -1 : 0;

    if (x > 0) {
      this[0] = x;
    } else if (x < -1) {
      this[0] = x + this.DV;
    } else {
      this.t = 0;
    }
  }

  protected fromString(s: string | number[], b: number): void {
    let k: number;

    switch (b) {
    case 2:
      k = 1;
      break;
    case 4:
      k = 2;
      break;
    case 8:
      k = 3;
      break;
    case 16:
      k = 4;
      break;
    case 32:
      k = 5;
      break;
    case 256:
      k = 8;
      break;
    default:
      this.fromRadix(s as string, b);

      return;
    }

    this.t = 0;
    this.s = 0;

    let i = s.length;
    let mi = false;
    let sh = 0;

    while (--i >= 0) {
      const x = k === 8 ? (s as number[])[i] & 0xff : intAt(s as string, i);

      if (x < 0) {
        if ((s as string).charAt(i) === '-') {
          mi = true;
        }

        continue;
      }

      mi = false;

      if (sh === 0) {
        this[this.t++] = x;
      } else if (sh + k > this.DB) {
        this[this.t - 1] |= (x & ((1 << (this.DB - sh)) - 1)) << sh;
        this[this.t++] = x >> (this.DB - sh);
      } else {
        this[this.t - 1] |= x << sh;
      }

      sh += k;

      if (sh >= this.DB) {
        sh -= this.DB;
      }
    }

    if (k === 8 && ((s as number[])[0] & 0x80) !== 0) {
      this.s = -1;

      if (sh > 0) {
        this[this.t - 1] |= ((1 << (this.DB - sh)) - 1) << sh;
      }
    }

    this.clamp();

    if (mi) {
      BigInteger.ZERO.subTo(this, this);
    }
  }

  public clamp(): void {
    const c = this.s & this.DM;

    while (this.t > 0 && this[this.t - 1] === c) {
      --this.t;
    }
  }

  public dlShiftTo(n: number, r: BigInteger): void {
    for (let i = this.t - 1; i >= 0; --i) {
      r[i + n] = this[i];
    }

    for (let i = n - 1; i >= 0; --i) {
      r[i] = 0;
    }

    r.t = this.t + n;
    r.s = this.s;
  }

  public drShiftTo(n: number, r: BigInteger): void {
    for (let i = n; i < this.t; ++i) {
      r[i - n] = this[i];
    }

    r.t = Math.max(this.t - n, 0);
    r.s = this.s;
  }

  protected lShiftTo(n: number, r: BigInteger): void {
    const bs = n % this.DB;
    const cbs = this.DB - bs;
    const bm = (1 << cbs) - 1;
    const ds = Math.floor(n / this.DB);
    let c = (this.s << bs) & this.DM;

    for (let i = this.t - 1; i >= 0; --i) {
      r[i + ds + 1] = (this[i] >> cbs) | c;
      c = (this[i] & bm) << bs;
    }

    for (let i = ds - 1; i >= 0; --i) {
      r[i] = 0;
    }

    r[ds] = c;
    r.t = this.t + ds + 1;
    r.s = this.s;

    r.clamp();
  }

  protected rShiftTo(n: number, r: BigInteger): void {
    r.s = this.s;

    const ds = Math.floor(n / this.DB);

    if (ds >= this.t) {
      r.t = 0;

      return;
    }

    const bs = n % this.DB;
    const cbs = this.DB - bs;
    const bm = (1 << bs) - 1;

    r[0] = this[ds] >> bs;

    for (let i = ds + 1; i < this.t; ++i) {
      r[i - ds - 1] |= (this[i] & bm) << cbs;
      r[i - ds] = this[i] >> bs;
    }

    if (bs > 0) {
      r[this.t - ds - 1] |= (this.s & bm) << cbs;
    }

    r.t = this.t - ds;
    r.clamp();
  }

  public subTo(a: BigInteger, r: BigInteger): void {
    let i = 0;
    let c = 0;
    const m = Math.min(a.t, this.t);

    while (i < m) {
      c += this[i] - a[i];
      r[i++] = c & this.DM;
      c >>= this.DB;
    }

    if (a.t < this.t) {
      c -= a.s;

      while (i < this.t) {
        c += this[i];
        r[i++] = c & this.DM;
        c >>= this.DB;
      }

      c += this.s;
    } else {
      c += this.s;

      while (i < a.t) {
        c -= a[i];
        r[i++] = c & this.DM;
        c >>= this.DB;
      }

      c -= a.s;
    }

    r.s = c < 0 ? -1 : 0;

    if (c < -1) {
      r[i++] = this.DV + c;
    } else if (c > 0) {
      r[i++] = c;
    }

    r.t = i;
    r.clamp();
  }

  public multiplyTo(a: BigInteger, r: BigInteger): void {
    const x = this.abs();
    const y = a.abs();
    let i = x.t;

    r.t = i + y.t;

    while (--i >= 0) {
      r[i] = 0;
    }

    for (i = 0; i < y.t; ++i) {
      r[i + x.t] = x.am(0, y[i], r, i, 0, x.t);
    }

    r.s = 0;
    r.clamp();

    if (this.s !== a.s) {
      BigInteger.ZERO.subTo(r, r);
    }
  }

  public squareTo(r: BigInteger): void {
    const x = this.abs();
    let i = (r.t = 2 * x.t);

    while (--i >= 0) {
      r[i] = 0;
    }

    for (i = 0; i < x.t - 1; ++i) {
      const c = x.am(i, x[i], r, 2 * i, 0, 1);

      if (
        (r[i + x.t] += x.am(i + 1, 2 * x[i], r, 2 * i + 1, c, x.t - i - 1)) >=
        x.DV
      ) {
        r[i + x.t] -= x.DV;
        r[i + x.t + 1] = 1;
      }
    }

    if (r.t > 0) {
      r[r.t - 1] += x.am(i, x[i], r, 2 * i, 0, 1);
    }

    r.s = 0;

    r.clamp();
  }

  public divRemTo(
    m: BigInteger,
    q: BigInteger | null,
    r: BigInteger | null
  ): void {
    const pm = m.abs();

    if (pm.t <= 0) {
      return;
    }

    const pt = this.abs();

    if (pt.t < pm.t) {
      if (q !== null) {q.fromInt(0);}
      if (r !== null) {this.copyTo(r);}

      return;
    }

    if (r === null) {
      r = nbi();
    }

    const y = nbi();
    const ts = this.s;
    const ms = m.s;
    const nsh = this.DB - nbits(pm[pm.t - 1]);

    if (nsh > 0) {
      pm.lShiftTo(nsh, y);
      pt.lShiftTo(nsh, r);
    } else {
      pm.copyTo(y);
      pt.copyTo(r);
    }

    const ys = y.t;
    const y0 = y[ys - 1];
    if (y0 === 0) {
      return;
    }

    const yt = y0 * (1 << this.F1) + (ys > 1 ? y[ys - 2] >> this.F2 : 0);
    const d1 = this.FV / yt;
    const d2 = (1 << this.F1) / yt;
    const e = 1 << this.F2;
    let i = r.t;
    let j = i - ys;
    const t = q === null ? nbi() : q;

    y.dlShiftTo(j, t);

    if (r.compareTo(t) >= 0) {
      r[r.t++] = 1;
      r.subTo(t, r);
    }

    BigInteger.ONE.dlShiftTo(ys, t);
    t.subTo(y, y);

    while (y.t < ys) {
      y[y.t++] = 0;
    }

    while (--j >= 0) {
      let qd =
        r[--i] === y0 ? this.DM : Math.floor(r[i] * d1 + (r[i - 1] + e) * d2);

      if ((r[i] += y.am(0, qd, r, j, 0, ys)) < qd) {
        y.dlShiftTo(j, t!);
        r.subTo(t, r);

        while (r[i] < --qd) {
          r.subTo(t, r);
        }
      }
    }

    if (q !== null) {
      r.drShiftTo(ys, q);

      if (ts !== ms) {
        BigInteger.ZERO.subTo(q, q);
      }
    }

    r.t = ys;
    r.clamp();

    if (nsh > 0) {
      r.rShiftTo(nsh, r);
    }

    if (ts < 0) {
      BigInteger.ZERO.subTo(r, r);
    }
  }

  public invDigit(): number {
    if (this.t < 1) {
      return 0;
    }

    const x = this[0];

    if ((x & 1) === 0) {
      return 0;
    }

    let y = x & 3;
    y = (y * (2 - (x & 0xf) * y)) & 0xf;
    y = (y * (2 - (x & 0xff) * y)) & 0xff;
    y = (y * (2 - (((x & 0xffff) * y) & 0xffff))) & 0xffff;

    y = (y * (2 - ((x * y) % this.DV))) % this.DV;

    if (y > 0) {
      return this.DV - y;
    }

    return -y;
  }

  protected isEven(): boolean {
    return (this.t > 0 ? this[0] & 1 : this.s) === 0;
  }

  protected exp(e: number, z: Algorithm): BigInteger {
    if (e > 0xffffffff || e < 1) {
      return BigInteger.ONE;
    }

    let r = nbi();
    let r2 = nbi();
    const g = z.convert(this);
    let i = nbits(e) - 1;

    g.copyTo(r);

    while (--i >= 0) {
      z.sqrTo(r, r2);

      if ((e & (1 << i)) > 0) {
        z.mulTo(r2, g, r);
      } else {
        const t = r;
        r = r2;
        r2 = t;
      }
    }

    return z.revert(r);
  }

  protected chunkSize(r: number): number {
    return Math.floor((Math.LN2 * this.DB) / Math.log(r));
  }

  protected toRadix(b: number): string {
    if (b === null) {
      b = 10;
    }

    if (this.sigNum() === 0 || b < 2 || b > 36) {
      return '0';
    }

    const cs = this.chunkSize(b);
    const a = Math.pow(b, cs);
    const d = nbv(a);
    const y = nbi();
    const z = nbi();
    let r = '';

    this.divRemTo(d, y, z);

    while (y.sigNum() > 0) {
      r = (a + z.intValue()).toString(b).substr(1) + r;
      y.divRemTo(d, y, z);
    }

    return z.intValue().toString(b) + r;
  }

  protected fromRadix(s: string, b: number): void {
    this.fromInt(0);

    if (b === null) {
      b = 10;
    }

    const cs = this.chunkSize(b);
    const d = Math.pow(b, cs);
    let mi = false;
    let j = 0;
    let w = 0;

    for (let i = 0; i < s.length; ++i) {
      const x = intAt(s, i);

      if (x < 0) {
        if (s.charAt(i) === '-' && this.sigNum() === 0) {
          mi = true;
        }

        continue;
      }

      w = b * w + x;

      if (++j >= cs) {
        this.dMultiply(d);
        this.dAddOffset(w, 0);

        j = 0;
        w = 0;
      }
    }

    if (j > 0) {
      this.dMultiply(Math.pow(b, j));
      this.dAddOffset(w, 0);
    }

    if (mi) {
      BigInteger.ZERO.subTo(this, this);
    }
  }

  protected fromNumber(
    a: number,
    b: number | SeededRandom,
    c?: number | SeededRandom
  ): void {
    if (typeof b === 'number') {
      if (a < 2) {
        this.fromInt(1);
      } else {
        this.fromNumber(a, c);

        if (!this.testBit(a - 1)) {
          this.bitwiseTo(BigInteger.ONE.shiftLeft(a - 1), or, this);
        }

        if (this.isEven()) {
          this.dAddOffset(1, 0);
        }

        while (!this.isProbablePrime(b)) {
          this.dAddOffset(2, 0);

          if (this.bitLength() > a) {
            this.subTo(BigInteger.ONE.shiftLeft(a - 1), this);
          }
        }
      }
    } else {
      const x: number[] = [];
      const t = a & 7;
      x.length = (a >> 3) + 1;

      b.nextBytes(x);

      if (t > 0) {
        x[0] &= (1 << t) - 1;
      } else {
        x[0] = 0;
      }

      this.fromString(x, 256);
    }
  }

  protected bitwiseTo(
    a: BigInteger,
    op: (x: number, y: number) => number,
    r: BigInteger
  ): void {
    let f: number;
    const m = Math.min(a.t, this.t);

    for (let i = 0; i < m; ++i) {
      r[i] = op(this[i], a[i]);
    }

    if (a.t < this.t) {
      f = a.s & this.DM;

      for (let i = m; i < this.t; ++i) {
        r[i] = op(this[i], f);
      }

      r.t = this.t;
    } else {
      f = this.s & this.DM;

      for (let i = m; i < a.t; ++i) {
        r[i] = op(f, a[i]);
      }

      r.t = a.t;
    }

    r.s = op(this.s, a.s);
    r.clamp();
  }

  protected changeBit(
    n: number,
    op: (x: number, y: number) => number
  ): BigInteger {
    const r = BigInteger.ONE.shiftLeft(n);

    this.bitwiseTo(r, op, r);

    return r;
  }

  protected addTo(a: BigInteger, r: BigInteger): void {
    let i = 0;
    let c = 0;
    const m = Math.min(a.t, this.t);

    while (i < m) {
      c += this[i] + a[i];
      r[i++] = c & this.DM;
      c >>= this.DB;
    }

    if (a.t < this.t) {
      c += a.s;

      while (i < this.t) {
        c += this[i];
        r[i++] = c & this.DM;
        c >>= this.DB;
      }

      c += this.s;
    } else {
      c += this.s;

      while (i < a.t) {
        c += a[i];
        r[i++] = c & this.DM;
        c >>= this.DB;
      }

      c += a.s;
    }
    r.s = c < 0 ? -1 : 0;

    if (c > 0) {
      r[i++] = c;
    } else if (c < -1) {
      r[i++] = this.DV + c;
    }

    r.t = i;
    r.clamp();
  }

  protected dMultiply(n: number): void {
    this[this.t] = this.am(0, n - 1, this, 0, 0, this.t);
    ++this.t;

    this.clamp();
  }

  public dAddOffset(n: number, w: number): void {
    if (n === 0) {
      return;
    }

    while (this.t <= w) {
      this[this.t++] = 0;
    }

    this[w] += n;

    while (this[w] >= this.DV) {
      this[w] -= this.DV;

      if (++w >= this.t) {
        this[this.t++] = 0;
      }

      ++this[w];
    }
  }

  public multiplyLowerTo(a: BigInteger, n: number, r: BigInteger): void {
    let i = Math.min(this.t + a.t, n);

    r.s = 0;
    r.t = i;

    while (i > 0) {
      r[--i] = 0;
    }

    for (let j = r.t - this.t; i < j; ++i) {
      r[i + this.t] = this.am(0, a[i], r, i, 0, this.t);
    }

    for (let j = Math.min(a.t, n); i < j; ++i) {
      this.am(0, a[i], r, i, 0, n - i);
    }

    r.clamp();
  }

  public multiplyUpperTo(a: BigInteger, n: number, r: BigInteger): void {
    --n;

    let i = (r.t = this.t + a.t - n);
    r.s = 0;

    while (--i >= 0) {
      r[i] = 0;
    }

    for (i = Math.max(n - this.t, 0); i < a.t; ++i) {
      r[this.t + i - n] = this.am(n - i, a[i], r, 0, 0, this.t + i - n);
    }

    r.clamp();
    r.drShiftTo(1, r);
  }

  protected modInt(n: number): number {
    if (n <= 0) {
      return 0;
    }

    const d = this.DV % n;
    let r = this.s < 0 ? n - 1 : 0;

    if (this.t > 0) {
      if (d === 0) {
        r = this[0] % n;
      } else {
        for (let i = this.t - 1; i >= 0; --i) {
          r = (d * r + this[i]) % n;
        }
      }
    }

    return r;
  }

  protected millerRabin(t: number): boolean {
    const n1 = this.subtract(BigInteger.ONE);
    const k = n1.getLowestSetBit();

    if (k <= 0) {
      return false;
    }

    const r = n1.shiftRight(k);

    t = (t + 1) >> 1;

    if (t > lowprimes.length) {
      t = lowprimes.length;
    }

    const a = nbi();

    for (let i = 0; i < t; ++i) {
      a.fromInt(lowprimes[Math.floor(Math.random() * lowprimes.length)]);

      let y = a.modPow(r, this);

      if (y.compareTo(BigInteger.ONE) !== 0 && y.compareTo(n1) !== 0) {
        let j = 1;

        while (j++ < k && y.compareTo(n1) !== 0) {
          y = y.modPowInt(2, this);

          if (y.compareTo(BigInteger.ONE) === 0) {
            return false;
          }
        }

        if (y.compareTo(n1) !== 0) {
          return false;
        }
      }
    }

    return true;
  }

  public toString(b: number): string {
    if (this.s < 0) {
      return '-' + this.negate().toString(b);
    }

    let k: number;

    switch (b) {
    case 2:
      k = 1;
      break;
    case 4:
      k = 2;
      break;
    case 8:
      k = 3;
      break;
    case 16:
      k = 4;
      break;
    case 32:
      k = 5;
      break;
    default:
      return this.toRadix(b);
    }

    const km = (1 << k) - 1;
    let d: number;
    let m = false;
    let r = '';
    let i = this.t;
    let p = this.DB - ((i * this.DB) % k);

    if (i-- > 0) {
      if (p < this.DB && (d = this[i] >> p) > 0) {
        m = true;
        r = int2char(d);
      }

      while (i >= 0) {
        if (p < k) {
          d = (this[i] & ((1 << p) - 1)) << (k - p);
          d |= this[--i] >> (p += this.DB - k);
        } else {
          d = (this[i] >> (p -= k)) & km;

          if (p <= 0) {
            p += this.DB;
            --i;
          }
        }

        if (d > 0) {
          m = true;
        }

        if (m) {
          r += int2char(d);
        }
      }
    }

    return m ? r : '0';
  }

  public negate(): BigInteger {
    const r = nbi();

    BigInteger.ZERO.subTo(this, r);

    return r;
  }

  public abs(): BigInteger {
    return this.s < 0 ? this.negate() : this;
  }

  public compareTo(a: BigInteger): number {
    let r = this.s - a.s;

    if (r !== 0) {
      return r;
    }

    let i = this.t;
    r = i - a.t;

    if (r !== 0) {
      return this.s < 0 ? -r : r;
    }

    while (--i >= 0) {
      if ((r = this[i] - a[i]) !== 0) {
        return r;
      }
    }

    return 0;
  }

  public bitLength(): number {
    if (this.t <= 0) {
      return 0;
    }

    return (
      this.DB * (this.t - 1) + nbits(this[this.t - 1] ^ (this.s & this.DM))
    );
  }

  public mod(a: BigInteger): BigInteger {
    const r = nbi();

    this.abs().divRemTo(a, null, r);

    if (this.s < 0 && r.compareTo(BigInteger.ZERO) > 0) {
      a.subTo(r, r);
    }

    return r;
  }

  public modPowInt(e: number, m: BigInteger): BigInteger {
    let z: Algorithm;

    if (e < 256 || m.isEven()) {
      z = new Classic(m);
    } else {
      z = new Montgomery(m);
    }

    return this.exp(e, z);
  }

  public clone(): BigInteger {
    const r = nbi();

    this.copyTo(r);

    return r;
  }

  public intValue(): number {
    if (this.s < 0) {
      if (this.t === 1) {
        return this[0] - this.DV;
      } else if (this.t === 0) {
        return -1;
      }
    } else if (this.t === 1) {
      return this[0];
    } else if (this.t === 0) {
      return 0;
    }

    return ((this[1] & ((1 << (32 - this.DB)) - 1)) << this.DB) | this[0];
  }

  public byteValue(): number {
    return this.t === 0 ? this.s : (this[0] << 24) >> 24;
  }

  public shortValue(): number {
    return this.t === 0 ? this.s : (this[0] << 16) >> 16;
  }

  public sigNum(): number {
    if (this.s < 0) {
      return -1;
    } else if (this.t <= 0 || (this.t === 1 && this[0] <= 0)) {
      return 0;
    }

    return 1;

  }

  public toByteArray(): number[] {
    let i = this.t;
    const r: number[] = [];

    r[0] = this.s;

    let p = this.DB - ((i * this.DB) % 8);
    let d: number;
    let k = 0;

    if (i-- > 0) {
      if (p < this.DB && (d = this[i] >> p) !== (this.s & this.DM) >> p) {
        r[k++] = d | (this.s << (this.DB - p));
      }

      while (i >= 0) {
        if (p < 8) {
          d = (this[i] & ((1 << p) - 1)) << (8 - p);
          d |= this[--i] >> (p += this.DB - 8);
        } else {
          d = (this[i] >> (p -= 8)) & 0xff;

          if (p <= 0) {
            p += this.DB;
            --i;
          }
        }

        if ((d & 0x80) !== 0) {
          d |= -256;
        }

        if (k === 0 && (this.s & 0x80) !== (d & 0x80)) {
          ++k;
        }

        if (k > 0 || d !== this.s) {
          r[k++] = d;
        }
      }
    }

    return r;
  }

  public equals(a: BigInteger): boolean {
    return this.compareTo(a) === 0;
  }

  public min(a: BigInteger): BigInteger {
    return this.compareTo(a) < 0 ? this : a;
  }

  public max(a: BigInteger): BigInteger {
    return this.compareTo(a) > 0 ? this : a;
  }

  public and(a: BigInteger): BigInteger {
    const r = nbi();

    this.bitwiseTo(a, and, r);

    return r;
  }

  public or(a: BigInteger): BigInteger {
    const r = nbi();

    this.bitwiseTo(a, or, r);

    return r;
  }

  public xor(a: BigInteger): BigInteger {
    const r = nbi();

    this.bitwiseTo(a, xor, r);

    return r;
  }

  public andNot(a: BigInteger): BigInteger {
    const r = nbi();

    this.bitwiseTo(a, andNot, r);

    return r;
  }

  public not(): BigInteger {
    const r = nbi();

    for (let i = 0; i < this.t; ++i) {
      r[i] = this.DM & ~this[i];
    }

    r.t = this.t;
    r.s = ~this.s;

    return r;
  }

  public shiftLeft(n: number): BigInteger {
    const r = nbi();

    if (n < 0) {
      this.rShiftTo(-n, r);
    } else {
      this.lShiftTo(n, r);
    }

    return r;
  }

  public shiftRight(n: number): BigInteger {
    const r = nbi();

    if (n < 0) {
      this.lShiftTo(-n, r);
    } else {
      this.rShiftTo(n, r);
    }

    return r;
  }

  public getLowestSetBit(): number {
    for (let i = 0; i < this.t; ++i) {
      if (this[i] !== 0) {
        return i * this.DB + lbit(this[i]);
      }
    }

    if (this.s < 0) {
      return this.t * this.DB;
    }

    return -1;
  }

  public bitCount(): number {
    let r = 0;
    const x = this.s & this.DM;

    for (let i = 0; i < this.t; ++i) {
      r += cbit(this[i] ^ x);
    }

    return r;
  }

  public testBit(n: number): boolean {
    const j = Math.floor(n / this.DB);

    if (j >= this.t) {
      return this.s !== 0;
    }

    return (this[j] & (1 << n % this.DB)) !== 0;
  }

  public setBit(n: number): BigInteger {
    return this.changeBit(n, or);
  }

  public clearBit(n: number): BigInteger {
    return this.changeBit(n, andNot);
  }

  public flipBit(n: number): BigInteger {
    return this.changeBit(n, xor);
  }

  public add(a: BigInteger): BigInteger {
    const r = nbi();

    this.addTo(a, r);

    return r;
  }

  public subtract(a: BigInteger): BigInteger {
    const r = nbi();

    this.subTo(a, r);

    return r;
  }

  public multiply(a: BigInteger): BigInteger {
    const r = nbi();

    this.multiplyTo(a, r);

    return r;
  }

  public square(): BigInteger {
    const r = nbi();

    this.squareTo(r);

    return r;
  }

  public divide(a: BigInteger): BigInteger {
    const r = nbi();

    this.divRemTo(a, r, null);

    return r;
  }

  public remainder(a: BigInteger): BigInteger {
    const r = nbi();

    this.divRemTo(a, null, r);

    return r;
  }

  public divideAndRemainder(a: BigInteger): Array<BigInteger> {
    const q = nbi();
    const r = nbi();

    this.divRemTo(a, q, r);

    return [q, r];
  }

  public modPow(e: BigInteger, m: BigInteger): BigInteger {
    let i = e.bitLength();
    let k: number;
    let r = nbv(1);
    let z: Algorithm;

    if (i <= 0) {
      return r;
    } else if (i < 18) {
      k = 1;
    } else if (i < 48) {
      k = 3;
    } else if (i < 144) {
      k = 4;
    } else if (i < 768) {
      k = 5;
    } else {
      k = 6;
    }

    if (i < 8) {
      z = new Classic(m);
    } else if (m.isEven()) {
      z = new Barrett(m);
    } else {
      z = new Montgomery(m);
    }

    const g: BigInteger[] = [];
    let n = 3;
    const k1 = k - 1;
    const km = (1 << k) - 1;

    g[1] = z.convert(this);

    if (k > 1) {
      const g2 = nbi();

      z.sqrTo(g[1], g2);

      while (n <= km) {
        g[n] = nbi();
        z.mulTo(g2, g[n - 2], g[n]);
        n += 2;
      }
    }

    let j = e.t - 1;
    let w: number;
    let is1 = true;
    let r2 = nbi();
    let t: BigInteger;

    i = nbits(e[j]) - 1;

    while (j >= 0) {
      if (i >= k1) {
        w = (e[j] >> (i - k1)) & km;
      } else {
        w = (e[j] & ((1 << (i + 1)) - 1)) << (k1 - i);

        if (j > 0) {
          w |= e[j - 1] >> (this.DB + i - k1);
        }
      }

      n = k;

      while ((w & 1) === 0) {
        w >>= 1;
        --n;
      }

      if ((i -= n) < 0) {
        i += this.DB;
        --j;
      }

      if (is1) {
        g[w].copyTo(r);
        is1 = false;
      } else {
        while (n > 1) {
          z.sqrTo(r, r2);
          z.sqrTo(r2, r);

          n -= 2;
        }

        if (n > 0) {
          z.sqrTo(r, r2);
        } else {
          t = r;
          r = r2;
          r2 = t;
        }

        z.mulTo(r2, g[w], r);
      }

      while (j >= 0 && (e[j] & (1 << i)) === 0) {
        z.sqrTo(r, r2);

        t = r;
        r = r2;
        r2 = t;

        if (--i < 0) {
          i = this.DB - 1;
          --j;
        }
      }
    }

    return z.revert(r);
  }

  public modInverse(m: BigInteger): BigInteger {
    const ac = m.isEven();

    if ((this.isEven() && ac) || m.sigNum() === 0) {
      return BigInteger.ZERO;
    }

    const u = m.clone();
    const v = this.clone();
    const a = nbv(1);
    const b = nbv(0);
    const c = nbv(0);
    const d = nbv(1);

    while (u.sigNum() !== 0) {
      while (u.isEven()) {
        u.rShiftTo(1, u);

        if (ac) {
          if (!a.isEven() || !b.isEven()) {
            a.addTo(this, a);
            b.subTo(m, b);
          }

          a.rShiftTo(1, a);
        } else if (!b.isEven()) {
          b.subTo(m, b);
        }

        b.rShiftTo(1, b);
      }
      while (v.isEven()) {
        v.rShiftTo(1, v);

        if (ac) {
          if (!c.isEven() || !d.isEven()) {
            c.addTo(this, c);
            d.subTo(m, d);
          }

          c.rShiftTo(1, c);
        } else if (!d.isEven()) {
          d.subTo(m, d);
        }

        d.rShiftTo(1, d);
      }

      if (u.compareTo(v) >= 0) {
        u.subTo(v, u);

        if (ac) {
          a.subTo(c, a);
        }

        b.subTo(d, b);
      } else {
        v.subTo(u, v);

        if (ac) {
          c.subTo(a, c);
        }

        d.subTo(b, d);
      }
    }

    if (v.compareTo(BigInteger.ONE) !== 0) {
      return BigInteger.ZERO;
    }

    if (d.compareTo(m) >= 0) {
      return d.subtract(m);
    }

    if (d.sigNum() < 0) {
      d.addTo(m, d);
    } else {
      return d;
    }

    if (d.sigNum() < 0) {
      return d.add(m);
    }

    return d;

  }

  public pow(e: number): BigInteger {
    return this.exp(e, new NullExp());
  }

  public gcd(a: BigInteger): BigInteger {
    let x = this.s < 0 ? this.negate() : this.clone();
    let y = a.s < 0 ? a.negate() : a.clone();

    if (x.compareTo(y) < 0) {
      const t = x;
      x = y;
      y = t;
    }

    let i = x.getLowestSetBit();
    let g = y.getLowestSetBit();

    if (g < 0) {
      return x;
    }

    if (i < g) {
      g = i;
    }

    if (g > 0) {
      x.rShiftTo(g, x);
      y.rShiftTo(g, y);
    }

    while (x.sigNum() > 0) {
      if ((i = x.getLowestSetBit()) > 0) {
        x.rShiftTo(i, x);
      }

      if ((i = y.getLowestSetBit()) > 0) {
        y.rShiftTo(i, y);
      }

      if (x.compareTo(y) >= 0) {
        x.subTo(y, x);
        x.rShiftTo(1, x);
      } else {
        y.subTo(x, y);
        y.rShiftTo(1, y);
      }
    }

    if (g > 0) {
      y.lShiftTo(g, y);
    }

    return y;
  }

  public isProbablePrime(t: number): boolean {
    const x = this.abs();
    let i: number;

    if (x.t === 1 && x[0] <= lowprimes[lowprimes.length - 1]) {
      for (i = 0; i < lowprimes.length; ++i)
      {if (x[0] === lowprimes[i]) {
        return true;
      }}

      return false;
    }

    if (x.isEven()) {
      return false;
    }

    i = 1;

    while (i < lowprimes.length) {
      let m = lowprimes[i];
      let j = i + 1;

      while (j < lowprimes.length && m < lplim) {
        m *= lowprimes[j++];
      }

      m = x.modInt(m);

      while (i < j) {
        if (m % lowprimes[i++] === 0) {
          return false;
        }
      }
    }

    return x.millerRabin(t);
  }
}

export default BigInteger;
