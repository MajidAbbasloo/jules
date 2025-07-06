import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { GET_QUIZ_FOR_STUDENT } from '../../graphql/queries'; // Or a query that gets quiz via attemptId if resuming
import { START_QUIZ_ATTEMPT_MUTATION, SUBMIT_STUDENT_ANSWER_MUTATION, FINISH_QUIZ_ATTEMPT_MUTATION } from '../../graphql/mutations';
import { useAuth } from '../../context/AuthContext';

// MUI Placeholder imports
// import Typography from '@mui/material/Typography';
// import Button from '@mui/material/Button';
// import Box from '@mui/material/Box';
// import Paper from '@mui/material/Paper';
// import Radio from '@mui/material/Radio';
// import RadioGroup from '@mui/material/RadioGroup';
// import FormControlLabel from '@mui/material/FormControlLabel';
// import FormControl from '@mui/material/FormControl';
// import FormLabel from '@mui/material/FormLabel';
// import CircularProgress from '@mui/material/CircularProgress';
// import Alert from '@mui/material/Alert';
// import Stepper, Step, StepLabel from '@mui/material/Stepper'; // For question navigation

interface Option { id: string; text: string; }
interface Question { id: string; text: string; type: string; order: number; options: Option[]; }
interface Quiz { id: string; title: string; description?: string | null; questions: Question[]; }
interface Attempt { id: string; startedAt: string; quiz: Quiz; } // From START_QUIZ_ATTEMPT_MUTATION
interface AttemptResult { id: string; completedAt: string; score: number; studentAnswers: {id: string; isCorrect: boolean | null; question: {id: string; text: string}; selectedOption: {id: string; text: string} | null }[] }

