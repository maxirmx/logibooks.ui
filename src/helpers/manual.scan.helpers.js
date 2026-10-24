import ParcelScanConfirmationContent from '@/components/ParcelScanConfirmationContent.vue'
import BoxScanConfirmationContent from '@/components/BoxScanConfirmationContent.vue'
import { parcelScanDisabledReason, parcelScanId, parcelScanSuccessMessage } from './parcel.scan.helpers.js'
import { isPhysicalMonitorBox } from './scanjob.monitor.helpers.js'
export { MANUAL_SCAN_KEY } from './manual.scan.key.js'

export function boxScanId(box) {
  if (box?.area != null && !isPhysicalMonitorBox(box)) return null
  const id = Number(box?.boxId ?? box?.id)
  return Number.isInteger(id) && id > 0 ? id : null
}

export function boxScanDisabledReason(job, constants) {
  if (!job || !constants || Number(job.status) !== constants.inProgressStatus) return 'Нет активного задания сканирования'
  return Number(job.type) === constants.parcelOnlyType ? 'Задание поддерживает только сканирование посылок' : ''
}

export function boxScanSuccessMessage({ completed, matched, lookup, empty, matchedParcels }) {
  if (completed === 1) {
    if (empty) return 'В коробке нет посылок'
    if (lookup) return matched ? `В коробке есть посылки, соответствующие условиям поиска: ${matchedParcels}` : 'В коробке нет посылок, соответствующих условиям поиска'
  }
  const summary = `Отсканировано коробок: ${completed - empty}.`
  return `${summary}${lookup ? ` Содержат посылки, соответствующие условиям поиска: ${matched}. Найдено посылок: ${matchedParcels}.` : ''}${empty ? ` Пустых коробок: ${empty}.` : ''}`
}

export const PARCEL_SCAN = {
  kind: 'parcel', getId: parcelScanId, disabledReason: parcelScanDisabledReason,
  incompatibleType: 'boxOnlyType', scanMethod: 'scanParcel', title: 'Сканирование посылок',
  confirmation: ParcelScanConfirmationContent, successMessage: parcelScanSuccessMessage,
  failureEntity: 'посылке', checkEntity: 'проверьте посылку', isEmpty: () => false
}

export const BOX_SCAN = {
  kind: 'box', getId: boxScanId, disabledReason: boxScanDisabledReason,
  incompatibleType: 'parcelOnlyType', scanMethod: 'scanBox', title: 'Сканирование коробок',
  confirmation: BoxScanConfirmationContent, successMessage: boxScanSuccessMessage,
  failureEntity: 'коробке', checkEntity: 'проверьте коробку', isEmpty: result => result?.boxCount === 0
}
