"""
Solvent routes blueprint.
Handles solvent database operations.
"""
import os
import re
import pandas as pd
from flask import Blueprint, request, jsonify
from config import get_config

# Create blueprint
solvent_bp = Blueprint('solvent', __name__, url_prefix='/api/solvent')

# Module-level cache — loaded once, reused on every request
_solvent_df: pd.DataFrame | None = None


def _get_solvent_df() -> pd.DataFrame | None:
    """Return the cached solvent DataFrame, loading from disk only on the first call."""
    global _solvent_df
    if _solvent_df is not None:
        return _solvent_df
    config = get_config()
    solvent_path = config.SOLVENT_PATH
    if not os.path.exists(solvent_path):
        return None
    df = pd.read_excel(solvent_path)
    df = df.fillna('')
    _solvent_df = df
    return _solvent_df


@solvent_bp.route('/search', methods=['GET'])
def search_solvents():
    """Search solvents in the Solvent.xlsx file"""
    query = request.args.get('q', '').lower()
    class_filter = request.args.get('class_filter', '').lower()
    bp_filter = request.args.get('bp_filter', '')
    tier_filter = request.args.get('tier_filter', '')

    df = _get_solvent_df()
    if df is None:
        return jsonify({'error': 'Solvent database not found'}), 404

    try:
        results = df.copy()

        # Apply text search if query provided
        if query:
            text_filter = (
                df['Name'].astype(str).str.lower().str.contains(query, na=False) |
                df['Alias'].astype(str).str.lower().str.contains(query, na=False) |
                df['CAS Number'].astype(str).str.lower().str.contains(query, na=False)
            )
            results = results[text_filter]

        # Apply class filter if provided
        if class_filter:
            class_variations = [class_filter]
            if class_filter.endswith('s'):
                class_variations.append(class_filter[:-1])
            else:
                class_variations.append(class_filter + 's')
            class_mask = results['Chemical Class'].astype(str).str.lower().str.contains('|'.join(class_variations), na=False)
            results = results[class_mask]

        # Apply boiling point filter if provided
        if bp_filter:
            try:
                if bp_filter.startswith('>'):
                    bp_value = float(bp_filter[1:].strip())
                    bp_mask = results['Boiling point'] > bp_value
                elif bp_filter.startswith('<'):
                    bp_value = float(bp_filter[1:].strip())
                    bp_mask = results['Boiling point'] < bp_value
                else:
                    bp_value = float(bp_filter)
                    tolerance = 5
                    bp_mask = (results['Boiling point'] >= bp_value - tolerance) & (results['Boiling point'] <= bp_value + tolerance)
                results = results[bp_mask]
            except ValueError:
                results = pd.DataFrame()

        # Apply tier filter if provided
        if tier_filter:
            try:
                max_tier = int(tier_filter)
                tier_numeric = results['Tier'].astype(str).str.extract(r'Tier\s*(\d+)')[0].astype(float)
                results = results[tier_numeric <= max_tier]
            except ValueError:
                results = pd.DataFrame()

        solvent_results = []
        for _, row in results.iterrows():
            solvent_results.append({
                'name': row['Name'],
                'alias': row['Alias'],
                'cas': row['CAS Number'],
                'molecular_weight': row['Molecular_weight'],
                'smiles': row['SMILES'],
                'boiling_point': row['Boiling point'],
                'chemical_class': row['Chemical Class'],
                'density': row['Density (g/mL)'],
                'tier': row['Tier'],
                'source': 'solvent_database'
            })

        return jsonify(solvent_results)

    except Exception as e:
        return jsonify({'error': f'Error searching solvents: {str(e)}'}), 500


@solvent_bp.route('/tiers', methods=['GET'])
def get_solvent_tiers():
    """Get all available solvent tiers from the database"""
    df = _get_solvent_df()
    if df is None:
        return jsonify({'error': 'Solvent database not found'}), 404

    try:
        tiers = df['Tier'].astype(str).unique()
        tiers = [t.strip() for t in tiers if t.strip() and t.strip().lower() != 'nan']
        tier_numbers = []
        for tier in tiers:
            try:
                match = re.search(r'Tier\s*(\d+)', tier, re.IGNORECASE)
                if match:
                    tier_numbers.append(int(match.group(1)))
            except (ValueError, AttributeError):
                continue
        tier_numbers.sort()
        return jsonify([str(t) for t in tier_numbers])

    except Exception as e:
        return jsonify({'error': f'Error getting solvent tiers: {str(e)}'}), 500


@solvent_bp.route('/classes', methods=['GET'])
def get_solvent_classes():
    """Get all available solvent classes from the database"""
    df = _get_solvent_df()
    if df is None:
        return jsonify({'error': 'Solvent database not found'}), 404

    try:
        classes = df['Chemical Class'].astype(str).unique()
        classes = [c.strip() for c in classes if c.strip() and c.strip().lower() != 'nan']
        classes.sort()
        return jsonify(classes)

    except Exception as e:
        return jsonify({'error': f'Error getting solvent classes: {str(e)}'}), 500
