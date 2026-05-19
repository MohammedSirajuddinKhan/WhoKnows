const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { cloudinary, hasCloudinaryEnv } = require("../config/cloudinary");
const { CloudinaryStorage } = (() => {
  try {
    return require("multer-storage-cloudinary");
  } catch (error) {
    return {};
  }
})();
const {
  IMAGE_MIME_TYPES,
  DOCUMENT_MIME_TYPES,
  isAllowedUpload,
} = require("../utils/uploadHelpers");

const uploadRoot = path.join(__dirname, "..", "public", "uploads");
if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

function ensureLocalDestination(folder) {
  const destination = path.join(uploadRoot, folder);
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }
  return destination;
}

function buildLocalStorage(folderResolver) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const folder =
        typeof folderResolver === "function"
          ? folderResolver(req, file)
          : folderResolver;
      cb(null, ensureLocalDestination(folder));
    },
    filename: (_req, file, cb) => {
      const cleanBase = path
        .parse(file.originalname || "upload")
        .name.replace(/[^a-zA-Z0-9_-]/g, "-");
      cb(
        null,
        `${Date.now()}-${Math.round(Math.random() * 1e9)}-${cleanBase}${path.extname(file.originalname || "")}`,
      );
    },
  });
}

function buildCloudinaryStorage(folderResolver, resourceType = "auto") {
  if (!cloudinary || !CloudinaryStorage || !hasCloudinaryEnv) {
    return null;
  }

  return new CloudinaryStorage({
    cloudinary,
    params: (req, file) => ({
      folder:
        typeof folderResolver === "function"
          ? folderResolver(req, file)
          : folderResolver,
      resource_type: resourceType,
      use_filename: true,
      unique_filename: true,
      overwrite: false,
      public_id: path
        .parse(file.originalname || "upload")
        .name.replace(/[^a-zA-Z0-9_-]/g, "-"),
    }),
  });
}

function createUploadMiddleware({
  folder,
  resourceType = "auto",
  maxSize,
  allowedMimeTypes,
  errorMessage,
}) {
  const storage =
    buildCloudinaryStorage(folder, resourceType) || buildLocalStorage(folder);

  return multer({
    storage,
    limits: { fileSize: maxSize },
    fileFilter: (_req, file, cb) => {
      const mime = String(file.mimetype || "").toLowerCase();
      const allowed =
        isAllowedUpload(file) &&
        (!allowedMimeTypes || allowedMimeTypes.includes(mime));

      if (!allowed) {
        return cb(new Error(errorMessage));
      }

      cb(null, true);
    },
  });
}

const profilePicture = createUploadMiddleware({
  folder: "profile_pictures",
  resourceType: "image",
  maxSize: 4 * 1024 * 1024,
  allowedMimeTypes: IMAGE_MIME_TYPES,
  errorMessage:
    "Only image files are allowed for profile pictures. Allowed: jpg, jpeg, png, gif, webp.",
});

const chatAttachments = createUploadMiddleware({
  folder: (_req, file) =>
    file.fieldname === "attachmentImage" ? "chat_images" : "chat_files",
  resourceType: "auto",
  maxSize: 20 * 1024 * 1024,
  allowedMimeTypes: [...IMAGE_MIME_TYPES, ...DOCUMENT_MIME_TYPES],
  errorMessage:
    "Unsupported attachment type. Allowed: jpg, jpeg, png, gif, webp, pdf, doc, docx, ppt, pptx, txt, zip.",
});

module.exports = {
  profilePicture,
  chatAttachments,
};
