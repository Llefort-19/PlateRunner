# Integration Test Guide - Manual Workflow Testing

## Overview

This guide walks you through testing the complete HTE workflow to ensure all validation and data handling works correctly end-to-end.

**Duration:** ~20 minutes
**Environment:** Development (npm run dev)
**Goal:** Verify data flows correctly from UI → Backend → Export

---

## Pre-Test Setup

- [ ] Start backend: `npm run start-backend` (or `npm run dev`)
- [ ] Start frontend: `npm run start-frontend` (or `npm run dev`)
- [ ] Open app in browser: http://localhost:3000
- [ ] Open DevTools: F12 (check Console and Network tabs for errors)
- [ ] Browser console clear (no errors before starting)

---

## Workflow Test

### Phase 1: Experiment Context

**Tab:** Experiment Context

1. [ ] Fill all context fields:
   - Author: "Test Chemist"
   - Date: Today's date
   - Project: "Integration Test"
   - ELN: "ELN-TEST-001"
   - Objective: "Full workflow validation"

2. [ ] Verify:
   - [ ] Fields accept input
   - [ ] No error messages appear
   - [ ] Data appears to save (auto-save or explicit save)

3. [ ] Check Network tab:
   - [ ] POST request to `/api/experiment/context` succeeds
   - [ ] Status: 200 OK
   - [ ] Response shows success message

**Expected Result:** Context saved with no validation errors ✅

---

### Phase 2: Add Materials

**Tab:** Materials

#### Test 2.1: Valid Material with Validation

1. [ ] Click "Add Material" or open form
2. [ ] Enter valid material:
   - Name: "Ethanol"
   - Alias: "EtOH" (required field)
   - Molecular Weight: `46.07` (float number)
   - CAS: `64-17-5` (valid format)
   - SMILES: `CCO` (valid SMILES)
   - Role: "Reactant"

3. [ ] Verify inline validation:
   - [ ] As you tab through fields, no errors appear
   - [ ] Molecular Weight field shows as normal (no red border)
   - [ ] CAS field shows as normal

4. [ ] Click "Add Material"
5. [ ] Verify:
   - [ ] Material appears in table
   - [ ] Success message shows in toast (top-right)
   - [ ] No error messages in console
   - [ ] Network: POST `/api/experiment/materials` returns 200

**Expected Result:** Material added with valid data ✅

#### Test 2.2: Test Invalid Molecular Weight

1. [ ] Click "Add Material" again
2. [ ] Enter material:
   - Name: "Test Invalid"
   - Alias: "TI"
   - Molecular Weight: `15000` (exceeds max of 10000)

3. [ ] Click away from MW field (or tab out)
4. [ ] Verify:
   - [ ] Red border appears around MW field
   - [ ] Error text appears below: "Cannot exceed 10000"
   - [ ] Field has error icon
   - [ ] Form has visual indication of error

5. [ ] Try to submit:
   - [ ] Click "Add Material"
   - [ ] Verify: Form doesn't submit (button blocked or form validated)
   - [ ] Error remains visible

6. [ ] Fix the error:
   - [ ] Change MW to `100`
   - [ ] Verify: Error disappears immediately
   - [ ] Submit form
   - [ ] Verify: Material added successfully

**Expected Result:** Frontend validation prevents invalid submission ✅

#### Test 2.3: Test Invalid CAS Format

1. [ ] Click "Add Material" again
2. [ ] Enter:
   - Name: "Test CAS"
   - Alias: "TC"
   - CAS: `12345` (invalid format)

3. [ ] Click away from CAS field
4. [ ] Verify:
   - [ ] Error message appears: "Invalid format (expected: 123-45-6)"
   - [ ] Red border around field

