export const rotateLeft = (n: number, s: number): number => (n << s) | (n >>> (32 - s));

export const safeAdd = (x: number, y: number): number => {
  const lsw = (x & 0xFFFF) + (y & 0xFFFF);
  const msw = (x >> 16) + (y >> 16) + (lsw >> 16);

  return (msw << 16) | (lsw & 0xFFFF);
}

export const encodeUtf8 = (str: string): string => {
  const replacedStr = str.replace(/\r\n/g, '\n');
  let utfText = '';

  for (let i = 0, len = replacedStr.length; i < len; i++) {
    const c = str.charCodeAt(i);

    if (c < 128) {
      utfText += String.fromCharCode(c);
    } else if((c > 127) && (c < 2048)) {
      utfText += String.fromCharCode((c >> 6) | 192);
      utfText += String.fromCharCode((c & 63) | 128);
    } else {
      utfText += String.fromCharCode((c >> 12) | 224);
      utfText += String.fromCharCode(((c >> 6) & 63) | 128);
      utfText += String.fromCharCode((c & 63) | 128);
    }
  }

  return utfText;
}

export const str2binb = (str: string, chrsz: number): number[] => {
  const bin = [];
  const mask = (1 << chrsz) - 1;

  for(let i = 0, len = str.length * chrsz; i < len; i += chrsz) {
    bin[i >> 5] |= (str.charCodeAt(i / chrsz) & mask) << (24 - i % 32);
  }

  return bin;
};

export const binb2hex = (binarray: number[]): string => {
  const hexTab = '0123456789abcdef';
  let str = '';

  for(let i = 0, len = binarray.length; i < len * 4; i++) {
    str += hexTab.charAt((binarray[i >> 2] >> ((3 - i % 4) * 8 + 4)) & 0xF) + hexTab.charAt((binarray[i >> 2] >> ((3 - i % 4) *8)) & 0xF);
  }

  return str;
}

export const addUnsigned = (lX: number, lY: number): number => {
  const lX8 = (lX & 0x80000000);
  const lY8 = (lY & 0x80000000);
  const lX4 = (lX & 0x40000000);
  const lY4 = (lY & 0x40000000);

  const lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);

  if (lX4 & lY4) {
    return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
  }

  if (lX4 | lY4) {
    if (lResult & 0x40000000) {
      return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
    }

    return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
  }

  return (lResult ^ lX8 ^ lY8);
}

export const convertToWordArray = (str: string): number[] => {
  let lWordCount: number;

  const lMessageLength = str.length;
  const lNumberOfWordsTemp1 = lMessageLength + 8;
  const lNumberOfWordsTemp2 = (lNumberOfWordsTemp1 - (lNumberOfWordsTemp1 % 64)) / 64;
  const lNumberOfWords = (lNumberOfWordsTemp2 + 1) * 16;
  const lWordArray = Array(lNumberOfWords - 1);
  let lBytePosition = 0;
  let lByteCount = 0;

  while ( lByteCount < lMessageLength ) {
    lWordCount = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordArray[lWordCount] = (lWordArray[lWordCount] | (str.charCodeAt(lByteCount) << lBytePosition));
    lByteCount++;
  }

  lWordCount = (lByteCount-(lByteCount % 4)) /4;
  lBytePosition = (lByteCount % 4) * 8;
  lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
  lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
  lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;

  return lWordArray;
};

export const wordToHex = (lValue: number): string => {
  let WordToHexValue = '';
  let WordToHexValueTemp = '';
  let lByte: number;

  for (let lCount = 0; lCount <= 3; lCount++) {
    lByte = (lValue >>> (lCount * 8)) & 255;
    WordToHexValueTemp = '0' + lByte.toString(16);
    WordToHexValue = WordToHexValue + WordToHexValueTemp.substr(WordToHexValueTemp.length - 2, 2);
  }

  return WordToHexValue;
};
