import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@apollo/client';
import { GET_COURSE_DETAILS_FOR_EDIT as GET_LEARNING_COURSE_DETAILS, IS_ENROLLED_QUERY } from '../../graphql/queries'; // Re-use existing query for course structure
import { useAuth } from '../../context/AuthContext';

// MUI placeholder imports
// import Typography from '@mui/material/Typography';
// import Box from '@mui/material/Box';
// import Paper from '@mui/material/Paper';
// import List from '@mui/material/List';
// import ListItem from '@mui/material/ListItem';
// import ListItemButton from '@mui/material/ListItemButton';
// import ListItemText from '@mui/material/ListItemText';
// import Divider from '@mui/material/Divider';
// import CircularProgress from '@mui/material/CircularProgress';
// import Alert from '@mui/material/Alert';
// import Grid from '@mui/material/Grid';
// import ReactPlayer from 'react-player/lazy'; // Example for video, would need install

interface Lesson {
  id: string;
  title: string;
  content?: string | null;
  videoUrl?: string | null;
  duration?: number | null;
  isPreviewable: boolean;
  resources?: any | null;
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
  sections: Section[];
  instructor: { // Added for context, though not primary focus here
    profile?: { firstName?: string | null; lastName?: string | null; } | null;
    email: string;
  };
}

