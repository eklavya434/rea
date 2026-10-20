import dns from "dns/promises";
import net from "net";

export interface UrlValidationResult {
  isValid: boolean;
  sanitizedUrl?: string;
  error?: string;
  ip?: string;
}

// Disallowed hostnames and metadata targets
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "127.0.0.1",
  "::1",
  "metadata.google.internal",
  "169.254.169.254", // Cloud metadata service (AWS/GCP/Azure/DigitalOcean)
  "instance-data",
  "docker.for.win.localhost",
  "host.docker.internal",
]);

/**
 * Checks if an IPv4 address is in private, loopback, link-local, multicast,
 * benchmarking, or reserved ranges per IANA / RFC specifications.
 */
function isDisallowedIPv4(parts: number[]): boolean {
  const [b0, b1, b2] = parts;

  // 0.0.0.0/8 (Current network / default route)
  if (b0 === 0) return true;

  // 10.0.0.0/8 (Private-Use - RFC 1918)
  if (b0 === 10) return true;

  // 100.64.0.0/10 (Shared Address Space / CGNAT - RFC 6598: 100.64.0.0 to 100.127.255.255)
  if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;

  // 127.0.0.0/8 (Loopback - RFC 1122)
  if (b0 === 127) return true;

  // 169.254.0.0/16 (Link-Local / Metadata - RFC 3927)
  if (b0 === 169 && b1 === 254) return true;

  // 172.16.0.0/12 (Private-Use - RFC 1918: 172.16.0.0 to 172.31.255.255)
  if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;

  // 192.0.0.0/24 (IETF Protocol Assignments - RFC 6890)
  if (b0 === 192 && b1 === 0 && b2 === 0) return true;

  // 192.0.2.0/24 (Documentation / TEST-NET-1 - RFC 5737)
  if (b0 === 192 && b1 === 0 && b2 === 2) return true;

  // 192.88.99.0/24 (6to4 Relay Anycast - RFC 7526)
  if (b0 === 192 && b1 === 88 && b2 === 99) return true;

  // 192.168.0.0/16 (Private-Use - RFC 1918)
  if (b0 === 192 && b1 === 168) return true;

  // 198.18.0.0/15 (Network Interconnect Benchmark Testing - RFC 2544: 198.18.0.0 to 198.19.255.255)
  if (b0 === 198 && (b1 === 18 || b1 === 19)) return true;

  // 198.51.100.0/24 (Documentation / TEST-NET-2 - RFC 5737)
  if (b0 === 198 && b1 === 51 && b2 === 100) return true;

  // 203.0.113.0/24 (Documentation / TEST-NET-3 - RFC 5737)
  if (b0 === 203 && b1 === 0 && b2 === 113) return true;

  // 224.0.0.0/4 (Multicast - RFC 5771: 224.0.0.0 to 239.255.255.255)
  if (b0 >= 224 && b0 <= 239) return true;

  // 240.0.0.0/4 (Reserved / Future Use - RFC 1112: 240.0.0.0 to 255.255.255.254)
  if (b0 >= 240) return true;

  // 255.255.255.255 (Limited Broadcast - RFC 919)
  if (parts.every((p) => p === 255)) return true;

  return false;
}

/**
 * Checks if an IPv6 address is in loopback, unspecified, unique local,
 * link-local, multicast, documentation, or IPv4-mapped private ranges.
 */
function isDisallowedIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();

  // ::1 / Loopback
  if (lower === "::1" || lower === "0:0:0:0:0:0:0:1") return true;

  // :: / Unspecified
  if (lower === "::" || lower === "0:0:0:0:0:0:0:0") return true;

  // IPv6 link-local (fe80::/10)
  if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) {
    return true;
  }

  // Unique local address (fc00::/7 -> fc00:: and fd00::)
  if (lower.startsWith("fc") || lower.startsWith("fd")) {
    return true;
  }

  // IPv6 Multicast (ff00::/8)
  if (lower.startsWith("ff")) {
    return true;
  }

  // Documentation (2001:db8::/32)
  if (lower.startsWith("2001:db8:") || lower === "2001:db8::") {
    return true;
  }

  // ORCHIDv2 (2001:20::/28)
  if (lower.startsWith("2001:2") || lower.startsWith("2001:3")) {
    return true;
  }

  // 6to4 (2002::/16)
  if (lower.startsWith("2002:")) {
    return true;
  }

  // IPv4-mapped IPv6 address (::ffff:192.0.2.1)
  if (lower.includes("::ffff:")) {
    const v4Part = lower.split("::ffff:")[1];
    if (v4Part && net.isIPv4(v4Part)) {
      return isPrivateOrReservedIP(v4Part);
    }
  }

  return false;
}

/**
 * Checks if an IPv4 or IPv6 address belongs to private, loopback, multicast, or reserved ranges.
 */
export function isPrivateOrReservedIP(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
      return true;
    }
    return isDisallowedIPv4(parts);
  }

  if (net.isIPv6(ip)) {
    return isDisallowedIPv6(ip);
  }

  // Unknown or malformed IP string
  return true;
}

/**
 * Validates a target URL against SSRF attacks:
 * 1. Checks protocol (must be http: or https:)
 * 2. Rejects credentials in URL (user:pass@)
 * 3. Blocks known internal domains (.local, .internal, metadata hosts)
 * 4. Strictly checks port against allowed public web ports (defaults to 80, 443)
 * 5. Pre-flight DNS resolution verifying all resolved IP records are non-private
 */
export async function validateTargetUrl(rawUrl: string): Promise<UrlValidationResult> {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { isValid: false, error: "URL is required and must be a valid string." };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { isValid: false, error: "Invalid URL syntax." };
  }

  // 1. Protocol check
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { isValid: false, error: "Only HTTP and HTTPS protocols are permitted." };
  }

  // 2. Credentials check
  if (parsed.username || parsed.password) {
    return { isValid: false, error: "Credentials in URLs are disallowed for security." };
  }

  // 3. Hostname restrictions
  const hostname = parsed.hostname.toLowerCase();
  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".localhost")
  ) {
    return { isValid: false, error: `Access to target host '${hostname}' is restricted by security policy.` };
  }

  // 4. Port restrictions (default strictly 80 and 443, configurable via SSRF_ALLOWED_PORTS)
  const defaultAllowedPorts = [80, 443];
  const configuredPorts = process.env.SSRF_ALLOWED_PORTS
    ? process.env.SSRF_ALLOWED_PORTS.split(",").map((p) => parseInt(p.trim(), 10)).filter(Boolean)
    : defaultAllowedPorts;

  const port = parsed.port ? parseInt(parsed.port, 10) : parsed.protocol === "https:" ? 443 : 80;
  if (!configuredPorts.includes(port)) {
    return {
      isValid: false,
      error: `Port ${port} is disallowed. Permitted ports: [${configuredPorts.join(", ")}].`,
    };
  }

  // 5. Direct IP check
  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIP(hostname)) {
      return { isValid: false, error: `Destination IP '${hostname}' belongs to a private or reserved range.` };
    }
    return { isValid: true, sanitizedUrl: parsed.toString(), ip: hostname };
  }

  // 6. Pre-flight DNS resolution against rebinding
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      return { isValid: false, error: `Could not resolve hostname '${hostname}'.` };
    }

    for (const record of addresses) {
      if (isPrivateOrReservedIP(record.address)) {
        return {
          isValid: false,
          error: `Hostname '${hostname}' resolves to restricted IP ${record.address}.`,
        };
      }
    }

    return {
      isValid: true,
      sanitizedUrl: parsed.toString(),
      ip: addresses[0]?.address,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "DNS resolution failed";
    return { isValid: false, error: `DNS lookup failed for '${hostname}': ${msg}` };
  }
}
