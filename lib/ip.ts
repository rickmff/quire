type V4 = [number, number, number, number];

const V4_BLOCKED: [V4, number][] = [
  [[0, 0, 0, 0], 8],
  [[10, 0, 0, 0], 8],
  [[100, 64, 0, 0], 10],
  [[127, 0, 0, 0], 8],
  [[169, 254, 0, 0], 16],
  [[172, 16, 0, 0], 12],
  [[192, 0, 0, 0], 24],
  [[192, 0, 2, 0], 24],
  [[192, 88, 99, 0], 24],
  [[192, 168, 0, 0], 16],
  [[198, 18, 0, 0], 15],
  [[198, 51, 100, 0], 24],
  [[203, 0, 113, 0], 24],
  [[224, 0, 0, 0], 3],
];

export function parseV4(ip: string): V4 | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const octets = parts.map((p) => (/^\d{1,3}$/.test(p) ? Number(p) : NaN));
  return octets.every((o) => o >= 0 && o <= 255) ? (octets as V4) : null;
}

const v4ToNumber = (o: V4) => ((o[0] << 24) | (o[1] << 16) | (o[2] << 8) | o[3]) >>> 0;

function inV4Block(ip: V4, [base, bits]: [V4, number]) {
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (v4ToNumber(ip) & mask) >>> 0 === (v4ToNumber(base) & mask) >>> 0;
}

export function isBlockedV4(ip: V4) {
  return V4_BLOCKED.some((block) => inV4Block(ip, block));
}

export function parseV6(input: string): number[] | null {
  let ip = input.toLowerCase().replace(/^\[|\]$/g, "");
  const zone = ip.indexOf("%");
  if (zone !== -1) ip = ip.slice(0, zone);
  const dotted = ip.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) {
    const v4 = parseV4(dotted[2]);
    if (!v4) return null;
    ip = `${dotted[1]}${((v4[0] << 8) | v4[1]).toString(16)}:${((v4[2] << 8) | v4[3]).toString(16)}`;
  }
  const halves = ip.split("::");
  if (halves.length > 2) return null;
  const groups = (s: string) => (s ? s.split(":") : []);
  const head = groups(halves[0]);
  const tail = halves.length === 2 ? groups(halves[1]) : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
  const all = [...head, ...Array(halves.length === 2 ? missing : 0).fill("0"), ...tail];
  if (all.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
  return all.map((g) => parseInt(g, 16));
}

const embeddedV4 = (hi: number, lo: number): V4 => [hi >> 8, hi & 0xff, lo >> 8, lo & 0xff];

export function isBlockedV6(g: number[]) {
  const zeroPrefix = (n: number) => g.slice(0, n).every((x) => x === 0);
  if (zeroPrefix(8) || (zeroPrefix(7) && g[7] === 1)) return true;
  if ((g[0] & 0xfe00) === 0xfc00) return true;
  if ((g[0] & 0xffc0) === 0xfe80 || (g[0] & 0xffc0) === 0xfec0) return true;
  if ((g[0] & 0xff00) === 0xff00) return true;
  if (g[0] === 0x2001 && (g[1] === 0 || g[1] === 0xdb8)) return true;
  if (zeroPrefix(5) && g[5] === 0xffff) return isBlockedV4(embeddedV4(g[6], g[7]));
  if (zeroPrefix(6)) return isBlockedV4(embeddedV4(g[6], g[7]));
  if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0))
    return isBlockedV4(embeddedV4(g[6], g[7]));
  if (g[0] === 0x2002) return isBlockedV4(embeddedV4(g[1], g[2]));
  return false;
}

export function isPrivateAddress(ip: string) {
  const v4 = parseV4(ip);
  if (v4) return isBlockedV4(v4);
  const v6 = parseV6(ip);
  return v6 ? isBlockedV6(v6) : true;
}
