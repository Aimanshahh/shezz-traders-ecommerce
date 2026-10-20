// The stock screens (devices / IMEI, boxes & cartons, bulk import) are shared between
// the admin panel and the salesperson area. A "shell" tells a page which layout to
// render inside, which route base to build links with, which sign-in check protects
// it, and which actions the signed-in role may use.
import AdminLayout from '../pages/admin/AdminLayout.jsx'
import StaffLayout from '../pages/staff/StaffLayout.jsx'
import { isAdminLoggedIn } from './adminAuth.js'
import { isStaffLoggedIn } from './staffAuth.js'

export const ADMIN_SHELL = {
  Layout: AdminLayout,
  base: '/admin',
  isLoggedIn: isAdminLoggedIn,
  loginTo: '/admin',
  canDelete: true,
  // Returns & warranty: the admin settles claims (refunds, replacements, cancellations).
  canResolveReturns: true,
  // Money is shown on the return case screens.
  canSeeMoney: true,
  // The admin panel also has sales, customers, returns and reports screens.
  adminLinks: true,
}

export const STAFF_SHELL = {
  Layout: StaffLayout,
  base: '/staff',
  isLoggedIn: isStaffLoggedIn,
  loginTo: '/staff',
  // A salesperson keeps stock up to date but never removes records for good.
  canDelete: false,
  // Salespeople intake and track warranty claims; a manager settles them.
  canResolveReturns: false,
  // No prices on the returns screens, matching the rest of the salesperson area.
  canSeeMoney: false,
  // No sales or customer ledger screens exist for salespeople, so any link that would
  // lead there is shown as plain text instead.
  adminLinks: false,
}
