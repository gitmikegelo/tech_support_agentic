# Modem Reboot Procedure

## When to Use
Reboot the modem when the customer reports:
- No internet connection despite modem appearing powered on
- Very slow speeds that did not improve after router restart
- Modem has been online continuously for more than 30 days (proactive maintenance)
- Signal levels are outside acceptable range (downstream: -7 to +7 dBmV; upstream: 38–48 dBmV)
- More than 3 unplanned restarts within a 24-hour period

## Steps: Customer Self-Reboot
1. Locate the modem (typically a rectangular device with coax and ethernet cables).
2. Unplug the **power adapter** from the wall outlet (or the back of the modem).
3. Wait **60 seconds** — this allows capacitors to fully discharge and the ISP systems to release the DHCP lease.
4. Plug the power adapter back in.
5. Watch the modem LEDs: expect 2–3 minutes for full re-provisioning.
6. Online/Ready LED should turn solid (green or white depending on model).
7. Test connectivity once the modem is fully provisioned.

## Steps: Remote Reboot (Rep-Initiated)
- Use the `reboot_modem_remotely` tool with the customer's ID and a documented reason.
- Warn the customer that service will be interrupted for approximately 2 minutes.
- After reboot, run `check_modem_status` to confirm signal levels have recovered.

## What to Expect After Reboot
- Signal levels should return to normal range within 5 minutes.
- If the modem restarts again within 24 hours after a reboot, escalate to a field technician — this indicates a physical line issue.

## Do Not Reboot If
- The customer is mid-download of critical business data and cannot tolerate a 2-minute outage.
- An active ISP outage is confirmed — a reboot will not help until the outage is resolved.

## Related Articles
- `slow_speeds.md` — for diagnosing why speeds are below subscribed tier
- `device_compatibility.md` — confirm the modem is on the approved list before rebooting
