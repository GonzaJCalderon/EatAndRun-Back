const mongoose = require("mongoose");
require("dotenv").config({ path: "./.env" });
const Pedido = require("./src/models/Pedido");
const User = require("./src/models/User");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/eatandrun";

const generarPedidosDePrueba = async () => {
  try {
    await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("Conectado a la base de datos.");

    // Buscar usuarios para asignar los pedidos
    const usuarios = await User.find({ rol: "usuario" }).limit(5);
    if (usuarios.length === 0) {
      console.log("No hay usuarios de prueba.");
      process.exit(1);
    }

    // Calcular el LUNES de la PRÓXIMA SEMANA
    const hoy = new Date();
    const dia = hoy.getDay();
    const proximoLunes = new Date(hoy);
    proximoLunes.setDate(hoy.getDate() - ((dia + 6) % 7) + 7);
    
    // Fechas desde lunes hasta viernes próximo
    const lunes = new Date(proximoLunes);
    const martes = new Date(proximoLunes); martes.setDate(martes.getDate() + 1);
    const miercoles = new Date(proximoLunes); miercoles.setDate(miercoles.getDate() + 2);
    const jueves = new Date(proximoLunes); jueves.setDate(jueves.getDate() + 3);
    const viernes = new Date(proximoLunes); viernes.setDate(viernes.getDate() + 4);

    const fechaFormat = (d) => d.toISOString().split('T')[0];

    // Platos ficticios pero usando IDs reales que agregamos al mapa (63, 24, 0, 1)
    const pedidoDummy1 = {
      diarios: {
        lunes: { "ID:63": 2, "ID:24": 1 },
        martes: { "0": 1 }, // ID 0 si es que existe
        miércoles: { "1": 3 },
        jueves: { "ID:9": 1 },
        viernes: { "ID:62": 2 }
      },
      extras: {
        lunes: { "1": 2 },
        viernes: { "3": 1 }
      },
      tartas: {
        "tarta-de-verdura": 1,
        "tarta-tarta-de-jyq": 2
      },
      fecha_dia_por_dia: {
        lunes: fechaFormat(lunes),
        martes: fechaFormat(martes),
        miércoles: fechaFormat(miercoles),
        jueves: fechaFormat(jueves),
        viernes: fechaFormat(viernes),
      }
    };

    const pedidoDummy2 = {
      diarios: {
        lunes: { "ID:63": 4 },
        miércoles: { "ID:24": 2 },
        viernes: { "1": 1 }
      },
      extras: {
        lunes: { "2": 3 }
      },
      tartas: {
        "tarta-de-pollo": 1
      },
      fecha_dia_por_dia: {
        lunes: fechaFormat(lunes),
        miércoles: fechaFormat(miercoles),
        viernes: fechaFormat(viernes),
      }
    };

    // Eliminar pedidos de prueba anteriores para esa semana para no duplicar demasiado
    await Pedido.deleteMany({
      "pedido.fecha_dia_por_dia.lunes": fechaFormat(lunes)
    });

    const p1 = new Pedido({
      usuario: usuarios[0]._id,
      empresa_nombre: usuarios[0].empresa_nombre || "Empresa A",
      items: [],
      total: 15000,
      metodo_pago: "Efectivo",
      estado_pago: "pagado",
      estado_pedido: "confirmado",
      pedido: pedidoDummy1
    });

    const p2 = new Pedido({
      usuario: usuarios[1] ? usuarios[1]._id : usuarios[0]._id,
      empresa_nombre: usuarios[1] ? usuarios[1].empresa_nombre : "Empresa B",
      items: [],
      total: 20000,
      metodo_pago: "Transferencia",
      estado_pago: "pagado",
      estado_pedido: "confirmado",
      pedido: pedidoDummy2
    });

    await p1.save();
    await p2.save();

    console.log("Pedidos de prueba para la PROXIMA SEMANA insertados exitosamente!");
    process.exit(0);

  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

generarPedidosDePrueba();
