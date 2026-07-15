const BREVO_API_KEY = process.env.BREVO_API_KEY;
const EMAIL_FROM_ADDRESS = 'pedidos@eatandrun.com.ar';
const EMAIL_FROM_NAME = 'Eat & Run';

const sendBrevoEmail = async (toEmail, toName, subject, htmlContent) => {
  if (!BREVO_API_KEY) {
    console.warn('⚠️ No se envió correo porque no está configurada la variable BREVO_API_KEY');
    return null;
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': BREVO_API_KEY,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: EMAIL_FROM_NAME, email: EMAIL_FROM_ADDRESS },
      to: [{ email: toEmail, name: toName || toEmail }],
      subject: subject,
      htmlContent: htmlContent
    })
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Brevo API Error: ${response.status} ${errorData}`);
  }

  const data = await response.json();
  return data;
};

export const sendResetPasswordEmail = async (to, nombre, link) => {

  try {
    const data = await sendBrevoEmail(
      to,
      nombre,
      '🔒 Recuperación de contraseña — Eat & Run',
      `
        <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
          <div style="max-width: 600px; margin: auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
            <div style="background-color: #f8f9fa; text-align: center; border-bottom: 1px solid #eaeaea;">
              <img src="https://res.cloudinary.com/dwiga4jg8/image/upload/v1784117570/eatandrun_logos/kfs9oerg8pcgunajyjql.png" alt="Eat & Run" style="width: 200px; display: inline-block; padding: 25px 0;" />
            </div>
            <div style="padding: 30px; color: #333;">
              <h2 style="color: #4caf50;">Hola ${nombre} 🔐</h2>
              <p>Recibimos una solicitud para recuperar tu contraseña en <strong>Eat & Run</strong>. Hacé clic en el botón de abajo para restablecerla:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${link}" style="background-color: #4caf50; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; white-space: nowrap;">
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
    );
    console.log(`✅ Correo de recuperación enviado a ${to} (MessageID: ${data?.messageId})`);
  } catch (error) {
    console.error('❌ Error enviando correo de recuperación:', error);
  }
};

export const sendWelcomeEmail = async (to, nombre, passwordAuto) => {

  const passwordSection = passwordAuto 
    ? `<p style="margin-top: 15px; background: #e8f5e9; padding: 10px; border-radius: 5px;">
         Tu contraseña temporal es: <strong>${passwordAuto}</strong><br/>
         Te recomendamos cambiarla una vez que ingreses.
       </p>`
    : '';

  try {
    const data = await sendBrevoEmail(
      to,
      nombre,
      '👋 Bienvenido a Eat & Run',
      `
        <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
          <div style="max-width: 600px; margin: auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
            <div style="background-color: #f8f9fa; text-align: center; border-bottom: 1px solid #eaeaea;">
              <img src="https://res.cloudinary.com/dwiga4jg8/image/upload/v1784117570/eatandrun_logos/kfs9oerg8pcgunajyjql.png" alt="Eat & Run" style="width: 200px; display: inline-block; padding: 25px 0;" />
            </div>
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
    );
    console.log(`✅ Correo de bienvenida enviado a ${to} (MessageID: ${data?.messageId})`);
  } catch (error) {
    console.error('❌ Error enviando correo de bienvenida:', error);
  }
};
