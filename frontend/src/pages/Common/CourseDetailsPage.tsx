import React from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const CourseDetailsPage: React.FC = () => {
  const { t } = useTranslation();
  const { courseId } = useParams<{ courseId: string }>();

  return (
    <div>
      <h1>{t('courseDetails.title', 'جزئیات دوره')}</h1>
      <p>{t('courseDetails.idDisplay', 'شناسه دوره')}: {courseId}</p>
      {/*
        TODO: Fetch course details using courseId from GraphQL query.
        Display title, description, price, tags, instructor, curriculum, reviews, etc.
      */}
      <p>{t('courseDetails.placeholder', 'محتوای دوره در اینجا نمایش داده خواهد شد.')}</p>
    </div>
  );
};

export default CourseDetailsPage;
