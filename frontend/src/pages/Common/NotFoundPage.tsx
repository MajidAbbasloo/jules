import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const NotFoundPage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h1>{t('notFound.title', '404 - صفحه یافت نشد')}</h1>
      <p>{t('notFound.message', 'متاسفانه صفحه ای که به دنبال آن بودید وجود ندارد.')}</p>
      <Link to="/">{t('notFound.goHome', 'بازگشت به صفحه اصلی')}</Link>
    </div>
  );
};

export default NotFoundPage;
