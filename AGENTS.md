# Logibooks UI agent rules

These instructions apply to the entire repository. Follow them for every new feature, refactor, bug fix, and test update.

## Error propagation and ownership

- Every user-relevant failure must be displayed exactly once or rethrown to a caller that will display it.
- Store methods may update reactive `error` state, but transport and server failures must still reject. Use `false` or `null` only for legitimate domain outcomes.
- The UI operation closest to the user action owns presentation. Domain stores must not also publish the same notification.
- A helper that catches an error must either handle it completely and return an explicit unsuccessful result, or add context and rethrow it.
- Never leave a promise rejection unobserved. Do not use empty catches or `.catch(() => {})`.
- Expected cancellation, teardown, or unmount failures must use an explicit catch with a comment explaining why no user message is needed. Report unexpected technical failures through `reportError`.
- Never render an `Error` object directly. Use `getErrorMessage` or pass it to `useAlertStore().error`, which normalizes it.

## Message presentation

- Publish application messages through `useAlertStore`; do not introduce page-specific alert stores or custom notification mechanisms.
- Every route-level list, edit form, settings form, and full-screen dialog must render one `PageAlertRegion` immediately after its `<hr class="hr">` header rule.
- Do not render global alerts at the bottom of forms or tables.
- Put validation messages directly with their fields, on a dedicated row beneath the associated control. They must never participate in the control's horizontal flex row or reduce the control's width. Put general API and load failures in `PageAlertRegion`.
- For compound controls, keep the input and its action buttons in an inner row and place one `FieldError` beneath that row. Render radio- and checkbox-group errors once after the group, never inside repeated options.
- Use `ErrorDialog` only for blocking file/import workflows that require acknowledgement.
- Failed submissions must keep the form open and preserve entered values. Navigate only after confirmed success, except when a partially completed workflow has a documented recovery route.
- The alert store has one active position. Every newly published message replaces the previous one.
- Errors remain visible until dismissed, replaced, or cleared by successful route navigation.
- Successful route changes must clear the active alert so messages from the previous page are not retained.

## Testing requirements

- Add a rejection-path test whenever an asynchronous operation is added or changed.
- Verify both propagation and visible presentation, not merely that an alert-store mock was called.
- Test that failed forms do not navigate and that retries execute the intended operation.
- Check for duplicate reporting across stores, helpers, components, and global handlers.

## Verification checklist

Before handing off a change:

1. Run the directly affected tests.
2. Run `npm run lint` (check-only; use `npm run lint:fix` only intentionally).
3. Run `npm test` and `npm run coverage` when the change affects shared behavior.
4. Run `npm run build`.
5. Search for prohibited patterns:
   - `rg -n "\\.catch\\(\\(\\) => \\{\\}\\)|catch \\([^)]*\\) \\{\\s*\\}" src`
   - `rg -n 'v-if="alert|\{\{\s*alert\\.message' src --glob '*.vue' --glob '!PageAlertRegion.vue'`
6. Confirm each affected page has exactly one `PageAlertRegion` after its header rule.
7. Confirm visible validation errors do not shrink, hide, or displace their associated controls.

