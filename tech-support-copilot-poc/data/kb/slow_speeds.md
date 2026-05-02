# Slow Internet Speeds Troubleshooting

## Common Causes
1. **Weak modem signal** — downstream signal below -7 dBmV or above +7 dBmV indicates line issues.
2. **WiFi interference or distance** — 2.4 GHz band congestion; customer too far from router.
3. **Peak-hour congestion** — shared neighbourhood node oversubscribed in the evenings (6–10 PM).
4. **Outdated modem or router** — hardware bottleneck if modem is DOCSIS 2.0 or older.
5. **Device-side limitations** — old network card, background downloads, malware.
6. **Plan mismatch** — customer's subscribed tier does not match their expectations.

## Diagnostic Workflow

### Step 1: Run a Speed Test
Ask the customer to visit `fast.com` or `speedtest.net` from a **wired ethernet** device.
- If wired speed is close to the subscribed tier → problem is WiFi or the device, not the line.
- If wired speed is significantly below the subscribed tier → problem is the line or modem.

### Step 2: Check Modem Signal
Use `check_modem_status` to retrieve downstream signal (dBmV) and upstream signal.
- **Healthy downstream range**: -7 to +7 dBmV
- **Healthy upstream range**: 38–48 dBmV
- Signal outside these ranges → suspect line noise, loose cable splitter, or corroded connector.

### Step 3: Check for Outage
Always run `check_isp_outage` before blaming the customer's equipment.
If an active outage is confirmed, advise the customer of the ETA and avoid unnecessary reboots.

### Step 4: Isolate WiFi vs. Line
If wired speed is fine but WiFi is slow:
- Recommend moving the router to a central location.
- Switch the connected device to the 5 GHz band (faster but shorter range).
- Check for interfering devices (microwaves, baby monitors, neighbouring networks).

## Signal Degradation — Escalation Criteria
Escalate to a field technician if any of the following apply after a modem reboot:
- Downstream signal remains below -10 dBmV or above +10 dBmV.
- Upstream signal is above 50 dBmV (modem compensating for line loss).
- Modem has restarted more than 5 times in 24 hours.
- Customer reports slow speeds consistently for more than 3 days.

## Related Articles
- `modem_reboot.md` — reboot procedure if signal-related
- `wifi_vs_ethernet.md` — isolating WiFi issues
- `device_compatibility.md` — check if modem hardware is limiting speed
