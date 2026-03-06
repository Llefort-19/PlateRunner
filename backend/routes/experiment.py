"""
Experiment routes blueprint.
Handles experiment context, materials, procedure, and results operations.
"""
from flask import Blueprint, request, jsonify
from state import current_experiment
from validation import (
    validate_request, validate_response,
    ExperimentContextSchema, MaterialsListSchema, ProcedureListSchema,
    ProcedureSettingsSchema, AnalyticalDataSchema, ResultsSchema,
    HeatmapDataSchema, SuccessResponseSchema
)

# Create blueprint
experiment_bp = Blueprint('experiment', __name__, url_prefix='/api/experiment')

@experiment_bp.route('/context', methods=['GET'])
def get_experiment_context():
    """Get experiment context"""
    # Get context and ensure all fields are present with proper format
    context = current_experiment.get('context', {}).copy()
    
    # Ensure all required fields exist
    default_context = {
        'author': '',
        'date': '',
        'project': '',
        'eln': '',
        'objective': ''
    }
    
    # Merge defaults with existing context
    for key, default_value in default_context.items():
        if key not in context:
            context[key] = default_value
    
    # Fix date format if needed - be very conservative
    from datetime import datetime
    if 'date' in context and context['date']:
        date_str = str(context['date'])
        import re

        # Only normalize dates that are clearly malformed or contain timezone info
        if ('GMT' in date_str or 'UTC' in date_str):
            # Convert timezone-aware dates to local date
            context['date'] = datetime.now().strftime('%Y-%m-%d')
        elif date_str and not re.match(r'^\d{4}-\d{2}-\d{2}$', date_str):
            # Only try to normalize if it's a clearly invalid format
            try:
                # If it's already in a standard format, leave it alone
                datetime.strptime(date_str, '%Y-%m-%d')
            except ValueError:
                # Only fix if parsing as YYYY-MM-DD fails
                try:
                    parsed_date = None
                    sep = '/' if '/' in date_str else '-' if date_str.count('-') == 2 else None
                    if sep:
                        parts = date_str.split(sep)
                        if len(parts) == 3:
                            try:
                                a, b = int(parts[0]), int(parts[1])
                                if a > 12:
                                    # First part can't be a month — must be day-first (EU)
                                    parsed_date = datetime.strptime(date_str, f'%d{sep}%m{sep}%Y')
                                elif b > 12:
                                    # Second part can't be a month — must be day-first reversed (US)
                                    parsed_date = datetime.strptime(date_str, f'%m{sep}%d{sep}%Y')
                                # else: both ≤ 12 — genuinely ambiguous, preserve original
                            except (ValueError, TypeError):
                                pass

                    if parsed_date:
                        context['date'] = parsed_date.strftime('%Y-%m-%d')
                    # Don't change the date if we can't parse it - preserve the original
                except:
                    pass  # Keep original date if parsing fails

    # Ensure date field always exists
    if not context.get('date'):
        context['date'] = datetime.now().strftime('%Y-%m-%d')

    return jsonify(context)

@experiment_bp.route('/context', methods=['POST'])
@validate_request(ExperimentContextSchema)
def update_experiment_context():
    """Update experiment context with validation"""
    current_experiment['context'] = request.validated_json
    return jsonify({'message': 'Context updated'})

@experiment_bp.route('/materials', methods=['GET'])
def get_experiment_materials():
    """Get experiment materials"""
    return jsonify(current_experiment['materials'])

@experiment_bp.route('/materials', methods=['POST'])
@validate_request(MaterialsListSchema)
def update_experiment_materials():
    """Update experiment materials with validation"""
    # MaterialsListSchema handles list validation
    materials_data = request.validated_json
    if isinstance(materials_data, list):
        current_experiment['materials'] = materials_data
    else:
        # If not a list, wrap it
        current_experiment['materials'] = materials_data if isinstance(materials_data, list) else [materials_data]
    return jsonify({'message': 'Materials updated'})

@experiment_bp.route('/procedure', methods=['GET'])
def get_experiment_procedure():
    """Get experiment procedure (96-well plate)"""
    return jsonify(current_experiment['procedure'])

@experiment_bp.route('/procedure', methods=['POST'])
@validate_request(ProcedureListSchema)
def update_experiment_procedure():
    """Update experiment procedure with validation"""
    current_experiment['procedure'] = request.validated_json
    return jsonify({'message': 'Procedure updated'})

@experiment_bp.route('/procedure-settings', methods=['GET'])
def get_experiment_procedure_settings():
    """Get experiment procedure settings (reaction conditions and analytical details)"""
    return jsonify(current_experiment.get('procedure_settings', {
        'reactionConditions': {
            'temperature': '',
            'time': '',
            'pressure': '',
            'wavelength': '',
            'remarks': ''
        },
        'analyticalDetails': {
            'uplcNumber': '',
            'method': '',
            'duration': '',
            'remarks': ''
        }
    }))

@experiment_bp.route('/procedure-settings', methods=['POST'])
@validate_request(ProcedureSettingsSchema)
def update_experiment_procedure_settings():
    """Update experiment procedure settings with validation"""
    current_experiment['procedure_settings'] = request.validated_json
    return jsonify({'message': 'Procedure settings updated'})

@experiment_bp.route('/analytical', methods=['GET', 'POST'])
def experiment_analytical():
    """Get or update analytical data"""
    try:
        if request.method == 'POST':
            # Handle selected compounds update
            if 'selectedCompounds' in request.json:
                if 'analytical_data' not in current_experiment:
                    current_experiment['analytical_data'] = {}
                current_experiment['analytical_data']['selectedCompounds'] = request.json['selectedCompounds']
                return jsonify({'message': 'Selected compounds updated'})
            else:
                # Handle other analytical data updates
                current_experiment['analytical_data'] = request.json
                return jsonify({'message': 'Analytical data updated'})
        
        # Return the analytical data structure that frontend expects
        analytical_data = current_experiment.get('analytical_data', {})
        if isinstance(analytical_data, list):
            # If it's a list (old format), convert to new format
            return jsonify({
                'selectedCompounds': [],
                'uploadedFiles': analytical_data
            })
        else:
            # Return the analytical data as is
            return jsonify(analytical_data)
    except Exception as e:
        print(f"Error in experiment_analytical: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@experiment_bp.route('/results', methods=['GET'])
def get_experiment_results():
    """Get experiment results"""
    return jsonify(current_experiment['results'])

@experiment_bp.route('/results', methods=['POST'])
@validate_request(ResultsSchema)
def update_experiment_results():
    """Update experiment results with validation"""
    current_experiment['results'] = request.validated_json
    return jsonify({'message': 'Results updated'})

@experiment_bp.route('/heatmap', methods=['GET', 'POST'])
def experiment_heatmap():
    """Handle heatmap data persistence"""
    if request.method == 'GET':
        return jsonify(current_experiment.get('heatmap_data', {}))
    
    elif request.method == 'POST':
        data = request.get_json()
        current_experiment['heatmap_data'] = data
        return jsonify({'message': 'Heatmap data saved successfully'})

@experiment_bp.route('/reset', methods=['POST'])
def reset_experiment():
    """Reset current experiment"""
    from state.experiment import reset_experiment
    reset_experiment()
    return jsonify({'message': 'Experiment reset'})
