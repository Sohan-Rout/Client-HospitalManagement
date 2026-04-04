# ABC Hospital Database Schema

## Users
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100) UNIQUE,
  role ENUM('patient', 'doctor', 'admin', 'superadmin'),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Appointments
```sql
CREATE TABLE appointments (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER,
  doctor_id INTEGER,
  appointment_date TIMESTAMP,
  status ENUM('scheduled', 'completed', 'cancelled'),
  medical_field ENUM('orthopedic', 'cardiology', 'neurology', 'general', 'emergency') DEFAULT 'general',
  emergency_level ENUM(1,2,3,4,5) DEFAULT 1,
  date TIMESTAMP
);
```

Future migration to PostgreSQL ready.
