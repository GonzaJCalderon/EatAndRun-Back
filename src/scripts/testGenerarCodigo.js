import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// ⚠️ ESTO ES CLAVE para que funcionen bien los paths en ESModules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 👇 Importa usando rutas absolutas si estás teniendo líos con relativas
import { generarCodigoInvitacion } from '../models/empresa.model.js';
import { pool } from '../db/index.js';

const runTest = async () => {
  try {
    const empresaId = 1; // ⛳️ Cambialo por uno que exista en tu tabla empresas

    const { codigo, expira } = await generarCodigoInvitacion(empresaId);

    console.log('✅ Código generado:', codigo);
    console.log('📅 Expira:', expira.toISOString());

    const result = await pool.query(
      `SELECT id, codigo_invitacion, codigo_expira FROM empresas WHERE id = $1`,
      [empresaId]
    );

    console.log('🧠 Empresa actualizada:', result.rows[0]);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error en test:', err.message || err);
    process.exit(1);
  }
};

runTest();
