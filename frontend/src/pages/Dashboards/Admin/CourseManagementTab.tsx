import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { GET_ALL_COURSES_FOR_ADMIN_VIEW } from '../../../graphql/queries';
import { ADMIN_SET_COURSE_PUBLICATION_MUTATION, DELETE_COURSE_MUTATION } from '../../../graphql/mutations';

// MUI Placeholder imports
// import Table from '@mui/material/Table';
// import TableBody from '@mui/material/TableBody';
// import TableCell from '@mui/material/TableCell';
// import TableContainer from '@mui/material/TableContainer';
// import TableHead from '@mui/material/TableHead';
// import TableRow from '@mui/material/TableRow';
// import Paper from '@mui/material/Paper';
// import Button from '@mui/material/Button';
// import Switch from '@mui/material/Switch';
// import FormControlLabel from '@mui/material/FormControlLabel';
// import IconButton from '@mui/material/IconButton';
// import DeleteIcon from '@mui/icons-material/Delete';
// import EditIcon from '@mui/icons-material/Edit'; // For linking to course content management
// import CircularProgress from '@mui/material/CircularProgress';
// import Alert from '@mui/material/Alert';
// import Typography from '@mui/material/Typography';
// import Box from '@mui/material/Box';

interface CourseInstructor {
  id: string;
  email: string;
  profile?: {
    firstName?: string | null;
    lastName?: string | null;
  } | null;
}

interface CourseCategory {
  id: string;
  name: string;
}

interface CourseForAdmin {
  id: string;
  title: string;
  isPublished: boolean;
  price?: number | null;
  instructor: CourseInstructor;
  category?: CourseCategory | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    enrollments?: number | null;
  } | null;
}

