import { describe, expect, it } from "vitest";
import { nextHop } from "../lib/probes/http";
import {
  assertPublicAddresses,
  assertSafeUrl,
  BlockedAddressError,
  guardedLookup,
  InvalidDomainError,
  isPublicAddress,
  normalizeDomain,
} from "../lib/safety";

describe("normalizeDomain", () => {
  it.each([
    ["linear.app", "linear.app"],
    ["  Linear.APP  ", "linear.app"],
    ["https://www.linear.app/pricing?x=1", "linear.app"],
    ["blog.example.co.uk", "example.co.uk"],
    ["example.com.", "example.com"],
    ["http://example.com:8080", "example.com"],
    ["münchen.de", "xn--mnchen-3ya.de"],
  ])("%s → %s", (input, out) => expect(normalizeDomain(input)).toBe(out));

  it.each(["", "localhost", "foo.localhost", "127.0.0.1", "10.0.0.1", "[::1]", "http://[::1]/", "intranet", "co.uk", "foo.invalidtld", "example.local"])(
    "rejects %j",
    (input) => expect(() => normalizeDomain(input)).toThrow(InvalidDomainError),
  );
});

describe("isPublicAddress", () => {
  it.each(["8.8.8.8", "104.18.40.45", "2606:4700::6810:282d"])("allows %s", (ip) => expect(isPublicAddress(ip)).toBe(true));

  it.each([
    ["loopback v4", "127.0.0.1"],
    ["loopback v4 range", "127.1.2.3"],
    ["private 10/8", "10.1.2.3"],
    ["private 172.16/12", "172.16.5.4"],
    ["private 192.168/16", "192.168.1.1"],
    ["link-local / cloud metadata", "169.254.169.254"],
    ["CGNAT", "100.64.0.1"],
    ["unspecified", "0.0.0.0"],
    ["multicast v4", "224.0.0.1"],
    ["broadcast", "255.255.255.255"],
    ["loopback v6", "::1"],
    ["unspecified v6", "::"],
    ["ULA", "fd00::1"],
    ["ULA fc", "fc00::1"],
    ["link-local v6", "fe80::1"],
    ["multicast v6", "ff02::1"],
    ["v4-mapped private", "::ffff:10.0.0.1"],
    ["v4-mapped loopback", "::ffff:127.0.0.1"],
    ["garbage", "not-an-ip"],
  ])("blocks %s (%s)", (_, ip) => expect(isPublicAddress(ip)).toBe(false));

  it("rejects a host if ANY address is private", () => {
    expect(() => assertPublicAddresses("mixed.example", ["8.8.8.8", "10.0.0.1"])).toThrow(BlockedAddressError);
    expect(() => assertPublicAddresses("empty.example", [])).toThrow(BlockedAddressError);
  });
});

describe("redirect guard", () => {
  const from = new URL("https://example.com/");
  it.each([
    "http://127.0.0.1/",
    "http://127.0.0.1:8080/admin",
    "http://[::1]/",
    "http://169.254.169.254/latest/meta-data/",
    "http://10.0.0.5/",
    "http://localhost/",
    "http://foo.localhost/",
    "http://intranet/",
    "file:///etc/passwd",
    "ftp://example.com/",
    "https://user:pass@example.com/",
    "https://example.com:6379/",
  ])("refuses redirect to %s", (loc) => expect(() => nextHop(loc, from)).toThrow(BlockedAddressError));

  it("follows relative and public redirects", () => {
    expect(nextHop("/pricing", from).toString()).toBe("https://example.com/pricing");
    expect(nextHop("https://www.example.com/", from).hostname).toBe("www.example.com");
  });

  it("assertSafeUrl allows public IP literals only", () => {
    expect(() => assertSafeUrl(new URL("http://8.8.8.8/"))).not.toThrow();
    expect(() => assertSafeUrl(new URL("http://192.168.0.1/"))).toThrow(BlockedAddressError);
  });
});

describe("guardedLookup (socket-level check)", () => {
  const lookup = (host: string) =>
    new Promise<string>((resolve, reject) =>
      guardedLookup(host, {}, (err, address) => (err ? reject(err) : resolve(address as string))),
    );

  it("refuses a name that resolves to loopback", async () => {
    await expect(lookup("localhost")).rejects.toThrow(BlockedAddressError);
  });

  it("refuses a literal private address", async () => {
    await expect(lookup("127.0.0.1")).rejects.toThrow(BlockedAddressError);
    await expect(lookup("10.0.0.1")).rejects.toThrow(BlockedAddressError);
  });
});