5. [ ] Try to submit:
   - [ ] Form blocked (can't submit with error)

6. [ ] Fix CAS to `123-45-6`
7. [ ] Submit
8. [ ] Verify: Material added successfully

**Expected Result:** CAS format validation works ✅

#### Test 2.4: Test Invalid SMILES

1. [ ] Click "Add Material" again
2. [ ] Enter:
   - Name: "Test SMILES"
   - Alias: "TS"
   - SMILES: `C(C(` (unbalanced parentheses)

3. [ ] Try to submit
4. [ ] Verify error appears (either inline or in toast)
5. [ ] Error message mentions: "Unbalanced parentheses"
6. [ ] Fix to valid SMILES: `CCO`
7. [ ] Submit successfully

**Expected Result:** SMILES validation works ✅

**Summary after Phase 2:**
- [ ] 3+ materials added
- [ ] At least one with all fields (MW, CAS, SMILES)
- [ ] At least one with optional fields empty
- [ ] Validation errors caught and fixed
- [ ] Materials table shows all entries

---

### Phase 3: Procedure Settings

**Tab:** Procedure Settings (or Design tab)

1. [ ] Set Reaction Conditions:
   - Temperature: `80` (positive allowed)
   - Time: `2.5` (positive number)
   - Pressure: `1.5` (must be > 0)
   - Wavelength: `254` (positive)

2. [ ] Verify:
   - [ ] All fields accept input
   - [ ] No error messages appear
   - [ ] Auto-save happens (watch Network tab)

3. [ ] Test invalid pressure:
   - [ ] Change Pressure to `0`
   - [ ] Click away from field
   - [ ] Verify: Error appears "Must be greater than 0"

4. [ ] Fix pressure to `1.5`
5. [ ] Set Analytical Details:
   - UPLC #: "UPLC-001"
   - Method: "CH3CN, pH7"
   - Duration: `15.5` (minutes)
   - Wavelength: `254`

6. [ ] Verify: All save without errors

**Expected Result:** Procedure settings saved with validation ✅

---

### Phase 4: Results/Analytical Data

**Tab:** Analytical Data or Results

This depends on your app's UI. The key test is:

1. [ ] Add analytical data (UPLC peak areas, etc.)
   - If using a form: Enter numeric values
   - If using import: Upload file with numeric data

2. [ ] Verify:
   - [ ] Data is accepted
   - [ ] No validation errors
   - [ ] Values stored as numbers (not text)

3. [ ] Check storage:
   - [ ] Open DevTools → Application/Storage
   - [ ] Verify numeric values are stored as numbers, not strings

**Expected Result:** Analytical data stored as numbers ✅

---

### Phase 5: Export to Excel

**Tab:** Export (or wherever export button is)

1. [ ] Click "Export" or "Download"
2. [ ] Verify:
   - [ ] File downloads successfully
   - [ ] No errors in console
   - [ ] File is named appropriately (e.g., `experiment_export.xlsx`)

3. [ ] Open downloaded file in Excel

4. [ ] Inspect data types:

   **For Molecular Weight column:**
   - [ ] Click a cell with molecular weight value (e.g., 46.07)
   - [ ] Right-click → Format Cells
   - [ ] Verify: "Number" category (NOT "Text")
   - [ ] Should show decimal places
   - [ ] No green triangle warning in corner

   **For Numeric columns:**
   - [ ] Pressure column: Numbers, not text
   - [ ] Temperature: Numbers, not text
   - [ ] Any percentage columns: Numbers 0-100, not text

5. [ ] Test ML readiness:
   - [ ] Open Python/Jupyter or terminal
   - [ ] Run this test:

   ```python
   import pandas as pd

   # Load the exported file
   df = pd.read_excel('path/to/experiment_export.xlsx', sheet_name='Materials')

   # Check data types
   print("Data types:")
   print(df.dtypes)

   # Should show float64 for numeric columns, not object
   # Example output:
   # molecular_weight    float64
   # pressure           float64
   # temperature        float64
   ```

   - [ ] Confirm: All numeric columns are `float64` (not `object`)
   - [ ] Run calculation:

   ```python
   # This should work without errors
   avg_mw = df['molecular_weight'].mean()
   print(f"Average molecular weight: {avg_mw}")
   ```

   - [ ] Verify: Calculation completes without errors

**Expected Result:** Excel file has proper numeric types for ML use ✅

---

## Error Handling Tests

### Test 1: Backend Validation (Strict Mode)

1. [ ] Open browser console (F12)
2. [ ] Paste this command to test backend validation directly:

```javascript
fetch('/api/experiment/materials', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify([{
    name: 'Test',
    alias: 'T',
    molecular_weight: 'invalid',  // String instead of number
    role: 'Reactant'
  }])
}).then(r => r.json()).then(d => console.log(d))
```

3. [ ] Verify:
   - [ ] Response status: 400
   - [ ] Response includes `details` field
   - [ ] Error message about molecular_weight
   - [ ] Toast notification might show (if auto-handled)

**Expected Result:** Backend rejects invalid data with 400 ✅

### Test 2: Multiple Validation Errors

Use console to test multiple errors at once:

```javascript
fetch('/api/experiment/materials', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify([{
    name: 'Test',
    alias: 'T',
    molecular_weight: -50,   // Error 1
    cas: '12345',            // Error 2
    smiles: 'C(C',           // Error 3
    role: 'Reactant'
  }])
}).then(r => r.json()).then(d => console.log(d))
```

3. [ ] Verify:
   - [ ] Status: 400
   - [ ] All 3 errors returned in `details` field
   - [ ] Not just the first error

**Expected Result:** All validation errors returned together ✅

---

## Summary Checklist

After completing all tests, verify:

### Data Quality ✅
- [ ] Molecular weights stored as floats, not strings
- [ ] CAS numbers match format: `\d{1,7}-\d{2}-\d`
- [ ] SMILES validated for syntax
- [ ] Temperature/Pressure/Time stored as numbers
- [ ] Optional fields can be null without error

### Validation ✅
- [ ] Frontend shows inline errors (red border, error text)
- [ ] Error messages are clear and actionable
- [ ] Invalid data is blocked from submission
- [ ] Backend validates even if frontend bypassed
- [ ] All errors returned together (not just first one)

### User Experience ✅
- [ ] Errors appear when field loses focus (onBlur)
- [ ] Errors disappear when user starts typing
- [ ] Toast notifications show validation details
- [ ] No console errors during normal workflow
- [ ] No data loss when validation fails

### Export/Import ✅
- [ ] Export succeeds without errors
- [ ] Excel file has numeric cell format (not text)
- [ ] Re-import works without errors
- [ ] Pandas can read and process numeric columns
- [ ] ML-ready data structure maintained

### Performance ✅
- [ ] No noticeable lag during form entry
- [ ] Validation doesn't slow down saves
- [ ] Large experiments (96 wells) still perform well
- [ ] Export completes in reasonable time (<2 seconds)

---

## If Tests Fail

### Inline Validation Not Showing

**Check:**
1. Is the field properly marked with error class?
   - Open DevTools → Inspector
   - Find input element
   - Should have class `is-invalid` when error exists

2. Is `onBlur` event firing?
   - Add breakpoint in validation function
   - Or check console logs

3. Is the error message div visible?
   - Check CSS: `.invalid-feedback` should have `display: block`

**Fix:**
- Verify ProcedureSettings.js has all validation functions
- Check that `onBlur` handler calls `handleBlur(field)`
- Confirm `fieldErrors` state is updated

### Backend Returns 200 Even for Invalid Data

**Check:**
1. Is `VALIDATION_STRICT = True`?
   - Check config.py: ProductionConfig should have it
   - Check current environment: `echo $FLASK_ENV`

2. Is `@validate_request` decorator applied?
   - Check route file for `@validate_request(Schema)`
   - Confirm decorator is imported

3. Is schema definition correct?
   - Check schemas.py for field types (Float, not Str)
   - Verify validators are present

**Fix:**
- Set `VALIDATION_STRICT = True` in ProductionConfig
- Add `@validate_request` decorator to routes
- Verify schema field definitions match requirements

### Excel Types Still Text

**Check:**
1. Backend is converting to float before save:
   - Check saveProcedureSettings in ProcedureSettings.js
   - Should do `parseFloat(value)` before sending

2. Export route is handling floats:
   - Check backend/routes/export.py
   - Verify numeric columns use `float()` conversion

**Fix:**
- Add `parseFloat()` conversion before sending to API
- Use `float()` or `Decimal()` in backend export
- Verify Excel library respects numeric type

---

## Next Steps

After all tests pass:

1. [ ] Document any issues found and fixed
2. [ ] Note any edge cases discovered
3. [ ] Create summary of what works well
4. [ ] Identify areas for improvement
5. [ ] Move to production deployment (if ready)

---

## Test Execution

Run automated tests:

```bash
# Backend validation tests
cd backend
python -m unittest test_validation_strict.TestStrictValidation -v

# Integration tests
python -m unittest test_integration.TestIntegration -v
```

Expected output: All tests pass with ✅ status
