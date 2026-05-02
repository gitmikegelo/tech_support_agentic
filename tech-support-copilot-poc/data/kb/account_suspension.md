# Account Suspension — Causes and Resolution

## Why Accounts Get Suspended

| Reason | Automatic? | Reversible? |
|---|---|---|
| Non-payment (30+ days overdue) | Yes | Yes — payment restores service |
| Returned payment / chargeback | Yes | Yes — after resolution |
| Fraud investigation | Manual | Requires security team review |
| Terms of Service (ToS) violation | Manual | Case-by-case |
| Customer-requested suspension (vacation hold) | Manual | Yes — per hold terms |

## Identifying a Suspension

When `lookup_customer` returns `account_status: "suspended"`, read the `suspension_reason` field to determine the cause before advising the customer.

**Do not** promise service restoration without confirming the account can be unsuspended (e.g., payment confirmed or fraud flag cleared).

## Non-Payment Suspension — Rep Script
> "I can see your account is currently on hold due to an outstanding balance of \$[AMOUNT]. 
> Once payment is processed, service is typically restored within 15 minutes. 
> Would you like me to walk you through the payment options?"

Payment channels:
- Online portal: `myaccount.example-isp.com/pay`
- Automated phone payment: 1-800-555-PAY1
- In-store at any authorized retailer

## Post-Payment Restoration
Service is restored automatically once payment clears. If the account still shows suspended 30 minutes after payment:
1. Verify payment confirmation number with the customer.
2. Manually trigger account re-activation via the billing system.
3. Ask the customer to reboot their modem after re-activation.

## Vacation Hold
- Customer-requested holds pause billing and suspend service.
- Standard hold: 2–6 months.
- To end a hold early, the customer must call or use the online portal.

## Escalation
Suspend/unsuspend actions tied to fraud or ToS investigations must be escalated to the Account Security team.  Do **not** attempt to manually override fraud holds.

## Related Articles
- `modem_reboot.md` — reboot after account restoration
- `outage_communication.md` — if widespread payment processing issues are affecting multiple accounts
