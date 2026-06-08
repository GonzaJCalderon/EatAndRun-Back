import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM = process.env.EMAIL_FROM || '"Eat & Run" <pedidos@eatandrun.com.ar>';

export const sendResetPasswordEmail = async (to, nombre, link) => {
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️ No se envió correo de recuperación porque no está configurado RESEND_API_KEY');
    return null;
  }

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: '🔒 Recuperación de contraseña — Eat & Run',
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
          <div style="max-width: 600px; margin: auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
            <div style="background-color: #4caf50; padding: 20px; text-align: center;">
              <h1 style="color: #fff; margin: 0;">🔒 Eat & Run</h1>
            </div>
            <div style="padding: 30px; color: #333;">
              <h2>Hola ${nombre},</h2>
              <p>Recibimos una solicitud para recuperar tu contraseña. Hacé clic en el botón de abajo para restablecerla:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${link}" style="background-color: #4caf50; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  Restablecer contraseña
                </a>
              </div>
              <p style="color: #888; font-size: 14px;">⏱️ Este enlace es válido por <strong>1 hora</strong>. Si no fuiste vos, ignorá este correo.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 12px; color: #aaa;">Este correo fue enviado automáticamente por Eat & Run. Por favor no respondas este mensaje.</p>
            </div>
          </div>
        </div>
      `
    });
    console.log(`✅ Correo de recuperación enviado a ${to}`);
  } catch (error) {
    console.error('❌ Error enviando correo de recuperación:', error);
  }
};

export const sendWelcomeEmail = async (to, nombre, passwordAuto) => {
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️ No se envió correo de bienvenida porque no está configurado RESEND_API_KEY');
    return null;
  }

  const passwordSection = passwordAuto 
    ? `<p style="margin-top: 15px; background: #e8f5e9; padding: 10px; border-radius: 5px;">
         Tu contraseña temporal es: <strong>${passwordAuto}</strong><br/>
         Te recomendamos cambiarla una vez que ingreses.
       </p>`
    : '';

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: '👋 Bienvenido a Eat & Run',
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
          <div style="max-width: 600px; margin: auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
            <img src="https://res.cloudinary.com/dwiga4jg8/image/upload/v1751292009/20250630_1042_Banner_Minimalista_Eat_Run_remix_01jz0h24fteaf9td6f72n9kznd_af3wg7.png" alt="Eat & Run" style="width: 100%; display: block;" />
            <div style="padding: 30px; color: #333;">
              <h2 style="color: #4caf50;">Hola ${nombre} 👋</h2>
              <p>Gracias por registrarte en <strong>Eat & Run</strong>. ¡Estamos felices de tenerte con nosotros!</p>
              ${passwordSection}
              <p>Prepárate para disfrutar de nuestros <strong>menús saludables, rápidos y deliciosos</strong>. 🥗</p>
              <p style="margin-top: 20px;">Si tenés dudas o sugerencias, no dudes en escribirnos.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 12px; color: #aaa;">Este correo fue enviado automáticamente por Eat & Run.</p>
            </div>
          </div>
        </div>
      `
    });
    console.log(`✅ Correo de bienvenida enviado a ${to}`);
  } catch (error) {
    console.error('❌ Error enviando correo de bienvenida:', error);
  }
};
