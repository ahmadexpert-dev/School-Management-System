const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { authenticateUser, authorizeRole, scopeToSchool } = require('../middleware/auth.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const { createEventSchema, updateEventSchema } = require('../validation/schemas');
const { listEvents, createEvent, updateEvent, deleteEvent } = require('../controllers/calendar.controller');

const router = express.Router();

router.use(authenticateUser, scopeToSchool);

router.get('/', asyncHandler(listEvents));
router.post('/', authorizeRole(['owner', 'admin']), validateBody(createEventSchema), asyncHandler(createEvent));
router.put('/:id', authorizeRole(['owner', 'admin']), validateBody(updateEventSchema), asyncHandler(updateEvent));
router.delete('/:id', authorizeRole(['owner', 'admin']), asyncHandler(deleteEvent));

module.exports = router;
