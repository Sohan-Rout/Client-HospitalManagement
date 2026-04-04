# ABC Hospital Command Center

Full-stack hospital management demo with:

- Login-first JWT authentication with 7 roles
- Emergency priority queue sorted by severity and FIFO
- Patient/doctor chat
- Appointment booking plus doctor accept/reject flow
- Versioned prescriptions with history
- Admin and super admin reporting
- Next.js frontend with Tailwind-powered responsive dashboards
- API-first backend architecture

## Run

```bash
npm install
npm run dev
npm run dev:frontend
```

Frontend: [http://127.0.0.1:3001](http://127.0.0.1:3001)
Backend API: [http://127.0.0.1:3000](http://127.0.0.1:3000)

## Deployment

```bash
npm install
npm run build
npm start
```

Production serves the exported Next.js frontend and the Express API from the same Node process.

## Demo Accounts

- `superadmin@abchospital.com / SuperAdmin@123`
- `admin@abchospital.com / Admin@123`
- `doctor@abchospital.com / Doctor@123`
- `nurse@abchospital.com / Nurse@123`
- `receptionist@abchospital.com / Reception@123`
- `staff@abchospital.com / Staff@123`
- `patient@abchospital.com / Patient@123`

## Stack

- Frontend: Next.js App Router + Tailwind CSS
- Backend: Express + SQLite
- Queue engine: plain JavaScript ordering logic

## Key Paths

- `backend/server.js`: API startup and route mounting
- `backend/config/db.js`: demo data and SQLite schema
- `backend/models/*`: data access and bootstrap aggregation
- `frontend/app/*`: Next.js routes and layout
- `frontend/components/*`: landing page and dashboard UI
- `frontend/lib/*`: API, session, and UI helpers

## Commands to build jwt secret and session secret
- node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
