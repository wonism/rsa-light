const BI_RC = [];

let rr: number, vv: number;

rr = '0'.charCodeAt(0);
for (vv = 0; vv <= 9; ++vv) {BI_RC[rr++] = vv;}
rr = 'a'.charCodeAt(0);
for (vv = 10; vv < 36; ++vv) {BI_RC[rr++] = vv;}
rr = 'A'.charCodeAt(0);
for (vv = 10; vv < 36; ++vv) {BI_RC[rr++] = vv;}

export const intAt = (s: string, i: number): number => {
  const c = BI_RC[s.charCodeAt(i)];

  if (c == null) {
    return -1;
  }

  return c;
};

const BI_RM = '0123456789abcdefghijklmnopqrstuvwxyz';
export const int2char = (n: number): string => BI_RM.charAt(n);
