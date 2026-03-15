"""
PDF Export for Plating Protocol using ReportLab.
Generates a professional PDF that matches the preview layout exactly.
"""
import io
import tempfile
from datetime import datetime
from flask import send_file

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, KeepTogether
from reportlab.platypus.flowables import HRFlowable
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT


def export_to_pdf(protocol):
    """Export protocol to PDF using ReportLab."""
    # Create buffer
    buffer = io.BytesIO()

    # Create PDF document
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=12*mm,
        leftMargin=12*mm,
        topMargin=10*mm,
        bottomMargin=10*mm,
    )

    # Container for flowables
    story = []

    # Get data
    context = protocol.get('context', {})
    materials = protocol.get('materials', [])
    operations = protocol.get('operations', [])
    plate_type = protocol.get('plate_type', '96')
    plate_cfg = _get_plate_config(plate_type)

    # Build PDF sections
    story.extend(_build_header(context, plate_type))
    story.append(Spacer(1, 2*mm))

    # Section 0: Materials List
    from state import current_experiment
    experiment_materials = current_experiment.get('materials', [])
    if experiment_materials:
        story.extend(_build_materials_list(experiment_materials))
        story.append(Spacer(1, 2*mm))

    # Section 1: Stock Solution Preparation
    # Non-kit stock materials + kit-level stock entries
    kit_stock_entries = protocol.get('kit_stock_entries', [])
    kit_role_ids = set(e.get('kit_id', '') for e in kit_stock_entries)
    non_kit_stock = [m for m in materials if m.get('dispensing_method') == 'stock' and m.get('role_id', '') not in kit_role_ids]
    stock_mats = kit_stock_entries + non_kit_stock
    if stock_mats:
        story.extend(_build_stock_table(stock_mats, materials))
        story.append(Spacer(1, 2*mm))

    # Section 2: Protocol Steps (2-column)
    story.extend(_build_protocol_steps(operations, materials))
    story.append(Spacer(1, 2*mm))

    # Section 3: Plate Maps
    story.extend(_build_plate_maps(operations, materials, plate_cfg))

    # Build PDF
    doc.build(story)

    # Get PDF data
    buffer.seek(0)
    pdf_data = buffer.read()

    # Save to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
        tmp.write(pdf_data)
        tmp_path = tmp.name

    # Generate filename
    eln = context.get('eln', 'Protocol')
    date = datetime.now().strftime('%Y-%m-%d')
    filename = f'Plating_Protocol_{eln}_{date}.pdf'

    return send_file(tmp_path, as_attachment=True, download_name=filename,
                     mimetype='application/pdf')


def _build_header(context, plate_type):
    """Build header section."""
    elements = []

    # Title
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#1a1a1a'),
        spaceAfter=1.5*mm,
    )
    elements.append(Paragraph('Plating Protocol', title_style))

    # Meta info
    meta_style = ParagraphStyle(
        'Meta',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#666666'),
    )

    meta_parts = []
    if context.get('eln'):
        meta_parts.append(f"ELN: {context['eln']}")
    if context.get('author'):
        meta_parts.append(f"Author: {context['author']}")
    meta_parts.append(f"Date: {datetime.now().strftime('%Y-%m-%d')}")
    meta_parts.append(f"Plate: {plate_type}-well")

    elements.append(Paragraph(' &nbsp;|&nbsp; '.join(meta_parts), meta_style))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#cccccc'), spaceBefore=1*mm, spaceAfter=2*mm))

    return elements


def _build_materials_list(experiment_materials):
    """Build materials list table for the protocol export."""
    elements = []
    styles = getSampleStyleSheet()
    heading_style = ParagraphStyle(
        'MatListHeading',
        parent=styles['Heading2'],
        fontSize=12,
        textColor=colors.HexColor('#1a1a1a'),
        spaceAfter=1.5*mm,
    )
    elements.append(Paragraph('\u25a0 Materials List', heading_style))

    cell_style = ParagraphStyle(
        'MatListCell',
        parent=styles['Normal'],
        fontSize=8,
        leading=10,
    )

    header_row = ['#', 'Alias', 'MW (g/mol)', 'CAS Number', 'Barcode', 'Supplier', 'Cat #']
    data = [header_row]
    for i, mat in enumerate(experiment_materials):
        data.append([
            str(i + 1),
            Paragraph(mat.get('alias', '') or '', cell_style),
            str(mat.get('molecular_weight', '')) if mat.get('molecular_weight') else '',
            Paragraph(mat.get('cas', '') or '', cell_style),
            Paragraph(mat.get('barcode', '') or '', cell_style),
            Paragraph(mat.get('supplier', '') or '', cell_style),
            Paragraph(mat.get('catalog_number', '') or '', cell_style),
        ])

    col_widths = [20, 90, 55, 70, 60, 75, 90]
    t = Table(data, colWidths=col_widths)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e2e8f0')),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('ALIGN', (2, 0), (2, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    elements.append(t)
    return elements


