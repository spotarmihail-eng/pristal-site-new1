// Каталог донатов Анархии Pristal. Правьте ТОЛЬКО этот файл — страница donate.html возьмёт всё отсюда.
window.PRISTAL_DONATE = {
  // true — на карточках плашка «ПРИМЕР» и предупреждение (товары и цены ниже ненастоящие).
  // Когда впишете свои товары и цены, поставьте false.
  demo: false,
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
    { id: 'ranks', name: 'Привилегии', icon: '👑' }
  ],
  // code — внутреннее название привилегии (его видит администрация в заказе). perks — список возможностей: пока не заполнен,
  // впишите строки вида 'Префикс в чате' — тогда они появятся на карточке, а в «Привилегиях» включится кнопка «Сравнить».
  items: [
    { id: 'warrior', code: 'warrior', cat: 'ranks', name: 'ВОИН',      icon: '⚔️', price: 15,  tier: 'common', short: 'Привилегия Анархии Pristal',
      note: 'Подробности о возможностях уточняйте в Discord проекта.', perks: [] },
    { id: 'fighter', code: 'fighter', cat: 'ranks', name: 'БОЕЦ',      icon: '🥊', price: 45,  tier: 'rare',   short: 'Привилегия Анархии Pristal',
      note: 'Подробности о возможностях уточняйте в Discord проекта.', perks: [] },
    { id: 'emperor', code: 'emperor', cat: 'ranks', name: 'ИМПЕРАТОР', icon: '👑', price: 156, tier: 'epic',   short: 'Привилегия Анархии Pristal',
      note: 'Подробности о возможностях уточняйте в Discord проекта.', perks: [] },
    { id: 'wild',    code: 'wild',    cat: 'ranks', name: 'ДИКИЙ',     icon: '🐺', price: 275, tier: 'legend', short: 'Привилегия Анархии Pristal',
      note: 'Подробности о возможностях уточняйте в Discord проекта.', perks: [] }
  ]
};
