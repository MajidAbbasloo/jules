import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../context/AuthContext';
import UserManagementTab from './Admin/UserManagementTab';
import CourseManagementTab from './Admin/CourseManagementTab';
import CategoryManagementTab from './Admin/CategoryManagementTab'; // Import the new component

// MUI placeholder imports for Tabs
// import Box from '@mui/material/Box';
// import Tabs from '@mui/material/Tabs';
// import Tab from '@mui/material/Tab';
// import Typography from '@mui/material/Typography';

// interface TabPanelProps {
//   children?: React.ReactNode;
//   index: number;
//   value: number;
// }

// function TabPanel(props: TabPanelProps) {
//   const { children, value, index, ...other } = props;
//   return (
//     <div role="tabpanel" hidden={value !== index} id={`admin-tabpanel-${index}`} aria-labelledby={`admin-tab-${index}`} {...other}>
//       {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
//     </div>
//   );
// }

const AdminDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  // const [currentTab, setCurrentTab] = useState(0); // For MUI Tabs

  // const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
  //   setCurrentTab(newValue);
  // };

  return (
    // MUI: <Box sx={{ width: '100%' }}>
    <div>
      {/* MUI: <Typography variant="h4" gutterBottom>{t('adminDashboard.title', 'داشبورد ادمین')}</Typography> */}
import { GET_ADMIN_DASHBOARD_STATS } from '../../../graphql/queries'; // Placeholder for new query

// ... other imports

// MUI placeholder imports for Stats Display (e.g., Paper, Grid, Typography)
// import Paper from '@mui/material/Paper';
// import Grid from '@mui/material/Grid';
// import CountUp from 'react-countup'; // Example for animated numbers

const AdminDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  // const [currentTab, setCurrentTab] = useState(0); // For MUI Tabs

  // const { loading: statsLoading, error: statsError, data: statsData } = useQuery(GET_ADMIN_DASHBOARD_STATS);
  // Placeholder data for now
  const statsData = {
    // getTotalUsersCount: 120, getTotalCoursesCount: 35, getTotalCategoriesCount: 8
  };
  const statsLoading = false;
  const statsError = null;


  // const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
  //   setCurrentTab(newValue);
  // };

  return (
    // MUI: <Box sx={{ width: '100%' }}>
    <div>
      {/* MUI: <Typography variant="h4" gutterBottom>{t('adminDashboard.title', 'داشبورد ادمین')}</Typography> */}
      <h2>{t('adminDashboard.title', 'داشبورد ادمین')}</h2>
      {user && <p>{t('adminDashboard.welcomeMessage', 'خوش آمدید')}, {user.profile?.firstName || user.email}!</p>}

      {/* MUI: <Button component={Link} to="/profile/me" variant="outlined" sx={{ my: 2, mr: 2 }}>{t('myProfile', 'پروفایل من')}</Button> */}
      <div style={{ margin: "15px 0" }}>
        <Link to="/profile/me" style={{ textDecoration: 'none', padding: '8px 15px', border: '1px solid #007bff', borderRadius: '4px', color: '#007bff', marginRight: '15px' }}>
          {t('myProfile', 'پروفایل من')}
        </Link>
      </div>

      {/* MUI: <Paper elevation={3} sx={{ p: 2, my: 2 }}> <Typography variant="h6" gutterBottom>{t('adminDashboard.statsTitle', 'آمار کلی پلتفرم')}</Typography> <Grid container spacing={2}> ... </Grid> </Paper> */}
      <div style={{border: '1px solid #ddd', padding: '15px', margin: '20px 0', borderRadius: '5px', background: '#f9f9f9'}}>
        <h4>{t('adminDashboard.statsTitle', 'آمار کلی پلتفرم')}</h4>
        {statsLoading && <p>{t('loading', 'در حال بارگذاری آمار...')}</p>}
        {statsError && <p style={{color: 'red'}}>{t('adminDashboard.statsError', 'خطا در بارگذاری آمار.')}</p>}
        {statsData && !statsLoading && !statsError && (
          <div style={{display: 'flex', justifyContent: 'space-around', textAlign: 'center'}}>
            {/* MUI: <Grid item xs={4}><Paper sx={{p:1}}><Typography variant="h5">{statsData.getTotalUsersCount || 'N/A'}</Typography><Typography variant="caption">{t('adminDashboard.totalUsers', 'کل کاربران')}</Typography></Paper></Grid> */}
            <div>
              <p style={{fontSize: '1.5em', margin: '0'}}>{statsData.getTotalUsersCount !== undefined ? statsData.getTotalUsersCount : t('loading', '...')}</p>
              <p>{t('adminDashboard.totalUsers', 'کل کاربران')}</p>
            </div>
            <div>
              <p style={{fontSize: '1.5em', margin: '0'}}>{statsData.getTotalCoursesCount !== undefined ? statsData.getTotalCoursesCount : t('loading', '...')}</p>
              <p>{t('adminDashboard.totalCourses', 'کل دوره‌ها')}</p>
            </div>
            <div>
              <p style={{fontSize: '1.5em', margin: '0'}}>{statsData.getTotalCategoriesCount !== undefined ? statsData.getTotalCategoriesCount : t('loading', '...')}</p>
              <p>{t('adminDashboard.totalCategories', 'کل دسته‌بندی‌ها')}</p>
            </div>
          </div>
        )}
         {!statsData && !statsLoading && !statsError && <p>{t('adminDashboard.statsUnavailable', 'آمار در حال حاضر در دسترس نیست. (Query در backend پیاده‌سازی شود)')}</p>}
      </div>

      {/* MUI Tab structure example:
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={currentTab} onChange={handleTabChange} aria-label="Admin dashboard tabs">
          <Tab label={t('adminDashboard.tabs.userManagement', 'مدیریت کاربران')} id="admin-tab-0" aria-controls="admin-tabpanel-0" />
          <Tab label={t('adminDashboard.tabs.courseManagement', 'مدیریت دوره ها')} id="admin-tab-1" aria-controls="admin-tabpanel-1" />
          <Tab label={t('adminDashboard.tabs.categoryManagement', 'مدیریت دسته بندی ها')} id="admin-tab-2" aria-controls="admin-tabpanel-2" />
        </Tabs>
      </Box>
      <TabPanel value={currentTab} index={0}>
        <UserManagementTab />
      </TabPanel>
      <TabPanel value={currentTab} index={1}>
        {t('adminDashboard.tabs.courseManagement', 'مدیریت دوره ها')} Content Placeholder
      </TabPanel>
       <TabPanel value={currentTab} index={2}>
        {t('adminDashboard.tabs.categoryManagement', 'مدیریت دسته بندی ها')} Content Placeholder
      </TabPanel>
      */}

      {/* For now, rendering UserManagementTab directly. Other tabs will be added progressively. */}
      <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #eee', borderRadius: '5px' }}>
        <UserManagementTab />
      </div>

      {/* Placeholder for other admin sections */}
      <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #eee', borderRadius: '5px' }}>
         <CourseManagementTab />
      </div>
      <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #eee', borderRadius: '5px' }}>
         <CategoryManagementTab />
      </div>

    </div>
    // MUI: </Box>
  );
};

export default AdminDashboardPage;
