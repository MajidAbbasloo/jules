import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { GET_ALL_CATEGORIES } from '../../../graphql/queries';
import {
    CREATE_CATEGORY_MUTATION,
    UPDATE_CATEGORY_MUTATION,
    DELETE_CATEGORY_MUTATION
} from '../../../graphql/mutations'; // Assuming these are already defined

// MUI Placeholder imports
// import Table from '@mui/material/Table';
// import TableBody from '@mui/material/TableBody';
// import TableCell from '@mui/material/TableCell';
// import TableContainer from '@mui/material/TableContainer';
// import TableHead from '@mui/material/TableHead';
// import TableRow from '@mui/material/TableRow';
// import Paper from '@mui/material/Paper';
// import Button from '@mui/material/Button';
// import TextField from '@mui/material/TextField';
// import Dialog from '@mui/material/Dialog';
// import DialogActions from '@mui/material/DialogActions';
// import DialogContent from '@mui/material/DialogContent';
// import DialogTitle from '@mui/material/DialogTitle';
// import IconButton from '@mui/material/IconButton';
// import EditIcon from '@mui/icons-material/Edit';
// import DeleteIcon from '@mui/icons-material/Delete';
// import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
// import CircularProgress from '@mui/material/CircularProgress';
// import Alert from '@mui/material/Alert';
// import Typography from '@mui/material/Typography';
// import Box from '@mui/material/Box';


interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  _count?: { courses?: number | null } | null; // If fetching course count
}

interface CategoryFormData {
  name: string;
  slug: string;
  description?: string | null;
}

