# Validation Guide for HTE Application

## Overview

The HTE application enforces strict data validation to ensure experimental data is accurate and ready for machine learning analysis. This guide explains how validation works and what to do if you encounter errors.

---

## For Chemists (Users)

### Data Entry Requirements

When entering experimental data, follow these formats:

#### Chemical Properties

**Molecular Weight**
- Format: Numbers only (e.g., `46.07`, `100.5`)
- Valid range: Greater than 0, cannot exceed 10000
- Examples:
  - ✅ Valid: `46.07`, `1.23`, `9999.99`
  - ❌ Invalid: `0`, `-50`, `15000`, `"text"`

**CAS Number** (Chemical Abstracts Service)
- Format: `XXX-XX-X` or `XXXXXXX-XX-X`
  - 1-7 digits, dash, 2 digits, dash, 1 digit
- Examples:
  - ✅ Valid: `64-17-5` (ethanol), `7732-18-5` (water)
  - ❌ Invalid: `123`, `64175`, `abc-de-f`, `invalid-format`

**SMILES Notation** (Simplified Molecular Input Line Entry System)
- Valid SMILES uses chemical notation: C, N, O, S, P, F, Cl, Br, I, (, ), [, ], =, #, +, -, @, %
- Parentheses and brackets must be balanced
- Examples:
  - ✅ Valid: `CCO` (ethanol), `c1ccccc1` (benzene), `CC(=O)O` (acetic acid)
  - ❌ Invalid: `C(C` (unbalanced), `C$C` (invalid char), `XYZ` (nonsense)

#### Procedure Settings

**Temperature**
- Format: Any number (positive or negative)
- Examples:
  - ✅ Valid: `80`, `-78` (dry ice), `120.5`
  - ❌ Invalid: `"hot"`, `very cold`

**Time**
- Format: Positive numbers (hours)
- Examples:
  - ✅ Valid: `2`, `0.5`, `24.5`
  - ❌ Invalid: `-1`, `0`

**Pressure**
- Format: Positive numbers (bar)
- Must be greater than 0
- Examples:
  - ✅ Valid: `0.5`, `1.5`, `10`
  - ❌ Invalid: `0`, `-5`, `negative pressure`

**Wavelength** (nm)
- Format: Non-negative numbers
- Examples:
  - ✅ Valid: `254`, `280`, `300`
  - ❌ Invalid: `-100`

#### Analytical Data

**Duration** (minutes)
- Format: Non-negative numbers
- Examples:
  - ✅ Valid: `5`, `15.5`, `30`
  - ❌ Invalid: `-10`, `0` (usually)

### Where to Find Error Messages

#### 1. Inline Errors (Below Fields)
When you move out of a field after entering invalid data:
- Red border appears around the field
- Red error icon shows in the field
- Error message appears below in red text

**Example:**
```
Molecular Weight [____] ❌
↓
Molecular weight must be greater than 0
```

#### 2. Toast Notifications (Top-Right Corner)
When you try to save/submit invalid data:
- A notification pops up in the top-right corner
- Red background indicates an error
- Shows all validation errors at once
- Stays visible for 8 seconds

**Example Error Display:**
```
Validation Error
Molecular Weight: must be greater than 0
CAS: Invalid format (expected: 123-45-6)
SMILES: Unbalanced parentheses
```

### Common Error Messages & Fixes

| Error Message | What It Means | How to Fix |
|---------------|---------------|-----------|
| "Must be a number" | You entered text in a numeric field | Enter only digits (type="number" fields prevent this) |
| "Must be greater than 0" | You entered 0 or a negative number | Enter a positive number |
| "Cannot exceed 10000" | Molecular weight is too large | Enter a value between 1 and 10000 |
| "Cannot exceed 100" | Percentage is over 100% | Enter a value between 0 and 100 |
| "Invalid format (expected: 123-45-6)" | CAS number format is wrong | Use format: `123-45-6` or `1234567-12-3` |
| "Unbalanced parentheses in SMILES" | SMILES has mismatched ( and ) | Check SMILES notation for balanced parentheses |
| "Invalid character in SMILES: X" | SMILES has an invalid character | Remove the character; valid SMILES uses C, N, O, S, P, F, Cl, Br, I, (, ), [, ], =, #, etc. |

