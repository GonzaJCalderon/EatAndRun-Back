import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.hostinger.com',
  port: process.env.EMAIL_PORT || 465,
  secure: process.env.EMAIL_SECURE === 'true', // true para 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendResetPasswordEmail = async (to, nombre, link) => {
  await transporter.sendMail({
    from: `"Eat & Run" <${process.env.EMAIL_USER}>`,
    to,
    subject: '🔒 Recuperación de contraseña',
    html: `
      <p>Hola ${nombre},</p>
      <p>Hiciste una solicitud para recuperar tu contraseña. Haz clic en el siguiente enlace:</p>
      <a href="${link}">${link}</a>
      <p>Este enlace es válido por 1 hora. Si no fuiste vos, ignorá este correo.</p>
    `
  });
};

export const sendWelcomeEmail = async (to, nombre) => {
  await transporter.sendMail({
    from: `"Eat & Run" <${process.env.EMAIL_USER}>`,
    to,
    subject: '👋 Bienvenido a Eat & Run',
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
        <div style="max-width: 600px; margin: auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
          <img src="https://res.cloudinary.com/dwiga4jg8/image/upload/v1751292009/20250630_1042_Banner_Minimalista_Eat_Run_remix_01jz0h24fteaf9td6f72n9kznd_af3wg7.png" alt="Eat & Run" style="width: 100%; display: block;" />
          <div style="padding: 20px; color: #333;">
            <h2 style="color: #4caf50;">Hola ${nombre} 👋</h2>
            <p>Gracias por registrarte en <strong>Eat & Run</strong>. ¡Estamos felices de tenerte con nosotros!</p>
            <p>Prepárate para disfrutar de nuestros <strong>menús saludables, rápidos y deliciosos</strong>. 🥗</p>
            <p style="margin-top: 20px;">Si tenés dudas o sugerencias, no dudes en escribirnos.</p>
            <p style="margin-top: 40px; font-size: 0.9em; color: #999;">Este correo fue enviado automáticamente por Eat & Run.</p>
          </div>
        </div>
      </div>
    `
  });
};

