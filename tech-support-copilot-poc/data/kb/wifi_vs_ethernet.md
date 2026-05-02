# WiFi vs. Ethernet — Troubleshooting Connectivity Differences

## Key Differences

| Factor | Ethernet (wired) | WiFi (wireless) |
|---|---|---|
| Speed | Full subscribed tier | Up to 80% of tier (varies by band) |
| Latency | 1–5 ms typical | 5–30 ms typical; higher on 2.4 GHz |
| Reliability | Very stable | Subject to interference, distance, obstructions |
| Security | Physical access required | Susceptible to RF interference |

## Why WiFi is Slower or Drops Frequently

### Distance from Router
WiFi signal strength falls off with distance and is blocked by walls, floors, and appliances.
- **5 GHz band**: Faster speeds, shorter range (~30 ft through walls).
- **2.4 GHz band**: Slower speeds, longer range (~150 ft), more congestion.

Recommend the customer move closer to the router or use a wired connection for devices that require stability (desktop computers, gaming consoles, smart TVs).

### WiFi Channel Congestion
In apartment buildings or dense areas, multiple routers on the same channel cause interference.
**Fix**: Log into the router admin panel → Wireless settings → Change channel to **1, 6, or 11** (for 2.4 GHz) or select **auto** channel on 5 GHz.

### Router Placement
- Avoid placing the router inside a cabinet, behind a TV, or on the floor.
- Optimal placement: centrally located, elevated (bookshelf height), away from microwaves and cordless phones.

### Too Many Connected Devices
Bandwidth is shared across all WiFi devices. During peak household usage, individual device speeds drop.
**Fix**: Upgrade router to support WiFi 6 (802.11ax) for better multi-device performance.

## Isolating Whether the Issue is WiFi or the Line

1. Connect a laptop directly to the modem using an ethernet cable.
2. Run a speed test at `fast.com`.
3. If wired speed matches the subscribed tier → **the line is fine; the issue is WiFi or the router**.
4. If wired speed is also slow → **the issue is the modem or the ISP line** → refer to `slow_speeds.md`.

## When to Recommend a Router Upgrade
- Router is more than 5 years old.
- Router does not support dual-band (2.4 GHz + 5 GHz).
- Customer has more than 10 devices connecting simultaneously.
- WiFi 6 router will significantly improve multi-device household performance.

## Related Articles
- `slow_speeds.md` — comprehensive speed troubleshooting
- `modem_reboot.md` — if modem instability is contributing to drops
