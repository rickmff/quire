import { describe, expect, it } from "vitest";
import { isPrivateAddress, parseV6 } from "./ip";

describe("isPrivateAddress", () => {
  it.each([
    "0.0.0.0",
    "10.1.2.3",
    "100.64.0.1",
    "127.0.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "172.31.255.255",
    "192.0.0.8",
    "192.168.1.1",
    "198.18.0.1",
    "224.0.0.1",
    "255.255.255.255",
    "::",
    "::1",
    "fc00::1",
    "fd12:3456::1",
    "fe80::1",
    "ff02::1",
    "::ffff:127.0.0.1",
    "::ffff:10.0.0.1",
    "::ffff:a9fe:a9fe",
    "::127.0.0.1",
    "64:ff9b::a00:1",
    "2002:7f00:1::",
    "2001:db8::1",
    "[::1]",
    "fe80::1%eth0",
  ])("blocks %s", (ip) => expect(isPrivateAddress(ip)).toBe(true));

  it.each([
    "1.1.1.1",
    "8.8.8.8",
    "172.32.0.1",
    "100.128.0.1",
    "2606:4700:4700::1111",
    "::ffff:8.8.8.8",
    "2002:808:808::",
  ])("allows %s", (ip) => expect(isPrivateAddress(ip)).toBe(false));

  it.each(["", "not-an-ip", "1.2.3", "256.0.0.1", "1::2::3", "12345::"])("treats %s as unsafe", (ip) =>
    expect(isPrivateAddress(ip)).toBe(true),
  );
});

describe("parseV6", () => {
  it("expands the short form to eight groups", () => {
    expect(parseV6("2001:db8::1")).toEqual([0x2001, 0xdb8, 0, 0, 0, 0, 0, 1]);
  });

  it("reads a dotted IPv4 tail", () => {
    expect(parseV6("::ffff:192.168.0.1")).toEqual([0, 0, 0, 0, 0, 0xffff, 0xc0a8, 0x0001]);
  });
});
