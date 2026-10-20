import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Layout from './components/layout/Layout.jsx'
import Home from './pages/Home.jsx'
import Shop from './pages/shop.jsx'
import ProductDetail from './pages/Productdetails.jsx'
import About from './pages/About.jsx'
import Contact from './pages/Contact.jsx'
import Privacy from './pages/Privacy.jsx'
import Terms from './pages/Terms.jsx'
import Cart from './pages/Cart.jsx'
import Checkout from './pages/Checkout.jsx'
import OrderConfirmation from './pages/OrderConfirmation.jsx'
import ScrollToTop from './components/layout/ScrollToTop.jsx'

// Admin
import AdminLogin from './pages/admin/AdminLogin.jsx'
import AdminStaff from './pages/admin/AdminStaff.jsx'
import AdminSaleReview from './pages/admin/AdminSaleReview.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import AdminProducts from './pages/admin/AdminProducts.jsx'
import AdminProductForm from './pages/admin/AdminProductForm.jsx'
import AdminCategories from './pages/admin/AdminCategories.jsx'
import AdminOrders from './pages/admin/AdminOrders.jsx'

// Device Management (CRM)
import AdminDevices from './pages/admin/Admindevices.jsx'
import AdminDeviceImport from './pages/admin/AdminDeviceImport.jsx'
import AdminDeviceDetail from './pages/admin/Admindevicedetail.jsx'
import AdminBoxes from './pages/admin/AdminBoxes.jsx'
import AdminBoxDetail from './pages/admin/AdminBoxDetail.jsx'
import AdminNewSale from './pages/admin/AdminNewSale.jsx'
import AdminSales from './pages/admin/AdminSales.jsx'
import AdminInvoice from './pages/admin/AdminInvoice.jsx'
import AdminCustomers from './pages/admin/Admincustomers.jsx'
import AdminCustomerDetail from './pages/admin/Admincustomerdetail.jsx'
import AdminStatement from './pages/admin/Adminstatement.jsx'
import AdminHandover from './pages/admin/Adminhandover.jsx'
import AdminCrmSettings from './pages/admin/AdminCrmSettings.jsx'
import AdminReturns from './pages/admin/AdminReturns.jsx'
import AdminReturnNew from './pages/admin/AdminReturnNew.jsx'
import AdminReturnDetail from './pages/admin/AdminReturnDetail.jsx'
import AdminReports from './pages/admin/AdminReports.jsx'

// Salesperson
import StaffLogin from './pages/staff/StaffLogin.jsx'
import StaffNewSale from './pages/staff/StaffNewSale.jsx'
import StaffSales from './pages/staff/StaffSales.jsx'
import StaffSaleDetail from './pages/staff/StaffSaleDetail.jsx'
import { STAFF_SHELL } from './lib/stockShell.js'

function PublicLayout({ children }) {
  return <Layout>{children}</Layout>
}

function AdminRoutes() {
  return (
    <Routes>
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/products" element={<AdminProducts />} />
      <Route path="/admin/products/new" element={<AdminProductForm />} />
      <Route path="/admin/products/:id/edit" element={<AdminProductForm />} />
      <Route path="/admin/categories" element={<AdminCategories />} />
      <Route path="/admin/orders" element={<AdminOrders />} />

      {/* CRM: Devices / IMEI */}
      <Route path="/admin/devices" element={<AdminDevices />} />
      <Route path="/admin/devices/import" element={<AdminDeviceImport />} />
      <Route path="/admin/devices/:id" element={<AdminDeviceDetail />} />
      <Route path="/admin/boxes" element={<AdminBoxes />} />
      <Route path="/admin/boxes/:id" element={<AdminBoxDetail />} />
      <Route path="/admin/sales" element={<AdminSales />} />
      <Route path="/admin/sales/new" element={<AdminNewSale />} />
      <Route path="/admin/sales/:id/review" element={<AdminSaleReview />} />
      <Route path="/admin/sales/:id" element={<AdminInvoice />} />
      <Route path="/admin/customers" element={<AdminCustomers />} />
      <Route path="/admin/customers/:id" element={<AdminCustomerDetail />} />
      <Route path="/admin/customers/:id/statement" element={<AdminStatement />} />
      <Route path="/admin/handover" element={<AdminHandover />} />
      <Route path="/admin/crm-settings" element={<AdminCrmSettings />} />
      <Route path="/admin/returns" element={<AdminReturns />} />
      <Route path="/admin/returns/new" element={<AdminReturnNew />} />
      <Route path="/admin/returns/:id" element={<AdminReturnDetail />} />
      <Route path="/admin/reports" element={<AdminReports />} />
      <Route path="/admin/staff" element={<AdminStaff />} />
    </Routes>
  )
}

function StaffRoutes() {
  return (
    <Routes>
      <Route path="/staff" element={<StaffLogin />} />
      <Route path="/staff/new" element={<StaffNewSale />} />
      <Route path="/staff/sales" element={<StaffSales />} />
      <Route path="/staff/sales/:id" element={<StaffSaleDetail />} />

      {/* Stock screens — the same ones the admin uses, rendered in the staff shell */}
      <Route path="/staff/devices" element={<AdminDevices shell={STAFF_SHELL} />} />
      <Route path="/staff/devices/import" element={<AdminDeviceImport shell={STAFF_SHELL} />} />
      <Route path="/staff/devices/:id" element={<AdminDeviceDetail shell={STAFF_SHELL} />} />
      <Route path="/staff/boxes" element={<AdminBoxes shell={STAFF_SHELL} />} />
      <Route path="/staff/boxes/:id" element={<AdminBoxDetail shell={STAFF_SHELL} />} />

      {/* Returns & warranty — salespeople log claims, the admin settles them */}
      <Route path="/staff/returns" element={<AdminReturns shell={STAFF_SHELL} />} />
      <Route path="/staff/returns/new" element={<AdminReturnNew shell={STAFF_SHELL} />} />
      <Route path="/staff/returns/:id" element={<AdminReturnDetail shell={STAFF_SHELL} />} />
    </Routes>
  )
}

function AppRoutes() {
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin')
  const isStaffRoute = location.pathname.startsWith('/staff')

  if (isAdminRoute) {
    return <AdminRoutes />
  }

  if (isStaffRoute) {
    return <StaffRoutes />
  }

  return (
    <PublicLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-confirmation/:id" element={<OrderConfirmation />} />
      </Routes>
    </PublicLayout>
  )
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AppRoutes />
    </BrowserRouter>
  )
}

export default App