### Tips for Data Entry

1. **Type Matters**: Fields like Molecular Weight only accept numbers
   - Browser prevents typing letters automatically
   - Red border shows when value is out of range

2. **Required vs. Optional**:
   - Name and Alias are required (must be filled)
   - Molecular Weight, CAS, SMILES are optional (can be empty)
   - But if you fill them, they must be valid

3. **Decimal Values**: Use decimal points, not commas
   - ✅ `46.07` (correct)
   - ❌ `46,07` (wrong)

4. **Error Clearing**: Errors disappear when you start typing a correction
   - Red border and text go away immediately
   - Only validates when you click out of the field (onBlur)

5. **Export Compatibility**: Proper data entry ensures exports are ML-ready
   - Numbers stored as actual numbers (not text)
   - Excel cells recognize values as numeric
   - Python/Pandas can process without preprocessing

---

## For Developers

### Validation Architecture

The validation system uses a three-layer approach:

1. **Frontend (HTML5 + JavaScript)**
   - `type="number"` prevents text entry for numeric fields
   - Custom JavaScript validates ranges and formats
   - Inline error messages guide users

2. **Backend (Marshmallow Schemas)**
   - `backend/validation/schemas.py` defines field types and constraints
   - `backend/validation/decorators.py` applies validation via `@validate_request`
   - Returns 400 status with detailed error information

3. **Database Security**
   - All external data is validated on import
   - Invalid data never enters the system

### Adding New Validated Fields

To add a new field that needs validation:

#### Step 1: Define Schema Field
File: `backend/validation/schemas.py`

```python
from marshmallow import Schema, fields, validate, ValidationError

class MySchema(Schema):
    # Add your field
    new_field = fields.Float(
        validate=validate.Range(min=0, max=100),
        allow_none=True,
        error_messages={
            'invalid': 'New Field must be a number',
            'min': 'New Field cannot be negative',
            'max': 'New Field cannot exceed 100'
        }
    )
```

**Field Types:**
- `fields.String()` - Text (e.g., CAS, SMILES)
- `fields.Float()` - Decimal numbers (e.g., Molecular Weight)
- `fields.Integer()` - Whole numbers
- `fields.Bool()` - True/False
- `fields.List()` - Arrays

**Validators:**
- `validate.Range(min=X, max=Y)` - Numeric range
- `validate.Length(min=X, max=Y)` - String length
- `validate.Regexp(pattern)` - Regex pattern
- Custom function - Write your own

#### Step 2: Apply Decorator to Route
File: `backend/routes/your_route.py`

```python
from validation.decorators import validate_request
from validation.schemas import MySchema

@your_bp.route('/endpoint', methods=['POST'])
@validate_request(MySchema)
def your_handler():
    # Access validated data via request.validated_json
    data = request.validated_json
    new_field_value = data.get('new_field')
    # Process...
    return jsonify({'success': True})
```

#### Step 3: Add Frontend Validation (Optional)
File: `frontend/src/components/YourComponent.js`

```javascript
const [fieldErrors, setFieldErrors] = useState({});

const validateNewField = (value) => {
  if (!value) return null;
  const num = parseFloat(value);
  if (isNaN(num)) return 'Must be a number';
  if (num < 0) return 'Cannot be negative';
  if (num > 100) return 'Cannot exceed 100';
  return null;
};

const handleBlur = (field) => {
  const error = validateNewField(formData[field]);
  setFieldErrors(prev => ({ ...prev, [field]: error }));
};

// In JSX:
<input
  type="number"
  className={`form-control ${fieldErrors.new_field ? 'is-invalid' : ''}`}
  value={formData.new_field}
  onChange={(e) => {
    // Update formData...
    if (fieldErrors.new_field) setFieldErrors(prev => ({ ...prev, new_field: null }));
  }}
  onBlur={() => handleBlur('new_field')}
/>
{fieldErrors.new_field && (
  <div className="invalid-feedback" style={{ display: 'block' }}>
    {fieldErrors.new_field}
  </div>
)}
```

### Validation Modes

**Development Mode** (Default)
```python
# In backend/config.py
class DevelopmentConfig(Config):
    VALIDATION_STRICT = False  # Warn-only
```

- Invalid data generates warnings in logs
- Data is still accepted
- Useful for: prototyping, debugging, gradual rollout

