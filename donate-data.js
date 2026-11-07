// Каталог донатов Анархии Pristal. Правьте ТОЛЬКО этот файл — страница donate.html возьмёт всё отсюда.
window.PRISTAL_DONATE = {
  // true — на карточках плашка «ПРИМЕР» и предупреждение (товары и цены ниже ненастоящие).
  // Когда впишете свои товары и цены, поставьте false.
  demo: true,
  server: 'Анархия Pristal',
  status: 'Сервер скоро откроется — дату объявим в новостях',
  currency: '₽',
  discord: 'https://discord.gg/AFW8sKsUG',
  // Ссылка на оплату или на создание тикета. Пусто — заказ оформляется через Discord проекта.
  payUrl: '',
  // Оплата через виджет DonatePay (принимаются только адреса https://widget.donatepay.ru/...).
  // Сумма из корзины подставляется в форму автоматически. Уберите блок donatepay, если форма не нужна.
  donatepay: {
    widget: 'https://widget.donatepay.ru/widgets/page/f1734741f3aed9af4b1d705a7e885f9697394d6a06df7e8cca023fd88241ad7d?widget_id=7928594',
    sum: 300,          // сумма по умолчанию
    height: 312,       // высота формы на компьютере
    mobileHeight: 430  // высота формы на телефоне
  },
  categories: [
    { id: 'ranks', name: 'Привилегии', icon: '👑' },
    { id: 'kits',  name: 'Наборы',     icon: '🎁' },
    { id: 'style', name: 'Косметика',  icon: '✨' }
  ],
  // tier: common | rare | epic | legend — цвет рамки карточки. perks — список возможностей (в «Привилегиях» они сравниваются в таблице).
  items: [
    { id: 'guard',   cat: 'ranks', name: 'Страж',   icon: '🛡️', price: 149, tier: 'common', short: 'Старт для новичка',
      perks: ['Префикс в чате', 'Цветной ник'] },
    { id: 'knight',  cat: 'ranks', name: 'Рыцарь',  icon: '⚔️', price: 349, tier: 'rare',   short: 'Для тех, кто играет регулярно',
      perks: ['Префикс в чате', 'Цветной ник', 'Приоритет в очереди входа'] },
    { id: 'legend',  cat: 'ranks', name: 'Легенда', icon: '👑', price: 699, tier: 'legend', short: 'Всё самое лучшее',
      perks: ['Префикс в чате', 'Цветной ник', 'Приоритет в очереди входа', 'Эксклюзивные эффекты'] },
    { id: 'start',   cat: 'kits',  name: 'Набор «Старт»',     icon: '🎒', price: 99,  tier: 'common', short: 'Чтобы не начинать с нуля',
      perks: ['Содержимое набора — впишите сюда'] },
    { id: 'builder', cat: 'kits',  name: 'Набор строителя',   icon: '🧱', price: 199, tier: 'rare',   short: 'Для больших проектов',
      perks: ['Содержимое набора — впишите сюда'] },
    { id: 'warrior', cat: 'kits',  name: 'Набор воина',       icon: '🗡️', price: 299, tier: 'epic',   short: 'Для самых опасных походов',
      perks: ['Содержимое набора — впишите сюда'] },
    { id: 'color',   cat: 'style', name: 'Особый цвет в чате', icon: '🎨', price: 79,  tier: 'common', short: 'Выделись в общем чате',
      perks: ['Цвет сообщений в чате'] },
    { id: 'trail',   cat: 'style', name: 'Звёздный след',      icon: '🌟', price: 129, tier: 'rare',   short: 'Красивый эффект при ходьбе',
      perks: ['Эффект частиц за игроком'] },
    { id: 'tag',     cat: 'style', name: 'Уникальный префикс', icon: '🏷️', price: 249, tier: 'epic',   short: 'Свой префикс рядом с ником',
      perks: ['Префикс по вашему выбору (по правилам сервера)'] }
  ]
};
