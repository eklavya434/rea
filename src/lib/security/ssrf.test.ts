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

  it("detects IPv6 loopback and link-local addresses", () => {
    expect(isPrivateOrReservedIP("::1")).toBe(true);
    expect(isPrivateOrReservedIP("fe80::1")).toBe(true);
    expect(isPrivateOrReservedIP("fc00::1")).toBe(true);
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
  });

  it("rejects URLs with embedded credentials", async () => {
    const res = await validateTargetUrl("https://admin:secret@example.com");
    expect(res.isValid).toBe(false);
    expect(res.error).toContain("User credentials in URLs are disallowed");
  });

  it("rejects localhost and cloud metadata targets", async () => {
    const resLocalhost = await validateTargetUrl("http://localhost:8080");
    expect(resLocalhost.isValid).toBe(false);

    const resMetadata = await validateTargetUrl("http://169.254.169.254/latest/meta-data");
    expect(resMetadata.isValid).toBe(false);

    const resGcpMeta = await validateTargetUrl("http://metadata.google.internal/computeMetadata/v1/");
    expect(resGcpMeta.isValid).toBe(false);
  });

  it("rejects disallowed dangerous ports", async () => {
    const resSsh = await validateTargetUrl("http://93.184.216.34:22");
    expect(resSsh.isValid).toBe(false);
    expect(resSsh.error).toContain("disallowed");
  });

  it("permits valid public URLs", async () => {
    const res = await validateTargetUrl("https://example.com");
    expect(res.isValid).toBe(true);
    expect(res.sanitizedUrl).toBe("https://example.com/");
  });
});