**Production Mode**
```python
class ProductionConfig(Config):
    VALIDATION_STRICT = True  # Strict
```

- Invalid data returns HTTP 400 error
- Data is rejected completely
- Useful for: quality assurance, ML workflows, commercial use

**Testing Mode**
```python
class TestingConfig(Config):
    TESTING = True
    # Uses strict mode for comprehensive testing
```

### Error Response Format

When validation fails, the backend returns:

**HTTP 400 with JSON Body:**
```json
{
  "message": "Validation failed",
  "error": "Validation error details",
  "details": {
    "field_name": [
      "Error message 1",
      "Error message 2"
    ],
    "another_field": [
      "Another error"
    ]
  }
}
```

**Frontend handles this via:**
```javascript
try {
  await axios.post('/api/endpoint', data);
} catch (error) {
  if (error.response?.data?.details) {
    // Structured validation error
    showValidationError(error.response.data);
  } else {
    // Generic error
    showError(error.message);
  }
}
```

### Testing Validation

Run the test suite:

```bash
cd backend
python -m unittest test_validation_strict.TestStrictValidation -v
```

Test categories:
1. **Molecular Weight** - Type checking, range validation
2. **CAS Number** - Format validation with regex
3. **SMILES** - Syntax validation (balanced parentheses, invalid chars)
4. **Temperature/Pressure/etc** - Numeric type and range validation
5. **Multiple Errors** - All errors returned together
6. **Optional Fields** - Allow null values
7. **Context Data** - Complex nested objects

See `backend/test_validation_strict.py` for detailed test cases.

### Common Issues & Solutions

**Issue: Data accepted even though it's invalid**
- Check: Is `VALIDATION_STRICT = False`? (Development mode)
- Check: Is the `@validate_request` decorator applied to the route?
- Fix: Enable strict mode or add decorator

**Issue: Valid data rejected with 400 error**
- Check: Schema constraints match requirements
- Check: Error messages are user-friendly
- Fix: Adjust schema or update validation logic

**Issue: Error messages not showing in frontend**
- Check: Is `showValidationError` being called?
- Check: Response includes `details` field?
- Fix: Ensure error handler processes `error.response.data`

**Issue: Type mismatch (string instead of float)**
- Frontend: Use `parseFloat()` before sending
- Backend: Schema automatically coerces compatible types
- Fix: Ensure schema field type matches data type

### Reference

| File | Purpose |
|------|---------|
| `backend/validation/schemas.py` | Marshmallow schema definitions |
| `backend/validation/decorators.py` | Validation decorators |
| `backend/validation/utils.py` | Helper functions (SMILES syntax, etc.) |
| `backend/test_validation_strict.py` | Automated validation tests |
| `backend/test_validation.py` | Integration tests |
| `TESTING_CHECKLIST.md` | Manual testing procedures |

---

## Troubleshooting

### "Validation Error" Toast But No Details

**Cause:** Backend returned error but details are unclear

**Solution:**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Find the failing request
4. Look at Response to see exact error messages
5. Match against error message table above

### Data Lost After Validation Error

**Cause:** Auto-save tried to save invalid data before validation

**Solution:**
- This shouldn't happen with inline validation
- If it does, data is still in UI - fix and save again
- Backend rejected it, so database/export wasn't affected

### Excel Import Fails with Validation Errors

**Cause:** Imported file has invalid values

**Solution:**
1. Check TESTING_CHECKLIST.md Section 5 (Import testing)
2. Verify numeric columns have numbers, not text
3. Verify CAS and SMILES follow required formats
4. Use Excel's error checking: Data > Data Validation

### Can't Import Old Excel Files

**Cause:** Old files may have different validation rules

**Solution:**
1. Open file in Excel
2. Check for common issues:
   - Molecular Weight: Should be numbers, not "46.07" text
   - CAS: Should match `123-45-6` format
   - Percentages: Should be 0-100, not >100
3. Manually correct issues and save
4. Re-import corrected file

---

## Questions?

If validation behavior is unclear:

1. Check error message table above
2. Review CLAUDE.md validation section
3. Check schema definition in `backend/validation/schemas.py`
4. Run automated tests: `python -m unittest test_validation_strict.py`
5. Look at test cases for examples of valid/invalid data
