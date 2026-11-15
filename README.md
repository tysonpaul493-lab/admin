# LifeRoute Admin Command Center & Emergency Dispatch System

LifeRoute Admin is a high-availability emergency dispatch management system featuring real-time ambulance GPS tracking, hospital bed coordination, driver fleet telemetry, and automated booking dispatch.

## Features
- **Live Fleet Map**: Real-time Leaflet/OSM tracking of active ambulances and emergency bookings with dynamic route paths.
- **Driver Dashboard Telemetry**: Live driver availability, vehicle inventory (BLS/ALS/PTV/NICU), and performance ratings.
- **Trip History & Analytics**: Complete timeline timestamps (`requested_at`, `dispatched_at`, `arrived_pickup_at`, `patient_onboard_at`, `arrived_hospital_at`, `completed_at`).
- **Emergency Dispatch Controls**: Manual & automated dispatch assignment, hospital handovers, and emergency alerts.

## Tech Stack
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Leaflet / OpenStreetMap.
- **Backend**: Laravel 11 / PHP 8.2+, MySQL / MariaDB, Laravel WebSockets / Reverb.
- **Cloud Tunneling**: Cloudflare Tunnel for secure HTTPS / WSS communication without localhost limitations.

## Credentials
- **Admin Email**: `admin@gmail.com`
- **Password**: `Admin@1234`
- **Secondary Admin**: `admin@ambulance.gov` / `AdminSecure2026!` (2FA: `123456`)

## Deployment to Vercel
1. Import this repository into Vercel (`https://github.com/tysonpaul493-lab/admin.git`).
2. Framework Preset: **Vite** (Root directory: `./`).
3. Build Command: `npm --prefix frontend run build`
4. Output Directory: `frontend/dist`
5. Install Command: `npm --prefix frontend install`
6. Click **Deploy**. Vercel will automatically route `/api/*` requests to the live Cloudflare dispatch gateway.