const TakeQuizPage: React.FC = () => {
  const { t } = useTranslation();
  const { quizId } = useParams<{ quizId: string }>(); // Assuming quizId is passed in URL to start
  const navigate = useNavigate();
  const { user } = useAuth();

  const [currentAttempt, setCurrentAttempt] = useState<Attempt | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<{ [questionId: string]: string }>({});
  const [quizResult, setQuizResult] = useState<AttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Start quiz attempt
  const [startAttempt, { loading: startingAttempt }] = useMutation<{ startQuizAttempt: Attempt }>(START_QUIZ_ATTEMPT_MUTATION, {
    onCompleted: (data) => {
      setCurrentAttempt(data.startQuizAttempt);
      setCurrentQuestionIndex(0);
      setSelectedOptions({});
      setQuizResult(null);
      setError(null);
    },
    onError: (err) => {
      setError(err.message || t('takeQuiz.errorStart', 'خطا در شروع آزمون.'));
      // TODO: Toast notification
    }
  });

  // Get Quiz (if not already part of startAttempt response, or if resuming - not implemented yet)
  // For now, startAttempt returns quiz data. If not, a GET_QUIZ_FOR_STUDENT would be needed here.
  // const { loading: quizLoading, data: quizData } = useQuery(GET_QUIZ_FOR_STUDENT, { variables: { quizId }, skip: !quizId || !!currentAttempt });


  const [submitAnswer, { loading: submittingAnswer }] = useMutation(SUBMIT_STUDENT_ANSWER_MUTATION, {
    onError: (err) => {
      setError(err.message || t('takeQuiz.errorSubmitAnswer', 'خطا در ثبت پاسخ.'));
      // TODO: Toast notification
    }
    // No onCompleted needed here as we submit one by one, or all at end.
    // If submitting one by one, might want UI feedback.
  });

  const [finishAttempt, { loading: finishingAttempt }] = useMutation<{ finishQuizAttempt: AttemptResult }>(FINISH_QUIZ_ATTEMPT_MUTATION, {
    onCompleted: (data) => {
      setQuizResult(data.finishQuizAttempt);
      setCurrentAttempt(null); // Clear current attempt after finishing
       // TODO: Toast notification for success
    },
    onError: (err) => {
      setError(err.message || t('takeQuiz.errorFinish', 'خطا در پایان آزمون.'));
      // TODO: Toast notification
    }
  });

  useEffect(() => {
    if (quizId && !currentAttempt && !quizResult) { // Only start if no current attempt and no result shown
      startAttempt({ variables: { quizId } });
    }
  }, [quizId, startAttempt, currentAttempt, quizResult]);

  const handleOptionChange = (questionId: string, optionId: string) => {
    setSelectedOptions(prev => ({ ...prev, [questionId]: optionId }));
    // Auto-submit answer if desired, or wait for a "Next" or "Finish" button.
    // For simplicity, we'll submit all answers when "Finish" is clicked.
  };

  const handleNextQuestion = async () => {
    if (!currentAttempt || !currentAttempt.quiz) return;
    // Submit current answer before moving to next (optional, can submit all at end)
    const currentQuestion = currentAttempt.quiz.questions[currentQuestionIndex];
    if (selectedOptions[currentQuestion.id]) {
        try {
            await submitAnswer({variables: {attemptId: currentAttempt.id, questionId: currentQuestion.id, selectedOptionId: selectedOptions[currentQuestion.id]}});
        } catch(e) { /* error handled by mutation's onError */ return; }
    }

    if (currentQuestionIndex < currentAttempt.quiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handleFinishQuiz = async () => {
    if (!currentAttempt) return;
    // Submit the last answer if not already submitted
     const currentQuestion = currentAttempt.quiz.questions[currentQuestionIndex];
    if (selectedOptions[currentQuestion.id]) {
         try {
            await submitAnswer({variables: {attemptId: currentAttempt.id, questionId: currentQuestion.id, selectedOptionId: selectedOptions[currentQuestion.id]}});
        } catch(e) { /* error handled by mutation's onError */ return; }
    }
    // Then finish the attempt
    finishAttempt({ variables: { attemptId: currentAttempt.id } });
  };

  if (startingAttempt || (!currentAttempt && !quizResult && !error)) return <p>{t('loading', 'آماده‌سازی آزمون...')}</p>; // MUI: <CircularProgress />
  if (error) return <p style={{color: 'red'}}>{error}</p>; // MUI: <Alert severity="error">{error}</Alert>

  if (quizResult) {
    // Display Quiz Result
    // MUI: <Paper sx={{p:3, my:2, textAlign:'center'}}> <Typography variant="h4">{t('takeQuiz.resultTitle', 'نتیجه آزمون')}</Typography> ... </Paper>
    return (
      <div style={{padding: '20px', textAlign: 'center'}}>
        <h2>{t('takeQuiz.resultTitle', 'نتیجه آزمون')}</h2>
        <p>{t('takeQuiz.yourScore', 'امتیاز شما')}: {quizResult.score.toFixed(2)}%</p>
        <h3>{t('takeQuiz.answersReview', 'مرور پاسخ‌ها:')}</h3>
        <ul style={{listStyleType: 'none', padding: 0, textAlign: user?.profile?.preferredLanguage === 'fa' ? 'right' : 'left'}}>
          {quizResult.studentAnswers.map(ans => (
            <li key={ans.id} style={{borderBottom: '1px solid #eee', padding: '10px 0', color: ans.isCorrect ? 'green' : 'red'}}>
              <strong>{ans.question.text}</strong>
              <p>{t('takeQuiz.yourAnswer', 'پاسخ شما')}: {ans.selectedOption?.text || t('takeQuiz.notAnswered', 'پاسخ داده نشده')}</p>
              {/* In a real app, you'd fetch correct answer text if not already available or if student's answer was wrong */}
            </li>
          ))}
        </ul>
        <button onClick={() => navigate(`/course/${quizId}`)} style={{marginTop: '20px', padding: '10px 20px'}}>{t('takeQuiz.backToCourse', 'بازگشت به دوره')}</button>
      </div>
    );
  }

  if (!currentAttempt || !currentAttempt.quiz || currentAttempt.quiz.questions.length === 0) {
    return <p>{t('takeQuiz.noQuizData', 'اطلاعات آزمون یافت نشد یا آزمون سوالی ندارد.')}</p>; // MUI: <Alert severity="warning">...</Alert>
  }

  const question = currentAttempt.quiz.questions[currentQuestionIndex];

  return (
    // MUI: <Container maxWidth="md" sx={{py:3}}> <Paper sx={{p:3}}> ... </Paper> </Container>
    <div style={{padding: '20px'}}>
      {/* MUI: <Typography variant="h4" gutterBottom>{currentAttempt.quiz.title}</Typography> */}
      <h2>{currentAttempt.quiz.title}</h2>
      {/* MUI: <Typography variant="subtitle1" color="text.secondary"> سوال {currentQuestionIndex + 1} از {currentAttempt.quiz.questions.length} </Typography> */}
      <p>{t('takeQuiz.questionProgress', 'سوال {{current}} از {{total}}', {current: currentQuestionIndex + 1, total: currentAttempt.quiz.questions.length})}</p>

      {/* MUI Question Stepper: <Stepper activeStep={currentQuestionIndex} alternativeLabel sx={{my:2}}> {currentAttempt.quiz.questions.map(...<Step><StepLabel>...</StepLabel></Step>)} </Stepper> */}

      {/* MUI: <Box sx={{my:3}}> <Typography variant="h6">{question.text}</Typography> ...options... </Box> */}
      <div style={{margin: '20px 0'}}>
        <h3>{question.order}. {question.text}</h3>
        {/* MUI: <FormControl component="fieldset" sx={{mt:1}}> <RadioGroup value={selectedOptions[question.id] || ''} onChange={(e) => handleOptionChange(question.id, e.target.value)}> {question.options.map(...)} </RadioGroup> </FormControl> */}
        <div>
          {question.options.map(opt => (
            <div key={opt.id} style={{margin: '5px 0'}}>
              <label>
                <input
                  type="radio"
                  name={`question_${question.id}`}
                  value={opt.id}
                  checked={selectedOptions[question.id] === opt.id}
                  onChange={(e) => handleOptionChange(question.id, e.target.value)}
                  style={{marginRight: '8px'}}
                />
                {opt.text}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* MUI: <Box sx={{display: 'flex', justifyContent: 'space-between', mt:3}}> ...buttons... </Box> */}
      <div style={{marginTop: '20px', display: 'flex', justifyContent: 'space-between'}}>
        {/* Previous button can be added if needed */}
        {currentQuestionIndex < currentAttempt.quiz.questions.length - 1 ? (
          // MUI: <Button variant="contained" onClick={handleNextQuestion} disabled={submittingAnswer}>{t('takeQuiz.nextButton', 'بعدی')}</Button>
          <button onClick={handleNextQuestion} disabled={submittingAnswer} style={{padding: '10px 20px'}}>
            {t('takeQuiz.nextButton', 'بعدی')}
          </button>
        ) : (
          // MUI: <Button variant="contained" color="success" onClick={handleFinishQuiz} disabled={finishingAttempt || submittingAnswer}>{t('takeQuiz.finishButton', 'پایان آزمون')}</Button>
          <button onClick={handleFinishQuiz} disabled={finishingAttempt || submittingAnswer} style={{padding: '10px 20px', backgroundColor: 'green', color: 'white'}}>
            {finishingAttempt ? t('takeQuiz.finishing', 'درحال ارسال...') : t('takeQuiz.finishButton', 'پایان آزمون')}
          </button>
        )}
      </div>
    </div>
  );
};

export default TakeQuizPage;
