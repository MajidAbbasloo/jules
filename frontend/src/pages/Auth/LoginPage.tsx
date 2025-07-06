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
      // TODO: Replace with toast notification - e.g., toast.error(apolloError.message || t('login.failed'));
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

// import TextField from '@mui/material/TextField';
// import Button from '@mui/material/Button';
// import Typography from '@mui/material/Typography';
// import Box from '@mui/material/Box';
// import Alert from '@mui/material/Alert';
// import CircularProgress from '@mui/material/CircularProgress';
// import MuiLink from '@mui/material/Link'; // To distinguish from react-router Link

  return (
    // MUI: <Container component="main" maxWidth="xs"> <Box sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}> ... </Box> </Container>
    <div style={{ maxWidth: '400px', margin: 'auto', padding: '20px' }}>
      {/* MUI: <Typography component="h1" variant="h5">{t('login.title', 'ورود به حساب کاربری')}</Typography> */}
      <h2>{t('login.title', 'ورود به حساب کاربری')}</h2>
      {/* MUI: <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}> */}
      <form onSubmit={handleSubmit}>
        {/* MUI: <TextField margin="normal" required fullWidth id="email" label={t('login.emailLabel', 'ایمیل')} name="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} sx={{ direction: 'ltr' }} /> */}
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
        {/* MUI: <TextField margin="normal" required fullWidth name="password" label={t('login.passwordLabel', 'رمز عبور')} type="password" id="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} sx={{ direction: 'ltr' }} /> */}
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
        {/* MUI: {error && <Alert severity="error" sx={{ width: '100%', mt: 1 }}>{error}</Alert>} */}
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {/* MUI:
            <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} disabled={loading}>
              {loading ? <CircularProgress size={24} /> : t('login.submitButton', 'ورود')}
            </Button>
        */}
        <button type="submit" disabled={loading} style={{ padding: '10px 15px', width: '100%', marginTop: '10px' }}>
          {loading ? t('login.loading', 'در حال ورود...') : t('login.submitButton', 'ورود')}
        </button>
        {/* MUI: <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>{t('login.noAccount', 'حساب کاربری ندارید؟')} <MuiLink component={Link} to="/signup" variant="body2">{t('login.signupLink', 'ثبت نام کنید')}</MuiLink></Typography> */}
      </form>
      <p style={{ marginTop: '15px' }}>
        {t('login.noAccount', 'حساب کاربری ندارید؟')} <Link to="/signup">{t('login.signupLink', 'ثبت نام کنید')}</Link>
      </p>
    </div>
  );
};

export default LoginPage;
