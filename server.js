const express = require("express");
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const QRCode = require("qrcode");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

const games = new Map();

const GAME_ORDER = [
  "knowledge",
  "friend",
  "conversa",
  "heads",
  "stop",
  "impostor",
  "cacho",
  "vertical",
  "lastcard",
  "poker"
];

const GAME_LABELS = {
  knowledge: "Trivia de conocimiento",
  friend: "Votazo",
  conversa: "Conversa",
  heads: "Heads Up",
  stop: "STOP",
  impostor: "Impostor",
  cacho: "Cacho",
  vertical: "Integración vertical",
  lastcard: "ÚLTIMA CARTA",
  poker: "Poker"
};

const DEFAULT_SELECTED_GAMES = [];
const VOTAZO_QUESTIONS_PER_GAME = 5;
const MIN_CONNECTED_PLAYERS = 2;
const VERTICAL_STARTING_CASH = 1500;
const VERTICAL_PASS_START_BONUS = 200;
const VERTICAL_JAIL_FINE = 50;

const VERTICAL_COMPANIES = [
  { id: "huevos", name: "Industria de Huevos", colorName: "Marrón", color: "#8b5a2b" },
  { id: "azucar", name: "Industria del Azúcar", colorName: "Celeste", color: "#86d8ff" },
  { id: "chocolate", name: "Industria del Chocolate", colorName: "Rosa", color: "#e78ab7" },
  { id: "cerveza", name: "Industria Cervecera", colorName: "Naranja", color: "#f0a14a" },
  { id: "textil", name: "Industria Textil y de Confección", colorName: "Rojo", color: "#ef6868" },
  { id: "automotriz", name: "Industria Automotriz", colorName: "Amarillo", color: "#f1d85c" },
  { id: "semiconductores", name: "Industria de Semiconductores", colorName: "Verde", color: "#65c989" },
  { id: "aviacion", name: "Industria de Aviación Comercial", colorName: "Azul oscuro", color: "#3856b8" }
];

function verticalProperty(id, name, companyIndex, price, baseRent, improvementCost, activity, equipmentName, equipmentEmoji) {
  const company = VERTICAL_COMPANIES[companyIndex];
  const groupSize = companyIndex === 0 || companyIndex === 7 ? 2 : 3;
  const groupCost = price * groupSize;
  const groupedRent = baseRent * 2;
  const firstIncrement = Math.max(8, Math.round(baseRent * 0.8));
  const secondIncrement = Math.max(20, Math.round(baseRent * 2.4));
  const thirdIncrement = Math.max(12, Math.round(baseRent * 1.2));

  return {
    id,
    type: "property",
    name,
    companyId: company.id,
    companyName: company.name,
    colorName: company.colorName,
    color: company.color,
    activity,
    equipmentName,
    equipment: equipmentEmoji,
    price,
    groupCost,
    improvementCost,
    costs: [price, groupCost, groupCost + improvementCost, groupCost + improvementCost * 2, groupCost + improvementCost * 3],
    rents: [baseRent, groupedRent, groupedRent + firstIncrement, groupedRent + firstIncrement + secondIncrement, groupedRent + firstIncrement + secondIncrement + thirdIncrement],
    mortgageValue: Math.floor(price / 2)
  };
}

const VERTICAL_BOARD = [
  { id: "inicio", type: "start", name: "Inicio de operaciones", icon: "🚩" },
  verticalProperty("granja-avicola", "Granja Avícola", 0, 60, 6, 50, "Crianza de gallinas ponedoras y producción de huevos.", "Gallina", "🐔"),
  { id: "cofre-1", type: "chest", name: "Cofre empresarial", icon: "💼" },
  verticalProperty("empaque-huevos", "Empaque de Huevos", 0, 60, 8, 50, "Clasificación, limpieza, empaque y preparación de huevos para su distribución comercial.", "Empaque", "📦"),
  { id: "impuesto-1", type: "tax", name: "Obligaciones tributarias", amount: 100, icon: "🧾" },
  { id: "aeropuerto-1", type: "transport", transportKind: "Aeropuerto", name: "Aeropuerto El Dorado", price: 200, mortgageValue: 100, icon: "✈️" },
  verticalProperty("canera-agricola", "Cañera Agrícola", 1, 100, 10, 50, "Cultivo y suministro de caña de azúcar.", "Planta", "🌱"),
  { id: "fortuna-1", type: "fortune", name: "Fortuna empresarial", icon: "📈" },
  verticalProperty("ingenio-azucarero", "Ingenio Azucarero", 1, 100, 12, 50, "Molienda de caña y extracción del jugo.", "Molino de caña", "🏭"),
  verticalProperty("centrifugadora-azucar", "Centrifugadora de Azúcar", 1, 120, 14, 50, "Separación de cristales de azúcar de melaza.", "Centrifugador", "🌀"),
  { id: "carcel", type: "jail", name: "Auditoría regulatoria", icon: "🔒" },
  verticalProperty("beneficiadora-cacao", "Beneficiadora de Cacao", 2, 140, 16, 100, "Fermentación y preparación del cacao después de la cosecha.", "Cajón de fermentación", "🧰"),
  { id: "energia", type: "utility", name: "Energía industrial", price: 150, mortgageValue: 75, icon: "⚡" },
  verticalProperty("procesadora-cacao", "Procesadora de Cacao", 2, 140, 18, 100, "Transformar los granos en licor, manteca y sólidos de cacao.", "Prensa de cacao", "🔧"),
  verticalProperty("chocolatera", "Chocolatera", 2, 160, 20, 100, "Formulación, refinado y fabricación de productos de chocolate.", "Máquina chocolatera", "🍫"),
  { id: "puerto-1", type: "transport", transportKind: "Puerto", name: "Puerto de Cartagena", price: 200, mortgageValue: 100, icon: "⚓" },
  verticalProperty("malteria", "Maltería", 3, 180, 22, 100, "Transformar cebada en malta cervecera.", "Maltería", "🌾"),
  { id: "cofre-2", type: "chest", name: "Cofre empresarial", icon: "💼" },
  verticalProperty("cerveceria", "Cervecería", 3, 180, 24, 100, "Elaboración y fermentación de cerveza.", "Fermentador", "🍺"),
  verticalProperty("distribuidora-cervecera", "Distribuidora Cervecera", 3, 200, 26, 100, "Transportar cerveza hasta los puntos de venta.", "Camión", "🚚"),
  { id: "parada", type: "rest", name: "Pausa estratégica", icon: "🛋️" },
  verticalProperty("productora-algodon", "Productora de Algodón", 4, 220, 28, 150, "Cultivo y cosecha del algodón utilizado como materia prima para fabricar textiles.", "Cosechadora de algodón", "🚜"),
  { id: "fortuna-2", type: "fortune", name: "Fortuna empresarial", icon: "📈" },
  verticalProperty("fabrica-textil", "Fábrica Textil", 4, 220, 30, 150, "Transformar el algodón en tela y confeccionar prendas.", "Máquina de coser industrial", "🧵"),
  verticalProperty("tienda-ropa", "Tienda de Ropa", 4, 240, 32, 150, "Comercialización de prendas terminadas al consumidor.", "Tienda", "🏬"),
  { id: "aeropuerto-2", type: "transport", transportKind: "Aeropuerto", name: "Aeropuerto José María Córdova", price: 200, mortgageValue: 100, icon: "✈️" },
  verticalProperty("productora-acero", "Productora de Acero", 5, 260, 34, 150, "Producir el acero utilizado para fabricar carrocerías y otras partes de vehículos.", "Horno industrial", "🔥"),
  verticalProperty("fabrica-automoviles", "Fábrica de Automóviles", 5, 260, 36, 150, "Fabricar y ensamblar automóviles utilizando acero, componentes y otras materias primas.", "Robot industrial", "🤖"),
  { id: "agua", type: "utility", name: "Agua de proceso", price: 150, mortgageValue: 75, icon: "💧" },
  verticalProperty("concesionario-automoviles", "Concesionario de Automóviles", 5, 280, 38, 150, "Comercializar automóviles terminados al consumidor.", "Concesionario", "🚗"),
  { id: "ir-carcel", type: "goToJail", name: "Ir a auditoría", icon: "🚨" },
  verticalProperty("productora-silicio", "Productora de Silicio", 6, 300, 40, 200, "Producir y preparar silicio de alta pureza como materia prima para la fabricación de chips.", "Horno de silicio", "🔥"),
  verticalProperty("fabrica-chips", "Fábrica de Chips", 6, 300, 42, 200, "Fabricar chips y microprocesadores utilizando silicio.", "Máquina de fabricación de chips", "💾"),
  { id: "cofre-3", type: "chest", name: "Cofre empresarial", icon: "💼" },
  verticalProperty("distribuidora-chips", "Distribuidora de Chips", 6, 320, 44, 200, "Vender y distribuir chips a fabricantes de computadoras, teléfonos, automóviles y otros equipos electrónicos.", "Centro de distribución", "🏢"),
  { id: "puerto-2", type: "transport", transportKind: "Puerto", name: "Puerto de Buenaventura", price: 200, mortgageValue: 100, icon: "⚓" },
  { id: "fortuna-3", type: "fortune", name: "Fortuna empresarial", icon: "📈" },
  verticalProperty("fabricante-aviones", "Fabricante de Aviones", 7, 350, 48, 200, "Utilizar aluminio, motores, componentes y otros materiales para fabricar aviones comerciales.", "Línea de ensamblaje de aviones", "🏗️"),
  { id: "impuesto-2", type: "tax", name: "Tasa de sostenibilidad", amount: 100, icon: "🌿" },
  verticalProperty("aerolinea-comercial", "Aerolínea Comercial", 7, 400, 52, 200, "Comprar y operar aviones para vender servicios de transporte aéreo a pasajeros.", "Avión comercial", "✈️")
];

VERTICAL_COMPANIES.forEach((company) => {
  const companySquares = VERTICAL_BOARD.filter((square) => square.companyId === company.id);
  const companyCost = companySquares.reduce((total, square) => total + square.price, 0);

  companySquares.forEach((square) => {
    square.groupCost = companyCost;
    square.costs = [
      square.price,
      companyCost,
      companyCost + square.improvementCost,
      companyCost + square.improvementCost * 2,
      companyCost + square.improvementCost * 3
    ];
  });
});

const VERTICAL_FORTUNE_CARDS = [
  { text: "Tu café triunfa en una feria internacional. Recibe $150.", cash: 150 },
  { text: "La tasa de cambio encarece una importación. Paga $100.", cash: -100 },
  { text: "Firmaste un contrato de suministro. Recibe $120.", cash: 120 },
  { text: "Una interrupción logística obliga a contratar transporte urgente. Paga $75.", cash: -75 },
  { text: "Una alianza comercial te lleva al inicio de operaciones.", moveTo: 0, collectStart: true },
  { text: "Una inspección detecta incumplimientos. Ve a auditoría sin cobrar por el inicio.", goToJail: true },
  { text: "Tu campaña colaborativa funciona. Cobra $25 a cada competidor.", collectFromEach: 25 },
  { text: "Aportas a una rueda de innovación sectorial. Paga $20 a cada competidor.", payEach: 20 }
];

const VERTICAL_CHEST_CARDS = [
  { text: "Obtienes un fondo de innovación. Recibe $100.", cash: 100 },
  { text: "Mantenimiento preventivo de emergencia. Paga $100.", cash: -100 },
  { text: "La autoridad tributaria aprueba una devolución. Recibe $60.", cash: 60 },
  { text: "Capacitación obligatoria para tu equipo. Paga $50.", cash: -50 },
  { text: "Una auditoría de calidad reconoce tu operación. Recibe $80.", cash: 80 },
  { text: "Renuevas licencias y certificaciones. Paga $60.", cash: -60 },
  { text: "Un cliente paga una factura vencida. Recibe $75.", cash: 75 },
  { text: "Contribuyes al programa cafetero local. Paga $40.", cash: -40 }
];
const LACK_PLAYERS_GRACE_MS = Math.max(
  0,
  Number(process.env.LACK_PLAYERS_GRACE_MS) || 30000
);

const DEFAULT_STOP_LETTERS = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J",
  "L", "M", "N", "O", "P", "R", "S", "T", "U", "V"
];

const DEFAULT_STOP_LISTS = [
  {
    name: "Lista 1",
    categories: [
      "Animales",
      "Apodos o sobrenombres",
      "Ciudades",
      "Vegetales",
      "Verbos",
      "Personajes de películas",
      "Medios de transporte",
      "Sabores de helado",
      "Profesiones",
      "Empresas conocidas"
    ]
  },
  {
    name: "Lista 2",
    categories: [
      "Partes del cuerpo",
      "Asignaturas de estudio",
      "Herramientas",
      "Países",
      "Objetos en este cuarto",
      "Electrodomésticos",
      "Bebidas",
      "Ingredientes de cocina",
      "Colores",
      "Cosas calientes"
    ]
  }
];

const CONVERSA_MODES = [
  { id: "random", name: "Excavadora de datos random" },
  { id: "amigos", name: "Amigos" },
  { id: "filosofico", name: "Filosófico" },
  { id: "citas", name: "Citas" }
];

const CONVERSA_ARCHETYPES = [
  {
    id: "ingeniero",
    name: "Ingeniero",
    emoji: "🧠",
    description: "Respuesta lógica, pragmática, objetiva o analí­tica."
  },
  {
    id: "payaso",
    name: "Payaso",
    emoji: "🤡",
    description: "Agrega chistes y bromas a sus respuestas."
  },
  {
    id: "artista",
    name: "Artista",
    emoji: "🎨",
    description: "Respuestas abstractas, filosóficas, con sentidos figurados y profundos."
  },
  {
    id: "narrativo",
    name: "Narrativo",
    emoji: "📖",
    description: "Responde usando anécdotas o historias."
  },
  {
    id: "emocional",
    name: "Emocional",
    emoji: "❤️",
    description: "Expresa sentimientos o incluye mucho drama o exageración."
  },
  {
    id: "tangencial",
    name: "Tangencial",
    emoji: "🌀",
    description: "Salta de una idea a otra, cambia bruscamente de tema o responde fuera de contexto."
  },
  {
    id: "cortante",
    name: "Cortante",
    emoji: "✂️",
    description: "Respuestas muy breves."
  }
];

const DEFAULT_CONVERSA_QUESTIONS = {
  random: [
    "¿Qué gusto pequeño te alegra más de lo que debería?",
    "¿Qué hobby te gustaría probar aunque todavía no sepas nada?",
    "¿Qué plan sencillo te parece casi perfecto?",
    "¿Qué comida podrías repetir muchas veces sin cansarte?",
    "¿Qué lugar cotidiano te da tranquilidad?",
    "¿Qué objeto personal dice mucho de ti?",
    "¿Qué canción te cambia el ánimo rápido?",
    "¿Qué tema podrías conversar durante horas?",
    "¿Qué costumbre tuya te parece muy tuya?",
    "¿Qué cosa te da curiosidad últimamente?",
    "Si tuvieras que usar el mismo color de ropa durante un año entero, ¿cuál escogerías?",
    "¿Qué objeto llevas contigo casi siempre aunque realmente no sea necesario?",
    "Si pudieras eliminar para siempre un sonido del mundo, ¿cuál sería?",
    "¿Qué animal crees que tiene una personalidad sospechosamente parecida a la tuya?",
    "Si alguien revisara tu historial de YouTube, ¿qué sería lo más raro que encontraría?",
    "¿Qué cosa barata te produce una cantidad desproporcionada de felicidad?",
    "¿Qué pequeña cosa puede dañarte el ánimo absurdamente rápido?",
    "Si tuvieras que cambiarte el nombre por uno completamente diferente, ¿cuál usarías?",
    "¿Qué prenda tienes que probablemente ya deberías haber botado?",
    "Si te dieran 500 dólares pero tuvieras que gastarlos hoy en algo innecesario, ¿qué comprarías?",
    "¿Qué comida comes de una manera que otras personas considerarían incorrecta?",
    "Si tu personalidad fuera una bebida, ¿cuál sería?",
    "¿Qué tipo de persona te cae bien casi automáticamente?",
    "¿Qué tipo de persona te irrita en menos de cinco minutos?",
    "Si tuvieras que vivir dentro de una tienda durante un mes, ¿qué tienda escogerías?",
    "¿Qué cosa haces cuando estás solo que probablemente nunca harías frente a otras personas?",
    "¿Qué compra pequeña haces con demasiada frecuencia?",
    "Si fueras profesor, ¿qué materia sería peligrosísimo dejarte enseñar?",
    "Si pudieras saber exactamente cuántas veces has hecho una cosa en tu vida, ¿qué estadística pedirías?",
    "Si tuvieras que tatuarte mañana algo elegido en cinco minutos, ¿qué sería?",
    "¿Cuál es tu peor hábito que no tienes ninguna intención real de abandonar?",
    "Si alguien te observa entrando a una fiesta donde no conoces a nadie, ¿qué te vería hacer durante los primeros diez minutos?",
    "Cuando llegas a un supermercado sin una lista y tienes 15 minutos para comprar algo para comer esa noche, ¿qué termina normalmente en tu carrito y cómo decides qué llevar?",
    "Cuando tienes que escoger dónde sentarte en un salón en el que no conoces a nadie, ¿qué puesto eliges exactamente y qué buscas evitar o conseguir con esa ubicación?",
    "Si llegas solo a una fiesta donde únicamente conoces al anfitrión y este desaparece durante media hora, ¿qué haces durante esos treinta minutos y con quién intentarías hablar primero?",
    "Cuando estás en un restaurante con otras cinco personas y todos tardan una eternidad escogiendo qué pedir, y tú ya lo sabes, ¿qué haces?",
    "Cuando vas caminando solo por la calle con audífonos durante unos veinte minutos, ¿qué sueles escuchar exactamente y qué efecto buscas que tenga sobre ti?",
    "Si estás de vacaciones en una ciudad desconocida y tienes una tarde completamente libre sin ningún plan, ¿a dónde irías primero y cómo decidirías qué hacer después?",
    "Si alguien te entrega el control de la música durante un viaje en carro con cuatro personas que apenas conoces, ¿qué pondrías primero y qué canciones evitarías deliberadamente?",
    "Cuando visitas por primera vez la casa de alguien, ¿qué detalle del lugar sueles notar antes que los demás y qué hace que te fijes precisamente en eso?",
    "Si mañana debes levantarte a las 5:00 a. m. pero son las 12:30 a. m. y estás viendo algo muy bueno, ¿en qué momento decides apagarlo y qué argumento te das para hacerlo o no hacerlo?",
    "Cuando recibes dinero inesperado que no necesitabas para ningún gasto, ¿qué es lo primero que imaginas hacer con él y cuánto tiempo suele pasar antes de gastarlo?",
    "Si estás esperando solo durante una hora en un aeropuerto y tu celular tiene 8 % de batería, ¿en qué gastarías esa batería y qué harías durante el resto del tiempo?",
    "Si un amigo te llama un sábado a las 10 p. m. diciendo que hay un plan inesperado y tienes veinte minutos para decidir, ¿qué información necesitas saber antes de decir sí o no?",
    "Si alguien entra inesperadamente a tu habitación en un día completamente normal, ¿qué objeto o desorden sería el que menos te gustaría que viera y por qué?",
    "Si tienes que organizar una salida para ocho amigos con personalidades muy diferentes, ¿qué tipo de plan propondrías, dónde sería y qué parte organizarías con mayor cuidado?",
    "Cuando tienes un día completamente libre y nadie sabe qué estás haciendo, ¿a qué hora te levantarías naturalmente y cuál sería probablemente la primera hora de tu día?",
    "Si tienes que comprarle un regalo de cumpleaños a alguien que conoces desde hace apenas un mes, ¿qué información sobre esa persona utilizarías para decidir qué regalarle?",
    "Cuando tienes que trabajar durante tres horas seguidas en algo aburrido, ¿dónde te instalas, qué tienes alrededor y qué haces para no abandonar la tarea?",
    "Si llegas diez minutos antes que todos a una cita o reunión, ¿qué haces exactamente durante esos diez minutos y dónde prefieres esperar?",
    "Si un amigo te presta su apartamento durante un fin de semana y te dice 'siéntete como en tu casa', ¿qué cosas sí harías libremente y qué cosas seguirían pareciéndote demasiado invasivas?",
    "Cuando estás escogiendo una película con otra persona y sus gustos son completamente distintos a los tuyos, ¿cómo negocias qué ver y en qué punto aceptarías algo que no te interesa?",
    "Si durante una reunión de amigos alguien propone jugar algo y te toca escoger el juego, ¿qué tipo elegirías y qué clase de juego evitarías porque sabes que el grupo terminaría odiándolo?",
    "Si tus amigos te dan la responsabilidad de reservar el alojamiento para un viaje de cinco días, ¿qué tres características revisarías primero antes de reservar y cuál estarías dispuesto a sacrificar?",
    "Si durante una mudanza te dicen que debes reducir todas tus pertenencias personales hasta que quepan en cinco cajas, ¿qué tipo de cosas llenarían cada caja y cuáles te costaría más dejar atrás?"
  ],
  amigos: [
    "Cuenta una anécdota breve de un plan que salió distinto a lo esperado.",
    "¿Qué opinión impopular tienes sobre comida?",
    "¿Qué regla pondrías para una convivencia perfecta entre amigos?",
    "¿Qué situación imaginaria sería más divertida vivir por un día?",
    "¿Qué plan cotidiano mejora cuando lo haces en grupo?",
    "¿Qué pequeña pelea de amigos casi siempre vale la pena evitar?",
    "¿Qué compra innecesaria defenderías sin vergüenza?",
    "¿Qué costumbre social te parece rara pero aceptable?",
    "¿Qué personaje del grupo sobreviviría mejor a un viaje sin planear?",
    "¿Qué tema superficial puede convertirse en debate intenso?",
    "¿Qué excusa para cancelar un plan te parece más perdonable?",
    "¿Qué tradición inventarías para este grupo?"
  ],
  filosofico: [
    "¿Qué pesa más al tomar una decisión difícil: intención o consecuencia?",
    "¿Qué significa para ti vivir con propósito en lo cotidiano?",
    "¿Cuándo una mentira puede ser moralmente defendible?",
    "¿Qué te parece más justo: igualdad de oportunidades o igualdad de resultados?",
    "¿Qué parte de tu identidad cambiaría menos con el tiempo?",
    "¿Qué responsabilidad tenemos con personas que nunca conoceremos?",
    "¿La libertad vale igual si casi nadie puede usarla bien?",
    "¿Qué hace que una vida sea admirable?",
    "¿Qué deuda moral tienes con tu versión futura?",
    "¿Qué debería ser más importante: paz personal o verdad?",
    "¿Cuándo perdonar deja de ser virtud?",
    "¿Qué práctica diaria te parece más filosófica de lo que parece?"
  ],
  citas: {
    level1: [
      "Dada la oportunidad de invitar a cenar a cualquier persona del mundo, ¿a quién elegirías?",
      "¿Te gustaría ser famoso? ¿De qué manera?",
      "Antes de hacer una llamada telefónica, ¿ensayas alguna vez lo que vas a decir? ¿Por qué?",
      "¿Cómo sería un día perfecto para ti?",
      "¿Cuándo fue la última vez que cantaste para ti mismo? ¿Y para otra persona?",
      "Si pudieras vivir hasta los 90 años y conservar durante los últimos 60 años de tu vida el cuerpo o la mente de una persona de 30 años, ¿cuál elegirías?",
      "¿Tienes una intuición secreta sobre cómo morirás?",
      "Menciona tres cosas que tú y la otra persona parecen tener en común.",
      "¿Por qué aspecto de tu vida te sientes más agradecido?",
      "Si pudieras cambiar algo de la forma en que te criaron, ¿qué cambiarías?",
      "Durante cuatro minutos, cuéntale a la otra persona la historia de tu vida con el mayor detalle posible.",
      "Si mañana pudieras despertar habiendo adquirido una sola cualidad o habilidad nueva, ¿cuál sería?"
    ],
    level2: [
      "Si una bola de cristal pudiera decirte la verdad sobre ti mismo, tu vida, el futuro o cualquier otra cosa, ¿qué te gustaría saber?",
      "¿Hay algo que hayas soñado hacer durante mucho tiempo? ¿Por qué aún no lo has hecho?",
      "¿Cuál consideras que es el mayor logro de tu vida?",
      "¿Qué es lo que más valoras en una amistad?",
      "¿Cuál es el recuerdo más valioso que conservas?",
      "¿Cuál es el peor recuerdo de tu vida?",
      "Si supieras que dentro de un año morirás de forma repentina, ¿cambiarías algo de la manera en que estás viviendo? ¿Por qué?",
      "¿Qué significa la amistad para ti?",
      "¿Qué papel tienen el amor y el afecto en tu vida?",
      "Túrnense para decir una característica positiva que vean en la otra persona. Compartan cinco en total.",
      "¿Qué tan unida y afectuosa es tu familia? ¿Sientes que tu infancia fue más feliz que la de la mayoría de las personas?",
      "¿Cómo te sientes respecto a la relación que tienes con tu madre?"
    ],
    level3: [
      "Cada uno formule tres afirmaciones verdaderas que comiencen con 'nosotros'. Por ejemplo: 'Ambos estamos en esta habitación sintiendo...'.",
      "Completa esta frase: 'Ojalá tuviera a alguien con quien pudiera compartir...'.",
      "Si fueras a convertirte en un amigo muy cercano de la otra persona, ¿qué consideras importante que ella supiera sobre ti?",
      "Dile a la otra persona qué es lo que te gusta de ella. Esta vez sé completamente honesto y menciona cosas que normalmente no le dirías a alguien que acabas de conocer.",
      "Comparte con la otra persona un momento vergonzoso de tu vida.",
      "¿Cuándo fue la última vez que lloraste frente a otra persona? ¿Y cuándo lloraste estando completamente solo?",
      "Dile a la otra persona algo que ya te guste de ella.",
      "¿Sobre qué tema, si es que existe alguno, consideras que no se debería hacer bromas?",
      "Si fueras a morir esta noche sin tener la oportunidad de comunicarte con nadie, ¿qué lamentarías más no haberle dicho a alguien? ¿Por qué aún no se lo has dicho?",
      "Tu casa, con todas tus pertenencias, se incendia. Después de poner a salvo a tus seres queridos y a tus mascotas, todavía tienes tiempo para entrar una última vez y rescatar un solo objeto. ¿Cuál salvarías y por qué?",
      "De todas las personas de tu familia, ¿la muerte de cuál te resultaría más difícil de afrontar? ¿Por qué?",
      "Comparte un problema personal y pídele a la otra persona que te aconseje cómo lo manejaría. Después, pídele que te diga cómo cree que te sientes respecto a ese problema."
    ]
  }
};

const DEFAULT_POKER_SETTINGS = {
  initialChips: 5000,
  smallBlind: 50,
  bigBlind: 100,
  totalRounds: 3,
  minInitialChips: 100,
  maxInitialChips: 1000000,
  minRounds: 1,
  maxRounds: 10,
  minSmallBlind: 10,
  maxSmallBlind: 1000,
  minBigBlind: 10,
  maxBigBlind: 2000,
  actionTimeoutMs: 30000
};

const THEMES = [
  { id: "deportes", name: "Deportes" },
  { id: "historia", name: "Historia" },
  { id: "cine", name: "Cine" },
  { id: "ciencia", name: "Ciencia" }
];

const triviaQuestions = {
  deportes: [
    {
      question: "¿Cuántos jugadores tiene un equipo de fútbol en la cancha?",
      options: ["9", "10", "11", "12"],
      correctIndex: 2
    },
    {
      question: "¿En qué deporte se usa una raqueta?",
      options: ["Tenis", "Boxeo", "Natación", "Ciclismo"],
      correctIndex: 0
    },
    {
      question: "¿Cada cuántos años se celebran normalmente los Juegos Olímpicos?",
      options: ["2 años", "3 años", "4 años", "5 años"],
      correctIndex: 2
    }
  ],
  historia: [
    {
      question: "¿En qué año llegó Cristóbal Colón a América?",
      options: ["1492", "1520", "1810", "1914"],
      correctIndex: 0
    },
    {
      question: "¿Cuál civilización construyó las pirámides de Giza?",
      options: ["Romana", "Egipcia", "Griega", "Maya"],
      correctIndex: 1
    },
    {
      question: "¿Cuál guerra terminó en 1945?",
      options: [
        "Primera Guerra Mundial",
        "Guerra Fría",
        "Segunda Guerra Mundial",
        "Guerra de Vietnam"
      ],
      correctIndex: 2
    }
  ],
  cine: [
    {
      question: "¿Qué objeto usa Harry Potter para volar en el quidditch?",
      options: ["Una alfombra", "Una escoba", "Un dragón", "Un cohete"],
      correctIndex: 1
    },
    {
      question: "¿Cuál película tiene un barco llamado Titanic?",
      options: ["Avatar", "Titanic", "Gladiador", "Jumanji"],
      correctIndex: 1
    },
    {
      question: "¿Qué estudio creó Toy Story?",
      options: ["Pixar", "Marvel", "DreamWorks", "Universal"],
      correctIndex: 0
    }
  ],
  ciencia: [
    {
      question: "¿Cuál es el planeta más cercano al Sol?",
      options: ["Venus", "Marte", "Mercurio", "Júpiter"],
      correctIndex: 2
    },
    {
      question: "¿Qué gas respiramos principalmente para vivir?",
      options: ["Oxígeno", "Helio", "Dióxido de carbono", "Hidrógeno"],
      correctIndex: 0
    },
    {
      question: "¿Cuál órgano bombea la sangre?",
      options: ["Pulmón", "Cerebro", "Hígado", "Corazón"],
      correctIndex: 3
    }
  ]
};

const votazoQuestions = [
  {
    question: "¿Qué llevarías a una isla desierta?",
    options: ["Bote", "Celular", "Linterna", "Machete"]
  },
  {
    question: "Si el grupo encuentra una puerta misteriosa, ¿qué harían primero?",
    options: ["Abrirla", "Buscar pistas", "Grabar un video", "Salir corriendo"]
  },
  {
    question: "¿Qué elegirías para sobrevivir una noche sin electricidad?",
    options: ["Comida enlatada", "Linterna", "Radio", "Velas"]
  },
  {
    question: "Si solo pudieran elegir una recompensa para el grupo, ¿cuál sería?",
    options: ["Cena gratis", "Dinero", "Día libre", "Viaje sorpresa"]
  },
  {
    question: "¿Qué harías si el grupo se pierde en una ciudad desconocida?",
    options: ["Buscar Wi-Fi", "Llamar a alguien", "Pedir ayuda", "Seguir caminando"]
  }
];

const headsUpWords = [
  { category: "Animales", word: "Tigre" },
  { category: "Animales", word: "Pingüino" },
  { category: "Animales", word: "Cocodrilo" },
  { category: "Objetos", word: "Celular" },
  { category: "Objetos", word: "Sombrilla" },
  { category: "Objetos", word: "Guitarra" },
  { category: "Personajes", word: "Spider-Man" },
  { category: "Personajes", word: "Harry Potter" },
  { category: "Personajes", word: "Shrek" },
  { category: "Lugares", word: "Playa" },
  { category: "Lugares", word: "Hospital" },
  { category: "Lugares", word: "Aeropuerto" },
  { category: "Acciones", word: "Bailar" },
  { category: "Acciones", word: "Dormir" },
  { category: "Acciones", word: "Cocinar" }
];

const DEFAULT_CAMPAIGN_SLUG = "demo";
const campaignsCache = new Map();

function cleanSlug(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "");
}

function getCampaignPath(slug) {
  return path.join(__dirname, "data", "campaigns", `${slug}.json`);
}

function loadCampaign(slug = DEFAULT_CAMPAIGN_SLUG) {
  const cleanCampaignSlug = cleanSlug(slug) || DEFAULT_CAMPAIGN_SLUG;

  if (campaignsCache.has(cleanCampaignSlug)) {
    return campaignsCache.get(cleanCampaignSlug);
  }

  const campaignPath = getCampaignPath(cleanCampaignSlug);

  if (!fs.existsSync(campaignPath)) {
    if (cleanCampaignSlug !== DEFAULT_CAMPAIGN_SLUG) {
      return loadCampaign(DEFAULT_CAMPAIGN_SLUG);
    }

    throw new Error(`No existe la campaña: ${cleanCampaignSlug}`);
  }

  const rawCampaign = fs.readFileSync(campaignPath, "utf8");
  const campaign = JSON.parse(rawCampaign);

  campaignsCache.set(cleanCampaignSlug, campaign);

  return campaign;
}