const CategoryManagementTab: React.FC = () => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<Partial<Category> | null>(null);
  const [formState, setFormState] = useState<CategoryFormData>({ name: '', slug: '', description: '' });
  const [mutationError, setMutationError] = useState<string | null>(null);

  // Queries
  const { loading, error, data, refetch } = useQuery<{ getAllCategories: Category[] }>(GET_ALL_CATEGORIES, {
    onCompleted: (data) => {
      if (data && data.getAllCategories) {
        setCategories(data.getAllCategories);
      }
    }
  });

  // Mutations
  const [createCategory, { loading: creatingCategory }] = useMutation(CREATE_CATEGORY_MUTATION);
  const [updateCategory, { loading: updatingCategory }] = useMutation(UPDATE_CATEGORY_MUTATION);
  const [deleteCategoryMutation, { loading: deletingCategory }] = useMutation(DELETE_CATEGORY_MUTATION);

  useEffect(() => {
    if (currentCategory) {
      setFormState({
        name: currentCategory.name || '',
        slug: currentCategory.slug || '',
        description: currentCategory.description || '',
      });
    } else {
      setFormState({ name: '', slug: '', description: '' });
    }
  }, [currentCategory]);

  const handleOpenModal = (category?: Category) => {
    setCurrentCategory(category || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentCategory(null);
    setMutationError(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
    if (name === 'name' && !currentCategory?.id) { // Auto-generate slug for new categories if slug field is empty
        const slugValue = value.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
        setFormState(prev => ({ ...prev, slug: slugValue }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMutationError(null);
    if (!formState.name || !formState.slug) {
        setMutationError(t('categoryManagement.error.nameSlugRequired', 'نام و اسلاگ دسته‌بندی الزامی است.'));
        return;
    }

    const variables = { ...formState };

    try {
      if (currentCategory && currentCategory.id) {
        await updateCategory({ variables: { id: currentCategory.id, ...variables } });
      } else {
        await createCategory({ variables });
      }
      refetch();
      handleCloseModal();
       // TODO: Replace with toast notification - e.g., toast.success('Category saved!');
    } catch (err: any) {
+      // TODO: Replace with toast notification - e.g., toast.error(err.message || t(...));
      setMutationError(err.message || t('categoryManagement.error.saveGeneric', 'خطا در ذخیره دسته‌بندی.'));
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
+    // TODO: Replace window.confirm with a custom modal or MUI Dialog
    if (window.confirm(t('categoryManagement.confirmDelete', 'آیا از حذف این دسته‌بندی مطمئن هستید؟'))) {
      setMutationError(null);
      try {
        await deleteCategoryMutation({
          variables: { id: categoryId },
          update: (cache) => {
            cache.evict({ id: cache.identify({ __typename: 'Category', id: categoryId }) });
            cache.gc();
          }
        });
        refetch();
        // TODO: Replace with toast notification - e.g., toast.success('Category deleted!');
      } catch (err: any) {
+        // TODO: Replace with toast notification - e.g., toast.error(err.message || t(...));
        setMutationError(err.message || t('categoryManagement.error.deleteGeneric', 'خطا در حذف دسته‌بندی.'));
      }
    }
  };

  if (loading) return <p>{t('loading', 'در حال بارگذاری دسته‌بندی‌ها...')}</p>;
  if (error) return <p>{t('error', 'خطا در بارگذاری دسته‌بندی‌ها: ')} {error.message}</p>;

  return (
    // MUI: <Box sx={{ p: 2 }}>
    <div>
      {/* MUI: <Typography variant="h5" gutterBottom>{t('categoryManagement.title', 'مدیریت دسته‌بندی‌ها')}</Typography> */}
      <h3>{t('categoryManagement.title', 'مدیریت دسته‌بندی‌ها')}</h3>
      {/* MUI: <Button variant="contained" startIcon={<AddCircleOutlineIcon />} onClick={() => handleOpenModal()} sx={{ mb: 2 }}>{t('categoryManagement.addCategory', 'افزودن دسته‌بندی جدید')}</Button> */}
      <button onClick={() => handleOpenModal()} style={{ marginBottom: '20px', padding: '10px 15px' }}>
        {t('categoryManagement.addCategory', 'افزودن دسته‌بندی جدید')}
      </button>
      {mutationError && <p style={{color: 'red'}}>{mutationError}</p>} {/* MUI: <Alert severity="error" sx={{mb:2}}>{mutationError}</Alert> */}

      {/* MUI: <TableContainer component={Paper}> <Table> ... </Table> </TableContainer> */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={tableHeaderStyle}>{t('categoryManagement.table.name', 'نام')}</th>
            <th style={tableHeaderStyle}>{t('categoryManagement.table.slug', 'اسلاگ')}</th>
            <th style={tableHeaderStyle}>{t('categoryManagement.table.description', 'توضیحات')}</th>
            <th style={tableHeaderStyle}>{t('categoryManagement.table.coursesCount', 'تعداد دوره‌ها')}</th>
            <th style={tableHeaderStyle}>{t('categoryManagement.table.actions', 'عملیات')}</th>
          </tr>
        </thead>
        <tbody>
          {categories.map(category => (
            <tr key={category.id}>
              <td style={tableCellStyle}>{category.name}</td>
              <td style={tableCellStyle}>{category.slug}</td>
              <td style={tableCellStyle}>{category.description || '-'}</td>
              <td style={tableCellStyle}>{category._count?.courses || 0}</td>
              <td style={tableCellStyle}>
                {/* MUI: <IconButton size="small" onClick={() => handleOpenModal(category)}><EditIcon /></IconButton> */}
                <button onClick={() => handleOpenModal(category)} style={{marginRight: '5px'}}>{t('edit', 'ویرایش')}</button>
                {/* MUI: <IconButton size="small" color="error" onClick={() => handleDeleteCategory(category.id)} disabled={deletingCategory}><DeleteIcon /></IconButton> */}
                <button onClick={() => handleDeleteCategory(category.id)} disabled={deletingCategory} style={{color: 'red'}}>
                  {deletingCategory ? t('deleting', 'درحال حذف...') : t('delete', 'حذف')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal for Add/Edit Category */}
      {/* MUI: <Dialog open={isModalOpen} onClose={handleCloseModal}> <DialogTitle>...</DialogTitle> <DialogContent>...</DialogContent> <DialogActions>...</DialogActions> </Dialog> */}
      {isModalOpen && (
        <div style={{position: 'fixed', top: '10%', left: '30%', right: '30%', background: 'white', padding: '20px', border: '1px solid black', zIndex: 100, boxShadow: '0 0 10px rgba(0,0,0,0.5)'}}>
          <h3>{currentCategory?.id ? t('categoryManagement.editCategory', 'ویرایش دسته‌بندی') : t('categoryManagement.createCategory', 'ایجاد دسته‌بندی جدید')}</h3>
          {/* MUI: <Box component="form" onSubmit={handleSubmit} sx={{ '& .MuiTextField-root': { my: 1 } }}> */}
          <form onSubmit={handleSubmit}>
            {/* MUI: <TextField fullWidth label={t('categoryManagement.form.name', 'نام')} name="name" value={formState.name} onChange={handleChange} required /> */}
            <div style={{ marginBottom: '10px' }}>
              <label>{t('categoryManagement.form.name', 'نام')}:</label>
              <input type="text" name="name" value={formState.name} onChange={handleChange} required style={{width: '98%'}} />
            </div>
            {/* MUI: <TextField fullWidth label={t('categoryManagement.form.slug', 'اسلاگ')} name="slug" value={formState.slug} onChange={handleChange} required helperText={t('categoryManagement.form.slugHelper', 'برای URL دوستانه، از حروف کوچک انگلیسی، اعداد و خط تیره استفاده کنید.')} /> */}
            <div style={{ marginBottom: '10px' }}>
              <label>{t('categoryManagement.form.slug', 'اسلاگ')}:</label>
              <input type="text" name="slug" value={formState.slug} onChange={handleChange} required style={{width: '98%'}} />
              <small>{t('categoryManagement.form.slugHelper', 'برای URL دوستانه، از حروف کوچک انگلیسی، اعداد و خط تیره استفاده کنید.')}</small>
            </div>
            {/* MUI: <TextField fullWidth multiline rows={3} label={t('categoryManagement.form.description', 'توضیحات')} name="description" value={formState.description || ''} onChange={handleChange} /> */}
            <div style={{ marginBottom: '10px' }}>
              <label>{t('categoryManagement.form.description', 'توضیحات')}:</label>
              <textarea name="description" value={formState.description || ''} onChange={handleChange} style={{width: '98%', minHeight: '60px'}} />
            </div>
            <div style={{marginTop: '20px'}}>
              {/* MUI: <Button onClick={handleCloseModal}>{t('cancel', 'انصراف')}</Button> <Button type="submit" variant="contained" disabled={creatingCategory || updatingCategory}>{ (creatingCategory || updatingCategory) ? t('saving', 'ذخیره...') : t('save', 'ذخیره')}</Button> */}
              <button type="button" onClick={handleCloseModal} style={{marginRight: '10px'}}>{t('cancel', 'انصراف')}</button>
              <button type="submit" disabled={creatingCategory || updatingCategory}>
                {(creatingCategory || updatingCategory) ? t('saving', 'ذخیره...') : t('save', 'ذخیره')}
              </button>
            </div>
          </form>
          {/* MUI: </Box> */}
        </div>
      )}
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

export default CategoryManagementTab;
