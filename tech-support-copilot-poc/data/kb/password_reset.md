# Router and Modem Admin Password Reset

## Router Admin Password Reset

The router admin password controls access to the router's configuration interface
(typically at `192.168.1.1` or `192.168.0.1`).  This is **different** from the
WiFi network password.

### Method 1: Factory Reset (Hard Reset)
1. Locate the **Reset** button on the back of the router (small pinhole button).
2. With the router powered on, press and hold the Reset button for **10 seconds** using a paperclip.
3. Release when the LED blinks rapidly.
4. Wait 2 minutes for the router to reboot to factory defaults.
5. **Default credentials** (printed on the router label): admin / admin, or admin / password.
6. Log in and immediately set a new strong password.

> ⚠ **Warning**: A factory reset erases all WiFi settings, port forwarding rules, and custom DNS. The customer will need to reconnect all devices to the new default WiFi network.

### Method 2: Password Recovery via Admin Panel
If the customer knows the current admin password but wants to change it:
1. Log in to `192.168.1.1` (or `192.168.0.1`).
2. Navigate to **Administration** → **System** → **Password**.
3. Enter the current password and set a new one.
4. Save and log out.

---

## WiFi Network Password Reset

1. Log in to the router admin panel (see credentials above).
2. Navigate to **Wireless** → **Security** or **WiFi Settings**.
3. Change the **WPA2/WPA3 Pre-Shared Key** field.
4. Save settings — all WiFi devices will be disconnected and need to reconnect using the new password.

---

## ISP Account (Online Portal) Password Reset

1. Go to `myaccount.example-isp.com`.
2. Click **Forgot Password**.
3. Enter the email address on file.
4. Follow the link in the reset email (valid for 30 minutes).

If the customer no longer has access to the email on file, identity verification is required before a reset can be initiated by the rep.

---

## Related Articles
- `device_compatibility.md` — default credentials by modem/router model
- `wifi_vs_ethernet.md` — reconfiguring WiFi after a reset