function getPublicCampaign(campaign) {
  return {
    slug: campaign.slug,
    name: campaign.name,
    brandName: campaign.brandName,
    welcomeText: campaign.welcomeText,
    visual: campaign.visual,
    games: campaign.games,
    knowledgeTrivia: {
      themes: campaign.knowledgeTrivia?.themes || []
    }
  };
}

function getCampaignThemes(game) {
  return game.campaign?.knowledgeTrivia?.themes || THEMES;
}

function getCampaignKnowledgeQuestions(game, themeId) {
  const campaignQuestions = game.campaign?.knowledgeTrivia?.questions;

  if (Array.isArray(campaignQuestions)) {
    return campaignQuestions.filter((question) => question.theme === themeId);
  }

  const fallbackQuestions = triviaQuestions[themeId] || [];

  return fallbackQuestions.map((question) => ({
    ...question,
    theme: themeId
  }));
}

function getCampaignFriendQuestions(game) {
  const questions = game.campaign?.votazo?.questions || game.campaign?.friendTrivia?.questions;

  if (Array.isArray(questions) && questions.length) {
    return questions
      .map(normalizeVotazoQuestion)
      .filter(Boolean);
  }

  return votazoQuestions;
}

function getCampaignVotazoDuration(game) {
  const durationMs = Number(game.campaign?.votazo?.durationMs);

  return Number.isFinite(durationMs) && durationMs > 0 ? durationMs : 90000;
}

function normalizeVotazoQuestion(rawQuestion) {
  if (!rawQuestion) return null;

  if (typeof rawQuestion === "string") {
    return {
      question: rawQuestion,
      options: ["Aventura", "Comodidad", "Plan seguro", "Sorpresa"]
    };
  }

  const question = String(rawQuestion.question || rawQuestion.text || "").trim();
  const options = Array.isArray(rawQuestion.options)
    ? rawQuestion.options
        .map((option) => String(option || "").trim())
        .filter(Boolean)
    : [];

  if (!question || options.length < 2) return null;

  return {
    question,
    options
  };
}

function normalizeConversaQuestion(rawQuestion) {
  const text = typeof rawQuestion === "string"
    ? rawQuestion
    : rawQuestion?.question || rawQuestion?.text;
  const question = String(text || "").trim();

  return question ? { question } : null;
}

function normalizeConversaList(rawList) {
  return Array.isArray(rawList)
    ? rawList.map(normalizeConversaQuestion).filter(Boolean)
    : [];
}

function getCampaignConversaSettings(game) {
  const rawSettings = game.campaign?.conversa || {};
  const rawModes = rawSettings.modes || {};
  const fallbackQuestions = DEFAULT_CONVERSA_QUESTIONS;
  const questionsPerGame = Math.max(
    1,
    Math.min(30, Number(rawSettings.questionsPerGame) || 12)
  );

  const citas = rawModes.citas || rawSettings.citas || {};

  return {
    questionsPerGame,
    modes: CONVERSA_MODES,
    questions: {
      random: normalizeConversaList(rawModes.random || rawSettings.random),
      amigos: normalizeConversaList(rawModes.amigos || rawSettings.amigos),
      filosofico: normalizeConversaList(rawModes.filosofico || rawSettings.filosofico),
      citas: {
        level1: normalizeConversaList(citas.level1 || citas.nivel1),
        level2: normalizeConversaList(citas.level2 || citas.nivel2),
        level3: normalizeConversaList(citas.level3 || citas.nivel3)
      }
    },
    fallbackQuestions
  };
}

function getConversaMode(modeId) {
  return CONVERSA_MODES.find((mode) => mode.id === modeId) || CONVERSA_MODES[0];
}

function sampleConversaQuestions(sourceQuestions, fallbackQuestions, count) {
  const pool = sourceQuestions.length ? sourceQuestions : fallbackQuestions;
  const result = [];

  if (!pool.length || count <= 0) return result;

  while (result.length < count) {
    const remaining = count - result.length;
    result.push(...shuffleArray(pool).slice(0, remaining));
  }

  return result;
}

function getConversaModeQuestions(settings, modeId, playerCount = 2) {
  if (modeId === "citas") {
    const citas = settings.questions.citas || {};
    const fallback = settings.fallbackQuestions.citas;
    const level1Fallback = fallback.level1.map(normalizeConversaQuestion).filter(Boolean);
    const level2Fallback = fallback.level2.map(normalizeConversaQuestion).filter(Boolean);
    const level3Fallback = fallback.level3.map(normalizeConversaQuestion).filter(Boolean);

    return [
      ...sampleConversaQuestions(citas.level1, level1Fallback, 8)
        .map((question) => ({ ...question, level: "Nivel 1" })),
      ...sampleConversaQuestions(citas.level2, level2Fallback, 8)
        .map((question) => ({ ...question, level: "Nivel 2" })),
      ...sampleConversaQuestions(citas.level3, level3Fallback, 8)
        .map((question) => ({ ...question, level: "Nivel 3" }))
    ];
  }

  const campaignQuestions = settings.questions[modeId] || [];
  const fallbackQuestions = (settings.fallbackQuestions[modeId] || [])
    .map(normalizeConversaQuestion)
    .filter(Boolean);
  const questionCount = Math.max(1, Number(playerCount) || 2) * 3;

  return sampleConversaQuestions(campaignQuestions, fallbackQuestions, questionCount);
}

function getCampaignHeadsUpWords(game) {
  const words = game.campaign?.headsUp?.words;

  if (Array.isArray(words) && words.length) {
    return words;
  }

  return headsUpWords;
}

function getCampaignHeadsUpDuration(game) {
  return game.campaign?.headsUp?.durationMs || 90000;
}

function getCampaignStopSettings(game) {
  const rawStop = game.campaign?.stop || {};
  const lists = Array.isArray(rawStop.lists)
    ? rawStop.lists
        .map((list, index) => {
          const categories = Array.isArray(list)
            ? list
            : Array.isArray(list?.categories)
              ? list.categories
              : [];

          return {
            name: String(list?.name || `Lista ${index + 1}`).trim(),
            categories: categories
              .map((category) => String(category || "").trim())
              .filter(Boolean)
          };
        })
        .filter((list) => list.categories.length)
    : [];
  const letters = Array.isArray(rawStop.letters)
    ? rawStop.letters
        .map((letter) => String(letter || "").trim().toUpperCase())
        .filter((letter) => /^[A-Z]$/.test(letter))
    : [];

  return {
    lists: lists.length ? lists : DEFAULT_STOP_LISTS,
    letters: letters.length ? [...new Set(letters)] : DEFAULT_STOP_LETTERS,
    letterRevealMs: getPositiveDuration(rawStop.letterRevealMs, 5000),
    answerDurationMs: getPositiveDuration(rawStop.answerDurationMs, 20000),
    voteDurationMs: getPositiveDuration(rawStop.voteDurationMs, 25000)
  };
}

function getPositiveDuration(value, fallback) {
  const duration = Number(value);

  return Number.isFinite(duration) && duration > 0 ? duration : fallback;
}

function getCampaignImpostorSettings(game) {
  const rawSettings = game.campaign?.impostor || {};
  const rawGroupWinPoints = Number(rawSettings.groupWinPoints);
  const rawImpostorWinPoints = Number(rawSettings.impostorWinPoints);
  const words = Array.isArray(rawSettings.words)
    ? rawSettings.words
        .map((word) => String(word || "").trim())
        .filter(Boolean)
    : [];

  return {
    words: words.length ? [...new Set(words)] : [
      "Aeropuerto",
      "Biblioteca",
      "Cine",
      "Escuela",
      "Fiesta",
      "Hospital",
      "Montaña",
      "Museo",
      "Parque",
      "Playa",
      "Restaurante",
      "Supermercado"
    ],
    groupWinPoints: Number.isFinite(rawGroupWinPoints)
      ? Math.max(0, rawGroupWinPoints)
      : 100,
    impostorWinPoints: Number.isFinite(rawImpostorWinPoints)
      ? Math.max(0, rawImpostorWinPoints)
      : 300
  };
}

function getCampaignCachoSettings(game) {
  const rawSettings = game.campaign?.cacho || {};
  const rawWinnerPoints = Number(rawSettings.winnerPoints);

  return {
    initialDice: Math.max(1, Math.min(8, Number(rawSettings.initialDice) || 5)),
    actionTimeoutMs: getPositiveDuration(rawSettings.actionTimeoutMs, 45000),
    winnerPoints: Number.isFinite(rawWinnerPoints)
      ? Math.max(0, rawWinnerPoints)
      : 300
  };
}

function getCampaignLastCardSettings(game) {
  const rawSettings = game.campaign?.lastCard || {};

  return {
    initialHandSize: Math.max(3, Math.min(12, Number(rawSettings.initialHandSize) || 7)),
    actionTimeoutMs: getPositiveDuration(rawSettings.actionTimeoutMs, 30000),
    winnerBasePoints: Math.max(0, Number(rawSettings.winnerBasePoints) || 100)
  };
}

function getCampaignPokerSettings(game) {
  const campaignPoker = game.campaign?.poker || {};

  return {
    ...DEFAULT_POKER_SETTINGS,
    ...campaignPoker
  };
}

function sanitizePokerSettings(rawSettings, game) {
  const defaults = getCampaignPokerSettings(game);

  const initialChips = Number(rawSettings?.initialChips ?? defaults.initialChips);
  const smallBlind = Number(rawSettings?.smallBlind ?? defaults.smallBlind);
  const bigBlind = Number(rawSettings?.bigBlind ?? defaults.bigBlind);
  const totalRounds = Number(rawSettings?.totalRounds ?? defaults.totalRounds);

  const safeNumber = (value, fallback) => Number.isFinite(value) ? value : fallback;

  const safeSmallBlind = Math.max(
    defaults.minSmallBlind,
    Math.min(defaults.maxSmallBlind, safeNumber(smallBlind, defaults.smallBlind))
  );

  const safeBigBlind = Math.max(
    safeSmallBlind,
    defaults.minBigBlind,
    Math.min(defaults.maxBigBlind, safeNumber(bigBlind, defaults.bigBlind))
  );

  const safeInitialChips = Math.max(
    safeBigBlind,
    defaults.minInitialChips,
    Math.min(
      defaults.maxInitialChips,
      safeNumber(initialChips, defaults.initialChips)
    )
  );

  const safeTotalRounds = Math.max(
    defaults.minRounds,
    Math.min(defaults.maxRounds, safeNumber(totalRounds, defaults.totalRounds))
  );

  return {
    initialChips: safeInitialChips,
    smallBlind: safeSmallBlind,
    bigBlind: safeBigBlind,
    totalRounds: safeTotalRounds,
    minInitialChips: defaults.minInitialChips,
    maxInitialChips: defaults.maxInitialChips,
    minRounds: defaults.minRounds,
    maxRounds: defaults.maxRounds,
    minSmallBlind: defaults.minSmallBlind,
    maxSmallBlind: defaults.maxSmallBlind,
    minBigBlind: defaults.minBigBlind,
    maxBigBlind: defaults.maxBigBlind,
    actionTimeoutMs: defaults.actionTimeoutMs
  };
}

function getThemeNameFromCampaign(game, themeId) {
  const themes = getCampaignThemes(game);
  const theme = themes.find((item) => item.id === themeId);

  return theme ? theme.name : themeId;
}

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.redirect("/juegos");
});

app.get("/juegos", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/jugar/:campaignSlug", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/juegos/:campaignSlug", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/api/campaign/:campaignSlug", (req, res) => {
  try {
    const campaignSlug = cleanSlug(req.params.campaignSlug);
    const campaign = loadCampaign(campaignSlug);

    res.json({
      ok: true,
      campaign: getPublicCampaign(campaign)
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "No se pudo cargar la campaña."
    });
  }
});

app.get("/qr", async (req, res) => {
  const gameUrl = `${req.protocol}://${req.get("host")}/juegos`;

  try {
    const qrDataUrl = await QRCode.toDataURL(gameUrl, {
      margin: 1,
      width: 240
    });

    res.json({
      url: gameUrl,
      qr: qrDataUrl
    });
  } catch (error) {
    res.status(500).json({
      error: "No se pudo generar el QR"
    });
  }
});

app.get("/qr/:pin", async (req, res) => {
  try {
    const pin = cleanPin(req.params.pin);

    if (!pin || pin.length !== 6) {
      return res.status(400).json({
        ok: false,
        message: "PIN inválido."
      });
    }

    const game = games.get(pin);

    if (!game) {
      return res.status(404).json({
        ok: false,
        message: "No se encontró la partida."
      });
    }

    const campaignSlug = game.campaignSlug || DEFAULT_CAMPAIGN_SLUG;

    const baseUrl =
      process.env.PUBLIC_URL ||
      `${req.protocol}://${req.get("host")}`;

    const url = `${baseUrl}/juegos/${campaignSlug}?pin=${pin}`;
    const qr = await QRCode.toDataURL(url);

    res.json({
      ok: true,
      url,
      qr
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "No se pudo generar el QR de la partida."
    });
  }
});

function generatePin() {
  let pin;

  do {
    pin = Math.floor(100000 + Math.random() * 900000).toString();
  } while (games.has(pin));

  return pin;
}

function cleanName(name) {
  return String(name || "")
    .trim()
    .slice(0, 20)
    .replace(/[<>]/g, "");
}

function cleanPin(pin) {
  return String(pin || "")
    .replace(/\D/g, "")
    .trim();
}

function cleanClientId(clientId) {
  return String(clientId || "")
    .trim()
    .slice(0, 80)
    .replace(/[^\w.-]/g, "");
}

function getThemeName(themeId) {
  const theme = THEMES.find((item) => item.id === themeId);
  return theme ? theme.name : themeId;
}

function getThemeVoteCounts(game) {
  const counts = {};
  const themes = getCampaignThemes(game);

  themes.forEach((theme) => {
    counts[theme.id] = 0;
  });

  game.players.forEach((player) => {
    const vote = game.themeVotes[player.id];

    if (vote && counts[vote] !== undefined) {
      counts[vote]++;
    }
  });

  return counts;
}

function chooseWinningTheme(game) {
  const themes = getCampaignThemes(game);
  const counts = getThemeVoteCounts(game);

  let winner = themes[0]?.id;
  let highestVotes = -1;

  themes.forEach((theme) => {
    if (counts[theme.id] > highestVotes) {
      winner = theme.id;
      highestVotes = counts[theme.id];
    }
  });

  return winner;
}

function sanitizeSelectedGames(selectedGames, playerCount, campaign = null) {
  const receivedGames = Array.isArray(selectedGames)
    ? selectedGames
    : DEFAULT_SELECTED_GAMES;

  const available = campaign?.games?.available || {
    knowledge: true,
    friend: true,
    conversa: true,
    heads: true,
    stop: true,
    impostor: true,
    cacho: true,
    vertical: true,
    lastcard: true,
    poker: true
  };

  const selectedGame = receivedGames.find((gameId) => {
    return GAME_ORDER.includes(gameId) && available[gameId];
  });

  return selectedGame ? [selectedGame] : [];
}

function getSelectedGameId(game) {
  if (!game || !Array.isArray(game.selectedGames)) return null;
  return game.selectedGames[0] || null;
}

function showGameScoreboard(pin, finishedGameId = null) {
  const game = games.get(pin);

  if (!game) return;

  const resolvedGameId = finishedGameId || getSelectedGameId(game);

  game.status = "between_games";
  game.betweenGames = {
    finishedGameId: resolvedGameId
  };

  io.to(pin).emit("between_games_scoreboard", {
    game: publicGame(game),
    finishedGameId: resolvedGameId,
    finishedGameName: GAME_LABELS[resolvedGameId] || "Juego",
    ranking: getRanking(game)
  });
}

function startSelectedGame(pin) {
  const game = games.get(pin);

  if (!game) return;

  game.betweenGames = null;
  game.selectedGames = sanitizeSelectedGames(game.selectedGames, game.players.length, game.campaign);

  if (!game.selectedGames.length) {
    finishFinalGame(pin);
    return;
  }

  const selectedGame = getSelectedGameId(game);

    if (selectedGame === "knowledge") {
      startKnowledgeThemeVote(pin);
      return;
    }

    if (selectedGame === "friend") {
      startFriendTriviaIntro(pin);
      return;
    }

    if (selectedGame === "conversa") {
      startConversaIntro(pin);
      return;
    }

    if (selectedGame === "heads") {
      startHeadsUpIntro(pin);
      return;
    }

    if (selectedGame === "stop") {
      startStopIntro(pin);
      return;
    }

    if (selectedGame === "impostor") {
      startImpostorIntro(pin);
      return;
    }

    if (selectedGame === "cacho") {
      startCachoIntro(pin);
      return;
    }

    if (selectedGame === "vertical") {
      startVerticalIntro(pin);
      return;
    }

    if (selectedGame === "lastcard") {
      startLastCardIntro(pin);
      return;
    }

    if (selectedGame === "poker") {
      startPokerIntro(pin);
      return;
    }

  finishFinalGame(pin);
}

function startKnowledgeThemeVote(pin) {
  const game = games.get(pin);

  if (!game) return;

  game.status = "theme_vote";
  game.themeVotes = {};

  const themes = getCampaignThemes(game);

  io.to(pin).emit("theme_vote_started", {
    game: publicGame(game),
    themes,
    votes: getThemeVoteCounts(game)
  });
}

function publicGame(game) {
  return {
    pin: game.pin,
    leaderId: game.leaderId,
    status: game.status,
    selectedTheme: game.selectedTheme,
    selectedGames: game.selectedGames || DEFAULT_SELECTED_GAMES,
    campaignSlug: game.campaignSlug,
    campaign: getPublicCampaign(game.campaign),
    players: game.players.map((player) => ({
      id: player.id,
      name: player.name,
      score: player.score,
      isLeader: player.id === game.leaderId
    }))
  };
}

function getRanking(game) {
  return [...game.players]
    .sort((a, b) => b.score - a.score)
    .map((player, index) => ({
      position: index + 1,
      name: player.name,
      score: player.score
    }));
}

function publicQuestion(game) {
  const theme = game.selectedTheme;
  const questions = game.trivia.questions || [];
  const index = game.trivia.currentQuestionIndex;
  const question = questions[index];

  return {
    index,
    number: index + 1,
    total: questions.length,
    theme,
    themeName: getThemeNameFromCampaign(game, theme),
    question: question.question,
    options: question.options.map((text, optionIndex) => ({
      index: optionIndex,
      text
    })),
    durationMs: game.trivia.durationMs,
    endAt: game.trivia.endAt
  };
}

function clearTriviaTimers(game) {
  if (!game || !game.trivia) return;

  if (game.trivia.questionTimer) {
    clearTimeout(game.trivia.questionTimer);
  }

  if (game.trivia.betweenTimer) {
    clearTimeout(game.trivia.betweenTimer);
  }
}

function startTrivia(pin) {
  const game = games.get(pin);

  if (!game) return;
  if (game.status !== "theme_vote") return;

  const winningTheme = chooseWinningTheme(game);
  const questions = shuffleArray(
    getCampaignKnowledgeQuestions(game, winningTheme)
  ).slice(0, 6);

  if (!questions.length) {
    game.status = "knowledge_finished";

    io.to(pin).emit("knowledge_trivia_finished", {
      game: publicGame(game),
      ranking: getRanking(game)
    });

    showGameScoreboard(pin, "knowledge");

    return;
  }

  game.status = "trivia";
  game.selectedTheme = winningTheme;
  game.trivia = {
    questions,
    currentQuestionIndex: -1,
    answers: {},
    questionOpen: false,
    questionStartTime: null,
    durationMs: 15000,
    endAt: null,
    questionTimer: null,
    betweenTimer: null
  };

  io.to(pin).emit("theme_chosen", {
    theme: winningTheme,
    themeName: getThemeNameFromCampaign(game, winningTheme),
    game: publicGame(game)
  });

  game.trivia.betweenTimer = setTimeout(() => {
    nextQuestion(pin);
  }, 1200);
}

function nextQuestion(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "trivia") return;

  const questions = game.trivia.questions || [];

  game.trivia.currentQuestionIndex++;

  if (game.trivia.currentQuestionIndex >= questions.length) {
    endTrivia(pin);
    return;
  }

  game.trivia.answers = {};
  game.trivia.questionOpen = true;
  game.trivia.questionStartTime = Date.now();
  game.trivia.endAt = Date.now() + game.trivia.durationMs;

  io.to(pin).emit("trivia_question", {
    game: publicGame(game),
    question: publicQuestion(game)
  });

  game.trivia.questionTimer = setTimeout(() => {
    finishQuestion(pin);
  }, game.trivia.durationMs + 250);
}

function finishQuestion(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "trivia" || !game.trivia) return;
  if (!game.trivia.questionOpen) return;

  game.trivia.questionOpen = false;

  if (game.trivia.questionTimer) {
    clearTimeout(game.trivia.questionTimer);
    game.trivia.questionTimer = null;
  }

  const questions = game.trivia.questions || [];
  const question = questions[game.trivia.currentQuestionIndex];

  const answers = game.players.map((player) => {
    const answer = game.trivia.answers[player.id];

    return {
      playerId: player.id,
      playerName: player.name,
      selectedText: answer ? question.options[answer.optionIndex] : "Sin respuesta",
      correct: answer ? answer.correct : false,
      points: answer ? answer.points : 0,
      totalScore: player.score
    };
  });

  io.to(pin).emit("trivia_question_result", {
    game: publicGame(game),
    questionNumber: game.trivia.currentQuestionIndex + 1,
    correctIndex: question.correctIndex,
    correctText: question.options[question.correctIndex],
    answers,
    ranking: getRanking(game)
  });

  game.trivia.betweenTimer = setTimeout(() => {
    nextQuestion(pin);
  }, 4500);
}

function endTrivia(pin) {
  const game = games.get(pin);

  if (!game) return;

  clearTriviaTimers(game);

  game.status = "knowledge_finished";

  io.to(pin).emit("knowledge_trivia_finished", {
    game: publicGame(game),
    ranking: getRanking(game)
  });

  showGameScoreboard(pin, "knowledge");
}

function publicFriendQuestion(game) {
  const questions = game.friend.questions || [];
  const index = game.friend.currentQuestionIndex;
  const question = questions[index];
  const options = getVotazoOptions(question);

  return {
    index,
    number: index + 1,
    total: questions.length,
    question: question.question,
    options,
    durationMs: game.friend.durationMs,
    endAt: game.friend.endAt
  };
}

function getVotazoOptions(question) {
  const optionTexts = Array.isArray(question?.options) ? question.options : [];

  return [...optionTexts]
    .map((text, originalIndex) => ({
      id: String(originalIndex),
      text
    }))
    .sort((a, b) => a.text.localeCompare(b.text, "es", { sensitivity: "base" }))
    .map((option, index) => ({
      ...option,
      letter: String.fromCharCode(65 + index)
    }));
}

function clearFriendTimers(game) {
  if (!game || !game.friend) return;

  if (game.friend.questionTimer) {
    clearTimeout(game.friend.questionTimer);
  }

  if (game.friend.betweenTimer) {
    clearTimeout(game.friend.betweenTimer);
  }
}

function startFriendTriviaIntro(pin) {
  const game = games.get(pin);

  if (!game) return;

  game.status = "friend_intro";

  io.to(pin).emit("friend_trivia_intro", {
    game: publicGame(game)
  });
}

function startFriendTrivia(pin) {
  const game = games.get(pin);

  if (!game) return;

  const questions = shuffleArray(getCampaignFriendQuestions(game))
    .slice(0, VOTAZO_QUESTIONS_PER_GAME);

  if (!questions.length) {
    showGameScoreboard(pin, "friend");

    return;
  }

  game.status = "friend_trivia";
  game.friend = {
    questions,
    currentQuestionIndex: -1,
    votes: {},
    questionOpen: false,
    awaitingContinue: false,
    lastResult: null,
    durationMs: getCampaignVotazoDuration(game),
    endAt: null,
    questionTimer: null,
    betweenTimer: null
  };

  io.to(pin).emit("friend_trivia_started", {
    game: publicGame(game)
  });

  game.friend.betweenTimer = setTimeout(() => {
    nextFriendQuestion(pin);
  }, 1500);
}

function nextFriendQuestion(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "friend_trivia") return;

  const questions = game.friend.questions || [];

  game.friend.currentQuestionIndex++;

  if (game.friend.currentQuestionIndex >= questions.length) {
    showGameScoreboard(pin, "friend");

    return;
  }

  game.friend.votes = {};
  game.friend.questionOpen = true;
  game.friend.awaitingContinue = false;
  game.friend.lastResult = null;
  game.friend.endAt = Date.now() + game.friend.durationMs;

  io.to(pin).emit("friend_question", {
    game: publicGame(game),
    question: publicFriendQuestion(game)
  });

  game.friend.questionTimer = setTimeout(() => {
    finishFriendQuestion(pin);
  }, game.friend.durationMs + 250);
}

function finishFriendQuestion(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "friend_trivia" || !game.friend) return;
  if (!game.friend.questionOpen) return;

  game.friend.questionOpen = false;
  game.friend.awaitingContinue = true;

  if (game.friend.questionTimer) {
    clearTimeout(game.friend.questionTimer);
    game.friend.questionTimer = null;
  }

  const currentQuestion = game.friend.questions[game.friend.currentQuestionIndex];
  const options = getVotazoOptions(currentQuestion);
  const voteCounts = {};

  options.forEach((option) => {
    voteCounts[option.id] = 0;
  });

  Object.values(game.friend.votes).forEach((optionId) => {
    if (voteCounts[optionId] !== undefined) {
      voteCounts[optionId]++;
    }
  });

  const totalVotes = Object.values(voteCounts).reduce((total, votes) => total + votes, 0);
  const majorityOptionId = Object.keys(voteCounts).find((optionId) => {
    return voteCounts[optionId] > totalVotes / 2;
  });
  const winningOptionIds = majorityOptionId === undefined ? [] : [majorityOptionId];

  const resultOptions = options.map((option) => ({
    ...option,
    votes: voteCounts[option.id] || 0,
    isWinner: winningOptionIds.includes(option.id)
  }));

  const answers = game.players.map((player) => {
    const selectedOptionId = game.friend.votes[player.id];
    const selectedOption = options.find((option) => option.id === selectedOptionId);
    const votedWinner = winningOptionIds.includes(selectedOptionId);
    const points = votedWinner ? 100 : 0;

    player.score += points;

    return {
      playerId: player.id,
      playerName: player.name,
      selectedOptionId,
      selectedText: selectedOption ? selectedOption.text : "Sin voto",
      selectedLetter: selectedOption ? selectedOption.letter : "-",
      votedWinner,
      points,
      totalScore: player.score
    };
  });

  const result = {
    question: currentQuestion.question,
    options: resultOptions,
    winningOptionIds,
    answers,
    ranking: getRanking(game)
  };

  game.friend.lastResult = result;

  io.to(pin).emit("friend_question_result", {
    game: publicGame(game),
    ...result
  });
}

function getPublicConversaIntro(game) {
  return {
    modes: CONVERSA_MODES.map((mode) => ({ ...mode })),
    archetypes: CONVERSA_ARCHETYPES.map((archetype) => ({ ...archetype }))
  };
}

function startConversaIntro(pin) {
  const game = games.get(pin);

  if (!game) return;

  game.status = "conversa_intro";
  game.conversa = {
    ...getCampaignConversaSettings(game),
    selectedMode: null,
    questions: [],
    players: [],
    currentQuestionIndex: -1,
    currentPlayerIndex: -1,
    classifications: {},
    questionOpen: false,
    questionResults: [],
    lastMessage: "",
    awaitingContinue: false,
    lastResult: null
  };

  io.to(pin).emit("conversa_intro", {
    game: publicGame(game),
    intro: getPublicConversaIntro(game)
  });
}

function getPublicConversaGuide(game) {
  return {
    modeName: game.conversa.selectedMode?.name || "Conversa",
    questionTotal: game.conversa.questions.length,
    archetypes: CONVERSA_ARCHETYPES.map((archetype) => ({ ...archetype }))
  };
}

function getConversaAppPlayer(game, clientId) {
  return game?.players.find((player) => player.clientId === clientId) || null;
}

function getCurrentConversaPlayer(game) {
  return game?.conversa?.players[game.conversa.currentPlayerIndex] || null;
}

function getConnectedConversaRaters(game) {
  const currentPlayer = getCurrentConversaPlayer(game);

  if (!currentPlayer) return [];

  return game.players.filter((player) => {
    return player.connected !== false && player.clientId !== currentPlayer.clientId;
  });
}

function getNextConversaPlayerIndex(game, fromIndex) {
  const players = game.conversa.players;

  for (let offset = 1; offset <= players.length; offset++) {
    const index = (fromIndex + offset) % players.length;
    const appPlayer = getConversaAppPlayer(game, players[index].clientId);

    if (appPlayer && appPlayer.connected !== false) return index;
  }

  return Math.max(0, fromIndex);
}

function getPublicConversaState(game, viewerSocketId) {
  const viewer = game.players.find((player) => player.id === viewerSocketId);
  const currentPlayer = getCurrentConversaPlayer(game);
  const currentAppPlayer = currentPlayer
    ? getConversaAppPlayer(game, currentPlayer.clientId)
    : null;
  const question = game.conversa.questions[game.conversa.currentQuestionIndex] || {};
  const raters = getConnectedConversaRaters(game);
  const viewerClassification = viewer ? game.conversa.classifications[viewer.clientId] : null;
  const isYourTurn = Boolean(
    viewer &&
    currentPlayer &&
    viewer.clientId === currentPlayer.clientId
  );

  return {
    modeId: game.conversa.selectedMode?.id || "",
    modeName: game.conversa.selectedMode?.name || "Conversa",
    question: question.question || "",
    level: question.level || "",
    number: game.conversa.currentQuestionIndex + 1,
    total: game.conversa.questions.length,
    currentPlayerId: currentAppPlayer?.id || null,
    currentPlayerName: currentAppPlayer?.name || currentPlayer?.name || "Jugador",
    isYourTurn,
    canRate: Boolean(
      viewer &&
      !isYourTurn &&
      viewer.connected !== false &&
      game.conversa.questionOpen &&
      !viewerClassification
    ),
    yourClassification: viewerClassification || null,
    classificationCount: raters.filter((player) => game.conversa.classifications[player.clientId]).length,
    totalRaters: raters.length,
    archetypes: CONVERSA_ARCHETYPES.map((archetype) => ({ ...archetype })),
    message: game.conversa.lastMessage
  };
}

function emitConversaState(pin, game) {
  game.players.forEach((player) => {
    io.to(player.id).emit("conversa_question", {
      game: publicGame(game),
      conversaState: getPublicConversaState(game, player.id)
    });
  });
}

function beginConversa(pin, rawModeId) {
  const game = games.get(pin);

  if (!game || game.status !== "conversa_intro" || !game.conversa) {
    return { ok: false, message: "Conversa todavía no está listo." };
  }

  const mode = getConversaMode(rawModeId);
  const questions = getConversaModeQuestions(game.conversa, mode.id, game.players.length);

  if (!questions.length) {
    return { ok: false, message: "No hay preguntas disponibles para este modo." };
  }

  game.conversa.selectedMode = mode;
  game.conversa.questions = questions;
  game.conversa.players = game.players.map((player) => ({
    clientId: player.clientId,
    name: player.name
  }));
  game.conversa.currentQuestionIndex = -1;
  game.conversa.currentPlayerIndex = -1;
  game.conversa.classifications = {};
  game.conversa.questionResults = [];
  game.conversa.lastMessage = "";
  game.conversa.awaitingContinue = false;
  game.conversa.lastResult = null;

  game.status = "conversa_guide";

  io.to(pin).emit("conversa_guide", {
    game: publicGame(game),
    guide: getPublicConversaGuide(game)
  });

  return { ok: true };
}

function startConversaQuestions(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "conversa_guide" || !game.conversa?.questions?.length) {
    return { ok: false, message: "Conversa todavÃ­a no estÃ¡ listo para empezar." };
  }

  startNextConversaQuestion(pin);

  return { ok: true };
}

function startNextConversaQuestion(pin) {
  const game = games.get(pin);

  if (!game?.conversa) return;

  game.conversa.currentQuestionIndex++;

  if (game.conversa.currentQuestionIndex >= game.conversa.questions.length) {
    finishConversaGame(pin);
    return;
  }

  game.status = "conversa";
  game.conversa.currentPlayerIndex = getNextConversaPlayerIndex(
    game,
    game.conversa.currentPlayerIndex
  );
  game.conversa.classifications = {};
  game.conversa.questionOpen = true;

  const currentPlayer = getCurrentConversaPlayer(game);
  game.conversa.lastMessage = `${currentPlayer?.name || "Jugador"} responde esta pregunta.`;

  emitConversaState(pin, game);
}

