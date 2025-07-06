export const registerColumnTitles = {
  RowNumber: 'п/п',
  OrderNumber: 'Номер заказа',
  InvoiceDate: 'Дата инвойса',
  Sticker: 'Стикер',
  Shk: 'ШК',
  StickerCode: 'Код стикера',
  ExtId: 'ext_id',
  TnVed: 'ТН ВЭД',
  SiteArticle: 'Артикул сайта',
  HeelHeight: 'Высота каблука (подошвы), см',
  Size: 'Размер',
  ProductName: 'Наименование товара',
  Description: 'Описание',
  Gender: 'Пол',
  Brand: 'Бренд',
  FabricType: 'Тип ткани',
  Composition: 'Состав',
  Lining: 'Подкладка',
  Insole: 'Стелька',
  Sole: 'Подошва',
  Country: 'Страна',
  FactoryAddress: 'Завод адрес',
  Unit: 'Единица измерения',
  WeightKg: 'Масса, кг',
  Quantity: 'Кол-во',
  UnitPrice: 'Цена за 1 шт',
  Currency: 'Валюта',
  Barcode: 'Баркод',
  Declaration: 'ГТД',
  ProductLink: 'Ссылка на товар',
  RecipientName: 'ФИО получателя физ. лица',
  RecipientInn: 'ИНН получателя физ. лица',
  PassportNumber: 'Номер паспорта',
  Pinfl: 'Пинфл',
  RecipientAddress: 'Адрес получателя физического лица',
  ContactPhone: 'Контактный номер',
  BoxNumber: 'Номер коробки',
  Supplier: 'Поставщик',
  SupplierInn: 'ИНН Поставщика',
  Category: 'Категория',
  Subcategory: 'Подкатегория',
  PersonalData: 'Персональные данные',
  CustomsClearance: 'Таможенное оформление',
  DutyPayment: 'Оплата пошлины',
  OtherReason: 'Другая причина',
  Status: 'Статус'
}

export const registerColumnTooltips = {
  FabricType: 'для обуви "ОБУВЬ", для одежды "трикотаж", "текстиль"',
  Composition: 'для обуви материал верха',
  Unit: 'шт., пара',
  WeightKg: 'указывается в килограммах',
  UnitPrice: 'цена за единицу товара',
  RecipientName: 'полное имя физического лица получателя',
  RecipientInn: 'индивидуальный номер налогоплательщика получателя',
  RecipientAddress: 'полный адрес получателя для доставки',
  SupplierInn: 'индивидуальный номер налогоплательщика поставщика'
}

/**
 * Get status color class based on statusId value
 * @param {number} statusId - The status ID to determine color for
 * @returns {string} Color class name (blue, red, green, or default)
 */
export function getStatusColor(statusId) {
  if (!statusId) return 'default'
  
  // Color mapping based on statusId ranges
  if (statusId <= 100) {
    return 'blue'   // statusId <= 100
  } else if (statusId > 100 && statusId <= 200) {
    return 'red'    // statusId > 100 and <= 200
  } else {
    return 'green'  // statusId > 200
  }
}
