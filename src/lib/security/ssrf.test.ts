import { describe, it, expect } from "vitest";
import { validateTargetUrl, isPrivateOrReservedIP } from "./ssrf";

describe("SSRF Guard & URL Validator", () => {
  it("detects private, loopback, and link-local IPv4 addresses", () => {
    expect(isPrivateOrReservedIP("127.0.0.1")).toBe(true);
    expect(isPrivateOrReservedIP("10.0.0.5")).toBe(true);
    expect(isPrivateOrReservedIP("172.16.1.1")).toBe(true);
    expect(isPrivateOrReservedIP("172.31.255.254")).toBe(true);
    expect(isPrivateOrReservedIP("192.168.1.100")).toBe(true);
    expect(isPrivateOrReservedIP("169.254.169.254")).toBe(true);
    expect(isPrivateOrReservedIP("0.0.0.0")).toBe(true);
    expect(isPrivateOrReservedIP("255.255.255.255")).toBe(true);
  });

  it("detects carrier-grade NAT, benchmarking, and documentation IPv4 blocks", () => {
    // 100.64.0.0/10 (CGNAT)
    expect(isPrivateOrReservedIP("100.64.0.1")).toBe(true);
    expect(isPrivateOrReservedIP("100.127.255.254")).toBe(true);
    // 198.18.0.0/15 (Benchmarking)
    expect(isPrivateOrReservedIP("198.18.0.1")).toBe(true);
    expect(isPrivateOrReservedIP("198.19.255.254")).toBe(true);
    // TEST-NET ranges
    expect(isPrivateOrReservedIP("192.0.2.1")).toBe(true);
    expect(isPrivateOrReservedIP("198.51.100.1")).toBe(true);
    expect(isPrivateOrReservedIP("203.0.113.1")).toBe(true);
    // Multicast & Reserved
    expect(isPrivateOrReservedIP("224.0.0.1")).toBe(true);
    expect(isPrivateOrReservedIP("240.0.0.1")).toBe(true);
  });

  it("detects IPv6 loopback, link-local, multicast, and documentation addresses", () => {
    expect(isPrivateOrReservedIP("::1")).toBe(true);
    expect(isPrivateOrReservedIP("::")).toBe(true);
    expect(isPrivateOrReservedIP("fe80::1")).toBe(true);
    expect(isPrivateOrReservedIP("fc00::1")).toBe(true);
    expect(isPrivateOrReservedIP("fd12:3456:789a::1")).toBe(true);
    expect(isPrivateOrReservedIP("ff02::1")).toBe(true); // Multicast
    expect(isPrivateOrReservedIP("2001:db8::1")).toBe(true); // Documentation
    expect(isPrivateOrReservedIP("::ffff:127.0.0.1")).toBe(true); // IPv4-mapped loopback
  });

  it("recognizes public routable IPv4 addresses as non-private", () => {
    expect(isPrivateOrReservedIP("8.8.8.8")).toBe(false);
    expect(isPrivateOrReservedIP("1.1.1.1")).toBe(false);
    expect(isPrivateOrReservedIP("93.184.216.34")).toBe(false);
  });

  it("rejects non-HTTP/HTTPS protocols", async () => {
    const resFile = await validateTargetUrl("file:///etc/passwd");
    expect(resFile.isValid).toBe(false);
    expect(resFile.error).toContain("Only HTTP and HTTPS protocols are permitted");

    const resFtp = await validateTargetUrl("ftp://ftp.example.com");
    expect(resFtp.isValid).toBe(false);

    const resGopher = await validateTargetUrl("gopher://evil.com");
    expect(resGopher.isValid).toBe(false);
  });

  it("rejects URLs with embedded credentials", async () => {
    const res = await validateTargetUrl("https://admin:secret@example.com");
    expect(res.isValid).toBe(false);
    expect(res.error).toContain("Credentials in URLs are disallowed");
  });

  it("rejects localhost and cloud metadata targets", async () => {
    const resLocalhost = await validateTargetUrl("http://localhost:8080");
    expect(resLocalhost.isValid).toBe(false);

    const resLocalhostDomain = await validateTargetUrl("http://test.localhost");
    expect(resLocalhostDomain.isValid).toBe(false);

    const resMetadata = await validateTargetUrl("http://169.254.169.254/latest/meta-data");
    expect(resMetadata.isValid).toBe(false);

    const resGcpMeta = await validateTargetUrl("http://metadata.google.internal/computeMetadata/v1/");
    expect(resGcpMeta.isValid).toBe(false);
  });

  it("rejects internal dev port 3000 and arbitrary dangerous ports by default", async () => {
    const resPort3000 = await validateTargetUrl("http://93.184.216.34:3000");
    expect(resPort3000.isValid).toBe(false);
    expect(resPort3000.error).toContain("Port 3000 is disallowed");

    const resSsh = await validateTargetUrl("http://93.184.216.34:22");
    expect(resSsh.isValid).toBe(false);
    expect(resSsh.error).toContain("disallowed");
  });

  it("permits valid public URLs with standard web ports (80, 443)", async () => {
    const res = await validateTargetUrl("https://example.com");
    expect(res.isValid).toBe(true);
    expect(res.sanitizedUrl).toBe("https://example.com/");
  });
});
