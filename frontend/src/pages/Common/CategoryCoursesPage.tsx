import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { GET_CATEGORY_BY_SLUG, GET_COURSES_BY_CATEGORY_SLUG } from '../../graphql/queries';

// MUI Placeholder imports
// import Typography from '@mui/material/Typography';
// import Grid from '@mui/material/Grid';
// import Card from '@mui/material/Card';
// import CardContent from '@mui/material/CardContent';
// import CardMedia from '@mui/material/CardMedia';
// import CardActions from '@mui/material/CardActions';
// import Button from '@mui/material/Button';
// import Box from '@mui/material/Box';
// import CircularProgress from '@mui/material/CircularProgress';
// import Alert from '@mui/material/Alert';
// import Container from '@mui/material/Container';

interface CourseInstructor {
    profile?: { firstName?: string | null; lastName?: string | null; } | null;
    email: string;
}
interface Course {
  id: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  price?: number | null;
  instructor: CourseInstructor;
  // category field might be redundant here as we are on category page
}

interface Category {
  id: string;
  name: string;
  description?: string | null;
}

const CategoryCoursesPage: React.FC = () => {
  const { t } = useTranslation();
  const { categorySlug } = useParams<{ categorySlug: string }>();

  const { loading: categoryLoading, error: categoryError, data: categoryData } = useQuery<{ getCategoryBySlug: Category }>(
    GET_CATEGORY_BY_SLUG,
    { variables: { slug: categorySlug }, skip: !categorySlug }
  );

  const { loading: coursesLoading, error: coursesError, data: coursesData } = useQuery<{ getCoursesByCategorySlug: Course[] }>(
    GET_COURSES_BY_CATEGORY_SLUG,
    { variables: { slug: categorySlug, publishedOnly: true }, skip: !categorySlug }
  );

  // Basic card style (can be reused from HomePage or centralized)
  const cardStyle: React.CSSProperties = {
    border: '1px solid #ddd', borderRadius: '8px', padding: '15px', margin: '10px',
    width: '300px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'flex',
    flexDirection: 'column', justifyContent: 'space-between'
  };
  const cardImageStyle: React.CSSProperties = {
    width: '100%', height: '150px', objectFit: 'cover', borderRadius: '4px 4px 0 0', background: '#eee'
  };
  const cardContainerStyle: React.CSSProperties = {
    display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px'
  };


  if (categoryLoading || coursesLoading) return <p>{t('loading', 'در حال بارگذاری...')}</p>; // MUI: <CircularProgress />
  if (categoryError) return <p>{t('categoryPage.errorLoadingCategory', 'خطا در بارگذاری دسته‌بندی: ')} {categoryError.message}</p>; // MUI: <Alert severity="error">...</Alert>
  if (!categoryData?.getCategoryBySlug) return <p>{t('categoryPage.notFound', 'دسته‌بندی یافت نشد.')}</p>; // MUI: <Alert severity="warning">...</Alert>

  const category = categoryData.getCategoryBySlug;
  const courses = coursesData?.getCoursesByCategorySlug || [];

  return (
    // MUI: <Container maxWidth="lg" sx={{ py: 3 }}>
    <div>
      {/* MUI: <Typography variant="h3" component="h1" gutterBottom>{category.name}</Typography> */}
      <h1>{category.name}</h1>
      {/* MUI: {category.description && <Typography variant="subtitle1" color="text.secondary" paragraph>{category.description}</Typography>} */}
      {category.description && <p style={{color: 'gray', marginBottom: '20px'}}>{category.description}</p>}

      {coursesError && <p style={{color: 'red'}}>{t('categoryPage.errorLoadingCourses', 'خطا در بارگذاری دوره‌های این دسته‌بندی: ')} {coursesError.message}</p>}

      {/* MUI: <Typography variant="h5" component="h2" gutterBottom sx={{mt:3}}>{t('categoryPage.coursesInThisCategory', 'دوره‌های این دسته‌بندی')}</Typography> */}
      <h2 style={{marginTop: '30px'}}>{t('categoryPage.coursesInThisCategory', 'دوره‌های این دسته‌بندی')}</h2>

      {courses.length === 0 && !coursesLoading && (
        // MUI: <Typography>{t('categoryPage.noCourses', 'در حال حاضر هیچ دوره ای در این دسته‌بندی وجود ندارد.')}</Typography>
        <p>{t('categoryPage.noCourses', 'در حال حاضر هیچ دوره ای در این دسته‌بندی وجود ندارد.')}</p>
      )}

      {/* MUI: <Grid container spacing={3} justifyContent="center"> */}
      <div style={cardContainerStyle}>
        {courses.map(course => (
          // MUI: <Grid item key={course.id} xs={12} sm={6} md={4}> <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}> ... </Card> </Grid>
          <div key={course.id} style={cardStyle}>
            {/* MUI: <CardMedia component="img" height="150" image={course.thumbnailUrl || "/placeholder-image.jpg"} alt={course.title} /> */}
            <img src={course.thumbnailUrl || '/placeholder-image.jpg'} alt={course.title} style={cardImageStyle} />
            {/* MUI: <CardContent sx={{ flexGrow: 1 }}> */}
            <div style={{flexGrow: 1}}>
              {/* MUI: <Typography gutterBottom variant="h5" component="div">{course.title}</Typography> */}
              <h3 style={{ marginTop: '10px', fontSize: '1.2em' }}>{course.title}</h3>
              {/* MUI: <Typography variant="body2" color="text.secondary" paragraph>{course.description ? ... : ...}</Typography> */}
              <p style={{ fontSize: '0.9em', color: '#777' }}>
                {course.description ? (course.description.length > 100 ? `${course.description.substring(0, 100)}...` : course.description) : t('noDescription', 'بدون توضیحات')}
              </p>
              {/* MUI: <Typography variant="caption" color="text.secondary">...</Typography> */}
              <p style={{ fontSize: '0.9em', color: '#555' }}>
                {t('instructor', 'مدرس')}: {course.instructor.profile?.firstName || ''} {course.instructor.profile?.lastName || course.instructor.email}
              </p>
            </div>
            {/* MUI: </CardContent> */}
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
      {/* MUI: </Grid> */}
    </div>
    // MUI: </Container>
  );
};

export default CategoryCoursesPage;
