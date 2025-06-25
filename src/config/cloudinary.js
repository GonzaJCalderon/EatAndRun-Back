import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 🥗 Para imágenes de platos
const storagePlatos = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'eat-and-run/platos',
    allowed_formats: ['jpg', 'png', 'jpeg'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }]
  }
});

// 📎 Para comprobantes de pago
// 📎 Para comprobantes de pago (PDFs e imágenes)
// utils/cloudinary.js
const storageComprobantes = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/jpg'];

    if (!allowedImageTypes.includes(file.mimetype)) {
      throw new Error('Solo se permiten archivos JPG/PNG');
    }

    return {
      folder: 'eat-and-run/comprobantes',
      allowed_formats: ['jpg', 'jpeg', 'png'],
      use_filename: true,
      unique_filename: true,
      resource_type: 'image' // Solo imágenes
    };
  }
});



export {
  cloudinary,
  storagePlatos,
  storageComprobantes
};
