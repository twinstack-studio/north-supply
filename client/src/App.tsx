import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './context/ToastContext';
import { WishlistProvider } from './context/WishlistContext';
import {
  AccountLayout,
  AddressesPage,
  OrdersPage,
  ProfilePage,
  ReturnsPage,
  WishlistPage,
} from './pages/AccountPages';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { HelpPage } from './pages/HelpPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OrderPage } from './pages/OrderPage';
import { ForgotPasswordPage, ResetPasswordPage } from './pages/PasswordResetPages';
import { ReturnRequestPage } from './pages/ReturnRequestPage';
import { ProductPage } from './pages/ProductPage';
import { ShopPage } from './pages/ShopPage';
import { TrackOrderPage } from './pages/TrackOrderPage';
import { AdminCouponsPage } from './pages/admin/AdminCouponsPage';
import { AdminCustomersPage } from './pages/admin/AdminCustomersPage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';
import { AdminProductsPage } from './pages/admin/AdminProductsPage';
import { AdminReturnsPage } from './pages/admin/AdminReturnsPage';
import { DashboardPage } from './pages/admin/DashboardPage';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <WishlistProvider>
            <CartProvider>
              <Routes>
                {/* Storefront */}
                <Route element={<Layout />}>
                  <Route index element={<HomePage />} />
                  <Route path="shop" element={<ShopPage />} />
                  <Route path="product/:slug" element={<ProductPage />} />
                  <Route path="cart" element={<CartPage />} />
                  <Route path="checkout" element={<CheckoutPage />} />
                  <Route path="order/:orderNumber" element={<OrderPage />} />
                  <Route path="order/:orderNumber/return" element={<ReturnRequestPage />} />
                  <Route path="track" element={<TrackOrderPage />} />
                  <Route path="help" element={<HelpPage />} />
                  <Route path="login" element={<LoginPage />} />
                  <Route path="register" element={<RegisterPage />} />
                  <Route path="forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="reset-password" element={<ResetPasswordPage />} />

                  {/* Signed-in customer area */}
                  <Route element={<ProtectedRoute />}>
                    <Route path="account" element={<AccountLayout />}>
                      <Route index element={<ProfilePage />} />
                      <Route path="orders" element={<OrdersPage />} />
                      <Route path="returns" element={<ReturnsPage />} />
                      <Route path="addresses" element={<AddressesPage />} />
                      <Route path="wishlist" element={<WishlistPage />} />
                    </Route>
                  </Route>

                  <Route path="*" element={<NotFoundPage />} />
                </Route>

                {/* Admin -- own chrome, no storefront header/footer */}
                <Route element={<ProtectedRoute adminOnly />}>
                  <Route path="admin" element={<AdminLayout />}>
                    <Route index element={<DashboardPage />} />
                    <Route path="products" element={<AdminProductsPage />} />
                    <Route path="orders" element={<AdminOrdersPage />} />
                    <Route path="returns" element={<AdminReturnsPage />} />
                    <Route path="customers" element={<AdminCustomersPage />} />
                    <Route path="coupons" element={<AdminCouponsPage />} />
                    <Route path="*" element={<Navigate to="/admin" replace />} />
                  </Route>
                </Route>
              </Routes>
            </CartProvider>
          </WishlistProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
