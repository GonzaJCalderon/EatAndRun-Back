import express from 'express';
import { getWeeklyMenuGrouped } from '../controllers/dailyMenu.controller.js';


const router = express.Router();

router.get('/semana', getWeeklyMenuGrouped); // 🔥 nuevo endpoint

export default router;

