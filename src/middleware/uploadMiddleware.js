const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, 'uploads/');
    },
    filename(req, file, cb) {
        cb(
            null,
            `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`
        );
    },
});

function checkFileType(file, cb) {
    const filetypes = /jpg|jpeg|png|blob/; // Added blob to allowed "extensions" just in case, though it has no extension usually.
    // Actually, path.extname('blob') is empty string.
    // Let's just trust mimetype if filename is 'blob', or handle it gracefully.

    // Better logic:
    const filetypesRegex = /jpg|jpeg|png/;
    const extname = filetypesRegex.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypesRegex.test(file.mimetype);

    // If filename is 'blob', ignore extension check if mimetype is valid
    if (file.originalname === 'blob' && mimetype) {
        return cb(null, true);
    }

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb('Images only!');
    }
}

const upload = multer({
    storage,
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    },
});

module.exports = upload;
