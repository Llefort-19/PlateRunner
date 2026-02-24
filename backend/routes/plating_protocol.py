"""
Plating Protocol routes blueprint.
Handles plating protocol creation, storage, and export.
"""
import os
import tempfile
from datetime import datetime
from flask import Blueprint, request, jsonify, send_file
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter
from state import current_experiment
from state.experiment import update_experiment_plating_protocol

# Create blueprint
plating_protocol_bp = Blueprint('plating_protocol', __name__, url_prefix='/api/experiment')


@plating_protocol_bp.route('/plating-protocol', methods=['GET'])
def get_plating_protocol():
    """Get the saved plating protocol for the current experiment."""
    protocol = current_experiment.get('plating_protocol', None)
    if protocol is None:
        return jsonify({'message': 'No protocol saved', 'protocol': None}), 200
    return jsonify({'message': 'Protocol retrieved', 'protocol': protocol}), 200


@plating_protocol_bp.route('/plating-protocol', methods=['POST'])
def save_plating_protocol():
    """Save plating protocol to experiment state."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Add timestamp
        data['saved_at'] = datetime.now().isoformat()

        # Save to experiment state
        update_experiment_plating_protocol(data)

        return jsonify({'message': 'Protocol saved successfully'}), 200
    except Exception as e:
        return jsonify({'error': f'Failed to save protocol: {str(e)}'}), 500


@plating_protocol_bp.route('/plating-protocol/export', methods=['POST'])
def export_plating_protocol():
    """Export plating protocol to Excel or PDF format."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        protocol = data.get('protocol', {})
        export_format = data.get('format', 'excel')

        if export_format == 'excel':
            return export_to_excel(protocol)
        elif export_format == 'pdf':
            from routes.pdf_export_reportlab import export_to_pdf
            return export_to_pdf(protocol)
        else:
            return jsonify({'error': f'Unsupported format: {export_format}'}), 400

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Export failed: {str(e)}'}), 500


