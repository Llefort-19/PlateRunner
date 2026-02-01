"""
Test validation functionality to ensure warn-only mode works correctly.
"""
import json
import unittest
import logging
from unittest.mock import patch
from app import app

class TestValidation(unittest.TestCase):
    """Test validation functionality."""
    
    def setUp(self):
        """Set up test client."""
        self.app = app
        self.client = app.test_client()
        self.app.config['TESTING'] = True
        
        # Capture logs
        self.log_handler = logging.Handler()
        self.log_records = []
        
        def capture_log(record):
            self.log_records.append(record)
        
        self.log_handler.emit = capture_log
        logging.getLogger().addHandler(self.log_handler)
        logging.getLogger().setLevel(logging.WARNING)

    def tearDown(self):
        """Clean up."""
        logging.getLogger().removeHandler(self.log_handler)

    def test_valid_context_data(self):
        """Test that valid context data passes validation."""
        valid_context = {
            'author': 'Test Author',
            'date': '2025-01-01',
            'project': 'Test Project',
            'eln': 'ELN-001',
            'objective': 'Test objective'
        }
        
        response = self.client.post('/api/experiment/context',
                                  data=json.dumps(valid_context),
                                  content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        
        # Should not generate validation warnings
        warning_logs = [r for r in self.log_records if r.levelno >= logging.WARNING]
        validation_warnings = [r for r in warning_logs if 'validation' in r.getMessage().lower()]
        self.assertEqual(len(validation_warnings), 0, f"Unexpected validation warnings: {validation_warnings}")

    def test_invalid_context_data_warns(self):
        """Test that invalid context data generates warnings but doesn't fail."""
        invalid_context = {
            'author': '',  # Invalid: empty author
            'date': 'invalid-date',  # Invalid: bad date format
            'project': 'x' * 201,  # Invalid: too long
            'eln': '',  # Invalid: empty ELN
            'objective': 'x' * 1001  # Invalid: too long
        }
        
        # Clear previous log records
        self.log_records.clear()
        
        response = self.client.post('/api/experiment/context',
                                  data=json.dumps(invalid_context),
                                  content_type='application/json')
        
        # Should still succeed (warn-only mode)
        self.assertEqual(response.status_code, 200)
        
        # Should generate validation warnings
        warning_logs = [r for r in self.log_records if r.levelno >= logging.WARNING]
        validation_warnings = [r for r in warning_logs if 'validation' in r.getMessage().lower()]
        self.assertGreater(len(validation_warnings), 0, "Expected validation warnings for invalid data")

    def test_valid_materials_data(self):
        """Test that valid materials data passes validation."""
        valid_materials = [
            {
                'name': 'Test Chemical 1',
                'alias': 'TC1',
                'cas': '123-45-6',
                'smiles': 'CCO',
                'molecular_weight': '46.07',
                'role': 'Reactant',
                'source': 'manual'
            },
            {
                'name': 'Test Chemical 2',
                'cas': '789-01-2',
                'role': 'Product',
                'source': 'inventory_match'
            }
        ]
        
        response = self.client.post('/api/experiment/materials',
                                  data=json.dumps(valid_materials),
                                  content_type='application/json')
        
        self.assertEqual(response.status_code, 200)

    def test_invalid_materials_data_warns(self):
        """Test that invalid materials data generates warnings but doesn't fail."""
        invalid_materials = [
            {
                'name': '',  # Invalid: empty name
                'alias': 'x' * 101,  # Invalid: too long
                'cas': 'x' * 51,  # Invalid: too long
                'role': 'InvalidRole',  # Invalid: not in allowed values
                'source': 'invalid_source'  # Invalid: not in allowed values
            }
        ]
        
        # Clear previous log records
        self.log_records.clear()
        
        response = self.client.post('/api/experiment/materials',
                                  data=json.dumps(invalid_materials),
                                  content_type='application/json')
        
        # Should still succeed (warn-only mode)
        self.assertEqual(response.status_code, 200)
        
        # Should generate validation warnings
        warning_logs = [r for r in self.log_records if r.levelno >= logging.WARNING]
        validation_warnings = [r for r in warning_logs if 'validation' in r.getMessage().lower()]
        self.assertGreater(len(validation_warnings), 0, "Expected validation warnings for invalid materials")

    def test_valid_molecule_image_request(self):
        """Test that valid molecule image request passes validation."""
        valid_request = {
            'smiles': 'CCO',
            'width': 400,
            'height': 400
        }
        
        response = self.client.post('/api/molecule/image',
                                  data=json.dumps(valid_request),
                                  content_type='application/json')
        
        # Should succeed regardless of RDKit availability
        self.assertIn(response.status_code, [200, 400])

    def test_invalid_molecule_image_request_warns(self):
        """Test that invalid molecule image request generates warnings but doesn't fail."""
        invalid_request = {
            'smiles': 'x' * 501,  # Invalid: too long
            'width': 5000,  # Invalid: too large
            'height': -10  # Invalid: negative
        }
        
        # Clear previous log records
        self.log_records.clear()
        
        response = self.client.post('/api/molecule/image',
                                  data=json.dumps(invalid_request),
                                  content_type='application/json')
        
        # Should generate validation warnings
        warning_logs = [r for r in self.log_records if r.levelno >= logging.WARNING]
        validation_warnings = [r for r in warning_logs if 'validation' in r.getMessage().lower()]
        self.assertGreater(len(validation_warnings), 0, "Expected validation warnings for invalid molecule request")

    def test_validation_preserves_original_data(self):
        """Test that validation warnings don't corrupt original data."""
        # Send context with some invalid fields
        context_with_issues = {
            'author': 'Valid Author',
            'date': 'invalid-date',  # This will fail validation
            'project': 'Valid Project',
            'eln': 'ELN-001',
            'extra_field': 'This should be preserved'  # Unknown field
        }
        
        response = self.client.post('/api/experiment/context',
                                  data=json.dumps(context_with_issues),
                                  content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        
        # Verify data was stored (even with validation issues)
        get_response = self.client.get('/api/experiment/context')
        stored_data = json.loads(get_response.data)
        
        # Original data should be preserved in warn-only mode
        self.assertEqual(stored_data['author'], 'Valid Author')
        self.assertEqual(stored_data['project'], 'Valid Project')
        self.assertEqual(stored_data['eln'], 'ELN-001')

class TestValidationStrictMode(unittest.TestCase):
    """Test validation functionality in strict mode."""

    def setUp(self):
        """Set up test client with strict validation."""
        self.app = app
        self.app.config['TESTING'] = True
        self.app.config['VALIDATION_STRICT'] = True  # Enable strict mode
        self.client = app.test_client()

    def tearDown(self):
        """Clean up."""
        # Reset to default
        self.app.config['VALIDATION_STRICT'] = False

    def test_valid_context_data_accepted(self):
        """Test that valid context data is accepted in strict mode."""
        valid_context = {
            'author': 'Test Author',
            'date': '2025-01-01',
            'project': 'Test Project',
            'eln': 'ELN-001',
            'objective': 'Test objective'
        }

        response = self.client.post('/api/experiment/context',
                                  data=json.dumps(valid_context),
                                  content_type='application/json')

        self.assertEqual(response.status_code, 200)

    def test_invalid_context_data_rejected(self):
        """Test that invalid context data is rejected in strict mode."""
        invalid_context = {
            'author': '',  # Invalid: empty author
            'date': 'invalid-date',  # Invalid: bad date format
            'project': 'x' * 201,  # Invalid: too long
            'eln': '',  # Invalid: empty ELN
            'objective': 'x' * 1001  # Invalid: too long
        }

        response = self.client.post('/api/experiment/context',
                                  data=json.dumps(invalid_context),
                                  content_type='application/json')

        # Should be rejected in strict mode
        self.assertEqual(response.status_code, 400)

        # Should include error details
        data = json.loads(response.data)
        self.assertIn('details', data)

    def test_valid_materials_accepted(self):
        """Test that valid materials are accepted in strict mode."""
        valid_materials = [
            {
                'name': 'Ethanol',
                'alias': 'EtOH',
                'cas': '64-17-5',  # Valid CAS format
                'smiles': 'CCO',  # Valid SMILES
                'molecular_weight': 46.07,  # Float, not string
                'role': 'Reactant',
                'source': 'manual'
            }
        ]

        response = self.client.post('/api/experiment/materials',
                                  data=json.dumps(valid_materials),
                                  content_type='application/json')

        self.assertEqual(response.status_code, 200)

    def test_invalid_materials_rejected(self):
        """Test that invalid materials are rejected in strict mode."""
        invalid_materials = [
            {
                'name': '',  # Invalid: empty name
                'alias': 'x' * 101,  # Invalid: too long
                'cas': 'invalid-cas',  # Invalid: wrong format
                'role': 'InvalidRole',  # Invalid: not in allowed values
                'source': 'invalid_source'  # Invalid: not in allowed values
            }
        ]

        response = self.client.post('/api/experiment/materials',
                                  data=json.dumps(invalid_materials),
                                  content_type='application/json')

        # Should be rejected in strict mode
        self.assertEqual(response.status_code, 400)

        # Should include error details
        data = json.loads(response.data)
        self.assertIn('details', data)

    def test_molecular_weight_string_rejected(self):
        """Test that molecular weight as string is rejected in strict mode."""
        materials = [
            {
                'name': 'Test',
                'alias': 'T',
                'molecular_weight': '46.07',  # String instead of float
                'role': 'Reactant'
            }
        ]

        response = self.client.post('/api/experiment/materials',
                                  data=json.dumps(materials),
                                  content_type='application/json')

        self.assertEqual(response.status_code, 400)

    def test_invalid_cas_format_rejected(self):
        """Test that invalid CAS format is rejected in strict mode."""
        materials = [
            {
                'name': 'Test',
                'alias': 'T',
                'cas': '12345',  # Invalid format
                'role': 'Reactant'
            }
        ]

        response = self.client.post('/api/experiment/materials',
                                  data=json.dumps(materials),
                                  content_type='application/json')

        self.assertEqual(response.status_code, 400)

    def test_invalid_smiles_rejected(self):
        """Test that invalid SMILES is rejected in strict mode."""
        materials = [
            {
                'name': 'Test',
                'alias': 'T',
                'smiles': 'C(C(',  # Unbalanced parentheses
                'role': 'Reactant'
            }
        ]

        response = self.client.post('/api/experiment/materials',
                                  data=json.dumps(materials),
                                  content_type='application/json')

        self.assertEqual(response.status_code, 400)

    def test_invalid_results_percentages_rejected(self):
        """Test that invalid percentages are rejected in strict mode."""
        results = {
            'results': [
                {
                    'well': 'A1',
                    'id': 'A1',
                    'conversion_percent': 150.0  # Invalid: > 100
                }
            ]
        }

        response = self.client.post('/api/experiment/results',
                                  data=json.dumps(results),
                                  content_type='application/json')

        self.assertEqual(response.status_code, 400)

    def test_valid_results_percentages_accepted(self):
        """Test that valid percentages are accepted in strict mode."""
        results = {
            'results': [
                {
                    'well': 'A1',
                    'id': 'A1',
                    'conversion_percent': 75.5,
                    'yield_percent': 68.2,
                    'selectivity_percent': 90.5
                }
            ]
        }

        response = self.client.post('/api/experiment/results',
                                  data=json.dumps(results),
                                  content_type='application/json')

        self.assertEqual(response.status_code, 200)

    def test_invalid_molecule_image_request_rejected(self):
        """Test that invalid molecule image request is rejected in strict mode."""
        invalid_request = {
            'smiles': 'x' * 501,  # Invalid: too long
            'width': 5000,  # Invalid: too large
            'height': -10  # Invalid: negative
        }

        response = self.client.post('/api/molecule/image',
                                  data=json.dumps(invalid_request),
                                  content_type='application/json')

        # Should be rejected in strict mode
        self.assertEqual(response.status_code, 400)


if __name__ == '__main__':
    unittest.main(verbosity=2)