function haveAllConversaRatersScored(game) {
  const raters = getConnectedConversaRaters(game);

  return Boolean(raters.length) &&
    raters.every((player) => game.conversa.classifications[player.clientId]);
}

function getConversaArchetype(archetypeId) {
  return CONVERSA_ARCHETYPES.find((archetype) => archetype.id === archetypeId) || null;
}

function finishConversaQuestion(pin, skipped = false) {
  const game = games.get(pin);

  if (!game || game.status !== "conversa" || !game.conversa?.questionOpen) return;

  const currentPlayer = getCurrentConversaPlayer(game);
  const appPlayer = currentPlayer ? getConversaAppPlayer(game, currentPlayer.clientId) : null;
  const raters = getConnectedConversaRaters(game);
  const classifications = skipped
    ? []
    : raters
        .map((player) => {
          const archetype = getConversaArchetype(game.conversa.classifications[player.clientId]);
          if (!archetype) return null;

          return {
            raterClientId: player.clientId,
            raterName: player.name,
            archetypeId: archetype.id,
            archetypeName: archetype.name,
            emoji: archetype.emoji
          };
        })
        .filter(Boolean);

  game.conversa.questionOpen = false;

  const result = {
    questionNumber: game.conversa.currentQuestionIndex + 1,
    playerClientId: appPlayer?.clientId || currentPlayer?.clientId || null,
    playerName: appPlayer?.name || currentPlayer?.name || "Jugador",
    question: game.conversa.questions[game.conversa.currentQuestionIndex]?.question || "",
    classifications,
    skipped
  };

  game.conversa.questionResults.push(result);
  game.conversa.lastMessage = skipped
    ? `${result.playerName} salió de la pregunta.`
    : `${result.playerName} fue clasificado por el grupo.`;

  startNextConversaQuestion(pin);
}

function submitConversaClassification(pin, player, rawArchetypeId) {
  const game = games.get(pin);

  if (!game || game.status !== "conversa" || !game.conversa?.questionOpen) {
    return { ok: false, message: "Conversa no tiene una pregunta activa." };
  }

  const currentPlayer = getCurrentConversaPlayer(game);
  if (!currentPlayer) {
    return { ok: false, message: "No hay jugador de turno." };
  }

  if (currentPlayer.clientId === player.clientId) {
    return { ok: false, message: "El jugador de turno no clasifica su propia respuesta." };
  }

  const archetype = getConversaArchetype(rawArchetypeId);
  if (!archetype) {
    return { ok: false, message: "Elige un arquetipo válido." };
  }

  if (game.conversa.classifications[player.clientId]) {
    return { ok: false, message: "Ya clasificaste esta respuesta." };
  }

  game.conversa.classifications[player.clientId] = archetype.id;

  if (haveAllConversaRatersScored(game)) {
    finishConversaQuestion(pin);
    return { ok: true };
  }

  emitConversaState(pin, game);

  return { ok: true };
}

function getConversaArchetypeProfiles(game) {
  return game.conversa.players.map((conversaPlayer) => {
    const appPlayer = getConversaAppPlayer(game, conversaPlayer.clientId);
    const counts = Object.fromEntries(CONVERSA_ARCHETYPES.map((archetype) => [archetype.id, 0]));
    let total = 0;

    game.conversa.questionResults.forEach((result) => {
      if (result.playerClientId !== conversaPlayer.clientId) return;

      (result.classifications || []).forEach((classification) => {
        if (counts[classification.archetypeId] === undefined) return;

        counts[classification.archetypeId]++;
        total++;
      });
    });

    const maxCount = Math.max(0, ...Object.values(counts));
    const topArchetypes = maxCount > 0
      ? CONVERSA_ARCHETYPES
          .filter((archetype) => counts[archetype.id] === maxCount)
          .map((archetype) => ({
            id: archetype.id,
            name: archetype.name,
            emoji: archetype.emoji,
            count: counts[archetype.id],
            probability: total ? Number((counts[archetype.id] / total).toFixed(2)) : 0
          }))
      : [];

    return {
      playerId: appPlayer?.id || null,
      playerName: appPlayer?.name || conversaPlayer.name,
      totalClassifications: total,
      counts,
      topArchetypes
    };
  });
}

function finishConversaGame(pin) {
  const game = games.get(pin);

  if (!game?.conversa) return;

  game.status = "conversa_result";
  game.conversa.awaitingContinue = true;
  game.conversa.lastResult = {
    modeName: game.conversa.selectedMode?.name || "Conversa",
    results: game.conversa.questionResults,
    archetypeProfiles: getConversaArchetypeProfiles(game),
    ranking: getRanking(game)
  };

  io.to(pin).emit("conversa_finished", {
    game: publicGame(game),
    ...game.conversa.lastResult
  });
}

function clearHeadsUpTimers(game) {
  if (!game || !game.heads) return;

  if (game.heads.turnTimer) {
    clearTimeout(game.heads.turnTimer);
  }

  if (game.heads.betweenTimer) {
    clearTimeout(game.heads.betweenTimer);
  }
}

function shuffleArray(array) {
  const copy = [...array];

  for (let i = copy.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    const temp = copy[i];

    copy[i] = copy[randomIndex];
    copy[randomIndex] = temp;
  }

  return copy;
}

const POKER_SUITS = [
  { id: "S", symbol: "♠", color: "black" },
  { id: "H", symbol: "♥", color: "red" },
  { id: "D", symbol: "♦", color: "red" },
  { id: "C", symbol: "♣", color: "black" }
];

const POKER_RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

const POKER_RANK_VALUES = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14
};

const POKER_HAND_RANKINGS = [
  {
    position: 1,
    name: "Carta alta",
    description: "Cuando no hay combinación, gana la carta más alta.",
    cards: [
      { rank: "K", suit: "H", symbol: "♥", color: "red" },
      { rank: "J", suit: "S", symbol: "♠", color: "black" },
      { rank: "10", suit: "C", symbol: "♣", color: "black" },
      { rank: "6", suit: "H", symbol: "♥", color: "red" },
      { rank: "3", suit: "D", symbol: "♦", color: "red" }
    ]
  },
  {
    position: 2,
    name: "Pareja",
    description: "Dos cartas del mismo valor.",
    cards: [
      { rank: "A", suit: "H", symbol: "♥", color: "red" },
      { rank: "A", suit: "C", symbol: "♣", color: "black" },
      { rank: "2", suit: "D", symbol: "♦", color: "red" },
      { rank: "6", suit: "H", symbol: "♥", color: "red" },
      { rank: "8", suit: "S", symbol: "♠", color: "black" }
    ]
  },
  {
    position: 3,
    name: "Doble pareja",
    description: "Dos parejas distintas.",
    cards: [
      { rank: "6", suit: "S", symbol: "♠", color: "black" },
      { rank: "6", suit: "C", symbol: "♣", color: "black" },
      { rank: "10", suit: "C", symbol: "♣", color: "black" },
      { rank: "10", suit: "D", symbol: "♦", color: "red" },
      { rank: "K", suit: "D", symbol: "♦", color: "red" }
    ]
  },
  {
    position: 4,
    name: "Trío",
    description: "Tres cartas del mismo valor.",
    cards: [
      { rank: "J", suit: "D", symbol: "♦", color: "red" },
      { rank: "J", suit: "C", symbol: "♣", color: "black" },
      { rank: "J", suit: "H", symbol: "♥", color: "red" },
      { rank: "5", suit: "C", symbol: "♣", color: "black" },
      { rank: "8", suit: "D", symbol: "♦", color: "red" }
    ]
  },
  {
    position: 5,
    name: "Escalera",
    description: "Cinco cartas consecutivas de palos distintos.",
    cards: [
      { rank: "2", suit: "D", symbol: "♦", color: "red" },
      { rank: "3", suit: "C", symbol: "♣", color: "black" },
      { rank: "4", suit: "S", symbol: "♠", color: "black" },
      { rank: "5", suit: "D", symbol: "♦", color: "red" },
      { rank: "6", suit: "C", symbol: "♣", color: "black" }
    ]
  },
  {
    position: 6,
    name: "Color",
    description: "Cinco cartas del mismo palo, no consecutivas.",
    cards: [
      { rank: "Q", suit: "C", symbol: "♣", color: "black" },
      { rank: "8", suit: "C", symbol: "♣", color: "black" },
      { rank: "6", suit: "C", symbol: "♣", color: "black" },
      { rank: "4", suit: "C", symbol: "♣", color: "black" },
      { rank: "3", suit: "C", symbol: "♣", color: "black" }
    ]
  },
  {
    position: 7,
    name: "Full house",
    description: "Un trío y una pareja.",
    cards: [
      { rank: "K", suit: "C", symbol: "♣", color: "black" },
      { rank: "K", suit: "H", symbol: "♥", color: "red" },
      { rank: "K", suit: "S", symbol: "♠", color: "black" },
      { rank: "10", suit: "C", symbol: "♣", color: "black" },
      { rank: "10", suit: "S", symbol: "♠", color: "black" }
    ]
  },
  {
    position: 8,
    name: "Póker",
    description: "Cuatro cartas del mismo valor.",
    cards: [
      { rank: "A", suit: "D", symbol: "♦", color: "red" },
      { rank: "A", suit: "C", symbol: "♣", color: "black" },
      { rank: "A", suit: "H", symbol: "♥", color: "red" },
      { rank: "A", suit: "S", symbol: "♠", color: "black" },
      { rank: "8", suit: "C", symbol: "♣", color: "black" }
    ]
  },
  {
    position: 9,
    name: "Escalera de color",
    description: "Cinco cartas consecutivas del mismo palo.",
    cards: [
      { rank: "5", suit: "C", symbol: "♣", color: "black" },
      { rank: "6", suit: "C", symbol: "♣", color: "black" },
      { rank: "7", suit: "C", symbol: "♣", color: "black" },
      { rank: "8", suit: "C", symbol: "♣", color: "black" },
      { rank: "9", suit: "C", symbol: "♣", color: "black" }
    ]
  },
  {
    position: 10,
    name: "Escalera real",
    description: "10, J, Q, K y A del mismo palo.",
    cards: [
      { rank: "10", suit: "S", symbol: "♠", color: "black" },
      { rank: "J", suit: "S", symbol: "♠", color: "black" },
      { rank: "Q", suit: "S", symbol: "♠", color: "black" },
      { rank: "K", suit: "S", symbol: "♠", color: "black" },
      { rank: "A", suit: "S", symbol: "♠", color: "black" }
    ]
  }
];

function createPokerDeck() {
  const deck = [];

  POKER_SUITS.forEach((suit) => {
    POKER_RANKS.forEach((rank) => {
      deck.push({
        rank,
        suit: suit.id,
        symbol: suit.symbol,
        color: suit.color
      });
    });
  });

  return shuffleArray(deck);
}

function drawPokerCard(game) {
  if (!game.poker || !Array.isArray(game.poker.deck)) return null;
  return game.poker.deck.pop() || null;
}

function getPokerStageLabel(stage) {
  const labels = {
    preflop: "Preflop",
    flop: "Flop",
    turn: "Turn",
    river: "River",
    showdown: "Showdown",
    hand_finished: "Mano terminada"
  };

  return labels[stage] || stage;
}

function getNextPokerRevealLabel(stage) {
  return "Las fases avanzan automáticamente";
}

function getPokerPlayer(game, playerId) {
  return game.poker.players.find((player) => player.id === playerId);
}

function getPokerSeatIndexes(playerCount, dealerIndex) {
  if (playerCount === 2) {
    return {
      dealerIndex,
      smallBlindIndex: dealerIndex,
      bigBlindIndex: (dealerIndex + 1) % playerCount
    };
  }

  return {
    dealerIndex,
    smallBlindIndex: (dealerIndex + 1) % playerCount,
    bigBlindIndex: (dealerIndex + 2) % playerCount
  };
}

function postPokerBlind(game, playerIndex, amount) {
  const player = game.poker.players[playerIndex];

  if (!player) return;

  const posted = Math.min(player.chips, amount);

  player.chips -= posted;
  player.committed += posted;
  player.streetBet += posted;

  if (player.chips <= 0) {
    player.allIn = true;
  }

  game.poker.pot += posted;
}

function getPokerRankValue(card) {
  return POKER_RANK_VALUES[card.rank] || 0;
}

function formatPokerRankValue(value) {
  const labels = {
    14: "A",
    13: "K",
    12: "Q",
    11: "J"
  };

  return labels[value] || String(value);
}

function getCombinations(items, size) {
  const results = [];

  function backtrack(startIndex, current) {
    if (current.length === size) {
      results.push([...current]);
      return;
    }

    for (let i = startIndex; i < items.length; i++) {
      current.push(items[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }

  backtrack(0, []);

  return results;
}

function getStraightHighFromRanks(rankValues) {
  const uniqueRanks = [...new Set(rankValues)].sort((a, b) => a - b);

  if (uniqueRanks.includes(14)) {
    uniqueRanks.unshift(1);
  }

  let runLength = 1;
  let bestHigh = 0;

  for (let i = 1; i < uniqueRanks.length; i++) {
    if (uniqueRanks[i] === uniqueRanks[i - 1] + 1) {
      runLength++;

      if (runLength >= 5) {
        bestHigh = uniqueRanks[i];
      }
    } else if (uniqueRanks[i] !== uniqueRanks[i - 1]) {
      runLength = 1;
    }
  }

  return bestHigh;
}

function getPokerHandName(category, values) {
  if (category === 8 && values[0] === 14) return "Escalera real";
  if (category === 8) return "Escalera de color";
  if (category === 7) return "Póker";
  if (category === 6) return "Full house";
  if (category === 5) return "Color";
  if (category === 4) return "Escalera";
  if (category === 3) return "Trío";
  if (category === 2) return "Doble pareja";
  if (category === 1) return "Pareja";
  return "Carta alta";
}

function evaluateFivePokerCards(cards) {
  const rankValues = cards
    .map(getPokerRankValue)
    .sort((a, b) => b - a);

  const isFlush = cards.every((card) => card.suit === cards[0].suit);
  const straightHigh = getStraightHighFromRanks(rankValues);

  const countByRank = {};

  rankValues.forEach((rank) => {
    countByRank[rank] = (countByRank[rank] || 0) + 1;
  });

  const groups = Object.entries(countByRank)
    .map(([rank, count]) => ({
      rank: Number(rank),
      count
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.rank - a.rank;
    });

  if (isFlush && straightHigh) {
    const category = 8;

    return {
      category,
      values: [straightHigh],
      cards,
      name: getPokerHandName(category, [straightHigh])
    };
  }

  const four = groups.find((group) => group.count === 4);

  if (four) {
    const kicker = groups.find((group) => group.rank !== four.rank).rank;
    const category = 7;

    return {
      category,
      values: [four.rank, kicker],
      cards,
      name: getPokerHandName(category, [four.rank, kicker])
    };
  }

  const trips = groups.filter((group) => group.count === 3);
  const pairs = groups.filter((group) => group.count === 2);

  if (trips.length && (pairs.length || trips.length > 1)) {
    const tripRank = trips[0].rank;
    const pairRank = pairs.length ? pairs[0].rank : trips[1].rank;
    const category = 6;

    return {
      category,
      values: [tripRank, pairRank],
      cards,
      name: getPokerHandName(category, [tripRank, pairRank])
    };
  }

  if (isFlush) {
    const category = 5;

    return {
      category,
      values: rankValues,
      cards,
      name: getPokerHandName(category, rankValues)
    };
  }

  if (straightHigh) {
    const category = 4;

    return {
      category,
      values: [straightHigh],
      cards,
      name: getPokerHandName(category, [straightHigh])
    };
  }

  if (trips.length) {
    const tripRank = trips[0].rank;
    const kickers = groups
      .filter((group) => group.rank !== tripRank)
      .map((group) => group.rank)
      .sort((a, b) => b - a)
      .slice(0, 2);

    const category = 3;

    return {
      category,
      values: [tripRank, ...kickers],
      cards,
      name: getPokerHandName(category, [tripRank, ...kickers])
    };
  }

  if (pairs.length >= 2) {
    const highPair = pairs[0].rank;
    const lowPair = pairs[1].rank;
    const kicker = groups.find(
      (group) => group.rank !== highPair && group.rank !== lowPair
    ).rank;

    const category = 2;

    return {
      category,
      values: [highPair, lowPair, kicker],
      cards,
      name: getPokerHandName(category, [highPair, lowPair, kicker])
    };
  }

  if (pairs.length === 1) {
    const pairRank = pairs[0].rank;
    const kickers = groups
      .filter((group) => group.rank !== pairRank)
      .map((group) => group.rank)
      .sort((a, b) => b - a)
      .slice(0, 3);

    const category = 1;

    return {
      category,
      values: [pairRank, ...kickers],
      cards,
      name: getPokerHandName(category, [pairRank, ...kickers])
    };
  }

  return {
    category: 0,
    values: rankValues,
    cards,
    name: getPokerHandName(0, rankValues)
  };
}

function comparePokerHands(handA, handB) {
  if (handA.category !== handB.category) {
    return handA.category - handB.category;
  }

  const maxLength = Math.max(handA.values.length, handB.values.length);

  for (let i = 0; i < maxLength; i++) {
    const valueA = handA.values[i] || 0;
    const valueB = handB.values[i] || 0;

    if (valueA !== valueB) {
      return valueA - valueB;
    }
  }

  return 0;
}

function evaluateSevenPokerCards(cards) {
  const validCards = cards.filter(Boolean);

  if (validCards.length < 5) {
    return null;
  }

  const combinations = getCombinations(validCards, 5);
  let bestHand = null;

  combinations.forEach((combination) => {
    const evaluatedHand = evaluateFivePokerCards(combination);

    if (!bestHand || comparePokerHands(evaluatedHand, bestHand) > 0) {
      bestHand = evaluatedHand;
    }
  });

  if (!bestHand) return null;

  return {
    ...bestHand,
    description: `${bestHand.name} con ${bestHand.values
      .map(formatPokerRankValue)
      .join(", ")}`
  };
}

function canPokerPlayerAct(player) {
  return Boolean(
    player &&
    !player.isOut &&
    !player.folded &&
    !player.allIn &&
    player.chips > 0
  );
}

function getPokerPlayersStillInHand(game) {
  return game.poker.players.filter((player) => !player.isOut && !player.folded);
}

function getPokerActivePlayerIndexes(game) {
  return game.poker.players
    .map((player, index) => ({ player, index }))
    .filter(({ player }) => !player.isOut && player.chips > 0)
    .map(({ index }) => index);
}

function getNextPokerActiveIndex(game, fromIndex) {
  const players = game.poker.players;

  for (let step = 1; step <= players.length; step++) {
    const index = (fromIndex + step + players.length) % players.length;
    const player = players[index];

    if (player && !player.isOut && player.chips > 0) {
      return index;
    }
  }

  return -1;
}

function getPokerSeatIndexesForHand(game) {
  const activeIndexes = getPokerActivePlayerIndexes(game);

  if (activeIndexes.length < 2) {
    return {
      dealerIndex: -1,
      smallBlindIndex: -1,
      bigBlindIndex: -1
    };
  }

  if (!activeIndexes.includes(game.poker.dealerIndex)) {
    game.poker.dealerIndex = activeIndexes[0];
  }

  const dealerPosition = activeIndexes.indexOf(game.poker.dealerIndex);
  const dealerIndex = activeIndexes[dealerPosition];

  if (activeIndexes.length === 2) {
    return {
      dealerIndex,
      smallBlindIndex: dealerIndex,
      bigBlindIndex: activeIndexes[(dealerPosition + 1) % activeIndexes.length]
    };
  }

  return {
    dealerIndex,
    smallBlindIndex: activeIndexes[(dealerPosition + 1) % activeIndexes.length],
    bigBlindIndex: activeIndexes[(dealerPosition + 2) % activeIndexes.length]
  };
}

function clearPokerActionTimer(game) {
  if (!game || !game.poker) return;

  if (game.poker.actionTimer) {
    clearTimeout(game.poker.actionTimer);
    game.poker.actionTimer = null;
  }

  game.poker.actionEndsAt = null;
}

function startPokerActionTimer(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "poker" || !game.poker) return;

  clearPokerActionTimer(game);

  const currentPlayer = getCurrentPokerPlayer(game);

  if (!currentPlayer || !canPokerPlayerAct(currentPlayer)) return;

  if (!["preflop", "flop", "turn", "river"].includes(game.poker.stage)) return;

  const timeoutMs = game.poker.settings.actionTimeoutMs || 30000;

  game.poker.actionEndsAt = Date.now() + timeoutMs;

  game.poker.actionTimer = setTimeout(() => {
    const latestGame = games.get(pin);

    if (!latestGame || latestGame.status !== "poker" || !latestGame.poker) return;

    const latestCurrentPlayer = getCurrentPokerPlayer(latestGame);

    if (!latestCurrentPlayer || latestCurrentPlayer.id !== currentPlayer.id) return;

    const actions = getPokerAvailableActions(latestGame, latestCurrentPlayer.id);

    if (actions.check) {
      handlePokerAction(pin, latestCurrentPlayer.id, "check");
      return;
    }

    handlePokerAction(pin, latestCurrentPlayer.id, "fold");
  }, timeoutMs);
}

function getPokerPlayersWhoCanAct(game) {
  return game.poker.players.filter(canPokerPlayerAct);
}

function getCurrentPokerPlayer(game) {
  if (typeof game.poker.currentPlayerIndex !== "number") return null;
  return game.poker.players[game.poker.currentPlayerIndex] || null;
}

function getNextPokerPlayerIndex(game, fromIndex) {
  const players = game.poker.players;

  if (!players.length) return -1;

  for (let step = 1; step <= players.length; step++) {
    const index = (fromIndex + step + players.length) % players.length;
    const player = players[index];

    if (canPokerPlayerAct(player)) {
      return index;
    }
  }

  return -1;
}

function getFirstPokerPlayerToActIndex(game) {
  const players = game.poker.players;

  if (!players.length) return -1;

  let startIndex;

  if (game.poker.stage === "preflop") {
    startIndex = game.poker.bigBlindIndex;
  } else {
    startIndex = game.poker.dealerIndex;
  }

  return getNextPokerPlayerIndex(game, startIndex);
}

function getPokerCallAmount(game, player) {
  if (!player) return 0;

  return Math.max(0, game.poker.currentBet - player.streetBet);
}

function getPokerAvailableActions(game, viewerId) {
  const player = getPokerPlayer(game, viewerId);
  const currentPlayer = getCurrentPokerPlayer(game);

  const emptyActions = {
    check: false,
    call: false,
    bet: false,
    raise: false,
    fold: false,
    callAmount: 0,
    minBet: game.poker?.settings?.bigBlind || 100,
    minRaiseTo: 0,
    maxBet: 0
  };

  if (!player || !currentPlayer || player.id !== currentPlayer.id) {
    return emptyActions;
  }

  if (!["preflop", "flop", "turn", "river"].includes(game.poker.stage)) {
    return emptyActions;
  }

  if (!canPokerPlayerAct(player)) {
    return emptyActions;
  }

  const callAmount = getPokerCallAmount(game, player);
  const maxBet = player.streetBet + player.chips;
  const minBet = game.poker.settings.bigBlind;
  const minRaiseTo = game.poker.currentBet + game.poker.minimumRaise;

  return {
    check: callAmount === 0,
    call: callAmount > 0,
    bet: game.poker.currentBet === 0,
    raise: game.poker.currentBet > 0 && player.chips > callAmount,
    fold: true,
    callAmount,
    minBet,
    minRaiseTo,
    maxBet
  };
}

function applyPokerBet(game, player, amount) {
  const safeAmount = Math.max(0, Math.floor(Number(amount) || 0));
  const paid = Math.min(player.chips, safeAmount);

  player.chips -= paid;
  player.streetBet += paid;
  player.committed += paid;
  game.poker.pot += paid;

  if (player.chips <= 0) {
    player.allIn = true;
  }

  return paid;
}

function markOtherPokerPlayersAsPending(game, aggressorId) {
  game.poker.players.forEach((player) => {
    if (player.id === aggressorId) return;
    if (player.folded || player.allIn) return;

    player.hasActed = false;
  });
}

function resetPokerStreetBets(game) {
  game.poker.players.forEach((player) => {
    player.streetBet = 0;
    player.hasActed = false;
  });

  game.poker.currentBet = 0;
  game.poker.minimumRaise = game.poker.settings.bigBlind;
}

function isPokerBettingRoundComplete(game) {
  const playersWhoCanAct = getPokerPlayersWhoCanAct(game);

  if (!playersWhoCanAct.length) {
    return true;
  }

  return playersWhoCanAct.every((player) => {
    return player.hasActed && player.streetBet === game.poker.currentBet;
  });
}

function shouldFinishPokerAfterHand(game) {
  const playersWithChips = game.poker.players.filter((player) => player.chips > 0);
  return playersWithChips.length <= 1 ||
    game.poker.roundNumber >= game.poker.settings.totalRounds;
}

function finishPokerHandByFold(pin) {
  const game = games.get(pin);

  if (!game || !game.poker) return;

  clearPokerActionTimer(game);

  const remainingPlayers = getPokerPlayersStillInHand(game);
  const winner = remainingPlayers[0];

  if (winner) {
    winner.chips += game.poker.pot;
  }

  game.poker.message = winner
    ? `${winner.name} gana la mano porque los demás se retiraron.`
    : "La mano terminó.";

  game.poker.pot = 0;
  game.poker.stage = "hand_finished";
  game.poker.currentPlayerIndex = null;
  game.poker.currentBet = 0;
  game.poker.minimumRaise = game.poker.settings.bigBlind;
  game.poker.actionEndsAt = null;

  if (shouldFinishPokerAfterHand(game)) {
    finishPokerGame(pin);
    return;
  }

  emitPokerState(pin, game);
}

function buildPokerPots(game) {
  const committedPlayers = game.poker.players.filter((player) => player.committed > 0);
  const commitmentLevels = [...new Set(committedPlayers.map((player) => player.committed))]
    .sort((a, b) => a - b);

  const pots = [];
  let previousLevel = 0;

  commitmentLevels.forEach((level) => {
    const contributors = committedPlayers.filter((player) => player.committed >= level);
    const amount = (level - previousLevel) * contributors.length;
    const eligiblePlayerIds = contributors
      .filter((player) => !player.folded)
      .map((player) => player.id);

    if (amount > 0 && eligiblePlayerIds.length) {
      pots.push({
        amount,
        eligiblePlayerIds
      });
    }

    previousLevel = level;
  });

  return pots;
}

function finishPokerShowdown(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "poker" || !game.poker) return;

  game.poker.stage = "showdown";
  game.poker.showdown = true;
  game.poker.currentPlayerIndex = null;

  clearPokerActionTimer(game);

  const activePlayers = game.poker.players.filter((player) => {
    return !player.folded && player.hand && player.hand.length === 2;
  });

  activePlayers.forEach((player) => {
    player.bestHand = evaluateSevenPokerCards([
      ...player.hand,
      ...game.poker.communityCards
    ]);
  });

  const pots = buildPokerPots(game);
  const payouts = {};
  const potResults = [];

  game.poker.players.forEach((player) => {
    payouts[player.id] = 0;
  });

  pots.forEach((pot, potIndex) => {
    const eligiblePlayers = pot.eligiblePlayerIds
      .map((playerId) => getPokerPlayer(game, playerId))
      .filter((player) => player && !player.folded && player.bestHand);

    if (!eligiblePlayers.length) return;

    let bestHand = eligiblePlayers[0].bestHand;

    eligiblePlayers.forEach((player) => {
      if (comparePokerHands(player.bestHand, bestHand) > 0) {
        bestHand = player.bestHand;
      }
    });

    const winners = eligiblePlayers.filter((player) => {
      return comparePokerHands(player.bestHand, bestHand) === 0;
    });

    const sortedWinners = [...winners].sort((a, b) => a.seat - b.seat);
    const baseShare = Math.floor(pot.amount / sortedWinners.length);
    let remainder = pot.amount % sortedWinners.length;

    sortedWinners.forEach((winner) => {
      const extraChip = remainder > 0 ? 1 : 0;

      winner.chips += baseShare + extraChip;
      payouts[winner.id] += baseShare + extraChip;

      if (remainder > 0) {
        remainder--;
      }
    });

    potResults.push({
      potNumber: potIndex + 1,
      amount: pot.amount,
      winnerNames: sortedWinners.map((winner) => winner.name),
      handName: bestHand.name,
      description: bestHand.description,
      share: baseShare
    });
  });

  const winnersText = potResults
    .map((result) => {
      return `Bote ${result.potNumber}: ${result.winnerNames.join(", ")} gana con ${result.description}`;
    })
    .join(" | ");


  game.poker.pot = 0;
  game.poker.stage = "hand_finished";
  game.poker.currentBet = 0;
  game.poker.minimumRaise = game.poker.settings.bigBlind;
  game.poker.showdownResults = potResults;
  game.poker.payouts = payouts;
  game.poker.message = winnersText || "Showdown terminado.";

  if (shouldFinishPokerAfterHand(game)) {
    finishPokerGame(pin);
    return;
  }

  emitPokerState(pin, game);
}

function startPokerBettingRound(pin, message) {
  const game = games.get(pin);

  if (!game || !game.poker) return;

  clearPokerActionTimer(game);
  resetPokerStreetBets(game);

  game.poker.currentPlayerIndex = getFirstPokerPlayerToActIndex(game);
  game.poker.message = message;

  if (game.poker.currentPlayerIndex === -1) {
    advancePokerAfterBettingRound(pin);
    return;
  }

  startPokerActionTimer(pin);
  emitPokerState(pin, game);
}

function advancePokerAfterBettingRound(pin) {
  const game = games.get(pin);

  if (!game || !game.poker) return;

  clearPokerActionTimer(game);

  if (getPokerPlayersStillInHand(game).length <= 1) {
    finishPokerHandByFold(pin);
    return;
  }

  if (game.poker.stage === "preflop") {
    game.poker.communityCards.push(
      drawPokerCard(game),
      drawPokerCard(game),
      drawPokerCard(game)
    );

    game.poker.stage = "flop";
    startPokerBettingRound(pin, "Flop revelado. Nueva ronda de apuestas.");
    return;
  }

  if (game.poker.stage === "flop") {
    game.poker.communityCards.push(drawPokerCard(game));

    game.poker.stage = "turn";
    startPokerBettingRound(pin, "Turn revelado. Nueva ronda de apuestas.");
    return;
  }

  if (game.poker.stage === "turn") {
    game.poker.communityCards.push(drawPokerCard(game));

    game.poker.stage = "river";
    startPokerBettingRound(pin, "River revelado. Última ronda de apuestas.");
    return;
  }

  if (game.poker.stage === "river") {
    finishPokerShowdown(pin);
  }
}

function movePokerTurnOrAdvance(pin) {
  const game = games.get(pin);

  if (!game || !game.poker) return;

  clearPokerActionTimer(game);

  if (getPokerPlayersStillInHand(game).length <= 1) {
    finishPokerHandByFold(pin);
    return;
  }

  if (isPokerBettingRoundComplete(game)) {
    advancePokerAfterBettingRound(pin);
    return;
  }

  game.poker.currentPlayerIndex = getNextPokerPlayerIndex(
    game,
    game.poker.currentPlayerIndex
  );

  const currentPlayer = getCurrentPokerPlayer(game);

  if (currentPlayer) {
    startPokerActionTimer(pin);
  }

  emitPokerState(pin, game);
}

function handlePokerAction(pin, socketId, action, rawAmount) {
  const game = games.get(pin);

  if (!game || game.status !== "poker" || !game.poker) {
    return {
      ok: false,
      message: "Poker no está activo."
    };
  }

  if (!["preflop", "flop", "turn", "river"].includes(game.poker.stage)) {
    return {
      ok: false,
      message: "No hay una ronda de apuestas activa."
    };
  }

  const player = getCurrentPokerPlayer(game);

  if (!player || player.id !== socketId) {
    return {
      ok: false,
      message: "Todavía no es tu turno."
    };
  }

  const availableActions = getPokerAvailableActions(game, socketId);
  const callAmount = getPokerCallAmount(game, player);

  if (action === "fold") {
    player.folded = true;
    player.hasActed = true;

    game.poker.message = `${player.name} se retiró.`;

    movePokerTurnOrAdvance(pin);

    return {
      ok: true
    };
  }

  if (action === "check") {
    if (!availableActions.check) {
      return {
        ok: false,
        message: "No puedes pasar porque hay una apuesta activa."
      };
    }

    player.hasActed = true;
    game.poker.message = `${player.name} pasó.`;

    movePokerTurnOrAdvance(pin);

    return {
      ok: true
    };
  }

  if (action === "call") {
    if (!availableActions.call) {
      return {
        ok: false,
        message: "No hay apuesta para igualar."
      };
    }

    const paid = applyPokerBet(game, player, callAmount);

    player.hasActed = true;
    game.poker.message = `${player.name} igualó ${paid}.`;

    movePokerTurnOrAdvance(pin);

    return {
      ok: true
    };
  }

  if (action === "bet") {
    if (!availableActions.bet) {
      return {
        ok: false,
        message: "No puedes apostar porque ya hay una apuesta activa."
      };
    }

    const targetBet = Math.floor(Number(rawAmount) || 0);
    const maxBet = player.streetBet + player.chips;
    const minBet = game.poker.settings.bigBlind;
    const safeTargetBet = Math.min(targetBet, maxBet);
    const isAllInUnderMinimum = safeTargetBet === maxBet && safeTargetBet > 0;

    if (safeTargetBet < minBet && !isAllInUnderMinimum) {
      return {
        ok: false,
        message: `La apuesta mínima es ${minBet}.`
      };
    }

    const paid = applyPokerBet(game, player, safeTargetBet - player.streetBet);

    game.poker.currentBet = player.streetBet;
    game.poker.minimumRaise = Math.max(game.poker.settings.bigBlind, paid);
    player.hasActed = true;

    markOtherPokerPlayersAsPending(game, player.id);

    game.poker.message = `${player.name} apostó ${player.streetBet}.`;

    movePokerTurnOrAdvance(pin);

    return {
      ok: true
    };
  }

  if (action === "raise") {
    if (!availableActions.raise) {
      return {
        ok: false,
        message: "No puedes subir en este momento."
      };
    }

    const targetBet = Math.floor(Number(rawAmount) || 0);
    const maxBet = player.streetBet + player.chips;
    const minRaiseTo = game.poker.currentBet + game.poker.minimumRaise;
    const safeTargetBet = Math.min(targetBet, maxBet);
    const isAllInUnderMinimum = safeTargetBet === maxBet && safeTargetBet > game.poker.currentBet;

    if (safeTargetBet <= game.poker.currentBet) {
      return {
        ok: false,
        message: "La subida debe ser mayor que la apuesta actual."
      };
    }

    if (safeTargetBet < minRaiseTo && !isAllInUnderMinimum) {
      return {
        ok: false,
        message: `La subida mínima es a ${minRaiseTo}.`
      };
    }

    const previousBet = game.poker.currentBet;

    applyPokerBet(game, player, safeTargetBet - player.streetBet);

    game.poker.currentBet = player.streetBet;
    game.poker.minimumRaise = Math.max(
      game.poker.settings.bigBlind,
      game.poker.currentBet - previousBet
    );

    player.hasActed = true;

    markOtherPokerPlayersAsPending(game, player.id);

    game.poker.message = `${player.name} subió a ${player.streetBet}.`;

    movePokerTurnOrAdvance(pin);

    return {
      ok: true
    };
  }

  return {
    ok: false,
    message: "Acción inválida."
  };
}

function getHeadsUpMajorityNeeded(game) {
  const voters = game.players.filter((player) => player.id !== game.heads.currentPlayerId);
  return Math.floor(voters.length / 2) + 1;
}

function getHeadsUpCorrectVotes(game) {
  return Object.keys(game.heads.wordVotes || {}).length;
}

function publicHeadsUpTurn(game, viewerId) {
  const activePlayer = game.players.find((player) => player.id === game.heads.currentPlayerId);

  const currentWord = game.heads.words[game.heads.wordIndex] || {
    category: "",
    word: ""
  };

  const isActivePlayer = viewerId === game.heads.currentPlayerId;
  const wordNumber = game.heads.wordIndex + 1;

  return {
    turnNumber: game.heads.currentTurnIndex + 1,
    totalTurns: game.heads.playersOrder.length,
    playerId: game.heads.currentPlayerId,
    playerName: activePlayer ? activePlayer.name : "Jugador",

    wordNumber,
    category: currentWord.category,
    wordText: isActivePlayer ? `Palabra ${wordNumber}` : currentWord.word,
    hiddenForThisPlayer: isActivePlayer,

    durationMs: game.heads.durationMs,
    endAt: game.heads.endAt,

    turnScore: game.heads.turnScore,
    correctCount: game.heads.correctCount,
    passCount: game.heads.passCount,

    canPass: isActivePlayer,
    canVoteCorrect: !isActivePlayer,
    correctVotes: getHeadsUpCorrectVotes(game),
    majorityNeeded: getHeadsUpMajorityNeeded(game),
    hasVotedCorrect: Boolean(game.heads.wordVotes[viewerId])
  };
}

function emitHeadsUpWord(pin, game) {
  game.players.forEach((player) => {
    io.to(player.id).emit("heads_up_word", {
      game: publicGame(game),
      turn: publicHeadsUpTurn(game, player.id)
    });
  });
}

function startHeadsUpIntro(pin) {
  const game = games.get(pin);

  if (!game) return;

  game.status = "heads_intro";
  game.heads = {
    playersOrder: game.players.map((player) => player.id),
    currentTurnIndex: -1,
    currentPlayerId: null,
    words: [],
    wordIndex: -1,
    wordVotes: {},
    turnScore: 0,
    correctCount: 0,
    passCount: 0,
    durationMs: getCampaignHeadsUpDuration(game),
    endAt: null,
    turnTimer: null,
    betweenTimer: null,
    awaitingContinue: false,
    lastTurnResult: null,
    open: false,
    wordOpen: false
  };

  io.to(pin).emit("heads_up_intro", {
    game: publicGame(game)
  });
}

function beginHeadsUp(pin) {
  const game = games.get(pin);

  if (!game) return;

  game.status = "heads_up";

  io.to(pin).emit("heads_up_started", {
    game: publicGame(game)
  });

  game.heads.betweenTimer = setTimeout(() => {
    startNextHeadsUpTurn(pin);
  }, 800);
}

function startNextHeadsUpTurn(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "heads_up" || !game.heads) return;

  clearHeadsUpTimers(game);

  let activePlayer = null;

  while (!activePlayer) {
    game.heads.currentTurnIndex++;

    if (game.heads.currentTurnIndex >= game.heads.playersOrder.length) {
      finishCompleteGame(pin);
      return;
    }

    const playerId = game.heads.playersOrder[game.heads.currentTurnIndex];
    activePlayer = game.players.find((player) => player.id === playerId);
  }

  game.heads.currentPlayerId = activePlayer.id;
  const words = getCampaignHeadsUpWords(game);

  if (!words.length) {
    finishCompleteGame(pin);
    return;
  }

  game.heads.words = shuffleArray(words);
  game.heads.wordIndex = -1;
  game.heads.wordVotes = {};
  game.heads.turnScore = 0;
  game.heads.correctCount = 0;
  game.heads.passCount = 0;
  game.heads.awaitingContinue = false;
  game.heads.lastTurnResult = null;
  game.heads.open = true;
  game.heads.wordOpen = false;
  game.heads.endAt = Date.now() + game.heads.durationMs;

  io.to(pin).emit("heads_up_turn_started", {
    game: publicGame(game),
    playerName: activePlayer.name,
    turnNumber: game.heads.currentTurnIndex + 1,
    totalTurns: game.heads.playersOrder.length
  });

  game.heads.turnTimer = setTimeout(() => {
    finishHeadsUpTurn(pin);
  }, game.heads.durationMs + 250);

  sendNextHeadsUpWord(pin);
}

function sendNextHeadsUpWord(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "heads_up" || !game.heads) return;
  if (!game.heads.open) return;

  if (Date.now() >= game.heads.endAt) {
    finishHeadsUpTurn(pin);
    return;
  }

  game.heads.wordIndex++;

  if (game.heads.wordIndex >= game.heads.words.length) {
    const words = getCampaignHeadsUpWords(game);

    if (!words.length) {
      finishHeadsUpTurn(pin);
      return;
    }

    game.heads.words = shuffleArray(words);
    game.heads.wordIndex = 0;
  }

  game.heads.wordVotes = {};
  game.heads.wordOpen = true;

  emitHeadsUpWord(pin, game);
}

