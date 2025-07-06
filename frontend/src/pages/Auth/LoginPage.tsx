import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LOGIN_MUTATION } from '../../graphql/mutations';
import { useTranslation } from 'react-i18next';

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [loginUser, { loading }] = useMutation(LOGIN_MUTATION, {
    onCompleted: (data) => {
      const { token, user } = data.login;
      authLogin(token, user); // Update auth context
      // Redirect based on role
      switch (user.role) {
        case 'ADMIN':
          navigate('/dashboard/admin');
          break;
        case 'INSTRUCTOR':
          navigate('/dashboard/instructor');
          break;
        default:
          navigate('/dashboard/student');
      }
    },
    onError: (apolloError) => {
      setError(apolloError.message || t('login.failed'));
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError(t('login.emailPasswordRequired'));
      return;
    }
    try {
      await loginUser({ variables: { email, password } });
    } catch (err) {
      // Error is handled by onError callback
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: 'auto', padding: '20px' }}>
      <h2>{t('login.title', 'ورود به حساب کاربری')}</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="email">{t('login.emailLabel', 'ایمیل')}:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', direction: 'ltr' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="password">{t('login.passwordLabel', 'رمز عبور')}:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', direction: 'ltr' }}
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ padding: '10px 15px' }}>
          {loading ? t('login.loading', 'در حال ورود...') : t('login.submitButton', 'ورود')}
        </button>
      </form>
      <p style={{ marginTop: '15px' }}>
        {t('login.noAccount', 'حساب کاربری ندارید؟')} <Link to="/signup">{t('login.signupLink', 'ثبت نام کنید')}</Link>
      </p>
    </div>
  );
};

export default LoginPage;
