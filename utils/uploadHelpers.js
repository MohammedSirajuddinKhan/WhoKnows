const path = require("path");

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp"];
const DOCUMENT_EXTENSIONS = ["pdf", "doc", "docx", "ppt", "pptx", "txt", "zip"];

const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];

const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
  "application/octet-stream",
];

function getFileExtension(file) {
  return path
    .extname(file?.originalname || file?.name || "")
    .replace(/^\./, "")
    .toLowerCase();
}

function inferUploadType(file) {
  const extension = getFileExtension(file);
  const mimeType = String(file?.mimetype || "").toLowerCase();

  if (
    IMAGE_EXTENSIONS.includes(extension) ||
    IMAGE_MIME_TYPES.includes(mimeType)
  ) {
    return "image";
  }

  if (
    DOCUMENT_EXTENSIONS.includes(extension) ||
    DOCUMENT_MIME_TYPES.includes(mimeType)
  ) {
    return "file";
  }

  return null;
}

function isAllowedUpload(file) {
  return Boolean(inferUploadType(file));
}

function getStoredFileUrl(file) {
  if (!file) {
    return null;
  }

  if (file.path && /^https?:\/\//i.test(file.path)) {
    return file.path;
  }

  if (file.secure_url) {
    return file.secure_url;
  }

  if (file.destination && file.filename) {
    return `/uploads/${path.basename(file.destination)}/${file.filename}`;
  }

  return null;
}

function getStoredPublicId(file) {
  if (!file) {
    return null;
  }

  return file.filename || file.public_id || null;
}

function buildUploadMetadata(file, uploadedBy) {
  if (!file) {
    return null;
  }

  return {
    fileUrl: getStoredFileUrl(file),
    publicId: getStoredPublicId(file),
    fileType: file.mimetype || inferUploadType(file),
    originalName: file.originalname || file.name || "Attachment",
    uploadedBy,
    uploadedAt: new Date(),
  };
}

function getUploadLabel(file) {
  const extension = getFileExtension(file);
  if (extension) {
    return extension.toUpperCase();
  }

  const type = inferUploadType(file);
  return type ? type.toUpperCase() : "FILE";
}

function getUploadDescription(file) {
  return file?.originalname || "Attachment";
}

function hasAttachedUpload(req) {
  if (req.file) {
    return true;
  }

  const files = req.files || {};
  return Object.values(files).some(
    (value) => Array.isArray(value) && value.length > 0,
  );
}

function getFirstUpload(req, fieldNames = []) {
  if (req.file) {
    return req.file;
  }

  if (Array.isArray(req.files)) {
    return req.files[0] || null;
  }

  const files = req.files || {};
  for (const fieldName of fieldNames) {
    if (Array.isArray(files[fieldName]) && files[fieldName].length > 0) {
      return files[fieldName][0];
    }
  }

  const firstEntry = Object.values(files).find(
    (value) => Array.isArray(value) && value.length > 0,
  );

  return firstEntry ? firstEntry[0] : null;
}

module.exports = {
  IMAGE_EXTENSIONS,
  DOCUMENT_EXTENSIONS,
  IMAGE_MIME_TYPES,
  DOCUMENT_MIME_TYPES,
  inferUploadType,
  isAllowedUpload,
  getStoredFileUrl,
  getStoredPublicId,
  buildUploadMetadata,
  getUploadLabel,
  getUploadDescription,
  hasAttachedUpload,
  getFirstUpload,
};