function finishHeadsUpWordAsCorrect(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "heads_up" || !game.heads) return;
  if (!game.heads.open || !game.heads.wordOpen) return;

  game.heads.wordOpen = false;

  const activePlayer = game.players.find((player) => player.id === game.heads.currentPlayerId);
  const currentWord = game.heads.words[game.heads.wordIndex];

  if (activePlayer) {
    activePlayer.score += 100;
    game.heads.turnScore += 100;
    game.heads.correctCount++;
  }

  io.to(pin).emit("heads_up_word_result", {
    game: publicGame(game),
    result: "correct",
    revealedWord: currentWord.word,
    category: currentWord.category,
    wordNumber: game.heads.wordIndex + 1,
    playerId: activePlayer ? activePlayer.id : null,
    playerName: activePlayer ? activePlayer.name : "Jugador",
    correctVotes: getHeadsUpCorrectVotes(game),
    majorityNeeded: getHeadsUpMajorityNeeded(game)
  });

  game.heads.betweenTimer = setTimeout(() => {
    sendNextHeadsUpWord(pin);
  }, 1300);
}

function finishHeadsUpWordAsPassed(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "heads_up" || !game.heads) return;
  if (!game.heads.open || !game.heads.wordOpen) return;

  game.heads.wordOpen = false;
  game.heads.passCount++;

  const activePlayer = game.players.find((player) => player.id === game.heads.currentPlayerId);
  const currentWord = game.heads.words[game.heads.wordIndex];

  io.to(pin).emit("heads_up_word_result", {
    game: publicGame(game),
    result: "passed",
    revealedWord: currentWord.word,
    category: currentWord.category,
    wordNumber: game.heads.wordIndex + 1,
    playerId: activePlayer ? activePlayer.id : null,
    playerName: activePlayer ? activePlayer.name : "Jugador",
    correctVotes: getHeadsUpCorrectVotes(game),
    majorityNeeded: getHeadsUpMajorityNeeded(game)
  });

  game.heads.betweenTimer = setTimeout(() => {
    sendNextHeadsUpWord(pin);
  }, 1300);
}

function finishHeadsUpTurn(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "heads_up" || !game.heads) return;
  if (!game.heads.open) return;

  game.heads.open = false;
  game.heads.wordOpen = false;
  game.heads.awaitingContinue = true;

  clearHeadsUpTimers(game);

  const activePlayer = game.players.find((player) => player.id === game.heads.currentPlayerId);
  const result = {
    playerName: activePlayer ? activePlayer.name : "Jugador",
    correctCount: game.heads.correctCount,
    passCount: game.heads.passCount,
    turnScore: game.heads.turnScore,
    ranking: getRanking(game)
  };

  game.heads.lastTurnResult = result;

  io.to(pin).emit("heads_up_turn_result", {
    game: publicGame(game),
    ...result
  });
}

function finishCompleteGame(pin) {
  const game = games.get(pin);

  if (!game) return;

  clearHeadsUpTimers(game);

  showGameScoreboard(pin, "heads");
}

function cleanStopAnswer(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 60);
}

function normalizeStopComparableText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function normalizeStopDuplicateText(value) {
  return cleanStopAnswer(value).toLocaleUpperCase("es");
}

function clearStopProgressTimer(progress) {
  if (!progress?.timer) return;

  clearTimeout(progress.timer);
  progress.timer = null;
}

function clearStopTimers(game) {
  if (!game?.stop) return;

  ["letterTimer", "answerStartTimer", "voteTimer", "betweenTimer"].forEach((timerKey) => {
    if (game.stop[timerKey]) {
      clearTimeout(game.stop[timerKey]);
      game.stop[timerKey] = null;
    }
  });

  Object.values(game.stop.progress || {}).forEach(clearStopProgressTimer);
}

function startStopIntro(pin) {
  const game = games.get(pin);

  if (!game) return;

  const settings = getCampaignStopSettings(game);

  game.status = "stop_intro";
  game.stop = {
    ...settings,
    list: null,
    letter: null,
    letterEndAt: null,
    letterRevealed: false,
    letterTimer: null,
    answerStartTimer: null,
    progress: {},
    voteQueue: [],
    voteIndex: -1,
    currentVote: null,
    voteResults: [],
    voteTimer: null,
    betweenTimer: null,
    acceptedByPlayer: {},
    pointsByPlayer: {},
    awaitingContinue: false,
    lastResult: null
  };

  io.to(pin).emit("stop_intro", {
    game: publicGame(game)
  });
}

function beginStop(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "stop_intro" || !game.stop) return;

  const [selectedList] = shuffleArray(game.stop.lists);
  const [selectedLetter] = shuffleArray(game.stop.letters);

  if (!selectedList || !selectedLetter) {
    showGameScoreboard(pin, "stop");
    return;
  }

  game.status = "stop_letter";
  game.stop.list = {
    name: selectedList.name,
    categories: [...selectedList.categories]
  };
  game.stop.letter = selectedLetter;
  game.stop.letterRevealed = false;
  game.stop.letterEndAt = Date.now() + game.stop.letterRevealMs;

  io.to(pin).emit("stop_letter_selection_started", {
    game: publicGame(game),
    durationMs: game.stop.letterRevealMs,
    endAt: game.stop.letterEndAt
  });

  game.stop.letterTimer = setTimeout(() => {
    revealStopLetter(pin);
  }, game.stop.letterRevealMs);
}

function revealStopLetter(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "stop_letter" || !game.stop) return;

  game.stop.letterTimer = null;
  game.stop.letterRevealed = true;

  io.to(pin).emit("stop_letter_revealed", {
    game: publicGame(game),
    letter: game.stop.letter,
    listName: game.stop.list.name,
    totalCategories: game.stop.list.categories.length
  });

  game.stop.answerStartTimer = setTimeout(() => {
    beginStopAnswers(pin);
  }, 1200);
}

function beginStopAnswers(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "stop_letter" || !game.stop) return;

  game.stop.answerStartTimer = null;
  game.status = "stop_answers";
  game.stop.progress = {};

  game.players.forEach((player) => {
    game.stop.progress[player.clientId] = {
      categoryIndex: 0,
      answers: [],
      endAt: null,
      timer: null,
      done: false
    };
  });

  game.players.forEach((player) => {
    sendStopCategoryPrompt(pin, player);
  });
}

function getPublicStopPrompt(game, player) {
  const progress = game.stop.progress[player.clientId];
  const categoryIndex = progress.categoryIndex;

  return {
    letter: game.stop.letter,
    listName: game.stop.list.name,
    category: game.stop.list.categories[categoryIndex],
    categoryIndex,
    number: categoryIndex + 1,
    total: game.stop.list.categories.length,
    durationMs: game.stop.answerDurationMs,
    endAt: progress.endAt
  };
}

function sendStopCategoryPrompt(pin, player) {
  const game = games.get(pin);

  if (!game || game.status !== "stop_answers" || !game.stop || !player) return;

  const progress = game.stop.progress[player.clientId];

  if (!progress || progress.done) return;

  if (progress.categoryIndex >= game.stop.list.categories.length) {
    progress.done = true;
    progress.endAt = null;

    io.to(player.id).emit("stop_answers_complete", {
      game: publicGame(game)
    });

    maybeBeginStopVoting(pin);
    return;
  }

  clearStopProgressTimer(progress);
  progress.endAt = Date.now() + game.stop.answerDurationMs;

  io.to(player.id).emit("stop_category_prompt", {
    game: publicGame(game),
    prompt: getPublicStopPrompt(game, player)
  });

  const expectedIndex = progress.categoryIndex;

  progress.timer = setTimeout(() => {
    const latestGame = games.get(pin);
    const latestPlayer = latestGame?.players.find((item) => item.clientId === player.clientId);

    if (!latestGame || !latestPlayer) return;

    recordStopAnswer(pin, latestPlayer, "", true, expectedIndex, true);
  }, game.stop.answerDurationMs + 100);
}

function recordStopAnswer(pin, player, rawWord, passed, expectedIndex, allowExpired = false) {
  const game = games.get(pin);

  if (!game || game.status !== "stop_answers" || !game.stop || !player) {
    return { ok: false, message: "STOP no está activo." };
  }

  const progress = game.stop.progress[player.clientId];

  if (!progress || progress.done) {
    return { ok: false, message: "Ya terminaste todas las categorías." };
  }

  if (Number(expectedIndex) !== progress.categoryIndex) {
    return { ok: false, message: "Esa categoría ya terminó." };
  }

  if (!allowExpired && Date.now() >= progress.endAt) {
    recordStopAnswer(pin, player, "", true, expectedIndex, true);
    return { ok: false, message: "El tiempo de esa categoría terminó." };
  }

  const word = passed ? "" : cleanStopAnswer(rawWord);

  if (!passed && !word) {
    return { ok: false, message: "Escribe una palabra antes de enviarla." };
  }

  if (!passed && !normalizeStopComparableText(word).startsWith(game.stop.letter)) {
    return {
      ok: false,
      message: `La palabra debe comenzar por ${game.stop.letter}.`
    };
  }

  clearStopProgressTimer(progress);

  const category = game.stop.list.categories[progress.categoryIndex];

  progress.answers[progress.categoryIndex] = {
    category,
    word,
    passed: !word
  };
  progress.categoryIndex++;
  progress.endAt = null;

  sendStopCategoryPrompt(pin, player);

  return {
    ok: true,
    word,
    passed: !word
  };
}

function maybeBeginStopVoting(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "stop_answers" || !game.stop) return;

  const allPlayersFinished = game.players.every((player) => {
    return game.stop.progress[player.clientId]?.done;
  });

  if (!allPlayersFinished) return;

  beginStopVoting(pin);
}

function beginStopVoting(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "stop_answers" || !game.stop) return;

  game.status = "stop_voting";
  game.stop.voteQueue = [];
  game.stop.voteIndex = -1;
  game.stop.voteResults = [];
  game.stop.currentVote = null;
  game.stop.acceptedByPlayer = {};
  game.stop.pointsByPlayer = {};

  game.stop.list.categories.forEach((category, categoryIndex) => {
    game.players.forEach((player) => {
      const answer = game.stop.progress[player.clientId]?.answers[categoryIndex];

      if (answer?.word) {
        game.stop.voteQueue.push({
          category,
          categoryIndex,
          authorClientId: player.clientId,
          playerName: player.name,
          word: answer.word
        });
      }
    });
  });

  io.to(pin).emit("stop_voting_started", {
    game: publicGame(game),
    totalWords: game.stop.voteQueue.length
  });

  if (!game.stop.voteQueue.length) {
    finishStopGame(pin);
    return;
  }

  game.stop.betweenTimer = setTimeout(() => {
    startNextStopVote(pin);
  }, 600);
}

function getPublicStopVote(game, player) {
  const currentVote = game.stop.currentVote;
  const voterClientId = player?.clientId || "";
  const isAuthor = voterClientId === currentVote.authorClientId;

  return {
    index: game.stop.voteIndex,
    number: game.stop.voteIndex + 1,
    total: game.stop.voteQueue.length,
    letter: game.stop.letter,
    category: currentVote.category,
    playerName: currentVote.playerName,
    word: currentVote.word,
    durationMs: game.stop.voteDurationMs,
    endAt: currentVote.endAt,
    canVote: currentVote.open && !isAuthor,
    isAuthor,
    hasVoted: currentVote.votes[voterClientId] !== undefined
  };
}

function emitStopVoteItem(pin, game) {
  game.players.forEach((player) => {
    io.to(player.id).emit("stop_vote_item", {
      game: publicGame(game),
      vote: getPublicStopVote(game, player)
    });
  });
}

function startNextStopVote(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "stop_voting" || !game.stop) return;

  if (game.stop.betweenTimer) {
    clearTimeout(game.stop.betweenTimer);
    game.stop.betweenTimer = null;
  }

  game.stop.voteIndex++;

  if (game.stop.voteIndex >= game.stop.voteQueue.length) {
    finishStopGame(pin);
    return;
  }

  const item = game.stop.voteQueue[game.stop.voteIndex];

  game.stop.currentVote = {
    ...item,
    votes: {},
    eligibleVoters: game.players
      .filter((player) => player.clientId !== item.authorClientId)
      .map((player) => player.clientId),
    endAt: Date.now() + game.stop.voteDurationMs,
    open: true
  };

  emitStopVoteItem(pin, game);

  game.stop.voteTimer = setTimeout(() => {
    finishStopVoteItem(pin);
  }, game.stop.voteDurationMs + 100);
}

function haveAllStopVotersResponded(game) {
  const currentVote = game.stop?.currentVote;

  if (!currentVote) return false;

  return currentVote.eligibleVoters.every((clientId) => {
    return currentVote.votes[clientId] !== undefined;
  });
}

function finishStopVoteItem(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "stop_voting" || !game.stop?.currentVote) return;

  const currentVote = game.stop.currentVote;

  if (!currentVote.open) return;

  currentVote.open = false;

  if (game.stop.voteTimer) {
    clearTimeout(game.stop.voteTimer);
    game.stop.voteTimer = null;
  }

  const acceptVotes = currentVote.eligibleVoters.filter((clientId) => {
    return currentVote.votes[clientId] === true;
  }).length;
  const rejectVotes = currentVote.eligibleVoters.length - acceptVotes;
  const accepted = acceptVotes > currentVote.eligibleVoters.length / 2;
  const author = game.players.find((player) => player.clientId === currentVote.authorClientId);
  const comparableWord = normalizeStopDuplicateText(currentVote.word);
  const repeated = game.players.filter((player) => {
    const answer = game.stop.progress[player.clientId]?.answers[currentVote.categoryIndex];
    return answer?.word && normalizeStopDuplicateText(answer.word) === comparableWord;
  }).length >= 2;
  const points = accepted ? (repeated ? 50 : 100) : 0;

  if (accepted && author) {
    author.score += points;
    game.stop.acceptedByPlayer[author.clientId] =
      (game.stop.acceptedByPlayer[author.clientId] || 0) + 1;
    game.stop.pointsByPlayer[author.clientId] =
      (game.stop.pointsByPlayer[author.clientId] || 0) + points;
  }

  const result = {
    number: game.stop.voteIndex + 1,
    total: game.stop.voteQueue.length,
    letter: game.stop.letter,
    category: currentVote.category,
    playerName: currentVote.playerName,
    word: currentVote.word,
    accepted,
    repeated,
    points,
    acceptVotes,
    rejectVotes
  };

  game.stop.voteResults.push(result);

  io.to(pin).emit("stop_vote_result", {
    game: publicGame(game),
    result
  });

  game.stop.betweenTimer = setTimeout(() => {
    startNextStopVote(pin);
  }, 1200);
}

function finishStopGame(pin) {
  const game = games.get(pin);

  if (!game || !game.stop) return;

  clearStopTimers(game);
  game.status = "stop_result";
  game.stop.awaitingContinue = true;

  const playerResults = game.players
    .map((player) => ({
      playerId: player.id,
      playerName: player.name,
      acceptedCount: game.stop.acceptedByPlayer[player.clientId] || 0,
      submittedCount: (game.stop.progress[player.clientId]?.answers || [])
        .filter((answer) => answer?.word).length,
      points: game.stop.pointsByPlayer[player.clientId] || 0,
      totalScore: player.score
    }))
    .sort((a, b) => b.points - a.points || b.acceptedCount - a.acceptedCount ||
      a.playerName.localeCompare(b.playerName));

  const result = {
    letter: game.stop.letter,
    listName: game.stop.list.name,
    playerResults,
    voteResults: game.stop.voteResults,
    ranking: getRanking(game)
  };

  game.stop.lastResult = result;

  io.to(pin).emit("stop_finished", {
    game: publicGame(game),
    ...result
  });
}

function getImpostorPlayer(game, clientId) {
  return game?.players.find((player) => player.clientId === clientId) || null;
}

function getActiveImpostorPlayers(game) {
  const activeClientIds = new Set(game?.impostor?.activeClientIds || []);
  return game?.players.filter((player) => activeClientIds.has(player.clientId)) || [];
}

function getPublicImpostorRole(game, player) {
  const isActive = Boolean(player && game.impostor.activeClientIds.includes(player.clientId));
  const isImpostor = Boolean(player && player.clientId === game.impostor.impostorClientId);

  return {
    isActive,
    isImpostor,
    word: isActive && !isImpostor ? game.impostor.word : null,
    ready: Boolean(player && game.impostor.readyClientIds.includes(player.clientId)),
    readyCount: game.impostor.readyClientIds.length,
    totalPlayers: game.impostor.activeClientIds.length
  };
}

function getPublicImpostorVotingState(game, player) {
  const activePlayers = getActiveImpostorPlayers(game);
  const isActive = Boolean(player && game.impostor.activeClientIds.includes(player.clientId));
  const selectedClientId = player ? game.impostor.votes[player.clientId] : null;
  const selectedPlayer = getImpostorPlayer(game, selectedClientId);

  return {
    roundNumber: game.impostor.roundNumber,
    canVote: isActive,
    isEliminated: Boolean(player && !isActive),
    selectedPlayerId: selectedPlayer?.id || null,
    submittedCount: Object.keys(game.impostor.votes).length,
    totalVoters: activePlayers.length,
    players: activePlayers.map((activePlayer) => ({
      playerId: activePlayer.id,
      playerName: activePlayer.name,
      isSelf: activePlayer.clientId === player?.clientId
    }))
  };
}

function emitImpostorRoles(pin, game) {
  game.players.forEach((player) => {
    io.to(player.id).emit("impostor_role", {
      game: publicGame(game),
      role: getPublicImpostorRole(game, player)
    });
  });
}

function emitImpostorVoting(pin, game) {
  game.players.forEach((player) => {
    io.to(player.id).emit("impostor_voting", {
      game: publicGame(game),
      voting: getPublicImpostorVotingState(game, player)
    });
  });
}

function startImpostorIntro(pin) {
  const game = games.get(pin);

  if (!game) return;

  game.status = "impostor_intro";
  game.impostor = {
    ...getCampaignImpostorSettings(game),
    word: null,
    impostorClientId: null,
    activeClientIds: [],
    readyClientIds: [],
    votes: {},
    roundNumber: 1,
    awaitingContinue: false,
    lastRoundResult: null,
    finalResult: null
  };

  io.to(pin).emit("impostor_intro", {
    game: publicGame(game)
  });
}

function beginImpostor(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "impostor_intro" || !game.impostor) return;

  const players = [...game.players];
  const [word] = shuffleArray(game.impostor.words);
  const [impostor] = shuffleArray(players);

  if (players.length < 3 || !word || !impostor) {
    showGameScoreboard(pin, "impostor");
    return;
  }

  game.status = "impostor_role";
  game.impostor.word = word;
  game.impostor.impostorClientId = impostor.clientId;
  game.impostor.activeClientIds = players.map((player) => player.clientId);
  game.impostor.readyClientIds = [];
  game.impostor.votes = {};

  emitImpostorRoles(pin, game);
}

function startImpostorVoting(pin) {
  const game = games.get(pin);

  if (!game?.impostor) return;

  game.status = "impostor_voting";
  game.impostor.votes = {};
  game.impostor.awaitingContinue = false;
  emitImpostorVoting(pin, game);
}

function emitImpostorVoteProgress(pin, game) {
  io.to(pin).emit("impostor_vote_progress", {
    submittedCount: Object.keys(game.impostor.votes).length,
    totalVoters: game.impostor.activeClientIds.length
  });
}

function finishImpostorRound(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "impostor_voting" || !game.impostor) {
    return { ok: false, message: "La votación de Impostor no está activa." };
  }

  const counts = {};
  Object.values(game.impostor.votes).forEach((suspectClientId) => {
    if (game.impostor.activeClientIds.includes(suspectClientId)) {
      counts[suspectClientId] = (counts[suspectClientId] || 0) + 1;
    }
  });

  const rankedVotes = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  if (!rankedVotes.length) {
    return { ok: false, message: "Debe haber al menos un voto para terminar la ronda." };
  }

  if (rankedVotes.length > 1 && rankedVotes[0][1] === rankedVotes[1][1]) {
    return {
      ok: false,
      message: "Hay un empate. Cambien sus votos antes de terminar la ronda."
    };
  }

  const eliminatedClientId = rankedVotes[0][0];
  const eliminatedPlayer = getImpostorPlayer(game, eliminatedClientId);

  if (!eliminatedPlayer) {
    return { ok: false, message: "No se pudo identificar al jugador elegido." };
  }

  game.impostor.activeClientIds = game.impostor.activeClientIds.filter(
    (clientId) => clientId !== eliminatedClientId
  );

  const groupWasRight = eliminatedClientId === game.impostor.impostorClientId;
  const impostorSurvived = !groupWasRight && game.impostor.activeClientIds.length <= 2;
  const isFinal = groupWasRight || impostorSurvived;
  const impostorPlayer = getImpostorPlayer(game, game.impostor.impostorClientId);

  if (groupWasRight) {
    game.players.forEach((player) => {
      if (player.clientId !== game.impostor.impostorClientId) {
        player.score += game.impostor.groupWinPoints;
      }
    });
  } else if (impostorSurvived && impostorPlayer) {
    impostorPlayer.score += game.impostor.impostorWinPoints;
  }

  const result = {
    roundNumber: game.impostor.roundNumber,
    eliminatedPlayerId: eliminatedPlayer.id,
    eliminatedPlayerName: eliminatedPlayer.name,
    eliminatedVotes: rankedVotes[0][1],
    groupWasRight,
    isFinal,
    winner: groupWasRight ? "group" : impostorSurvived ? "impostor" : null,
    activePlayers: getActiveImpostorPlayers(game).map((player) => ({
      playerId: player.id,
      playerName: player.name
    })),
    impostorPlayerName: isFinal ? impostorPlayer?.name || "" : null,
    word: isFinal ? game.impostor.word : null,
    ranking: isFinal ? getRanking(game) : null
  };

  game.status = isFinal ? "impostor_result" : "impostor_round_result";
  game.impostor.awaitingContinue = true;
  game.impostor.lastRoundResult = result;

  if (isFinal) {
    game.impostor.finalResult = result;
  }

  io.to(pin).emit("impostor_round_result", {
    game: publicGame(game),
    result
  });

  return { ok: true };
}

function getCachoPlayer(game, clientId) {
  return game?.cacho?.players.find((player) => player.clientId === clientId) || null;
}

function getCachoAppPlayer(game, clientId) {
  return game?.players.find((player) => player.clientId === clientId) || null;
}

function getActiveCachoPlayers(game) {
  return game?.cacho?.players.filter((player) => !player.eliminated && player.diceCount > 0) || [];
}

function getCurrentCachoPlayer(game) {
  return game?.cacho?.players[game.cacho.currentPlayerIndex] || null;
}

function clearCachoTimer(game) {
  if (!game?.cacho?.actionTimer) return;

  clearTimeout(game.cacho.actionTimer);
  game.cacho.actionTimer = null;
}

function rollCachoDice(amount) {
  return Array.from({ length: amount }, () => Math.floor(Math.random() * 6) + 1);
}

function getNextCachoPlayerIndex(game, fromIndex) {
  const players = game.cacho.players;

  for (let offset = 1; offset <= players.length; offset++) {
    const index = (fromIndex + offset) % players.length;
    if (!players[index].eliminated && players[index].diceCount > 0) return index;
  }

  return fromIndex;
}

function isHigherCachoBid(currentBid, quantity, face) {
  if (!currentBid) return true;

  return quantity > currentBid.quantity ||
    (quantity === currentBid.quantity && face > currentBid.face);
}

function countCachoFace(dice, face) {
  return dice.filter((die) => die === face).length;
}

