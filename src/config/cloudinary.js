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
const storageComprobantes = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'eat-and-run/comprobantes',
    allowed_formats: ['jpg', 'png', 'jpeg', 'pdf'],
    transformation: [{ width: 1000, crop: 'limit' }]
  }
});

export {
  cloudinary,
  storagePlatos,
  storageComprobantes
};