def _build_stock_table(stock_mats, all_materials=None):
    """Build stock solution preparation table."""
    elements = []
    all_materials = all_materials or []

    # Section heading
    styles = getSampleStyleSheet()
    heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontSize=12,
        textColor=colors.HexColor('#1a1a1a'),
        spaceAfter=1.5*mm,
    )
    elements.append(Paragraph('🧪 Stock Solution Preparation', heading_style))

    # Table data
    data = [['Material', 'Solvent', 'Mass', 'Total Volume', 'Concentration', 'Volume Range', 'Excess']]

    # Prepare cell style for wrapping text
    cell_style = ParagraphStyle(
        'WrappingCell',
        parent=styles['Normal'],
        fontSize=8,
        fontName='Helvetica-Bold',
        leading=10
    )
    comp_style = ParagraphStyle(
        'CompCell',
        parent=styles['Normal'],
        fontSize=8,
        fontName='Helvetica',
        leading=10,
        leftIndent=8
    )

    for m in stock_mats:
        stock = m.get('stock_solution') or {}
        is_kit = m.get('is_kit', False)
        is_cocktail = m.get('is_cocktail', False) or m.get('isCocktail', False)
        
        if is_kit:
            mass_str = '—'
            mat_name = m.get('kit_id') or m.get('name', '')
            vol_range_str = _format_kit_volume_range(m, all_materials)
        elif is_cocktail:
            mass_str = ''
            mat_name = f"{m.get('alias') or m.get('name', '')} (Premixed)"
            vol_range_str = ''
        else:
            mass = _calculate_mass(m)
            mass_str = f"{mass:.1f} mg" if mass else '—'
            mat_name = m.get('alias') or m.get('name', '')
            vol_range_str = _format_volume_range(m)
            
        vol_str = _format_volume(m)
        conc_str = _format_concentration(m)
        excess = stock.get('excess', 0)

        data.append([
            Paragraph(mat_name, cell_style),
            stock.get('solvent_name', '') if is_cocktail else stock.get('solvent_name', '—'),
            mass_str,
            vol_str,
            '' if is_cocktail else conc_str,
            vol_range_str,
            f"{excess}%"
        ])
        
        # Add components if it's a cocktail
        if is_cocktail:
            # Get the cocktail's shared amountPerWell so we can compute each
            # component's concentration correctly (cocktail components share one
            # stock solution; their own stockSolution.concentration is stale).
            cocktail_stock = m.get('stock_solution') or {}
            parent_vpw = cocktail_stock.get('amount_per_well_value')
            parent_vpw_unit = cocktail_stock.get('amount_per_well_unit', 'μL')
            parent_vpw_ul = None
            if parent_vpw:
                try:
                    parent_vpw_ul = (float(parent_vpw) * 1000
                                     if parent_vpw_unit == 'mL'
                                     else float(parent_vpw))
                except (ValueError, TypeError):
                    parent_vpw_ul = None

            for comp in m.get('components', []):
                c_stock = comp.get('stockSolution') or {}

                # --- Mass (prefer pre-calculated value from buildProtocolData) ---
                c_mass_val = comp.get('calculated_mass_value')
                if c_mass_val is None:
                    c_mass_dict = (c_stock.get('calculatedMass')
                                   or comp.get('calculatedMass') or {})
                    c_mass_val = (c_mass_dict.get('value')
                                  if isinstance(c_mass_dict, dict) else None)
                c_mass_str = f"{float(c_mass_val):.1f} mg" if c_mass_val is not None else ""

                # --- Concentration (prefer pre-calculated; fallback to live compute) ---
                c_conc_m = comp.get('calculated_concentration_value')

                if c_conc_m is None and parent_vpw_ul:
                    # Live compute: min(wellAmounts) / amountPerWell
                    well_amounts = (comp.get('well_amounts')
                                    or comp.get('wellAmounts') or {})
                    if well_amounts:
                        try:
                            amounts = [
                                float(w.get('value', 0))
                                for w in well_amounts.values()
                                if isinstance(w, dict) and w.get('value')
                            ]
                            if amounts:
                                c_conc_m = min(amounts) / parent_vpw_ul
                        except (ValueError, TypeError, ZeroDivisionError):
                            c_conc_m = None

                # Last resort: stale stored concentration
                if c_conc_m is None:
                    c_stored = c_stock.get('concentration') or {}
                    c_conc_m = c_stored.get('value')

                if c_conc_m is not None:
                    try:
                        c_conc_f = float(c_conc_m)
                        if c_conc_f < 0.1:
                            c_conc_str = f"{c_conc_f * 1000:.2f} mM"
                        else:
                            c_conc_str = f"{c_conc_f:.3f} M"
                    except (ValueError, TypeError):
                        c_conc_str = ""
                else:
                    c_conc_str = ""

                comp_name = comp.get('alias') or comp.get('name', '')
                data.append([
                    Paragraph(f"↳ {comp_name}", comp_style),
                    (c_stock.get('solvent') or {}).get('name', ''),
                    c_mass_str,
                    "",
                    c_conc_str,
                    "",
                    ""
                ])

    # Create table
    table = Table(data, colWidths=[35*mm, 30*mm, 18*mm, 25*mm, 25*mm, 25*mm, 15*mm])
    table.setStyle(TableStyle([
        # Header row
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e2e8f0')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1a1a1a')),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),  # First column left-aligned

        # Data rows
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('ALIGN', (1, 1), (-1, -1), 'CENTER'),
        ('ALIGN', (0, 1), (0, -1), 'LEFT'),
        ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),  # Material names bold

        # Borders and padding
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d0d0d0')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 2*mm),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2*mm),
    ]))

    elements.append(table)
    return elements