function getPublicCachoState(game, viewerSocketId) {
  const viewer = game.players.find((player) => player.id === viewerSocketId);
  const viewerState = viewer ? getCachoPlayer(game, viewer.clientId) : null;
  const currentPlayer = getCurrentCachoPlayer(game);
  const currentAppPlayer = currentPlayer
    ? getCachoAppPlayer(game, currentPlayer.clientId)
    : null;
  const bidder = game.cacho.currentBid
    ? getCachoAppPlayer(game, game.cacho.currentBid.bidderClientId)
    : null;
  const isYourTurn = Boolean(
    viewerState &&
    !viewerState.eliminated &&
    currentPlayer?.clientId === viewerState.clientId
  );

  return {
    roundNumber: game.cacho.roundNumber,
    players: game.cacho.players.map((player) => {
      const appPlayer = getCachoAppPlayer(game, player.clientId);

      return {
        playerId: appPlayer?.id || null,
        playerName: appPlayer?.name || player.name,
        diceCount: player.diceCount,
        eliminated: player.eliminated,
        isCurrent: currentPlayer?.clientId === player.clientId
      };
    }),
    dice: [...(viewerState?.dice || [])],
    isEliminated: Boolean(viewerState?.eliminated),
    currentPlayerId: currentAppPlayer?.id || null,
    currentPlayerName: currentAppPlayer?.name || currentPlayer?.name || "Jugador",
    isYourTurn,
    canBid: isYourTurn,
    canDoubt: isYourTurn && Boolean(game.cacho.currentBid),
    currentBid: game.cacho.currentBid
      ? {
          quantity: game.cacho.currentBid.quantity,
          face: game.cacho.currentBid.face,
          bidderName: bidder?.name || "Jugador"
        }
      : null,
    totalDice: getActiveCachoPlayers(game)
      .reduce((total, player) => total + player.diceCount, 0),
    message: game.cacho.message,
    durationMs: game.cacho.actionTimeoutMs,
    endAt: game.cacho.endAt
  };
}

function emitCachoState(pin, game) {
  game.players.forEach((player) => {
    io.to(player.id).emit("cacho_state", {
      game: publicGame(game),
      cachoState: getPublicCachoState(game, player.id)
    });
  });
}

function startCachoIntro(pin) {
  const game = games.get(pin);

  if (!game) return;

  game.status = "cacho_intro";
  game.cacho = {
    ...getCampaignCachoSettings(game),
    players: [],
    currentPlayerIndex: 0,
    currentBid: null,
    roundNumber: 0,
    message: "",
    endAt: null,
    actionTimer: null,
    awaitingContinue: false,
    nextStarterClientId: null,
    lastRoundResult: null
  };

  io.to(pin).emit("cacho_intro", {
    game: publicGame(game)
  });
}

function beginCacho(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "cacho_intro" || !game.cacho) return;

  game.cacho.players = game.players.map((player) => ({
    clientId: player.clientId,
    name: player.name,
    diceCount: game.cacho.initialDice,
    dice: [],
    eliminated: false
  }));
  const [starter] = shuffleArray(game.cacho.players);
  beginCachoRound(pin, starter?.clientId || game.cacho.players[0]?.clientId);
}

function beginCachoRound(pin, starterClientId) {
  const game = games.get(pin);

  if (!game?.cacho) return;

  const activePlayers = getActiveCachoPlayers(game);
  if (activePlayers.length <= 1) return;

  clearCachoTimer(game);
  game.status = "cacho";
  game.cacho.roundNumber++;
  game.cacho.currentBid = null;
  game.cacho.awaitingContinue = false;
  game.cacho.lastRoundResult = null;
  game.cacho.players.forEach((player) => {
    player.dice = player.eliminated ? [] : rollCachoDice(player.diceCount);
  });

  let starterIndex = game.cacho.players.findIndex((player) => {
    return player.clientId === starterClientId && !player.eliminated;
  });
  if (starterIndex < 0) {
    starterIndex = game.cacho.players.findIndex((player) => !player.eliminated);
  }

  game.cacho.currentPlayerIndex = Math.max(0, starterIndex);
  game.cacho.message = `${getCurrentCachoPlayer(game).name} comienza la ronda.`;
  startCachoTurnTimer(pin, game);
  emitCachoState(pin, game);
}

function startCachoTurnTimer(pin, game) {
  clearCachoTimer(game);
  game.cacho.endAt = Date.now() + game.cacho.actionTimeoutMs;
  game.cacho.actionTimer = setTimeout(() => {
    handleCachoTurnTimeout(pin);
  }, game.cacho.actionTimeoutMs + 100);
}

function handleCachoTurnTimeout(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "cacho" || !game.cacho) return;

  const currentPlayer = getCurrentCachoPlayer(game);
  const appPlayer = currentPlayer
    ? getCachoAppPlayer(game, currentPlayer.clientId)
    : null;
  if (!currentPlayer || !appPlayer) return;

  if (game.cacho.currentBid) {
    resolveCachoDoubt(pin, appPlayer, true);
    return;
  }

  placeCachoBid(pin, appPlayer, 1, 2, true);
}

function placeCachoBid(pin, player, rawQuantity, rawFace, timedOut = false) {
  const game = games.get(pin);

  if (!game || game.status !== "cacho" || !game.cacho) {
    return { ok: false, message: "Cacho no está activo." };
  }

  const currentPlayer = getCurrentCachoPlayer(game);
  if (!currentPlayer || currentPlayer.clientId !== player.clientId) {
    return { ok: false, message: "No es tu turno." };
  }

  const quantity = Number(rawQuantity);
  const face = Number(rawFace);
  const totalDice = getActiveCachoPlayers(game)
    .reduce((total, item) => total + item.diceCount, 0);

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > totalDice) {
    return { ok: false, message: `La cantidad debe estar entre 1 y ${totalDice}.` };
  }

  if (!Number.isInteger(face) || face < 1 || face > 6) {
    return { ok: false, message: "Elige una cara válida del dado." };
  }

  if (!isHigherCachoBid(game.cacho.currentBid, quantity, face)) {
    return { ok: false, message: "La nueva apuesta debe superar la apuesta actual." };
  }

  clearCachoTimer(game);
  game.cacho.currentBid = {
    quantity,
    face,
    bidderClientId: currentPlayer.clientId
  };
  game.cacho.message = timedOut
    ? `${currentPlayer.name} agotó su tiempo y apostó ${quantity} dado${quantity === 1 ? "" : "s"}.`
    : `${currentPlayer.name} subió la apuesta.`;
  game.cacho.currentPlayerIndex = getNextCachoPlayerIndex(
    game,
    game.cacho.currentPlayerIndex
  );
  startCachoTurnTimer(pin, game);
  emitCachoState(pin, game);

  return { ok: true };
}

function resolveCachoDoubt(pin, challenger, timedOut = false) {
  const game = games.get(pin);

  if (!game || game.status !== "cacho" || !game.cacho?.currentBid) {
    return { ok: false, message: "No hay una apuesta para desafiar." };
  }

  const currentPlayer = getCurrentCachoPlayer(game);
  if (!currentPlayer || currentPlayer.clientId !== challenger.clientId) {
    return { ok: false, message: "No es tu turno." };
  }

  clearCachoTimer(game);

  const bid = game.cacho.currentBid;
  const bidderState = getCachoPlayer(game, bid.bidderClientId);
  const challengerState = getCachoPlayer(game, challenger.clientId);
  const allDice = getActiveCachoPlayers(game).flatMap((player) => player.dice);
  const actualCount = countCachoFace(allDice, bid.face);
  const bidWasTrue = actualCount >= bid.quantity;
  const loserState = bidWasTrue ? challengerState : bidderState;

  if (!loserState) {
    return { ok: false, message: "No se pudo resolver el desafío." };
  }

  const loserIndex = game.cacho.players.indexOf(loserState);
  loserState.diceCount = Math.max(0, loserState.diceCount - 1);
  loserState.eliminated = loserState.diceCount === 0;
  const activePlayers = getActiveCachoPlayers(game);
  const isFinal = activePlayers.length === 1;
  const winnerState = isFinal ? activePlayers[0] : null;
  const winner = winnerState ? getCachoAppPlayer(game, winnerState.clientId) : null;

  if (winner) winner.score += game.cacho.winnerPoints;

  const nextStarterIndex = loserState.eliminated
    ? getNextCachoPlayerIndex(game, loserIndex)
    : loserIndex;
  game.cacho.nextStarterClientId = game.cacho.players[nextStarterIndex]?.clientId || null;

  const result = {
    roundNumber: game.cacho.roundNumber,
    bid: {
      quantity: bid.quantity,
      face: bid.face,
      bidderName: bidderState?.name || "Jugador"
    },
    challengerName: challengerState?.name || challenger.name,
    timedOut,
    actualCount,
    bidWasTrue,
    loserName: loserState.name,
    loserDiceCount: loserState.diceCount,
    loserEliminated: loserState.eliminated,
    revealedPlayers: game.cacho.players
      .filter((player) => player.dice.length)
      .map((player) => ({
        playerName: player.name,
        dice: [...player.dice],
        lostDie: player.clientId === loserState.clientId
      })),
    isFinal,
    winnerName: winner?.name || winnerState?.name || null,
    winnerPoints: isFinal ? game.cacho.winnerPoints : 0,
    ranking: isFinal ? getRanking(game) : null
  };

  game.status = isFinal ? "cacho_result" : "cacho_round_result";
  game.cacho.awaitingContinue = true;
  game.cacho.lastRoundResult = result;

  io.to(pin).emit("cacho_round_result", {
    game: publicGame(game),
    result
  });

  return { ok: true };
}

function getVerticalAppPlayer(game, clientId) {
  return game.players.find((player) => player.clientId === clientId) || null;
}

function getVerticalPlayer(game, clientId) {
  return game.vertical?.players.find((player) => player.clientId === clientId) || null;
}

function getActiveVerticalPlayers(game) {
  return game.vertical?.players.filter((player) => !player.bankrupt) || [];
}

function getCurrentVerticalPlayer(game) {
  return game.vertical?.players[game.vertical.currentPlayerIndex] || null;
}

function getVerticalOwnership(game, squareId) {
  return game.vertical?.ownership?.[squareId] || null;
}

function getVerticalCompanySquares(companyId) {
  return VERTICAL_BOARD.filter((square) => {
    return square.type === "property" && square.companyId === companyId;
  });
}

function ownsVerticalCompany(game, clientId, companyId) {
  const companySquares = getVerticalCompanySquares(companyId);

  return companySquares.length > 0 && companySquares.every((square) => {
    return getVerticalOwnership(game, square.id)?.ownerClientId === clientId;
  });
}

function getVerticalPropertyValue(game, player) {
  return Object.entries(game.vertical.ownership).reduce((total, [squareId, ownership]) => {
    if (ownership.ownerClientId !== player.clientId) return total;

    const square = VERTICAL_BOARD.find((item) => item.id === squareId);
    if (!square) return total;

    return total + (square.price || 0) + (ownership.improvements || 0) * (square.improvementCost || 0);
  }, 0);
}

function getPublicVerticalTradeOffer(game, viewerClientId) {
  const offer = game.vertical?.tradeOffer;
  if (!offer || offer.status !== "pending") return null;

  const square = VERTICAL_BOARD.find((item) => item.id === offer.squareId);
  const ownership = square ? getVerticalOwnership(game, square.id) : null;
  const seller = getVerticalPlayer(game, offer.sellerClientId);
  const buyer = getVerticalPlayer(game, offer.buyerClientId);
  const proposer = getVerticalPlayer(game, offer.proposerClientId);
  const responderClientId = offer.direction === "sell"
    ? offer.buyerClientId
    : offer.sellerClientId;

  return {
    id: offer.id,
    direction: offer.direction,
    squareId: offer.squareId,
    squareName: square?.name || "Propiedad",
    companyName: square?.companyName || "",
    sellerClientId: offer.sellerClientId,
    sellerName: seller?.name || "Vendedor",
    buyerClientId: offer.buyerClientId,
    buyerName: buyer?.name || "Comprador",
    proposerClientId: offer.proposerClientId,
    proposerName: proposer?.name || "Jugador",
    responderClientId,
    amount: offer.amount,
    mortgaged: Boolean(ownership?.mortgaged),
    improvements: ownership?.improvements || 0,
    mortgageValue: square?.mortgageValue || 0,
    isProposer: viewerClientId === offer.proposerClientId,
    isResponder: viewerClientId === responderClientId
  };
}

function getVerticalMortgageTotal(game, player) {
  return Object.entries(game.vertical.ownership).reduce((total, [squareId, ownership]) => {
    if (ownership.ownerClientId !== player.clientId || !ownership.mortgaged) return total;
    const square = VERTICAL_BOARD.find((item) => item.id === squareId);
    return total + (square?.mortgageValue || 0);
  }, 0);
}

function getVerticalFinancials(game, player) {
  const propertyValue = getVerticalPropertyValue(game, player);
  const mortgage = getVerticalMortgageTotal(game, player);
  const grossAssets = Math.max(0, player.cash) + propertyValue;
  const percentage = (value) => grossAssets > 0
    ? Math.round((value / grossAssets) * 1000) / 10
    : 0;

  return {
    propertyValue,
    propertyPercentage: percentage(propertyValue),
    cash: player.cash,
    cashPercentage: percentage(Math.max(0, player.cash)),
    mortgage,
    mortgagePercentage: percentage(mortgage),
    grossAssets,
    netWorth: player.cash + propertyValue - mortgage
  };
}

function getVerticalRent(game, square, diceTotal) {
  const ownership = getVerticalOwnership(game, square.id);
  if (!ownership || ownership.mortgaged) return 0;

  if (square.type === "property") {
    if (ownership.improvements > 0) {
      return square.rents[Math.min(4, ownership.improvements + 1)];
    }

    return ownsVerticalCompany(game, ownership.ownerClientId, square.companyId)
      ? square.rents[1]
      : square.rents[0];
  }

  if (square.type === "transport") {
    const ownedTransport = VERTICAL_BOARD.filter((item) => {
      return item.type === "transport" &&
        getVerticalOwnership(game, item.id)?.ownerClientId === ownership.ownerClientId;
    }).length;

    return [0, 25, 50, 100, 200][ownedTransport] || 200;
  }

  if (square.type === "utility") {
    const ownedUtilities = VERTICAL_BOARD.filter((item) => {
      return item.type === "utility" &&
        getVerticalOwnership(game, item.id)?.ownerClientId === ownership.ownerClientId;
    }).length;

    return diceTotal * (ownedUtilities >= 2 ? 10 : 4);
  }

  return 0;
}

function getNextVerticalPlayerIndex(game, fromIndex) {
  const players = game.vertical.players;

  for (let offset = 1; offset <= players.length; offset++) {
    const index = (fromIndex + offset) % players.length;
    const appPlayer = getVerticalAppPlayer(game, players[index].clientId);
    if (!players[index].bankrupt && appPlayer?.connected !== false) return index;
  }

  return fromIndex;
}

function verticalSquareIsPurchasable(square) {
  return ["property", "transport", "utility"].includes(square?.type);
}

function getVerticalSquarePublic(game, square, viewerClientId) {
  const ownership = getVerticalOwnership(game, square.id);
  const owner = ownership ? getVerticalAppPlayer(game, ownership.ownerClientId) : null;
  const occupants = game.vertical.players
    .filter((player) => !player.bankrupt && player.position === VERTICAL_BOARD.indexOf(square))
    .map((player) => player.name);
  const currentPlayer = getCurrentVerticalPlayer(game);
  const viewer = getVerticalPlayer(game, viewerClientId);
  const isViewerTurn = Boolean(viewer && currentPlayer?.clientId === viewer.clientId);
  const viewerOwns = Boolean(viewer && ownership?.ownerClientId === viewer.clientId);
  const ownerPlayer = ownership ? getVerticalPlayer(game, ownership.ownerClientId) : null;
  const canTrade = Boolean(
    viewer &&
    !viewer.bankrupt &&
    square.type === "property" &&
    ownership &&
    ownerPlayer &&
    !ownerPlayer.bankrupt &&
    !game.vertical.tradeOffer
  );
  const companyHasImprovements = square.type === "property" && getVerticalCompanySquares(square.companyId).some((item) => {
    return (getVerticalOwnership(game, item.id)?.improvements || 0) > 0;
  });

  return {
    ...square,
    ownerName: owner?.name || null,
    ownerClientId: ownership?.ownerClientId || null,
    mortgaged: Boolean(ownership?.mortgaged),
    improvements: ownership?.improvements || 0,
    occupants,
    rentNow: verticalSquareIsPurchasable(square)
      ? getVerticalRent(game, square, game.vertical.lastRollTotal || 0)
      : 0,
    canBuy: Boolean(
      isViewerTurn &&
      game.vertical.phase === "await_property" &&
      viewer.position === VERTICAL_BOARD.indexOf(square) &&
      !ownership &&
      viewer.cash >= (square.price || 0)
    ),
    canBuild: Boolean(isViewerTurn && canBuildVerticalProperty(game, viewer, square, ownership)),
    canSellImprovement: Boolean(isViewerTurn && canSellVerticalImprovement(game, viewer, square, ownership)),
    canMortgage: Boolean(isViewerTurn && viewerOwns && !ownership.mortgaged && !companyHasImprovements),
    canUnmortgage: Boolean(
      isViewerTurn &&
      viewerOwns &&
      ownership.mortgaged &&
      viewer.cash >= Math.ceil((square.mortgageValue || 0) * 1.1)
    ),
    canOfferBuy: Boolean(canTrade && !viewerOwns && (ownership.improvements || 0) === 0),
    canOfferSell: Boolean(canTrade && viewerOwns && (ownership.improvements || 0) === 0),
    unmortgageCost: Math.ceil((square.mortgageValue || 0) * 1.1)
  };
}

function getPublicVerticalState(game, viewerSocketId) {
  const viewerApp = game.players.find((player) => player.id === viewerSocketId);
  const viewer = viewerApp ? getVerticalPlayer(game, viewerApp.clientId) : null;
  const currentPlayer = getCurrentVerticalPlayer(game);
  const currentApp = currentPlayer
    ? getVerticalAppPlayer(game, currentPlayer.clientId)
    : null;
  const isYourTurn = Boolean(viewer && currentPlayer?.clientId === viewer.clientId);

  return {
    board: VERTICAL_BOARD.map((square) => getVerticalSquarePublic(game, square, viewer?.clientId)),
    companies: VERTICAL_COMPANIES,
    players: game.vertical.players.map((player) => {
      const appPlayer = getVerticalAppPlayer(game, player.clientId);
      return {
        id: appPlayer?.id || null,
        clientId: player.clientId,
        name: player.name,
        position: player.position,
        inJail: player.inJail,
        bankrupt: player.bankrupt,
        isCurrent: currentPlayer?.clientId === player.clientId,
        isYou: viewer?.clientId === player.clientId,
        financials: getVerticalFinancials(game, player)
      };
    }),
    currentPlayerId: currentApp?.id || null,
    currentPlayerName: currentPlayer?.name || "",
    isYourTurn,
    phase: game.vertical.phase,
    dice: [...game.vertical.lastRoll],
    message: game.vertical.message,
    lastCard: game.vertical.lastCard,
    canRoll: Boolean(isYourTurn && game.vertical.phase === "await_roll" && viewer.cash >= 0),
    canEndTurn: Boolean(isYourTurn && game.vertical.phase === "await_end" && viewer.cash >= 0 && !game.vertical.tradeOffer),
    canSkipPurchase: Boolean(isYourTurn && game.vertical.phase === "await_property"),
    canPayJail: Boolean(
      isYourTurn &&
      game.vertical.phase === "await_roll" &&
      viewer.inJail &&
      viewer.cash >= VERTICAL_JAIL_FINE
    ),
    mustResolveDebt: Boolean(isYourTurn && viewer.cash < 0),
    canDeclareBankruptcy: Boolean(isYourTurn && viewer.cash < 0),
    tradeOffer: getPublicVerticalTradeOffer(game, viewer?.clientId),
    serverNow: Date.now()
  };
}

function emitVerticalState(pin, game) {
  game.players.forEach((player) => {
    io.to(player.id).emit("vertical_state", {
      game: publicGame(game),
      verticalState: getPublicVerticalState(game, player.id)
    });
  });
}

function startVerticalIntro(pin) {
  const game = games.get(pin);
  if (!game) return;

  game.status = "vertical_intro";
  game.vertical = null;

  io.to(pin).emit("vertical_intro", {
    game: publicGame(game),
    companies: VERTICAL_COMPANIES,
    startingCash: VERTICAL_STARTING_CASH
  });
}

function beginVerticalGame(pin) {
  const game = games.get(pin);
  if (!game || game.status !== "vertical_intro") {
    return { ok: false, message: "Integración vertical todavía no está listo." };
  }

  game.vertical = {
    players: game.players.map((player) => ({
      clientId: player.clientId,
      name: player.name,
      position: 0,
      cash: VERTICAL_STARTING_CASH,
      inJail: false,
      jailTurns: 0,
      doubleStreak: 0,
      bankrupt: false
    })),
    ownership: {},
    currentPlayerIndex: 0,
    phase: "await_roll",
    lastRoll: [],
    lastRollTotal: 0,
    extraRoll: false,
    message: `${game.players[0]?.name || "Jugador"} comienza la integración de la cadena.`,
    lastCard: null,
    pendingCreditorClientId: null,
    tradeOffer: null,
    tradeOfferSequence: 0,
    turnNumber: 1,
    lastResult: null
  };
  game.status = "vertical";
  emitVerticalState(pin, game);
  return { ok: true };
}

function sendVerticalPlayerToJail(game, player) {
  player.position = 10;
  player.inJail = true;
  player.jailTurns = 0;
  player.doubleStreak = 0;
  game.vertical.extraRoll = false;
}

function applyVerticalCash(game, player, amount, creditorClientId = null) {
  player.cash += amount;
  if (amount < 0) {
    game.vertical.pendingCreditorClientId = creditorClientId;
  }
}

function drawVerticalBusinessCard(game, player, deckType) {
  const deck = deckType === "fortune" ? VERTICAL_FORTUNE_CARDS : VERTICAL_CHEST_CARDS;
  const card = deck[Math.floor(Math.random() * deck.length)];
  const activePlayers = getActiveVerticalPlayers(game).filter((item) => item.clientId !== player.clientId);
  game.vertical.lastCard = { deckType, text: card.text };

  if (card.cash) applyVerticalCash(game, player, card.cash);

  if (card.collectFromEach) {
    activePlayers.forEach((other) => {
      applyVerticalCash(game, other, -card.collectFromEach, player.clientId);
      applyVerticalCash(game, player, card.collectFromEach);
    });
  }

  if (card.payEach) {
    activePlayers.forEach((other) => {
      applyVerticalCash(game, player, -card.payEach, other.clientId);
      applyVerticalCash(game, other, card.payEach);
    });
  }

  if (card.goToJail) sendVerticalPlayerToJail(game, player);

  if (Number.isInteger(card.moveTo)) {
    if (card.collectStart && card.moveTo <= player.position) {
      applyVerticalCash(game, player, VERTICAL_PASS_START_BONUS);
    }
    player.position = card.moveTo;
  }

  return card;
}

function resolveVerticalLanding(game, player) {
  const square = VERTICAL_BOARD[player.position];
  const ownership = getVerticalOwnership(game, square.id);
  game.vertical.lastCard = null;

  if (verticalSquareIsPurchasable(square)) {
    if (!ownership) {
      game.vertical.phase = "await_property";
      game.vertical.message = `${player.name} puede adquirir ${square.name} por $${square.price}.`;
      return;
    }

    if (ownership.ownerClientId !== player.clientId && !ownership.mortgaged) {
      const owner = getVerticalPlayer(game, ownership.ownerClientId);
      const rent = getVerticalRent(game, square, game.vertical.lastRollTotal);

      if (owner && !owner.bankrupt && rent > 0) {
        applyVerticalCash(game, player, -rent, owner.clientId);
        applyVerticalCash(game, owner, rent);
        game.vertical.message = `${player.name} pagó $${rent} de renta a ${owner.name}.`;
      }
    } else if (ownership.mortgaged) {
      game.vertical.message = `${square.name} está hipotecada y no cobra renta.`;
    } else {
      game.vertical.message = `${player.name} llegó a una actividad de su propia cadena.`;
    }
  } else if (square.type === "tax") {
    applyVerticalCash(game, player, -square.amount);
    game.vertical.message = `${player.name} pagó $${square.amount} por ${square.name.toLowerCase()}.`;
  } else if (square.type === "goToJail") {
    sendVerticalPlayerToJail(game, player);
    game.vertical.message = `${player.name} fue enviado a la cárcel por una auditoría regulatoria.`;
  } else if (square.type === "fortune" || square.type === "chest") {
    const card = drawVerticalBusinessCard(game, player, square.type);
    game.vertical.message = card.text;
  } else if (square.type === "start") {
    game.vertical.message = `${player.name} consolidó un nuevo ciclo de operaciones.`;
  } else if (square.type === "jail") {
    game.vertical.message = `${player.name} visita la auditoría regulatoria.`;
  } else {
    game.vertical.message = `${player.name} hace una pausa estratégica sin costos.`;
  }

  game.vertical.phase = player.cash < 0 ? "debt" : "await_end";
}

function rollVerticalDice(pin, player) {
  const game = games.get(pin);
  const current = game ? getCurrentVerticalPlayer(game) : null;

  if (!game || game.status !== "vertical" || !current || current.clientId !== player.clientId) {
    return { ok: false, message: "No es tu turno." };
  }

  if (game.vertical.phase !== "await_roll") {
    return { ok: false, message: "Los dados no están disponibles ahora." };
  }

  const die1 = Math.floor(Math.random() * 6) + 1;
  const die2 = Math.floor(Math.random() * 6) + 1;
  const total = die1 + die2;
  const isDouble = die1 === die2;
  game.vertical.lastRoll = [die1, die2];
  game.vertical.lastRollTotal = total;

  if (current.inJail) {
    if (!isDouble && current.jailTurns < 2) {
      current.jailTurns++;
      game.vertical.phase = "await_end";
      game.vertical.message = `${current.name} no obtuvo dobles y continúa en la cárcel (${current.jailTurns}/3).`;
      emitVerticalState(pin, game);
      return { ok: true };
    }

    if (!isDouble) applyVerticalCash(game, current, -VERTICAL_JAIL_FINE);
    current.inJail = false;
    current.jailTurns = 0;
    game.vertical.extraRoll = false;
  } else {
    current.doubleStreak = isDouble ? current.doubleStreak + 1 : 0;

    if (current.doubleStreak >= 3) {
      sendVerticalPlayerToJail(game, current);
      game.vertical.phase = "await_end";
      game.vertical.message = `${current.name} obtuvo tres dobles y fue enviado a la cárcel regulatoria.`;
      emitVerticalState(pin, game);
      return { ok: true };
    }

    game.vertical.extraRoll = isDouble;
  }

  const previousPosition = current.position;
  current.position = (current.position + total) % VERTICAL_BOARD.length;

  if (current.position < previousPosition) {
    applyVerticalCash(game, current, VERTICAL_PASS_START_BONUS);
  }

  resolveVerticalLanding(game, current);
  emitVerticalState(pin, game);
  return { ok: true };
}

function buyVerticalSquare(pin, player) {
  const game = games.get(pin);
  const current = game ? getCurrentVerticalPlayer(game) : null;
  const square = current ? VERTICAL_BOARD[current.position] : null;

  if (!game || game.status !== "vertical" || current?.clientId !== player.clientId) {
    return { ok: false, message: "No es tu turno." };
  }

  if (game.vertical.phase !== "await_property" || !verticalSquareIsPurchasable(square)) {
    return { ok: false, message: "No hay una adquisición pendiente." };
  }

  if (getVerticalOwnership(game, square.id)) {
    return { ok: false, message: "Esa actividad ya tiene propietario." };
  }

  if (current.cash < square.price) {
    return { ok: false, message: "No tienes efectivo suficiente." };
  }

  current.cash -= square.price;
  game.vertical.ownership[square.id] = {
    ownerClientId: current.clientId,
    mortgaged: false,
    improvements: 0
  };
  game.vertical.phase = "await_end";
  game.vertical.message = `${current.name} adquirió ${square.name} por $${square.price}.`;
  emitVerticalState(pin, game);
  return { ok: true };
}

function skipVerticalPurchase(pin, player) {
  const game = games.get(pin);
  const current = game ? getCurrentVerticalPlayer(game) : null;

  if (!game || game.status !== "vertical" || current?.clientId !== player.clientId || game.vertical.phase !== "await_property") {
    return { ok: false, message: "No hay una adquisición pendiente." };
  }

  const square = VERTICAL_BOARD[current.position];
  game.vertical.phase = current.cash < 0 ? "debt" : "await_end";
  game.vertical.message = `${current.name} decidió no adquirir ${square.name}.`;
  emitVerticalState(pin, game);
  return { ok: true };
}

function getVerticalTradeSquare(squareId) {
  const square = VERTICAL_BOARD.find((item) => item.id === String(squareId || ""));
  return square?.type === "property" ? square : null;
}

function createVerticalTradeOffer(pin, player, payload = {}) {
  const game = games.get(pin);
  const proposer = game ? getVerticalPlayer(game, player.clientId) : null;
  const square = getVerticalTradeSquare(payload.squareId);
  const ownership = square ? getVerticalOwnership(game, square.id) : null;
  const amount = Math.max(0, Math.floor(Number(payload.amount) || 0));
  const direction = String(payload.direction || "");

  if (!game || game.status !== "vertical" || !proposer || proposer.bankrupt) {
    return { ok: false, message: "No puedes negociar en este momento." };
  }

  if (game.vertical.tradeOffer) {
    return { ok: false, message: "Ya hay una negociación pendiente." };
  }

  if (!square || !ownership) {
    return { ok: false, message: "Esa propiedad no está disponible para negociar." };
  }

  if ((ownership.improvements || 0) > 0) {
    return { ok: false, message: "Vende primero los activos de mejora de esa propiedad." };
  }

  const owner = getVerticalPlayer(game, ownership.ownerClientId);
  if (!owner || owner.bankrupt) {
    return { ok: false, message: "El propietario no está disponible." };
  }

  if (amount <= 0) {
    return { ok: false, message: "Escribe un monto mayor que cero." };
  }

  let sellerClientId = ownership.ownerClientId;
  let buyerClientId = null;

  if (direction === "sell") {
    if (ownership.ownerClientId !== proposer.clientId) {
      return { ok: false, message: "Solo el propietario puede ofrecer vender." };
    }
    buyerClientId = String(payload.counterpartyClientId || "");
  } else if (direction === "buy") {
    if (ownership.ownerClientId === proposer.clientId) {
      return { ok: false, message: "Ya eres propietario de esa propiedad." };
    }
    buyerClientId = proposer.clientId;
  } else {
    return { ok: false, message: "Tipo de negociación inválido." };
  }

  const buyer = getVerticalPlayer(game, buyerClientId);
  if (!buyer || buyer.bankrupt || buyer.clientId === sellerClientId) {
    return { ok: false, message: "Selecciona un comprador válido." };
  }

  game.vertical.tradeOfferSequence = (game.vertical.tradeOfferSequence || 0) + 1;
  game.vertical.tradeOffer = {
    id: `vertical-offer-${game.vertical.turnNumber}-${game.vertical.tradeOfferSequence}`,
    direction,
    squareId: square.id,
    sellerClientId,
    buyerClientId,
    proposerClientId: proposer.clientId,
    amount,
    status: "pending",
    createdAt: Date.now()
  };
  game.vertical.message = direction === "sell"
    ? `${proposer.name} ofreció vender ${square.name} a ${buyer.name} por $${amount}.`
    : `${proposer.name} ofreció comprar ${square.name} a ${owner.name} por $${amount}.`;

  emitVerticalState(pin, game);
  return { ok: true };
}

function respondVerticalTradeOffer(pin, player, offerId, accept) {
  const game = games.get(pin);
  const responder = game ? getVerticalPlayer(game, player.clientId) : null;
  const offer = game?.vertical?.tradeOffer;

  if (!game || game.status !== "vertical" || !responder || responder.bankrupt || !offer) {
    return { ok: false, message: "No hay una negociación pendiente." };
  }

  if (offer.id !== String(offerId || "")) {
    return { ok: false, message: "La oferta ya no está disponible." };
  }

  const responderClientId = offer.direction === "sell"
    ? offer.buyerClientId
    : offer.sellerClientId;
  if (responder.clientId !== responderClientId) {
    return { ok: false, message: "Esa oferta no está dirigida a ti." };
  }

  const square = getVerticalTradeSquare(offer.squareId);
  const ownership = square ? getVerticalOwnership(game, square.id) : null;
  const seller = getVerticalPlayer(game, offer.sellerClientId);
  const buyer = getVerticalPlayer(game, offer.buyerClientId);

  if (!square || !ownership || ownership.ownerClientId !== offer.sellerClientId || !seller || !buyer || seller.bankrupt || buyer.bankrupt) {
    game.vertical.tradeOffer = null;
    game.vertical.message = "La negociación ya no era válida.";
    emitVerticalState(pin, game);
    return { ok: false, message: "La negociación ya no era válida." };
  }

  if ((ownership.improvements || 0) > 0) {
    game.vertical.tradeOffer = null;
    game.vertical.message = "La negociación se canceló porque la propiedad tiene activos instalados.";
    emitVerticalState(pin, game);
    return { ok: false, message: "La propiedad tiene activos instalados." };
  }

  if (!accept) {
    game.vertical.tradeOffer = null;
    game.vertical.message = `${responder.name} rechazó la oferta por ${square.name}.`;
    emitVerticalState(pin, game);
    return { ok: true };
  }

  if (buyer.cash < offer.amount) {
    return { ok: false, message: "El comprador no tiene efectivo suficiente." };
  }

  buyer.cash -= offer.amount;
  seller.cash += offer.amount;
  ownership.ownerClientId = buyer.clientId;
  game.vertical.tradeOffer = null;
  game.vertical.message = `${buyer.name} compró ${square.name} a ${seller.name} por $${offer.amount}.`;

  const current = getCurrentVerticalPlayer(game);
  if (current?.cash >= 0 && game.vertical.phase === "debt") {
    game.vertical.phase = "await_end";
    game.vertical.pendingCreditorClientId = null;
  }

  emitVerticalState(pin, game);
  return { ok: true };
}

