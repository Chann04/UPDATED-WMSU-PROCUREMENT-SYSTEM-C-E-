# School Department Procurement & Inventory System

A full-stack web application for managing procurement requests in a school department setting, powered by **Supabase**.

## Features

### User Roles
- **Faculty**: Create and track procurement requests
- **Department Head (DeptHead)**: Approve/reject requests, view budget reports
- **Admin**: Manage users, vendors, categories, and budgets

### Workflow
1. **Draft** - Faculty creates a request
2. **Pending** - Request submitted for approval
3. **Approved/Rejected** - DeptHead or Admin reviews the request
4. **Ordered** - Approved items are ordered
5. **Received** - Items have been delivered
6. **Completed** - Transaction finalized

### Key Features
- Budget tracking with automatic validation
- Real-time budget exceeded warnings
- Dashboard with statistics and recent activity
- Request history for all users
- Vendor and category management
- Modern, responsive UI with Tailwind CSS
- **Supabase Authentication** with auto profile creation
- **Row-Level Security (RLS)** for data protection

## Tech Stack

### Frontend
- React 18 + TypeScript
- Tailwind CSS
- React Router DOM
- Supabase JS Client
- Lucide React (icons)
- Vite (build tool)

### Backend (Supabase)
- PostgreSQL Database
- Supabase Auth
- Row-Level Security (RLS)
- Database Triggers

## Getting Started

### Prerequisites
- Node.js 18+ installed
- A Supabase account (free tier works)

### Supabase Setup

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com) and create a new project
   - Note your project URL and anon key from Settings > API

2. **Run the Database Migration**
   - Go to the SQL Editor in your Supabase dashboard
   - Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
   - Run the migration

3. **Configure Authentication**
   - In Supabase Dashboard > Authentication > Settings
   - Enable Email provider
   - Optionally disable email confirmation for testing

### Frontend Setup

1. **Install Dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```
   Application runs on http://localhost:3000

## Database Schema

### Tables

- **profiles**: User profiles linked to auth.users
  - id (UUID, references auth.users)
  - full_name, email, role, department

- **categories**: Procurement categories
  - id, name, description

- **vendors**: Supplier information
  - id, name, contact_person, contact_number, email, address

- **budgets**: Annual budget tracking
  - id, academic_year, total_amount, spent_amount, remaining_amount (computed)

- **requests**: Procurement requests
  - id, requester_id, category_id, vendor_id
  - item_name, description, quantity, unit_price, total_price (computed)
  - status, rejection_reason, timestamps

### Row-Level Security Policies

- **Faculty**: Can only view and edit their own requests
- **DeptHead**: Can view all requests and update statuses
- **Admin**: Full access to all tables

### Database Triggers

1. **on_auth_user_created**: Automatically creates a profile when a user signs up
2. **update_budget_on_order**: Updates budget spent amount when a request is marked as ordered
3. **update_updated_at**: Automatically updates timestamps

## Project Structure

```
PROCUREMENT SYSTEM/
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql   # Database schema + RLS + Triggers
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── supabaseClient.ts    # Supabase client
│   │   │   └── supabaseApi.ts       # API functions
│   │   ├── types/
│   │   │   └── database.ts          # TypeScript types
│   │   ├── components/
│   │   │   ├── Layout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── StatusBadge.tsx
│   │   ├── context/
│   │   │   └── AuthContext.tsx      # Auth context with Supabase
│   │   ├── pages/
│   │   │   ├── Login.tsx            # Auth with signup/signin
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Requests.tsx
│   │   │   ├── NewRequest.tsx
│   │   │   ├── RequestDetail.tsx
│   │   │   ├── History.tsx
│   │   │   ├── Approvals.tsx
│   │   │   ├── Users.tsx
│   │   │   ├── Vendors.tsx
│   │   │   ├── Categories.tsx
│   │   │   └── Budget.tsx
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── .env.example
│   ├── index.html
│   └── package.json
├── backend/                          # Legacy Express backend (optional)
└── README.md
```

## API Reference

All API calls are made through the Supabase client. See `src/lib/supabaseApi.ts` for the complete API implementation.

### Authentication
```typescript
authAPI.signUp(email, password, fullName, role)
authAPI.signIn(email, password)
authAPI.signOut()
authAPI.getProfile()
```

### Requests
```typescript
requestsAPI.getAll(filters?)
requestsAPI.getMyRequests()
requestsAPI.getPending()
requestsAPI.create(data)
requestsAPI.approve(id)
requestsAPI.reject(id, reason)
requestsAPI.markOrdered(id)
// ... etc
```

## Migration from Local Backend

If you were using the local Express/SQLite backend, here's what changed:

1. **Authentication**: Now uses Supabase Auth instead of JWT
2. **Database**: PostgreSQL on Supabase instead of SQLite
3. **API Calls**: Direct Supabase queries instead of REST endpoints
4. **Real-time**: Supabase supports real-time subscriptions (can be added)

The local backend in `/backend` folder is preserved but no longer needed.

## License

MIT License
