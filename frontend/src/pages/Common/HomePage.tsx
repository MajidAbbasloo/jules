import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@apollo/client';
import { Link } from 'react-router-dom';
import { GET_ALL_COURSES, GET_ALL_CATEGORIES } from '../../graphql/queries'; // Assuming GET_ALL_COURSES fetches published by default

// Define a simple Course interface for type safety
interface Course {
  id: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  price?: number | null;
  category?: {
    id: string;
    name: string;
  } | null;
  instructor: {
    id: string;
    profile?: {
        firstName?: string | null;
        lastName?: string | null;
    } | null;
    email: string;
  };
}

interface Category {
    id: string;
    name: string;
    slug: string;
    _count?: { courses: number } | null; // If fetching course count
}


const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const { loading: loadingCourses, error: errorCourses, data: dataCourses } = useQuery(GET_ALL_COURSES, {
    variables: { publishedOnly: true } // Ensure we fetch only published courses
  });
  const { loading: loadingCategories, error: errorCategories, data: dataCategories } = useQuery(GET_ALL_CATEGORIES);


  // Basic card style
// import Typography from '@mui/material/Typography';
// import Grid from '@mui/material/Grid';
// import Card from '@mui/material/Card';
// import CardContent from '@mui/material/CardContent';
// import CardMedia from '@mui/material/CardMedia';
// import CardActions from '@mui/material/CardActions';
// import Button from '@mui/material/Button';
// import Chip from '@mui/material/Chip';
// import Box from '@mui/material/Box';
// import CircularProgress from '@mui/material/CircularProgress';
// import Alert from '@mui/material/Alert';

  const cardStyle: React.CSSProperties = { // MUI: This would be handled by <Card sx={{ ... }}>
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '15px', // MUI <Card> has its own padding, or use <CardContent>
    margin: '10px', // MUI: Use Grid item spacing or Box margin
    width: '300px', // MUI: Grid item xs, sm, md props for responsiveness
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)', // MUI: <Card elevation={...}>
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between'
  };

  const cardImageStyle: React.CSSProperties = { // MUI: <CardMedia image="..." title="..." sx={{ height: 150 }} />
    width: '100%',
    height: '150px',
    objectFit: 'cover',
    borderRadius: '4px 4px 0 0'
  };

  const cardContainerStyle: React.CSSProperties = { // MUI: <Grid container spacing={2} justifyContent="center"> ... </Grid>
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '10px'
  };

  const categoryLinkStyle: React.CSSProperties = { // MUI: <Chip component={Link} to={...} label={...} clickable /> or <Button component={Link} ...>
    margin: '0 5px',
    padding: '5px 10px',
    background: '#f0f0f0',
    borderRadius: '15px',
    textDecoration: 'none',
    color: '#333'
  };


  if (loadingCourses || loadingCategories) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>; // MUI: Loading spinner

  let errorMessages = [];
  if (errorCourses) errorMessages.push(t('homePage.errorCourses', 'خطا در بارگذاری دوره ها: ') + errorCourses.message);
  if (errorCategories) errorMessages.push(t('homePage.errorCategories', 'خطا در بارگذاری دسته بندی ها: ') + errorCategories.message);
  if (errorMessages.length > 0) return <Alert severity="error">{errorMessages.join(' | ')}</Alert>; // MUI: Alert component


  const courses: Course[] = dataCourses?.getAllCourses || [];
  const categories: Category[] = dataCategories?.getAllCategories || [];

  return (
    // MUI: <Container maxWidth="lg">
    <div>
      {/* MUI: <Typography variant="h3" component="h1" gutterBottom textAlign="center">{t('homePage.title', 'به سامانه مدیریت یادگیری خوش آمدید')}</Typography> */}
      <h1>{t('homePage.title', 'به سامانه مدیریت یادگیری خوش آمدید')}</h1>
      {/* MUI: <Typography variant="subtitle1" textAlign="center" color="text.secondary" paragraph>{t('homePage.description', '...')}</Typography> */}
      <p>{t('homePage.description', 'دوره های متنوعی را در اینجا پیدا کنید و یادگیری خود را شروع کنید.')}</p>

      {/* MUI: <Box component="section" sx={{ my: 4 }}> */}
      <section style={{ margin: '30px 0' }}>
        {/* MUI: <Typography variant="h4" component="h2" gutterBottom textAlign="center">{t('homePage.categoriesTitle', 'دسته بندی ها')}</Typography> */}
        <h2>{t('homePage.categoriesTitle', 'دسته بندی ها')}</h2>
        {/* MUI: <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1, mb: 4 }}> */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px', marginBottom: '30px' }}>
            {categories.map(category => (
                // MUI: <Chip component={Link} to={`/category/${category.slug}`} label={`${category.name} ${category._count?.courses ? `(${category._count.courses})` : ''}`} clickable sx={{...categoryLinkStyle}} />
                <Link key={category.id} to={`/category/${category.slug}`} style={categoryLinkStyle}>
                    {category.name} {category._count?.courses ? `(${category._count.courses})` : ''}
                </Link>
            ))}
        </div>
      </section>

      {/* MUI: <Typography variant="h4" component="h2" gutterBottom textAlign="center">{t('homePage.availableCourses', 'دوره های موجود')}</Typography> */}
      <h2>{t('homePage.availableCourses', 'دوره های موجود')}</h2>
      {courses.length === 0 && !loadingCourses && (
        // MUI: <Typography textAlign="center">{t('homePage.noCoursesAvailable', '...')}</Typography>
        <p>{t('homePage.noCoursesAvailable', 'در حال حاضر هیچ دوره ای برای نمایش وجود ندارد.')}</p>
      )}
      {/* MUI: <Grid container spacing={3} justifyContent="center"> */}
      <div style={cardContainerStyle}>
        {courses.map(course => (
          // MUI: <Grid item key={course.id} xs={12} sm={6} md={4}> <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}> ... </Card> </Grid>
          <div key={course.id} style={cardStyle}>
            {/* MUI: <CardMedia component="img" height="150" image={course.thumbnailUrl || "/placeholder-image.jpg"} alt={course.title} /> */}
            <div>
              {course.thumbnailUrl ? (
                <img src={course.thumbnailUrl} alt={course.title} style={cardImageStyle} />
              ) : (
                <div style={{...cardImageStyle, background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {/* MUI: Can use an Icon here e.g. <ImageIcon sx={{ fontSize: 40, color: 'grey.500' }} /> */}
                  <span>{t('noImage', 'بدون تصویر')}</span>
                </div>
              )}
              {/* MUI: <CardContent sx={{ flexGrow: 1 }}> */}
              {/* MUI: <Typography gutterBottom variant="h5" component="div">{course.title}</Typography> */}
              <h3 style={{ marginTop: '10px', fontSize: '1.2em' }}>{course.title}</h3>
              {/* MUI: {course.category && <Typography variant="body2" color="text.secondary">...</Typography>} */}
              {course.category && <p style={{ fontSize: '0.9em', color: '#555' }}>{t('category', 'دسته بندی')}: {course.category.name}</p>}
              {/* MUI: <Typography variant="body2" color="text.secondary" paragraph sx={{ flexGrow: 1 }}>...</Typography> */}
              <p style={{ fontSize: '0.9em', color: '#777', flexGrow: 1 }}>
                {course.description ? (course.description.length > 100 ? `${course.description.substring(0, 100)}...` : course.description) : t('noDescription', 'بدون توضیحات')}
              </p>
              {/* MUI: <Typography variant="caption" color="text.secondary">...</Typography> */}
               <p style={{ fontSize: '0.9em', color: '#555' }}>
                {t('instructor', 'مدرس')}: {course.instructor.profile?.firstName || ''} {course.instructor.profile?.lastName || course.instructor.email}
              </p>
              {/* MUI: </CardContent> */}
            </div>
            {/* MUI: <CardActions sx={{ mt: 'auto' }}> <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}> ... </Box> </CardActions> */}
            <div style={{ marginTop: 'auto' }}>
              {/* MUI: <Typography variant="h6" component="p" sx={{ fontWeight: 'bold' }}>...</Typography> */}
              <p style={{ fontWeight: 'bold', fontSize: '1.1em', margin: '10px 0' }}>
                {course.price === 0 ? t('free', 'رایگان') : `${t('price', 'قیمت')}: ${course.price} ${t('currencySymbol', 'تومان')}`}
              </p>
              {/* MUI: <Button component={Link} to={`/course/${course.id}`} size="small" variant="contained" fullWidth>{t('viewDetails', 'مشاهده جزئیات')}</Button> */}
              <Link to={`/course/${course.id}`} style={{ display: 'block', textAlign: 'center', padding: '10px', backgroundColor: '#007bff', color: 'white', textDecoration: 'none', borderRadius: '0 0 4px 4px' }}>
                {t('viewDetails', 'مشاهده جزئیات')}
              </Link>
            </div>
          </div>
        ))}
      </div>
      {/* MUI: </Container> */}
    </div>
  );
};

export default HomePage;
