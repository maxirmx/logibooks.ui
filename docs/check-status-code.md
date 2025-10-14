# CheckStatusCode Helper

JavaScript implementation of the CheckStatusCode class for handling combined check status codes.

## Overview

This helper provides functionality to work with combined check status codes that are composed of:
- **FC (FEACN Code) Check Status** - stored in the upper 16 bits
- **SW (Stop Word) Check Status** - stored in the lower 16 bits

## Usage

### Basic Usage

```javascript
import CheckStatusCode, { 
  CheckStatusHelper, 
  FCCheckStatus, 
  SWCheckStatus,
  WStatusValues
} from '@/helpers/check.status.code.js'

// Create from parts
const status = CheckStatusCode.fromParts(FCCheckStatus.ApprovedWithExcise, SWCheckStatus.NoIssues)
console.log(status.toString()) // "Ok стоп слова, Согласовано с акцизом"

// Special combined statuses
const approved = CheckStatusCode.ApprovedWithExcise
console.log(approved.toString()) // "Согласовано с акцизом"

const marked = CheckStatusCode.MarkedByPartner  
console.log(marked.toString()) // "Исключено партнёром"

// Create from integer
const status2 = CheckStatusCode.fromInt(0x00300010)
console.log(status2.fc) // 48 (0x0030)
console.log(status2.sw) // 16 (0x0010)

// Check for issues
const hasIssues = CheckStatusCode.hasIssues(0x01000100) // true

// Use predefined constants
const notChecked = CheckStatusCode.NotChecked
const noIssues = CheckStatusCode.NoIssues
```

### Modifying Status Components

```javascript
// Replace FC component while preserving SW
const originalStatus = CheckStatusCode.fromParts(FCCheckStatus.NotChecked, SWCheckStatus.NoIssues)
const withNewFC = CheckStatusCode.withFC(originalStatus, FCCheckStatus.ApprovedWithExcise)

// Replace SW component while preserving FC  
const withNewSW = CheckStatusCode.withSW(originalStatus, SWCheckStatus.MarkedByPartner)
```

### Using the Helper Class

```javascript
// Compose and decompose
const combined = CheckStatusHelper.compose(FCCheckStatus.ApprovedWithExcise, SWCheckStatus.NoIssues)
const { fc, sw } = CheckStatusHelper.decompose(combined)

// Check for issues
const hasIssues = CheckStatusHelper.hasIssues(combined)

// Working with specific issue types
const fcIssue = CheckStatusCode.fromParts(FCCheckStatus.IssueNonexistingFeacn, SWCheckStatus.NoIssues)
console.log(fcIssue.toString()) // "Нет ТН ВЭД"

const swIssue = CheckStatusCode.fromParts(FCCheckStatus.NoIssues, SWCheckStatus.IssueStopWord)
console.log(swIssue.toString()) // "Стоп слово, Ok ТН ВЭД"

const mixedIssues = CheckStatusCode.fromParts(FCCheckStatus.IssueInvalidFeacnFormat, SWCheckStatus.IssueStopWord)
console.log(mixedIssues.toString()) // "Стоп слово, Формат ТН ВЭД"
```

## Status Enumerations

### WStatusValues (Common Status Values)
- `ApprovedWithExcise: 0x0230` (560)
- `MarkedByPartner: 0x01FF` (511)

### FCCheckStatus (FEACN Code Check Status)
- `NotChecked: 0`
- `NoIssues: 0x0010` (16)
- `ApprovedWithExcise: 0x0030` (48)
- `IssueFeacnCode: 0x0100` (256)
- `IssueNonexistingFeacn: 0x0101` (257)
- `IssueInvalidFeacnFormat: 0x0102` (258)
- `MarkedByPartner: 0x01FF` (511)

### SWCheckStatus (Stop Word Check Status)  
- `NotChecked: 0x0000` (0)
- `NoIssues: 0x0010` (16)
- `Approved: 0x0020` (32)
- `ApprovedWithExcise: 0x0030` (48)
- `IssueStopWord: 0x0100` (256)
- `MarkedByPartner: 0x01FF` (511)

## Predefined Constants

- `CheckStatusCode.NotChecked` - Both FC and SW are NotChecked
- `CheckStatusCode.NoIssues` - Both FC and SW are NoIssues
- `CheckStatusCode.ApprovedWithExcise` - Both FC and SW are ApprovedWithExcise
- `CheckStatusCode.MarkedByPartner` - Both FC and SW are MarkedByPartner

## Localized String Representation

The `toString()` method provides localized Russian descriptions of check statuses:

### Special Combined Statuses
- `ApprovedWithExcise` → "Согласовано с акцизом"
- `MarkedByPartner` → "Исключено партнёром"

### SW (Stop Word) Status Strings
- `NotChecked` → "" (empty)
- `NoIssues` → "Ok стоп слова"
- `Approved` → "Согласовано"
- `IssueStopWord` → "Стоп слово"

### FC (FEACN Code) Status Strings  
- `NotChecked` → "" (empty)
- `NoIssues` → "Ok ТН ВЭД"
- `IssueFeacnCode` → "Стоп ТН ВЭД"
- `IssueNonexistingFeacn` → "Нет ТН ВЭД"
- `IssueInvalidFeacnFormat` → "Формат ТН ВЭД"

**Note:** For non-special combinations, the method combines SW and FC strings with ", " (comma + space), excluding empty strings.

## Testing

Run the comprehensive test suite:

```bash
npm test tests/check.status.code.spec.js
```

The tests cover:
- Enum value verification
- Constructor variants
- Component extraction methods
- Status composition and decomposition
- Issue detection
- String formatting
- Equality comparison
- Component replacement methods
- Predefined constants
- Integration scenarios