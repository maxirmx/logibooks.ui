const rules = new Intl.PluralRules('ru')
const words = { parcel: { one: 'посылка', few: 'посылки', many: 'посылок', other: 'посылки' }, box: { one: 'коробка', few: 'коробки', many: 'коробок', other: 'коробки' } }

export function scanSelectionMessage(count, kind) {
  const form = rules.select(count)
  return `${form === 'one' ? 'Выбрана' : 'Выбрано'} ${count} ${words[kind][form]}`
}