def _build_protocol_steps(operations, materials):
    """Build protocol steps in 2-column layout."""
    elements = []

    # Section heading
    styles = getSampleStyleSheet()
    heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontSize=12,
        textColor=colors.HexColor('#1a1a1a'),
        spaceAfter=1.5*mm,
    )
    elements.append(Paragraph('📋 Protocol Steps', heading_style))

    # Split into two columns horizontally (1, 2) (3, 4)
    col1_ops = [(i, op) for i, op in enumerate(operations) if i % 2 == 0]
    col2_ops = [(i, op) for i, op in enumerate(operations) if i % 2 != 0]

    # Build step items for each column
    def build_step_cell(idx, op):
        step_num = idx + 1
        op_type = op.get('type', '')
        is_dispense = (op_type == 'dispense')
        is_kit = (op_type == 'kit')

        # Build step content
        if is_dispense:
            mat_idx = op.get('materialIndex', 0)
            if mat_idx >= len(materials):
                return Paragraph('', styles['Normal'])

            material = materials[mat_idx]
            name = material.get('alias') or material.get('name', 'Material')
            method = material.get('dispensing_method', 'neat')
            total_unit = material.get('total_amount_unit', 'μmol')
            mat_is_solvent = total_unit in ('μL', 'mL')

            # Build description
            desc_parts = [f"<b>Dispense: {name}</b>"]
            detail_parts = []

            if mat_is_solvent:
                detail_parts.append('Solvent')
            elif method == 'stock':
                detail_parts.append('Stock')
            else:
                detail_parts.append('Neat')

            well_count = len(material.get('well_amounts', {}))
            detail_parts.append(f"{well_count} wells")

            if method == 'stock':
                vol_range = _format_volume_range(material)
                if vol_range != '—':
                    detail_parts.append(vol_range)
            elif mat_is_solvent:
                # For solvents, show volume range in μL
                sol_range = _format_solvent_volume_range(material)
                if sol_range != '—':
                    detail_parts.append(sol_range)
            else:
                # For neat materials, show mass range
                mass_range = _format_mass_range(material)
                if mass_range != '—':
                    detail_parts.append(mass_range)

            desc = f"{desc_parts[0]}<br/><font size='7' color='#666666'>{' • '.join(detail_parts)}</font>"
            bg_color = colors.HexColor('#f0f7ff')
            border_color = colors.HexColor('#2563eb')
        elif is_kit:
            label = _format_operation(op)
            desc = f"<b>{label}</b>"
            # Add neat/stock info from first member if available in operations
            bg_color = colors.HexColor('#f0fff0')
            border_color = colors.HexColor('#27ae60')
        else:
            label = _format_operation(op)
            desc = f"<font size='8'>{label}</font>"
            bg_color = colors.HexColor('#f8f8f8')
            border_color = colors.transparent

        # Create step cell with badge
        step_style = ParagraphStyle(
            'StepItem',
            parent=styles['Normal'],
            fontSize=8,
            leading=10,
            leftIndent=0,
        )

        # Create table for step (badge + content)
        step_table = Table(
            [[Paragraph(f"<font size='7' color='white'><b>{step_num}</b></font>", styles['Normal']),
              Paragraph(desc, step_style)]],
            colWidths=[6*mm, 82*mm]
        )

        if is_dispense:
            badge_bg = colors.HexColor('#2563eb')
        elif is_kit:
            badge_bg = colors.HexColor('#27ae60')
        else:
            badge_bg = colors.HexColor('#9ca3af')

        step_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, 0), badge_bg),
            ('BACKGROUND', (1, 0), (1, 0), bg_color),
            ('ALIGN', (0, 0), (0, 0), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 1.5*mm),
            ('RIGHTPADDING', (0, 0), (-1, -1), 1.5*mm),
            ('TOPPADDING', (0, 0), (-1, -1), 1*mm),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1*mm),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#e0e0e0')),
        ]))

        return step_table

    # Build columns
    col1_items = [build_step_cell(idx, op) for idx, op in col1_ops]
    col2_items = [build_step_cell(idx, op) for idx, op in col2_ops]

    # Pad shorter column
    while len(col1_items) < len(col2_items):
        col1_items.append(Paragraph('', styles['Normal']))
    while len(col2_items) < len(col1_items):
        col2_items.append(Paragraph('', styles['Normal']))

    # Create 2-column table
    steps_data = [[col1_items[i], col2_items[i]] for i in range(len(col1_items))]
    steps_table = Table(steps_data, colWidths=[90*mm, 90*mm])
    steps_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (0, -1), 1.5*mm),
        ('RIGHTPADDING', (1, 0), (1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1*mm),
    ]))

    elements.append(steps_table)
    return elements


