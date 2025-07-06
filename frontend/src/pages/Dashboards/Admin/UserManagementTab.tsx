import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { GET_ALL_USERS_FOR_ADMIN } from '../../../graphql/queries';
import { UPDATE_USER_ROLE_MUTATION } from '../../../graphql/mutations';

// MUI placeholder imports
// import Table from '@mui/material/Table';
// import TableBody from '@mui/material/TableBody';
// import TableCell from '@mui/material/TableCell';
// import TableContainer from '@mui/material/TableContainer';
// import TableHead from '@mui/material/TableHead';
// import TableRow from '@mui/material/TableRow';
// import Paper from '@mui/material/Paper';
// import Select from '@mui/material/Select';
// import MenuItem from '@mui/material/MenuItem';
// import Button from '@mui/material/Button';
// import CircularProgress from '@mui/material/CircularProgress';
// import Alert from '@mui/material/Alert';
// import Typography from '@mui/material/Typography';
// import Box from '@mui/material/Box';

interface UserProfile {
  firstName?: string | null;
  lastName?: string | null;
}

interface User {
  id: string;
  email: string;
  role: string; // STUDENT, INSTRUCTOR, ADMIN
  isEmailVerified: boolean;
  createdAt: string; // DateTime string
  profile?: UserProfile | null;
}

// Corresponds to UserRole enum on backend/frontend
const USER_ROLES = ['STUDENT', 'INSTRUCTOR', 'ADMIN'];

const UserManagementTab: React.FC = () => {
  const { t } = useTranslation();
  const [editableUserRole, setEditableUserRole] = useState<{ [userId: string]: string }>({});
  const [mutationError, setMutationError] = useState<string | null>(null);

  const { loading, error, data, refetch } = useQuery<{ getAllUsers: User[] }>(GET_ALL_USERS_FOR_ADMIN);
  const [updateUserRole, { loading: updatingRole }] = useMutation(UPDATE_USER_ROLE_MUTATION, {
    onError: (err) => {
      setMutationError(err.message || t('userManagement.roleUpdateErrorGeneric', 'خطا در به‌روزرسانی نقش کاربر.'));
    },
    onCompleted: () => {
      setMutationError(null);
      refetch(); // Refetch user list to show updated role
    }
  });

  const handleRoleChange = (userId: string, newRole: string) => {
    setEditableUserRole(prev => ({ ...prev, [userId]: newRole }));
  };

  const handleSaveRole = async (userId: string) => {
    const newRole = editableUserRole[userId];
    if (!newRole) return;

    setMutationError(null);
    try {
      await updateUserRole({ variables: { userId, newRole } });
      // Success message could be shown here with a toast/snackbar
    } catch (err) {
      // Error handled by useMutation's onError
    }
  };

  if (loading) return <p>{t('loading', 'در حال بارگذاری کاربران...')}</p>; // MUI: <CircularProgress />
  if (error) return <p>{t('error', 'خطا در بارگذاری کاربران: ')} {error.message}</p>; // MUI: <Alert severity="error">...</Alert>

  const users = data?.getAllUsers || [];

  return (
    // MUI: <Box sx={{ p: 2 }}>
    <div>
      {/* MUI: <Typography variant="h5" gutterBottom>{t('userManagement.title', 'مدیریت کاربران')}</Typography> */}
      <h3>{t('userManagement.title', 'مدیریت کاربران')}</h3>
      {mutationError && <p style={{color: 'red'}}>{mutationError}</p>} {/* MUI: <Alert severity="error" sx={{mb:2}}>{mutationError}</Alert> */}

      {/* MUI: <TableContainer component={Paper}> <Table> ... </Table> </TableContainer> */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {/* MUI: <TableCell>{t('userManagement.table.email', 'ایمیل')}</TableCell> */}
            <th style={tableHeaderStyle}>{t('userManagement.table.email', 'ایمیل')}</th>
            <th style={tableHeaderStyle}>{t('userManagement.table.name', 'نام')}</th>
            <th style={tableHeaderStyle}>{t('userManagement.table.role', 'نقش')}</th>
            <th style={tableHeaderStyle}>{t('userManagement.table.verified', 'تایید ایمیل')}</th>
            <th style={tableHeaderStyle}>{t('userManagement.table.joined', 'تاریخ عضویت')}</th>
            <th style={tableHeaderStyle}>{t('userManagement.table.actions', 'عملیات')}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            // MUI: <TableRow key={user.id}> ... </TableRow>
            <tr key={user.id}>
              {/* MUI: <TableCell>{user.email}</TableCell> */}
              <td style={tableCellStyle}>{user.email}</td>
              <td style={tableCellStyle}>{user.profile ? `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim() || '-' : '-'}</td>
              <td style={tableCellStyle}>
                {/* MUI:
                    <Select value={editableUserRole[user.id] || user.role} onChange={(e) => handleRoleChange(user.id, e.target.value)} size="small">
                        {USER_ROLES.map(role => <MenuItem key={role} value={role}>{t(`roles.${role}`, role)}</MenuItem>)}
                    </Select>
                */}
                <select value={editableUserRole[user.id] || user.role} onChange={(e) => handleRoleChange(user.id, e.target.value)}>
                  {USER_ROLES.map(role => (
                    <option key={role} value={role}>{t(`roles.${role}`, role)}</option>
                  ))}
                </select>
              </td>
              <td style={tableCellStyle}>{user.isEmailVerified ? t('yes', 'بله') : t('no', 'خیر')}</td>
              <td style={tableCellStyle}>{new Date(user.createdAt).toLocaleDateString('fa-IR')}</td>
              <td style={tableCellStyle}>
                {/* MUI: <Button variant="contained" size="small" onClick={() => handleSaveRole(user.id)} disabled={updatingRole || !editableUserRole[user.id] || editableUserRole[user.id] === user.role}>{t('save', 'ذخیره')}</Button> */}
                <button
                  onClick={() => handleSaveRole(user.id)}
                  disabled={updatingRole || !editableUserRole[user.id] || editableUserRole[user.id] === user.role}
                >
                  {updatingRole ? t('saving', 'ذخیره...') : t('save', 'ذخیره')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    // MUI: </Box>
  );
};

const tableHeaderStyle: React.CSSProperties = {
  borderBottom: '2px solid #ddd',
  padding: '10px 8px',
  textAlign: 'right',
  fontWeight: 'bold',
  backgroundColor: '#f4f4f4'
};

const tableCellStyle: React.CSSProperties = {
  borderBottom: '1px solid #eee',
  padding: '8px',
  textAlign: 'right'
};

export default UserManagementTab;
