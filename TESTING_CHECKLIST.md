# Manual Testing Checklist - Validation Implementation

**Purpose:** Verify that all validation changes work correctly in the actual application
**Date:** February 2026
**Tester:** _______________

---

## Pre-Testing Setup

- [ ] Backend server is running (`npm run start-backend`)
- [ ] Frontend server is running (`npm run start-frontend`)
- [ ] Browser console is open (F12) to check for errors
- [ ] Network tab is open to monitor API requests

---

## Important Note: HTML5 Validation

**All numeric fields use `type="number"` inputs**, which means:
- Browser automatically prevents typing letters (HTML5 validation)
- Only numbers, decimal points, and minus signs can be entered
- You **cannot** test "enter text" scenarios via the UI
- Our custom validation focuses on **range checking** (negative, too large, zero, etc.)
- Backend validation provides a **security layer** for API calls that bypass the frontend

**Fields with HTML5 number validation:**
- Molecular Weight
- Amount (in procedure design)
- Temperature
- Pressure
- Conversion %
- Yield %
- Selectivity %

**Fields with text input:**
- CAS Number (uses `type="text"` with format validation)
- SMILES (uses `type="text"` with syntax validation)
- Alias, Name, etc.

---

## 1. MaterialForm Inline Validation Testing

### Test 1.1: Molecular Weight Validation

**Note:** The Molecular Weight field uses `type="number"`, so browser HTML5 validation prevents text entry. Only numeric values can be entered. Our validation focuses on range checking.

- [ ] **Test:** Try to enter text (e.g., "invalid")
  - [ ] **Expected:** Browser prevents typing letters (HTML5 validation)
  - [ ] **Expected:** Only numbers, decimal point, and minus sign can be typed

- [ ] **Test:** Enter negative number (e.g., "-50")
  - [ ] **Expected:** Red border appears when you click away
  - [ ] **Expected:** Error message: "Must be greater than 0"

- [ ] **Test:** Enter very large number (e.g., "50000")
  - [ ] **Expected:** Red border appears when you click away
  - [ ] **Expected:** Error message: "Cannot exceed 10000"

- [ ] **Test:** Enter zero (0)
  - [ ] **Expected:** Red border appears when you click away
  - [ ] **Expected:** Error message: "Must be greater than 0"

- [ ] **Test:** Enter valid number (e.g., "46.07")
  - [ ] **Expected:** No error, field looks normal

### Test 1.2: CAS Number Validation

- [ ] **Test:** Enter invalid format (e.g., "12345")
  - [ ] **Expected:** Error message: "Invalid format (expected: 123-45-6)"

- [ ] **Test:** Enter letters (e.g., "abc-de-f")
  - [ ] **Expected:** Error message about invalid format

- [ ] **Test:** Enter valid short CAS (e.g., "64-17-5")
  - [ ] **Expected:** No error

- [ ] **Test:** Enter valid long CAS (e.g., "7732-18-5")
  - [ ] **Expected:** No error

### Test 1.3: Alias Required Field

- [ ] **Test:** Leave Alias empty and click away
  - [ ] **Expected:** Error message: "Alias is required"

- [ ] **Test:** Try to submit form with empty Alias
  - [ ] **Expected:** Form blocked, error shown

### Test 1.4: Error Clearing

- [ ] **Test:** Trigger an error, then start typing in the field
  - [ ] **Expected:** Error disappears immediately when you start typing

### Test 1.5: Submit Validation

- [ ] **Test:** Fill form with multiple errors and click "Add Material"
  - [ ] **Expected:** All errors highlighted at once
  - [ ] **Expected:** Form not submitted

- [ ] **Test:** Fix all errors and submit
  - [ ] **Expected:** Form submits successfully
  - [ ] **Expected:** Material appears in table

---

## 2. Backend Validation Testing

**Purpose:** These tests verify backend validation works as a security layer, even if someone bypasses frontend HTML5 validation (e.g., via API calls, modified browser, or scripts). For numeric fields, the UI prevents text entry, so these tests use browser console to directly call the API.

### Test 2.1: Molecular Weight Backend Validation

**Note:** These tests bypass the frontend HTML5 validation by calling the API directly. This verifies backend security.

- [ ] **Test:** Add material with MW=46.07 (float)
  - [ ] **Method:** Browser console: `fetch('/api/experiment/materials', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify([{name: 'Test', alias: 'T', molecular_weight: 46.07, role: 'Reactant'}])})`
  - [ ] **Expected:** 200 OK response

- [ ] **Test:** Add material with MW="invalid" (string) - Backend security check
  - [ ] **Method:** Same as above but `molecular_weight: "invalid"`
  - [ ] **Expected:** 400 Bad Request
  - [ ] **Expected:** Error response includes "molecular_weight" in details
  - [ ] **Note:** This test verifies backend validation works even if someone bypasses frontend

### Test 2.2: CAS Number Backend Validation

