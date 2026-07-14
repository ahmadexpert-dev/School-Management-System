const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { authenticateUser, authorizeRole, scopeToSchool } = require('../middleware/auth.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const { uploadStudentPhoto } = require('../middleware/upload.middleware');
const {
  createStudentSchema,
  updateStudentSchema,
  promoteStudentsSchema,
  bulkAdmitStudentsSchema,
} = require('../validation/schemas');
const {
  listStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  promoteStudents,
  bulkAdmitStudents,
  getAdmissionStats,
  uploadStudentPhoto: uploadStudentPhotoHandler,
} = require('../controllers/student.controller');

const router = express.Router();

router.use(authenticateUser, scopeToSchool);

router.get('/', authorizeRole(['owner', 'admin', 'teacher', 'staff', 'parent']), asyncHandler(listStudents));
router.get('/admission-stats', authorizeRole(['owner', 'admin']), asyncHandler(getAdmissionStats));
router.get('/:id', authorizeRole(['owner', 'admin', 'teacher', 'staff', 'parent']), asyncHandler(getStudent));
router.post('/', authorizeRole(['owner', 'admin']), validateBody(createStudentSchema), asyncHandler(createStudent));
router.post(
  '/bulk',
  authorizeRole(['owner', 'admin']),
  validateBody(bulkAdmitStudentsSchema),
  asyncHandler(bulkAdmitStudents)
);
router.post(
  '/promote',
  authorizeRole(['owner', 'admin']),
  validateBody(promoteStudentsSchema),
  asyncHandler(promoteStudents)
);
router.post(
  '/:id/photo',
  authorizeRole(['owner', 'admin']),
  uploadStudentPhoto.single('photo'),
  asyncHandler(uploadStudentPhotoHandler)
);
router.put('/:id', authorizeRole(['owner', 'admin']), validateBody(updateStudentSchema), asyncHandler(updateStudent));
router.delete('/:id', authorizeRole(['owner', 'admin']), asyncHandler(deleteStudent));

module.exports = router;
