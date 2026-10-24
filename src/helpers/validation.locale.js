// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { setLocale } from 'yup'

// Set before the application imports form schemas, including implicit type checks.
setLocale({
  mixed: { default: 'Некорректное значение', required: 'Обязательное поле', notType: 'Неверный тип значения', oneOf: 'Выберите допустимое значение', notOneOf: 'Выберите другое значение' },
  string: { min: 'Минимальная длина: ${min}', max: 'Максимальная длина: ${max}', length: 'Требуемая длина: ${length}', matches: 'Неверный формат значения', email: 'Введите корректный адрес электронной почты', url: 'Введите корректный адрес сайта', trim: 'Удалите пробелы в начале и конце', lowercase: 'Используйте строчные буквы', uppercase: 'Используйте заглавные буквы' },
  number: { min: 'Минимальное значение: ${min}', max: 'Максимальное значение: ${max}', lessThan: 'Значение должно быть меньше ${less}', moreThan: 'Значение должно быть больше ${more}', positive: 'Введите положительное число', negative: 'Введите отрицательное число', integer: 'Введите целое число' },
  date: { min: 'Дата должна быть не раньше ${min}', max: 'Дата должна быть не позже ${max}' },
  array: { min: 'Выберите не менее ${min}', max: 'Выберите не более ${max}', length: 'Требуемое количество: ${length}' }
})
