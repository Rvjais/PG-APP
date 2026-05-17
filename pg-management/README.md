# PG Management System

A comprehensive PG (Paying Guest) management system built with React, Express, and PostgreSQL. Allows PG owners to manage tenants, send WhatsApp reminders, and automate rent collection messaging.

## Features

- **Multi-user support** - Multiple PG owners can create accounts and manage their properties
- **Building management** - Manage multiple PG buildings from one dashboard
- **Tenant database** - Store tenant info with dynamic custom fields
- **Message templates** - Create templates with variables like `{{name}}`, `{{room_number}}`, `{{rent_amount}}`
- **WhatsApp integration** - Send messages via WhatsApp using Baileys library
- **Scheduled reminders** - Automate reminders on fixed dates or relative to tenant join dates
- **Message history** - Track all sent messages and delivery status

## Tech Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend**: Express + TypeScript + Prisma ORM
- **Database**: PostgreSQL
- **WhatsApp**: Baileys (WhatsApp Web API)
- **Auth**: JWT

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- npm or yarn

### Setup

1. **Clone and install dependencies**

```bash
cd pg-management

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

2. **Configure database**

Update `server/.env` with your PostgreSQL connection string:

```
DATABASE_URL="postgresql://user:password@localhost:5432/pg_management"
JWT_SECRET="your-secret-key"
```

3. **Initialize database**

```bash
cd server
npx prisma generate
npx prisma db push
```

4. **Start the application**

```bash
# Terminal 1 - Start server
cd server
npm run dev

# Terminal 2 - Start client
cd client
npm run dev
```

5. **Open in browser**

Navigate to `http://localhost:5173`

### Usage Flow

1. **Register** - Create an account
2. **Connect WhatsApp** - Go to WhatsApp page, scan QR code
3. **Add Buildings** - Create your PG buildings
4. **Add Custom Fields** - Go to Settings, create custom fields (e.g., deposit amount)
5. **Add Tenants** - Add tenants with their info and custom field values
6. **Create Templates** - Create message templates using `{{variables}}`
7. **Send Messages** - Compose and send messages to selected tenants
8. **Schedule Reminders** - Set up automated rent reminders

## Message Variables

Available variables in templates:

| Variable | Description |
|----------|-------------|
| `{{name}}` | Tenant name |
| `{{phone}}` | Phone number |
| `{{room_number}}` | Room number |
| `{{floor}}` | Floor number |
| `{{rent_amount}}` | Rent amount |
| `{{join_date}}` | Join date |
| `{{building_name}}` | Building name |
| `{{owner_name}}` | Your name |
| `{{custom:field_name}}` | Custom field values |

## Trigger Types

- **Fixed Date** - Send on a specific day of the month (1-28)
- **Relative to Join** - Send X days before/after tenant's join date

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Buildings
- `GET /api/buildings` - List buildings
- `POST /api/buildings` - Create building
- `PUT /api/buildings/:id` - Update building
- `DELETE /api/buildings/:id` - Delete building

### Tenants
- `GET /api/tenants` - List tenants (filter by buildingId, floor)
- `POST /api/tenants` - Create tenant
- `PUT /api/tenants/:id` - Update tenant
- `DELETE /api/tenants/:id` - Delete tenant

### Templates
- `GET /api/templates` - List templates
- `POST /api/templates` - Create template
- `PUT /api/templates/:id` - Update template
- `DELETE /api/templates/:id` - Delete template
- `POST /api/templates/:id/preview` - Preview with tenant data

### Messages
- `POST /api/messages/send` - Send to single tenant
- `POST /api/messages/bulk` - Send to multiple tenants
- `GET /api/messages/logs` - Message history

### Scheduler
- `GET /api/scheduler/reminders` - List reminders
- `POST /api/scheduler/reminders` - Create reminder
- `PUT /api/scheduler/reminders/:id` - Update reminder
- `DELETE /api/scheduler/reminders/:id` - Delete reminder
- `POST /api/scheduler/reminders/:id/trigger` - Trigger now

### WhatsApp
- `GET /api/whatsapp/status` - Connection status
- `POST /api/whatsapp/connect` - Start QR connection
- `POST /api/whatsapp/disconnect` - Disconnect
- `GET /api/whatsapp/qr` - Get QR code