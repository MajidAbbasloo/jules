import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { REGISTER_MUTATION } from '../../graphql/mutations';
import { useTranslation } from 'react-i18next';

// Mock UserRole enum, actual values should match backend GraphQL enum
enum ClientUserRole {
  STUDENT = "STUDENT",
  INSTRUCTOR = "INSTRUCTOR",
  // ADMIN role typically not selectable by users during public signup
}

const SignupPage: React.FC = () => {
  const { t } = useTranslation();
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  // const [role, setRole] = useState<ClientUserRole>(ClientUserRole.STUDENT); // Default role
  const [error, setError] = useState('');

  const [registerUser, { loading }] = useMutation(REGISTER_MUTATION, {
    onCompleted: (data) => {
      const { token, user } = data.register;
      authLogin(token, user); // Update auth context after registration
      // Redirect based on role, typically to student dashboard or a welcome/verify email page
      navigate('/dashboard/student'); // Or a more appropriate page like /verify-email
    },
    onError: (apolloError) => {
      setError(apolloError.message || t('signup.failed'));
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError(t('signup.passwordsDoNotMatch', 'رمزهای عبور یکسان نیستند.'));
      return;
    }
    if (!email || !password) {
      setError(t('signup.emailPasswordRequired', 'ایمیل و رمز عبور الزامی است.'));
      return;
    }
    // Role is not typically set by user during public signup, defaults on backend
    try {
      await registerUser({ variables: { email, password, firstName, lastName /* role: role */ } });
    } catch (err) {
      // Error is handled by onError callback
    }
  };

  return (
    <div style={{ maxWidth: '450px', margin: 'auto', padding: '20px' }}>
      <h2>{t('signup.title', 'ایجاد حساب کاربری جدید')}</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="firstName">{t('signup.firstNameLabel', 'نام')}:</label>
          <input
            type="text"
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="lastName">{t('signup.lastNameLabel', 'نام خانوادگی')}:</label>
          <input
            type="text"
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="email">{t('signup.emailLabel', 'ایمیل')}:</label>
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
          <label htmlFor="password">{t('signup.passwordLabel', 'رمز عبور')}:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{ width: '100%', padding: '8px', direction: 'ltr' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="confirmPassword">{t('signup.confirmPasswordLabel', 'تکرار رمز عبور')}:</label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', direction: 'ltr' }}
          />
        </div>
        {/* Role selection typically not for public signup
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="role">نقش:</label>
          <select id="role" value={role} onChange={(e) => setRole(e.target.value as ClientUserRole)} style={{ width: '100%', padding: '8px' }}>
            <option value={ClientUserRole.STUDENT}>دانش آموز</option>
            <option value={ClientUserRole.INSTRUCTOR}>مدرس</option>
          </select>
        </div>
        */}
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ padding: '10px 15px' }}>
          {loading ? t('signup.loading', 'در حال ثبت نام...') : t('signup.submitButton', 'ثبت نام')}
        </button>
      </form>
      <p style={{ marginTop: '15px' }}>
        {t('signup.alreadyHaveAccount', 'قبلاً ثبت نام کرده اید؟')} <Link to="/login">{t('signup.loginLink', 'وارد شوید')}</Link>
      </p>
    </div>
  );
};

export default SignupPage;