const CourseManagementTab: React.FC = () => {
  const { t } = useTranslation();
  const [filterPublished, setFilterPublished] = useState<boolean | undefined>(undefined); // undefined means show all
  const [mutationError, setMutationError] = useState<string | null>(null);

  const { loading, error, data, refetch } = useQuery<{ getAllCoursesForAdmin: CourseForAdmin[] }>(
    GET_ALL_COURSES_FOR_ADMIN_VIEW,
    { variables: { publishedOnly: filterPublished } }
  );

  const [adminSetCoursePublication, { loading: publishingLoading }] = useMutation(ADMIN_SET_COURSE_PUBLICATION_MUTATION, {
    onError: (err) => {
      // TODO: Replace with toast notification - e.g., toast.error(err.message || t(...));
      setMutationError(err.message || t('courseManagement.publishErrorGeneric', 'خطا در تغییر وضعیت انتشار.'));
    },
    onCompleted: () => {
      setMutationError(null);
      refetch();
      // TODO: Replace with toast notification - e.g., toast.success('Course publication status updated!');
    }
  });

  const [deleteCourse, { loading: deletingLoading }] = useMutation(DELETE_COURSE_MUTATION, {
    onError: (err) => {
      // TODO: Replace with toast notification - e.g., toast.error(err.message || t(...));
      setMutationError(err.message || t('courseManagement.deleteErrorGeneric', 'خطا در حذف دوره.'));
    },
    onCompleted: (deletedData) => {
        setMutationError(null);
        refetch(); // Refetch is generally fine here, or use cache update below.
        // TODO: Replace alert with toast notification - e.g., toast.success(t('courseManagement.deleteSuccess'));
        alert(t('courseManagement.deleteSuccess', 'دوره با موفقیت حذف شد.'));
    },
    update: (cache, { data: { deleteCourse: deletedCourse } }) => {
        if (deletedCourse) {
            const existingCoursesQuery = cache.readQuery<{ getAllCoursesForAdmin: CourseForAdmin[] }>({
                query: GET_ALL_COURSES_FOR_ADMIN_VIEW,
                variables: { publishedOnly: filterPublished },
            });
            if (existingCoursesQuery) {
                cache.writeQuery({
                    query: GET_ALL_COURSES_FOR_ADMIN_VIEW,
                    variables: { publishedOnly: filterPublished },
                    data: {
                        getAllCoursesForAdmin: existingCoursesQuery.getAllCoursesForAdmin.filter(course => course.id !== deletedCourse.id),
                    },
                });
            }
        }
    }
  });

  const handleTogglePublish = (courseId: string, currentStatus: boolean) => {
    setMutationError(null);
    adminSetCoursePublication({ variables: { courseId, isPublished: !currentStatus } });
  };

  const handleDeleteCourse = (courseId: string) => {
    if (window.confirm(t('courseManagement.confirmDelete', 'آیا از حذف این دوره مطمئن هستید؟ این عمل قابل بازگشت نیست.'))) {
      setMutationError(null);
      deleteCourse({ variables: { id: courseId } });
    }
  };

  const handleFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if (value === "all") setFilterPublished(undefined);
    else if (value === "published") setFilterPublished(true);
    else if (value === "unpublished") setFilterPublished(false);
  };


  if (loading) return <p>{t('loading', 'در حال بارگذاری دوره ها...')}</p>; // MUI: <CircularProgress />
  if (error) return <p>{t('error', 'خطا در بارگذاری دوره ها: ')} {error.message}</p>; // MUI: <Alert severity="error">...</Alert>

  const courses = data?.getAllCoursesForAdmin || [];

  return (
    // MUI: <Box sx={{ p: 2 }}>
    <div>
      {/* MUI: <Typography variant="h5" gutterBottom>{t('courseManagement.title', 'مدیریت دوره‌ها')}</Typography> */}
      <h3>{t('courseManagement.title', 'مدیریت دوره‌ها')}</h3>
      {mutationError && <p style={{color: 'red'}}>{mutationError}</p>} {/* MUI: <Alert severity="error" sx={{mb:2}}>{mutationError}</Alert> */}

      {/* MUI: <FormControl sx={{ m: 1, minWidth: 120 }} size="small"> <InputLabel>Filter by Status</InputLabel> <Select value={...} onChange={...}>...</Select> </FormControl> */}
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="publishFilter" style={{ marginRight: '10px' }}>{t('courseManagement.filter.status', 'فیلتر بر اساس وضعیت:')}</label>
        <select id="publishFilter" onChange={handleFilterChange} value={filterPublished === undefined ? "all" : (filterPublished ? "published" : "unpublished")}>
            <option value="all">{t('courseManagement.filter.all', 'همه')}</option>
            <option value="published">{t('published', 'منتشر شده')}</option>
            <option value="unpublished">{t('draft', 'پیش نویس')}</option>
        </select>
      </div>

      {/* MUI: <TableContainer component={Paper}> <Table> ... </Table> </TableContainer> */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={tableHeaderStyle}>{t('courseManagement.table.title', 'عنوان')}</th>
            <th style={tableHeaderStyle}>{t('courseManagement.table.instructor', 'مدرس')}</th>
            <th style={tableHeaderStyle}>{t('courseManagement.table.category', 'دسته بندی')}</th>
            <th style={tableHeaderStyle}>{t('courseManagement.table.price', 'قیمت')}</th>
            <th style={tableHeaderStyle}>{t('courseManagement.table.enrollments', 'ثبت نامی‌ها')}</th>
            <th style={tableHeaderStyle}>{t('courseManagement.table.status', 'وضعیت انتشار')}</th>
            <th style={tableHeaderStyle}>{t('courseManagement.table.actions', 'عملیات')}</th>
          </tr>
        </thead>
        <tbody>
          {courses.map((course) => (
            <tr key={course.id}>
              <td style={tableCellStyle}>{course.title}</td>
              <td style={tableCellStyle}>{course.instructor.profile?.firstName || ''} {course.instructor.profile?.lastName || course.instructor.email}</td>
              <td style={tableCellStyle}>{course.category?.name || '-'}</td>
              <td style={tableCellStyle}>{course.price === 0 ? t('free', 'رایگان') : course.price}</td>
              <td style={tableCellStyle}>{course._count?.enrollments || 0}</td>
              <td style={tableCellStyle}>
                {/* MUI: <FormControlLabel control={<Switch checked={course.isPublished} onChange={() => handleTogglePublish(course.id, course.isPublished)} disabled={publishingLoading} />} label={course.isPublished ? t('published', 'منتشر شده') : t('draft', 'پیش نویس')} /> */}
                <button onClick={() => handleTogglePublish(course.id, course.isPublished)} disabled={publishingLoading}>
                  {course.isPublished ? t('unpublish', 'لغو انتشار') : t('publish', 'انتشار')}
                </button>
                 ({course.isPublished ? t('published', 'منتشر شده') : t('draft', 'پیش نویس')})
              </td>
              <td style={tableCellStyle}>
                {/* MUI: <IconButton component={Link} to={`/dashboard/instructor/course/${course.id}/content`} size="small"><EditIcon /></IconButton> */}
                <Link to={`/dashboard/instructor/course/${course.id}/content`} style={{marginRight: '10px'}}>{t('manageContent', 'محتوا')}</Link>
                {/* MUI: <IconButton color="error" onClick={() => handleDeleteCourse(course.id)} disabled={deletingLoading} size="small"><DeleteIcon /></IconButton> */}
                <button onClick={() => handleDeleteCourse(course.id)} disabled={deletingLoading || publishingLoading} style={{color: 'red'}}>
                  {deletingLoading ? t('deleting', 'درحال حذف...') : t('delete', 'حذف')}
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

export default CourseManagementTab;