def _build_plate_maps(operations, materials, plate_cfg):
    """Build plate maps section."""
    elements = []

    # Section heading
    styles = getSampleStyleSheet()
    heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontSize=12,
        textColor=colors.HexColor('#1a1a1a'),
        spaceAfter=1.5*mm,
    )
    elements.append(Paragraph('🗺️ Plate Maps', heading_style))

    # Collect materials for plate maps (individual + merged kits)
    plate_map_items = []
    processed_kit_ids = set()
    for idx, op in enumerate(operations):
        op_type = op.get('type', '')
        if op_type == 'dispense':
            mat_idx = op.get('materialIndex', 0)
            if mat_idx >= len(materials):
                continue
            plate_map_items.append(materials[mat_idx])
        elif op_type == 'kit':
            kit_id = op.get('kitId', '')
            if kit_id in processed_kit_ids:
                continue
            processed_kit_ids.add(kit_id)
            # Merge well_amounts from all kit members into one virtual material
            mat_indices = op.get('materialIndices', [])
            merged_wells = {}
            first_mat = None
            for mi in mat_indices:
                if mi < len(materials):
                    mat = materials[mi]
                    if first_mat is None:
                        first_mat = mat
                    for well_id, well_data in (mat.get('well_amounts') or {}).items():
                        if well_id not in merged_wells and isinstance(well_data, dict) and well_data.get('value'):
                            merged_wells[well_id] = well_data
            if first_mat:
                kit_virtual = dict(first_mat)
                kit_virtual['name'] = kit_id
                kit_virtual['alias'] = kit_id
                kit_virtual['well_amounts'] = merged_wells
                plate_map_items.append(kit_virtual)

    # Build 2 maps per row
    map_tables = []
    for material in plate_map_items:
        map_table = _build_single_plate_map(material, plate_cfg, styles)
        map_tables.append(map_table)

    # Arrange in 2-column grid
    for i in range(0, len(map_tables), 2):
        row = [map_tables[i]]
        if i + 1 < len(map_tables):
            row.append(map_tables[i + 1])
        else:
            row.append(Paragraph('', styles['Normal']))  # Empty cell

        grid = Table([row], colWidths=[90*mm, 90*mm])
        grid.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (0, -1), 1.5*mm),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0.5*mm),
        ]))
        elements.append(grid)

    return elements


