# ShopFlow Suite

Build a complete, production-quality frontend for a **Multi-Tenant Accessories Shop POS & Inventory SaaS** designed specifically for small and medium retail accessories shops in Pakistan.

IMPORTANT:

* Frontend only for now.
* Use realistic dummy/mock data.
* Do NOT build backend, database, authentication API, or payment integration yet.
* Make all buttons, forms, filters, tables, modals, tabs, dropdowns and navigation work using local/mock state where possible.
* The UI should be clean, modern, professional and very easy for a non-technical Pakistani shop owner to use.
* Currency must be PKR (Rs.).
* Use English UI text, but keep the design ready for future Urdu support.
* Fully responsive for desktop, tablet and mobile.
* Use a professional SaaS dashboard style.
* Avoid excessive gradients, unnecessary animations and visual clutter.

TECH STACK:

* React
* TypeScript
* Tailwind CSS
* shadcn/ui
* Lucide icons
* Reusable components
* Responsive layouts

APP NAME:
"ShopFlow"

TAGLINE:
"Simple POS & Inventory Management for Your Shop"

==================================================

1. GLOBAL LAYOUT
   ==================================================

Create a reusable application layout:

Desktop:

* Left sidebar
* Top header
* Main content area

Mobile:

* Collapsible sidebar/drawer
* Mobile-friendly header
* Responsive tables/cards

Sidebar navigation:

Dashboard

Sales

* POS
* Sales
* Sale Returns

Purchases

* Purchases
* Purchase Returns

Inventory

* Products
* Categories
* Stock
* Stock Adjustments
* Low Stock

Customers
Suppliers

Expenses

Reports

* Sales Report
* Purchase Report
* Profit & Loss
* Inventory Report
* Customer Report
* Supplier Report

Users & Roles

Settings

* Shop Settings
* Invoice Settings
* Printer Settings
* Notification Settings
* Subscription

Profile

Include:

* Sidebar active state
* Breadcrumbs
* Global search
* Notifications
* User profile dropdown
* Logout button
* Page titles
* Responsive navigation

==================================================
2. AUTHENTICATION PAGES
=======================

Create these pages:

/login
/signup
/forgot-password
/reset-password

Login:

* ShopFlow logo
* Email
* Password
* Remember me
* Login button
* Forgot password
* Create account

Signup:

* Owner name
* Shop name
* Email
* Phone
* Password
* Confirm password
* Create account

Use realistic validation states.

==================================================
3. ONBOARDING
=============

Create:

/onboarding

Multi-step onboarding:

Step 1:

* Shop name
* Owner name
* Phone
* Address

Step 2:

* Currency = PKR
* Invoice prefix
* Tax settings
* Default payment methods

Step 3:

* Add first products

Step 4:

* Complete setup

Show progress indicator.

==================================================
4. DASHBOARD
============

Create a professional dashboard at:

/dashboard

Top summary cards:

* Today's Sales
* Today's Profit
* Today's Expenses
* Total Stock Value
* Customer Receivables
* Supplier Payables

Example data:

Today's Sales:
Rs. 85,450

Today's Profit:
Rs. 21,350

Today's Expenses:
Rs. 7,200

Stock Value:
Rs. 645,800

Customer Receivables:
Rs. 72,500

Supplier Payables:
Rs. 48,300

Charts:

* Sales Overview
* Profit Overview
* Sales by Category

Tables:

* Recent Sales
* Low Stock Products
* Recent Expenses

Quick actions:

* New Sale
* Add Product
* Add Purchase
* Add Expense
* Add Customer

==================================================
5. POS PAGE
===========

Create a complete POS interface:

/pos

Layout:

Left:

* Product search
* Barcode search
* Category filters
* Product grid

Right:

* Cart
* Product quantity
* Remove product
* Discount
* Subtotal
* Total
* Payment method
* Amount received
* Change
* Customer selection
* Hold sale
* Clear cart
* Complete Sale

Payment methods:

* Cash
* Card
* Bank Transfer
* Easypaisa
* JazzCash
* Credit

Include:

