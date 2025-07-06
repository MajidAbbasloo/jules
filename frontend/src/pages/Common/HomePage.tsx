import React, { useState, useEffect } from 'react'; // Added useState, useEffect
import { useTranslation } from 'react-i18next';
import { useQuery, useLazyQuery } from '@apollo/client'; // Added useLazyQuery
import { Link } from 'react-router-dom';
import { GET_ALL_CATEGORIES } from '../../graphql/queries'; // GET_ALL_COURSES will be replaced
import { GET_ALL_COURSES_WITH_FILTERS } from '../../graphql/courseSearchQueries'; // New query

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


// Client-side Enums (mirroring backend, ideally from codegen)
enum CourseLevel {
  BEGINNER = "BEGINNER",
  INTERMEDIATE = "INTERMEDIATE",
  ADVANCED = "ADVANCED",
  ALL_LEVELS = "ALL_LEVELS",
}

enum CourseSortBy {
  NEWEST = "NEWEST",
  POPULARITY = "POPULARITY",
  HIGHEST_RATED = "HIGHEST_RATED",
}

interface Filters {
  searchQuery: string;
  categoryIds: string[];
  levels: CourseLevel[];
  priceMin?: number;
  priceMax?: number;
  languages: string[];
  sortBy: CourseSortBy;
}