def _build_single_plate_map(material, plate_cfg, styles):
    """Build a single plate map with title."""
    name = material.get('alias') or material.get('name', 'Material')
    method = material.get('dispensing_method', 'neat')
    well_amounts = material.get('well_amounts', {})

    # Determine unit
    total_unit = material.get('total_amount_unit', 'μmol')
    is_solvent = total_unit in ('μL', 'mL')
    if method == 'stock':
        unit_label = 'μL'
    elif is_solvent:
        unit_label = 'μL'  # Solvents are always in volume
    else:
        unit_label = 'mg'  # Show mass for neat materials

    # Title
    title_style = ParagraphStyle(
        'MapTitle',
        parent=styles['Normal'],
        fontSize=8,
        fontName='Helvetica-Bold',
        spaceAfter=0.5*mm,
    )
    title = Paragraph(f"<b>{name}</b> (amounts in {unit_label})", title_style)

    # Build plate grid
    rows = plate_cfg['rows']
    columns = plate_cfg['columns']

    # Calculate concentration for stock materials
    concentration = None
    if method == 'stock':
        stock = material.get('stock_solution') or {}
        if stock.get('amount_per_well_value') and well_amounts:
            try:
                volume_per_well = float(stock['amount_per_well_value'])
                unit = stock.get('amount_per_well_unit', 'μL')
                volume_per_well_ul = volume_per_well * 1000 if unit == 'mL' else volume_per_well

                amounts = [float(w.get('value', 0)) for w in well_amounts.values()
                          if isinstance(w, dict) and w.get('value')]
                if amounts:
                    min_amount = min(amounts)
                    concentration = min_amount / volume_per_well_ul
            except (ValueError, TypeError, ZeroDivisionError):
                concentration = None

    # Create cell style for proper vertical centering
    # The key is setting leading (line height) to match the cell height for perfect centering
    cell_style = ParagraphStyle(
        'CellStyle',
        parent=styles['Normal'],
        fontSize=6,
        fontName='Helvetica',
        alignment=1,  # CENTER
        leading=6,  # Line height - controls vertical position
    )

    # Style for filled cells with white text on blue background
    filled_cell_style = ParagraphStyle(
        'FilledCellStyle',
        parent=styles['Normal'],
        fontSize=6,
        fontName='Helvetica-Bold',
        alignment=1,  # CENTER
        leading=6,
        textColor=colors.white,
    )

    header_style = ParagraphStyle(
        'HeaderStyle',
        parent=styles['Normal'],
        fontSize=6,
        fontName='Helvetica-Bold',
        alignment=1,  # CENTER
        leading=6,
    )

    # Build grid data using Paragraph objects for proper vertical centering
    grid_data = [[Paragraph('', header_style)]]  # Corner
    for col in columns:
        grid_data[0].append(Paragraph(str(col), header_style))

    for row in rows:
        row_data = [Paragraph(row, header_style)]
        for col in columns:
            well_id = f"{row}{col}"
            well = well_amounts.get(well_id, {})
            value = well.get('value') if isinstance(well, dict) else None

            if value is not None:
                if method == 'stock' and concentration:
                    # For stock: show volume (always 1 decimal)
                    volume = float(value) / concentration
                    cell_value = f"{volume:.1f}"
                elif is_solvent:
                    # For solvents: values are already in μL/mL, show in μL
                    vol = float(value)
                    if total_unit == 'mL':
                        vol *= 1000  # Convert to μL
                    cell_value = f"{vol:.1f}"
                else:
                    # For neat: show mass (always 2 decimals)
                    # mass (mg) = amount (μmol) × MW (g/mol) / 1000
                    mw = material.get('molecular_weight')
                    if mw:
                        mass = (float(value) * float(mw)) / 1000
                        cell_value = f"{mass:.2f}"
                    else:
                        # Fallback to μmol if MW is missing
                        val = float(value)
                        cell_value = f"{val:.1f}"
                # Use filled_cell_style for cells with values (white text on blue background)
                row_data.append(Paragraph(cell_value, filled_cell_style))
            else:
                row_data.append(Paragraph('', cell_style))
        grid_data.append(row_data)

    # Create grid table
    cell_width = 6*mm
    cell_height = 4*mm
    col_widths = [4*mm] + [cell_width] * len(columns)

    grid_table = Table(grid_data, colWidths=col_widths, rowHeights=cell_height)

    # Style grid
    # Using Paragraph objects with specific leading for vertical centering
    # Padding is set to center the paragraph within the 4mm cell
    style_commands = [
        # Header row and column
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e3f2fd')),
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e3f2fd')),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),

        # Balanced padding for vertical centering: 4mm cell - 2.1mm font ≈ 1.9mm / 2 ≈ 0.95mm each side
        ('TOPPADDING', (0, 0), (-1, -1), 0.95*mm),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0.95*mm),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),

        # Grid
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#ddd')),
        ('LINEABOVE', (1, 0), (-1, 0), 1, colors.HexColor('#90caf9')),
        ('LINEBEFORE', (0, 1), (0, -1), 1, colors.HexColor('#90caf9')),
    ]

    # Color filled cells
    for r_idx, row in enumerate(rows, 1):
        for c_idx, col in enumerate(columns, 1):
            well_id = f"{row}{col}"
            if well_id in well_amounts and well_amounts[well_id].get('value'):
                style_commands.extend([
                    ('BACKGROUND', (c_idx, r_idx), (c_idx, r_idx), colors.HexColor('#1976d2')),
                    ('TEXTCOLOR', (c_idx, r_idx), (c_idx, r_idx), colors.white),
                    ('FONTNAME', (c_idx, r_idx), (c_idx, r_idx), 'Helvetica-Bold'),
                ])

    grid_table.setStyle(TableStyle(style_commands))

    # Combine title and grid
    return Table([[title], [grid_table]], colWidths=[85*mm])


