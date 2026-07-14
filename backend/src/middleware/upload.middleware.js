const fs = require('fs');
const path = require('path');
const multer = require('multer');

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function makePhotoUploader(subdir) {
  const dir = path.join(__dirname, '../../uploads', subdir);
  fs.mkdirSync(dir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${req.schoolId}-${req.params.id}-${Date.now()}${ext}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: 3 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (!ALLOWED_TYPES.includes(file.mimetype)) {
        return cb(new Error('Only JPEG, PNG, or WEBP images are allowed'));
      }
      cb(null, true);
    },
  });
}

const uploadStudentPhoto = makePhotoUploader('students');
const uploadStaffPhoto = makePhotoUploader('staff');

module.exports = { uploadStudentPhoto, uploadStaffPhoto };