- [ ] **Test:** Add material with valid CAS "64-17-5"
  - [ ] **Expected:** 200 OK response

- [ ] **Test:** Add material with invalid CAS "12345"
  - [ ] **Expected:** 400 Bad Request
  - [ ] **Expected:** Toast shows CAS format error

### Test 2.3: SMILES Backend Validation

**Note:** SMILES field is `type="text"`, so you can test these via the UI or browser console.

- [ ] **Test:** Add material with valid SMILES "CCO"
  - [ ] **Expected:** 200 OK response

- [ ] **Test:** Add material with unbalanced SMILES "C(C("
  - [ ] **Expected:** 400 Bad Request or inline error
  - [ ] **Expected:** Error mentions "Unbalanced parentheses"

- [ ] **Test:** Add material with invalid characters "C$C"
  - [ ] **Expected:** 400 Bad Request or inline error
  - [ ] **Expected:** Error mentions invalid character

### Test 2.4: Multiple Errors

- [ ] **Test:** Send material with multiple invalid fields
  - [ ] **Method:** Browser console with MW="invalid", CAS="12345", SMILES="C(C"
  - [ ] **Expected:** 400 response
  - [ ] **Expected:** Toast shows ALL errors in formatted list
  - [ ] **Example:** "Molecular Weight: must be a number\nCas: Invalid format\nSmiles: Unbalanced parentheses"

---

## 3. Procedure Settings Validation

### Test 4.1: Temperature Validation

**Note:** Temperature field uses `type="number"`, so HTML5 validation prevents text entry.

- [ ] **Test:** Try to enter text (e.g., "hot")
  - [ ] **Expected:** Browser prevents typing letters (HTML5 validation)

- [ ] **Test:** Enter temperature = 80 (positive)
  - [ ] **Expected:** Accepted

- [ ] **Test:** Enter temperature = -78 (negative, for dry ice)
  - [ ] **Expected:** Accepted (negative temps are valid)

### Test 4.2: Pressure Validation

**Note:** Pressure field uses `type="number"`, so HTML5 validation prevents text entry.

- [ ] **Test:** Try to enter text (e.g., "high")
  - [ ] **Expected:** Browser prevents typing letters (HTML5 validation)

- [ ] **Test:** Enter pressure = 1.5
  - [ ] **Expected:** Accepted

- [ ] **Test:** Enter pressure = 0
  - [ ] **Expected:** Backend validation error (must be > 0)

- [ ] **Test:** Enter pressure = -5
  - [ ] **Expected:** Backend validation error (must be > 0)

---

## 4. Toast Notification Testing

### Test 5.1: Error Display Format

- [ ] **Test:** Trigger a validation error
  - [ ] **Expected:** Toast appears in top-right corner
  - [ ] **Expected:** Red background (error type)
  - [ ] **Expected:** Error message is readable
  - [ ] **Expected:** If multiple errors, all shown with line breaks

### Test 5.2: Validation Error vs Generic Error

- [ ] **Test:** Cause a validation error (invalid data)
  - [ ] **Expected:** Structured error with field details

- [ ] **Test:** Cause a network error (disconnect wifi, try to save)
  - [ ] **Expected:** Generic error message
  - [ ] **Expected:** Different format than validation error

### Test 5.3: Toast Duration

- [ ] **Test:** Trigger validation error
  - [ ] **Expected:** Toast stays visible for ~8 seconds (longer than normal)

- [ ] **Test:** Trigger success message
  - [ ] **Expected:** Toast stays for ~3 seconds (normal duration)

---

## 5. Export/Import Data Type Testing

### Test 6.1: Export Data Types

- [ ] **Setup:** Create experiment with:
  - Material with MW = 46.07 (float)
  - Results with conversion% = 75.5 (float)

- [ ] **Test:** Export experiment to Excel
  - [ ] **Expected:** File downloads successfully

- [ ] **Test:** Open Excel file and check cell formats
  - [ ] **Check:** Click on Molecular Weight cell
  - [ ] **Expected:** Cell format shows "Number" (not "Text")
  - [ ] **Expected:** No green triangle warning in corner

- [ ] **Check:** Click on conversion_percent cell
  - [ ] **Expected:** Cell format shows "Number"
  - [ ] **Expected:** Value is 75.5, not "75.5" (no quotes)

### Test 6.2: Import Data Types

- [ ] **Test:** Re-import the exported Excel file
  - [ ] **Expected:** Import succeeds
  - [ ] **Expected:** All numeric values preserved
  - [ ] **Expected:** No type conversion errors

### Test 6.3: ML Readiness Test

- [ ] **Setup:** Export experiment with numeric data

- [ ] **Test:** Open Python/pandas and load the file
  ```python
  import pandas as pd
  df = pd.read_excel('exported_experiment.xlsx', sheet_name='Results')
  print(df['conversion_percent'].dtype)  # Should be float64
  print(df['yield_percent'].dtype)  # Should be float64
  ```
  - [ ] **Expected:** dtypes are float64, not object
  - [ ] **Expected:** Can do `df['conversion_percent'].mean()` without errors

