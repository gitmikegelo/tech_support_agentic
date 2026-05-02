# DNS Issues Troubleshooting

## Symptoms
- Websites fail to load but the customer can ping IP addresses directly (e.g., `ping 8.8.8.8` succeeds).
- Browser shows "DNS_PROBE_FINISHED_NXDOMAIN" or "Server Not Found" errors.
- Some websites work but others do not, seemingly at random.
- Issues started after a modem or router reboot.

## Diagnosis Steps
1. Ask the customer to open a command prompt and run `ping 8.8.8.8`. If this **succeeds**, the modem and routing are working — the problem is DNS.
2. Ask the customer to try navigating to `http://1.1.1.1` directly. If this loads, DNS is confirmed as the issue.
3. Check if the problem affects all devices or just one — single-device issues usually point to the device's DNS settings, not the router.

## Fixes

### Fix 1: Flush DNS Cache (All Platforms)
- **Windows**: Open Command Prompt as Administrator → `ipconfig /flushdns`
- **macOS**: `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder`
- **Linux**: `sudo systemd-resolve --flush-caches`

### Fix 2: Change DNS Servers on the Router
1. Log in to the router admin panel (typically `192.168.1.1` or `192.168.0.1`).
2. Navigate to **WAN Settings** or **Internet** → **DNS**.
3. Replace automatic DNS with a public resolver:
   - Cloudflare: `1.1.1.1` / `1.0.0.1`
   - Google: `8.8.8.8` / `8.8.4.4`
4. Save and reboot the router.

### Fix 3: Set DNS on the Device (Windows)
1. Open **Network Connections** → right-click the active adapter → **Properties**.
2. Select **Internet Protocol Version 4 (TCP/IPv4)** → **Properties**.
3. Choose **Use the following DNS server addresses** and enter the desired IPs.

## When to Escalate
- DNS fix resolves the problem temporarily but issues recur → possible upstream DNS instability; escalate to network operations.
- DNS is functioning correctly but speeds are still slow → refer to `slow_speeds.md`.

## Related Articles
- `slow_speeds.md`
- `wifi_vs_ethernet.md`
