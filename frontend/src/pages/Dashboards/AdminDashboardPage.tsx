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
      <h2>{t('adminDashboard.title', 'داشبورد ادمین')}</h2>
      {user && <p>{t('adminDashboard.welcomeMessage', 'خوش آمدید')}, {user.profile?.firstName || user.email}!</p>}

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
