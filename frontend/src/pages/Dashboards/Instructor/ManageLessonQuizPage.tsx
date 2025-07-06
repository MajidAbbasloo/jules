import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { GET_LESSON_DETAILS_FOR_QUIZ, GET_QUIZ_FOR_INSTRUCTOR } from '../../../graphql/queries'; // Need a query to get lesson title, and existing quiz if any
import { CREATE_QUIZ_MUTATION, ADD_QUESTION_TO_QUIZ_MUTATION } from '../../../graphql/mutations';
// TODO: Add mutations for update/delete quiz/question later

// MUI Placeholder imports
// import Typography from '@mui/material/Typography';
// import Button from '@mui/material/Button';
// import TextField from '@mui/material/TextField';
// import Box from '@mui/material/Box';
// import Paper from '@mui/material/Paper';
// import IconButton from '@mui/material/IconButton';
// import DeleteIcon from '@mui/icons-material/Delete';
// import AddIcon from '@mui/icons-material/Add';
// import Select from '@mui/material/Select';
// import MenuItem from '@mui/material/MenuItem';
// import FormControl from '@mui/material/FormControl';
// import InputLabel from '@mui/material/InputLabel';
// import Checkbox from '@mui/material/Checkbox';
// import FormControlLabel from '@mui/material/FormControlLabel';
// import List from '@mui/material/List';
// import ListItem from '@mui/material/ListItem';
// import ListItemText from '@mui/material/ListItemText';

// Simplified types for this component
interface QuizOption {
  id?: string;
  text: string;
  isCorrect: boolean;
}
interface QuizQuestion {
  id?: string;
  text: string;
  type: string; // "MULTIPLE_CHOICE", "TRUE_FALSE"
  order: number;
  options: QuizOption[];
}
interface Quiz {
  id: string;
  title: string;
  description?: string | null;
  questions: QuizQuestion[];
}
interface LessonDetail {
    id: string;
    title: string;
    quiz?: Quiz | null; // Lesson might have one quiz
}