const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<Filters>({
    searchQuery: '',
    categoryIds: [],
    levels: [],
    languages: [],
    sortBy: CourseSortBy.NEWEST,
    // priceMin and priceMax initially undefined
  });
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Use useLazyQuery for courses to trigger on filter change
  const [loadCourses, { loading: loadingCourses, error: errorCourses, data: dataCourses }] = useLazyQuery(GET_ALL_COURSES_WITH_FILTERS);

  const { loading: loadingCategories, error: errorCategories, data: dataCategories } = useQuery(GET_ALL_CATEGORIES);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(filters.searchQuery);
    }, 500); // 500ms delay
    return () => clearTimeout(handler);
  }, [filters.searchQuery]);

  // Fetch courses when filters change (including debounced search)
  useEffect(() => {
    loadCourses({
      variables: {
        publishedOnly: true,
        searchQuery: debouncedSearchQuery || null, // Send null if empty
        categoryIds: filters.categoryIds.length > 0 ? filters.categoryIds : null,
        levels: filters.levels.length > 0 ? filters.levels : null,
        priceMin: filters.priceMin,
        priceMax: filters.priceMax,
        languages: filters.languages.length > 0 ? filters.languages : null,
        sortBy: filters.sortBy,
      }
    });
  }, [debouncedSearchQuery, filters.categoryIds, filters.levels, filters.priceMin, filters.priceMax, filters.languages, filters.sortBy, loadCourses]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setFilters(prev => {
        const currentValues = prev[name as keyof Filters] as string[] || [];
        if (checked) {
          return { ...prev, [name]: [...currentValues, value] };
        } else {
          return { ...prev, [name]: currentValues.filter(item => item !== value) };
        }
      });
    } else if (name === "priceMin" || name === "priceMax") {
        setFilters(prev => ({ ...prev, [name]: value === '' ? undefined : parseFloat(value) }));
    }
     else {
      setFilters(prev => ({ ...prev, [name]: value }));
    }
  };

  // Example for multi-select category (can be improved with a proper multi-select component)
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setFilters(prev => ({ ...prev, categoryIds: selectedOptions }));
  };


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
    // MUI: <Container maxWidth="lg" sx={{ py: 3 }}>
    <div>
      {/* MUI: <Typography variant="h3" component="h1" gutterBottom textAlign="center">{t('homePage.title', 'به سامانه مدیریت یادگیری خوش آمدید')}</Typography> */}
      <h1>{t('homePage.title', 'به سامانه مدیریت یادگیری خوش آمدید')}</h1>
      {/* MUI: <Typography variant="subtitle1" textAlign="center" color="text.secondary" paragraph>{t('homePage.description', '...')}</Typography> */}
      <p>{t('homePage.description', 'دوره های متنوعی را در اینجا پیدا کنید و یادگیری خود را شروع کنید.')}</p>

      {/* MUI: <Paper elevation={2} sx={{ p: 2, my: 3 }}> <Grid container spacing={2} alignItems="center"> ... filter inputs ... </Grid> </Paper> */}
      <div style={{ padding: '20px', margin: '20px 0', border: '1px solid #eee', borderRadius: '8px', background: '#f9f9f9' }}>
        <h3 style={{marginTop: 0}}>{t('filters.title', 'جستجو و فیلتر دوره‌ها')}</h3>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px'}}>
          {/* MUI: <TextField label={t('filters.searchQuery', 'جستجو...')} name="searchQuery" value={filters.searchQuery} onChange={handleFilterChange} variant="outlined" size="small" fullWidth /> */}
          <div>
            <label htmlFor="searchQuery" style={{display: 'block', marginBottom: '5px'}}>{t('filters.searchQuery', 'جستجو در عنوان/توضیحات')}:</label>
            <input type="text" id="searchQuery" name="searchQuery" value={filters.searchQuery} onChange={handleFilterChange} placeholder={t('filters.searchPlaceholder', 'مثلا: رياكت پيشرفته')} style={{width: 'calc(100% - 16px)', padding: '8px'}}/>
          </div>

          {/* MUI: <FormControl fullWidth size="small"><InputLabel>{t('filters.category', 'دسته بندی')}</InputLabel><Select multiple name="categoryIds" value={filters.categoryIds} onChange={handleCategoryChange} renderValue={(selected) => categories.filter(c=>selected.includes(c.id)).map(c=>c.name).join(', ')}>{categories.map...}</Select></FormControl> */}
          <div>
            <label htmlFor="categoryIds" style={{display: 'block', marginBottom: '5px'}}>{t('filters.category', 'دسته بندی (چند انتخاب با Ctrl/Cmd)')}:</label>
            <select id="categoryIds" name="categoryIds" multiple value={filters.categoryIds} onChange={handleCategoryChange} style={{width: '100%', minHeight: '60px', padding: '8px'}}>
              {loadingCategories ? <option disabled>{t('loading', '...')}</option> : categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* MUI: <FormControl fullWidth size="small"><InputLabel>{t('filters.level', 'سطح')}</InputLabel><Select multiple name="levels" value={filters.levels} onChange={(e) => setFilters(prev => ({...prev, levels: e.target.value as CourseLevel[]}))} renderValue={(selected) => selected.join(', ')}>{Object.values(CourseLevel).map...}</Select></FormControl> */}
          <div>
            <label style={{display: 'block', marginBottom: '5px'}}>{t('filters.level', 'سطح دوره')}:</label>
            {Object.values(CourseLevel).filter(level => level !== CourseLevel.ALL_LEVELS).map(level => (
              <label key={level} style={{marginRight: '10px', display: 'inline-block'}}>
                <input type="checkbox" name="levels" value={level} checked={filters.levels.includes(level)} onChange={handleFilterChange} />
                {t(`courseLevels.${level}`, level)}
              </label>
            ))}
          </div>

          {/* MUI for price: Could use two TextFields for min/max or a RangeSlider */}
          <div style={{display: 'flex', gap: '10px'}}>
            <div>
              <label htmlFor="priceMin" style={{display: 'block', marginBottom: '5px'}}>{t('filters.priceMin', 'حداقل قیمت')}:</label>
              <input type="number" id="priceMin" name="priceMin" value={filters.priceMin ?? ''} onChange={handleFilterChange} placeholder="0" style={{width: '80px', padding: '8px'}} />
            </div>
            <div>
              <label htmlFor="priceMax" style={{display: 'block', marginBottom: '5px'}}>{t('filters.priceMax', 'حداکثر قیمت (0 برای رایگان)')}:</label>
              <input type="number" id="priceMax" name="priceMax" value={filters.priceMax ?? ''} onChange={handleFilterChange} placeholder="1000000" style={{width: '80px', padding: '8px'}} />
            </div>
          </div>

          {/* MUI: <TextField label={t('filters.language', 'زبان (مثلا: فارسی, انگلیسی)')} name="languages" value={filters.languages.join(',')} onChange={(e)=>setFilters(prev=>({...prev, languages: e.target.value.split(',').map(l=>l.trim()).filter(l=>l)}))} helperText={t('filters.commaSeparated', 'با ویرگول جدا کنید')} variant="outlined" size="small" fullWidth /> */}
           <div>
            <label htmlFor="languages" style={{display: 'block', marginBottom: '5px'}}>{t('filters.language', 'زبان')}:</label>
            <input type="text" id="languages" name="languages" value={filters.languages.join(',')} onChange={(e)=>setFilters(prev=>({...prev, languages: e.target.value.split(',').map(l=>l.trim()).filter(l=>l)}))} placeholder={t('filters.languagePlaceholder', 'فارسی, انگلیسی')} style={{width: 'calc(100% - 16px)', padding: '8px'}}/>
          </div>

          {/* MUI: <FormControl fullWidth size="small"><InputLabel>{t('filters.sortBy', 'مرتب سازی بر اساس')}</InputLabel><Select name="sortBy" value={filters.sortBy} onChange={handleFilterChange}>{Object.values(CourseSortBy).map...}</Select></FormControl> */}
          <div>
            <label htmlFor="sortBy" style={{display: 'block', marginBottom: '5px'}}>{t('filters.sortBy', 'مرتب سازی بر اساس')}:</label>
            <select id="sortBy" name="sortBy" value={filters.sortBy} onChange={handleFilterChange} style={{width: '100%', padding: '8px'}}>
              {Object.values(CourseSortBy).map(sort => (
                <option key={sort} value={sort}>{t(`courseSortBy.${sort}`, sort)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

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
