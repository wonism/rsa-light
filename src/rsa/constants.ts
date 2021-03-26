import { SHA1, SHA256, MD5 } from '../hash';

export const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export type Alg = 'sha1' | 'sha256' | 'md5';

export const SIGN_DIHEAD: Record<Alg, string> = {
  sha1: '3021300906052b0e03021a05000414',
  sha256: '3031300d060960864801650304020105000420',
  md5: '3020300c06082a864886f70d020505000410',
};

export const SIGN_HASH_FN: Record<Alg, (str: string) => string> = {
  sha1: SHA1.hex,
  sha256: SHA256.hex,
  md5: MD5.hex,
};
