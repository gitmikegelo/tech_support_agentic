# Device Compatibility — Approved Modems and Routers

## Modem Approval Policy
Customers must use a modem on the ISP-approved list to receive full technical support.
Unapproved modems may work but are not guaranteed to provision correctly or receive
remote management commands (including `reboot_modem_remotely`).

---

## Approved Modems by Service Tier

### Basic 100 (up to 100 Mbps)
| Model | DOCSIS | Max Speed | Status |
|---|---|---|---|
| NETGEAR CM500 | 3.0 | 680 Mbps | Approved |
| Motorola MB7420 | 3.0 | 343 Mbps | Approved |
| Arris SB6183 | 3.0 | 686 Mbps | Approved |

### Gigabit 500 (up to 500 Mbps)
| Model | DOCSIS | Max Speed | Status |
|---|---|---|---|
| Motorola MB8600 | 3.1 | 6 Gbps | Approved ✓ Recommended |
| NETGEAR CM1000 | 3.1 | 1 Gbps | Approved |
| Arris SB8200 | 3.1 | 10 Gbps | Approved ✓ Recommended |

### Gigabit 1000 (up to 1 Gbps)
| Model | DOCSIS | Max Speed | Status |
|---|---|---|---|
| Arris SB8200 | 3.1 | 10 Gbps | Approved ✓ Recommended |
| Motorola MB8600 | 3.1 | 6 Gbps | Approved |

> ⚠ **DOCSIS 2.0 modems are no longer supported** and must be replaced before we can
> provision speeds above 30 Mbps.

---

## Approved Routers (for reference — customer-supplied)

| Model | WiFi Standard | Max Throughput | Notes |
|---|---|---|---|
| TP-Link Archer AX21 | WiFi 6 (802.11ax) | 1.8 Gbps | Good mid-range option |
| ASUS RT-AX55 | WiFi 6 (802.11ax) | 1.8 Gbps | Good for apartments |
| Netgear Orbi RBK852 | WiFi 6 (mesh) | 6 Gbps | Recommended for large homes |
| TP-Link Deco XE75 | WiFi 6E (mesh) | 5.4 Gbps | Best for 5+ bedroom homes |

---

## Checking Customer Equipment
Use `lookup_customer` to see the `equipment` field for the customer's modem and router models.
Cross-reference with this list before:
- Recommending a reboot (unapproved modems may not accept remote commands)
- Advising maximum achievable speeds
- Diagnosing signal issues (DOCSIS 3.0 may be limiting high-tier customers)

---

## How to Handle Unapproved Modems
1. Confirm the model from the `lookup_customer` response.
2. If unapproved: inform the customer that full support is limited; recommend upgrading.
3. Document the unapproved model in the ticket.
4. Do not attempt `reboot_modem_remotely` on unapproved models.

## Related Articles
- `modem_reboot.md`
- `slow_speeds.md` — DOCSIS version often the root cause of speed caps
