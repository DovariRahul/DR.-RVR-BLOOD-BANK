import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import Home from './pages/Home/Home';
import Login from './pages/Auth/Login';
import SignUp from './pages/Auth/SignUp';
import BloodRequest from './pages/BloodRequest/BloodRequest';
import RequestStatus from './pages/RequestStatus/RequestStatus';
import DonorRegistration from './pages/DonorRegistration/DonorRegistration';
import DonorProfile from './pages/DonorProfile/DonorProfile';
import AdminDashboard from './pages/Admin/AdminDashboard';

function App() {
  return (
    <Router>
      <ToastProvider>
        <AuthProvider>
          <div className="app-container">
            <Navbar />
            <main>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<SignUp />} />

                {/* Patient / General Authenticated Routes */}
                <Route 
                  path="/request" 
                  element={
                    <ProtectedRoute>
                      <BloodRequest />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/request/:id/status" 
                  element={
                    <ProtectedRoute>
                      <RequestStatus />
                    </ProtectedRoute>
                  } 
                />

                {/* Donor Routes */}
                <Route path="/register/donor" element={<DonorRegistration />} />
                <Route 
                  path="/donor/profile" 
                  element={
                    <ProtectedRoute roles={['donor']}>
                      <DonorProfile />
                    </ProtectedRoute>
                  } 
                />

                {/* Admin Routes */}
                <Route 
                  path="/admin/*" 
                  element={
                    <ProtectedRoute roles={['admin']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  } 
                />
              </Routes>
            </main>
            <Footer />
          </div>
        </AuthProvider>
      </ToastProvider>
    </Router>
  );
}

export default App;