# Helper functions

def _get_plate_config(plate_type):
    """Get plate configuration."""
    if plate_type == '24':
        return {'rows': list('ABCD'), 'columns': list(range(1, 7))}
    elif plate_type == '48':
        return {'rows': list('ABCDEF'), 'columns': list(range(1, 9))}
    else:  # 96
        return {'rows': list('ABCDEFGH'), 'columns': list(range(1, 13))}


def _calculate_mass(material):
    """Calculate mass in mg."""
    stock = material.get('stock_solution') or {}
    mw = material.get('molecular_weight')
    conc = stock.get('concentration_value')
    vol = stock.get('total_volume_value')

    if not conc or not vol or not mw:
        return material.get('calculated_mass_value')

    try:
        conc = float(conc)
        vol = float(vol)
        mw = float(mw)

        conc_unit = stock.get('concentration_unit', 'M')
        if conc_unit == 'mM':
            conc = conc / 1000

        vol_unit = stock.get('total_volume_unit', 'mL')
        if vol_unit == 'mL':
            vol = vol / 1000

        return conc * vol * mw * 1000
    except (ValueError, TypeError):
        return material.get('calculated_mass_value')


def _format_volume(material):
    """Format total volume."""
    stock = material.get('stock_solution') or {}
    vol = stock.get('total_volume_value')
    unit = stock.get('total_volume_unit', 'mL')
    if vol is None:
        return '—'
    try:
        vol = float(vol)
        if unit == 'mL' and vol < 1:
            return f"{vol * 1000:.0f} μL"
        return f"{vol:.2f} {unit}"
    except (ValueError, TypeError):
        return '—'


def _format_concentration(material):
    """Format concentration."""
    stock = material.get('stock_solution') or {}
    conc = stock.get('concentration_value')
    unit = stock.get('concentration_unit', 'M')
    if conc is None:
        return '—'
    try:
        conc = float(conc)
        if conc < 0.1:
            return f"{conc * 1000:.2f} mM"
        return f"{conc:.3f} {unit}"
    except (ValueError, TypeError):
        return '—'


def _format_volume_range(material):
    """Format volume range for stock materials."""
    if material.get('dispensing_method') != 'stock':
        return '—'

    stock = material.get('stock_solution') or {}
    well_amounts = material.get('well_amounts', {})

    if not stock.get('amount_per_well_value') or not well_amounts:
        return '—'

    try:
        volume_per_well = float(stock['amount_per_well_value'])
        unit = stock.get('amount_per_well_unit', 'μL')
        volume_per_well_ul = volume_per_well * 1000 if unit == 'mL' else volume_per_well

        amounts = [float(w.get('value', 0)) for w in well_amounts.values()
                  if isinstance(w, dict) and w.get('value')]
        if not amounts:
            return '—'

        min_amount = min(amounts)
        max_amount = max(amounts)
        concentration = min_amount / volume_per_well_ul

        min_volume = min_amount / concentration
        max_volume = max_amount / concentration

        if min_volume == max_volume:
            return f"{min_volume:.1f} μL"
        return f"{min_volume:.1f} - {max_volume:.1f} μL"
    except (ValueError, TypeError, ZeroDivisionError):
        return '—'


