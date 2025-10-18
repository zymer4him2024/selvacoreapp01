// WhatsApp Deep Link Helper

export interface WhatsAppContact {
  name: string;
  phone: string;
}

export interface OrderInfo {
  orderNumber: string;
  productName: string;
  installationDate: string;
  address: string;
}

/**
 * Generate WhatsApp deep link with pre-filled greeting message
 */
export function generateWhatsAppLink(
  contact: WhatsAppContact,
  order: OrderInfo,
  language: string = 'en'
): string {
  // Clean phone number (remove all non-numeric characters)
  const cleanPhone = contact.phone.replace(/\D/g, '');

  // Greeting messages by language
  const greetings: Record<string, string> = {
    en: `Hello ${contact.name}! 👋\n\nI'm reaching out regarding my installation order.\n\n📦 Order: ${order.orderNumber}\n🔧 Product: ${order.productName}\n📅 Scheduled: ${order.installationDate}\n📍 Address: ${order.address}\n\nLooking forward to your service!`,
    
    es: `¡Hola ${contact.name}! 👋\n\nMe comunico con respecto a mi orden de instalación.\n\n📦 Orden: ${order.orderNumber}\n🔧 Producto: ${order.productName}\n📅 Programado: ${order.installationDate}\n📍 Dirección: ${order.address}\n\n¡Espero su servicio!`,
    
    fr: `Bonjour ${contact.name}! 👋\n\nJe vous contacte concernant ma commande d'installation.\n\n📦 Commande: ${order.orderNumber}\n🔧 Produit: ${order.productName}\n📅 Programmé: ${order.installationDate}\n📍 Adresse: ${order.address}\n\nAu plaisir de votre service!`,
    
    pt: `Olá ${contact.name}! 👋\n\nEstou entrando em contato sobre meu pedido de instalação.\n\n📦 Pedido: ${order.orderNumber}\n🔧 Produto: ${order.productName}\n📅 Agendado: ${order.installationDate}\n📍 Endereço: ${order.address}\n\nAguardo seu serviço!`,
    
    ar: `مرحباً ${contact.name}! 👋\n\nأتواصل معك بخصوص طلب التثبيت الخاص بي.\n\n📦 الطلب: ${order.orderNumber}\n🔧 المنتج: ${order.productName}\n📅 الموعد: ${order.installationDate}\n📍 العنوان: ${order.address}\n\nفي انتظار خدمتك!`
  };

  const message = greetings[language] || greetings.en;
  const encodedMessage = encodeURIComponent(message);

  // WhatsApp URL scheme
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

/**
 * Open WhatsApp in new window/tab
 */
export function openWhatsApp(link: string): void {
  window.open(link, '_blank', 'noopener,noreferrer');
}

