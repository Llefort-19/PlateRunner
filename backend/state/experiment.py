"""
Experiment state management.
Per-user, database-backed state with backward-compatible ExperimentState wrapper.
"""
import copy

_DEFAULT_EXPERIMENT = {
    'context': {},
    'materials': [],
    'procedure': [],
    'procedure_settings': {
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
    },
    'analytical_data': {
        'selectedCompounds': [],
        'uploadedFiles': []
    },
    'results': [],
    'plating_protocol': None
}


def _default_experiment():
    return copy.deepcopy(_DEFAULT_EXPERIMENT)


def _get_experiment_data():
    """Load current user's experiment from DB (cached on flask.g for this request)."""
    from flask import g
    if hasattr(g, '_experiment_data'):
        return g._experiment_data

    user_id = getattr(g, 'current_user_id', None)
    if user_id is None:
        g._experiment_data = _default_experiment()
        g._experiment_id = None
        g._experiment_dirty = False
        return g._experiment_data

    from models import Experiment
    exp = Experiment.query.filter_by(user_id=user_id, is_active=True).first()
    if exp:
        g._experiment_data = exp.get_data()
        g._experiment_id = exp.id
    else:
        g._experiment_data = _default_experiment()
        g._experiment_id = None

    g._experiment_dirty = False
    return g._experiment_data


def _mark_dirty():
    from flask import g
    g._experiment_dirty = True


def save_experiment_if_dirty():
    """Persist experiment to DB if modified. Called by after_request hook."""
    from flask import g
    if not getattr(g, '_experiment_dirty', False):
        return
    if not hasattr(g, '_experiment_data'):
        return

    user_id = getattr(g, 'current_user_id', None)
    if user_id is None:
        return

    from models import Experiment, db
    exp_id = getattr(g, '_experiment_id', None)

    if exp_id:
        exp = db.session.get(Experiment, exp_id)
        if exp:
            exp.set_data(g._experiment_data)
            db.session.commit()
    else:
        exp = Experiment(user_id=user_id)
        exp.set_data(g._experiment_data)
        db.session.add(exp)
        db.session.commit()
        g._experiment_id = exp.id

    g._experiment_dirty = False


def reset_experiment():
    """Reset the current user's experiment to initial state."""
    from flask import g
    from models import Experiment, db

    user_id = getattr(g, 'current_user_id', None)
    fresh = _default_experiment()

    if user_id is None:
        g._experiment_data = fresh
        g._experiment_id = None
        g._experiment_dirty = False
        return

    exp_id = getattr(g, '_experiment_id', None)
    if exp_id:
        exp = db.session.get(Experiment, exp_id)
        if exp:
            exp.set_data(fresh)
            db.session.commit()
    else:
        exp = Experiment(user_id=user_id)
        exp.set_data(fresh)
        db.session.add(exp)
        db.session.commit()
        g._experiment_id = exp.id

    g._experiment_data = fresh
    g._experiment_dirty = False


# ── Backward-compatible named update functions ──────────────────────────────

def get_current_experiment():
    return copy.deepcopy(_get_experiment_data())

def update_experiment_context(context):
    _get_experiment_data()['context'] = context
    _mark_dirty()

def update_experiment_materials(materials):
    _get_experiment_data()['materials'] = materials
    _mark_dirty()

def update_experiment_procedure(procedure):
    _get_experiment_data()['procedure'] = procedure
    _mark_dirty()

def update_experiment_procedure_settings(settings):
    _get_experiment_data()['procedure_settings'] = settings
    _mark_dirty()

def update_experiment_analytical_data(analytical_data):
    _get_experiment_data()['analytical_data'] = analytical_data
    _mark_dirty()

def update_experiment_results(results):
    _get_experiment_data()['results'] = results
    _mark_dirty()

def update_experiment_heatmap_data(heatmap_data):
    _get_experiment_data()['heatmap_data'] = heatmap_data
    _mark_dirty()

def update_experiment_plating_protocol(protocol):
    _get_experiment_data()['plating_protocol'] = protocol
    _mark_dirty()


# ── Backward-compatible dict-like wrapper ────────────────────────────────────

class ExperimentState:
    """Dict-like wrapper giving routes transparent access to per-user DB state."""

    def __getitem__(self, key):
        return _get_experiment_data()[key]

    def __contains__(self, key):
        return key in _get_experiment_data()

    def __setitem__(self, key, value):
        _get_experiment_data()[key] = value
        _mark_dirty()

    def get(self, key, default=None):
        return _get_experiment_data().get(key, default)

    def keys(self):
        return _get_experiment_data().keys()

    def values(self):
        return _get_experiment_data().values()

    def items(self):
        return _get_experiment_data().items()


# Module-level singleton — all routes use `from state import current_experiment`
current_experiment = ExperimentState()
