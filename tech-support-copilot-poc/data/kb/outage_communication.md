# Outage Communication Templates

## Purpose
Use these templates when communicating with customers during a confirmed ISP-level outage.
Always verify outage status with `check_isp_outage` before using these scripts.

---

## Template 1: Acknowledged Outage with ETA

> "Thank you for contacting us, [CUSTOMER NAME]. I can confirm there is a service outage
> affecting your area ([ZIP CODE / REGION]) as of [START TIME].
> Our engineers are actively working to resolve this. The estimated restoration time is
> [ETA]. We apologise for the disruption.
>
> You don't need to do anything on your end — service will restore automatically once
> repairs are complete. Would you like me to add a note to your account to waive any
> applicable service credit for today's downtime?"

---

## Template 2: Outage Under Investigation (No ETA Yet)

> "I can see that we have a reported service disruption in your area. Our network team
> is currently investigating the cause. We don't yet have an estimated resolution time,
> but I'm flagging your account so you'll receive an SMS notification when service is
> restored.
>
> Is there anything else I can assist you with in the meantime?"

---

## Template 3: Outage Resolved — Follow-Up

> "Our engineers have resolved the outage that affected your area. Service should now
> be fully restored. If your modem hasn't reconnected automatically, please unplug it
> for 30 seconds and plug it back in.
>
> I'm sorry for the inconvenience and appreciate your patience."

---

## Service Credits During Outages

| Outage Duration | Credit Policy |
|---|---|
| < 4 hours | No automatic credit; goodwill credit at rep discretion |
| 4–24 hours | 1 day of service credit (prorated from monthly bill) |
| > 24 hours | 3 days of service credit; escalate to retention team |

To apply a credit, log it in the CRM ticket with the outage ID from `check_isp_outage`.

## Important Reminders
- Never tell customers an outage is resolved until `check_isp_outage` confirms it.
- Do not recommend modem reboots during an active outage — it will not help.
- Document the outage ID in every ticket opened during the event.

## Related Articles
- `modem_reboot.md` — post-outage modem restart guidance
- `account_suspension.md` — rare cases where billing systems are affected by outages
