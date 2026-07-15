import { config } from '../../config/env.js';

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

export const sendOrderConfirmationEmail = async (toEmail, userName, orderId, total, items) => {

  // Generar HTML para los items
  const itemsHtml = items.map(item => {
    return `<li>${item.quantity}x ${item.item_name} - ${item.dia || ''}</li>`;
  }).join('');

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; overflow: hidden;">
      <div style="background-color: #f8f9fa; text-align: center; border-bottom: 1px solid #eaeaea; margin: -20px -20px 20px -20px; padding: 25px 0;">
        <img src="https://res.cloudinary.com/dwiga4jg8/image/upload/v1784118486/eatandrun_logos/lscs4gxpwgmyifdxfxvg.jpg" alt="Eat & Run" width="200" style="display: block; margin: 0 auto; border: 0;" />
      </div>
      <h2 style="color: #4CAF50; text-align: center;">¡Gracias por tu pedido, ${userName}! 🥗</h2>
      <p style="font-size: 16px; color: #333;">Hemos recibido tu pedido correctamente. Acá tenés el detalle:</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; color: #555;">Pedido #${orderId}</h3>
        <ul style="font-size: 15px; color: #444; padding-left: 20px;">
          ${itemsHtml}
        </ul>
        <hr style="border: 0; border-top: 1px solid #ccc; margin: 15px 0;" />
        <p style="font-size: 18px; font-weight: bold; margin: 0; text-align: right; color: #333;">Total: $${total}</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <p style="font-size: 14px; color: #666; margin-bottom: 15px;">¿Tenés alguna consulta sobre tu pedido o querés hacer un cambio?</p>
        <a href="https://wa.me/5492614601788?text=Hola,%20tengo%20una%20consulta%20sobre%20mi%20pedido%20%23${orderId}" style="background-color: #25D366; color: white; padding: 12px 25px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 15px; display: inline-block;">
          📱 Contactar por WhatsApp
        </a>
      </div>

      <p style="font-size: 14px; color: #888; text-align: center;">¡Que lo disfrutes!</p>
    </div>
  `;

  try {
    const data = await sendBrevoEmail(
      toEmail,
      userName,
      `🥗 Confirmación de Pedido #${orderId} - Eat & Run`,
      htmlContent
    );
    
    console.log('✅ Correo enviado con éxito (MessageID:', data?.messageId, ')');
    return data;
  } catch (error) {
    console.error('❌ Error enviando correo de confirmación:', error);
    return null;
  }
};
