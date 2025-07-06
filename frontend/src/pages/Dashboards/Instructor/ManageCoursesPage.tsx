import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../context/AuthContext';
import { GET_INSTRUCTOR_COURSES, GET_ALL_CATEGORIES } from '../../../graphql/queries';
import {
  CREATE_COURSE_MUTATION,
  UPDATE_COURSE_MUTATION,
  DELETE_COURSE_MUTATION,
  PUBLISH_COURSE_MUTATION,
  UNPUBLISH_COURSE_MUTATION,
  GET_MOCK_UPLOAD_URL_MUTATION
} from '../../../graphql/mutations';

// import Button from '@mui/material/Button';
// import TextField from '@mui/material/TextField';
// import Dialog from '@mui/material/Dialog';
// import DialogActions from '@mui/material/DialogActions';
// import DialogContent from '@mui/material/DialogContent';
// import DialogTitle from '@mui/material/DialogTitle';
// import Select from '@mui/material/Select';
// import MenuItem from '@mui/material/MenuItem';
// import InputLabel from '@mui/material/InputLabel';
// import FormControl from '@mui/material/FormControl';
// import Chip from '@mui/material/Chip';
// import Box from '@mui/material/Box';
// import IconButton from '@mui/material/IconButton';
// import EditIcon from '@mui/icons-material/Edit'; // Placeholder for actual icons
// import DeleteIcon from '@mui/icons-material/Delete';
// import PublishIcon from '@mui/icons-material/Publish';
// import UnpublishedIcon from '@mui/icons-material/Unpublished';

// Basic Modal Component (Can be replaced with Material UI Modal later)
// MUI Equivalent: <Dialog open={isOpen} onClose={onClose}> <DialogTitle>...</DialogTitle> <DialogContent>...</DialogContent> <DialogActions>...</DialogActions> </Dialog>
const Modal: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode }> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', padding: '20px', borderRadius: '5px', minWidth: '300px', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
        {children}
        {/* MUI: <Button onClick={onClose}>Close</Button> */}
        <button onClick={onClose} style={{ marginTop: '10px' }}>{(t('close', 'Close'))}</button>
      </div>
    </div>
  );
};

interface Course {
  id: string;
  title: string;
  description?: string | null;
  price?: number | null;
  thumbnailUrl?: string | null;
  tags?: string[] | null;
  isPublished: boolean;
  instructor: { id: string; }; // Simplified for this context
  category?: { id: string; name: string; } | null;
  // Add other fields if needed from query
}

interface Category {
  id: string;
  name: string;
}

const ManageCoursesPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCourse, setCurrentCourse] = useState<Partial<Course> | null>(null);
  const [formState, setFormState] = useState<Partial<Course>>({
    title: '',
    description: '',
    price: 0,
    thumbnailUrl: '',
    tags: [],
    categoryId: undefined, // Store categoryId for the form
  });
  const [categories, setCategories] = useState<Category[]>([]);

  // Queries
  const { loading: loadingCourses, error: errorCourses, data: dataCourses, refetch: refetchCourses } = useQuery(GET_INSTRUCTOR_COURSES, {
    // variables: { instructorId: user?.id }, // This variable is not used if GET_INSTRUCTOR_COURSES uses getAllCourses
    skip: !user, // Skip if user is not loaded
    onCompleted: (data) => {
      if (data && data.getAllCourses && user) {
        // Filter courses for the current instructor if using getAllCourses
        const instructorCourses = data.getAllCourses.filter((course: Course) => course.instructor.id === user.id);
        setCourses(instructorCourses);
      }
    }
  });

  const { loading: loadingCategories, data: dataCategories } = useQuery(GET_ALL_CATEGORIES, {
    onCompleted: (data) => {
      if (data && data.getAllCategories) {
        setCategories(data.getAllCategories);
      }
    }
  });

  // Mutations
  const [createCourse, { loading: creatingCourse }] = useMutation(CREATE_COURSE_MUTATION);
  const [updateCourse, { loading: updatingCourse }] = useMutation(UPDATE_COURSE_MUTATION);
  const [deleteCourseMutation] = useMutation(DELETE_COURSE_MUTATION);
  const [publishCourseMutation] = useMutation(PUBLISH_COURSE_MUTATION);
  const [unpublishCourseMutation] = useMutation(UNPUBLISH_COURSE_MUTATION);
  const [getMockUploadUrl, { loading: uploadingThumbnail }] = useMutation(GET_MOCK_UPLOAD_URL_MUTATION);
  const [thumbnailFileStatus, setThumbnailFileStatus] = useState<string | null>(null);


  useEffect(() => {
    if (currentCourse) {
      setFormState({
        title: currentCourse.title || '',
        description: currentCourse.description || '',
        price: currentCourse.price || 0,
        thumbnailUrl: currentCourse.thumbnailUrl || '',
        tags: currentCourse.tags || [],
        categoryId: currentCourse.category?.id || undefined,
      });
    } else {
      setFormState({ title: '', description: '', price: 0, thumbnailUrl: '', tags: [], categoryId: undefined });
    }
  }, [currentCourse]);

  const handleOpenModal = (course?: Course) => {
    setCurrentCourse(course || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentCourse(null);
    setThumbnailFileStatus(null); // Reset file status on modal close
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "tags") {
        setFormState(prev => ({ ...prev, [name]: value.split(',').map(tag => tag.trim()) }));
    } else if (name === "price") {
        setFormState(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
        setFormState(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFileStatus(t('uploadingFile', 'در حال پردازش فایل...'));
      try {
        const response = await getMockUploadUrl({ variables: { filename: file.name, fileType: file.type } });
        const mockUrl = response.data?.getMockUploadUrl;
        if (mockUrl) {
          setFormState(prev => ({ ...prev, thumbnailUrl: mockUrl }));
          setThumbnailFileStatus(t('fileSelected', 'فایل انتخاب شد: ') + file.name + t('mockUrlNotice', ' (URL شبیه‌سازی شده)'));
        } else {
          setThumbnailFileStatus(t('uploadError', 'خطا در دریافت URL شبیه‌سازی شده.'));
        }
      } catch (err: any) {
        console.error("Error getting mock upload URL:", err);
        setThumbnailFileStatus(t('uploadError', 'خطا در پردازش فایل: ') + err.message);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const variables = {
        ...formState,
        tags: formState.tags?.filter(tag => tag), // Remove empty tags
        price: Number(formState.price) || 0,
        categoryId: formState.categoryId === "" ? null : formState.categoryId // Handle empty string for category
    };

    try {
      if (currentCourse && currentCourse.id) {
        await updateCourse({ variables: { id: currentCourse.id, ...variables } });
      } else {
        await createCourse({ variables });
      }
      refetchCourses(); // Refetch courses after mutation
      handleCloseModal();
       // TODO: Replace with toast notification - e.g., toast.success(currentCourse?.id ? 'Course updated!' : 'Course created!');
    } catch (err: any) {
      console.error("Error saving course:", err.message);
       // TODO: Replace with toast notification - e.g., toast.error(t('manageCourses.saveError', 'خطا در ذخیره دوره: ') + err.message);
      alert(t('manageCourses.saveError', 'خطا در ذخیره دوره: ') + err.message);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    // TODO: Replace window.confirm with a custom modal or MUI Dialog for better UX
    if (window.confirm(t('manageCourses.confirmDelete', 'آیا از حذف این دوره مطمئن هستید؟'))) {
      try {
        await deleteCourseMutation({
          variables: { id: courseId },
          update: (cache) => {
            cache.evict({ id: cache.identify({ __typename: 'Course', id: courseId }) });
            cache.gc();
          }
        });
        refetchCourses();
        // TODO: Replace with toast notification - e.g., toast.success('Course deleted!');
      } catch (err: any) {
        console.error("Error deleting course:", err.message);
        // TODO: Replace with toast notification - e.g., toast.error(t('manageCourses.deleteError', 'خطا در حذف دوره: ') + err.message);
        alert(t('manageCourses.deleteError', 'خطا در حذف دوره: ') + err.message);
      }
    }
  };

  const handleTogglePublish = async (course: Course) => {
    try {
      if (course.isPublished) {
        await unpublishCourseMutation({ variables: { id: course.id } });
      } else {
        await publishCourseMutation({ variables: { id: course.id } });
      }
      refetchCourses();
      // TODO: Replace with toast notification - e.g., toast.success('Publish status updated!');
    } catch (err: any) {
      console.error("Error toggling publish state:", err.message);
      // TODO: Replace with toast notification - e.g., toast.error(t('manageCourses.publishError', 'خطا در تغییر وضعیت انتشار: ') + err.message);
      alert(t('manageCourses.publishError', 'خطا در تغییر وضعیت انتشار: ') + err.message);
    }
  };


  if (loadingCourses) return <p>{t('loading', 'در حال بارگذاری...')}</p>;
  if (errorCourses) return <p>{t('errorLoading', 'خطا در بارگذاری دوره ها: ')} {errorCourses.message}</p>;

  return (
    <div>
      {/* MUI: <Typography variant="h4" gutterBottom>{t('manageCourses.title', 'مدیریت دوره های من')}</Typography> */}
      <h2>{t('manageCourses.title', 'مدیریت دوره های من')}</h2>
      {/* MUI: <Button variant="contained" color="primary" onClick={() => handleOpenModal()} style={{ marginBottom: '20px' }}>{t('manageCourses.addCourse', 'افزودن دوره جدید')}</Button> */}
      <button onClick={() => handleOpenModal()} style={{ marginBottom: '20px', padding: '10px 15px' }}>
        {t('manageCourses.addCourse', 'افزودن دوره جدید')}
      </button>

      {/* MUI: Dialog component used above in Modal definition */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
        {/* MUI: <DialogTitle>{currentCourse ? t('manageCourses.editCourse', 'ویرایش دوره') : t('manageCourses.createCourse', 'ایجاد دوره جدید')}</DialogTitle> */}
        <h3>{currentCourse ? t('manageCourses.editCourse', 'ویرایش دوره') : t('manageCourses.createCourse', 'ایجاد دوره جدید')}</h3>
        {/* MUI: <DialogContent> <Box component="form" onSubmit={handleSubmit} sx={{ '& .MuiTextField-root': { my: 1 } }}> ... </Box> </DialogContent> */}
        <form onSubmit={handleSubmit}>
          {/* MUI: <TextField fullWidth label={t('manageCourses.form.title', 'عنوان')} name="title" value={formState.title} onChange={handleChange} required /> */}
          <div style={{ marginBottom: '10px' }}>
            <label>{t('manageCourses.form.title', 'عنوان')}:</label>
            <input type="text" name="title" value={formState.title} onChange={handleChange} required style={{width: '98%'}} />
          </div>
          {/* MUI: <TextField fullWidth label={t('manageCourses.form.description', 'توضیحات')} name="description" multiline rows={3} value={formState.description || ''} onChange={handleChange} /> */}
          <div style={{ marginBottom: '10px' }}>
            <label>{t('manageCourses.form.description', 'توضیحات')}:</label>
            <textarea name="description" value={formState.description || ''} onChange={handleChange} style={{width: '98%', minHeight: '80px'}} />
          </div>
          {/* MUI: <TextField fullWidth type="number" label={t('manageCourses.form.price', 'قیمت (0 برای رایگان)')} name="price" value={formState.price || 0} onChange={handleChange} /> */}
          <div style={{ marginBottom: '10px' }}>
            <label>{t('manageCourses.form.price', 'قیمت (0 برای رایگان)')}:</label>
            <input type="number" name="price" value={formState.price || 0} onChange={handleChange} style={{width: '98%'}} />
          </div>
          {/* MUI: <TextField fullWidth label={t('manageCourses.form.thumbnailUrl', 'URL تصویر بند انگشتی')} name="thumbnailUrl" value={formState.thumbnailUrl || ''} onChange={handleChange} placeholder={t('manageCourses.form.thumbnailUrlPlaceholder', 'یا URL تصویر را وارد کنید')} /> */}
          <div style={{ marginBottom: '10px' }}>
            <label>{t('manageCourses.form.thumbnailUrl', 'URL تصویر بند انگشتی')}:</label>
            <input type="text" name="thumbnailUrl" value={formState.thumbnailUrl || ''} onChange={handleChange} style={{width: '98%'}} placeholder={t('manageCourses.form.thumbnailUrlPlaceholder', 'یا URL تصویر را وارد کنید')} />
          </div>
           {/* File input for thumbnail */}
          {/* MUI: <Button component="label" variant="outlined" sx={{ my: 1 }}> {t('manageCourses.form.thumbnailFile', 'آپلود تصویر بند انگشتی')} <input type="file" hidden accept="image/*" onChange={handleThumbnailChange} /> </Button> {thumbnailFileStatus && <Typography variant="caption" display="block">...</Typography>} */}
          <div style={{ marginBottom: '10px' }}>
            <label htmlFor="thumbnailFile">{t('manageCourses.form.thumbnailFile', 'یا فایل تصویر بند انگشتی را آپلود کنید')}:</label>
            <input type="file" id="thumbnailFile" name="thumbnailFile" accept="image/*" onChange={handleThumbnailChange} style={{width: '98%', marginTop: '5px'}} />
            {thumbnailFileStatus && <p style={{fontSize: '0.9em', color: uploadingThumbnail ? 'blue' : (formState.thumbnailUrl?.includes('example.com') ? 'green' : 'red'), margin: '5px 0 0 0'}}>{thumbnailFileStatus}</p>}
          </div>
          {/* MUI for tags: <TextField fullWidth label={t('manageCourses.form.tags', 'برچسب ها (جدا شده با ویرگول)')} name="tags" value={(formState.tags || []).join(', ')} onChange={handleChange} helperText="Enter tags separated by commas" /> */}
          <div style={{ marginBottom: '10px' }}>
            <label>{t('manageCourses.form.tags', 'برچسب ها (جدا شده با ویرگول)')}:</label>
            <input type="text" name="tags" value={(formState.tags || []).join(', ')} onChange={handleChange} style={{width: '98%'}} />
          </div>
          {/* MUI:
            <FormControl fullWidth sx={{ my: 1 }}>
              <InputLabel id="category-select-label">{t('manageCourses.form.category', 'دسته بندی')}</InputLabel>
              <Select labelId="category-select-label" name="categoryId" value={formState.categoryId || ''} onChange={handleChange} label={t('manageCourses.form.category', 'دسته بندی')}>
                <MenuItem value=""><em>{t('manageCourses.form.selectCategory', '-- انتخاب دسته بندی --')}</em></MenuItem>
                {loadingCategories ? <MenuItem disabled>{t('loading', 'بارگذاری...')}</MenuItem> : categories.map(cat => (
                  <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          */}
          <div style={{ marginBottom: '10px' }}>
            <label>{t('manageCourses.form.category', 'دسته بندی')}:</label>
            <select name="categoryId" value={formState.categoryId || ''} onChange={handleChange} style={{width: '100%'}}>
              <option value="">{t('manageCourses.form.selectCategory', '-- انتخاب دسته بندی --')}</option>
              {loadingCategories ? <option>{t('loading', 'بارگذاری...')}</option> : categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          {/* MUI: <DialogActions> <Button onClick={handleCloseModal}>{t('cancel', 'Cancel')}</Button> <Button type="submit" variant="contained" color="primary" disabled={creatingCourse || updatingCourse}>{creatingCourse || updatingCourse ? t('saving', 'در حال ذخیره...') : t('save', 'ذخیره')}</Button> </DialogActions> */}
          <button type="submit" disabled={creatingCourse || updatingCourse} style={{ padding: '8px 12px' }}>
            {creatingCourse || updatingCourse ? t('saving', 'در حال ذخیره...') : t('save', 'ذخیره')}
          </button>
        </form>
      </Modal>

      {courses.length === 0 ? (
        // MUI: <Typography>{t('manageCourses.noCourses', 'شما هنوز هیچ دوره ای ایجاد نکرده اید.')}</Typography>
        <p>{t('manageCourses.noCourses', 'شما هنوز هیچ دوره ای ایجاد نکرده اید.')}</p>
      ) : (
        // MUI Table: <TableContainer component={Paper}><Table sx={{ minWidth: 650 }}><TableHead><TableRow><TableCell>...</TableCell>...</TableRow></TableHead><TableBody>{courses.map(course => (<TableRow key={course.id}><TableCell>...</TableCell>...</TableRow>))}</TableBody></Table></TableContainer>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={tableCellStyle}>{t('manageCourses.table.title', 'عنوان')}</th>
              <th style={tableCellStyle}>{t('manageCourses.table.category', 'دسته بندی')}</th>
              <th style={tableCellStyle}>{t('manageCourses.table.price', 'قیمت')}</th>
              <th style={tableCellStyle}>{t('manageCourses.table.status', 'وضعیت')}</th>
              <th style={tableCellStyle}>{t('manageCourses.table.actions', 'عملیات')}</th>
            </tr>
          </thead>
          <tbody>
            {courses.map(course => (
              <tr key={course.id}>
                <td style={tableCellStyle}>{course.title}</td>
                <td style={tableCellStyle}>{course.category?.name || '-'}</td>
                <td style={tableCellStyle}>{course.price === 0 ? t('free', 'رایگان') : course.price}</td>
                <td style={tableCellStyle}>
                  {/* MUI: <Chip label={course.isPublished ? t('published', 'منتشر شده') : t('draft', 'پیش نویس')} color={course.isPublished ? "success" : "default"} size="small" /> */}
                  {course.isPublished ? t('published', 'منتشر شده') : t('draft', 'پیش نویس')}
                  {/* MUI: <Button variant="outlined" size="small" startIcon={course.isPublished ? <UnpublishedIcon /> : <PublishIcon />} onClick={() => handleTogglePublish(course)} sx={{ ml: 1 }}>{course.isPublished ? t('unpublish', 'لغو انتشار') : t('publish', 'انتشار')}</Button> */}
                  <button onClick={() => handleTogglePublish(course)} style={{ marginLeft: '10px' }}>
                    {course.isPublished ? t('unpublish', 'لغو انتشار') : t('publish', 'انتشار')}
                  </button>
                </td>
                <td style={tableCellStyle}>
                  {/* MUI:
                    <IconButton color="primary" size="small" onClick={() => handleOpenModal(course)}><EditIcon fontSize="inherit" /></IconButton>
                    <Button component={Link} to={`/dashboard/instructor/course/${course.id}/content`} sx={{ mx: 0.5 }} size="small">{t('manageContent', 'مدیریت محتوا')}</Button>
                    <IconButton color="error" size="small" onClick={() => handleDeleteCourse(course.id)}><DeleteIcon fontSize="inherit" /></IconButton>
                  */}
                  <button onClick={() => handleOpenModal(course)} style={{marginRight: '5px'}}>{t('edit', 'ویرایش')}</button>
                  <Link to={`/dashboard/instructor/course/${course.id}/content`} style={{marginRight: '5px'}}>{t('manageContent', 'مدیریت محتوا')}</Link>
                  <button onClick={() => handleDeleteCourse(course.id)} style={{color: 'red'}}>{t('delete', 'حذف')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

const tableCellStyle: React.CSSProperties = {
  border: '1px solid #ddd',
  padding: '8px',
  textAlign: 'right'
};

export default ManageCoursesPage;
