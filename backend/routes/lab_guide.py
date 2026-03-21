from flask import Blueprint, request, jsonify
from state.experiment import current_experiment, update_experiment_lab_deviations, update_experiment_lab_inputs
import logging

logger = logging.getLogger(__name__)

lab_guide_bp = Blueprint('lab_guide', __name__, url_prefix='/api/lab')


@lab_guide_bp.route('/protocol', methods=['GET'])
def get_lab_protocol():
    """Return the saved plating protocol and experiment context for the lab guide."""
    protocol = current_experiment.get('plating_protocol', None)
    context = current_experiment.get('context', {})
    materials = current_experiment.get('materials', [])
    return jsonify({'protocol': protocol, 'context': context, 'materials': materials})


@lab_guide_bp.route('/deviations', methods=['GET'])
def get_lab_deviations():
    """Return recorded lab deviations for the current experiment."""
    deviations = current_experiment.get('lab_deviations', [])
    return jsonify({'deviations': deviations})


@lab_guide_bp.route('/deviations', methods=['POST'])
def save_lab_deviations():
    """Save (full-replace) lab deviations for the current experiment."""
    data = request.get_json(force=True) or {}
    deviations = data.get('deviations', [])
    update_experiment_lab_deviations(deviations)
    return jsonify({'message': 'Saved'})


@lab_guide_bp.route('/inputs', methods=['GET'])
def get_lab_inputs():
    """Return persisted lab inputs (stock actuals, deviation notes, etc.)."""
    inputs = current_experiment.get('lab_inputs', {})
    return jsonify({'inputs': inputs})


@lab_guide_bp.route('/inputs', methods=['POST'])
def save_lab_inputs():
    """Save (full-replace) lab inputs for the current experiment."""
    data = request.get_json(force=True) or {}
    inputs = data.get('inputs', {})
    update_experiment_lab_inputs(inputs)
    return jsonify({'message': 'Saved'})
