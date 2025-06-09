// src/middlewares/upload.middleware.js
import multer from 'multer';
import { storagePlatos, storageComprobantes } from '../config/cloudinary.js';

// Subida para platos del menú
export const uploadPlato = multer({ storage: storagePlatos });

// Subida para comprobantes de pago
export const uploadComprobante = multer({ storage: storageComprobantes });