* Barcode scanner UI
* Keyboard-friendly POS controls
* Product search
* Out of stock warning
* Low stock warning

After completing sale:
Show success modal with:

* Invoice number
* Total
* Paid
* Change
* Print Invoice
* Share Invoice
* New Sale

==================================================
6. SALES PAGE
=============

/sales

Create sales table:

Columns:

* Invoice #
* Date
* Customer
* Items
* Total
* Paid
* Due
* Payment Method
* Status
* Actions

Features:

* Search
* Date filter
* Customer filter
* Payment filter
* Status filter
* Export
* View invoice
* Print
* Return sale

Sale details page:

/sales/:id

Show:

* Invoice information
* Customer
* Products
* Quantity
* Price
* Discount
* Total
* Payment history
* Notes

==================================================
7. SALE RETURNS
===============

/sale-returns

Features:

* Search invoice
* Select products
* Return quantity
* Return reason
* Refund amount
* Refund method
* Submit return

Show return history.

==================================================
8. PRODUCTS
===========

/products

Product management page.

Table columns:

* Image
* Product
* SKU
* Barcode
* Category
* Purchase Price
* Sale Price
* Stock
* Status
* Actions

Actions:

* View
* Edit
* Delete
* Adjust Stock

Features:

* Search
* Category filter
* Stock filter
* Low stock filter
* Import products
* Export products
* Add product

Add/Edit Product modal/page:

Fields:

* Product name
* SKU
* Barcode
* Category
* Brand
* Purchase price
* Sale price
* Wholesale price
* Quantity
* Minimum stock
* Supplier
* Product image
* Description
* Active/inactive

==================================================
9. PRODUCT DETAILS
==================

/products/:id

Show:

* Product information
* Current stock
* Purchase price
* Sale price
* Stock value
* Total sold
* Total purchased
* Low stock threshold

Tabs:

Overview
Stock History
Sales History
Purchase History

==================================================
10. CATEGORIES
==============

/categories

Create:

* Category list
* Add category
* Edit category
* Delete category
* Product count

Example categories:

* Mobile Covers
* Chargers
* Cables
* Earphones
* Headphones
* Power Banks
* Screen Protectors
* Mobile Stands
* Smart Watches
* Other Accessories

==================================================
11. STOCK
=========

/inventory

Show:

* Total stock
* Stock value
* Low stock
* Out of stock

Inventory table:

* Product
* SKU
* Current Stock
* Purchase Price
* Sale Price
* Stock Value
* Status

Actions:

* Adjust stock
* Stock history

==================================================
12. STOCK ADJUSTMENTS
=====================

/inventory/adjustments

Allow:

* Select product
* Current quantity
* Adjustment type:

  * Add
  * Remove
  * Damage
  * Lost
  * Correction
* Quantity
* Reason
* Notes

Show adjustment history.

==================================================
13. LOW STOCK
=============

/inventory/low-stock

Show products below minimum stock.

Columns:

* Product
* Current stock
* Minimum stock
* Supplier
* Status

Action:

* Create purchase

==================================================
14. PURCHASES
=============

/purchases

Table:

* Purchase #
* Date
* Supplier
* Items
* Total
* Paid
* Due
* Status
* Actions

Create purchase:

/purchases/new

Fields:

* Supplier
* Product
* Quantity
* Purchase price
* Discount
* Total
* Payment
* Due
* Notes

Automatically show:

* Subtotal
* Discount
* Grand total
* Paid
* Due

==================================================
15. PURCHASE RETURNS
====================

/purchase-returns

Features:

* Select purchase
* Select products
* Return quantity
* Reason
* Refund/adjust supplier balance

==================================================
16. CUSTOMERS
=============

/customers

Customer table:

* Name
* Phone
* Total Purchases
* Paid
* Due
* Last Purchase
* Actions

Features:

* Search
* Add customer
* Edit
* Delete
* View account
* Record payment

Customer details:

/customers/:id

Show:

* Customer information
* Total purchases
* Total paid
* Outstanding
* Sales history
* Payment history

Add payment modal.