function cancelVerticalTradeOffer(pin, player, offerId) {
  const game = games.get(pin);
  const proposer = game ? getVerticalPlayer(game, player.clientId) : null;
  const offer = game?.vertical?.tradeOffer;

  if (!game || game.status !== "vertical" || !proposer || !offer) {
    return { ok: false, message: "No hay una negociación pendiente." };
  }

  if (offer.id !== String(offerId || "") || offer.proposerClientId !== proposer.clientId) {
    return { ok: false, message: "Solo quien hizo la oferta puede cancelarla." };
  }

  const square = getVerticalTradeSquare(offer.squareId);
  game.vertical.tradeOffer = null;
  game.vertical.message = `${proposer.name} canceló la oferta por ${square?.name || "la propiedad"}.`;
  emitVerticalState(pin, game);
  return { ok: true };
}

function canBuildVerticalProperty(game, player, square, ownership) {
  if (!square || square.type !== "property" || !ownership) return false;
  if (ownership.ownerClientId !== player.clientId || ownership.mortgaged || ownership.improvements >= 3) return false;
  if (!ownsVerticalCompany(game, player.clientId, square.companyId)) return false;

  const groupOwnership = getVerticalCompanySquares(square.companyId).map((item) => {
    return getVerticalOwnership(game, item.id);
  });
  if (groupOwnership.some((item) => item?.mortgaged)) return false;
  const minimumImprovements = Math.min(...groupOwnership.map((item) => item.improvements || 0));
  return ownership.improvements === minimumImprovements && player.cash >= square.improvementCost;
}

function canSellVerticalImprovement(game, player, square, ownership) {
  if (!square || square.type !== "property" || !ownership || ownership.ownerClientId !== player.clientId) return false;
  if (ownership.improvements <= 0) return false;
  const maximumImprovements = Math.max(...getVerticalCompanySquares(square.companyId).map((item) => {
    return getVerticalOwnership(game, item.id)?.improvements || 0;
  }));
  return ownership.improvements === maximumImprovements;
}

function manageVerticalAsset(pin, player, squareId, action) {
  const game = games.get(pin);
  const current = game ? getCurrentVerticalPlayer(game) : null;
  const square = VERTICAL_BOARD.find((item) => item.id === String(squareId || ""));
  const ownership = square ? getVerticalOwnership(game, square.id) : null;

  if (!game || game.status !== "vertical" || current?.clientId !== player.clientId) {
    return { ok: false, message: "Solo puedes administrar activos durante tu turno." };
  }

  if (!ownership || ownership.ownerClientId !== player.clientId) {
    return { ok: false, message: "Ese activo no te pertenece." };
  }

  if (action === "build") {
    if (!canBuildVerticalProperty(game, current, square, ownership)) {
      return { ok: false, message: "Necesitas la compañía completa, liquidez y mejoras equilibradas." };
    }
    current.cash -= square.improvementCost;
    ownership.improvements++;
    game.vertical.message = `${current.name} instaló ${square.equipmentName} en ${square.name}.`;
  } else if (action === "sell") {
    if (!canSellVerticalImprovement(game, current, square, ownership)) {
      return { ok: false, message: "No puedes vender esa mejora en este momento." };
    }
    ownership.improvements--;
    current.cash += Math.floor(square.improvementCost / 2);
    game.vertical.message = `${current.name} vendió una mejora de ${square.name}.`;
  } else if (action === "mortgage") {
    const companyHasImprovements = square.type === "property" && getVerticalCompanySquares(square.companyId).some((item) => {
      return (getVerticalOwnership(game, item.id)?.improvements || 0) > 0;
    });
    if (ownership.mortgaged || companyHasImprovements) {
      return { ok: false, message: "Vende primero las mejoras de la compañía." };
    }
    ownership.mortgaged = true;
    current.cash += square.mortgageValue;
    game.vertical.message = `${current.name} hipotecó ${square.name} por $${square.mortgageValue}.`;
  } else if (action === "unmortgage") {
    const cost = Math.ceil(square.mortgageValue * 1.1);
    if (!ownership.mortgaged || current.cash < cost) {
      return { ok: false, message: `Necesitas $${cost} para levantar la hipoteca.` };
    }
    ownership.mortgaged = false;
    current.cash -= cost;
    game.vertical.message = `${current.name} levantó la hipoteca de ${square.name}.`;
  } else {
    return { ok: false, message: "Acción de activo inválida." };
  }

  if (current.cash >= 0 && game.vertical.phase === "debt") {
    game.vertical.phase = "await_end";
    game.vertical.pendingCreditorClientId = null;
  }

  emitVerticalState(pin, game);
  return { ok: true };
}

function payVerticalJailFine(pin, player) {
  const game = games.get(pin);
  const current = game ? getCurrentVerticalPlayer(game) : null;

  if (!game || game.status !== "vertical" || current?.clientId !== player.clientId || game.vertical.phase !== "await_roll" || !current.inJail) {
    return { ok: false, message: "No puedes pagar una salida de auditoría ahora." };
  }

  if (current.cash < VERTICAL_JAIL_FINE) {
    return { ok: false, message: "No tienes efectivo suficiente." };
  }

  current.cash -= VERTICAL_JAIL_FINE;
  current.inJail = false;
  current.jailTurns = 0;
  game.vertical.message = `${current.name} pagó $${VERTICAL_JAIL_FINE} y salió de la cárcel regulatoria.`;
  emitVerticalState(pin, game);
  return { ok: true };
}

function finishVerticalGame(pin) {
  const game = games.get(pin);
  if (!game?.vertical) return;

  const ranking = [...game.vertical.players]
    .map((player) => ({
      name: player.name,
      bankrupt: player.bankrupt,
      ...getVerticalFinancials(game, player)
    }))
    .sort((a, b) => Number(a.bankrupt) - Number(b.bankrupt) || b.netWorth - a.netWorth)
    .map((player, index) => ({ ...player, position: index + 1 }));
  const winner = ranking[0] || null;
  game.status = "vertical_result";
  game.vertical.lastResult = { winnerName: winner?.name || "", ranking };
  io.to(pin).emit("vertical_finished", {
    game: publicGame(game),
    ...game.vertical.lastResult
  });
}

function endVerticalTurn(pin, player) {
  const game = games.get(pin);
  const current = game ? getCurrentVerticalPlayer(game) : null;

  if (!game || game.status !== "vertical" || current?.clientId !== player.clientId) {
    return { ok: false, message: "No es tu turno." };
  }

  if (current.cash < 0 || game.vertical.phase === "debt") {
    return { ok: false, message: "Resuelve tu deuda antes de terminar el turno." };
  }

  if (game.vertical.phase !== "await_end") {
    return { ok: false, message: "Todavía tienes una acción pendiente." };
  }

  if (game.vertical.tradeOffer) {
    return { ok: false, message: "Resuelve la negociación pendiente antes del siguiente turno." };
  }

  if (game.vertical.extraRoll && !current.inJail) {
    game.vertical.extraRoll = false;
    game.vertical.phase = "await_roll";
    game.vertical.message = `${current.name} obtuvo dobles y vuelve a lanzar.`;
  } else {
    current.doubleStreak = 0;
    game.vertical.currentPlayerIndex = getNextVerticalPlayerIndex(game, game.vertical.currentPlayerIndex);
    const nextPlayer = getCurrentVerticalPlayer(game);
    game.vertical.phase = nextPlayer?.cash < 0 ? "debt" : "await_roll";
    game.vertical.lastRoll = [];
    game.vertical.lastRollTotal = 0;
    game.vertical.pendingCreditorClientId = null;
    game.vertical.turnNumber++;
    game.vertical.message = nextPlayer?.cash < 0
      ? `${nextPlayer.name} debe resolver su deuda antes de continuar.`
      : `Turno de ${nextPlayer?.name || "Jugador"}.`;
  }

  emitVerticalState(pin, game);
  return { ok: true };
}

function declareVerticalBankruptcy(pin, player) {
  const game = games.get(pin);
  const current = game ? getCurrentVerticalPlayer(game) : null;

  if (!game || game.status !== "vertical" || current?.clientId !== player.clientId || current.cash >= 0) {
    return { ok: false, message: "No puedes declarar insolvencia ahora." };
  }

  const creditor = getVerticalPlayer(game, game.vertical.pendingCreditorClientId);
  if (game.vertical.tradeOffer && (
    game.vertical.tradeOffer.sellerClientId === current.clientId ||
    game.vertical.tradeOffer.buyerClientId === current.clientId ||
    game.vertical.tradeOffer.proposerClientId === current.clientId
  )) {
    game.vertical.tradeOffer = null;
  }

  Object.keys(game.vertical.ownership).forEach((squareId) => {
    const ownership = game.vertical.ownership[squareId];
    if (ownership.ownerClientId !== current.clientId) return;

    if (creditor && !creditor.bankrupt) {
      ownership.ownerClientId = creditor.clientId;
      ownership.improvements = 0;
    } else {
      delete game.vertical.ownership[squareId];
    }
  });

  current.cash = 0;
  current.bankrupt = true;
  current.inJail = false;
  game.vertical.message = `${current.name} salió del mercado por insolvencia.`;

  if (getActiveVerticalPlayers(game).length <= 1) {
    finishVerticalGame(pin);
    return { ok: true };
  }

  game.vertical.currentPlayerIndex = getNextVerticalPlayerIndex(game, game.vertical.currentPlayerIndex);
  const nextPlayer = getCurrentVerticalPlayer(game);
  game.vertical.phase = nextPlayer?.cash < 0 ? "debt" : "await_roll";
  game.vertical.lastRoll = [];
  game.vertical.pendingCreditorClientId = null;
  game.vertical.message += nextPlayer?.cash < 0
    ? ` ${nextPlayer.name} debe resolver una deuda.`
    : ` Turno de ${nextPlayer?.name || "Jugador"}.`;
  emitVerticalState(pin, game);
  return { ok: true };
}

const LAST_CARD_COLORS = ["red", "yellow", "green", "blue"];
const LAST_CARD_OPPONENT_DELAY_MS = 2000;

function createLastCardDeck(playerCount = 3, generation = 0) {
  const deck = [];
  let cardId = 0;
  const includeReverse = Number(playerCount) !== 2;
  const actionTypes = includeReverse
    ? ["skip", "reverse", "draw2"]
    : ["skip", "draw2"];
  const nextCardId = () => `last-card-${generation}-${cardId++}`;

  LAST_CARD_COLORS.forEach((color) => {
    deck.push({ id: nextCardId(), color, type: "number", value: "0" });

    for (let value = 1; value <= 9; value++) {
      for (let copy = 0; copy < 2; copy++) {
        deck.push({
          id: nextCardId(),
          color,
          type: "number",
          value: String(value)
        });
      }
    }

    actionTypes.forEach((type) => {
      for (let copy = 0; copy < 2; copy++) {
        deck.push({ id: nextCardId(), color, type, value: type });
      }
    });
  });

  for (let copy = 0; copy < 4; copy++) {
    deck.push({ id: nextCardId(), color: "wild", type: "wild", value: "wild" });
    deck.push({ id: nextCardId(), color: "wild", type: "wild4", value: "wild4" });
  }

  return shuffleArray(deck);
}

function getLastCardSymbol(card) {
  if (!card) return "";
  if (card.type === "skip") return "SALTA";
  if (card.type === "reverse") return "REVERSA";
  if (card.type === "draw2") return "+2";
  if (card.type === "wild") return "COLOR";
  if (card.type === "wild4") return "+4";
  return card.value;
}

function getPublicLastCard(card, playable = false) {
  if (!card) return null;

  return {
    id: card.id,
    color: card.color,
    type: card.type,
    value: card.value,
    symbol: getLastCardSymbol(card),
    playable
  };
}

function getLastCardPlayer(game, clientId) {
  return game.lastCard?.players.find((player) => player.clientId === clientId) || null;
}

function getCurrentLastCardPlayer(game) {
  return game.lastCard?.players[game.lastCard.currentPlayerIndex] || null;
}

function getLastCardAppPlayer(game, clientId) {
  return game.players.find((player) => player.clientId === clientId) || null;
}

function clearLastCardTimer(game) {
  if (!game?.lastCard?.actionTimer) return;

  clearTimeout(game.lastCard.actionTimer);
  game.lastCard.actionTimer = null;
}

function clearLastCardCallTimer(game) {
  if (!game?.lastCard?.callEnableTimer) return;

  clearTimeout(game.lastCard.callEnableTimer);
  game.lastCard.callEnableTimer = null;
}

function createInactiveLastCardCall() {
  return {
    active: false,
    targetPlayerId: null,
    nextPlayerId: null,
    openedAt: null,
    opponentsEnabledAt: null,
    resolved: false,
    resolvedByPlayerId: null,
    result: null
  };
}

function getPublicLastCardCall(game, viewerClientId) {
  const call = game.lastCard?.lastCardCall || createInactiveLastCardCall();
  const now = Date.now();
  const targetPlayer = getLastCardAppPlayer(game, call.targetPlayerId);
  const nextPlayer = getLastCardAppPlayer(game, call.nextPlayerId);
  const resolvedByPlayer = getLastCardAppPlayer(game, call.resolvedByPlayerId);
  const isTarget = viewerClientId === call.targetPlayerId;
  const opponentsEnabled = Boolean(
    call.active &&
    !call.resolved &&
    call.opponentsEnabledAt &&
    now >= call.opponentsEnabledAt
  );

  return {
    active: Boolean(call.active),
    targetPlayerId: targetPlayer?.id || null,
    nextPlayerId: nextPlayer?.id || null,
    openedAt: call.openedAt,
    opponentsEnabledAt: call.opponentsEnabledAt,
    resolved: Boolean(call.resolved),
    resolvedByPlayerId: resolvedByPlayer?.id || null,
    result: call.result,
    serverNow: now,
    opponentsEnableInMs: call.active && !isTarget
      ? Math.max(0, call.opponentsEnabledAt - now)
      : 0,
    isTarget,
    canPress: Boolean(call.active && !call.resolved && (isTarget || opponentsEnabled))
  };
}

function resolveLastCardCall(game, result, resolvedByPlayerId, message) {
  const call = game.lastCard?.lastCardCall;

  if (!call?.active || call.resolved) return false;

  call.resolved = true;
  call.active = false;
  call.resolvedByPlayerId = resolvedByPlayerId || null;
  call.result = result;
  game.lastCard.callMessage = message;
  clearLastCardCallTimer(game);
  return true;
}

function expireLastCardCallForAction(game, actingPlayerId) {
  const call = game.lastCard?.lastCardCall;

  if (!call?.active || call.resolved || call.nextPlayerId !== actingPlayerId) {
    return false;
  }

  const target = getLastCardPlayer(game, call.targetPlayerId);
  return resolveLastCardCall(
    game,
    "expired",
    actingPlayerId,
    `La oportunidad de señalar a ${target?.name || "ese jugador"} terminó.`
  );
}

function openLastCardCall(pin, game, targetPlayerId, nextPlayerId) {
  clearLastCardCallTimer(game);

  const openedAt = Date.now();
  const target = getLastCardPlayer(game, targetPlayerId);

  game.lastCard.lastCardCall = {
    active: true,
    targetPlayerId,
    nextPlayerId,
    openedAt,
    opponentsEnabledAt: openedAt + LAST_CARD_OPPONENT_DELAY_MS,
    resolved: false,
    resolvedByPlayerId: null,
    result: null
  };
  game.lastCard.callMessage = `${target?.name || "Un jugador"} quedó con una carta.`;

  game.lastCard.callEnableTimer = setTimeout(() => {
    const latestGame = games.get(pin);
    const latestCall = latestGame?.lastCard?.lastCardCall;

    if (
      latestGame?.status !== "last_card" ||
      !latestCall?.active ||
      latestCall.resolved ||
      latestCall.openedAt !== openedAt
    ) {
      return;
    }

    latestGame.lastCard.callEnableTimer = null;
    emitLastCardState(pin, latestGame);
  }, LAST_CARD_OPPONENT_DELAY_MS);
}

function handleLastCardCall(pin, player) {
  const game = games.get(pin);

  if (!game || game.status !== "last_card" || !game.lastCard) {
    return { ok: false, message: "ÚLTIMA CARTA no está activo." };
  }

  const call = game.lastCard.lastCardCall;

  if (!call?.active || call.resolved) {
    return { ok: false, message: "No hay una ventana de ¡ÚLTIMA CARTA! activa." };
  }

  const now = Date.now();
  const isTarget = player.clientId === call.targetPlayerId;

  if (!isTarget && now < call.opponentsEnabledAt) {
    return {
      ok: false,
      message: "Todavía no puedes señalar al jugador."
    };
  }

  const target = getLastCardPlayer(game, call.targetPlayerId);

  if (isTarget) {
    resolveLastCardCall(
      game,
      "declared",
      player.clientId,
      `${target?.name || player.name} declaró ¡ÚLTIMA CARTA! a tiempo.`
    );
  } else {
    const caller = getLastCardPlayer(game, player.clientId);

    resolveLastCardCall(
      game,
      "caught",
      player.clientId,
      `${caller?.name || player.name} señaló a ${target?.name || "ese jugador"}. ` +
        `${target?.name || "El jugador"} roba 2 cartas.`
    );

    if (target) {
      drawLastCards(game, target, 2);
    }
  }

  emitLastCardState(pin, game);

  return {
    ok: true,
    result: game.lastCard.lastCardCall.result
  };
}

function refillLastCardDrawPile(game) {
  if (game.lastCard.drawPile.length) return;

  game.lastCard.deckGeneration = (game.lastCard.deckGeneration || 0) + 1;
  game.lastCard.drawPile = createLastCardDeck(
    game.lastCard.players.length,
    game.lastCard.deckGeneration
  );
}

function drawLastCards(game, player, amount) {
  const drawnCards = [];

  for (let count = 0; count < amount; count++) {
    refillLastCardDrawPile(game);

    const card = game.lastCard.drawPile.pop();
    if (!card) break;

    player.hand.push(card);
    drawnCards.push(card);
  }

  return drawnCards;
}

function takeInitialLastCard(game) {
  let startingCardIndex = game.lastCard.drawPile.findIndex((card) => {
    return card.type === "number";
  });

  if (startingCardIndex < 0) {
    game.lastCard.deckGeneration = (game.lastCard.deckGeneration || 0) + 1;
    game.lastCard.drawPile.push(...createLastCardDeck(
      game.lastCard.players.length,
      game.lastCard.deckGeneration
    ));
    startingCardIndex = game.lastCard.drawPile.findIndex((card) => {
      return card.type === "number";
    });
  }

  const [startingCard] = game.lastCard.drawPile.splice(startingCardIndex, 1);
  return startingCard;
}

function hasLastCardColorMatch(game, player, excludedCardId = null) {
  return player.hand.some((card) => {
    return card.id !== excludedCardId && card.color === game.lastCard.currentColor;
  });
}

function isLastCardPlayable(game, player, card) {
  if (!game?.lastCard || !player || !card) return false;

  if (game.lastCard.drawnCardId && card.id !== game.lastCard.drawnCardId) return false;

  if (card.type === "wild4") {
    return !hasLastCardColorMatch(game, player, card.id);
  }

  if (card.color === "wild") return true;
  if (card.color === game.lastCard.currentColor) return true;

  const topCard = game.lastCard.discardPile[game.lastCard.discardPile.length - 1];
  return Boolean(topCard && card.value === topCard.value);
}

function getPublicLastCardState(game, viewerSocketId) {
  const viewer = game.players.find((player) => player.id === viewerSocketId);
  const viewerState = viewer ? getLastCardPlayer(game, viewer.clientId) : null;
  const currentPlayer = getCurrentLastCardPlayer(game);
  const currentAppPlayer = currentPlayer
    ? getLastCardAppPlayer(game, currentPlayer.clientId)
    : null;
  const isViewerTurn = Boolean(viewerState && currentPlayer?.clientId === viewerState.clientId);
  const topCard = game.lastCard.discardPile[game.lastCard.discardPile.length - 1];

  return {
    players: game.lastCard.players.map((player) => {
      const appPlayer = getLastCardAppPlayer(game, player.clientId);

      return {
        playerId: appPlayer?.id || null,
        playerName: appPlayer?.name || player.name,
        cardCount: player.hand.length,
        isCurrent: player.clientId === currentPlayer?.clientId
      };
    }),
    hand: (viewerState?.hand || []).map((card) => {
      return getPublicLastCard(card, isViewerTurn && isLastCardPlayable(game, viewerState, card));
    }),
    topCard: getPublicLastCard(topCard),
    currentColor: game.lastCard.currentColor,
    drawPileCount: game.lastCard.drawPile.length,
    drawPileInfinite: true,
    currentPlayerId: currentAppPlayer?.id || null,
    currentPlayerName: currentAppPlayer?.name || currentPlayer?.name || "Jugador",
    isYourTurn: isViewerTurn,
    canDraw: isViewerTurn && !game.lastCard.drawnCardId,
    canPass: isViewerTurn && Boolean(game.lastCard.drawnCardId),
    lastCardCall: getPublicLastCardCall(game, viewer?.clientId || null),
    drawnCardId: isViewerTurn ? game.lastCard.drawnCardId : null,
    direction: game.lastCard.direction,
    message: game.lastCard.message,
    callMessage: game.lastCard.callMessage || "",
    durationMs: game.lastCard.actionTimeoutMs,
    endAt: game.lastCard.endAt
  };
}

function emitLastCardState(pin, game) {
  game.players.forEach((player) => {
    io.to(player.id).emit("last_card_state", {
      game: publicGame(game),
      lastCardState: getPublicLastCardState(game, player.id)
    });
  });
}

function startLastCardIntro(pin) {
  const game = games.get(pin);

  if (!game) return;

  game.status = "last_card_intro";
  game.lastCard = {
    ...getCampaignLastCardSettings(game),
    players: [],
    drawPile: [],
    discardPile: [],
    currentColor: null,
    deckGeneration: 0,
    currentPlayerIndex: 0,
    direction: 1,
    drawnCardId: null,
    message: "",
    endAt: null,
    actionTimer: null,
    callEnableTimer: null,
    lastCardCall: createInactiveLastCardCall(),
    callMessage: "",
    awaitingContinue: false,
    lastResult: null
  };

  io.to(pin).emit("last_card_intro", {
    game: publicGame(game)
  });
}

function beginLastCard(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "last_card_guide" || !game.lastCard) return;

  game.status = "last_card";
  game.lastCard.players = game.players.map((player) => ({
    clientId: player.clientId,
    name: player.name,
    hand: []
  }));
  game.lastCard.deckGeneration = 0;
  game.lastCard.drawPile = createLastCardDeck(game.lastCard.players.length, 0);

  for (let cardIndex = 0; cardIndex < game.lastCard.initialHandSize; cardIndex++) {
    game.lastCard.players.forEach((player) => {
      drawLastCards(game, player, 1);
    });
  }

  const startingCard = takeInitialLastCard(game);
  game.lastCard.discardPile = [startingCard];
  game.lastCard.currentColor = startingCard.color;
  game.lastCard.currentPlayerIndex = 0;
  game.lastCard.direction = 1;
  game.lastCard.drawnCardId = null;
  game.lastCard.message = `${game.lastCard.players[0].name} comienza.`;
  game.lastCard.lastCardCall = createInactiveLastCardCall();
  game.lastCard.callMessage = "";

  startLastCardTurnTimer(pin, game);
  emitLastCardState(pin, game);
}

function showLastCardGuide(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "last_card_intro" || !game.lastCard) return;

  game.status = "last_card_guide";
  io.to(pin).emit("last_card_guide", {
    game: publicGame(game)
  });
}

function moveLastCardIndex(game, fromIndex, steps = 1) {
  const totalPlayers = game.lastCard.players.length;
  let index = fromIndex;

  for (let step = 0; step < steps; step++) {
    index = (index + game.lastCard.direction + totalPlayers) % totalPlayers;
  }

  return index;
}

function startLastCardTurnTimer(pin, game) {
  clearLastCardTimer(game);
  game.lastCard.endAt = Date.now() + game.lastCard.actionTimeoutMs;
  game.lastCard.actionTimer = setTimeout(() => {
    handleLastCardTurnTimeout(pin);
  }, game.lastCard.actionTimeoutMs + 100);
}

function handleLastCardTurnTimeout(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "last_card" || !game.lastCard) return;

  const player = getCurrentLastCardPlayer(game);
  if (!player) return;

  expireLastCardCallForAction(game, player.clientId);

  if (!game.lastCard.drawnCardId) {
    drawLastCards(game, player, 1);
  }

  game.lastCard.message = `${player.name} agotó su tiempo y perdió el turno.`;
  advanceLastCardTurn(pin, game, null);
}

function advanceLastCardTurn(pin, game, playedCard, callTargetPlayerId = null) {
  clearLastCardTimer(game);

  let steps = 1;

  if (playedCard?.type === "reverse") {
    game.lastCard.direction *= -1;
    steps = game.lastCard.players.length === 2 ? 2 : 1;
  } else if (playedCard?.type === "skip") {
    steps = 2;
  } else if (playedCard?.type === "draw2" || playedCard?.type === "wild4") {
    const penalty = playedCard.type === "draw2" ? 2 : 4;
    const penalizedIndex = moveLastCardIndex(game, game.lastCard.currentPlayerIndex, 1);
    const penalizedPlayer = game.lastCard.players[penalizedIndex];

    drawLastCards(game, penalizedPlayer, penalty);
    game.lastCard.message += ` ${penalizedPlayer.name} roba ${penalty} y pierde el turno.`;
    steps = 2;
  }

  game.lastCard.currentPlayerIndex = moveLastCardIndex(
    game,
    game.lastCard.currentPlayerIndex,
    steps
  );
  game.lastCard.drawnCardId = null;

  startLastCardTurnTimer(pin, game);

  if (callTargetPlayerId) {
    const nextPlayer = getCurrentLastCardPlayer(game);
    openLastCardCall(pin, game, callTargetPlayerId, nextPlayer?.clientId || null);
  }

  emitLastCardState(pin, game);
}

function playLastCard(pin, player, cardId, chosenColor) {
  const game = games.get(pin);

  if (!game || game.status !== "last_card" || !game.lastCard) {
    return { ok: false, message: "ÚLTIMA CARTA no está activo." };
  }

  const currentPlayer = getCurrentLastCardPlayer(game);
  if (!currentPlayer || currentPlayer.clientId !== player.clientId) {
    return { ok: false, message: "No es tu turno." };
  }

  const cardIndex = currentPlayer.hand.findIndex((card) => card.id === cardId);
  const card = currentPlayer.hand[cardIndex];

  if (!card || !isLastCardPlayable(game, currentPlayer, card)) {
    return { ok: false, message: "No puedes jugar esa carta." };
  }

  const needsColor = card.color === "wild";
  if (needsColor && !LAST_CARD_COLORS.includes(chosenColor)) {
    return { ok: false, message: "Elige el color que continuará." };
  }

  expireLastCardCallForAction(game, currentPlayer.clientId);

  const handCountBeforePlay = currentPlayer.hand.length;
  currentPlayer.hand.splice(cardIndex, 1);
  game.lastCard.discardPile.push(card);
  game.lastCard.currentColor = needsColor ? chosenColor : card.color;
  game.lastCard.drawnCardId = null;
  game.lastCard.message = `${currentPlayer.name} jugó ${getLastCardSymbol(card)}.`;

  if (!currentPlayer.hand.length) {
    finishLastCardGame(pin, currentPlayer);
    return { ok: true };
  }

  const opensLastCardCall =
    handCountBeforePlay === 2 && currentPlayer.hand.length === 1;

  advanceLastCardTurn(
    pin,
    game,
    card,
    opensLastCardCall ? currentPlayer.clientId : null
  );
  return { ok: true };
}

function drawLastCardForTurn(pin, player) {
  const game = games.get(pin);

  if (!game || game.status !== "last_card" || !game.lastCard) {
    return { ok: false, message: "ÚLTIMA CARTA no está activo." };
  }

  const currentPlayer = getCurrentLastCardPlayer(game);
  if (!currentPlayer || currentPlayer.clientId !== player.clientId) {
    return { ok: false, message: "No es tu turno." };
  }

  if (game.lastCard.drawnCardId) {
    return { ok: false, message: "Ya robaste una carta este turno." };
  }

  const [drawnCard] = drawLastCards(game, currentPlayer, 1);
  if (!drawnCard) return { ok: false, message: "No quedan cartas para robar." };

  expireLastCardCallForAction(game, currentPlayer.clientId);

  if (isLastCardPlayable(game, currentPlayer, drawnCard)) {
    game.lastCard.drawnCardId = drawnCard.id;
    game.lastCard.message = `${currentPlayer.name} robó una carta y puede jugarla o pasar.`;
    startLastCardTurnTimer(pin, game);
    emitLastCardState(pin, game);

    return { ok: true, canPlayDrawnCard: true };
  }

  game.lastCard.message = `${currentPlayer.name} robó una carta y perdió el turno.`;
  advanceLastCardTurn(pin, game, null);
  return { ok: true, canPlayDrawnCard: false };
}

function passLastCardTurn(pin, player) {
  const game = games.get(pin);

  if (!game || game.status !== "last_card" || !game.lastCard) {
    return { ok: false, message: "ÚLTIMA CARTA no está activo." };
  }

  const currentPlayer = getCurrentLastCardPlayer(game);
  if (!currentPlayer || currentPlayer.clientId !== player.clientId) {
    return { ok: false, message: "No es tu turno." };
  }

  if (!game.lastCard.drawnCardId) {
    return { ok: false, message: "Solo puedes pasar después de robar." };
  }

  expireLastCardCallForAction(game, currentPlayer.clientId);
  game.lastCard.message = `${currentPlayer.name} pasó.`;
  advanceLastCardTurn(pin, game, null);
  return { ok: true };
}

function getLastCardScore(card) {
  if (card.type === "number") return Number(card.value) || 0;
  if (card.type === "wild" || card.type === "wild4") return 50;
  return 20;
}

function finishLastCardGame(pin, winnerState) {
  const game = games.get(pin);

  if (!game || !game.lastCard) return;

  clearLastCardTimer(game);
  clearLastCardCallTimer(game);
  if (game.lastCard.lastCardCall?.active) {
    game.lastCard.lastCardCall.active = false;
    game.lastCard.lastCardCall.resolved = true;
    game.lastCard.lastCardCall.result = "expired";
  }
  game.status = "last_card_result";
  game.lastCard.awaitingContinue = true;

  const cardsScore = game.lastCard.players.reduce((total, player) => {
    if (player.clientId === winnerState.clientId) return total;
    return total + player.hand.reduce((subtotal, card) => subtotal + getLastCardScore(card), 0);
  }, 0);
  const roundPoints = game.lastCard.winnerBasePoints + cardsScore;
  const winner = getLastCardAppPlayer(game, winnerState.clientId);

  if (winner) winner.score += roundPoints;

  const result = {
    winnerId: winner?.id || null,
    winnerName: winner?.name || winnerState.name,
    roundPoints,
    playerResults: game.lastCard.players.map((player) => {
      const appPlayer = getLastCardAppPlayer(game, player.clientId);
      const remainingPoints = player.hand.reduce((total, card) => total + getLastCardScore(card), 0);

      return {
        playerId: appPlayer?.id || null,
        playerName: appPlayer?.name || player.name,
        remainingCards: player.hand.length,
        remainingPoints,
        isWinner: player.clientId === winnerState.clientId
      };
    }),
    ranking: getRanking(game)
  };

  game.lastCard.lastResult = result;

  io.to(pin).emit("last_card_finished", {
    game: publicGame(game),
    ...result
  });
}

