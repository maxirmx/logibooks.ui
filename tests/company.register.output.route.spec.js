/* @vitest-environment jsdom */
import { describe, expect, it } from 'vitest'
import router from '@/router'
import { COMPANY_REGISTER_OUTPUT_TYPES } from '@/helpers/company.constants.js'

describe('company register output format route', () => {
  const path = '/company/edit/:id/register-output/:registerType'

  it('resolves the editor with numeric company and supported register type props', () => {
    const route = router.getRoutes().find((item) => item.path === path)
    expect(route?.meta.reqAdminOrSrLogist).toBe(true)
    const props = route.props.default({ params: { id: '42', registerType: String(COMPANY_REGISTER_OUTPUT_TYPES[0]) } })
    expect(props).toEqual({ id: 42, registerType: COMPANY_REGISTER_OUTPUT_TYPES[0] })
    expect(router.resolve(`/company/edit/42/register-output/${COMPANY_REGISTER_OUTPUT_TYPES[0]}`).name)
      .toBe('Формат выгрузки реестра компании')
  })

  it('redirects unsupported register types back to company settings', () => {
    const route = router.getRoutes().find((item) => item.path === path)
    expect(route.beforeEnter({ params: { id: '42', registerType: '2' } })).toBe('/company/edit/42')
    expect(route.beforeEnter({ params: { id: '42', registerType: String(COMPANY_REGISTER_OUTPUT_TYPES[2]) } })).toBe(true)
  })
})
