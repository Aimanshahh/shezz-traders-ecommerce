// Two account kinds live in the Admin collection: the owner (Administrator) and staff
// who may only submit sales. Keeping one collection avoids a second auth system.
export const ROLE_ADMIN = 'Administrator'
export const ROLE_SALESPERSON = 'Salesperson'

export const isSalespersonRole = (role) =>
  String(role || '').trim().toLowerCase() === 'salesperson'

// Anything that is not explicitly a salesperson keeps full admin rights, so existing
// accounts created before this field existed are never locked out.
export const isAdminRole = (role) => !isSalespersonRole(role)
