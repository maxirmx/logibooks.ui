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
  Status: 'Статус',
  CheckStatusId: 'Проверка'
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
 * Determine if a check status id indicates issues
 * @param {number} checkStatusId - The check status identifier
 * @returns {boolean} True if the id is > 100 and <= 200
 */
export function HasIssues(checkStatusId) {
  return checkStatusId > 100 && checkStatusId <= 200
}
