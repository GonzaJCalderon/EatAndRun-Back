import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

process.env.TZ = 'America/Argentina/Buenos_Aires'; // homogéneo en test runner

// Importamos después de setear TZ
import dayjs, {
  TZ,
  mondayOf,
  nextMonday,
  getFechaOperativa,
  isoToDateOnly,
  toDateOnly
} from '../src/utils/tiempo.js';

describe('Fechas util - AR/TZ', () => {
  beforeAll(() => {
    expect(TZ).toBe('America/Argentina/Buenos_Aires');
  });

  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('mondayOf("2025-08-12") debe ser 2025-08-11 (lunes)', () => {
    const base = '2025-08-12'; // martes
    const monday = mondayOf(base).format('YYYY-MM-DD');
    expect(monday).toBe('2025-08-11');
  });

  it('nextMonday("2025-08-12") debe ser 2025-08-18', () => {
    const nm = nextMonday('2025-08-12').format('YYYY-MM-DD');
    expect(nm).toBe('2025-08-18');
  });

  it('corte de las 6: antes de las 06:00 baja un día; después no', () => {
    // 2025-08-12 05:59 AR → día operativo debe ser 2025-08-11
    vi.setSystemTime(new Date('2025-08-12T05:59:00-03:00'));
    expect(getFechaOperativa().format('YYYY-MM-DD')).toBe('2025-08-11');

    // 2025-08-12 06:00 AR → día operativo 2025-08-12
    vi.setSystemTime(new Date('2025-08-12T06:00:00-03:00'));
    expect(getFechaOperativa().format('YYYY-MM-DD')).toBe('2025-08-12');
  });

  it('isoToDateOnly no corre el día (lee en UTC)', () => {
    // ISO con Z que a veces te corría un día
    const iso = '2025-08-18T03:00:00Z';
    expect(isoToDateOnly(iso)).toBe('2025-08-18');
  });

  it('toDateOnly lee en TZ local', () => {
    expect(toDateOnly('2025-08-18')).toBe('2025-08-18');
    expect(toDateOnly('2025-08-18T12:30:00')).toBe('2025-08-18');
  });
});
