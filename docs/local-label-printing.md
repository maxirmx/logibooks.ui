# Local label printing

Deploy Core #946 first. Configure its QZ signing certificate and HTTPS UI origins
using the [LogiBooks Linux/Windows setup guide](https://github.com/maxirmx/logibooks.core/blob/main/docs/local-label-printing-setup.md).
This UI pins `qz-tray` 2.3.0 and uses SHA512 server signing. No private key is
installed in the UI or workstation. Use a managed Windows workstation, QZ Tray
Free with the LogiBooks root trusted, and a raw Windows queue for a USB TE200.

Open the scan-job monitor and select **Принтер этикеток**. Select the actual Windows
queue; TE200 queues appear first. Save the choice. It is stored only in this
browser's local storage and is revalidated after reconnect. A missing queue
requires selection again. Printing remains optional and does not change scanning,
parcel data, box selection, monitor navigation, or Android behavior.

WbrN/Ozon monitor rows with Core `printableTemplates` show **Печать / повтор**.
Every click fetches fresh Core label bytes and sends them unchanged as raw base64.
Success means the label was sent to the printer queue; physical output is not
confirmed. Controls prevent overlapping manual clicks. Selecting another parcel
while choosing a printer does not change the captured print operation.

For automatic relabeling, choose the scanner operator to follow, connect/select
the printer, then select **KGT** or **TJ**. Only Core's live `printCandidates` are
accepted for this job/operator and mode. TJ maps to `TJ_EXPORT`. Core decides
eligibility and assigns KGT numbers. Initial snapshots and reconnect snapshots
never print labels. Box navigation uses a separate subscription and does not
interrupt printing. Changing job/operator, closing a job, logout, or leaving the
monitor turns automatic printing off and cancels unsubmitted work. Already
submitted jobs cannot be canceled by the UI.

Only one tab in the same browser can own automatic printing (Web Locks on HTTPS,
Chrome/Edge). One deliberately armed workstation per scanner operator is still
required: ownership across different browsers or PCs is outside this feature.
The UI remembers up to 10,000 automatic event keys per application session. Work
is deduplicated by job, scan code, template, and revision; a new scan can print
again. Manual **Повтор последней этикетки** deliberately bypasses this suppression.

QZ/connection/submission errors pause the serial queue and show a retryable scan.
No uncertain submission is retried automatically. **Повторить отправку** asks for
confirmation because it may produce a duplicate. A connection-only pause has a
**Продолжить** action. Reconnect QZ and fix the printer/trust configuration first.
If the saved queue disappears, **Принтер этикеток** remains available while paused:
choose another queue, then explicitly retry. This preserves the failed scan and
waiting queue. Continue verifies both QZ readiness and the scanner subscription;
it keeps the pause if either is unavailable.
The queue holds at most 50 waiting labels. Overflow displays the first unaccepted
scan and pauses; stop automatic printing and check the affected scans before
arming again. The UI does not silently replay rows to recover missing work.
Core cached relabeling results expire on restart, after 24 hours, or on eviction;
an `Expired` response requires operator recovery, never guessed label content.

## Workstation acceptance

Automated tests mock QZ, Core, and tab ownership. Physical acceptance must be
performed before enabling automatic printing in production. Record Windows and
QZ versions, the exact driver/version and queue name, stock settings (58 × 40 mm),
and the outcome below. Do not rely on `forceRaw` to fix the Windows driver path.

| Check | Workstation result |
| --- | --- |
| WbrN/Ozon manual print and repeat; Cyrillic, dimensions, QR/barcodes | Pending hardware |
| Eligible KGT and TJ live scans; ineligible/problem scans produce no print | Pending hardware |
| QZ/browser restart; saved queue restoration; missing queue selection | Pending hardware |
| QZ stop/start, USB unplug/replug, trust/signature rejection | Pending hardware |
| Silent trusted operation; uncertain submission retry confirmation | Pending hardware |
| Box navigation bursts, operator/job changes, and second-tab ownership | Pending hardware |

Reference: [QZ server signing](https://qz.io/docs/signing) and
[raw printing](https://qz.io/docs/raw).