function startPokerIntro(pin) {
  const game = games.get(pin);

  if (!game) return;

  const settings = sanitizePokerSettings(null, game);

  game.status = "poker_intro";
  game.poker = {
    settings,
    roundNumber: 0,
    tableReady: false
  };

  io.to(pin).emit("poker_intro", {
    game: publicGame(game),
    settings
  });
}

function updatePokerSettings(pin, rawSettings) {
  const game = games.get(pin);

  if (!game || game.status !== "poker_intro" || !game.poker) {
    return {
      ok: false,
      message: "La configuración de Poker no está disponible."
    };
  }

  game.poker.settings = sanitizePokerSettings(rawSettings, game);

  io.to(pin).emit("poker_settings_updated", {
    game: publicGame(game),
    settings: game.poker.settings
  });

  return {
    ok: true,
    settings: game.poker.settings
  };
}

function showPokerRankings(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "poker_intro" || !game.poker) return;

  game.status = "poker_rankings";

  io.to(pin).emit("poker_rankings", {
    game: publicGame(game),
    rankings: POKER_HAND_RANKINGS
  });
}

function beginPoker(pin) {
  const game = games.get(pin);

  if (
    !game ||
    !["poker_intro", "poker_rankings"].includes(game.status) ||
    !game.poker
  ) {
    return;
  }

  game.status = "poker";

  game.poker.roundNumber = 0;
  game.poker.dealerIndex = 0;
  game.poker.players = game.players.map((player, index) => ({
    id: player.id,
    name: player.name,
    seat: index,
    chips: game.poker.settings.initialChips,
    hand: [],
    committed: 0,
    folded: false,
    allIn: false,
    isDealer: false,
    isSmallBlind: false,
    isBigBlind: false
  }));

  startPokerHand(pin);
}

function startPokerHand(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "poker" || !game.poker) return;

  clearPokerActionTimer(game);

  game.poker.players.forEach((player) => {
    if (player.chips <= 0) {
      player.isOut = true;
      player.folded = true;
      player.hand = [];
    }
  });

  const activeIndexes = getPokerActivePlayerIndexes(game);

  if (activeIndexes.length < 2) {
    finishPokerGame(pin);
    return;
  }

  if (game.poker.roundNumber >= game.poker.settings.totalRounds) {
    finishPokerGame(pin);
    return;
  }

  game.poker.roundNumber++;
  game.poker.deck = createPokerDeck();
  game.poker.communityCards = [];
  game.poker.pot = 0;
  game.poker.stage = "preflop";
  game.poker.message = "Preflop.";
  game.poker.showdown = false;
  game.poker.showdownResults = [];
  game.poker.payouts = {};
  game.poker.currentBet = 0;
  game.poker.minimumRaise = game.poker.settings.bigBlind;
  game.poker.actionTimer = null;
  game.poker.actionEndsAt = null;

  const seats = getPokerSeatIndexesForHand(game);

  game.poker.dealerIndex = seats.dealerIndex;
  game.poker.smallBlindIndex = seats.smallBlindIndex;
  game.poker.bigBlindIndex = seats.bigBlindIndex;

  game.poker.players.forEach((player, index) => {
    const isActive = activeIndexes.includes(index);

    player.hand = isActive
      ? [drawPokerCard(game), drawPokerCard(game)].filter(Boolean)
      : [];

    player.committed = 0;
    player.streetBet = 0;
    player.hasActed = false;
    player.folded = !isActive;
    player.allIn = false;
    player.bestHand = null;
    player.isOut = !isActive;
    player.isDealer = index === seats.dealerIndex;
    player.isSmallBlind = index === seats.smallBlindIndex;
    player.isBigBlind = index === seats.bigBlindIndex;
  });

  postPokerBlind(game, seats.smallBlindIndex, game.poker.settings.smallBlind);
  postPokerBlind(game, seats.bigBlindIndex, game.poker.settings.bigBlind);

  const smallBlindPlayer = game.poker.players[seats.smallBlindIndex];
  const bigBlindPlayer = game.poker.players[seats.bigBlindIndex];

  game.poker.currentBet = Math.max(
    ...game.poker.players.map((player) => player.streetBet || 0)
  );

  game.poker.currentPlayerIndex = getFirstPokerPlayerToActIndex(game);

  const currentPlayer = getCurrentPokerPlayer(game);

  if (currentPlayer) {
    startPokerActionTimer(pin);
  }

  emitPokerState(pin, game);
}

function nextPokerHand(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "poker" || !game.poker) {
    return {
      ok: false,
      message: "Poker no está activo."
    };
  }

  if (game.poker.stage !== "hand_finished") {
    return {
      ok: false,
      message: "Primero debe terminar la mano actual."
    };
  }

  game.poker.dealerIndex = (game.poker.dealerIndex + 1) % game.poker.players.length;

  startPokerHand(pin);

  return {
    ok: true
  };
}

function finishPokerGame(pin) {
  const game = games.get(pin);

  if (!game || game.status !== "poker" || !game.poker) return;

  clearPokerActionTimer(game);

  game.status = "poker_finished";

  const rankedPlayers = [...game.poker.players]
    .sort((a, b) => b.chips - a.chips);

  const ranking = rankedPlayers
    .map((player, index) => ({
      position: index + 1,
      playerId: player.id,
      name: player.name,
      chips: player.chips
    }));

  const winner = ranking[0];
  const result = {
    ranking,
    message: winner
      ? `Poker terminado. Ganador: ${winner.name} con ${winner.chips} fichas.`
      : "Poker terminado."
  };

  game.poker.awaitingContinue = true;
  game.poker.lastResult = result;

  io.to(pin).emit("poker_finished", {
    game: publicGame(game),
    ...result
  });
}

function getPublicPokerState(game, viewerId) {
  const viewerPokerPlayer = getPokerPlayer(game, viewerId);
  const currentPlayer = getCurrentPokerPlayer(game);
  const isShowdown = ["showdown", "hand_finished"].includes(game.poker.stage);
  const availableActions = getPokerAvailableActions(game, viewerId);
  const activePlayersCount = getPokerActivePlayerIndexes(game).length;

  return {
    stage: game.poker.stage,
    stageLabel: getPokerStageLabel(game.poker.stage),
    nextRevealLabel: getNextPokerRevealLabel(game.poker.stage),

    roundNumber: game.poker.roundNumber,
    totalRounds: game.poker.settings.totalRounds,

    smallBlind: game.poker.settings.smallBlind,
    bigBlind: game.poker.settings.bigBlind,

    pot: game.poker.pot,
    currentBet: game.poker.currentBet,
    minimumRaise: game.poker.minimumRaise,

    communityCards: game.poker.communityCards.filter(Boolean),
    yourCards: viewerPokerPlayer ? viewerPokerPlayer.hand.filter(Boolean) : [],
    yourChips: viewerPokerPlayer ? viewerPokerPlayer.chips : 0,

    lastActionMessage: game.poker.message,
    message: game.poker.message,
    showdown: isShowdown,

    showdownResults: game.poker.showdownResults || [],
    payouts: game.poker.payouts || {},

    currentPlayerId: currentPlayer ? currentPlayer.id : null,
    currentPlayerName: currentPlayer ? currentPlayer.name : null,
    isYourTurn: currentPlayer ? currentPlayer.id === viewerId : false,

    availableActions,

    actionEndsAt: game.poker.actionEndsAt || null,
    activePlayersCount,

    canAdvanceStage: false,
    canStartNextHand:
      game.leaderId === viewerId &&
      game.poker.stage === "hand_finished" &&
      game.poker.roundNumber < game.poker.settings.totalRounds,

    canFinishPoker:
      game.leaderId === viewerId &&
      ["showdown", "hand_finished"].includes(game.poker.stage),

    players: game.poker.players.map((player) => ({
      id: player.id,
      name: player.name,
      seat: player.seat,
      chips: player.chips,
      committed: player.committed,
      streetBet: player.streetBet,
      folded: player.folded,
      allIn: player.allIn,
      isOut: Boolean(player.isOut),
      hasActed: player.hasActed,
      isDealer: player.isDealer,
      isSmallBlind: player.isSmallBlind,
      isBigBlind: player.isBigBlind,
      isCurrentPlayer: currentPlayer ? player.id === currentPlayer.id : false,
      isYou: player.id === viewerId,
      cardCount: player.hand.length,
      revealedCards: isShowdown ? player.hand.filter(Boolean) : [],
      bestHandName: player.bestHand ? player.bestHand.name : "",
      bestHandDescription: player.bestHand ? player.bestHand.description : "",
      payout: game.poker.payouts ? game.poker.payouts[player.id] || 0 : 0
    }))
  };
}

function emitPokerState(pin, game) {
  game.players.forEach((player) => {
    io.to(player.id).emit("poker_state", {
      game: publicGame(game),
      pokerState: getPublicPokerState(game, player.id)
    });
  });
}

function moveObjectKey(object, oldKey, newKey) {
  if (!object || oldKey === newKey || object[oldKey] === undefined) return;

  object[newKey] = object[oldKey];
  delete object[oldKey];
}

function replaceObjectValue(object, oldValue, newValue) {
  if (!object || oldValue === newValue) return;

  Object.keys(object).forEach((key) => {
    if (object[key] === oldValue) {
      object[key] = newValue;
    }
  });
}

function reassignPlayerSocket(game, player, newSocketId) {
  if (!game || !player || !newSocketId || player.id === newSocketId) return;

  const oldSocketId = player.id;

  player.id = newSocketId;

  if (game.leaderId === oldSocketId) {
    game.leaderId = newSocketId;
  }

  moveObjectKey(game.themeVotes, oldSocketId, newSocketId);

  if (game.trivia) {
    moveObjectKey(game.trivia.answers, oldSocketId, newSocketId);
  }

  if (game.friend) {
    moveObjectKey(game.friend.votes, oldSocketId, newSocketId);
  }

  if (game.heads) {
    game.heads.playersOrder = (game.heads.playersOrder || []).map((playerId) => {
      return playerId === oldSocketId ? newSocketId : playerId;
    });

    if (game.heads.currentPlayerId === oldSocketId) {
      game.heads.currentPlayerId = newSocketId;
    }

    moveObjectKey(game.heads.wordVotes, oldSocketId, newSocketId);
  }

  if (game.poker && Array.isArray(game.poker.players)) {
    const pokerPlayer = getPokerPlayer(game, oldSocketId);

    if (pokerPlayer) {
      pokerPlayer.id = newSocketId;
    }
  }
}

function sendCurrentStateToSocket(pin, socket, game) {
  if (!game) return;

  if (game.status === "lobby") {
    socket.emit("game_updated", publicGame(game));
    return;
  }

  if (game.status === "theme_vote") {
    socket.emit("theme_vote_started", {
      game: publicGame(game),
      themes: getCampaignThemes(game),
      votes: getThemeVoteCounts(game)
    });
    return;
  }

  if (game.status === "trivia" && game.trivia && game.trivia.questionOpen) {
    socket.emit("trivia_question", {
      game: publicGame(game),
      question: publicQuestion(game)
    });
    return;
  }

  if (game.status === "friend_intro") {
    socket.emit("friend_trivia_intro", {
      game: publicGame(game)
    });
    return;
  }

  if (game.status === "friend_trivia" && game.friend && game.friend.awaitingContinue && game.friend.lastResult) {
    socket.emit("friend_question_result", {
      game: publicGame(game),
      ...game.friend.lastResult
    });
    return;
  }

  if (game.status === "friend_trivia" && game.friend && game.friend.questionOpen) {
    socket.emit("friend_question", {
      game: publicGame(game),
      question: publicFriendQuestion(game)
    });
    return;
  }

  if (game.status === "conversa_intro" && game.conversa) {
    socket.emit("conversa_intro", {
      game: publicGame(game),
      intro: getPublicConversaIntro(game)
    });
    return;
  }

  if (game.status === "conversa_guide" && game.conversa) {
    socket.emit("conversa_guide", {
      game: publicGame(game),
      guide: getPublicConversaGuide(game)
    });
    return;
  }

  if (game.status === "conversa" && game.conversa) {
    socket.emit("conversa_question", {
      game: publicGame(game),
      conversaState: getPublicConversaState(game, socket.id)
    });
    return;
  }

  if (game.status === "conversa_result" && game.conversa?.lastResult) {
    socket.emit("conversa_finished", {
      game: publicGame(game),
      ...game.conversa.lastResult
    });
    return;
  }

  if (game.status === "heads_intro") {
    socket.emit("heads_up_intro", {
      game: publicGame(game)
    });
    return;
  }

  if (game.status === "heads_up" && game.heads && game.heads.awaitingContinue && game.heads.lastTurnResult) {
    socket.emit("heads_up_turn_result", {
      game: publicGame(game),
      ...game.heads.lastTurnResult
    });
    return;
  }

  if (game.status === "heads_up" && game.heads && game.heads.open) {
    socket.emit("heads_up_word", {
      game: publicGame(game),
      turn: publicHeadsUpTurn(game, socket.id)
    });
    return;
  }

  if (game.status === "stop_intro") {
    socket.emit("stop_intro", {
      game: publicGame(game)
    });
    return;
  }

  if (game.status === "stop_letter" && game.stop) {
    if (game.stop.letterRevealed) {
      socket.emit("stop_letter_revealed", {
        game: publicGame(game),
        letter: game.stop.letter,
        listName: game.stop.list.name,
        totalCategories: game.stop.list.categories.length
      });
    } else {
      socket.emit("stop_letter_selection_started", {
        game: publicGame(game),
        durationMs: game.stop.letterRevealMs,
        endAt: game.stop.letterEndAt
      });
    }
    return;
  }

  if (game.status === "stop_answers" && game.stop) {
    const player = game.players.find((item) => item.id === socket.id);
    const progress = player ? game.stop.progress[player.clientId] : null;

    if (player && progress && !progress.done) {
      socket.emit("stop_category_prompt", {
        game: publicGame(game),
        prompt: getPublicStopPrompt(game, player)
      });
    } else {
      socket.emit("stop_answers_complete", {
        game: publicGame(game)
      });
    }
    return;
  }

  if (game.status === "stop_voting" && game.stop && game.stop.currentVote) {
    const player = game.players.find((item) => item.id === socket.id);

    if (!game.stop.currentVote.open && game.stop.voteResults.length) {
      socket.emit("stop_vote_result", {
        game: publicGame(game),
        result: game.stop.voteResults[game.stop.voteResults.length - 1]
      });
      return;
    }

    socket.emit("stop_vote_item", {
      game: publicGame(game),
      vote: getPublicStopVote(game, player)
    });
    return;
  }

  if (game.status === "stop_voting" && game.stop) {
    socket.emit("stop_voting_started", {
      game: publicGame(game),
      totalWords: game.stop.voteQueue.length
    });
    return;
  }

  if (game.status === "stop_result" && game.stop?.lastResult) {
    socket.emit("stop_finished", {
      game: publicGame(game),
      ...game.stop.lastResult
    });
    return;
  }

  if (game.status === "impostor_intro") {
    socket.emit("impostor_intro", {
      game: publicGame(game)
    });
    return;
  }

  if (game.status === "impostor_role" && game.impostor) {
    const player = game.players.find((item) => item.id === socket.id);

    socket.emit("impostor_role", {
      game: publicGame(game),
      role: getPublicImpostorRole(game, player)
    });
    return;
  }

  if (game.status === "impostor_voting" && game.impostor) {
    const player = game.players.find((item) => item.id === socket.id);

    socket.emit("impostor_voting", {
      game: publicGame(game),
      voting: getPublicImpostorVotingState(game, player)
    });
    return;
  }

  if (
    (game.status === "impostor_round_result" || game.status === "impostor_result") &&
    game.impostor?.lastRoundResult
  ) {
    socket.emit("impostor_round_result", {
      game: publicGame(game),
      result: game.impostor.lastRoundResult
    });
    return;
  }

  if (game.status === "cacho_intro") {
    socket.emit("cacho_intro", {
      game: publicGame(game)
    });
    return;
  }

  if (game.status === "cacho" && game.cacho) {
    socket.emit("cacho_state", {
      game: publicGame(game),
      cachoState: getPublicCachoState(game, socket.id)
    });
    return;
  }

  if (
    (game.status === "cacho_round_result" || game.status === "cacho_result") &&
    game.cacho?.lastRoundResult
  ) {
    socket.emit("cacho_round_result", {
      game: publicGame(game),
      result: game.cacho.lastRoundResult
    });
    return;
  }

  if (game.status === "vertical_intro") {
    socket.emit("vertical_intro", {
      game: publicGame(game),
      companies: VERTICAL_COMPANIES,
      startingCash: VERTICAL_STARTING_CASH
    });
    return;
  }

  if (game.status === "vertical" && game.vertical) {
    socket.emit("vertical_state", {
      game: publicGame(game),
      verticalState: getPublicVerticalState(game, socket.id)
    });
    return;
  }

  if (game.status === "vertical_result" && game.vertical?.lastResult) {
    socket.emit("vertical_finished", {
      game: publicGame(game),
      ...game.vertical.lastResult
    });
    return;
  }

  if (game.status === "last_card_intro") {
    socket.emit("last_card_intro", {
      game: publicGame(game)
    });
    return;
  }

  if (game.status === "last_card_guide") {
    socket.emit("last_card_guide", {
      game: publicGame(game)
    });
    return;
  }

  if (game.status === "last_card" && game.lastCard) {
    socket.emit("last_card_state", {
      game: publicGame(game),
      lastCardState: getPublicLastCardState(game, socket.id)
    });
    return;
  }

  if (game.status === "last_card_result" && game.lastCard?.lastResult) {
    socket.emit("last_card_finished", {
      game: publicGame(game),
      ...game.lastCard.lastResult
    });
    return;
  }

  if (game.status === "poker_intro") {
    socket.emit("poker_intro", {
      game: publicGame(game),
      settings: game.poker?.settings || sanitizePokerSettings(null, game)
    });
    return;
  }

  if (game.status === "poker_rankings") {
    socket.emit("poker_rankings", {
      game: publicGame(game),
      rankings: POKER_HAND_RANKINGS
    });
    return;
  }

  if (game.status === "poker" && game.poker) {
    socket.emit("poker_state", {
      game: publicGame(game),
      pokerState: getPublicPokerState(game, socket.id)
    });
    return;
  }

  if (game.status === "poker_finished" && game.poker?.lastResult) {
    socket.emit("poker_finished", {
      game: publicGame(game),
      ...game.poker.lastResult
    });
    return;
  }

  if (game.status === "between_games") {
    socket.emit("between_games_scoreboard", {
      game: publicGame(game),
      finishedGameId: game.betweenGames?.finishedGameId || getSelectedGameId(game),
      finishedGameName: GAME_LABELS[game.betweenGames?.finishedGameId] || "Juego",
      ranking: getRanking(game)
    });
  }
}

function resetGameStateToLobby(game) {
  clearAllGameTimers(game);

  game.status = "lobby";
  game.selectedTheme = null;
  game.themeVotes = {};
  game.trivia = null;
  game.friend = null;
  game.conversa = null;
  game.heads = null;
  game.stop = null;
  game.impostor = null;
  game.cacho = null;
  game.vertical = null;
  game.lastCard = null;
  game.poker = null;
  game.betweenGames = null;
}

function finishFinalGame(pin) {
  const game = games.get(pin);

  if (!game) return;

  const ranking = getRanking(game);
  resetGameStateToLobby(game);

  io.to(pin).emit("game_finished", {
    game: publicGame(game),
    ranking
  });
}

function clearAllGameTimers(game) {
  clearTriviaTimers(game);
  clearFriendTimers(game);
  clearHeadsUpTimers(game);
  clearStopTimers(game);
  clearCachoTimer(game);
  clearLastCardTimer(game);
  clearLastCardCallTimer(game);
  clearLackPlayersTimer(game);

  if (typeof clearPokerActionTimer === "function") {
    clearPokerActionTimer(game);
  }
}

function getConnectedPlayers(game) {
  if (!game || !Array.isArray(game.players)) return [];

  return game.players.filter((player) => player.connected !== false);
}

function haveAllConnectedPlayersResponded(game, responses) {
  const connectedPlayers = getConnectedPlayers(game);

  return (
    connectedPlayers.length >= MIN_CONNECTED_PLAYERS &&
    connectedPlayers.every((player) => responses && responses[player.id] !== undefined)
  );
}

function clearLackPlayersTimer(game) {
  if (!game || !game.lackPlayersTimer) return;

  clearTimeout(game.lackPlayersTimer);
  game.lackPlayersTimer = null;
}

function updateLackPlayersCountdown(pin) {
  const game = games.get(pin);

  if (!game) return;

  if (game.status === "lobby" || getConnectedPlayers(game).length >= MIN_CONNECTED_PLAYERS) {
    clearLackPlayersTimer(game);
    return;
  }

  if (game.lackPlayersTimer) return;

  game.lackPlayersTimer = setTimeout(() => {
    const latestGame = games.get(pin);

    if (!latestGame) return;

    latestGame.lackPlayersTimer = null;

    if (
      latestGame.status !== "lobby" &&
      getConnectedPlayers(latestGame).length < MIN_CONNECTED_PLAYERS
    ) {
      cancelGameDueToLackOfPlayers(pin);
    }
  }, LACK_PLAYERS_GRACE_MS);
}

function cancelGameDueToLackOfPlayers(pin) {
  const game = games.get(pin);

  if (!game) return;

  clearAllGameTimers(game);

  game.status = "cancelled_lack_players";

  io.to(pin).emit("game_cancelled_lack_players", {
    game: publicGame(game),
    message: "La partida terminó porque no hay suficientes jugadores conectados."
  });

  games.delete(pin);
}

function isFriendTriviaActiveOrIntro(game) {
  return (
    game.status === "friend_intro" ||
    game.status === "friend_trivia" ||
    game.status === "friend_result"
  );
}

function cancelCurrentFriendTriviaIfNeeded(pin) {
  const game = games.get(pin);

  if (!game) return false;
  if (game.players.length >= 3) return false;
  if (!isFriendTriviaActiveOrIntro(game)) return false;

  clearFriendTimers(game);

  game.status = "friend_cancelled_insufficient_players";

  io.to(pin).emit("friend_trivia_cancelled_insufficient_players", {
    game: publicGame(game),
    message: "Votazo se canceló porque no hay suficientes jugadores conectados."
  });

  setTimeout(() => {
    const latestGame = games.get(pin);

    if (!latestGame) return;
    if (latestGame.status !== "friend_cancelled_insufficient_players") return;

    if (latestGame.players.length <= 1) {
      cancelGameDueToLackOfPlayers(pin);
      return;
    }

    finishFinalGame(pin);
  }, 3000);

  return true;
}

function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === "IPv4" && !net.internal) {
        addresses.push(net.address);
      }
    }
  }

  return addresses;
}

