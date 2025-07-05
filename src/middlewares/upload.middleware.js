import multer from 'multer';
import { storagePlatos, storageComprobantes } from '../config/cloudinary.js';
import { storageTartas } from '../utils/cloudinary.js';

export const uploadPlato = multer({ storage: storagePlatos });
export const uploadComprobante = multer({ storage: storageComprobantes });

export const uploadTarta = multer({ storage: storageTartas });
