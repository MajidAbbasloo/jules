import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@apollo/client';
import { useAuth } from '../../context/AuthContext';
import { GET_ME_WITH_COURSES as GET_ME } from '../../graphql/queries'; // Reusing GET_ME as it fetches profile
import { UPDATE_USER_PROFILE_MUTATION, GET_MOCK_UPLOAD_URL_MUTATION } from '../../graphql/mutations';

// MUI Placeholder imports
// import Typography from '@mui/material/Typography';
// import Box from '@mui/material/Box';
// import TextField from '@mui/material/TextField';
// import Button from '@mui/material/Button';
// import Avatar from '@mui/material/Avatar';
// import Paper from '@mui/material/Paper';
// import CircularProgress from '@mui/material/CircularProgress';
// import Alert from '@mui/material/Alert';

interface ProfileFormData {
  firstName: string;
  lastName: string;
  bio: string;
  avatarUrl: string;
}

const UserProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const { user, loading: authLoading, login: updateAuthContextUser } = useAuth(); // Assuming login can update user in context

  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: '',
    lastName: '',
    bio: '',
    avatarUrl: '',
  });
  const [avatarFileStatus, setAvatarFileStatus] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch current user data, including profile
  // The 'me' query from AuthContext might already have this, but for explicit page load:
  const { data: meData, loading: meLoading, refetch: refetchMe } = useQuery(GET_ME, {
    skip: !user, // Skip if user from AuthContext is not yet available
    onCompleted: (data) => {
      if (data?.me?.profile) {
        setFormData({
          firstName: data.me.profile.firstName || '',
          lastName: data.me.profile.lastName || '',
          bio: data.me.profile.bio || '',
          avatarUrl: data.me.profile.avatarUrl || '',
        });
      } else if (data?.me) { // User exists but no profile yet
         setFormData({ firstName: '', lastName: '', bio: '', avatarUrl: '' });
      }
    },
  });

  const [updateUserProfile, { loading: updatingProfile }] = useMutation(UPDATE_USER_PROFILE_MUTATION, {
    onCompleted: (data) => {
      // TODO: Replace setFormMessage with toast notification - e.g., toast.success(t('profilePage.updateSuccess'));
      setFormMessage({ type: 'success', message: t('profilePage.updateSuccess', 'پروفایل با موفقیت به‌روزرسانی شد.') });
      refetchMe();
      if (user && data.updateUserProfile) {
        const updatedUser = { ...user, profile: { ...user.profile, ...data.updateUserProfile } };
        // Ideally, AuthContext has a dedicated updateUser method.
        // If login function is used to update context:
        // updateAuthContextUser(localStorage.getItem('authToken'), updatedUser);
      }
    },
    onError: (error) => {
      // TODO: Replace setFormMessage with toast notification - e.g., toast.error(error.message || t('profilePage.updateError'));
      setFormMessage({ type: 'error', message: error.message || t('profilePage.updateError', 'خطا در به‌روزرسانی پروفایل.') });
    }
  });

  const [getMockUploadUrl, { loading: uploadingAvatar }] = useMutation(GET_MOCK_UPLOAD_URL_MUTATION);

  useEffect(() => {
    // Pre-fill form if user data from AuthContext is already available and meData hasn't loaded yet
    if (user?.profile && !meData?.me?.profile) {
      setFormData({
        firstName: user.profile.firstName || '',
        lastName: user.profile.lastName || '',
        bio: user.profile.bio || '',
        avatarUrl: user.profile.avatarUrl || '',
      });
    }
  }, [user, meData]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFileStatus(t('uploadingFile', 'در حال پردازش فایل...'));
      setFormMessage(null);
      try {
        const response = await getMockUploadUrl({ variables: { filename: file.name, fileType: file.type } });
        const mockUrl = response.data?.getMockUploadUrl;
        if (mockUrl) {
          setFormData(prev => ({ ...prev, avatarUrl: mockUrl }));
          setAvatarFileStatus(t('fileSelected', 'فایل انتخاب شد: ') + file.name + t('mockUrlNotice', ' (URL شبیه‌سازی شده)'));
        } else {
          setAvatarFileStatus(t('uploadError', 'خطا در دریافت URL شبیه‌سازی شده.'));
        }
      } catch (err: any) {
        setAvatarFileStatus(t('uploadError', 'خطا در پردازش فایل: ') + err.message);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormMessage(null);
    updateUserProfile({ variables: { ...formData } });
  };

  if (authLoading || meLoading) return <p>{t('loading', 'در حال بارگذاری اطلاعات کاربری...')}</p>; // MUI: <CircularProgress />
  if (!user) return <p>{t('profilePage.notLoggedIn', 'برای مشاهده پروفایل، لطفا وارد شوید.')}</p>; // Should be caught by ProtectedRoute

  const currentAvatar = formData.avatarUrl || user?.profile?.avatarUrl;


  return (
    // MUI: <Container maxWidth="md" sx={{py:3}}> <Paper elevation={3} sx={{p:3}}> ... </Paper> </Container>
    <div style={{ maxWidth: '600px', margin: 'auto', padding: '20px' }}>
      {/* MUI: <Typography variant="h4" gutterBottom>{t('profilePage.title', 'پروفایل کاربری')}</Typography> */}
      <h2>{t('profilePage.title', 'پروفایل کاربری')}</h2>

      {/* MUI: <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}> <Avatar src={currentAvatar || undefined} sx={{ width: 80, height: 80, mr: 2 }}>{formData.firstName?.[0] || user?.email?.[0]}</Avatar> <Typography variant="h6">{user.email}</Typography> </Box> */}
      <div style={{display: 'flex', alignItems: 'center', marginBottom: '20px'}}>
        <img src={currentAvatar || `https://via.placeholder.com/80?text=${(formData.firstName?.[0] || user.email[0] || 'U').toUpperCase()}`} alt="Avatar" style={{width: '80px', height: '80px', borderRadius: '50%', marginRight: '20px', objectFit: 'cover', border: '2px solid #ccc'}}/>
        <p style={{fontSize: '1.2em', fontWeight: 'bold'}}>{user.email}</p>
      </div>

      {formMessage && (
        // MUI: <Alert severity={formMessage.type} sx={{mb:2}}>{formMessage.message}</Alert>
        <p style={{ color: formMessage.type === 'success' ? 'green' : 'red', border: `1px solid ${formMessage.type === 'success' ? 'green' : 'red'}`, padding: '10px', marginBottom: '15px' }}>
          {formMessage.message}
        </p>
      )}

      {/* MUI: <Box component="form" onSubmit={handleSubmit} noValidate sx={{ '& .MuiTextField-root': { my: 1 } }}> */}
      <form onSubmit={handleSubmit}>
        {/* MUI: <TextField fullWidth label={t('profilePage.firstName', 'نام')} name="firstName" value={formData.firstName} onChange={handleChange} /> */}
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="firstName" style={{display:'block', marginBottom:'5px'}}>{t('profilePage.firstName', 'نام')}:</label>
          <input type="text" id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} style={{width: 'calc(100% - 16px)', padding:'8px'}}/>
        </div>

        {/* MUI: <TextField fullWidth label={t('profilePage.lastName', 'نام خانوادگی')} name="lastName" value={formData.lastName} onChange={handleChange} /> */}
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="lastName" style={{display:'block', marginBottom:'5px'}}>{t('profilePage.lastName', 'نام خانوادگی')}:</label>
          <input type="text" id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} style={{width: 'calc(100% - 16px)', padding:'8px'}}/>
        </div>

        {/* MUI: <TextField fullWidth multiline rows={4} label={t('profilePage.bio', 'درباره من')} name="bio" value={formData.bio} onChange={handleChange} /> */}
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="bio" style={{display:'block', marginBottom:'5px'}}>{t('profilePage.bio', 'درباره من')}:</label>
          <textarea id="bio" name="bio" value={formData.bio} onChange={handleChange} style={{width: 'calc(100% - 16px)', minHeight:'80px', padding:'8px'}}/>
        </div>

        {/* MUI: <TextField fullWidth label={t('profilePage.avatarUrl', 'آدرس تصویر آواتار')} name="avatarUrl" value={formData.avatarUrl} onChange={handleChange} placeholder={t('profilePage.avatarUrlPlaceholder', 'یا URL تصویر را وارد کنید')} /> */}
        <div style={{ marginBottom: '10px' }}>
            <label htmlFor="avatarUrl" style={{display:'block', marginBottom:'5px'}}>{t('profilePage.avatarUrl', 'آدرس تصویر آواتار')}:</label>
            <input type="text" id="avatarUrl" name="avatarUrl" value={formData.avatarUrl} onChange={handleChange} style={{width: 'calc(100% - 16px)', padding:'8px'}} placeholder={t('profilePage.avatarUrlPlaceholder', 'یا URL تصویر را وارد کنید')} />
        </div>
        {/* MUI: <Button component="label" variant="outlined" sx={{ my: 1 }}> {t('profilePage.uploadAvatar', 'آپلود آواتار')} <input type="file" hidden accept="image/*" onChange={handleAvatarChange} /> </Button> {avatarFileStatus && <Typography variant="caption" display="block">...</Typography>} */}
        <div style={{ marginBottom: '20px' }}>
            <label htmlFor="avatarFile" style={{display:'block', marginBottom:'5px'}}>{t('profilePage.uploadAvatar', 'یا فایل آواتار را آپلود کنید')}:</label>
            <input type="file" id="avatarFile" name="avatarFile" accept="image/*" onChange={handleAvatarChange} style={{width: 'calc(100% - 16px)', marginTop:'5px'}} />
            {avatarFileStatus && <p style={{fontSize: '0.9em', color: uploadingAvatar ? 'blue' : (formData.avatarUrl?.includes('example.com') ? 'green' : 'red'), margin: '5px 0 0 0'}}>{avatarFileStatus}</p>}
        </div>

        {/* MUI: <Button type="submit" variant="contained" color="primary" disabled={updatingProfile || uploadingAvatar}> { (updatingProfile || uploadingAvatar) ? <CircularProgress size={24} /> : t('profilePage.saveChanges', 'ذخیره تغییرات')} </Button> */}
        <button type="submit" disabled={updatingProfile || uploadingAvatar} style={{padding:'10px 20px', backgroundColor: '#007bff', color:'white', border:'none', borderRadius:'4px', cursor:'pointer'}}>
          {(updatingProfile || uploadingAvatar) ? t('saving', 'در حال ذخیره...') : t('profilePage.saveChanges', 'ذخیره تغییرات')}
        </button>
      </form>
      {/* MUI: </Box> */}
    </div>
    // MUI: </Container>
  );
};

export default UserProfilePage;
