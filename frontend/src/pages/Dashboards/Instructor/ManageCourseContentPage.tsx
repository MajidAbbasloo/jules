import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { GET_COURSE_DETAILS_FOR_EDIT } from '../../../graphql/queries'; // Using this as it fetches sections and lessons
import {
    CREATE_SECTION_MUTATION, UPDATE_SECTION_MUTATION, DELETE_SECTION_MUTATION,
    CREATE_LESSON_MUTATION, UPDATE_LESSON_MUTATION, DELETE_LESSON_MUTATION
} from '../../../graphql/mutations';

// MUI placeholder imports (actual components not used due to env constraints)
// import Typography from '@mui/material/Typography';
// import Button from '@mui/material/Button';
// import TextField from '@mui/material/TextField';
// import Dialog from '@mui/material/Dialog';
// import DialogActions from '@mui/material/DialogActions';
// import DialogContent from '@mui/material/DialogContent';
// import DialogTitle from '@mui/material/DialogTitle';
// import Box from '@mui/material/Box';
// import IconButton from '@mui/material/IconButton';
// import EditIcon from '@mui/icons-material/Edit';
// import DeleteIcon from '@mui/icons-material/Delete';
// import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
// import Accordion from '@mui/material/Accordion';
// import AccordionSummary from '@mui/material/AccordionSummary';
// import AccordionDetails from '@mui/material/AccordionDetails';
// import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
// import List from '@mui/material/List';
// import ListItem from '@mui/material/ListItem';
// import ListItemText from '@mui/material/ListItemText';
// import Paper from '@mui/material/Paper';
// import Checkbox from '@mui/material/Checkbox';
// import FormControlLabel from '@mui/material/FormControlLabel';


interface LessonInput {
  id?: string;
  title: string;
  content?: string | null;
  videoUrl?: string | null;
  duration?: number | null;
  order: number;
  isPreviewable?: boolean | null;
  sectionId: string;
  resources?: any | null; // JSON
}

interface SectionInput {
  id?: string;
  title: string;
  order: number;
  courseId: string;
}

interface Lesson extends LessonInput {
  id: string;
}

interface Section extends SectionInput {
  id: string;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  sections: Section[];
}

