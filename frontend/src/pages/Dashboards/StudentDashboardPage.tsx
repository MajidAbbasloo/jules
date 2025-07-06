import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../context/AuthContext'; // Corrected path
import { useQuery } from '@apollo/client';
import { Link } from 'react-router-dom';
import { GET_MY_ENROLLED_COURSES } from '../../../graphql/queries';

interface EnrolledCourse {
  id: string; // Enrollment ID
  enrolledAt: string;
  progress: number | null;
  course: {
    id: string;
    title: string;
    thumbnailUrl?: string | null;
    description?: string | null;
    instructor: {
      profile?: {
        firstName?: string | null;
        lastName?: string | null;
      } | null;
    };
    category?: {
      name: string;
    } | null;
  };
}

const StudentDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { loading, error, data } = useQuery<{ getMyEnrolledCourses: EnrolledCourse[] }>(GET_MY_ENROLLED_COURSES, {
    skip: !user, // Skip if user is not logged in
  });

  if (loading) return <p>{t('loading', 'در حال بارگذاری دوره های شما...')}</p>;
  if (error) return <p>{t('studentDashboard.errorLoadingCourses', 'خطا در بارگذاری دوره های ثبت نام شده: ')} {error.message}</p>;

  const enrolledCourses = data?.getMyEnrolledCourses || [];

  // Basic card style (similar to HomePage, can be centralized later)
  const cardStyle: React.CSSProperties = {
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '15px',
    margin: '10px',
    width: '300px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between'
  };
   const cardImageStyle: React.CSSProperties = {
    width: '100%',
    height: '150px',
    objectFit: 'cover',
    borderRadius: '4px 4px 0 0',
    background: '#eee'
  };
  const cardContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '15px'
  };

  return (
    <div>
      {/* MUI: <Typography variant="h4" gutterBottom>{t('studentDashboard.title', 'داشبورد دانش آموز')}</Typography> */}
      <h2>{t('studentDashboard.title', 'داشبورد دانش آموز')}</h2>
      {/* MUI: {user && <Typography variant="h6" gutterBottom>{t('studentDashboard.welcome', 'خوش آمدید')}, {user.profile?.firstName || user.email}!</Typography>} */}
      {user && <p>{t('studentDashboard.welcome', 'خوش آمدید')}, {user.profile?.firstName || user.email}!</p>}

      {/* MUI: <Typography variant="h5" sx={{my: 2}}>{t('studentDashboard.myCoursesTitle', 'دوره های من')}</Typography> */}
      <h3>{t('studentDashboard.myCoursesTitle', 'دوره های من')}</h3>

      {enrolledCourses.length === 0 ? (
        // MUI: <Typography>{t('studentDashboard.noCoursesEnrolled', 'شما هنوز در هیچ دوره ای ثبت نام نکرده اید.')}</Typography>
        <p>{t('studentDashboard.noCoursesEnrolled', 'شما هنوز در هیچ دوره ای ثبت نام نکرده اید.')}</p>
      ) : (
        // MUI: <Grid container spacing={2}>
        <div style={cardContainerStyle}>
          {enrolledCourses.map(({ id: enrollmentId, course, progress }) => (
            // MUI: <Grid item xs={12} sm={6} md={4} key={enrollmentId}> <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}> ... </Card> </Grid>
            <div key={enrollmentId} style={cardStyle}>
              {/* MUI: <CardMedia component="img" height="140" image={course.thumbnailUrl || '/placeholder.png'} alt={course.title} /> */}
              <img
                src={course.thumbnailUrl || '/placeholder-image.jpg'} // Provide a real placeholder
                alt={course.title}
                style={cardImageStyle}
              />
              {/* MUI: <CardContent sx={{ flexGrow: 1 }}> */}
              <div>
                {/* MUI: <Typography gutterBottom variant="h6" component="div">{course.title}</Typography> */}
                <h4 style={{marginTop: '10px'}}>{course.title}</h4>
                {/* MUI: <Typography variant="body2" color="text.secondary"> {course.category?.name || ''} </Typography> */}
                <p style={{fontSize: '0.9em', color: 'gray'}}>{course.category?.name || ''}</p>
                {/* MUI: {progress !== null && <LinearProgress variant="determinate" value={progress} sx={{my:1}} />} <Typography variant="caption">{t('progress', 'پیشرفت')}: {progress || 0}%</Typography> */}
                <div style={{margin: '5px 0'}}>
                    <span style={{fontSize: '0.9em'}}>{t('progress', 'پیشرفت')}: {progress ? progress.toFixed(0) : 0}%</span>
                    {/* Basic progress bar */}
                    <div style={{height: '8px', backgroundColor: '#e0e0e0', borderRadius: '4px', overflow: 'hidden', marginTop: '3px'}}>
                        <div style={{width: `${progress || 0}%`, height: '100%', backgroundColor: '#4caf50'}}></div>
                    </div>
                </div>
              </div>
              {/* MUI: </CardContent> */}
              {/* MUI: <CardActions> <Button component={Link} to={`/learn/course/${course.id}`} size="small" variant="contained">{t('studentDashboard.startLearning', 'شروع یادگیری')}</Button> </CardActions> */}
              <Link
                to={`/learn/course/${course.id}`}
                style={{ marginTop: '10px', display: 'block', textAlign: 'center', padding: '10px', backgroundColor: '#007bff', color: 'white', textDecoration: 'none', borderRadius: '0 0 4px 4px' }}
              >
                {t('studentDashboard.startLearning', 'شروع یادگیری')}
              </Link>
            </div>
          ))}
        </div>
        // MUI: </Grid>
      )}
    </div>
  );
};

export default StudentDashboardPage;
