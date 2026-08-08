// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { useConfirm } from 'vuetify-use-dialog'
import {
  APP_DIALOG_BUTTON_PROPS,
  APP_DIALOG_MAX_WIDTH,
  getAppDialogWidth
} from '@/helpers/dialog.helpers.js'

function mergeClass(existingClass, requiredClass) {
  return existingClass ? [existingClass, requiredClass] : requiredClass
}

export function useAppConfirm() {
  const confirm = useConfirm()

  return (options = {}) => {
    const {
      size = 'small',
      dialogProps = {},
      cardProps = {},
      cardTitleProps = {},
      cardTextProps = {},
      cardActionsProps = {},
      confirmationButtonProps = {},
      cancellationButtonProps = {},
      ...confirmOptions
    } = options

    const normalizedDialogProps = { ...dialogProps }
    delete normalizedDialogProps.width
    delete normalizedDialogProps.minWidth
    delete normalizedDialogProps.maxWidth

    return confirm({
      ...confirmOptions,
      dialogProps: {
        ...normalizedDialogProps,
        width: getAppDialogWidth(size),
        maxWidth: APP_DIALOG_MAX_WIDTH
      },
      cardProps: {
        ...cardProps,
        class: mergeClass(cardProps.class, 'app-dialog-frame')
      },
      cardTitleProps: {
        ...cardTitleProps,
        class: mergeClass(cardTitleProps.class, 'app-dialog-frame__title')
      },
      cardTextProps: {
        ...cardTextProps,
        class: mergeClass(
          cardTextProps.class,
          'app-dialog-frame__content app-confirm-dialog__content'
        )
      },
      cardActionsProps: {
        ...cardActionsProps,
        class: mergeClass(cardActionsProps.class, 'app-dialog-frame__actions')
      },
      confirmationButtonProps: {
        ...APP_DIALOG_BUTTON_PROPS.destructive,
        ...confirmationButtonProps
      },
      cancellationButtonProps: {
        ...APP_DIALOG_BUTTON_PROPS.secondary,
        ...cancellationButtonProps
      }
    })
  }
}
