import { useManualScan } from './useManualScan.js'
import { BOX_SCAN } from '@/helpers/manual.scan.helpers.js'

export function useManualBoxScan(options) {
  return useManualScan({ ...options, target: BOX_SCAN })
}