const ManageLessonQuizPage: React.FC = () => {
  const { t } = useTranslation();
  const { courseId, lessonId } = useParams<{ courseId: string, lessonId: string }>();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');

  const [showAddQuestionForm, setShowAddQuestionForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState<Omit<QuizQuestion, 'id'>>({
    text: '', type: 'MULTIPLE_CHOICE', order: 1, options: [{ text: '', isCorrect: false}, {text: '', isCorrect: false}]
  });

  // Query for lesson details (to get title and check for existing quiz)
  // We need a query that fetches a lesson and its associated quiz ID or the quiz itself.
  // Let's assume GET_LESSON_DETAILS_FOR_QUIZ fetches lesson and its quiz.
  // If lesson.quiz is null, then no quiz exists.
  // If lesson.quiz is populated, then use GET_QUIZ_FOR_INSTRUCTOR to fetch full quiz details.

  // For simplicity now, let's assume lesson details are passed or fetched, and we focus on quiz part.
  // A more robust approach would fetch lesson and its quiz ID, then fetch quiz if ID exists.
  // Or, a single query that gets lesson AND its full quiz if user is instructor.

  // Let's use a placeholder for lesson title, assuming it's available.
  // const lessonTitle = "Placeholder Lesson Title";

  // Fetch existing quiz if one is associated with the lesson
  // This requires a way to know the quizId from lessonId.
  // For now, this component will primarily handle CREATING a new quiz,
  // or if a quizId was passed (e.g. /quiz/:quizId/edit), it would fetch it.
  // Let's adjust: if a quiz exists for the lesson, we'd get its ID.
  // For now, we'll assume we can fetch the lesson and it might have a 'quiz' field with ID.
  // This is a simplification; a real app might have a direct query for `getQuizByLessonId`.

  const { loading: lessonLoading, data: lessonData, error: lessonError } = useQuery(
    // A query like this would be ideal:
    // query GetLessonWithQuiz($lessonId: ID!) { lesson(id: $lessonId) { id title quiz { id title description questions { ... } } } }
    // For now, we'll use a placeholder or assume quiz needs to be created if not found.
    // This part needs a proper query to fetch lesson and its quiz.
    // Let's use a conceptual `GET_LESSON_DETAILS_FOR_QUIZ` that returns the lesson and its quiz.
    // The existing GET_COURSE_DETAILS_FOR_EDIT fetches sections and lessons, but not quiz directly on lesson.
    // We will have to create a new query for this.
    // For now, skipping direct lesson data fetch and focusing on quiz CRUD.
    // We'll assume quiz is created if 'quiz' state is null.
    // If we had quizId, we'd use GET_QUIZ_FOR_INSTRUCTOR.
    // Let's assume if we are on this page, we create if no quiz, or edit if quiz exists.
    // For now, we will primarily focus on creating a quiz for a given lessonId.
    // A more complete solution would fetch the lesson and see if it has an associated quiz.
    // If so, load that quiz for editing.
    // For this step, we'll focus on the UI to create a quiz and add questions.
    // We will use a placeholder for the lesson title.
    // If 'quiz' state is null, it means we are creating a new quiz.
    // If 'quiz' state has an ID, it means we are editing (not implemented yet fully here).
    // Let's assume we always start by creating for now for this component's first pass.
    // A better flow: ManageCourseContentPage -> Link to "Manage Quiz" (lessonId)
    // This page: fetches lesson. If lesson.quizId, fetches quiz. Else, "Create Quiz" button.
    // For now: Form to create quiz, then form to add questions.
    GET_LESSON_DETAILS_FOR_QUIZ, // Placeholder for a query that gets lesson title
    { variables: { lessonId }, skip: !lessonId,
      onCompleted: (data) => {
        // if (data.lesson.quiz) setQuiz(data.lesson.quiz); // If query returns quiz
      }
    }
  );


  const [createQuiz, { loading: creatingQuiz }] = useMutation(CREATE_QUIZ_MUTATION, {
    onCompleted: (data) => {
      setQuiz(data.createQuiz); // Set the created quiz to state
      // TODO: toast.success
    },
    onError: (err) => alert(err.message) // TODO: toast.error
  });

  const [addQuestionToQuiz, { loading: addingQuestion }] = useMutation(ADD_QUESTION_TO_QUIZ_MUTATION, {
    onCompleted: (data) => {
      if (quiz) {
        const updatedQuestions = [...quiz.questions, data.addQuestionToQuiz];
        setQuiz({ ...quiz, questions: updatedQuestions.sort((a,b) => a.order - b.order) });
      }
      setShowAddQuestionForm(false);
      setNewQuestion({ text: '', type: 'MULTIPLE_CHOICE', order: (quiz?.questions.length || 0) + 2, options: [{text:'', isCorrect:false}, {text:'', isCorrect:false}]});
      // TODO: toast.success
    },
    onError: (err) => alert(err.message) // TODO: toast.error
  });

  const handleQuizCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonId || !quizTitle.trim()) return;
    createQuiz({ variables: { lessonId, title: quizTitle, description: quizDescription } });
  };

  const handleNewQuestionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (name === "order") {
        setNewQuestion(prev => ({...prev, [name]: parseInt(value) || 1}));
    } else {
        setNewQuestion(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleOptionChange = (index: number, field: keyof QuizOption, value: string | boolean) => {
    const updatedOptions = [...newQuestion.options];
    // @ts-ignore
    updatedOptions[index][field] = value;
    if (field === 'isCorrect' && value === true) { // For single choice MCQs, uncheck others
        if (newQuestion.type === 'MULTIPLE_CHOICE' || newQuestion.type === 'TRUE_FALSE') {
            updatedOptions.forEach((opt, i) => { if (i !== index) opt.isCorrect = false; });
        }
    }
    setNewQuestion(prev => ({ ...prev, options: updatedOptions }));
  };

  const addOption = () => {
    setNewQuestion(prev => ({ ...prev, options: [...prev.options, { text: '', isCorrect: false }] }));
  };
  const removeOption = (index: number) => {
    if (newQuestion.options.length <= 2 && (newQuestion.type === "MULTIPLE_CHOICE" || newQuestion.type === "TRUE_FALSE")) {
        alert(t('quizForm.minTwoOptions', 'حداقل دو گزینه لازم است.'));
        return;
    }
    setNewQuestion(prev => ({ ...prev, options: prev.options.filter((_, i) => i !== index) }));
  };

  const handleAddQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quiz || !newQuestion.text.trim()) return;
    // Basic validation for options
    if ((newQuestion.type === "MULTIPLE_CHOICE" || newQuestion.type === "TRUE_FALSE") && newQuestion.options.some(opt => !opt.text.trim())) {
        alert(t('quizForm.optionsNotEmpty', 'متن گزینه‌ها نمی‌تواند خالی باشد.'));
        return;
    }
    if ((newQuestion.type === "MULTIPLE_CHOICE" || newQuestion.type === "TRUE_FALSE") && !newQuestion.options.some(opt => opt.isCorrect)) {
        alert(t('quizForm.oneOptionCorrect', 'حداقل یک گزینه باید صحیح باشد.'));
        return;
    }
    addQuestionToQuiz({ variables: { quizId: quiz.id, ...newQuestion } });
  };

  const lessonTitleFromData = lessonData?.getLessonById?.title || t('loading', '...'); // Placeholder for lesson title

  if (lessonLoading) return <p>{t('loading', 'بارگذاری اطلاعات درس...')}</p>;
  if (lessonError) return <p>{t('error', 'خطا در بارگذاری اطلاعات درس.')}</p>;


  return (
    // MUI: <Container sx={{py:2}}> <Paper sx={{p:2}}> ... </Paper> </Container>
    <div>
      <Link to={`/dashboard/instructor/course/${courseId}/content`}>&larr; {t('quizForm.backToContent', 'بازگشت به مدیریت محتوا')}</Link>
      {/* MUI: <Typography variant="h4" gutterBottom>{t('quizForm.pageTitle', 'مدیریت آزمون برای درس:')} {lessonTitleFromData}</Typography> */}
      <h2>{t('quizForm.pageTitle', 'مدیریت آزمون برای درس:')} "{lessonTitleFromData}"</h2>

      {!quiz ? (
        // MUI: <Box component="form" onSubmit={handleQuizCreateSubmit} sx={{my:2}}> <Typography variant="h5">{t('quizForm.createQuizTitle', 'ایجاد آزمون جدید')}</Typography> <TextField ...name="title".../> <TextField ...name="description".../> <Button type="submit".../> </Box>
        <form onSubmit={handleQuizCreateSubmit} style={{border: '1px solid #ccc', padding: '15px', borderRadius: '5px'}}>
          <h3>{t('quizForm.createQuizTitle', 'ایجاد آزمون جدید')}</h3>
          <div>
            <label htmlFor="quizTitle">{t('quizForm.quizTitleLabel', 'عنوان آزمون')}:</label>
            <input type="text" id="quizTitle" value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} required style={{width: '90%', padding: '8px', marginBottom:'10px'}}/>
          </div>
          <div>
            <label htmlFor="quizDescription">{t('quizForm.quizDescriptionLabel', 'توضیحات آزمون (اختیاری)')}:</label>
            <textarea id="quizDescription" value={quizDescription} onChange={(e) => setQuizDescription(e.target.value)} style={{width: '90%', minHeight: '60px', padding: '8px', marginBottom:'10px'}}/>
          </div>
          <button type="submit" disabled={creatingQuiz} style={{padding: '10px 15px'}}>
            {creatingQuiz ? t('saving', '...') : t('quizForm.createButton', 'ایجاد آزمون')}
          </button>
        </form>
      ) : (
        // Display existing quiz info and add questions
        // MUI: <Box sx={{my:2}}> <Typography variant="h5">{quiz.title}</Typography> {quiz.description && <Typography color="text.secondary">{quiz.description}</Typography>} ... </Box>
        <div>
          <h3>{t('quizForm.quizDetailsTitle', 'جزئیات آزمون')}: {quiz.title}</h3>
          {quiz.description && <p>{quiz.description}</p>}
          {/* TODO: Option to edit quiz title/description */}

          {/* List existing questions */}
          {/* MUI: <Typography variant="h6" sx={{mt:2}}>{t('quizForm.questionsListTitle', 'سوالات آزمون')}</Typography> <List>...</List> */}
          <h4>{t('quizForm.questionsListTitle', 'سوالات آزمون')}:</h4>
          {quiz.questions.length === 0 && <p>{t('quizForm.noQuestionsYet', 'هنوز سوالی به این آزمون اضافه نشده است.')}</p>}
          <ul>
            {quiz.questions.map(q => (
              <li key={q.id}>{q.order}. {q.text} ({q.type}) {/* TODO: Edit/Delete question buttons */}</li>
            ))}
          </ul>

          {/* MUI: <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setShowAddQuestionForm(true)} sx={{my:1}}>{t('quizForm.addQuestionButton', 'افزودن سوال جدید')}</Button> */}
          {!showAddQuestionForm && (
            <button onClick={() => {setShowAddQuestionForm(true); setNewQuestion(prev => ({...prev, order: (quiz?.questions.length || 0) + 1, options: [{text:'', isCorrect:false}, {text:'', isCorrect:false}]}))}} style={{padding: '10px', margin: '10px 0'}}>
              {t('quizForm.addQuestionButton', 'افزودن سوال جدید')}
            </button>
          )}

          {showAddQuestionForm && (
            // MUI: <Paper sx={{p:2, my:2}} component="form" onSubmit={handleAddQuestionSubmit}> <Typography variant="h6">{t('quizForm.newQuestionTitle', 'سوال جدید')}</Typography> ...form fields... <Button type="submit".../> <Button onClick={()=>setShowAddQuestionForm(false)}.../> </Paper>
            <form onSubmit={handleAddQuestionSubmit} style={{border: '1px dashed #ccc', padding: '15px', marginTop: '15px', borderRadius: '5px'}}>
              <h5>{t('quizForm.newQuestionTitle', 'سوال جدید')}</h5>
              <div>
                <label htmlFor="qText">{t('quizForm.questionTextLabel', 'متن سوال')}:</label>
                <textarea id="qText" name="text" value={newQuestion.text} onChange={handleNewQuestionChange} required style={{width: '90%', minHeight:'50px', marginBottom:'10px'}}/>
              </div>
              <div>
                <label htmlFor="qType">{t('quizForm.questionTypeLabel', 'نوع سوال')}:</label>
                <select id="qType" name="type" value={newQuestion.type} onChange={handleNewQuestionChange} style={{padding:'8px', marginBottom:'10px'}}>
                  <option value="MULTIPLE_CHOICE">{t('questionTypes.MULTIPLE_CHOICE', 'چند گزینه‌ای')}</option>
                  <option value="TRUE_FALSE">{t('questionTypes.TRUE_FALSE', 'صحیح/غلط')}</option>
                </select>
              </div>
              <div>
                <label htmlFor="qOrder">{t('quizForm.questionOrderLabel', 'ترتیب سوال')}:</label>
                <input type="number" id="qOrder" name="order" value={newQuestion.order} onChange={handleNewQuestionChange} required min="1" style={{padding:'8px', marginBottom:'10px'}}/>
              </div>

              {(newQuestion.type === "MULTIPLE_CHOICE" || newQuestion.type === "TRUE_FALSE") && (
                <div>
                  <label>{t('quizForm.optionsLabel', 'گزینه‌ها')}:</label>
                  {newQuestion.options.map((opt, index) => (
                    <div key={index} style={{display: 'flex', alignItems: 'center', marginBottom: '5px'}}>
                      <input type="text" placeholder={`${t('quizForm.optionPlaceholder', 'گزینه')} ${index + 1}`} value={opt.text} onChange={(e) => handleOptionChange(index, 'text', e.target.value)} required style={{flexGrow:1, padding:'6px'}} />
                      <label style={{marginLeft: '5px', marginRight: '5px'}}>
                        <input type="checkbox" checked={opt.isCorrect} onChange={(e) => handleOptionChange(index, 'isCorrect', e.target.checked)} /> {t('quizForm.isCorrectLabel', 'صحیح؟')}
                      </label>
                      {newQuestion.options.length > ((newQuestion.type === "TRUE_FALSE") ? 0 : 2) && <button type="button" onClick={() => removeOption(index)} style={{padding:'3px 6px', color:'red'}}>X</button>}
                    </div>
                  ))}
                  {newQuestion.type === "MULTIPLE_CHOICE" && <button type="button" onClick={addOption} style={{padding:'5px 10px', fontSize:'0.9em', marginTop:'5px'}}>{t('quizForm.addOptionButton', 'افزودن گزینه')}</button>}
                </div>
              )}

              <div style={{marginTop: '15px'}}>
                <button type="submit" disabled={addingQuestion} style={{padding: '10px 15px', marginRight: '10px'}}>
                  {addingQuestion ? t('saving', '...') : t('quizForm.saveQuestionButton', 'ذخیره سوال')}
                </button>
                <button type="button" onClick={() => setShowAddQuestionForm(false)}>{t('cancel', 'انصراف')}</button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
    // MUI: </Container>
  );
};

export default ManageLessonQuizPage;
