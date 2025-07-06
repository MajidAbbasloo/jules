import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../context/AuthContext'; // Corrected path
import { useQuery } from '@apollo/client';
import { Link } from 'react-router-dom';
import { GET_MY_ENROLLED_COURSES, GET_MY_BOOKMARKED_LESSONS } from '../../../graphql/queries';

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
  const [activeTab, setActiveTab] = useState<'enrolled' | 'bookmarks'>('enrolled');


  const { loading: enrolledLoading, error: enrolledError, data: enrolledData } = useQuery<{ getMyEnrolledCourses: EnrolledCourse[] }>(GET_MY_ENROLLED_COURSES, {
    skip: !user,
  });

  const { loading: bookmarksLoading, error: bookmarksError, data: bookmarksData } = useQuery(GET_MY_BOOKMARKED_LESSONS, {
    skip: !user,
  });

  interface BookmarkedLesson {
    id: string;
    title: string;
    section: {
        id: string;
        title: string;
        course: {
            id: string;
            title: string;
        }
    }
  }

  if (enrolledLoading || bookmarksLoading) return <p>{t('loading', 'در حال بارگذاری اطلاعات شما...')}</p>;
  if (enrolledError) return <p>{t('studentDashboard.errorLoadingCourses', 'خطا در بارگذاری دوره های ثبت نام شده: ')} {enrolledError.message}</p>;
  if (bookmarksError) return <p>{t('studentDashboard.errorLoadingBookmarks', 'خطا در بارگذاری نشانک‌ها: ')} {bookmarksError.message}</p>;


  const enrolledCourses = enrolledData?.getMyEnrolledCourses || [];
  const bookmarkedLessons: BookmarkedLesson[] = bookmarksData?.getMyBookmarkedLessons || [];

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
      {/* MUI: <Typography variant="h4" gutterBottom>{t('studentDashboard.title', 'داشبورد دانش آموز')}</Typography> */}
      <h2>{t('studentDashboard.title', 'داشبورد دانش آموز')}</h2>
      {/* MUI: {user && <Typography variant="h6" gutterBottom>{t('studentDashboard.welcome', 'خوش آمدید')}, {user.profile?.firstName || user.email}!</Typography>} */}
      {user && <p>{t('studentDashboard.welcome', 'خوش آمدید')}, {user.profile?.firstName || user.email}!</p>}

      {/* MUI: <Box sx={{display: 'flex', gap: 2, my: 2}}> <Button component={Link} to="/profile/me" variant="outlined">{t('myProfile', 'پروفایل من')}</Button> </Box> */}
      <div style={{ margin: "15px 0" }}>
        <Link to="/profile/me" style={{ textDecoration: 'none', padding: '8px 15px', border: '1px solid #007bff', borderRadius: '4px', color: '#007bff' }}>
          {t('myProfile', 'پروفایل من')}
        </Link>
      </div>

      {/* MUI: <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{mb:2}}> <Tab label={t('studentDashboard.tabs.enrolled', 'دوره‌های من')} value="enrolled" /> <Tab label={t('studentDashboard.tabs.bookmarks', 'نشانک‌ها')} value="bookmarks" /> </Tabs> */}
      <div style={{marginBottom: '20px', borderBottom: '1px solid #ccc'}}>
        <button onClick={() => setActiveTab('enrolled')} style={{padding: '10px', border: activeTab === 'enrolled' ? '2px solid #007bff' : '1px solid #ccc', background: activeTab === 'enrolled' ? '#e7f3ff' : 'white', cursor: 'pointer'}}>
            {t('studentDashboard.tabs.enrolled', 'دوره‌های من')}
        </button>
        <button onClick={() => setActiveTab('bookmarks')} style={{padding: '10px', border: activeTab === 'bookmarks' ? '2px solid #007bff' : '1px solid #ccc', background: activeTab === 'bookmarks' ? '#e7f3ff' : 'white', cursor: 'pointer', marginRight: '-1px'}}>
            {t('studentDashboard.tabs.bookmarks', 'درس‌های نشانه‌گذاری شده')}
        </button>
      </div>

      {activeTab === 'enrolled' && (
        <section>
          {/* MUI: <Typography variant="h5" sx={{my: 2}}>{t('studentDashboard.myCoursesTitle', 'دوره های من')}</Typography> */}
          <h3>{t('studentDashboard.myCoursesTitle', 'دوره های من')}</h3>
          {enrolledCourses.length === 0 ? (
            <p>{t('studentDashboard.noCoursesEnrolled', 'شما هنوز در هیچ دوره ای ثبت نام نکرده اید.')}</p>
          ) : (
            <div style={cardContainerStyle}>
              {enrolledCourses.map(({ id: enrollmentId, course, progress }) => (
                <div key={enrollmentId} style={cardStyle}>
                  <img src={course.thumbnailUrl || '/placeholder-image.jpg'} alt={course.title} style={cardImageStyle} />
                  <div>
                    <h4 style={{marginTop: '10px'}}>{course.title}</h4>
                    <p style={{fontSize: '0.9em', color: 'gray'}}>{course.category?.name || ''}</p>
                    <div style={{margin: '5px 0'}}>
                        <span style={{fontSize: '0.9em'}}>{t('progress', 'پیشرفت')}: {progress ? progress.toFixed(0) : 0}%</span>
                        <div style={{height: '8px', backgroundColor: '#e0e0e0', borderRadius: '4px', overflow: 'hidden', marginTop: '3px'}}>
                            <div style={{width: `${progress || 0}%`, height: '100%', backgroundColor: '#4caf50'}}></div>
                        </div>
                    </div>
                  </div>
                  <Link
                    to={`/learn/course/${course.id}`}
                    style={{ marginTop: '10px', display: 'block', textAlign: 'center', padding: '10px', backgroundColor: '#007bff', color: 'white', textDecoration: 'none', borderRadius: '0 0 4px 4px' }}
                  >
                    {t('studentDashboard.startLearning', 'شروع یادگیری')}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'bookmarks' && (
        <section>
            {/* MUI: <Typography variant="h5" sx={{my: 2}}>{t('studentDashboard.myBookmarksTitle', 'درس‌های نشانه‌گذاری شده')}</Typography> */}
            <h3>{t('studentDashboard.myBookmarksTitle', 'درس‌های نشانه‌گذاری شده')}</h3>
            {bookmarkedLessons.length === 0 ? (
                // MUI: <Typography>{t('studentDashboard.noBookmarks', 'شما هنوز هیچ درسی را نشانه‌گذاری نکرده‌اید.')}</Typography>
                <p>{t('studentDashboard.noBookmarks', 'شما هنوز هیچ درسی را نشانه‌گذاری نکرده‌اید.')}</p>
            ) : (
                // MUI: <List> {bookmarkedLessons.map(lesson => <ListItemButton component={Link} to={`/learn/course/${lesson.section.course.id}?lesson=${lesson.id}`} key={lesson.id}> <ListItemText primary={lesson.title} secondary={`${t('course', 'دوره')}: ${lesson.section.course.title} - ${t('section', 'بخش')}: ${lesson.section.title}`} /> </ListItemButton> )} </List>
                <ul style={{listStyleType: 'none', padding: 0}}>
                    {bookmarkedLessons.map(lesson => (
                        <li key={lesson.id} style={{padding: '10px', borderBottom: '1px solid #eee'}}>
                            <Link to={`/learn/course/${lesson.section.course.id}?lesson=${lesson.id}`}>
                                <strong>{lesson.title}</strong>
                            </Link>
                            <div style={{fontSize: '0.9em', color: 'gray'}}>
                                {t('course', 'دوره')}: {lesson.section.course.title} - {t('section', 'بخش')}: {lesson.section.title}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
      )}
    </div>
  );
};

export default StudentDashboardPage;
