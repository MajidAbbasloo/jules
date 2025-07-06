import React from 'react';
import { useTranslation } from 'react-i18next';

const HomePage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div>
      <h1>{t('homePage.title', 'به سامانه مدیریت یادگیری خوش آمدید')}</h1>
      <p>{t('homePage.description', 'دوره های متنوعی را در اینجا پیدا کنید و یادگیری خود را شروع کنید.')}</p>
      {/* TODO: Add course categories, featured courses, etc. */}
    </div>
  );
};

export default HomePage;
