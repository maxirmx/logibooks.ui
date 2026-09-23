import { getCurrentInstance, onUnmounted, ref } from 'vue'
import { COMPANY_REGISTER_OUTPUT_TYPES } from '@/helpers/company.constants.js'
import { reportError } from '@/helpers/error.helpers.js'

function supportsCompanyFormat(register) {
  return COMPANY_REGISTER_OUTPUT_TYPES.includes(Number(register?.registerType || register?.companyId))
}

export function useRegisterDownloadFlow(registersStore, alertStore) {
  const pending = ref(false)
  const companyFormatName = ref('')
  let formatRequest = 0
  let disposed = false

  async function loadFormats(register) {
    if (disposed) return false
    const request = ++formatRequest
    companyFormatName.value = ''
    if (!register?.id || !supportsCompanyFormat(register)) return

    try {
      const formats = await registersStore.getDownloadFormats(register.id)
      if (disposed || request !== formatRequest) return
      const company = formats?.company
      if (company?.available === true) {
        companyFormatName.value = company.name?.replace(/^Company format\s*—\s*/, '') || ''
      }
    } catch (error) {
      if (disposed || request !== formatRequest) return
      alertStore.error(error, {
        fallback: 'Не удалось получить доступные форматы выгрузки',
        action: { label: 'Повторить', handler: () => loadFormats(register) }
      })
    }
  }

  async function runCaptured(request) {
    if (disposed || pending.value) return false
    pending.value = true
    try {
      request.onDownloadStart?.()
      try {
        if (request.supportsCompany) {
          await registersStore.download(
            request.registerId,
            request.filename,
            request.forZone,
            request.zoneLabel,
            request.applyWeightCorrection,
            request.format
          )
        } else if (request.applyWeightCorrection) {
          await registersStore.download(
            request.registerId, request.filename, request.forZone, request.zoneLabel, true
          )
        } else {
          await registersStore.download(
            request.registerId, request.filename, request.forZone, request.zoneLabel
          )
        }
      } finally {
        request.onDownloadEnd?.()
      }
      return !disposed
    } catch (error) {
      if (disposed) {
        // The in-flight download still runs its cleanup, but no longer owns page alerts.
        reportError(error, { context: 'register download after disposal' })
        return false
      }
      alertStore.error(error, {
        fallback: 'Не удалось выгрузить реестр',
        action: { label: 'Повторить', handler: () => runCaptured(request) }
      })
      return false
    } finally {
      pending.value = false
    }
  }

  function download({ register, format = 'generic', forZone = null, zoneLabel,
    applyWeightCorrection = false, onDownloadStart, onDownloadEnd }) {
    if (!register?.id) return Promise.resolve(false)
    const supportsCompany = supportsCompanyFormat(register)
    if (format === 'company' && (!supportsCompany || !companyFormatName.value)) {
      return Promise.resolve(false)
    }
    return runCaptured({
      registerId: register.id,
      supportsCompany,
      format,
      filename: register.fileName,
      forZone,
      zoneLabel,
      applyWeightCorrection,
      onDownloadStart,
      onDownloadEnd
    })
  }

  if (getCurrentInstance()) {
    onUnmounted(() => {
      disposed = true
      formatRequest += 1
    })
  }

  return { pending, companyFormatName, loadFormats, download }
}
