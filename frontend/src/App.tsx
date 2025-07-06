import React, { Suspense } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from './context/AuthContext';
import './App.css';

// Page Components (Lazy Loaded)
const HomePage = React.lazy(() => import('./pages/Common/HomePage'));
const LoginPage = React.lazy(() => import('./pages/Auth/LoginPage'));
const SignupPage = React.lazy(() => import('./pages/Auth/SignupPage'));
const StudentDashboardPage = React.lazy(() => import('./pages/Dashboards/StudentDashboardPage'));
const InstructorDashboardPage = React.lazy(() => import('./pages/Dashboards/InstructorDashboardPage'));
const ManageCoursesPage = React.lazy(() => import('./pages/Dashboards/Instructor/ManageCoursesPage'));
const ManageCourseContentPage = React.lazy(() => import('./pages/Dashboards/Instructor/ManageCourseContentPage'));
const LearningPage = React.lazy(() => import('./pages/Common/LearningPage'));
const CategoryCoursesPage = React.lazy(() => import('./pages/Common/CategoryCoursesPage'));
const UserProfilePage = React.lazy(() => import('./pages/User/UserProfilePage')); // New Import
const AdminDashboardPage = React.lazy(() => import('./pages/Dashboards/AdminDashboardPage'));
const CourseDetailsPage = React.lazy(() => import('./pages/Common/CourseDetailsPage'));
const NotFoundPage = React.lazy(() => import('./pages/Common/NotFoundPage'));


// ProtectedRoute component
interface ProtectedRouteProps {
  allowedRoles?: string[];
  children: React.ReactElement;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <div>Loading authentication state...</div>; // Or a spinner component
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // User is authenticated but does not have the required role
    // Redirect to a fallback page or their default dashboard
    // For simplicity, redirecting to home, but a dedicated "Access Denied" page is better.
    return <Navigate to="/" replace />;
  }

  return children;
};


function App() {
  const { t } = useTranslation();
  const { isAuthenticated, user, logout, loading } = useAuth();

  if (loading) {
    // Show a global loading spinner or a minimal layout while auth state is loading
    return <div style={{textAlign: 'center', padding: '50px', fontSize: '1.5rem'}}>{t('loadingApp', 'بارگذاری برنامه...')}</div>;
  }

  return (
    <Router>
      <div>
        <header style={{ padding: '1rem', backgroundColor: '#007bff', color: 'white' }}>
          <nav style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px', margin: '0 auto' }}>
            <div>
              <Link to="/" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}>{t('appName', 'LMS Platform')}</Link>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>{t('home', 'Home')}</Link>
              {!isAuthenticated ? (
                <>
                  <Link to="/login" style={{ color: 'white', textDecoration: 'none' }}>{t('login', 'Login')}</Link>
                  <Link to="/signup" style={{ color: 'white', textDecoration: 'none' }}>{t('signup', 'Signup')}</Link>
                </>
              ) : (
                <>
                  {user?.role === 'STUDENT' && <Link to="/dashboard/student" style={{ color: 'white', textDecoration: 'none' }}>{t('studentDashboard', 'Student Dashboard')}</Link>}
                  {user?.role === 'INSTRUCTOR' && <Link to="/dashboard/instructor" style={{ color: 'white', textDecoration: 'none' }}>{t('instructorDashboard', 'Instructor Dashboard')}</Link>}
                  {user?.role === 'ADMIN' && <Link to="/dashboard/admin" style={{ color: 'white', textDecoration: 'none' }}>{t('adminDashboard', 'Admin Dashboard')}</Link>}
                  <Link to="/profile/me" style={{ color: 'white', textDecoration: 'none', fontStyle: 'italic' }}>{t('myProfile', 'پروفایل من')}</Link>
                  <button onClick={logout} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>{t('logout', 'Logout')}</button>
                  {/* {user && <span style={{ fontStyle: 'italic' }}>{t('loggedInAs', 'Logged in as')}: {user.email} ({user.role})</span>} */}
                </>
              )}
              <Link to="/course/sample-course" style={{ color: 'white', textDecoration: 'none' }}>{t('sampleCourse', 'Sample Course')}</Link>
            </div>
          </nav>
        </header>

        <main style={{ padding: '1rem', maxWidth: '1200px', margin: '20px auto' }}>
          <Suspense fallback={<div style={{textAlign: 'center', padding: '20px'}}>{t('loadingPage', 'بارگذاری صفحه...')}</div>}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />} />
              <Route path="/signup" element={isAuthenticated ? <Navigate to="/" /> : <SignupPage />} />
              <Route path="/profile/me" element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} />

              <Route
                path="/dashboard/student"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT', 'ADMIN']}>
                    <StudentDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/instructor" // Parent route for instructor dashboard
                element={
                  <ProtectedRoute allowedRoles={['INSTRUCTOR', 'ADMIN']}>
                    <InstructorDashboardPage />
                  </ProtectedRoute>
                }
              >
                {/* Nested routes for instructor dashboard */}
                <Route index element={ <div style={{padding: '10px', background: '#e9ecef', border: '1px solid #ced4da', borderRadius: '5px'}}>{t('instructorDashboard.welcomeText', 'به داشبورد خود خوش آمدید. برای مدیریت دوره ها، لینک بالا را انتخاب کنید.')}</div> } /> {/* Default content for /dashboard/instructor */}
                <Route path="courses" element={<ManageCoursesPage />} />
                <Route path="course/:courseId/content" element={<ManageCourseContentPage />} />
                {/* Add more nested routes here e.g., analytics, profile */}
              </Route>
              <Route
                path="/dashboard/admin"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminDashboardPage />
                  </ProtectedRoute>
                }
              />

              <Route path="/course/:courseId" element={<CourseDetailsPage />} />
              />

              <Route path="/learn/course/:courseId"
                element={
                  <ProtectedRoute>
                    <LearningPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/category/:categorySlug" element={<CategoryCoursesPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </main>
        <footer style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f8f9fa', borderTop: '1px solid #dee2e6', marginTop: '2rem' }}>
          <p>&copy; {new Date().getFullYear()} {t('appName', 'LMS Platform')}. {t('allRightsReserved', 'All rights reserved.')}</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
