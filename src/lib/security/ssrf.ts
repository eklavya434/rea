import dns from "dns/promises";
import net from "net";

export interface UrlValidationResult {
  isValid: boolean;
  sanitizedUrl?: string;
  error?: string;
  ip?: string;
}

// Disallowed IP ranges and metadata targets
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "169.254.169.254", // Cloud metadata
  "instance-data",
  "docker.for.win.localhost",
  "host.docker.internal",
]);

/**
 * Checks if an IPv4 or IPv6 address belongs to private, loopback, multicast, or link-local ranges.
 */
export function isPrivateOrReservedIP(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) return true;

    // 0.0.0.0/8 (Current network)
    if (parts[0] === 0) return true;

    // 127.0.0.0/8 (Loopback)
    if (parts[0] === 127) return true;

    // 10.0.0.0/8 (Private)
    if (parts[0] === 10) return true;

    // 172.16.0.0/12 (Private)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;

    // 192.168.0.0/16 (Private)
    if (parts[0] === 192 && parts[1] === 168) return true;

    // 169.254.0.0/16 (Link-local / Cloud metadata)
    if (parts[0] === 169 && parts[1] === 254) return true;

    // 224.0.0.0/4 (Multicast)
    if (parts[0] >= 224 && parts[0] <= 239) return true;

    // 240.0.0.0/4 (Reserved)
    if (parts[0] >= 240) return true;

    // 255.255.255.255 (Broadcast)
    if (parts.every((p) => p === 255)) return true;

    return false;
  }

  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    // Loopback
    if (lower === "::1" || lower === "0:0:0:0:0:0:0:1") return true;
    // Unspecified
    if (lower === "::" || lower === "0:0:0:0:0:0:0:0") return true;
    // IPv6 link-local (fe80::/10)
    if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) return true;
    // Unique local address (fc00::/7)
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
    // IPv4-mapped IPv6 address (e.g. ::ffff:127.0.0.1)
    if (lower.includes("::ffff:")) {
      const v4Part = lower.split("::ffff:")[1];
      if (v4Part && net.isIPv4(v4Part)) {
        return isPrivateOrReservedIP(v4Part);
      }
    }
    return false;
  }

  // Not a valid IP
  return true;
}

/**
 * Validates a target URL against SSRF attacks:
 * 1. Checks protocol (must be http or https)
 * 2. Blocks standard private hostnames and credentials in URL
 * 3. Resolves DNS to check underlying IP addresses against private / metadata ranges
 * 4. Checks port (permits 80, 443, 8080, 8443)
 */
export async function validateTargetUrl(rawUrl: string): Promise<UrlValidationResult> {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { isValid: false, error: "URL is required and must be a string." };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { isValid: false, error: "Invalid URL format." };
  }

  // Protocol check
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { isValid: false, error: "Only HTTP and HTTPS protocols are permitted." };
  }

  // Credentials check (e.g., https://user:pass@example.com)
  if (parsed.username || parsed.password) {
    return { isValid: false, error: "User credentials in URLs are disallowed for security." };
  }

  // Hostname checks
  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    return { isValid: false, error: `Access to target host '${hostname}' is restricted.` };
  }

  // Port restrictions
  const port = parsed.port ? parseInt(parsed.port, 10) : parsed.protocol === "https:" ? 443 : 80;
  const allowedPorts = [80, 443, 8080, 8443, 3000];
  if (!allowedPorts.includes(port)) {
    return { isValid: false, error: `Port ${port} is disallowed. Allowed ports: ${allowedPorts.join(", ")}.` };
  }

  // Direct IP check
  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIP(hostname)) {
      return { isValid: false, error: `Destination IP ${hostname} is private or reserved.` };
    }
    return { isValid: true, sanitizedUrl: parsed.toString(), ip: hostname };
  }

  // DNS resolution check to prevent DNS rebinding or private resolution
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      return { isValid: false, error: `Could not resolve hostname '${hostname}'.` };
    }

    for (const record of addresses) {
      if (isPrivateOrReservedIP(record.address)) {
        return {
          isValid: false,
          error: `Hostname '${hostname}' resolves to restricted internal IP ${record.address}.`,
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