def export_to_excel(protocol):
    """Export protocol to Excel format with plate grid visualizations."""
    wb = Workbook()

    # Remove default sheet
    if wb.active:
        wb.remove(wb.active)

    # Styles
    header_font = Font(bold=True, size=11)
    header_fill = PatternFill(start_color='E2E8F0', end_color='E2E8F0', fill_type='solid')
    title_font = Font(bold=True, size=14)
    thin_border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )
    cell_fill = PatternFill(start_color='EBF5FF', end_color='EBF5FF', fill_type='solid')

    # Get plate configuration
    plate_type = protocol.get('plate_type', '96')
    plate_config = get_plate_config(plate_type)

    # Sheet 1: Protocol Summary
    ws_summary = wb.create_sheet("Protocol Summary")

    # Context information
    context = protocol.get('context', {})
    ws_summary['A1'] = 'Plating Protocol'
    ws_summary['A1'].font = title_font
    ws_summary.merge_cells('A1:H1')

    ws_summary['A3'] = 'ELN:'
    ws_summary['B3'] = context.get('eln', '')
    ws_summary['A4'] = 'Author:'
    ws_summary['B4'] = context.get('author', '')
    ws_summary['A5'] = 'Date:'
    ws_summary['B5'] = context.get('date', datetime.now().strftime('%Y-%m-%d'))
    ws_summary['A6'] = 'Plate Type:'
    ws_summary['B6'] = f'{plate_type}-well'

    # Materials summary table
    row = 8
    headers = ['#', 'Material', 'Alias', 'MW', 'Method', 'Solvent', 'Vol/Well', 'Excess', 'Conc.', 'Mass (mg)', 'Total Vol.']
    for col, header in enumerate(headers, 1):
        cell = ws_summary.cell(row=row, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.border = thin_border
        cell.alignment = Alignment(horizontal='center')

    materials = protocol.get('materials', [])
    for idx, material in enumerate(materials, 1):
        row += 1
        stock = material.get('stock_solution', {}) or {}

        # Calculate mass
        mass = None
        if material.get('dispensing_method') == 'stock' and stock:
            mass = calculate_mass(
                stock.get('concentration_value'),
                stock.get('concentration_unit', 'M'),
                stock.get('total_volume_value'),
                stock.get('total_volume_unit', 'mL'),
                material.get('molecular_weight')
            )

        total_unit = material.get('total_amount_unit', 'μmol')
        is_solvent = total_unit in ('μL', 'mL')

        if material.get('dispensing_method') == 'stock':
            method_label = 'Stock'
        elif is_solvent:
            method_label = 'Solvent'
        else:
            method_label = 'Neat'

        row_data = [
            idx,
            material.get('name', ''),
            material.get('alias', ''),
            material.get('molecular_weight', ''),
            method_label,
            stock.get('solvent_name', '') if stock else '',
            f"{stock.get('amount_per_well_value', '')} {stock.get('amount_per_well_unit', '')}" if stock and stock.get('amount_per_well_value') else '',
            f"{stock.get('excess', '')}%" if stock and stock.get('excess') is not None else '',
            f"{stock.get('concentration_value', '')} {stock.get('concentration_unit', '')}" if stock and stock.get('concentration_value') else '',
            f"{mass:.1f}" if mass else '',
            f"{stock.get('total_volume_value', '')} {stock.get('total_volume_unit', '')}" if stock and stock.get('total_volume_value') else ''
        ]

        for col, value in enumerate(row_data, 1):
            cell = ws_summary.cell(row=row, column=col, value=value)
            cell.border = thin_border
            cell.alignment = Alignment(horizontal='center' if col in [1, 5, 6] else 'left')

    # Adjust column widths
    ws_summary.column_dimensions['A'].width = 5
    ws_summary.column_dimensions['B'].width = 25
    ws_summary.column_dimensions['C'].width = 15
    ws_summary.column_dimensions['D'].width = 10
    ws_summary.column_dimensions['E'].width = 10
    ws_summary.column_dimensions['F'].width = 15
    ws_summary.column_dimensions['G'].width = 12
    ws_summary.column_dimensions['H'].width = 10
    ws_summary.column_dimensions['I'].width = 12
    ws_summary.column_dimensions['J'].width = 12
    ws_summary.column_dimensions['K'].width = 12

    # Create per-material dispense sheets
    for idx, material in enumerate(materials, 1):
        sheet_name = f"Step {idx} - {(material.get('alias') or material.get('name', 'Material'))[:20]}"
        ws_material = wb.create_sheet(sheet_name)

        # Material header
        ws_material['A1'] = f"Step {idx}: {material.get('alias') or material.get('name', '')}"
        ws_material['A1'].font = title_font
        ws_material.merge_cells('A1:L1')

        # Material info
        mat_total_unit = material.get('total_amount_unit', 'μmol')
        mat_is_solvent = mat_total_unit in ('μL', 'mL')
        ws_material['A3'] = 'Method:'
        if material.get('dispensing_method') == 'stock':
            ws_material['B3'] = 'Stock Solution'
        elif mat_is_solvent:
            ws_material['B3'] = 'Solvent (Neat)'
        else:
            ws_material['B3'] = 'Neat'

        stock = material.get('stock_solution', {}) or {}
        if material.get('dispensing_method') == 'stock' and stock:
            ws_material['A4'] = 'Solvent:'
            ws_material['B4'] = stock.get('solvent_name', '')

            ws_material['A5'] = 'Volume per well:'
            ws_material['B5'] = f"{stock.get('amount_per_well_value', '')} {stock.get('amount_per_well_unit', '')}"

            ws_material['A6'] = 'Excess:'
            ws_material['B6'] = f"{stock.get('excess', '')}%"

            ws_material['A7'] = 'Concentration:'
            ws_material['B7'] = f"{stock.get('concentration_value', '')} {stock.get('concentration_unit', '')}"

            mass = calculate_mass(
                stock.get('concentration_value'),
                stock.get('concentration_unit', 'M'),
                stock.get('total_volume_value'),
                stock.get('total_volume_unit', 'mL'),
                material.get('molecular_weight')
            )
            ws_material['A8'] = 'Mass to weigh:'
            ws_material['B8'] = f"{mass:.2f} mg" if mass else '--'

            ws_material['A9'] = 'Total volume:'
            ws_material['B9'] = f"{stock.get('total_volume_value', '')} {stock.get('total_volume_unit', '')}"

        # Plate grid visualization
        grid_start_row = 12
        ws_material.cell(row=grid_start_row - 1, column=1, value='Dispense amounts:')
        ws_material.cell(row=grid_start_row - 1, column=1).font = Font(bold=True)

        well_amounts = material.get('well_amounts', {})

        # Column headers
        for col_idx, col_num in enumerate(plate_config['columns'], 2):
            cell = ws_material.cell(row=grid_start_row, column=col_idx, value=col_num)
            cell.font = header_font
            cell.alignment = Alignment(horizontal='center')
            cell.border = thin_border
            cell.fill = header_fill

        # Row headers and values
        for row_idx, row_letter in enumerate(plate_config['rows'], 1):
            # Row header
            cell = ws_material.cell(row=grid_start_row + row_idx, column=1, value=row_letter)
            cell.font = header_font
            cell.alignment = Alignment(horizontal='center')
            cell.border = thin_border
            cell.fill = header_fill

            # Well values
            for col_idx, col_num in enumerate(plate_config['columns'], 2):
                well_id = f"{row_letter}{col_num}"
                well_data = well_amounts.get(well_id, {})
                value = well_data.get('value', '') if well_data else ''

                cell = ws_material.cell(row=grid_start_row + row_idx, column=col_idx)
                cell.border = thin_border
                cell.alignment = Alignment(horizontal='center')

                if value:
                    # Format value
                    try:
                        num_value = float(value)
                        if num_value >= 100:
                            cell.value = int(num_value)
                        elif num_value >= 10:
                            cell.value = round(num_value, 0)
                        elif num_value >= 1:
                            cell.value = round(num_value, 1)
                        else:
                            cell.value = round(num_value, 2)
                    except (ValueError, TypeError):
                        cell.value = value

                    cell.fill = cell_fill
                else:
                    cell.value = '-'

        # Add unit note
        unit_row = grid_start_row + len(plate_config['rows']) + 2
        if material.get('dispensing_method') == 'stock' and stock:
            unit = stock.get('amount_per_well_unit', 'μL')
        else:
            unit = material.get('total_amount_unit', 'μmol')
        ws_material.cell(row=unit_row, column=1, value=f'Amounts in {unit}')

        # Adjust column widths
        ws_material.column_dimensions['A'].width = 15
        for col_idx in range(2, len(plate_config['columns']) + 2):
            ws_material.column_dimensions[get_column_letter(col_idx)].width = 8

    # Save to temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as tmp:
        wb.save(tmp.name)
        tmp_path = tmp.name

    # Generate filename
    eln = protocol.get('context', {}).get('eln', 'Protocol')
    date = datetime.now().strftime('%Y-%m-%d')
    filename = f'Plating_Protocol_{eln}_{date}.xlsx'

    return send_file(tmp_path, as_attachment=True, download_name=filename)


def get_plate_config(plate_type):
    """Get plate configuration for given plate type."""
    if plate_type == '24':
        return {
            'rows': ['A', 'B', 'C', 'D'],
            'columns': list(range(1, 7))
        }
    elif plate_type == '48':
        return {
            'rows': ['A', 'B', 'C', 'D', 'E', 'F'],
            'columns': list(range(1, 9))
        }
    else:  # 96
        return {
            'rows': ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
            'columns': list(range(1, 13))
        }


def calculate_mass(conc_value, conc_unit, vol_value, vol_unit, molecular_weight):
    """Calculate mass in mg from concentration, volume, and molecular weight."""
    if not conc_value or not vol_value or not molecular_weight:
        return None

    try:
        conc_value = float(conc_value)
        vol_value = float(vol_value)
        molecular_weight = float(molecular_weight)

        # Convert concentration to mol/L
        if conc_unit == 'mM':
            conc_mol_per_l = conc_value / 1000
        elif conc_unit == 'mg/mL':
            conc_mol_per_l = (conc_value / molecular_weight) * 1000
        else:  # M
            conc_mol_per_l = conc_value

        # Convert volume to L
        if vol_unit == 'mL':
            vol_l = vol_value / 1000
        else:  # L
            vol_l = vol_value

        # Mass in mg = C (mol/L) × V (L) × MW (g/mol) × 1000 (mg/g)
        mass_mg = conc_mol_per_l * vol_l * molecular_weight * 1000
        return mass_mg

    except (ValueError, TypeError):
        return None
