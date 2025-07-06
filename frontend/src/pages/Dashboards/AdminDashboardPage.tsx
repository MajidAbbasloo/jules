import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

const AdminDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <div>
      <h2>{t('adminDashboard.title', 'داشبورد ادمین')}</h2>
      {user && <p>{t('adminDashboard.welcome', 'خوش آمدید')}, {user.profile?.firstName || user.email}!</p>}
      <p>{t('adminDashboard.info', 'در اینجا می توانید کاربران، دوره ها، دسته بندی ها و تنظیمات سیستم را مدیریت کنید.')}</p>
      {/* TODO: Links to user management, course approval, analytics, etc. */}
    </div>
  );
};

export default AdminDashboardPage;
