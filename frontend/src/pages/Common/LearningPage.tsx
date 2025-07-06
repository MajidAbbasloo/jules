import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@apollo/client'; // Added useMutation
import {
    GET_COURSE_DETAILS_FOR_EDIT as GET_LEARNING_COURSE_DETAILS,
    IS_ENROLLED_QUERY, // Still useful for initial gate-keeping
    GET_MY_ENROLLMENT_FOR_COURSE, // New query for progress
    GET_QUESTIONS_FOR_LESSON
} from '../../graphql/queries';
import {
    ASK_QUESTION_MUTATION,
    POST_ANSWER_MUTATION,
    TOGGLE_LESSON_COMPLETED_MUTATION
} from '../../graphql/mutations';
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
  const [isUserActuallyEnrolled, setIsUserActuallyEnrolled] = useState<boolean | null>(null); // From IS_ENROLLED_QUERY
  const [enrollmentDetails, setEnrollmentDetails] = useState<{ progress: number, completedLessons: string[] } | null>(null);

  // 1. Check basic enrollment status (still useful for initial gating)
  const { loading: checkingEnrollment, data: enrollmentStatusData } = useQuery(IS_ENROLLED_QUERY, {
    variables: { courseId },
    skip: !isAuthenticated || !user || !courseId,
    onCompleted: (data) => {
      if (user?.role === 'STUDENT') setIsUserActuallyEnrolled(data.isEnrolled);
      else if (isInstructorOrAdmin) setIsUserActuallyEnrolled(true);
    },
    fetchPolicy: 'network-only'
  });

  // 2. Fetch detailed enrollment data (progress, completedLessons) if enrolled
  const { loading: loadingEnrollmentDetails, data: enrollmentDetailsData, refetch: refetchEnrollmentDetails } = useQuery(GET_MY_ENROLLMENT_FOR_COURSE, {
    variables: { courseId },
    skip: !courseId || !isUserActuallyEnrolled || user?.role !== 'STUDENT', // Only fetch if student and confirmed enrolled
    onCompleted: (data) => {
      if (data?.getMyEnrollmentForCourse) {
        setEnrollmentDetails({
          progress: data.getMyEnrollmentForCourse.progress,
          completedLessons: data.getMyEnrollmentForCourse.completedLessons || []
        });
      }
    },
    fetchPolicy: 'cache-and-network'
  });

  // 3. Query for course details (structure)
  const { loading: courseLoading, error: courseError, data: courseData } = useQuery<{ getCourseById: Course }>(GET_LEARNING_COURSE_DETAILS, {
    variables: { id: courseId },
    skip: !courseId || (user?.role === 'STUDENT' && isUserActuallyEnrolled === null), // Wait for enrollment check for students
  });

  const [toggleLessonCompleted, { loading: togglingLessonCompletion }] = useMutation(TOGGLE_LESSON_COMPLETED_MUTATION, {
    onCompleted: (data) => {
        if (data?.toggleLessonCompleted) {
            setEnrollmentDetails({
                progress: data.toggleLessonCompleted.progress,
                completedLessons: data.toggleLessonCompleted.completedLessons || []
            });
            // TODO: Replace with toast notification - e.g., toast.success('Lesson status updated!');
        }
    },
    onError: (error) => {
        // TODO: Replace with toast notification - e.g., toast.error(t('learningPage.errorMarkingLesson', ...) + error.message);
        alert(t('learningPage.errorMarkingLesson', 'خطا در بروزرسانی وضعیت درس: ') + error.message);
    }
});


  useEffect(() => {
    if (courseData?.getCourseById && courseData.getCourseById.sections.length > 0 && courseData.getCourseById.sections[0].lessons.length > 0) {
      const firstLesson = courseData.getCourseById.sections[0].lessons[0];
      if(isUserActuallyEnrolled || firstLesson.isPreviewable) {
        setSelectedLesson(firstLesson);
      }
    }
  }, [courseData, isUserActuallyEnrolled]);

  useEffect(() => {
    if (!authLoading && !checkingEnrollment && isAuthenticated && user?.role === 'STUDENT' && isUserActuallyEnrolled === false) {
        // TODO: Replace with toast notification - e.g., toast.error(t('learningPage.notEnrolled'));
        alert(t('learningPage.notEnrolled', 'شما در این دوره ثبت نام نکرده اید یا دسترسی ندارید.'));
        navigate(`/course/${courseId}`);
    }
  }, [authLoading, checkingEnrollment, isAuthenticated, user, isUserActuallyEnrolled, courseId, navigate, t]);


  const handleToggleLessonComplete = (lessonId: string, currentCompletedStatus: boolean) => {
    if (!courseId) return;
    toggleLessonCompleted({
        variables: { lessonId, courseId, completed: !currentCompletedStatus }
    });
  };

  // Combined loading state check
  if (authLoading || courseLoading || checkingEnrollment || (isAuthenticated && user?.role === 'STUDENT' && isUserActuallyEnrolled === null) || (isUserActuallyEnrolled && user?.role === 'STUDENT' && loadingEnrollmentDetails && !enrollmentDetails) ) {
    return <p>{t('loading', 'در حال بارگذاری...')}</p>;
  }

  if (courseError) return <p>{t('errorLoading', 'خطا در بارگذاری دوره: ')} {courseError.message}</p>;
  // enrollmentStatusData.error is not explicitly handled, IS_ENROLLED_QUERY errors are logged
  if (!courseData?.getCourseById) return <p>{t('courseDetails.notFound', 'دوره یافت نشد.')}</p>;

  if (user?.role === 'STUDENT' && isUserActuallyEnrolled === false) {
     // This should ideally be caught by the useEffect redirect, but as a fallback:
    return <p>{t('learningPage.accessDenied', 'دسترسی به این محتوا امکان پذیر نمی باشد.')}</p>;
  }

  const course = courseData.getCourseById;
  const completedLessonsSet = new Set(enrollmentDetails?.completedLessons || []);

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
  const qnaSectionStyle: React.CSSProperties = { marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #eee' };
  const questionCardStyle: React.CSSProperties = { background: '#f9f9f9', border: '1px solid #e0e0e0', padding: '15px', marginBottom: '15px', borderRadius: '5px' };
  const answerCardStyle: React.CSSProperties = { background: '#e9f7ef', border: '1px solid #d0e0d0', padding: '10px', marginTop: '10px', marginLeft: '20px', borderRadius: '4px' };
  const formStyle: React.CSSProperties = { marginTop: '10px', marginBottom: '20px', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' };
  const textareaStyle: React.CSSProperties = { width: '100%', minHeight: '60px', padding: '8px', marginBottom: '10px', border: '1px solid #ccc', borderRadius: '3px' };
  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px', marginBottom: '10px', border: '1px solid #ccc', borderRadius: '3px' };
  const submitButtonStyle: React.CSSProperties = { padding: '8px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' };


  // Q&A State and Functions
  const [newQuestionContent, setNewQuestionContent] = useState('');
  const [newQuestionTitle, setNewQuestionTitle] = useState('');
  const [replyingToQuestionId, setReplyingToQuestionId] = useState<string | null>(null);
  const [newAnswerContent, setNewAnswerContent] = useState('');

  const {
    loading: questionsLoading,
    error: questionsError,
    data: questionsData,
    refetch: refetchQuestions
  } = useQuery(GET_QUESTIONS_FOR_LESSON, {
    variables: { lessonId: selectedLesson?.id },
    skip: !selectedLesson || (!isUserActuallyEnrolled && !selectedLesson.isPreviewable), // Skip if no lesson selected or no access
  });

  const [askQuestion, { loading: askingQuestion }] = useMutation(ASK_QUESTION_MUTATION, {
    onCompleted: () => {
      setNewQuestionContent('');
      setNewQuestionTitle('');
      refetchQuestions();
      // TODO: Replace with toast notification - e.g., toast.success('Question submitted!');
    },
    onError: (err) => {
      // TODO: Replace with toast notification - e.g., toast.error(t('qna.errorAsking', ...) + err.message);
      alert(t('qna.errorAsking', 'خطا در ارسال سوال: ') + err.message);
    }
  });

  const [postAnswer, { loading: postingAnswer }] = useMutation(POST_ANSWER_MUTATION, {
    onCompleted: () => {
      setNewAnswerContent('');
      setReplyingToQuestionId(null);
      refetchQuestions();
      // TODO: Replace with toast notification - e.g., toast.success('Answer posted!');
    },
    onError: (err) => {
      // TODO: Replace with toast notification - e.g., toast.error(t('qna.errorAnswering', ...) + err.message);
      alert(t('qna.errorAnswering', 'خطا در ارسال پاسخ: ') + err.message);
    }
  });

  const handleAskQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLesson || !newQuestionContent.trim()) return;
    askQuestion({ variables: { lessonId: selectedLesson.id, title: newQuestionTitle.trim(), content: newQuestionContent.trim() } });
  };

  const handlePostAnswerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingToQuestionId || !newAnswerContent.trim()) return;
    postAnswer({ variables: { questionId: replyingToQuestionId, content: newAnswerContent.trim() } });
  };

  // Refetch questions when selected lesson changes
  useEffect(() => {
    if (selectedLesson && (isUserActuallyEnrolled || selectedLesson.isPreviewable)) {
      refetchQuestions({ lessonId: selectedLesson.id });
    }
  }, [selectedLesson, refetchQuestions, isUserActuallyEnrolled]);

  const isInstructorOrAdmin = user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN';
  // Further refine: check if current user is THE instructor of THIS course
  const isCourseInstructor = isInstructorOrAdmin && course?.instructor.id === user?.id;


  return (
    // MUI: <Grid container spacing={0} sx={{ height: 'calc(100vh - 64px)' }}> {/* Adjust 64px for actual header height */}
    // MUI:   <Grid item xs={12} md={4} sx={{ borderRight: { md: '1px solid divider' }, maxHeight: '100%', overflowY: 'auto', p: 2, bgcolor: 'background.paper' }}> {/* Sidebar */}
    // MUI:   <Grid item xs={12} md={8} sx={{ maxHeight: '100%', overflowY: 'auto', p: 3 }}> {/* Main Content */}
    <div style={pageLayoutSplit}>
      <aside style={sidebarStyle}>
        {/* MUI: <Typography variant="h5" gutterBottom>{course.title}</Typography> */}
        <h3>{course.title}</h3>
        {isUserActuallyEnrolled && enrollmentDetails && user?.role === 'STUDENT' && (
            // MUI: <Box sx={{my:1}}> <Typography variant="caption">{t('progress', 'پیشرفت')}:</Typography> <LinearProgress variant="determinate" value={enrollmentDetails.progress} /> <Typography variant="caption">{enrollmentDetails.progress.toFixed(0)}%</Typography> </Box>
            <div style={{margin: '10px 0'}}>
                <p>{t('progress', 'پیشرفت')}: {enrollmentDetails.progress.toFixed(0)}%</p>
                {/* Basic progress bar */}
                <div style={{height: '10px', backgroundColor: '#e0e0e0', borderRadius: '5px', overflow: 'hidden'}}>
                    <div style={{width: `${enrollmentDetails.progress}%`, height: '100%', backgroundColor: '#4caf50'}}></div>
                </div>
            </div>
        )}
        {/* MUI: <List component="nav" dense> */}
        {course.sections.sort((a,b) => a.order - b.order).map(section => (
          <div key={section.id} style={{marginBottom: '10px'}}>
            {/* MUI: <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 1, mb: 0.5, px: 1 }}>{section.title}</Typography> */}
            <h4 style={{paddingLeft: '10px'}}>{section.title}</h4>
            {/* MUI: <List component="div" disablePadding dense> */}
            {section.lessons.sort((a,b) => a.order - b.order).map(lesson => {
              const isCompleted = completedLessonsSet.has(lesson.id);
              return (
                // MUI: <ListItemButton key={lesson.id} selected={selectedLesson?.id === lesson.id} onClick={() => handleLessonClick(lesson)} disabled={!isUserActuallyEnrolled && !lesson.isPreviewable}> <Checkbox checked={isCompleted} onChange={() => handleToggleLessonComplete(lesson.id, isCompleted)} size="small" edge="start" disabled={!isUserActuallyEnrolled || togglingLessonCompletion} /> <ListItemText primary={lesson.title} secondary={lesson.isPreviewable ? t('preview', 'پیش نمایش') : ''} /> </ListItemButton>
                <div
                  key={lesson.id}
                  style={selectedLesson?.id === lesson.id ? activeLessonStyle : lessonListItemStyle}
                  onClick={() => handleLessonClick(lesson)}
                  title={(!isUserActuallyEnrolled && !lesson.isPreviewable) ? t('learningPage.enrollToViewLesson', '') : lesson.title}
                >
                  {isUserActuallyEnrolled && user?.role === 'STUDENT' && (
                    <input
                        type="checkbox"
                        checked={isCompleted}
                        onChange={() => handleToggleLessonComplete(lesson.id, isCompleted)}
                        disabled={togglingLessonCompletion}
                        style={{marginRight: '8px', cursor: 'pointer'}}
                        onClick={(e) => e.stopPropagation()} // Prevent lesson selection when clicking checkbox
                    />
                  )}
                  {lesson.title} {lesson.isPreviewable ? `(${t('preview', 'پیش نمایش')})` : ''}
                  {(!isUserActuallyEnrolled && !lesson.isPreviewable) && <span style={{fontSize: '0.8em', color: 'orange'}}> (🔒)</span>}
                </div>
              );
            })}
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
              () => {
                const videoUrl = selectedLesson.videoUrl as string; // Ensure type for string methods
                if (videoUrl.includes('example.com/uploads/placeholder-')) {
                  // MUI: <Alert severity="info">{t('learningPage.videoPlaceholderNotice', 'این یک ویدیو آزمایشی است. در نسخه اصلی، ویدیوی واقعی اینجا نمایش داده خواهد شد.')}</Alert>
                  return <p style={{ padding: '20px', backgroundColor: '#fff3cd', border: '1px solid #ffeeba', color: '#856404', borderRadius: '5px' }}>{t('learningPage.videoPlaceholderNotice', 'این یک ویدیو آزمایشی است. در نسخه اصلی، ویدیوی واقعی اینجا نمایش داده خواهد شد.')} <br/> URL: {videoUrl}</p>;
                } else if (videoUrl.match(/\.(jpeg|jpg|gif|png)$/) != null) {
                  // Not a video, but an image link was provided in videoUrl
                  // MUI: <Box sx={{textAlign: 'center', my: 2}}><img src={videoUrl} alt={t('learningPage.lessonMaterial', 'محتوای درس')} style={{maxWidth: '100%', maxHeight: '500px', borderRadius: '5px'}} /></Box>
                  return <img src={videoUrl} alt={t('learningPage.lessonMaterial', 'محتوای درس')} style={{maxWidth: '100%', maxHeight: '500px', borderRadius: '5px', margin: '20px 0'}} />;
                } else if (videoUrl.match(/\.(mp4|webm|ogg)$/) != null) {
                  // Direct video file
                  // MUI: <Box sx={{my: 2}}><video controls width="100%" src={videoUrl} style={{borderRadius: '5px'}}>...</video></Box>
                  return (
                    <video controls width="100%" src={videoUrl} style={{borderRadius: '5px', margin: '20px 0', outline: 'none'}}>
                      {t('learningPage.videoNotSupported', 'مرورگر شما از پخش این ویدیو پشتیبانی نمی‌کند.')}
                    </video>
                  );
                } else if (videoUrl.includes("youtube.com/watch?v=") || videoUrl.includes("youtu.be/")) {
                  const videoId = videoUrl.includes("youtu.be/")
                                  ? videoUrl.split('youtu.be/')[1].split('?')[0]
                                  : videoUrl.split('v=')[1].split('&')[0];
                  const embedUrl = `https://www.youtube.com/embed/${videoId}`;
                   // MUI: <Box sx={{my: 2, position: 'relative', paddingTop: '56.25%'}}> <iframe ... /> </Box>
                  return (
                    <div style={{ margin: '20px 0', position: 'relative', paddingTop: '56.25%' /* 16:9 Aspect Ratio */ }}>
                      <iframe
                          src={embedUrl}
                          title={selectedLesson.title}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                      ></iframe>
                    </div>
                  );
                } else {
                  // Default to iframe for other URLs, or show a link
                  // MUI: <Typography sx={{my:2}}>{t('learningPage.externalVideoLink', 'لینک ویدیو')}: <Link href={videoUrl} target="_blank" rel="noopener noreferrer">{videoUrl}</Link></Typography>
                  return <p>{t('learningPage.externalVideoLink', 'لینک ویدیو')}: <a href={videoUrl} target="_blank" rel="noopener noreferrer">{videoUrl}</a></p>;
                }
              }
            )()
            ) : (
              // MUI: <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-wrap', mt: 2 }}>{selectedLesson.content || t('learningPage.noContent', 'محتوایی برای این درس وجود ندارد.')}</Typography>
              <p style={{whiteSpace: 'pre-wrap', marginTop: '15px'}}>{selectedLesson.content || t('learningPage.noContent', 'محتوایی برای این درس وجود ندارد.')}</p>
            )}
            {/* TODO: Add resources display, next/prev lesson buttons, mark as complete */}

            {/* Q&A Section */}
            {/* MUI: <Box sx={qnaSectionStyle}> <Typography variant="h5" gutterBottom>{t('qna.title', 'پرسش و پاسخ')}</Typography> ... </Box> */}
            <div style={qnaSectionStyle}>
              <h3>{t('qna.title', 'پرسش و پاسخ')}</h3>

              {/* Ask Question Form (only if enrolled) */}
              {isUserActuallyEnrolled && (
                // MUI: <Paper component="form" onSubmit={handleAskQuestionSubmit} sx={{p:2, my:2}}> <TextField fullWidth label={t('qna.questionTitleOptional', 'عنوان سوال (اختیاری)')} .../> <TextareaAutosize minRows={3} placeholder={t('qna.typeYourQuestion', 'سوال خود را اینجا بنویسید...')} .../> <Button type="submit" variant="contained" disabled={askingQuestion}>...</Button> </Paper>
                <form onSubmit={handleAskQuestionSubmit} style={formStyle}>
                  <input type="text" placeholder={t('qna.questionTitleOptional', 'عنوان سوال (اختیاری)')} value={newQuestionTitle} onChange={(e) => setNewQuestionTitle(e.target.value)} style={inputStyle} />
                  <textarea placeholder={t('qna.typeYourQuestion', 'سوال خود را اینجا بنویسید...')} value={newQuestionContent} onChange={(e) => setNewQuestionContent(e.target.value)} required style={textareaStyle}></textarea>
                  <button type="submit" disabled={askingQuestion} style={submitButtonStyle}>
                    {askingQuestion ? t('qna.sending', 'در حال ارسال...') : t('qna.askButton', 'ارسال سوال')}
                  </button>
                </form>
              )}

              {/* Display Questions and Answers */}
              {questionsLoading && <p>{t('qna.loadingQuestions', 'در حال بارگذاری سوالات...')}</p>}
              {questionsError && <p style={{color: 'red'}}>{t('qna.errorLoadingQuestions', 'خطا در بارگذاری سوالات.')}</p>}
              {questionsData && questionsData.getQuestionsForLesson.length === 0 && <p>{t('qna.noQuestionsYet', 'هنوز سوالی برای این درس پرسیده نشده است.')}</p>}

              {/* MUI: <List> */}
              {questionsData && questionsData.getQuestionsForLesson.map(question => (
                // MUI: <ListItem key={question.id} alignItems="flex-start" sx={questionCardStyle} disablePadding> <Box sx={{width: '100%'}}> <ListItemText primary={question.title || t('qna.questionNoTitle', 'سوال بدون عنوان')} secondary={<> <Typography component="span" variant="body2" color="text.primary">{question.user.profile?.firstName || question.user.email} - {new Date(question.createdAt).toLocaleDateString('fa-IR')}</Typography> <br/> {question.content} </>} /> ... answers and reply form ... </Box> </ListItem>
                <div key={question.id} style={questionCardStyle}>
                  <strong>{question.title || t('qna.questionNoTitle', 'سوال بدون عنوان')}</strong>
                  <p style={{fontSize: '0.8em', color: 'gray'}}>
                    {t('qna.askedBy', 'پرسیده شده توسط')}: {question.user.profile?.firstName || question.user.email} {t('onDate', 'در تاریخ')}: {new Date(question.createdAt).toLocaleDateString('fa-IR')}
                  </p>
                  <p>{question.content}</p>

                  {/* Answers */}
                  {/* MUI: <List dense sx={{pl:2}}> */}
                  {question.answers.map(answer => (
                    // MUI: <ListItem key={answer.id} sx={answerCardStyle}> <ListItemText primary={answer.content} secondary={<> <Typography component="span" variant="caption" color="text.primary">{answer.user.profile?.firstName || answer.user.email} ({t(`roles.${answer.user.role}`)}) - {new Date(answer.createdAt).toLocaleDateString('fa-IR')}</Typography></>} /> </ListItem>
                    <div key={answer.id} style={answerCardStyle}>
                      <p>{answer.content}</p>
                      <p style={{fontSize: '0.8em', color: 'gray'}}>
                        {t('qna.answeredBy', 'پاسخ از طرف')}: {answer.user.profile?.firstName || answer.user.email} ({t(`roles.${answer.user.role || 'USER'}`, answer.user.role)}) {t('onDate', 'در تاریخ')}: {new Date(answer.createdAt).toLocaleDateString('fa-IR')}
                      </p>
                    </div>
                  ))}
                  {/* MUI: </List> */}

                  {/* Reply Form (Instructor/Admin) */}
                  {(isCourseInstructor || user?.role === 'ADMIN') && (
                    replyingToQuestionId === question.id ? (
                      // MUI: <Paper component="form" onSubmit={handlePostAnswerSubmit} sx={{p:1, mt:1, ml:2}}> <TextareaAutosize .../> <Button type="submit" ...>...</Button> <Button onClick={() => setReplyingToQuestionId(null)} ...>...</Button> </Paper>
                      <form onSubmit={handlePostAnswerSubmit} style={{...formStyle, marginLeft: '20px'}}>
                        <textarea placeholder={t('qna.typeYourAnswer', 'پاسخ خود را اینجا بنویسید...')} value={newAnswerContent} onChange={(e) => setNewAnswerContent(e.target.value)} required style={textareaStyle}></textarea>
                        <button type="submit" disabled={postingAnswer} style={submitButtonStyle}>
                          {postingAnswer ? t('qna.sending', 'در حال ارسال...') : t('qna.postAnswerButton', 'ارسال پاسخ')}
                        </button>
                        <button type="button" onClick={() => setReplyingToQuestionId(null)} style={{marginLeft: '10px'}}>{t('cancel', 'انصراف')}</button>
                      </form>
                    ) : (
                       // MUI: <Button size="small" onClick={() => { setReplyingToQuestionId(question.id); setNewAnswerContent(''); }} sx={{mt:1, ml: 2}}>{t('qna.replyButton', 'پاسخ به این سوال')}</Button>
                      <button onClick={() => { setReplyingToQuestionId(question.id); setNewAnswerContent(''); }} style={{marginTop: '10px', marginLeft: '20px'}}>
                        {t('qna.replyButton', 'پاسخ به این سوال')}
                      </button>
                    )
                  )}
                </div>
              ))}
              {/* MUI: </List> */}
            </div>
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