def _format_kit_volume_range(kit_entry, all_materials):
    """Format volume range for a kit entry by aggregating well amounts from all members."""
    stock = kit_entry.get('stock_solution') or {}
    kit_id = kit_entry.get('kit_id', '')

    if not stock.get('amount_per_well_value') or not kit_id:
        return '—'

    try:
        volume_per_well = float(stock['amount_per_well_value'])
        unit = stock.get('amount_per_well_unit', 'μL')
        volume_per_well_ul = volume_per_well * 1000 if unit == 'mL' else volume_per_well

        # Collect all well amounts across kit members
        all_amounts = []
        for mat in all_materials:
            if mat.get('role_id', '') == kit_id:
                well_amounts = mat.get('well_amounts', {})
                for w in well_amounts.values():
                    if isinstance(w, dict) and w.get('value'):
                        all_amounts.append(float(w['value']))

        if not all_amounts:
            return '—'

        min_amount = min(all_amounts)
        max_amount = max(all_amounts)
        concentration = min_amount / volume_per_well_ul

        min_volume = min_amount / concentration
        max_volume = max_amount / concentration

        if min_volume == max_volume:
            return f"{min_volume:.1f} μL"
        return f"{min_volume:.1f} - {max_volume:.1f} μL"
    except (ValueError, TypeError, ZeroDivisionError):
        return '—'


def _format_solvent_volume_range(material):
    """Format volume range for solvents (amounts already in μL/mL)."""
    well_amounts = material.get('well_amounts', {})
    total_unit = material.get('total_amount_unit', 'μL')

    if not well_amounts:
        return '—'

    try:
        values = []
        for well in well_amounts.values():
            if isinstance(well, dict) and well.get('value'):
                val = float(well['value'])
                # Convert to μL if in mL
                if total_unit == 'mL':
                    val *= 1000
                values.append(val)

        if not values:
            return '—'

        min_val = min(values)
        max_val = max(values)

        if min_val == max_val:
            return f"{min_val:.1f} μL"
        return f"{min_val:.1f} - {max_val:.1f} μL"
    except (ValueError, TypeError, ZeroDivisionError):
        return '—'


def _format_mass_range(material):
    """Format mass range for neat materials."""
    if material.get('dispensing_method') != 'neat':
        return '—'

    well_amounts = material.get('well_amounts', {})
    mw = material.get('molecular_weight')

    if not well_amounts or not mw:
        return '—'

    try:
        # Calculate mass for each well: mass (mg) = amount (μmol) × MW (g/mol) / 1000
        masses = []
        for well in well_amounts.values():
            if isinstance(well, dict) and well.get('value'):
                mass = (float(well['value']) * float(mw)) / 1000
                masses.append(mass)

        if not masses:
            return '—'

        min_mass = min(masses)
        max_mass = max(masses)

        # Format the range
        if min_mass == max_mass:
            return f"{min_mass:.1f} mg"
        return f"{min_mass:.1f} - {max_mass:.1f} mg"
    except (ValueError, TypeError, ZeroDivisionError):
        return '—'


def _format_operation(op):
    """Format operation description."""
    op_type = op.get('type', '')
    if op_type == 'kit':
        count = len(op.get('materialIndices', []))
        kit_id = op.get('kitId', 'Kit')
        text = f"{kit_id} ({count} materials)"
        note = op.get('note', '')
        if note:
            text += f" - {note}"
        return text
    elif op_type == 'wait':
        return f"Wait {op.get('duration', '—')} {op.get('unit', 'min')}"
    elif op_type == 'stir':
        text = f"Stir at {op.get('temperature', '—')}°C for {op.get('duration', '—')} {op.get('unit', 'min')}"
        if op.get('rpm'):
            text += f" @ {op['rpm']} RPM"
        return text
    elif op_type == 'evaporate':
        return "Evaporate solvents"
    elif op_type == 'note':
        return op.get('text', 'Note')
    return 'Unknown operation'