const LearningPage: React.FC = () => {
  const { t } = useTranslation();
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user, loading: authLoading } = useAuth();

  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isUserActuallyEnrolled, setIsUserActuallyEnrolled] = useState<boolean | null>(null);

  // Query to check enrollment status (important for protecting content)
  const { loading: checkingEnrollment, error: enrollmentErrorCheck, data: enrollmentData } = useQuery(IS_ENROLLED_QUERY, {
    variables: { courseId },
    skip: !isAuthenticated || !user || !courseId, // Skip if not logged in or no courseId
    onCompleted: (data) => {
        if (user?.role === 'STUDENT') {
            setIsUserActuallyEnrolled(data.isEnrolled);
        } else if (user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN') {
            setIsUserActuallyEnrolled(true); // Instructors/Admins can always view
        }
    },
    fetchPolicy: 'network-only' // Ensure fresh check
  });

  // Query for course details
  const { loading: courseLoading, error: courseError, data: courseData } = useQuery<{ getCourseById: Course }>(GET_LEARNING_COURSE_DETAILS, {
    variables: { id: courseId },
    skip: !courseId || isUserActuallyEnrolled === null, // Skip if courseId not present or enrollment not yet checked
  });

  useEffect(() => {
    if (courseData?.getCourseById && courseData.getCourseById.sections.length > 0 && courseData.getCourseById.sections[0].lessons.length > 0) {
      // Auto-select the first lesson of the first section initially if user can view it
      const firstLesson = courseData.getCourseById.sections[0].lessons[0];
      if(isUserActuallyEnrolled || firstLesson.isPreviewable) {
        setSelectedLesson(firstLesson);
      }
    }
  }, [courseData, isUserActuallyEnrolled]);

  useEffect(() => {
    // Redirect if enrollment check fails for a student
    if (!authLoading && !checkingEnrollment && isAuthenticated && user?.role === 'STUDENT' && isUserActuallyEnrolled === false) {
        alert(t('learningPage.notEnrolled', 'شما در این دوره ثبت نام نکرده اید یا دسترسی ندارید.'));
        navigate(`/course/${courseId}`);
    }
  }, [authLoading, checkingEnrollment, isAuthenticated, user, isUserActuallyEnrolled, courseId, navigate, t]);


  if (authLoading || checkingEnrollment || courseLoading || isUserActuallyEnrolled === null && isAuthenticated && user?.role === 'STUDENT' ) {
    // MUI: <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>
    return <p>{t('loading', 'در حال بارگذاری...')}</p>;
  }

  if (courseError) {
    // MUI: <Alert severity="error">{t('errorLoading', 'خطا در بارگذاری دوره: ')} {courseError.message}</Alert>
    return <p>{t('errorLoading', 'خطا در بارگذاری دوره: ')} {courseError.message}</p>;
  }
   if (enrollmentErrorCheck && user?.role === 'STUDENT') {
    // MUI: <Alert severity="error">{t('learningPage.enrollmentCheckError', 'خطا در بررسی وضعیت ثبت نام: ')} {enrollmentErrorCheck.message}</Alert>
    return <p>{t('learningPage.enrollmentCheckError', 'خطا در بررسی وضعیت ثبت نام: ')} {enrollmentErrorCheck.message}</p>;
  }
  if (!courseData?.getCourseById) {
    // MUI: <Alert severity="warning">{t('courseDetails.notFound', 'دوره یافت نشد.')}</Alert>
    return <p>{t('courseDetails.notFound', 'دوره یافت نشد.')}</p>;
  }

  // If a student is definitely not enrolled (and not loading), they should have been redirected.
  // This is an additional safeguard.
  if (user?.role === 'STUDENT' && isUserActuallyEnrolled === false) {
    return <p>{t('learningPage.accessDenied', 'دسترسی به این محتوا امکان پذیر نمی باشد.')}</p>;
  }


  const course = courseData.getCourseById;

  const handleLessonClick = (lesson: Lesson) => {
    if (isUserActuallyEnrolled || lesson.isPreviewable) {
      setSelectedLesson(lesson);
    } else {
      alert(t('learningPage.enrollToViewLesson', 'برای مشاهده این درس، ابتدا در دوره ثبت نام کنید.'));
    }
  };

  // Basic styling
  const pageLayoutSplit: React.CSSProperties = { display: 'flex', height: 'calc(100vh - 100px)' /* Adjust based on header/footer */ };
  const sidebarStyle: React.CSSProperties = { width: '300px', borderRight: '1px solid #eee', padding: '10px', overflowY: 'auto', background: '#f8f9fa' };
  const contentStyle: React.CSSProperties = { flexGrow: 1, padding: '20px', overflowY: 'auto' };
  const lessonListItemStyle: React.CSSProperties = { padding: '10px', cursor: 'pointer', borderBottom: '1px solid #ddd', '&:hover': { backgroundColor: '#efefef' } };
  const activeLessonStyle: React.CSSProperties = { ...lessonListItemStyle, backgroundColor: '#007bff', color: 'white' };

  return (
    // MUI: <Grid container spacing={0} sx={{ height: 'calc(100vh - 64px)' }}> {/* Adjust 64px for actual header height */}
    // MUI:   <Grid item xs={12} md={4} sx={{ borderRight: { md: '1px solid divider' }, maxHeight: '100%', overflowY: 'auto', p: 2, bgcolor: 'background.paper' }}> {/* Sidebar */}
    // MUI:   <Grid item xs={12} md={8} sx={{ maxHeight: '100%', overflowY: 'auto', p: 3 }}> {/* Main Content */}
    <div style={pageLayoutSplit}>
      <aside style={sidebarStyle}>
        {/* MUI: <Typography variant="h5" gutterBottom>{course.title}</Typography> */}
        <h3>{course.title}</h3>
        {/* MUI: <List component="nav" dense> */}
        {course.sections.sort((a,b) => a.order - b.order).map(section => (
          <div key={section.id} style={{marginBottom: '10px'}}>
            {/* MUI: <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 1, mb: 0.5, px: 1 }}>{section.title}</Typography> */}
            <h4 style={{paddingLeft: '10px'}}>{section.title}</h4>
            {/* MUI: <List component="div" disablePadding dense> */}
            {section.lessons.sort((a,b) => a.order - b.order).map(lesson => (
              // MUI: <ListItemButton key={lesson.id} selected={selectedLesson?.id === lesson.id} onClick={() => handleLessonClick(lesson)} disabled={!isUserActuallyEnrolled && !lesson.isPreviewable}> <ListItemText primary={lesson.title} secondary={lesson.isPreviewable ? t('preview', 'پیش نمایش') : ''} /> </ListItemButton>
              <div
                key={lesson.id}
                style={selectedLesson?.id === lesson.id ? activeLessonStyle : lessonListItemStyle}
                onClick={() => handleLessonClick(lesson)}
                title={(!isUserActuallyEnrolled && !lesson.isPreviewable) ? t('learningPage.enrollToViewLesson', '') : lesson.title}
              >
                {lesson.title} {lesson.isPreviewable ? `(${t('preview', 'پیش نمایش')})` : ''}
                {(!isUserActuallyEnrolled && !lesson.isPreviewable) && <span style={{fontSize: '0.8em', color: 'orange'}}> (🔒)</span>}
              </div>
            ))}
            {/* MUI: </List> */}
          </div>
        ))}
        {/* MUI: </List> */}
      </aside>

      <main style={contentStyle}>
        {selectedLesson ? (
          // MUI: <Paper elevation={3} sx={{ p: 3 }}>
          <div>
            {/* MUI: <Typography variant="h4" component="h2" gutterBottom>{selectedLesson.title}</Typography> */}
            <h2>{selectedLesson.title}</h2>
            {selectedLesson.videoUrl ? (
              <div style={{ margin: '20px 0', position: 'relative', paddingTop: '56.25%' /* 16:9 Aspect Ratio */ }}>
                {/* MUI: Would use a proper video player component e.g. ReactPlayer
                    <ReactPlayer url={selectedLesson.videoUrl} width="100%" height="100%" controls style={{ position: 'absolute', top: 0, left: 0 }} />
                */}
                <iframe
                    src={selectedLesson.videoUrl.includes("youtube.com/embed") ? selectedLesson.videoUrl : `https://www.youtube.com/embed/${selectedLesson.videoUrl.split('v=')[1]}`} // Basic YouTube embed logic
                    title={selectedLesson.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                ></iframe>
              </div>
            ) : (
              // MUI: <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-wrap', mt: 2 }}>{selectedLesson.content || t('learningPage.noContent', 'محتوایی برای این درس وجود ندارد.')}</Typography>
              <p style={{whiteSpace: 'pre-wrap', marginTop: '15px'}}>{selectedLesson.content || t('learningPage.noContent', 'محتوایی برای این درس وجود ندارد.')}</p>
            )}
            {/* TODO: Add resources display, next/prev lesson buttons, mark as complete */}
          </div>
          // MUI: </Paper>
        ) : (
          // MUI: <Typography variant="h6" sx={{textAlign: 'center', mt: 5}}>{t('learningPage.selectLesson', 'لطفا یک درس را برای مشاهده انتخاب کنید.')}</Typography>
          <p style={{textAlign: 'center', marginTop: '30px'}}>{t('learningPage.selectLesson', 'لطفا یک درس را برای مشاهده انتخاب کنید.')}</p>
        )}
      </main>
    </div>
    // MUI: </Grid> </Grid>
  );
};

export default LearningPage;
