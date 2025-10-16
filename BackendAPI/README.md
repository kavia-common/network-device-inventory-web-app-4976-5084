# Network Device Inventory - BackendAPI

Express-based REST API for managing network devices with optional PostgreSQL or SQLite persistence. Implements CRUD for devices, pagination/filtering, and a simulated ping endpoint that updates device status and last_ping.

## Features
- Server listens on port 3001 by default.
- Environment-driven DB config:
  - DB_CLIENT=pg|sqlite
  - DATABASE_URL=connection string or sqlite file path
- Endpoints:
  - GET/POST `/api/devices`
  - GET/PUT/PATCH/DELETE `/api/devices/:id`
  - GET `/api/devices/:id/ping`
- Validation for required fields and status enums.
- Pagination via `?page=&per_page=` and filter by type via `?type=`.
- CORS allows `http://localhost:3000`.
- Swagger docs at `/docs`.

## Quick Start

1. Install dependencies:
   - Node.js 18+ recommended
   - If using PostgreSQL, ensure the database is reachable and the connection string is set in `DATABASE_URL`.

2. Configure environment:
   - Copy `.env.example` to `.env` and adjust as needed.

3. Run:
   - Development: `npm run dev`
   - Production: `npm start`

4. API Docs
   - Open `http://localhost:3001/docs`

## Environment Variables

See `.env.example` for all options.

Key variables:
- `PORT` (default 3001)
- `DB_CLIENT` (`sqlite` or `pg`)
- `DATABASE_URL` (sqlite file path or postgres connection string)
- `CORS_ORIGIN` (default http://localhost:3000)

## Database Notes

- SQLite (default): stores data in the file specified by `DATABASE_URL` (e.g., `./data/devices.db`).
- PostgreSQL: set `DB_CLIENT=pg` and provide a valid `DATABASE_URL`.

The service auto-creates the `devices` table on startup if not present.

## OpenAPI/Swagger

- The documentation is generated from route annotations and available at `/docs`. The server URL is set dynamically based on the incoming request.

## Error Response Schema

All errors return the following shape:
```
{
  "error_code": "STRING_IDENTIFIER",
  "message": "Human readable message",
  "details": "Optional details"
}
```

## License

MIT
