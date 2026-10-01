import { getErrorMessage } from './error.helpers.js'

export const LABEL_PRINTING_KEY = Symbol('localLabelPrinting')
const messages = {
  QzDisabled: 'Печать отключена на сервере. Обратитесь к администратору.',
  QzOriginRejected: 'Сервер не разрешает печать с этого адреса UI.',
  QzUnavailable: 'QZ Tray недоступен. Запустите QZ Tray и подключитесь снова.',
  QzTrustRejected: 'QZ Tray отклонил доверие или подпись. Проверьте сертификаты и разрешение сайта.',
  NoPrinters: 'В Windows не найдены принтеры. Установите очередь принтера.',
  NoSelection: 'Выберите локальный принтер для этикеток.',
  PrinterMissing: 'Сохранённый принтер отсутствует. Выберите принтер заново.',
  Unavailable: 'Этикетка недоступна для этой посылки или результата сканирования.',
  InvalidData: 'Данные этикетки некорректны.',
  Overflow: 'Содержимое не помещается на этикетке 58 × 40 мм.',
  Expired: 'Результат печати устарел или сервер был перезапущен. Повторите сканирование при необходимости.',
  RevisionChanged: 'Версия этикетки изменилась. Автопечать приостановлена.',
  SubmissionFailed: 'Не удалось подтвердить отправку этикетки. Повтор может напечатать дубликат.',
  QueueOverflow: 'Очередь автопечати переполнена. Печать приостановлена; проверьте пропущенные сканы перед повторным включением.',
  OtherTab: 'Автопечать уже включена в другой вкладке этого браузера.',
  OwnershipUnavailable: 'Браузер не поддерживает безопасную автопечать в одной вкладке. Используйте Chrome/Edge через HTTPS.',
  NoOperator: 'Выберите оператора сканера перед включением автопечати.'
}
export function getPrintingErrorMessage(error) {
  const serverCode = error?.data?.code || error?.cause?.data?.code
  return messages[serverCode || error?.code] || getErrorMessage(error, 'Ошибка локальной печати')
}