==================================================
17. SUPPLIERS
=============

/suppliers

Supplier table:

* Supplier
* Phone
* Total Purchases
* Paid
* Due
* Last Purchase
* Actions

Supplier details:

/suppliers/:id

Show:

* Supplier information
* Purchase history
* Payment history
* Outstanding balance

==================================================
18. EXPENSES
============

/expenses

Expense categories:

* Rent
* Electricity
* Salary
* Transport
* Maintenance
* Internet
* Marketing
* Other

Table:

* Date
* Category
* Description
* Amount
* Payment Method
* Added By
* Actions

Add expense modal/page.

==================================================
19. REPORTS
===========

Create a Reports section with:

/reports/sales
/reports/purchases
/reports/profit-loss
/reports/inventory
/reports/customers
/reports/suppliers

Every report should have:

* Date range
* Filters
* Summary cards
* Table
* Export PDF
* Print

Sales Report:

* Total sales
* Number of invoices
* Average invoice
* Paid
* Due

Purchase Report:

* Total purchases
* Paid
* Due

Profit & Loss:

Revenue

* Cost of Goods Sold
* Gross Profit
* Expenses
* Net Profit

Inventory:

* Total products
* Stock value
* Low stock
* Out of stock

==================================================
20. USERS & ROLES
=================

/users

Roles:

Owner
Manager
Cashier
Staff

Table:

* Name
* Email
* Phone
* Role
* Status
* Last Login
* Actions

Add user.

Create permissions UI:

Sales
Purchases
Products
Inventory
Customers
Suppliers
Expenses
Reports
Settings

Each permission:

* View
* Create
* Edit
* Delete

==================================================
21. SHOP SETTINGS
=================

/settings/shop

Fields:

* Shop name
* Logo
* Phone
* Email
* Address
* City
* Currency
* Tax number

==================================================
22. INVOICE SETTINGS
====================

/settings/invoice

Settings:

* Invoice prefix
* Starting number
* Show logo
* Show customer phone
* Show address
* Footer message
* Terms & conditions

Live invoice preview.

==================================================
23. PRINTER SETTINGS
====================

/settings/printer

Create UI for:

* Thermal printer
* A4 printer
* Paper size
* Receipt width
* Auto print after sale
* Test print

Show printer connection status as mock UI.

==================================================
24. NOTIFICATION SETTINGS
=========================

/settings/notifications

Options:

* Low stock notification
* Daily sales summary
* Payment reminder
* Purchase reminder

Channels:

* Email
* SMS
* WhatsApp

For now use mock configuration UI only.

==================================================
25. SUBSCRIPTION
================

/settings/subscription

Show current plan.

Plans:

Starter:
Rs. 2,000/month

Business:
Rs. 3,000/month

Professional:
Rs. 5,000/month

Create pricing cards.

Features comparison.

Show:

* Current plan
* Billing date
* Usage
* Upgrade button
* Downgrade button
* Billing history

Do NOT integrate real payment yet.

==================================================
26. PROFILE
===========

/profile

Fields:

* Name
* Email
* Phone
* Profile picture

Security:

* Change password
* Active sessions

==================================================
27. NOTIFICATIONS
=================

Create notification dropdown/page.

Examples:

"iPhone 15 Cover is low in stock."

"Invoice #INV-1024 has an outstanding payment."

"Today's sales reached Rs. 100,000."

==================================================
28. GLOBAL SEARCH
=================

Create global search that can search:

* Products
* Customers
* Suppliers
* Invoices
* Purchases

Show categorized search results.

==================================================
29. INVOICE PREVIEW
===================

Create professional thermal receipt design.

Include:

Shop logo
Shop name
Phone
Address

Invoice number
Date
Cashier

Products
Qty
Price
Total

Subtotal
Discount
Grand Total
Paid
Due
Change

Payment method

Footer:
"Thank you for shopping with us!"

Include:

* Print
* Download PDF
* Share

==================================================
30. EMPTY / LOADING / ERROR STATES
==================================

Every major page should have:

