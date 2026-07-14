const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { authenticateUser, authorizeRole, scopeToSchool } = require('../middleware/auth.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const {
  createExamSchema,
  updateExamSchema,
  addExamSubjectsSchema,
  updateExamSubjectSchema,
  enterGradesSchema,
} = require('../validation/schemas');
const {
  listExams,
  createExam,
  updateExam,
  deleteExam,
  addExamSubjects,
  listExamSubjects,
  updateExamSubject,
  deleteExamSubject,
} = require('../controllers/exam.controller');
const { enterGrades, listGrades } = require('../controllers/grade.controller');

const router = express.Router();

router.use(authenticateUser, scopeToSchool);

router.get('/', authorizeRole(['owner', 'admin', 'teacher', 'staff', 'parent']), asyncHandler(listExams));
router.post(
  '/',
  authorizeRole(['owner', 'admin', 'teacher', 'staff']),
  validateBody(createExamSchema),
  asyncHandler(createExam)
);

router.get('/grades/all', authorizeRole(['owner', 'admin', 'teacher', 'staff', 'parent']), asyncHandler(listGrades));
router.post(
  '/grades',
  authorizeRole(['owner', 'admin', 'teacher', 'staff']),
  validateBody(enterGradesSchema),
  asyncHandler(enterGrades)
);

router.get('/:id/subjects', authorizeRole(['owner', 'admin', 'teacher', 'staff', 'parent']), asyncHandler(listExamSubjects));
router.post(
  '/:id/subjects',
  authorizeRole(['owner', 'admin', 'teacher', 'staff']),
  validateBody(addExamSubjectsSchema),
  asyncHandler(addExamSubjects)
);
router.put(
  '/:id/subjects/:subjectId',
  authorizeRole(['owner', 'admin', 'teacher', 'staff']),
  validateBody(updateExamSubjectSchema),
  asyncHandler(updateExamSubject)
);
router.delete(
  '/:id/subjects/:subjectId',
  authorizeRole(['owner', 'admin', 'teacher', 'staff']),
  asyncHandler(deleteExamSubject)
);

router.put(
  '/:id',
  authorizeRole(['owner', 'admin', 'teacher', 'staff']),
  validateBody(updateExamSchema),
  asyncHandler(updateExam)
);
router.delete('/:id', authorizeRole(['owner', 'admin', 'teacher', 'staff']), asyncHandler(deleteExam));

module.exports = router;