io.on("connection", (socket) => {
  console.log("Usuario conectado:", socket.id);

  socket.on("create_game", ({ name, campaignSlug, clientId }, callback) => {
    const pin = generatePin();
    const cleanPlayerClientId = cleanClientId(clientId) || socket.id;

    const player = {
      id: socket.id,
      clientId: cleanPlayerClientId,
      name: cleanName(name) || "Líder",
      score: 0,
      connected: true
    };

    const campaign = loadCampaign(campaignSlug || DEFAULT_CAMPAIGN_SLUG);

    const game = {
      pin,
      leaderId: socket.id,
      status: "lobby",
      selectedTheme: null,
      selectedGames: sanitizeSelectedGames([], 1, campaign),
      players: [player],
      themeVotes: {},
      trivia: null,
      friend: null,
      conversa: null,
      heads: null,
      stop: null,
      impostor: null,
      cacho: null,
      vertical: null,
      lastCard: null,
      lackPlayersTimer: null,
      campaignSlug: campaign.slug,
      campaign
    };

    games.set(pin, game);

    socket.join(pin);
    socket.data.pin = pin;
    socket.data.clientId = cleanPlayerClientId;

    callback({
      ok: true,
      game: publicGame(game)
    });

    io.to(pin).emit("game_updated", publicGame(game));
  });

  socket.on("join_game", ({ pin, name, clientId }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);
    const cleanPlayerClientId = cleanClientId(clientId) || socket.id;

    if (!game) {
      callback({
        ok: false,
        message: "Ese PIN no existe."
      });
      return;
    }

    const returningPlayer = game.players.find((player) => {
      return player.clientId && player.clientId === cleanPlayerClientId;
    });

    if (returningPlayer) {
      reassignPlayerSocket(game, returningPlayer, socket.id);
      returningPlayer.name = cleanName(name) || returningPlayer.name;
      returningPlayer.connected = true;
      returningPlayer.disconnectedAt = null;
      updateLackPlayersCountdown(cleanGamePin);

      socket.join(cleanGamePin);
      socket.data.pin = cleanGamePin;
      socket.data.clientId = cleanPlayerClientId;

      callback({
        ok: true,
        game: publicGame(game)
      });

      sendCurrentStateToSocket(cleanGamePin, socket, game);
      io.to(cleanGamePin).emit("game_updated", publicGame(game));
      return;
    }

    if (game.status !== "lobby") {
      callback({
        ok: false,
        message: "La partida ya inició."
      });
      return;
    }

    const player = {
      id: socket.id,
      clientId: cleanPlayerClientId,
      name: cleanName(name) || "Jugador",
      score: 0,
      connected: true
    };

    const alreadyInside = game.players.some((p) => p.id === socket.id);

    if (!alreadyInside) {
      game.players.push(player);
    }

    game.selectedGames = sanitizeSelectedGames(game.selectedGames, game.players.length, game.campaign);

    socket.join(cleanGamePin);
    socket.data.pin = cleanGamePin;
    socket.data.clientId = cleanPlayerClientId;

    callback({
      ok: true,
      game: publicGame(game)
    });

    io.to(cleanGamePin).emit("game_updated", publicGame(game));
  });

  socket.on("resume_game", ({ pin, clientId }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const cleanPlayerClientId = cleanClientId(clientId);
    const game = games.get(cleanGamePin);

    if (!game || !cleanPlayerClientId) {
      callback({
        ok: false,
        message: "No se pudo reanudar la partida."
      });
      return;
    }

    const player = game.players.find((item) => item.clientId === cleanPlayerClientId);

    if (!player) {
      callback({
        ok: false,
        message: "No se encontró tu jugador en esta partida."
      });
      return;
    }

    reassignPlayerSocket(game, player, socket.id);
    player.connected = true;
    player.disconnectedAt = null;
    updateLackPlayersCountdown(cleanGamePin);

    socket.join(cleanGamePin);
    socket.data.pin = cleanGamePin;
    socket.data.clientId = cleanPlayerClientId;

    callback({
      ok: true,
      game: publicGame(game)
    });

    sendCurrentStateToSocket(cleanGamePin, socket, game);
  });

  socket.on("update_selected_games", ({ pin, selectedGames }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game) {
      callback({
        ok: false,
        message: "La partida no existe."
      });
      return;
    }

    if (game.status !== "lobby") {
      callback({
        ok: false,
        message: "Solo puedes cambiar juegos en el lobby."
      });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({
        ok: false,
        message: "Solo el líder puede elegir juegos."
      });
      return;
    }

    game.selectedGames = sanitizeSelectedGames(selectedGames, game.players.length, game.campaign);

    callback({
      ok: true,
      selectedGames: game.selectedGames
    });

    io.to(cleanGamePin).emit("game_updated", publicGame(game));
  });

  socket.on("remove_player", ({ pin, playerId }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game) {
      callback({
        ok: false,
        message: "La partida no existe."
      });
      return;
    }

    if (game.status !== "lobby") {
      callback({
        ok: false,
        message: "Solo puedes eliminar jugadores en el lobby."
      });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({
        ok: false,
        message: "Solo el líder puede eliminar jugadores."
      });
      return;
    }

    if (!playerId || playerId === game.leaderId) {
      callback({
        ok: false,
        message: "No puedes eliminar al líder de la partida."
      });
      return;
    }

    const playerExists = game.players.some((player) => player.id === playerId);

    if (!playerExists) {
      callback({
        ok: false,
        message: "Ese jugador ya no está en la partida."
      });
      return;
    }

    game.players = game.players.filter((player) => player.id !== playerId);
    game.selectedGames = sanitizeSelectedGames(game.selectedGames, game.players.length, game.campaign);

    const removedSocket = io.sockets.sockets.get(playerId);

    if (removedSocket) {
      removedSocket.emit("removed_from_game", {
        message: "El líder te eliminó de la partida."
      });
      removedSocket.leave(cleanGamePin);
      removedSocket.data.pin = null;
    }

    callback({
      ok: true
    });

    io.to(cleanGamePin).emit("game_updated", publicGame(game));
  });

  socket.on("leave_lobby", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game || game.status !== "lobby") {
      callback({ ok: false, message: "Solo puedes salir desde el lobby." });
      return;
    }

    const leavingPlayer = game.players.find((player) => player.id === socket.id);
    if (!leavingPlayer) {
      callback({ ok: false, message: "No estás dentro de esta partida." });
      return;
    }

    const wasLeader = game.leaderId === socket.id;
    game.players = game.players.filter((player) => player.id !== socket.id);
    socket.leave(cleanGamePin);
    socket.data.pin = null;

    callback({ ok: true });

    if (!game.players.length) {
      clearAllGameTimers(game);
      games.delete(cleanGamePin);
      return;
    }

    if (wasLeader) {
      game.leaderId = game.players[0].id;
    }

    io.to(cleanGamePin).emit("game_updated", publicGame(game));
  });

  socket.on("cancel_game_to_lobby", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game || game.status === "lobby") {
      callback({ ok: false, message: "No hay un juego activo para cancelar." });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({ ok: false, message: "Solo el líder puede volver al lobby." });
      return;
    }

    resetGameStateToLobby(game);
    callback({ ok: true });

    io.to(cleanGamePin).emit("game_cancelled_by_leader", {
      game: publicGame(game),
      message: "El líder canceló la partida. Todos volvieron al lobby."
    });
  });

  socket.on("start_game", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game) {
      callback({
        ok: false,
        message: "La partida no existe."
      });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({
        ok: false,
        message: "Solo el líder puede iniciar la partida."
      });
      return;
    }

    if (game.players.length < 2) {
      callback({
        ok: false,
        message: "Necesitas al menos 2 jugadores para iniciar."
      });
      return;
    }

    if (game.players.length < 3 && game.selectedGames.includes("impostor")) {
      callback({
        ok: false,
        message: "Impostor necesita al menos 3 jugadores."
      });
      return;
    }

    if (game.players.length > 10 && game.selectedGames.includes("lastcard")) {
      callback({
        ok: false,
        message: "ÚLTIMA CARTA admite un máximo de 10 jugadores."
      });
      return;
    }

    game.selectedGames = sanitizeSelectedGames(game.selectedGames, game.players.length, game.campaign);

    if (!game.selectedGames.length) {
      callback({
        ok: false,
        message: "Selecciona al menos un juego."
      });
      return;
    }

    game.players.forEach((player) => {
      player.score = 0;
    });

    callback({
      ok: true
    });

    startSelectedGame(cleanGamePin);
  });

  socket.on("continue_after_scoreboard", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game || game.status !== "between_games") {
      callback({
        ok: false,
        message: "El marcador de la partida no está activo."
      });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({
        ok: false,
        message: "Solo el líder puede continuar."
      });
      return;
    }

    callback({
      ok: true
    });

    finishFinalGame(cleanGamePin);
  });

  socket.on("submit_theme_vote", ({ pin, theme }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game) {
      callback({
        ok: false,
        message: "La partida no existe."
      });
      return;
    }

    if (game.status !== "theme_vote") {
      callback({
        ok: false,
        message: "La votación de tema no está activa."
      });
      return;
    }

    const validTheme = getCampaignThemes(game).some((item) => item.id === theme);

    if (!validTheme) {
      callback({
        ok: false,
        message: "Ese tema no existe."
      });
      return;
    }

    game.themeVotes[socket.id] = theme;

    callback({
      ok: true
    });

    io.to(cleanGamePin).emit("theme_votes_updated", {
      votes: getThemeVoteCounts(game),
      totalVotes: Object.keys(game.themeVotes).length,
      totalPlayers: game.players.length
    });

    const allPlayersVoted = haveAllConnectedPlayersResponded(game, game.themeVotes);

    if (allPlayersVoted) {
      startTrivia(cleanGamePin);
    }
  });

  socket.on("submit_answer", ({ pin, optionIndex }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game || game.status !== "trivia" || !game.trivia) {
      callback({
        ok: false,
        message: "La trivia no está activa."
      });
      return;
    }

    if (!game.trivia.questionOpen) {
      callback({
        ok: false,
        message: "La pregunta ya se cerró."
      });
      return;
    }

    if (game.trivia.answers[socket.id]) {
      callback({
        ok: false,
        message: "Ya respondiste esta pregunta."
      });
      return;
    }

    const player = game.players.find((item) => item.id === socket.id);

    if (!player) {
      callback({
        ok: false,
        message: "No estás dentro de la partida."
      });
      return;
    }

    const questions = game.trivia.questions || [];
    const question = questions[game.trivia.currentQuestionIndex];

    const numericOptionIndex = Number(optionIndex);

    if (!question.options[numericOptionIndex]) {
      callback({
        ok: false,
        message: "Respuesta inválida."
      });
      return;
    }

    const elapsed = Date.now() - game.trivia.questionStartTime;
    const isCorrect = numericOptionIndex === question.correctIndex;

    let points = 0;

    if (isCorrect) {
      const speedRatio = Math.max(0, 1 - elapsed / game.trivia.durationMs);
      const speedBonus = Math.round(50 * speedRatio);
      points = 100 + speedBonus;
      player.score += points;
    }

    game.trivia.answers[socket.id] = {
      optionIndex: numericOptionIndex,
      correct: isCorrect,
      points
    };

    callback({
      ok: true,
      message: "Respuesta recibida."
    });

    if (haveAllConnectedPlayersResponded(game, game.trivia.answers)) {
      finishQuestion(cleanGamePin);
    }
  });

  socket.on("start_friend_trivia_game", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game || game.status !== "friend_intro") {
      callback({
        ok: false,
        message: "Votazo todavía no está listo."
      });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({
        ok: false,
        message: "Solo el líder puede empezar Votazo."
      });
      return;
    }

    callback({
      ok: true
    });

    startFriendTrivia(cleanGamePin);
  });

  socket.on("submit_friend_vote", ({ pin, optionId }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game || game.status !== "friend_trivia" || !game.friend) {
      callback({
        ok: false,
        message: "Votazo no está activo."
      });
      return;
    }

    if (!game.friend.questionOpen) {
      callback({
        ok: false,
        message: "La pregunta ya se cerró."
      });
      return;
    }

    if (game.friend.votes[socket.id]) {
      callback({
        ok: false,
        message: "Ya votaste esta pregunta."
      });
      return;
    }

    const voter = game.players.find((player) => player.id === socket.id);
    const currentQuestion = game.friend.questions[game.friend.currentQuestionIndex];
    const options = getVotazoOptions(currentQuestion);
    const selectedOptionId = String(optionId ?? "");
    const selectedOption = options.find((option) => option.id === selectedOptionId);

    if (!voter) {
      callback({
        ok: false,
        message: "No estás dentro de la partida."
      });
      return;
    }

    if (!selectedOption) {
      callback({
        ok: false,
        message: "Esa opción no existe."
      });
      return;
    }

    game.friend.votes[socket.id] = selectedOption.id;

    callback({
      ok: true,
      message: "Voto recibido."
    });

    if (haveAllConnectedPlayersResponded(game, game.friend.votes)) {
      finishFriendQuestion(cleanGamePin);
    }
  });

  socket.on("continue_friend_question", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game || game.status !== "friend_trivia" || !game.friend || !game.friend.awaitingContinue) {
      callback({
        ok: false,
        message: "Votazo todavía no está listo para continuar."
      });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({
        ok: false,
        message: "Solo el líder puede continuar."
      });
      return;
    }

    game.friend.awaitingContinue = false;

    callback({
      ok: true
    });

    if (game.friend.currentQuestionIndex >= game.friend.questions.length - 1) {
      showGameScoreboard(cleanGamePin, "friend");
      return;
    }

    nextFriendQuestion(cleanGamePin);
  });

  socket.on("start_heads_up_game", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game || game.status !== "heads_intro" || !game.heads) {
      callback({
        ok: false,
        message: "Heads Up todavía no está listo."
      });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({
        ok: false,
        message: "Solo el líder puede empezar Heads Up."
      });
      return;
    }

    callback({
      ok: true
    });

    beginHeadsUp(cleanGamePin);
  });

  socket.on("submit_heads_up_action", ({ pin, action }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game || game.status !== "heads_up" || !game.heads) {
      callback({
        ok: false,
        message: "Heads Up no está activo."
      });
      return;
    }

    if (!game.heads.open || !game.heads.wordOpen) {
      callback({
        ok: false,
        message: "La palabra ya no está activa."
      });
      return;
    }

    if (Date.now() >= game.heads.endAt) {
      finishHeadsUpTurn(cleanGamePin);

      callback({
        ok: false,
        message: "El tiempo terminó."
      });
      return;
    }

    const activePlayerId = game.heads.currentPlayerId;
    const isActivePlayer = socket.id === activePlayerId;

    if (action === "pass") {
      if (!isActivePlayer) {
        callback({
          ok: false,
          message: "Solo el jugador de turno puede pasar."
        });
        return;
      }

      callback({
        ok: true
      });

      finishHeadsUpWordAsPassed(cleanGamePin);
      return;
    }

    if (action === "correct_vote") {
      if (isActivePlayer) {
        callback({
          ok: false,
          message: "El jugador de turno no puede votar correcto."
        });
        return;
      }

      const voter = game.players.find((player) => player.id === socket.id);

      if (!voter) {
        callback({
          ok: false,
          message: "No estás dentro de la partida."
        });
        return;
      }

      if (game.heads.wordVotes[socket.id]) {
        callback({
          ok: false,
          message: "Ya votaste correcto en esta palabra."
        });
        return;
      }

      game.heads.wordVotes[socket.id] = true;

      const correctVotes = getHeadsUpCorrectVotes(game);
      const majorityNeeded = getHeadsUpMajorityNeeded(game);

      callback({
        ok: true,
        correctVotes,
        majorityNeeded
      });

      io.to(cleanGamePin).emit("heads_up_votes_updated", {
        correctVotes,
        majorityNeeded
      });

      if (correctVotes >= majorityNeeded) {
        finishHeadsUpWordAsCorrect(cleanGamePin);
      }

      return;
    }

    callback({
      ok: false,
      message: "Acción inválida."
    });
  });

  socket.on("continue_heads_up_turn", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game || game.status !== "heads_up" || !game.heads || !game.heads.awaitingContinue) {
      callback({
        ok: false,
        message: "Heads Up todavía no está listo para continuar."
      });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({
        ok: false,
        message: "Solo el líder puede continuar."
      });
      return;
    }

    game.heads.awaitingContinue = false;

    callback({
      ok: true
    });

    startNextHeadsUpTurn(cleanGamePin);
  });

  socket.on("start_stop_game", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game || game.status !== "stop_intro" || !game.stop) {
      callback({
        ok: false,
        message: "STOP todavía no está listo."
      });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({
        ok: false,
        message: "Solo el líder puede empezar STOP."
      });
      return;
    }

    callback({ ok: true });
    beginStop(cleanGamePin);
  });

  socket.on("submit_stop_answer", ({ pin, word, passed, categoryIndex }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);
    const player = game?.players.find((item) => item.id === socket.id);

    if (!game || game.status !== "stop_answers" || !game.stop || !player) {
      callback({
        ok: false,
        message: "STOP no está activo."
      });
      return;
    }

    const result = recordStopAnswer(
      cleanGamePin,
      player,
      word,
      Boolean(passed),
      categoryIndex
    );

    callback(result);
  });

  socket.on("submit_stop_vote", ({ pin, accept }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);
    const player = game?.players.find((item) => item.id === socket.id);
    const currentVote = game?.stop?.currentVote;

    if (!game || game.status !== "stop_voting" || !game.stop || !currentVote?.open || !player) {
      callback({
        ok: false,
        message: "La votación de STOP no está activa."
      });
      return;
    }

    if (player.clientId === currentVote.authorClientId) {
      callback({
        ok: false,
        message: "No puedes votar tu propia palabra."
      });
      return;
    }

    if (currentVote.votes[player.clientId] !== undefined) {
      callback({
        ok: false,
        message: "Ya votaste esta palabra."
      });
      return;
    }

    if (typeof accept !== "boolean") {
      callback({
        ok: false,
        message: "Ese voto no es válido."
      });
      return;
    }

    currentVote.votes[player.clientId] = accept;

    const acceptVotes = Object.values(currentVote.votes).filter((vote) => vote === true).length;
    const rejectVotes = Object.values(currentVote.votes).filter((vote) => vote === false).length;

    callback({ ok: true });

    io.to(cleanGamePin).emit("stop_votes_updated", {
      acceptVotes,
      rejectVotes,
      receivedVotes: Object.keys(currentVote.votes).length,
      totalVoters: currentVote.eligibleVoters.length
    });

    if (haveAllStopVotersResponded(game)) {
      finishStopVoteItem(cleanGamePin);
    }
  });

  socket.on("continue_stop_result", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game || game.status !== "stop_result" || !game.stop?.awaitingContinue) {
      callback({
        ok: false,
        message: "STOP todavía no está listo para continuar."
      });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({
        ok: false,
        message: "Solo el líder puede continuar."
      });
      return;
    }

    game.stop.awaitingContinue = false;
    callback({ ok: true });
    showGameScoreboard(cleanGamePin, "stop");
  });

  socket.on("start_impostor_game", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game || game.status !== "impostor_intro" || !game.impostor) {
      callback({ ok: false, message: "Impostor todavía no está listo." });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({ ok: false, message: "Solo el líder puede empezar Impostor." });
      return;
    }

    if (game.players.length < 3) {
      callback({ ok: false, message: "Impostor necesita al menos 3 jugadores." });
      return;
    }

    callback({ ok: true });
    beginImpostor(cleanGamePin);
  });

  socket.on("impostor_ready", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);
    const player = game?.players.find((item) => item.id === socket.id);

    if (!game || game.status !== "impostor_role" || !game.impostor || !player) {
      callback({ ok: false, message: "La entrega de roles ya terminó." });
      return;
    }

    if (!game.impostor.activeClientIds.includes(player.clientId)) {
      callback({ ok: false, message: "No estás activo en esta partida." });
      return;
    }

    if (!game.impostor.readyClientIds.includes(player.clientId)) {
      game.impostor.readyClientIds.push(player.clientId);
    }

    callback({ ok: true });

    io.to(cleanGamePin).emit("impostor_ready_progress", {
      readyCount: game.impostor.readyClientIds.length,
      totalPlayers: game.impostor.activeClientIds.length
    });

    if (game.impostor.readyClientIds.length === game.impostor.activeClientIds.length) {
      startImpostorVoting(cleanGamePin);
    }
  });

  socket.on("submit_impostor_vote", ({ pin, playerId }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);
    const voter = game?.players.find((player) => player.id === socket.id);
    const suspect = game?.players.find((player) => player.id === String(playerId || ""));

    if (!game || game.status !== "impostor_voting" || !game.impostor || !voter) {
      callback({ ok: false, message: "La votación de Impostor no está activa." });
      return;
    }

    if (!game.impostor.activeClientIds.includes(voter.clientId)) {
      callback({ ok: false, message: "Los jugadores eliminados no pueden votar." });
      return;
    }

    if (!suspect || !game.impostor.activeClientIds.includes(suspect.clientId)) {
      callback({ ok: false, message: "Ese jugador ya no está activo." });
      return;
    }

    if (suspect.clientId === voter.clientId) {
      callback({ ok: false, message: "No puedes votar por ti." });
      return;
    }

    game.impostor.votes[voter.clientId] = suspect.clientId;
    callback({ ok: true, selectedPlayerId: suspect.id });
    emitImpostorVoteProgress(cleanGamePin, game);
  });

  socket.on("finish_impostor_round", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game || game.status !== "impostor_voting" || !game.impostor) {
      callback({ ok: false, message: "La votación de Impostor no está activa." });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({ ok: false, message: "Solo el líder puede terminar la ronda." });
      return;
    }

    callback(finishImpostorRound(cleanGamePin));
  });

  socket.on("continue_impostor_round", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (
      !game ||
      !["impostor_round_result", "impostor_result"].includes(game.status) ||
      !game.impostor?.awaitingContinue
    ) {
      callback({ ok: false, message: "Impostor todavía no está listo para continuar." });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({ ok: false, message: "Solo el líder puede continuar." });
      return;
    }

    const isFinal = game.status === "impostor_result";
    game.impostor.awaitingContinue = false;
    callback({ ok: true });

    if (isFinal) {
      showGameScoreboard(cleanGamePin, "impostor");
      return;
    }

    game.impostor.roundNumber++;
    startImpostorVoting(cleanGamePin);
  });

  socket.on("start_conversa_game", ({ pin, mode }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game || game.status !== "conversa_intro" || !game.conversa) {
      callback({ ok: false, message: "Conversa todavía no está listo." });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({ ok: false, message: "Solo el líder puede empezar Conversa." });
      return;
    }

    callback(beginConversa(cleanGamePin, mode));
  });

  socket.on("continue_conversa_guide", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game || game.status !== "conversa_guide" || !game.conversa) {
      callback({ ok: false, message: "La guÃ­a de Conversa todavÃ­a no estÃ¡ lista." });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({ ok: false, message: "Solo el lÃ­der puede continuar." });
      return;
    }

    callback(startConversaQuestions(cleanGamePin));
  });

  socket.on("submit_conversa_classification", ({ pin, archetypeId }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);
    const player = game?.players.find((item) => item.id === socket.id);

    if (!player) {
      callback({ ok: false, message: "No estás dentro de la partida." });
      return;
    }

    callback(submitConversaClassification(cleanGamePin, player, archetypeId));
  });

  socket.on("continue_conversa_result", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game || game.status !== "conversa_result" || !game.conversa?.awaitingContinue) {
      callback({ ok: false, message: "El resultado de Conversa todavía no está listo." });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({ ok: false, message: "Solo el líder puede continuar." });
      return;
    }

    game.conversa.awaitingContinue = false;
    callback({ ok: true });
    showGameScoreboard(cleanGamePin, "conversa");
  });

  socket.on("start_cacho_game", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game || game.status !== "cacho_intro" || !game.cacho) {
      callback({ ok: false, message: "Cacho todavía no está listo." });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({ ok: false, message: "Solo el líder puede empezar Cacho." });
      return;
    }

    callback({ ok: true });
    beginCacho(cleanGamePin);
  });

  socket.on("submit_cacho_bid", ({ pin, quantity, face }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);
    const player = game?.players.find((item) => item.id === socket.id);

    if (!player) {
      callback({ ok: false, message: "No estás dentro de la partida." });
      return;
    }

    callback(placeCachoBid(cleanGamePin, player, quantity, face));
  });

  socket.on("call_cacho_doubt", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);
    const player = game?.players.find((item) => item.id === socket.id);

    if (!player) {
      callback({ ok: false, message: "No estás dentro de la partida." });
      return;
    }

    callback(resolveCachoDoubt(cleanGamePin, player));
  });

  socket.on("continue_cacho_result", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (
      !game ||
      !["cacho_round_result", "cacho_result"].includes(game.status) ||
      !game.cacho?.awaitingContinue
    ) {
      callback({ ok: false, message: "Cacho todavía no está listo para continuar." });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({ ok: false, message: "Solo el líder puede continuar." });
      return;
    }

    const isFinal = game.status === "cacho_result";
    const nextStarterClientId = game.cacho.nextStarterClientId;
    game.cacho.awaitingContinue = false;
    callback({ ok: true });

    if (isFinal) {
      showGameScoreboard(cleanGamePin, "cacho");
      return;
    }

    beginCachoRound(cleanGamePin, nextStarterClientId);
  });

  socket.on("start_vertical_game", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game || game.status !== "vertical_intro") {
      callback({ ok: false, message: "Integración vertical todavía no está listo." });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({ ok: false, message: "Solo el líder puede empezar Integración vertical." });
      return;
    }

    callback(beginVerticalGame(cleanGamePin));
  });

  socket.on("roll_vertical_dice", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);
    const player = game?.players.find((item) => item.id === socket.id);
    callback(player
      ? rollVerticalDice(cleanGamePin, player)
      : { ok: false, message: "No estás dentro de la partida." });
  });

  socket.on("buy_vertical_square", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);
    const player = game?.players.find((item) => item.id === socket.id);
    callback(player
      ? buyVerticalSquare(cleanGamePin, player)
      : { ok: false, message: "No estás dentro de la partida." });
  });

  socket.on("skip_vertical_purchase", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);
    const player = game?.players.find((item) => item.id === socket.id);
    callback(player
      ? skipVerticalPurchase(cleanGamePin, player)
      : { ok: false, message: "No estás dentro de la partida." });
  });

  socket.on("manage_vertical_asset", ({ pin, squareId, action }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);
    const player = game?.players.find((item) => item.id === socket.id);
    callback(player
      ? manageVerticalAsset(cleanGamePin, player, squareId, action)
      : { ok: false, message: "No estás dentro de la partida." });
  });

  socket.on("create_vertical_trade_offer", ({ pin, squareId, direction, counterpartyClientId, amount }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);
    const player = game?.players.find((item) => item.id === socket.id);
    callback(player
      ? createVerticalTradeOffer(cleanGamePin, player, { squareId, direction, counterpartyClientId, amount })
      : { ok: false, message: "No estás dentro de la partida." });
  });

  socket.on("respond_vertical_trade_offer", ({ pin, offerId, accept }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);
    const player = game?.players.find((item) => item.id === socket.id);
    callback(player
      ? respondVerticalTradeOffer(cleanGamePin, player, offerId, Boolean(accept))
      : { ok: false, message: "No estás dentro de la partida." });
  });

  socket.on("cancel_vertical_trade_offer", ({ pin, offerId }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);
    const player = game?.players.find((item) => item.id === socket.id);
    callback(player
      ? cancelVerticalTradeOffer(cleanGamePin, player, offerId)
      : { ok: false, message: "No estás dentro de la partida." });
  });

  socket.on("pay_vertical_jail_fine", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);
    const player = game?.players.find((item) => item.id === socket.id);
    callback(player
      ? payVerticalJailFine(cleanGamePin, player)
      : { ok: false, message: "No estás dentro de la partida." });
  });

  socket.on("end_vertical_turn", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);
    const player = game?.players.find((item) => item.id === socket.id);
    callback(player
      ? endVerticalTurn(cleanGamePin, player)
      : { ok: false, message: "No estás dentro de la partida." });
  });

  socket.on("declare_vertical_bankruptcy", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);
    const player = game?.players.find((item) => item.id === socket.id);
    callback(player
      ? declareVerticalBankruptcy(cleanGamePin, player)
      : { ok: false, message: "No estás dentro de la partida." });
  });

  socket.on("continue_vertical_result", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game || game.status !== "vertical_result" || !game.vertical?.lastResult) {
      callback({ ok: false, message: "El resultado todavía no está listo." });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({ ok: false, message: "Solo el líder puede continuar." });
      return;
    }

    callback({ ok: true });
    resetGameStateToLobby(game);
    io.to(cleanGamePin).emit("game_updated", publicGame(game));
  });

  socket.on("start_last_card_game", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game || game.status !== "last_card_intro" || !game.lastCard) {
      callback({
        ok: false,
        message: "ÚLTIMA CARTA todavía no está listo."
      });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({
        ok: false,
        message: "Solo el líder puede empezar ÚLTIMA CARTA."
      });
      return;
    }

    callback({ ok: true });
    showLastCardGuide(cleanGamePin);
  });

  socket.on("continue_last_card_guide", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game || game.status !== "last_card_guide" || !game.lastCard) {
      callback({
        ok: false,
        message: "El inventario de cartas todavía no está listo."
      });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({
        ok: false,
        message: "Solo el líder puede continuar."
      });
      return;
    }

    callback({ ok: true });
    beginLastCard(cleanGamePin);
  });

  socket.on("play_last_card", ({ pin, cardId, chosenColor }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);
    const player = game?.players.find((item) => item.id === socket.id);

    if (!player) {
      callback({ ok: false, message: "No estás dentro de la partida." });
      return;
    }

    callback(playLastCard(
      cleanGamePin,
      player,
      String(cardId || ""),
      String(chosenColor || "").toLowerCase()
    ));
  });

  socket.on("call_last_card", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);
    const player = game?.players.find((item) => item.id === socket.id);

    if (!player) {
      callback({ ok: false, message: "No estás dentro de la partida." });
      return;
    }

    callback(handleLastCardCall(cleanGamePin, player));
  });

  socket.on("draw_last_card", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);
    const player = game?.players.find((item) => item.id === socket.id);

    if (!player) {
      callback({ ok: false, message: "No estás dentro de la partida." });
      return;
    }

    callback(drawLastCardForTurn(cleanGamePin, player));
  });

  socket.on("pass_last_card_turn", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);
    const player = game?.players.find((item) => item.id === socket.id);

    if (!player) {
      callback({ ok: false, message: "No estás dentro de la partida." });
      return;
    }

    callback(passLastCardTurn(cleanGamePin, player));
  });

  socket.on("continue_last_card_result", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game || game.status !== "last_card_result" || !game.lastCard?.awaitingContinue) {
      callback({
        ok: false,
        message: "ÚLTIMA CARTA todavía no está listo para continuar."
      });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({
        ok: false,
        message: "Solo el líder puede continuar."
      });
      return;
    }

    game.lastCard.awaitingContinue = false;
    callback({ ok: true });
    showGameScoreboard(cleanGamePin, "lastcard");
  });

  socket.on("update_poker_settings", ({ pin, settings }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game) {
      callback({
        ok: false,
        message: "La partida no existe."
      });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({
        ok: false,
        message: "Solo el líder puede configurar Poker."
      });
      return;
    }

    const result = updatePokerSettings(cleanGamePin, settings);
    callback(result);
  });

  socket.on("start_poker_game", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game || game.status !== "poker_intro" || !game.poker) {
      callback({
        ok: false,
        message: "Poker todavía no está listo."
      });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({
        ok: false,
        message: "Solo el líder puede empezar Poker."
      });
      return;
    }

    callback({
      ok: true
    });

    showPokerRankings(cleanGamePin);
  });

  socket.on("continue_poker_after_rankings", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game || game.status !== "poker_rankings" || !game.poker) {
      callback({
        ok: false,
        message: "La pantalla de ranking de manos no está activa."
      });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({
        ok: false,
        message: "Solo el líder puede continuar."
      });
      return;
    }

    callback({
      ok: true
    });

    beginPoker(cleanGamePin);
  });

  socket.on("next_poker_hand", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game) {
      callback({
        ok: false,
        message: "La partida no existe."
      });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({
        ok: false,
        message: "Solo el líder puede iniciar la siguiente mano."
      });
      return;
    }

    const result = nextPokerHand(cleanGamePin);
    callback(result);
  });

  socket.on("finish_poker_game", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game || game.status !== "poker") {
      callback({
        ok: false,
        message: "Poker no está activo."
      });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({
        ok: false,
        message: "Solo el líder puede terminar Poker."
      });
      return;
    }

    callback({
      ok: true
    });

    finishPokerGame(cleanGamePin);
  });

  socket.on("continue_poker_result", ({ pin }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game || game.status !== "poker_finished" || !game.poker?.awaitingContinue) {
      callback({
        ok: false,
        message: "El resultado de Poker todavía no está listo."
      });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({
        ok: false,
        message: "Solo el líder puede continuar."
      });
      return;
    }

    callback({ ok: true });
    resetGameStateToLobby(game);
    io.to(cleanGamePin).emit("game_updated", publicGame(game));
  });

  socket.on("submit_poker_action", ({ pin, action, amount }, callback) => {
    const cleanGamePin = cleanPin(pin);

    const result = handlePokerAction(cleanGamePin, socket.id, action, amount);

    callback(result);
  });

  socket.on("dev_skip_to", ({ pin, target, theme }, callback) => {
    const cleanGamePin = cleanPin(pin);
    const game = games.get(cleanGamePin);

    if (!game) {
      callback({
        ok: false,
        message: "La partida no existe."
      });
      return;
    }

    if (game.leaderId !== socket.id) {
      callback({
        ok: false,
        message: "Solo el líder puede usar el modo desarrollo."
      });
      return;
    }

    clearTriviaTimers(game);
    clearFriendTimers(game);
    clearHeadsUpTimers(game);
    clearStopTimers(game);
    clearLastCardTimer(game);

    game.trivia = null;
    game.friend = null;
    game.conversa = null;
    game.heads = null;
    game.stop = null;
    game.impostor = null;
    game.cacho = null;
    game.vertical = null;
    game.lastCard = null;

    if (target === "knowledge") {
      const themes = getCampaignThemes(game);
      const selectedTheme = theme || themes[0]?.id || "deportes";

      game.status = "trivia";
      game.selectedTheme = selectedTheme;
      game.trivia = {
        currentQuestionIndex: -1,
        answers: {},
        questionOpen: false,
        questionStartTime: null,
        durationMs: 15000,
        endAt: null,
        questionTimer: null,
        betweenTimer: null
      };

      callback({
        ok: true,
        message: "Saltando a Trivia de conocimiento."
      });

      io.to(cleanGamePin).emit("theme_chosen", {
        theme: selectedTheme,
        themeName: getThemeNameFromCampaign(game, selectedTheme),
        game: publicGame(game)
      });

      game.trivia.betweenTimer = setTimeout(() => {
        nextQuestion(cleanGamePin);
      }, 500);

      return;
    }

    if (target === "friend") {
      callback({
        ok: true,
        message: "Saltando a Votazo."
      });

      startFriendTrivia(cleanGamePin);
      return;
    }

    if (target === "heads-intro") {
      callback({
        ok: true,
        message: "Saltando a instrucciones de Heads Up."
      });

      startHeadsUpIntro(cleanGamePin);
      return;
    }

    if (target === "heads") {
      callback({
        ok: true,
        message: "Saltando directo a Heads Up."
      });

      startHeadsUpIntro(cleanGamePin);

      setTimeout(() => {
        beginHeadsUp(cleanGamePin);
      }, 500);

      return;
    }

    if (target === "final") {
      callback({
        ok: true,
        message: "Finalizando la partida y regresando al lobby."
      });

      finishFinalGame(cleanGamePin);

      return;
    }

    callback({
      ok: false,
      message: "Destino de desarrollo inválido."
    });
  });

  socket.on("disconnect", () => {
    const pin = socket.data.pin;

    if (!pin) return;

    const game = games.get(pin);

    if (!game) return;

    const wasLeader = game.leaderId === socket.id;
    const disconnectingPlayer = game.players.find((player) => player.id === socket.id);

    if (!disconnectingPlayer) return;

    if (game.status !== "lobby") {
      disconnectingPlayer.connected = false;
      disconnectingPlayer.disconnectedAt = Date.now();

      updateLackPlayersCountdown(pin);

      if (
        game.status === "theme_vote" &&
        haveAllConnectedPlayersResponded(game, game.themeVotes)
      ) {
        startTrivia(pin);
        return;
      }

      if (
        game.status === "trivia" &&
        game.trivia &&
        game.trivia.questionOpen &&
        haveAllConnectedPlayersResponded(game, game.trivia.answers)
      ) {
        finishQuestion(pin);
        return;
      }

      if (
        game.status === "friend_trivia" &&
        game.friend &&
        game.friend.questionOpen &&
        haveAllConnectedPlayersResponded(game, game.friend.votes)
      ) {
        finishFriendQuestion(pin);
        return;
      }

      if (game.status === "conversa" && game.conversa?.questionOpen) {
        const currentConversaPlayer = getCurrentConversaPlayer(game);

        if (currentConversaPlayer?.clientId === disconnectingPlayer.clientId) {
          finishConversaQuestion(pin, true);
          return;
        }

        if (haveAllConversaRatersScored(game)) {
          finishConversaQuestion(pin);
          return;
        }

        emitConversaState(pin, game);
      }

      if (game.status === "vertical" && game.vertical) {
        const currentVerticalPlayer = getCurrentVerticalPlayer(game);
        if (game.vertical.tradeOffer && (
          game.vertical.tradeOffer.sellerClientId === disconnectingPlayer.clientId ||
          game.vertical.tradeOffer.buyerClientId === disconnectingPlayer.clientId ||
          game.vertical.tradeOffer.proposerClientId === disconnectingPlayer.clientId
        )) {
          game.vertical.tradeOffer = null;
          game.vertical.message = "La negociaciÃ³n se cancelÃ³ porque un jugador se desconectÃ³.";
        }

        if (currentVerticalPlayer?.clientId === disconnectingPlayer.clientId) {
          if (currentVerticalPlayer.cash < 0) {
            declareVerticalBankruptcy(pin, disconnectingPlayer);
          } else {
            game.vertical.phase = "await_end";
            game.vertical.extraRoll = false;
            endVerticalTurn(pin, disconnectingPlayer);
          }
          return;
        }

        emitVerticalState(pin, game);
      }

      return;
    }

    game.players = game.players.filter((player) => player.id !== socket.id);

    if (game.players.length === 0) {
      clearAllGameTimers(game);
      games.delete(pin);
      return;
    }

    if (game.players.length === 1 && game.status !== "lobby") {
      cancelGameDueToLackOfPlayers(pin);
      return;
    }

    if (game.players.length < 3 && game.status !== "lobby") {
      if (cancelCurrentFriendTriviaIfNeeded(pin)) {
        return;
      }
    }

    if (wasLeader) {
      game.leaderId = game.players[0].id;
    }

    if (game.status === "between_games") {
      showGameScoreboard(pin, game.betweenGames?.finishedGameId);
      return;
    }

    if (game.status === "theme_vote") {
      const allRemainingPlayersVoted = game.players.every((player) => game.themeVotes[player.id]);

      if (allRemainingPlayersVoted) {
        startTrivia(pin);
        return;
      }
    }

    if (game.status === "trivia" && game.trivia && game.trivia.questionOpen) {
      const answeredPlayers = game.players.filter((player) => game.trivia.answers[player.id]);

      if (answeredPlayers.length >= game.players.length) {
        finishQuestion(pin);
        return;
      }
    }

    if (game.status === "friend_intro") {
      if (game.players.length < 3) {
        cancelCurrentFriendTriviaIfNeeded(pin);
        return;
      }

      io.to(pin).emit("friend_trivia_intro", {
        game: publicGame(game)
      });

      return;
    }

    if (game.status === "friend_trivia" && game.friend && game.friend.questionOpen) {
      const votedPlayers = game.players.filter((player) => game.friend.votes[player.id]);

      if (votedPlayers.length >= game.players.length) {
        finishFriendQuestion(pin);
        return;
      }
    }

    if (game.status === "heads_intro") {
      io.to(pin).emit("heads_up_intro", {
        game: publicGame(game)
      });
      return;
    }

    if (game.status === "heads_up" && game.heads) {
      if (game.heads.currentPlayerId === socket.id) {
        finishHeadsUpTurn(pin);
        return;
      }

      if (game.heads.wordOpen) {
        const correctVotes = getHeadsUpCorrectVotes(game);
        const majorityNeeded = getHeadsUpMajorityNeeded(game);

        if (correctVotes >= majorityNeeded) {
          finishHeadsUpWordAsCorrect(pin);
          return;
        }

        emitHeadsUpWord(pin, game);
        return;
      }
    }
    
if (game.status === "poker" && game.poker) {
  const pokerPlayer = getPokerPlayer(game, socket.id);

  if (pokerPlayer) {
    pokerPlayer.folded = true;
    pokerPlayer.hand = [];
  }

  emitPokerState(pin, game);
  return;
}

    io.to(pin).emit("game_updated", publicGame(game));
  });
});

if (require.main === module) {
  server.listen(PORT, "0.0.0.0", () => {
    console.log("");
    console.log("Servidor iniciado.");
    console.log("");
    console.log("En este computador abre:");
    console.log(`http://localhost:${PORT}/juegos`);
    console.log("");
    console.log("Para celulares en la misma red Wi-Fi, prueba con:");

    const ips = getLocalIPs();

    ips.forEach((ip) => {
      console.log(`http://${ip}:${PORT}/juegos`);
    });

    console.log("");
  });
}

module.exports = {
  __test: {
    server,
    io,
    games,
    createLastCardDeck,
    getCampaignConversaSettings,
    getConversaModeQuestions,
    getConversaArchetypeProfiles,
    isHigherCachoBid,
    countCachoFace,
    VERTICAL_BOARD,
    VERTICAL_COMPANIES,
    getVerticalRent,
    getVerticalFinancials,
    ownsVerticalCompany,
    createVerticalTradeOffer,
    respondVerticalTradeOffer,
    cancelVerticalTradeOffer,
    drawLastCards,
    takeInitialLastCard,
    createInactiveLastCardCall,
    getPublicLastCardState,
    emitLastCardState,
    playLastCard,
    drawLastCardForTurn,
    handleLastCardCall,
    reassignPlayerSocket,
    clearLastCardTimer,
    clearLastCardCallTimer
  }
};