---

## 6. Edge Cases and Boundary Testing

### Test 7.1: Boundary Values

- [ ] **Test:** MW = 0.01 (very small but valid)
  - [ ] **Expected:** Accepted

- [ ] **Test:** MW = 9999.99 (just under max)
  - [ ] **Expected:** Accepted

- [ ] **Test:** MW = 10000.01 (just over max)
  - [ ] **Expected:** Rejected

- [ ] **Test:** Conversion% = 0 (minimum)
  - [ ] **Expected:** Accepted

- [ ] **Test:** Conversion% = 100 (maximum)
  - [ ] **Expected:** Accepted

- [ ] **Test:** Conversion% = 100.01 (just over)
  - [ ] **Expected:** Rejected

### Test 7.2: Optional Fields

- [ ] **Test:** Create material with only required fields (name, alias)
  - [ ] **Expected:** Accepted
  - [ ] **Expected:** MW, CAS, SMILES can be null/empty

### Test 7.3: Special Characters in SMILES

- [ ] **Test:** Valid complex SMILES: "c1ccccc1" (benzene)
  - [ ] **Expected:** Accepted

- [ ] **Test:** SMILES with brackets: "[NH4+]"
  - [ ] **Expected:** Accepted if balanced

- [ ] **Test:** SMILES with invalid char: "C{C}C"
  - [ ] **Expected:** Rejected (braces not allowed)

---

## 7. User Experience Testing

### Test 8.1: Error Message Clarity

- [ ] **Test:** Trigger each type of error
  - [ ] **Review:** Are error messages clear to a chemist?
  - [ ] **Review:** Do messages explain how to fix the issue?
  - [ ] **Review:** Are field names user-friendly (not technical)?

### Test 8.2: Workflow Interruption

- [ ] **Test:** Try to add 5 materials quickly
  - [ ] **Review:** Does validation slow you down significantly?
  - [ ] **Review:** Can you see errors immediately?
  - [ ] **Review:** Is it easy to fix and continue?

### Test 8.3: Visual Feedback

- [ ] **Test:** Trigger validation errors
  - [ ] **Check:** Red borders are clearly visible
  - [ ] **Check:** Error icon appears in field
  - [ ] **Check:** Error text is readable (color, size)
  - [ ] **Check:** Styling matches rest of app

---

## 8. Regression Testing (Existing Features)

### Test 9.1: Inventory Search Still Works

- [ ] **Test:** Search for a chemical in inventory
  - [ ] **Expected:** Search works normally
  - [ ] **Expected:** Can add from inventory

### Test 9.2: Kit Upload Still Works

- [ ] **Test:** Upload a kit Excel file
  - [ ] **Expected:** Upload succeeds
  - [ ] **Expected:** Materials extracted correctly

### Test 9.3: Procedure Design Still Works

- [ ] **Test:** Add materials to wells
  - [ ] **Expected:** Drag and drop works
  - [ ] **Expected:** Amounts can be edited

### Test 9.4: Export Still Works

- [ ] **Test:** Export complete experiment
  - [ ] **Expected:** All tabs export correctly
  - [ ] **Expected:** Excel file opens without errors

---

## 9. Browser Compatibility Testing

### Test 10.1: Chrome

- [ ] **Test:** All validation features in Chrome
  - [ ] **Check:** Inline validation works
  - [ ] **Check:** Toast notifications appear
  - [ ] **Check:** CSS styling correct

### Test 10.2: Firefox

- [ ] **Test:** All validation features in Firefox
  - [ ] **Check:** Same functionality as Chrome
  - [ ] **Check:** No console errors

### Test 10.3: Edge

- [ ] **Test:** All validation features in Edge
  - [ ] **Check:** Same functionality as Chrome
  - [ ] **Check:** No visual glitches

---

## 10. Performance Testing

### Test 11.1: Large Dataset

- [ ] **Test:** Create experiment with 96 materials
  - [ ] **Expected:** Validation doesn't cause lag
  - [ ] **Expected:** Save completes in < 2 seconds

- [ ] **Test:** Enter results for all 96 wells
  - [ ] **Expected:** No performance degradation

### Test 11.2: Rapid Input

- [ ] **Test:** Type quickly in validated fields
  - [ ] **Expected:** No input lag
  - [ ] **Expected:** Errors clear immediately

---

## Test Results Summary

**Total Tests:** _____ / _____
**Passed:** _____
**Failed:** _____
**Blocked:** _____

### Critical Issues Found:
1. ________________________________________________
2. ________________________________________________
3. ________________________________________________

### Minor Issues Found:
1. ________________________________________________
2. ________________________________________________
3. ________________________________________________

### Notes:
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________

---

## Sign-Off

**Tester Name:** _______________
**Date:** _______________
**Signature:** _______________

**Ready for Production?** ☐ Yes  ☐ No  ☐ With Fixes

**Additional Comments:**
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________
