import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../context/AuthContext';
import { Link, Outlet, useLocation } from 'react-router-dom';

const InstructorDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();

  // Determine if the current view is the main dashboard or a sub-page like ManageCourses
  const isBaseInstructorDashboard = location.pathname === '/dashboard/instructor' || location.pathname === '/dashboard/instructor/';


  return (
    <div>
      <h2>{t('instructorDashboard.title', 'داشبورد مدرس')}</h2>
      {user && <p>{t('instructorDashboard.welcomeMessage', 'خوش آمدید')}, {user.profile?.firstName || user.email}!</p>}

      {/* MUI: <Button component={Link} to="/profile/me" variant="outlined" sx={{ my: 2 }}>{t('myProfile', 'پروفایل من')}</Button> */}
      <div style={{ margin: "15px 0" }}>
        <Link to="/profile/me" style={{ textDecoration: 'none', padding: '8px 15px', border: '1px solid #007bff', borderRadius: '4px', color: '#007bff', marginRight: '15px' }}>
          {t('myProfile', 'پروفایل من')}
        </Link>
      </div>

      <nav style={{ marginBottom: '20px', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
        <Link to="/dashboard/instructor/courses" style={{ marginRight: '15px' }}>
          {t('instructorDashboard.manageCoursesLink', 'مدیریت دوره ها')}
        </Link>
        {/* Add other links like "Analytics", "Payouts", "Q&A" later */}
      </nav>

      {isBaseInstructorDashboard && (
        <p>{t('instructorDashboard.info', 'از طریق لینک های بالا، بخش مورد نظر خود را انتخاب کنید.')}</p>
        // TODO: Display summary stats or quick actions here for the base dashboard view
      )}

      <Outlet /> {/* This is where nested route components will render */}
    </div>
  );
};

export default InstructorDashboardPage;
