import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@apollo/client';
import { GET_COURSE_DETAILS_FOR_EDIT as GET_COURSE_DETAILS } from '../../graphql/queries'; // Using the same query for now

interface Lesson {
  id: string;
  title: string;
  content?: string | null;
  videoUrl?: string | null;
  duration?: number | null;
  isPreviewable: boolean;
  resources?: any | null; // Json
}

interface Section {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  description?: string | null;
  price?: number | null;
  thumbnailUrl?: string | null;
  tags?: string[] | null;
  isPublished: boolean;
  instructor: {
    id: string;
    email: string;
    profile?: {
      firstName?: string | null;
      lastName?: string | null;
      bio?: string | null;
      avatarUrl?: string | null;
    } | null;
  };
  category?: {
    id: string;
    name: string;
  } | null;
  sections: Section[];
  // enrollments, reviews can be added if needed
}

const CourseDetailsPage: React.FC = () => {
  const { t } = useTranslation();
  const { courseId } = useParams<{ courseId: string }>();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const { loading, error, data } = useQuery<{ getCourseById: Course }>(GET_COURSE_DETAILS, {
    variables: { id: courseId },
    skip: !courseId,
  });

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  if (loading) return <p>{t('loading', 'در حال بارگذاری...')}</p>;
  if (error) return <p>{t('errorLoading', 'خطا در بارگذاری جزئیات دوره: ')} {error.message}</p>;
  if (!data || !data.getCourseById) return <p>{t('courseDetails.notFound', 'دوره مورد نظر یافت نشد.')}</p>;

  const course = data.getCourseById;

  // Basic styling (can be moved to CSS files or styled-components)
// import Typography from '@mui/material/Typography';
// import Box from '@mui/material/Box';
// import Chip from '@mui/material/Chip';
// import Button from '@mui/material/Button';
// import Accordion from '@mui/material/Accordion';
// import AccordionSummary from '@mui/material/AccordionSummary';
// import AccordionDetails from '@mui/material/AccordionDetails';
// import ExpandMoreIcon from '@mui/icons-material/ExpandMore'; // Placeholder
// import List from '@mui/material/List';
// import ListItem from '@mui/material/ListItem';
// import ListItemText from '@mui/material/ListItemText';
// import Avatar from '@mui/material/Avatar';
// import Paper from '@mui/material/Paper';
// import Grid from '@mui/material/Grid';
// import Divider from '@mui/material/Divider';
// import StarIcon from '@mui/icons-material/Star'; // For reviews

  const pageStyle: React.CSSProperties = { padding: '20px', fontFamily: 'Arial, sans-serif' }; // MUI: <Container sx={{ py: 3 }}>
  const headerStyle: React.CSSProperties = { borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '20px' }; // MUI: <Box sx={{ borderBottom: 1, borderColor: 'divider', pb: 2, mb: 3 }}>
  const instructorBioStyle: React.CSSProperties = { background: '#f9f9f9', padding: '15px', borderRadius: '5px', marginTop: '20px' }; // MUI: <Paper elevation={1} sx={{ p: 2, mt: 3, bgcolor: 'grey.100' }}>
  const curriculumStyle: React.CSSProperties = { marginTop: '30px' }; // MUI: <Box sx={{ mt: 4 }}>
  const sectionHeaderStyle: React.CSSProperties = { background: '#e9ecef', padding: '10px', cursor: 'pointer', border: '1px solid #ddd', marginTop: '10px' }; // MUI: This would be <AccordionSummary>
  const lessonItemStyle: React.CSSProperties = { padding: '8px 15px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }; // MUI: <ListItem>

  return (
    // MUI: <Container maxWidth="md" sx={{ py: 3 }}>
    <div style={pageStyle}>
      {/* MUI: <Box sx={{ mb: 3 }}> */}
      <header style={headerStyle}>
        {/* MUI: <Typography variant="h3" component="h1" gutterBottom>{course.title}</Typography> */}
        <h1>{course.title}</h1>
        {/* MUI: {course.category && <Typography variant="subtitle1" color="text.secondary">...</Typography>} */}
        {course.category && <p>{t('category', 'دسته بندی')}: <Link to={`/category/${course.category.id}`}>{course.category.name}</Link></p>}
        {/* MUI: <Typography variant="body1" paragraph sx={{ color: 'text.secondary' }}>{course.description}</Typography> */}
        <p style={{ color: '#555' }}>{course.description}</p>
        {/* MUI: <Typography variant="h5" component="p" sx={{ my: 2 }}>...</Typography> */}
        <p>
          {t('price', 'قیمت')}:{' '}
          <strong>{course.price === 0 ? t('free', 'رایگان') : `${course.price} ${t('currencySymbol', 'تومان')}`}</strong>
        </p>
        {/* MUI: <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, my: 1 }}> {course.tags.map(tag => <Chip key={tag} label={tag} />)} </Box> */}
        {course.tags && course.tags.length > 0 && (
          <p>{t('tags', 'برچسب ها')}: {course.tags.join(', ')}</p>
        )}
      </header>
      {/* MUI: </Box> */}

      {/* MUI: <Button variant="contained" color="primary" size="large" sx={{ my: 2 }}>{t('courseDetails.enrollButton', 'ثبت نام در دوره')}</Button> */}
      <button style={{padding: '10px 20px', fontSize: '1.1em', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer'}}>
        {t('courseDetails.enrollButton', 'ثبت نام در دوره')}
      </button>

      {/* MUI: <Box sx={{ my: 3 }}> <img ... style={{ width: '100%', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }} /> </Box> */}
      {course.thumbnailUrl && (
        <img src={course.thumbnailUrl} alt={course.title} style={{ maxWidth: '100%', height: 'auto', borderRadius: '5px', margin: '20px 0' }} />
      )}

      {/* TODO: Add preview video if available - MUI: could use a CardMedia or a dedicated video player component */}

      {/* MUI: <Paper elevation={2} sx={{ p: 2, my: 3 }}> <Grid container spacing={2} alignItems="center"> <Grid item><Avatar src={course.instructor.profile?.avatarUrl} /> </Grid> <Grid item xs> <Typography variant="h6">{...}</Typography> <Typography variant="body2" color="text.secondary">{course.instructor.profile?.bio}</Typography> </Grid> </Grid> </Paper> */}
      <div style={instructorBioStyle}>
        <h3>{t('instructor', 'مدرس')}</h3>
        <p>
          {course.instructor.profile?.firstName || ''} {course.instructor.profile?.lastName || course.instructor.email}
        </p>
        {course.instructor.profile?.bio && <p>{course.instructor.profile.bio}</p>}
      </div>

      {/* MUI: <Box sx={{ my: 4 }}> */}
      <div style={curriculumStyle}>
        {/* MUI: <Typography variant="h4" component="h2" gutterBottom>{t('courseDetails.curriculumTitle', 'سرفصل های دوره')}</Typography> */}
        <h2>{t('courseDetails.curriculumTitle', 'سرفصل های دوره')}</h2>
        {course.sections.length === 0 && <p>{t('courseDetails.noSections', 'هنوز سرفصلی برای این دوره تعریف نشده است.')}</p>}
        {course.sections.map((section, index) => (
          // MUI: <Accordion key={section.id} expanded={expandedSections[section.id] || false} onChange={() => toggleSection(section.id)}> <AccordionSummary expandIcon={<ExpandMoreIcon />}>{section.title}</AccordionSummary> <AccordionDetails> <List disablePadding> ... </List> </AccordionDetails> </Accordion>
          <div key={section.id}>
            <div style={sectionHeaderStyle} onClick={() => toggleSection(section.id)}>
              <strong>{section.title}</strong>
              <span>{expandedSections[section.id] ? '[-]' : '[+]'}</span>
            </div>
            {expandedSections[section.id] && (
              // MUI: <List disablePadding>
              <ul style={{ listStyle: 'none', paddingLeft: '20px', border: '1px solid #ddd', borderTop: 'none' }}>
                {section.lessons.map(lesson => (
                  // MUI: <ListItem key={lesson.id} divider> <ListItemText primary={lesson.title} /> {lesson.isPreviewable && <Chip label={t('preview', 'پیش نمایش')} size="small" color="success" />} </ListItem>
                  <li key={lesson.id} style={lessonItemStyle}>
                    <span>{lesson.title}</span>
                    {lesson.isPreviewable && <span style={{color: 'green', fontSize: '0.9em'}}>({t('preview', 'پیش نمایش')})</span>}
                  </li>
                ))}
                {section.lessons.length === 0 && <li style={lessonItemStyle}>{t('courseDetails.noLessonsInSection', 'درسی در این سرفصل وجود ندارد.')}</li>}
              </ul>
              // MUI: </List>
            )}
          </div>
        ))}
      </div>
      {/* MUI: </Box> */}

      {/* MUI: <Box sx={{ my: 4 }}> <Typography variant="h5" gutterBottom>{t('courseDetails.reviewsTitle', 'نظرات دانشجویان')}</Typography> ... </Box> */}
      <div style={{marginTop: '30px'}}>
        <h3>{t('courseDetails.reviewsTitle', 'نظرات دانشجویان')}</h3>
        <p>{t('courseDetails.noReviews', 'هنوز نظری برای این دوره ثبت نشده است.')}</p>
      </div>
      {/* MUI: </Container> */}
    </div>
  );
};

export default CourseDetailsPage;