const ManageCourseContentPage: React.FC = () => {
  const { t } = useTranslation();
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [currentSection, setCurrentSection] = useState<Partial<SectionInput> | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Partial<LessonInput> | null>(null);
  const [editingSectionIdForLesson, setEditingSectionIdForLesson] = useState<string | null>(null);

  // Fetch course details
  const { loading: loadingCourse, error: errorCourse, data: dataCourse, refetch: refetchCourse } = useQuery(GET_COURSE_DETAILS_FOR_EDIT, {
    variables: { id: courseId },
    skip: !courseId,
    onCompleted: (data) => {
      if (data && data.getCourseById) {
        setCourse(data.getCourseById);
      }
    }
  });

  // Section Mutations
  const [createSection] = useMutation(CREATE_SECTION_MUTATION);
  const [updateSection] = useMutation(UPDATE_SECTION_MUTATION);
  const [deleteSection] = useMutation(DELETE_SECTION_MUTATION);

  // Lesson Mutations
  const [createLesson] = useMutation(CREATE_LESSON_MUTATION);
  const [updateLesson] = useMutation(UPDATE_LESSON_MUTATION);
  const [deleteLesson] = useMutation(DELETE_LESSON_MUTATION);


  // Modal Open/Close Handlers
  const handleOpenSectionModal = (section?: Section) => {
    setCurrentSection(section ? { ...section } : { title: '', order: (course?.sections.length || 0) + 1, courseId: courseId! });
    setIsSectionModalOpen(true);
  };
  const handleCloseSectionModal = () => {
    setIsSectionModalOpen(false);
    setCurrentSection(null);
  };

  const handleOpenLessonModal = (sectionId: string, lesson?: Lesson) => {
    setEditingSectionIdForLesson(sectionId);
    const section = course?.sections.find(s => s.id === sectionId);
    setCurrentLesson(lesson ? { ...lesson } : { title: '', order: (section?.lessons.length || 0) + 1, sectionId, isPreviewable: false, duration: 0 });
    setIsLessonModalOpen(true);
  };
  const handleCloseLessonModal = () => {
    setIsLessonModalOpen(false);
    setCurrentLesson(null);
    setEditingSectionIdForLesson(null);
  };

  // Form Change Handlers
  const handleSectionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentSection(prev => ({ ...prev, [name]: name === 'order' ? parseInt(value) || 0 : value }));
  };

  const handleLessonChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    // @ts-ignore
    const val = isCheckbox ? e.target.checked : (name === 'order' || name === 'duration' ? parseInt(value) || 0 : value);
    setCurrentLesson(prev => ({ ...prev, [name]: val }));
  };

  // Submit Handlers
  const handleSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSection || !currentSection.title || currentSection.order === undefined) return;

    try {
      if (currentSection.id) { // Update
        await updateSection({ variables: { id: currentSection.id, title: currentSection.title, order: currentSection.order } });
      } else { // Create
        await createSection({ variables: { ...currentSection, courseId: courseId! } });
      }
      refetchCourse();
      handleCloseSectionModal();
    } catch (err: any) {
      alert(t('manageContent.sectionSaveError', 'خطا در ذخیره سرفصل: ') + err.message);
    }
  };

  const handleLessonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLesson || !currentLesson.title || currentLesson.order === undefined || !editingSectionIdForLesson) return;

    const lessonData = {
        title: currentLesson.title,
        content: currentLesson.content,
        videoUrl: currentLesson.videoUrl,
        duration: Number(currentLesson.duration) || 0,
        order: Number(currentLesson.order),
        isPreviewable: currentLesson.isPreviewable || false,
        sectionId: editingSectionIdForLesson,
        resources: currentLesson.resources // Assuming resources is handled as JSON string or object
    };

    try {
      if (currentLesson.id) { // Update
        await updateLesson({ variables: { id: currentLesson.id, ...lessonData } });
      } else { // Create
        await createLesson({ variables: lessonData });
      }
      refetchCourse();
      handleCloseLessonModal();
    } catch (err: any) {
      alert(t('manageContent.lessonSaveError', 'خطا در ذخیره درس: ') + err.message);
    }
  };

  // Delete Handlers
  const handleDeleteSection = async (sectionId: string) => {
    if (window.confirm(t('manageContent.confirmDeleteSection', 'آیا از حذف این سرفصل و تمام درسهای آن مطمئن هستید؟'))) {
      try {
        await deleteSection({ variables: { id: sectionId }});
        refetchCourse();
      } catch (err: any) {
        alert(t('manageContent.sectionDeleteError', 'خطا در حذف سرفصل: ') + err.message);
      }
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (window.confirm(t('manageContent.confirmDeleteLesson', 'آیا از حذف این درس مطمئن هستید؟'))) {
      try {
        await deleteLesson({ variables: { id: lessonId }});
        refetchCourse();
      } catch (err: any) {
        alert(t('manageContent.lessonDeleteError', 'خطا در حذف درس: ') + err.message);
      }
    }
  };


  if (loadingCourse) return <p>{t('loading', 'در حال بارگذاری محتوای دوره...')}</p>;
  if (errorCourse) return <p>{t('errorLoading', 'خطا در بارگذاری دوره: ')} {errorCourse.message}</p>;
  if (!course) return <p>{t('courseDetails.notFound', 'دوره یافت نشد.')}</p>;

  // Basic styles (can be replaced with MUI later)
  const sectionStyle = { border: '1px solid #ccc', padding: '15px', marginBottom: '15px', borderRadius: '5px' };
  const lessonStyle = { border: '1px dashed #eee', padding: '10px', marginLeft: '20px', marginBottom: '10px', borderRadius: '4px', background: '#f9f9f9'};

  return (
    // MUI: <Container maxWidth="lg" sx={{ py: 3 }}>
    <div>
      {/* MUI: <Button component={Link} to="/dashboard/instructor/courses" sx={{ mb: 2 }}>{t('manageContent.backToCourses', 'بازگشت به لیست دوره ها')}</Button> */}
      <Link to="/dashboard/instructor/courses" style={{display: 'inline-block', marginBottom: '20px'}}>&larr; {t('manageContent.backToCourses', 'بازگشت به لیست دوره ها')}</Link>

      {/* MUI: <Typography variant="h4" gutterBottom>{t('manageContent.title', 'مدیریت محتوای دوره')}: {course.title}</Typography> */}
      <h2>{t('manageContent.title', 'مدیریت محتوای دوره')}: {course.title}</h2>

      {/* MUI: <Button variant="contained" onClick={() => handleOpenSectionModal()} startIcon={<AddCircleOutlineIcon />} sx={{ my: 2 }}>{t('manageContent.addSection', 'افزودن سرفصل جدید')}</Button> */}
      <button onClick={() => handleOpenSectionModal()} style={{marginBottom: '20px', padding: '10px'}}>
        {t('manageContent.addSection', 'افزودن سرفصل جدید')}
      </button>

      {/* Sections List */}
      {/* MUI: <Box> {course.sections.map(... <Paper elevation={2} sx={{ p:2, my:2 }}> ... </Paper>)} </Box> */}
      <div>
        {course.sections.sort((a,b) => a.order - b.order).map(section => (
          // MUI: <Accordion key={section.id} defaultExpanded> <AccordionSummary expandIcon={<ExpandMoreIcon />}> <Typography>{section.title} (Order: {section.order})</Typography> ...actions... </AccordionSummary> <AccordionDetails> ...lessons... </AccordionDetails> </Accordion>
          <div key={section.id} style={sectionStyle}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
              {/* MUI: <Typography variant="h6">{section.title} ({t('order', 'ترتیب')}: {section.order})</Typography> */}
              <strong>{section.title} ({t('order', 'ترتیب')}: {section.order})</strong>
              <div>
                {/* MUI: <IconButton size="small" onClick={() => handleOpenSectionModal(section)}><EditIcon /></IconButton> */}
                <button onClick={() => handleOpenSectionModal(section)} style={{marginRight: '5px'}}>{t('edit', 'ویرایش')}</button>
                {/* MUI: <IconButton size="small" color="error" onClick={() => handleDeleteSection(section.id)}><DeleteIcon /></IconButton> */}
                <button onClick={() => handleDeleteSection(section.id)} style={{color: 'red'}}>{t('delete', 'حذف')}</button>
              </div>
            </div>

            {/* Lessons List for this section */}
            {/* MUI: <List dense> */}
            <div>
              {section.lessons.sort((a,b) => a.order - b.order).map(lesson => (
                // MUI: <ListItem key={lesson.id} sx={lessonStyle} secondaryAction={...actions...}> <ListItemText primary={`${lesson.title} (Order: ${lesson.order})`} secondary={lesson.videoUrl || lesson.content?.substring(0,30)} /> </ListItem>
                <div key={lesson.id} style={lessonStyle}>
                   <p>{lesson.title} ({t('order', 'ترتیب')}: {lesson.order}) {lesson.isPreviewable ? `(${t('preview', 'پیش نمایش')})` : ''}</p>
                   <p style={{fontSize: '0.8em', color: 'gray'}}>{lesson.videoUrl || (lesson.content || '').substring(0,50)}...</p>
                   <div>
                    {/* MUI: <IconButton size="small" onClick={() => handleOpenLessonModal(section.id, lesson)}><EditIcon /></IconButton> */}
                    <button onClick={() => handleOpenLessonModal(section.id, lesson)} style={{marginRight: '5px'}}>{t('edit', 'ویرایش')}</button>
                    {/* MUI: <IconButton size="small" color="error" onClick={() => handleDeleteLesson(lesson.id)}><DeleteIcon /></IconButton> */}
                    <button onClick={() => handleDeleteLesson(lesson.id)} style={{color: 'red'}}>{t('delete', 'حذف')}</button>
                   </div>
                </div>
              ))}
            </div>
            {/* MUI: </List> */}
            {/* MUI: <Button size="small" onClick={() => handleOpenLessonModal(section.id)} startIcon={<AddCircleOutlineIcon />} sx={{ mt: 1 }}>{t('manageContent.addLesson', 'افزودن درس جدید')}</Button> */}
            <button onClick={() => handleOpenLessonModal(section.id)} style={{marginTop: '10px', padding: '8px'}}>
              {t('manageContent.addLesson', 'افزودن درس جدید به این سرفصل')}
            </button>
          </div>
        ))}
      </div>

      {/* Section Modal */}
      {/* MUI: <Dialog open={isSectionModalOpen} onClose={handleCloseSectionModal}> <DialogTitle>...</DialogTitle> <DialogContent>...</DialogContent> <DialogActions>...</DialogActions> </Dialog> */}
      {isSectionModalOpen && currentSection && (
        <div style={{position: 'fixed', top: '10%', left: '30%', right: '30%', background: 'white', padding: '20px', border: '1px solid black', zIndex: 100}}>
          <h3>{currentSection.id ? t('manageContent.editSection', 'ویرایش سرفصل') : t('manageContent.createSection', 'ایجاد سرفصل جدید')}</h3>
          <form onSubmit={handleSectionSubmit}>
            {/* MUI: <TextField fullWidth margin="dense" label={t('title', 'عنوان')} name="title" value={currentSection.title || ''} onChange={handleSectionChange} required /> */}
            <div><label>{t('title', 'عنوان')}:</label><input type="text" name="title" value={currentSection.title || ''} onChange={handleSectionChange} required style={{width: '90%'}} /></div>
            {/* MUI: <TextField fullWidth margin="dense" type="number" label={t('order', 'ترتیب')} name="order" value={currentSection.order || 0} onChange={handleSectionChange} required /> */}
            <div style={{marginTop: '10px'}}><label>{t('order', 'ترتیب')}:</label><input type="number" name="order" value={currentSection.order || 0} onChange={handleSectionChange} required style={{width: '90%'}} /></div>
            <div style={{marginTop: '20px'}}>
              {/* MUI: <Button onClick={handleCloseSectionModal}>{t('cancel', 'انصراف')}</Button> <Button type="submit" variant="contained">{t('save', 'ذخیره')}</Button> */}
              <button type="button" onClick={handleCloseSectionModal} style={{marginRight: '10px'}}>{t('cancel', 'انصراف')}</button>
              <button type="submit">{t('save', 'ذخیره')}</button>
            </div>
          </form>
        </div>
      )}

      {/* Lesson Modal */}
      {isLessonModalOpen && currentLesson && (
         <div style={{position: 'fixed', top: '5%', left: '25%', right: '25%', background: 'white', padding: '20px', border: '1px solid black', zIndex: 101, maxHeight: '90vh', overflowY: 'auto'}}>
          <h3>{currentLesson.id ? t('manageContent.editLesson', 'ویرایش درس') : t('manageContent.createLesson', 'ایجاد درس جدید')}</h3>
          <form onSubmit={handleLessonSubmit}>
            {/* MUI: <TextField fullWidth margin="dense" label={t('title', 'عنوان')} name="title" value={currentLesson.title || ''} onChange={handleLessonChange} required /> */}
            <div><label>{t('title', 'عنوان')}:</label><input type="text" name="title" value={currentLesson.title || ''} onChange={handleLessonChange} required style={{width: '90%'}} /></div>

            {/* MUI: <TextField fullWidth margin="dense" multiline rows={3} label={t('content', 'محتوا (متن/Markdown)')} name="content" value={currentLesson.content || ''} onChange={handleLessonChange} /> */}
            <div style={{marginTop: '10px'}}><label>{t('content', 'محتوا (متن/Markdown)')}:</label><textarea name="content" value={currentLesson.content || ''} onChange={handleLessonChange} style={{width: '90%', minHeight: '60px'}} /></div>

            {/* MUI: <TextField fullWidth margin="dense" label={t('videoUrl', 'آدرس ویدیو')} name="videoUrl" value={currentLesson.videoUrl || ''} onChange={handleLessonChange} /> */}
            <div style={{marginTop: '10px'}}><label>{t('videoUrl', 'آدرس ویدیو')}:</label><input type="text" name="videoUrl" value={currentLesson.videoUrl || ''} onChange={handleLessonChange} style={{width: '90%'}} /></div>

            {/* MUI: <TextField fullWidth margin="dense" type="number" label={t('duration', 'مدت زمان (دقیقه)')} name="duration" value={currentLesson.duration || 0} onChange={handleLessonChange} /> */}
            <div style={{marginTop: '10px'}}><label>{t('duration', 'مدت زمان (دقیقه)')}:</label><input type="number" name="duration" value={currentLesson.duration || 0} onChange={handleLessonChange} style={{width: '90%'}} /></div>

            {/* MUI: <TextField fullWidth margin="dense" type="number" label={t('order', 'ترتیب')} name="order" value={currentLesson.order || 0} onChange={handleLessonChange} required /> */}
            <div style={{marginTop: '10px'}}><label>{t('order', 'ترتیب')}:</label><input type="number" name="order" value={currentLesson.order || 0} onChange={handleLessonChange} required style={{width: '90%'}} /></div>

            {/* MUI: <FormControlLabel control={<Checkbox checked={currentLesson.isPreviewable || false} onChange={handleLessonChange} name="isPreviewable" />} label={t('isPreviewable', 'قابل پیش نمایش')} /> */}
            <div style={{marginTop: '10px'}}><label><input type="checkbox" name="isPreviewable" checked={currentLesson.isPreviewable || false} onChange={handleLessonChange} /> {t('isPreviewable', 'قابل پیش نمایش')}</label></div>

            {/* TODO: UI for JSON resources - could be a simple textarea for JSON string or more complex key-value inputs */}
            <div style={{marginTop: '10px'}}><label>{t('resourcesJson', 'منابع (JSON)')}:</label><textarea name="resources" defaultValue={currentLesson.resources ? JSON.stringify(currentLesson.resources, null, 2) : ''} onChange={(e) => { try { setCurrentLesson(prev => ({...prev, resources: JSON.parse(e.target.value)})); } catch (jsonErr) { /* handle malformed JSON */}}} style={{width: '90%', minHeight: '60px'}} /></div>

            <div style={{marginTop: '20px'}}>
              {/* MUI: <Button onClick={handleCloseLessonModal}>{t('cancel', 'انصراف')}</Button> <Button type="submit" variant="contained">{t('save', 'ذخیره')}</Button> */}
              <button type="button" onClick={handleCloseLessonModal} style={{marginRight: '10px'}}>{t('cancel', 'انصراف')}</button>
              <button type="submit">{t('save', 'ذخیره')}</button>
            </div>
          </form>
        </div>
      )}
      {/* MUI: </Container> */}
    </div>
  );
};

export default ManageCourseContentPage;
