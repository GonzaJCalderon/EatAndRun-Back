import { getConfig, setConfig } from '../models/config.model.js';

const requiredKeys = [
  'plato',
  'envio',
  'postre',
  'ensalada',
  'proteina',
  'tarta',
  'descuento_por_plato',
  'umbral_descuento'
];

export const getPreciosController = async (req, res) => {
  try {
    const precios = await getConfig('precios');
    if (!precios) {
      return res.status(404).json({ error: 'Configuración de precios no encontrada' });
    }
    res.json(precios);
  } catch (err) {
    console.error('❌ Error al obtener precios:', err);
    res.status(500).json({ error: 'Error al obtener configuración de precios' });
  }
};

export const setPreciosController = async (req, res) => {
  try {
    const nuevosPrecios = req.body;

    // Validación de formato general
    if (typeof nuevosPrecios !== 'object' || Array.isArray(nuevosPrecios) || !nuevosPrecios) {
      return res.status(400).json({ error: 'Formato de precios inválido. Se espera un objeto' });
    }

    // Validación de claves requeridas
    const faltantes = requiredKeys.filter(k => !(k in nuevosPrecios));
    if (faltantes.length > 0) {
      return res.status(400).json({
        error: `Faltan campos obligatorios: ${faltantes.join(', ')}`
      });
    }

    // Validación de tipos y rangos
    const erroresTipo = requiredKeys.filter(
      k => typeof nuevosPrecios[k] !== 'number' || isNaN(nuevosPrecios[k])
    );

    if (erroresTipo.length > 0) {
      return res.status(400).json({
        error: `Los siguientes campos deben ser números válidos: ${erroresTipo.join(', ')}`
      });
    }

    // Validaciones de rango mínimas (opcional pero recomendado)
    if (nuevosPrecios.plato < 1000 || nuevosPrecios.plato > 50000) {
      return res.status(400).json({ error: 'El precio del plato debe estar entre 1000 y 50000' });
    }

    if (nuevosPrecios.envio < 0 || nuevosPrecios.envio > 10000) {
      return res.status(400).json({ error: 'Precio de envío inválido' });
    }

    if (nuevosPrecios.descuento_por_plato < 0) {
      return res.status(400).json({ error: 'Descuento por plato no puede ser negativo' });
    }

    if (nuevosPrecios.umbral_descuento < 1) {
      return res.status(400).json({ error: 'Umbral de descuento debe ser al menos 1' });
    }

    // Guardar en DB
    await setConfig('precios', nuevosPrecios);

    res.json({ ok: true, precios: nuevosPrecios });
  } catch (err) {
    console.error('❌ Error al guardar precios:', err);
    res.status(500).json({ error: 'Error al guardar configuración de precios' });
  }
};
