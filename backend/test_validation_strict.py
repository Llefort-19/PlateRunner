"""
Test validation in strict mode.
Tests all 9 data type fixes and validation rules.
"""
import unittest
import json
from app import create_app
from config import TestingConfig


class TestStrictValidation(unittest.TestCase):
    """Test validation in strict mode."""

    def setUp(self):
        """Set up test client with strict validation."""
        TestingConfig.VALIDATION_STRICT = True
        self.app = create_app(TestingConfig)
        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()

    def tearDown(self):
        """Tear down test context."""
        self.app_context.pop()

    # Test 1: Molecular Weight Validation
    def test_molecular_weight_string_rejected(self):
        """Test that string molecular_weight is rejected."""
        material = {
            'name': 'Test Chemical',
            'alias': 'TC',
            'molecular_weight': 'invalid',  # String instead of number
            'role': 'Reactant'
        }

        response = self.client.post(
            '/api/experiment/materials',
            data=json.dumps([material]),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('details', data)
        self.assertIn('molecular_weight', str(data['details']))

    def test_molecular_weight_negative_rejected(self):
        """Test that negative molecular_weight is rejected."""
        material = {
            'name': 'Test Chemical',
            'alias': 'TC',
            'molecular_weight': -10.5,
            'role': 'Reactant'
        }

        response = self.client.post(
            '/api/experiment/materials',
            data=json.dumps([material]),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 400)

    def test_molecular_weight_too_large_rejected(self):
        """Test that molecular_weight > 10000 is rejected."""
        material = {
            'name': 'Test Chemical',
            'alias': 'TC',
            'molecular_weight': 15000,
            'role': 'Reactant'
        }

        response = self.client.post(
            '/api/experiment/materials',
            data=json.dumps([material]),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 400)

    def test_molecular_weight_zero_rejected(self):
        """Test that molecular_weight = 0 is rejected."""
        material = {
            'name': 'Test Chemical',
            'alias': 'TC',
            'molecular_weight': 0,
            'role': 'Reactant'
        }

        response = self.client.post(
            '/api/experiment/materials',
            data=json.dumps([material]),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 400)

    def test_molecular_weight_valid_accepted(self):
        """Test that valid molecular_weight is accepted."""
        material = {
            'name': 'Ethanol',
            'alias': 'EtOH',
            'molecular_weight': 46.07,
            'role': 'Reactant'
        }

        response = self.client.post(
            '/api/experiment/materials',
            data=json.dumps([material]),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 200)

    # Test 2: CAS Number Validation
    def test_cas_invalid_format_short_rejected(self):
        """Test that invalid CAS format (too short) is rejected."""
        material = {
            'name': 'Test',
            'alias': 'T',
            'cas': '12345',  # Invalid format
            'role': 'Reactant'
        }

        response = self.client.post(
            '/api/experiment/materials',
            data=json.dumps([material]),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('cas', str(data['details']).lower())

    def test_cas_invalid_format_no_dashes_rejected(self):
        """Test that CAS without dashes is rejected."""
        material = {
            'name': 'Test',
            'alias': 'T',
            'cas': '64175',  # Missing dashes
            'role': 'Reactant'
        }

        response = self.client.post(
            '/api/experiment/materials',
            data=json.dumps([material]),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 400)

    def test_cas_invalid_format_letters_rejected(self):
        """Test that CAS with letters is rejected."""
        material = {
            'name': 'Test',
            'alias': 'T',
            'cas': 'abc-de-f',  # Letters instead of numbers
            'role': 'Reactant'
        }

        response = self.client.post(
            '/api/experiment/materials',
            data=json.dumps([material]),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 400)

    def test_cas_valid_format_short_accepted(self):
        """Test that valid short CAS format is accepted."""
        material = {
            'name': 'Ethanol',
            'alias': 'EtOH',
            'cas': '64-17-5',  # Valid format
            'role': 'Reactant'
        }

        response = self.client.post(
            '/api/experiment/materials',
            data=json.dumps([material]),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 200)

    def test_cas_valid_format_long_accepted(self):
        """Test that valid long CAS format is accepted."""
        material = {
            'name': 'Water',
            'alias': 'H2O',
            'cas': '7732-18-5',  # Valid 7-digit format
            'role': 'Solvent'
        }

        response = self.client.post(
            '/api/experiment/materials',
            data=json.dumps([material]),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 200)

    # Test 3: SMILES Validation
    def test_smiles_unbalanced_parens_rejected(self):
        """Test that SMILES with unbalanced parentheses is rejected."""
        material = {
            'name': 'Test',
            'alias': 'T',
            'smiles': 'C(C(C',  # Unbalanced
            'role': 'Reactant'
        }

        response = self.client.post(
            '/api/experiment/materials',
            data=json.dumps([material]),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 400)

    def test_smiles_unbalanced_brackets_rejected(self):
        """Test that SMILES with unbalanced brackets is rejected."""
        material = {
            'name': 'Test',
            'alias': 'T',
            'smiles': 'C[NH2',  # Unbalanced brackets
            'role': 'Reactant'
        }

        response = self.client.post(
            '/api/experiment/materials',
            data=json.dumps([material]),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 400)

    def test_smiles_invalid_chars_rejected(self):
        """Test that SMILES with invalid characters is rejected."""
        material = {
            'name': 'Test',
            'alias': 'T',
            'smiles': 'C$C#N',  # Invalid $ character
            'role': 'Reactant'
        }

        response = self.client.post(
            '/api/experiment/materials',
            data=json.dumps([material]),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 400)

    def test_smiles_valid_simple_accepted(self):
        """Test that valid simple SMILES is accepted."""
        material = {
            'name': 'Ethanol',
            'alias': 'EtOH',
            'smiles': 'CCO',  # Valid
            'role': 'Reactant'
        }

        response = self.client.post(
            '/api/experiment/materials',
            data=json.dumps([material]),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 200)

    def test_smiles_valid_complex_accepted(self):
        """Test that valid complex SMILES is accepted."""
        material = {
            'name': 'Benzene',
            'alias': 'Bz',
            'smiles': 'c1ccccc1',  # Valid aromatic
            'role': 'Reactant'
        }

        response = self.client.post(
            '/api/experiment/materials',
            data=json.dumps([material]),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 200)

    # Test 4: Temperature Validation
    def test_temperature_string_rejected(self):
        """Test that string temperature is rejected."""
        settings = {
            'reactionConditions': {
                'temperature': 'hot',  # String
                'time': '2h',
                'pressure': None,
                'wavelength': None,
                'remarks': ''
            },
            'analyticalDetails': {
                'uplcNumber': '',
                'method': '',
                'duration': '',
                'remarks': ''
            }
        }

        response = self.client.post(
            '/api/experiment/procedure-settings',
            data=json.dumps(settings),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 400)

    def test_temperature_valid_positive_accepted(self):
        """Test that valid positive temperature is accepted."""
        settings = {
            'reactionConditions': {
                'temperature': 80.0,
                'time': '2h',
                'pressure': None,
                'wavelength': None,
                'remarks': ''
            },
            'analyticalDetails': {
                'uplcNumber': '',
                'method': '',
                'duration': '',
                'remarks': ''
            }
        }

        response = self.client.post(
            '/api/experiment/procedure-settings',
            data=json.dumps(settings),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 200)

    def test_temperature_valid_negative_accepted(self):
        """Test that valid negative temperature is accepted (e.g., -78C)."""
        settings = {
            'reactionConditions': {
                'temperature': -78.0,
                'time': '2h',
                'pressure': None,
                'wavelength': None,
                'remarks': ''
            },
            'analyticalDetails': {
                'uplcNumber': '',
                'method': '',
                'duration': '',
                'remarks': ''
            }
        }

        response = self.client.post(
            '/api/experiment/procedure-settings',
            data=json.dumps(settings),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 200)

    # Test 5: Pressure Validation
    def test_pressure_string_rejected(self):
        """Test that string pressure is rejected."""
        settings = {
            'reactionConditions': {
                'temperature': None,
                'time': '2h',
                'pressure': 'high',  # String
                'wavelength': None,
                'remarks': ''
            },
            'analyticalDetails': {
                'uplcNumber': '',
                'method': '',
                'duration': '',
                'remarks': ''
            }
        }

        response = self.client.post(
            '/api/experiment/procedure-settings',
            data=json.dumps(settings),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 400)

    def test_pressure_negative_rejected(self):
        """Test that negative pressure is rejected."""
        settings = {
            'reactionConditions': {
                'temperature': None,
                'time': '2h',
                'pressure': -5.0,
                'wavelength': None,
                'remarks': ''
            },
            'analyticalDetails': {
                'uplcNumber': '',
                'method': '',
                'duration': '',
                'remarks': ''
            }
        }

        response = self.client.post(
            '/api/experiment/procedure-settings',
            data=json.dumps(settings),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 400)

    def test_pressure_zero_rejected(self):
        """Test that pressure = 0 is rejected."""
        settings = {
            'reactionConditions': {
                'temperature': None,
                'time': '2h',
                'pressure': 0,
                'wavelength': None,
                'remarks': ''
            },
            'analyticalDetails': {
                'uplcNumber': '',
                'method': '',
                'duration': '',
                'remarks': ''
            }
        }

        response = self.client.post(
            '/api/experiment/procedure-settings',
            data=json.dumps(settings),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 400)

    def test_pressure_valid_accepted(self):
        """Test that valid pressure is accepted."""
        settings = {
            'reactionConditions': {
                'temperature': None,
                'time': '2h',
                'pressure': 1.5,
                'wavelength': None,
                'remarks': ''
            },
            'analyticalDetails': {
                'uplcNumber': '',
                'method': '',
                'duration': '',
                'remarks': ''
            }
        }

        response = self.client.post(
            '/api/experiment/procedure-settings',
            data=json.dumps(settings),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 200)

    # Test 6: Multiple Errors
    def test_multiple_validation_errors_returned(self):
        """Test that multiple validation errors are returned together."""
        material = {
            'name': 'Test',
            'alias': 'T',
            'molecular_weight': 'invalid',  # Error 1
            'cas': '12345',  # Error 2
            'smiles': 'C(C',  # Error 3
            'role': 'Reactant'
        }

        response = self.client.post(
            '/api/experiment/materials',
            data=json.dumps([material]),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)

        # All 3 errors should be present
        details_str = str(data['details'])
        self.assertIn('molecular_weight', details_str)
        self.assertIn('cas', details_str)
        self.assertIn('smiles', details_str)

    # Test 7: Optional Fields Can Be Null
    def test_optional_fields_null_accepted(self):
        """Test that optional fields can be null/None."""
        material = {
            'name': 'Test Chemical',
            'alias': 'TC',
            'molecular_weight': None,  # Optional
            'cas': None,  # Optional
            'smiles': None,  # Optional
            'role': 'Reactant'
        }

        response = self.client.post(
            '/api/experiment/materials',
            data=json.dumps([material]),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 200)

    # Test 8: Context Validation
    def test_context_invalid_date_rejected(self):
        """Test that invalid date format is rejected."""
        context = {
            'author': 'Test Author',
            'date': 'not-a-date',
            'project': 'Test Project',
            'eln': 'ELN-001',
            'objective': 'Test objective'
        }

        response = self.client.post(
            '/api/experiment/context',
            data=json.dumps(context),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 400)

    def test_context_valid_accepted(self):
        """Test that valid context is accepted."""
        context = {
            'author': 'Test Author',
            'date': '2026-02-01',
            'project': 'Test Project',
            'eln': 'ELN-001',
            'objective': 'Test objective'
        }

        response = self.client.post(
            '/api/experiment/context',
            data=json.dumps(context),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 200)


if __name__ == '__main__':
    unittest.main()
