import { HashRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { ProductsList } from './pages/products/ProductsList';
import { ProductWizard } from './pages/products/ProductWizard';
import { OrdersList } from './pages/orders/OrdersList';
import { OrderDetail } from './pages/orders/OrderDetail';
import { EventsList } from './pages/events/EventsList';
import { EventWizard } from './pages/events/EventWizard';
import { GalleryList } from './pages/gallery/GalleryList';
import { GalleryAlbumDetail } from './pages/gallery/GalleryAlbumDetail';
import { SiteImages } from './pages/settings/SiteImages';

function Protected({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Protected><Dashboard /></Protected>} />
          <Route path="/products" element={<Protected><ProductsList /></Protected>} />
          <Route path="/products/new" element={<Protected><ProductWizard /></Protected>} />
          <Route path="/products/:id" element={<Protected><ProductWizard /></Protected>} />
          <Route path="/orders" element={<Protected><OrdersList /></Protected>} />
          <Route path="/orders/:id" element={<Protected><OrderDetail /></Protected>} />
          <Route path="/events" element={<Protected><EventsList /></Protected>} />
          <Route path="/events/new" element={<Protected><EventWizard /></Protected>} />
          <Route path="/events/:id" element={<Protected><EventWizard /></Protected>} />
          <Route path="/gallery" element={<Protected><GalleryList /></Protected>} />
          <Route path="/gallery/:id" element={<Protected><GalleryAlbumDetail /></Protected>} />
          <Route path="/settings" element={<Protected><SiteImages /></Protected>} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
