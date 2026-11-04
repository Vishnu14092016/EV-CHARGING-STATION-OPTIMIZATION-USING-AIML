# ChargeSmart — Two Platforms

This starter separates ChargeSmart into two role-specific interfaces:
- **EV Driver:** find stations, filter/compare sample rates, create demo bookings, and open Google Maps navigation using device location or a typed location.
- **Station Owner:** view sample operating stats, add/toggle chargers, review bookings, and export booking CSV.

## Credentials & Authentication
The platform supports login via username or email and password:

### Default Demo Accounts:
- **Station Owner:**
  - **Username:** `owner` (or `admin`)
  - **Password:** `owner123`
  - **Role:** Station Owner → Redirects to `owner.html`
- **EV Driver:**
  - **Username:** `driver`
  - **Password:** `driver123`
  - **Role:** EV Driver → Redirects to `driver.html`

You can also use the **"Auto-fill Owner"** button on the login screen or register any new account via **"Create an account"** with custom username and password.

## Calendar & Slot Scheduling
- **Date Picker:** Drivers select any upcoming date (with quick-select shortcuts for "Today", "Tomorrow", and "+2 Days").
- **Time Slot Grid:** Interactive 1-hour charging slots from 08:00 AM to 08:00 PM.
- **Double-booking Prevention:** Once a slot is booked for a specific station on a selected date, it is marked as `Booked` and disabled.
- **Owner Schedule Management:** Station Owners can view bookings by date, filter schedule timelines, track daily slot demand, and export CSV reports with Date and Slot Time.

## Files
- `index.html` — role landing page
- `login.html` + `auth.js` — Username/password login, demo auto-fill, and Supabase integration
- `driver.html` — driver dashboard
- `owner.html` — owner console
- `dashboard.js` — sample station/booking/charger behavior and session guard
- `ev-navigation.html` + `navigation.js` — Google Maps navigation
- `supabaseClient.js` — project URL and browser publishable key configuration
- `supabase_setup.sql` — optional profile table and RLS policy setup

## Run locally
1. Extract this ZIP or open the folder in VS Code.
2. Install/use **Live Server** (or use any static web server).
3. Right-click `index.html` → **Open with Live Server**.
4. Choose **Station Owner** → enter username `owner` and password `owner123` (or click "Auto-fill Owner") → click **Log in**.

For geolocation, use `localhost` or an HTTPS deployed website. Google Maps opens in a new tab.

## Supabase setup / role note
Authentication checks local sessions (for fast, offline username & password demo logins) and supports Supabase Auth with user metadata `role` (`driver` or `owner`). The dashboard verifies logged-in sessions and ensures users are routed to their authorized workspace.

## Current limitations
- Sample station records, sample rates, and sample availability.
- No live EV charger hardware integration.
- No real payment collection.
- Bookings/charger toggles are browser-local prototype data.