* Loading skeleton
* Empty state
* Error state
* Success toast
* Confirmation modal

Examples:

"No products found."

"No sales recorded yet."

"Your inventory is empty."

==================================================
31. DESIGN SYSTEM
=================

Design should feel like a modern professional SaaS application.

Use:

* Clean cards
* Rounded corners
* Subtle borders
* Good spacing
* Clear typography
* Professional tables
* Consistent buttons
* Consistent form controls
* Accessible contrast
* Responsive layouts

Do not overuse colors.

Use icons from Lucide.

Create reusable components:

* DataTable
* PageHeader
* StatCard
* SearchInput
* FilterBar
* Modal
* ConfirmDialog
* ProductCard
* POSCart
* InvoicePreview
* EmptyState
* LoadingSkeleton
* StatusBadge
* DateRangePicker
* CurrencyInput

==================================================
32. MOCK DATA
=============

Create realistic Pakistani shop data.

Products:

* iPhone Covers
* Samsung Covers
* Type-C Cable
* Lightning Cable
* Fast Charger
* Wireless Earbuds
* Power Bank
* Screen Protector
* Mobile Stand
* Smart Watch

Customers:
Use realistic Pakistani names and phone numbers.

Suppliers:
Use realistic supplier names.

Prices should be in PKR.

==================================================
33. IMPORTANT UX REQUIREMENTS
=============================

The software is designed for shopkeepers, not developers.

Therefore:

* Keep navigation simple.
* Use clear labels.
* Avoid technical terminology.
* Make POS extremely fast.
* Make important actions visible.
* Use confirmation before destructive actions.
* Show success feedback after every important operation.
* Make tables easy to scan.
* Use responsive design.
* Make forms easy to understand.

==================================================
34. ROUTES
==========

Create these routes:

/login
/signup
/forgot-password
/reset-password
/onboarding

/dashboard

/pos
/sales
/sales/:id
/sale-returns

/purchases
/purchases/new
/purchase-returns

/products
/products/new
/products/:id
/products/:id/edit

/categories
/inventory
/inventory/adjustments
/inventory/low-stock

/customers
/customers/:id

/suppliers
/suppliers/:id

/expenses

/reports
/reports/sales
/reports/purchases
/reports/profit-loss
/reports/inventory
/reports/customers
/reports/suppliers

/users

/settings/shop
/settings/invoice
/settings/printer
/settings/notifications
/settings/subscription

/profile

==================================================
FINAL REQUIREMENT
=================

Build the complete frontend with all the pages above.

Make the application feel like a real commercial SaaS product rather than a simple UI prototype.

All pages must be connected through navigation.

Use mock data and local state so the user can navigate, add/edit/delete records, create mock sales, add products, create purchases, add expenses, view reports and test the POS flow.

Do not leave major pages as blank placeholders.

Prioritize:

1. POS
2. Inventory
3. Sales
4. Purchases
5. Customers/Suppliers
6. Expenses
7. Reports
8. Dashboard
9. Settings
10. SaaS subscription

## Development

Requires Node.js 20+ and npm.

```sh
npm install
npm run dev
```

App runs at http://localhost:3000.

## Build & deploy

```sh
npm run build
npm start
```

`npm run build` outputs a Nitro server to `.output/`. `npm start` runs `node .output/server/index.mjs`.

### Vercel (recommended)

This app is TanStack Start + Nitro and is ready for Vercel with zero extra build settings.

1. Push the repo to GitHub (already: `zaid-1221/shoppos`).
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
3. Confirm **Framework Preset** is **TanStack Start** (`vercel.json` sets this).
4. Leave Build Command / Output Directory as detected — do not override them.
5. Click **Deploy**.

No environment variables are required for the current mock/frontend-only app.

Optional local check of the Vercel Nitro preset:

```sh
npm run build:vercel
```

Or deploy from the CLI after `npm i -g vercel`:

```sh
vercel
vercel --prod
```

### Other Node hosts

Deploy the whole repo with `npm run build` as the build command and `npm start` as the start command to Railway, Render, DigitalOcean, or a VPS.
