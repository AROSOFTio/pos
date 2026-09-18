# POS Architecture

## Production stack

- **Frontend:** React + TypeScript + Vite
- **UI:** Tailwind CSS, reusable React components, Lucide icons
- **API:** NestJS
- **Database:** PostgreSQL
- **Compatibility service:** existing Express transaction engine behind NestJS while modules migrate
- **PDF:** PDFKit
- **Edge/static:** Nginx
- **Deployment:** Docker Compose

## Controlled migration rule

The public UI and API entry point use the new stack now. Existing transaction logic is not discarded. Each domain is migrated from the compatibility service into NestJS only after its replacement passes regression checks against the current PostgreSQL data.

No module is considered migrated until its create, view, edit/action, approval/audit, print/export and error states required by that module work in the React UI.

## Current React modules

### Restaurant Operations
- Dashboard
- POS
- Restaurant Orders
- Kitchen / KDS
- Restaurant floor & menu overview

### Administration
- Approvals
- Products
- Inventory
- Suppliers
- Purchasing
- Expenses
- Cash Drawer
- Branches
- Document & Print Settings

## Next backend architecture work

1. Add Prisma to NestJS and introspect the existing PostgreSQL schema.
2. Move authentication/tenant/RBAC into NestJS.
3. Move Restaurant Orders and Kitchen/KOT services into NestJS.
4. Move Purchasing, Inventory and Approvals into NestJS.
5. Move payments, reporting and printing orchestration into NestJS.
6. Add WebSockets for KDS/order/table live updates.
7. Add PWA + IndexedDB/Dexie offline sale queue and safe sync.
8. Add Redis + BullMQ for background jobs and sync/retry workloads.
9. Add S3-compatible storage for logos, product images, invoices and documents.
10. Add Tauri desktop and React Native/Expo clients only after the web/PWA transaction engine is stable.

## Deployment topology

```
Browser / Tablet / Desktop
        |
        v
React + TypeScript + Vite
        |
      Nginx
        |
        v
      NestJS
        |
        +---- migrated NestJS modules
        |
        +---- temporary Express compatibility service
                        |
                        v
                    PostgreSQL
```

The compatibility service is temporary and must shrink as each module is moved into NestJS. It must never become the permanent architecture.
