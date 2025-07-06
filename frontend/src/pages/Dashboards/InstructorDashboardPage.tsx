import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

const InstructorDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <div>
      <h2>{t('instructorDashboard.title', 'داشبورد مدرس')}</h2>
      {user && <p>{t('instructorDashboard.welcome', 'خوش آمدید')}, {user.profile?.firstName || user.email}!</p>}
      <p>{t('instructorDashboard.info', 'در اینجا می توانید دوره های خود را مدیریت کنید، دانشجویان را پیگیری کرده و موارد دیگر را انجام دهید.')}</p>
      {/* TODO: List created courses, student enrollments, reviews, etc. */}
    </div>
  );
};

export default InstructorDashboardPage;
