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

// import TextField from '@mui/material/TextField';
// import Button from '@mui/material/Button';
// import Typography from '@mui/material/Typography';
// import Box from '@mui/material/Box';
// import Grid from '@mui/material/Grid'; // For layout of first/last name
// import Alert from '@mui/material/Alert';
// import CircularProgress from '@mui/material/CircularProgress';
// import MuiLink from '@mui/material/Link';

  return (
    // MUI: <Container component="main" maxWidth="xs"> <Box sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}> ... </Box> </Container>
    <div style={{ maxWidth: '450px', margin: 'auto', padding: '20px' }}>
      {/* MUI: <Typography component="h1" variant="h5">{t('signup.title', 'ایجاد حساب کاربری جدید')}</Typography> */}
      <h2>{t('signup.title', 'ایجاد حساب کاربری جدید')}</h2>
      {/* MUI: <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 3 }}> <Grid container spacing={2}> ... </Grid> </Box> */}
      <form onSubmit={handleSubmit}>
        {/* MUI:
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField name="firstName" fullWidth id="firstName" label={t('signup.firstNameLabel', 'نام')} value={firstName} onChange={(e) => setFirstName(e.target.value)} autoFocus />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField name="lastName" fullWidth id="lastName" label={t('signup.lastNameLabel', 'نام خانوادگی')} value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </Grid>
            </Grid>
        */}
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
        {/* MUI: <TextField margin="normal" required fullWidth id="email" label={t('signup.emailLabel', 'ایمیل')} name="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} sx={{ direction: 'ltr' }} /> */}
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
        {/* MUI: <TextField margin="normal" required fullWidth name="password" label={t('signup.passwordLabel', 'رمز عبور')} type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} sx={{ direction: 'ltr' }} /> */}
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
        {/* MUI: <TextField margin="normal" required fullWidth name="confirmPassword" label={t('signup.confirmPasswordLabel', 'تکرار رمز عبور')} type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} sx={{ direction: 'ltr' }} /> */}
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
        {/* Role selection typically not for public signup */}
        {/* MUI: {error && <Alert severity="error" sx={{ width: '100%', mt: 1 }}>{error}</Alert>} */}
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {/* MUI:
            <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} disabled={loading}>
              {loading ? <CircularProgress size={24} /> : t('signup.submitButton', 'ثبت نام')}
            </Button>
        */}
        <button type="submit" disabled={loading} style={{ padding: '10px 15px', width: '100%', marginTop: '10px' }}>
          {loading ? t('signup.loading', 'در حال ثبت نام...') : t('signup.submitButton', 'ثبت نام')}
        </button>
        {/* MUI: <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}><MuiLink component={Link} to="/login" variant="body2">{t('signup.alreadyHaveAccount', 'قبلاً ثبت نام کرده اید؟') + " " + t('signup.loginLink', 'وارد شوید')}</MuiLink></Typography> */}
      </form>
      <p style={{ marginTop: '15px' }}>
        {t('signup.alreadyHaveAccount', 'قبلاً ثبت نام کرده اید؟')} <Link to="/login">{t('signup.loginLink', 'وارد شوید')}</Link>
      </p>
    </div>
  );
};

export default SignupPage;
