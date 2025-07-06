import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

const StudentDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <div>
      <h2>{t('studentDashboard.title', 'داشبورد دانش آموز')}</h2>
      {user && <p>{t('studentDashboard.welcome', 'خوش آمدید')}, {user.profile?.firstName || user.email}!</p>}
      <p>{t('studentDashboard.info', 'در اینجا می توانید دوره های ثبت نام شده خود، پیشرفت و موارد دیگر را مشاهده کنید.')}</p>
      {/* TODO: List enrolled courses, progress, resume lesson, etc. */}
    </div>
  );
};

export default StudentDashboardPage;
