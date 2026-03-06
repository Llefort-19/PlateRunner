"""
Kit routes blueprint.
Handles kit analysis and application operations.
"""
import os
import pandas as pd
from flask import Blueprint, request, jsonify
from state import current_experiment
from utils import (
    apply_kit_design_to_procedure
)
import logging

logger = logging.getLogger(__name__)

# Create blueprint
kit_bp = Blueprint('kit', __name__, url_prefix='/api/experiment/kit')

@kit_bp.route('/analyze', methods=['POST'])
def analyze_kit():
    """Analyze kit Excel file and return materials and design data"""
    try:
        logger.debug("Kit analyze endpoint called")
        
        if 'file' not in request.files:
            logger.debug("No file in request.files")
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        logger.debug(f"File received: {file.filename}")
        
        if file.filename == '':
            logger.debug("Empty filename")
            return jsonify({'error': 'No file selected'}), 400
        
        # Check file extension
        allowed_extensions = {'.xlsx', '.xls'}
        file_ext = os.path.splitext(file.filename)[1].lower()
        logger.debug(f"File extension: {file_ext}")
        
        if file_ext not in allowed_extensions:
            return jsonify({'error': f'Invalid file type. Allowed: {", ".join(allowed_extensions)}'}), 400
        
        # Read the Excel file
        try:
            logger.debug("Attempting to read Excel file")
            excel_file = pd.ExcelFile(file)
            logger.debug(f"Excel sheets: {excel_file.sheet_names}")
        except Exception as e:
            logger.error(f"Error reading Excel file: {str(e)}")
            return jsonify({'error': f'Error reading Excel file: {str(e)}'}), 400
        
        # Look for Materials sheet
        if 'Materials' not in excel_file.sheet_names:
            return jsonify({'error': 'No "Materials" sheet found in the Excel file'}), 400
        
        # Look for Design sheet
        if 'Design' not in excel_file.sheet_names:
            return jsonify({'error': 'No "Design" sheet found in the Excel file'}), 400
        
        # Read the Materials sheet using the excel_file object (not file stream which is consumed)
        try:
            materials_df = pd.read_excel(excel_file, sheet_name='Materials')
            logger.debug(f"Materials sheet read successfully. Shape: {materials_df.shape}")
        except Exception as e:
            logger.error(f"Error reading Materials sheet: {str(e)}")
            return jsonify({'error': f'Error reading Materials sheet: {str(e)}'}), 400
        
        # Read the Design sheet using the excel_file object
        try:
            design_df = pd.read_excel(excel_file, sheet_name='Design')
            logger.debug(f"Design sheet read successfully. Shape: {design_df.shape}")
        except Exception as e:
            logger.error(f"Error reading Design sheet: {str(e)}")
            return jsonify({'error': f'Error reading Design sheet: {str(e)}'}), 400
        
        # Extract materials from the Materials sheet
        materials = []
        for index, row in materials_df.iterrows():
            # Skip empty rows
            if pd.isna(row.iloc[0]) or str(row.iloc[0]).strip() == '':
                continue
            
            # Extract material data based on expected columns (support both old and new column names)
            # Helper function to clean and validate field values
            def clean_field(value):
                if pd.isna(value):
                    return ''
                str_value = str(value).strip()
                # Return empty string for common "empty" representations
                if str_value.lower() in ['nan', 'null', 'none', '']:
                    return ''
                return str_value
            
            material = {
                'name': clean_field(row.get('chemical_name', row.get('Chemical_Name', row.get('Name', row.iloc[1] if len(row) > 1 else '')))),
                'alias': clean_field(row.get('alias', row.get('Alias', ''))),
                'cas': clean_field(row.get('cas_number', row.get('CAS_Number', row.get('CAS', '')))),
                'smiles': clean_field(row.get('smiles', row.get('SMILES', ''))),
                'molecular_weight': clean_field(row.get('molecular_weight', row.get('Molecular_Weight', row.get('Molecular Weight', '')))),
                'barcode': clean_field(row.get('barcode', row.get('Barcode', row.get('Lot number', '')))),
                'role': clean_field(row.get('role', row.get('Role', ''))),
                'source': 'kit_upload'
            }
            
            # Only add if name or alias is not empty (allow materials with just alias)
            if (material.get('name') and material.get('name') != 'nan') or (material.get('alias') and material.get('alias') != 'nan'):
                materials.append(material)
                # Safe print - encode to ASCII with replacement for special chars
                safe_name = material.get('name', '').encode('ascii', 'replace').decode('ascii')
                safe_alias = material.get('alias', '').encode('ascii', 'replace').decode('ascii')
                logger.debug(f"Added material: name='{safe_name}', alias='{safe_alias}'")
            else:
                # Safe print for skipped materials too
                safe_name = str(material.get('name', '')).encode('ascii', 'replace').decode('ascii')
                safe_alias = str(material.get('alias', '')).encode('ascii', 'replace').decode('ascii')
                logger.debug(f"Skipped material: name='{safe_name}', alias='{safe_alias}' (both empty)")
        
        if not materials:
            return jsonify({'error': 'No valid materials found in the Materials sheet'}), 400
        
        # Extract design data from the Design sheet (long format)
        # Columns: well, material_nr, material_alias, amount, dispense_order
        design_data = {}
        kit_wells = set()

        # Build lookup: Nr (1-based) → material dict
        nr_to_material = {i + 1: m for i, m in enumerate(materials)}

        # Also build name/alias lookup for fallback
        name_lookup = {}
        alias_lookup = {}
        for m in materials:
            n = (m.get('name') or '').strip().lower()
            a = (m.get('alias') or '').strip().lower()
            if n:
                name_lookup[n] = m
            if a:
                alias_lookup[a] = m

        for _, row in design_df.iterrows():
            well_val = row.get('well', row.iloc[0]) if 'well' in design_df.columns else row.iloc[0]
            well = str(well_val).strip() if pd.notna(well_val) else ''
            if not well or well == 'nan':
                continue

            kit_wells.add(well)

            # Read material_nr
            mat_nr = None
            if 'material_nr' in design_df.columns and pd.notna(row.get('material_nr')):
                try:
                    mat_nr = int(float(row['material_nr']))
                except (ValueError, TypeError):
                    mat_nr = None

            # Read alias
            alias_val = ''
            if 'material_alias' in design_df.columns and pd.notna(row.get('material_alias')):
                alias_val = str(row['material_alias']).strip()

            # Read amount
            amt = ''
            if 'amount' in design_df.columns and pd.notna(row.get('amount')):
                amt = str(row['amount']).strip()

            if not amt or amt == 'nan':
                continue

            # Resolve material
            material = None
            if mat_nr and mat_nr in nr_to_material:
                material = nr_to_material[mat_nr]
            elif alias_val:
                alias_lower = alias_val.lower()
                material = alias_lookup.get(alias_lower) or name_lookup.get(alias_lower)

            if material:
                role = (material.get('role', '') or '').lower()
                unit = 'μL' if role == 'solvent' else 'μmol'
                entry = {
                    'name': material.get('name', ''),
                    'alias': material.get('alias', ''),
                    'cas': material.get('cas', ''),
                    'smiles': material.get('smiles', ''),
                    'molecular_weight': material.get('molecular_weight', ''),
                    'barcode': material.get('barcode', ''),
                    'role': material.get('role', ''),
                    'amount': amt,
                    'unit': unit,
                }
                design_data.setdefault(well, []).append(entry)
            else:
                if well in ['A1', 'A12', 'B1', 'B12']:
                    safe_alias = alias_val.encode('ascii', 'replace').decode('ascii')
                    logger.debug(f"DEBUG: Well {well}: material_nr={mat_nr} alias='{safe_alias}' NOT FOUND")
        
        # Apply amount override if provided
        amount_override = request.form.get('amount_override', '').strip()
        if amount_override:
            try:
                override_value = float(amount_override)
                if override_value <= 0:
                    return jsonify({'error': 'Amount override must be a positive number'}), 400
                
                # Replace all amounts in the design with the override value
                for well, materials_list in design_data.items():
                    for material in materials_list:
                        material['amount'] = str(override_value)
                
                logger.debug(f"Applied amount override: {override_value} µmol to all materials")
            except ValueError:
                return jsonify({'error': f'Invalid amount override value: {amount_override}'}), 400
        
        # Determine kit size based on wells that actually have content
        if not design_data:
            return jsonify({'error': 'No wells with materials found in the Design sheet'}), 400
        
        # Use only wells that have materials for kit size calculation
        content_wells = list(design_data.keys())
        
        # Parse well positions to determine kit dimensions
        rows = set()
        cols = set()
        
        for well in content_wells:
            if len(well) >= 2:
                row_letter = well[0]
                col_number = int(well[1:])
                rows.add(row_letter)
                cols.add(col_number)
        
        # For kit size calculation, determine the full range from min to max
        # This accounts for kits that may have empty wells within the range
        if rows and cols:
            min_row = min(rows)
            max_row = max(rows)
            min_col = min(cols)
            max_col = max(cols)
            
            # Calculate the full kit dimensions (min to max range)
            kit_rows = ord(max_row) - ord(min_row) + 1
            kit_cols = max_col - min_col + 1
            total_possible_wells = kit_rows * kit_cols
            
            # Generate all possible wells in the kit range
            all_kit_wells = []
            for row_ord in range(ord(min_row), ord(max_row) + 1):
                for col_num in range(min_col, max_col + 1):
                    well = f"{chr(row_ord)}{col_num}"
                    all_kit_wells.append(well)
        else:
            kit_rows = len(rows)
            kit_cols = len(cols)
            total_possible_wells = len(content_wells)
            all_kit_wells = sorted(list(content_wells))
        
        kit_size = {
            'rows': kit_rows,
            'columns': kit_cols,
            'total_wells': total_possible_wells,
            'content_wells': len(content_wells),
            'row_range': f"{min(rows)}-{max(rows)}" if len(rows) > 1 else min(rows),
            'col_range': f"{min(cols)}-{max(cols)}" if len(cols) > 1 else str(min(cols)),
            'wells': sorted(all_kit_wells)
        }
        
        logger.debug(f"Kit analysis complete: {len(materials)} materials, {len(design_data)} wells with content")
        logger.debug(f"Kit size calculated: rows={kit_rows}, columns={kit_cols}, total_wells={total_possible_wells}")
        logger.debug(f"Content wells with materials: {sorted(content_wells)}")
        logger.debug(f"Full kit range: {min(rows) if rows else 'N/A'}-{max(rows) if rows else 'N/A'} × {min(cols) if cols else 'N/A'}-{max(cols) if cols else 'N/A'}")
        logger.debug(f"All kit wells: {sorted(all_kit_wells)}")
        
        return jsonify({
            'materials': materials,
            'design': design_data,
            'kit_size': kit_size,
            'filename': file.filename
        }), 200
        
    except Exception as e:
        logger.error(f"Unexpected error in kit analysis: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Kit analysis failed: {str(e)}'}), 500

@kit_bp.route('/apply', methods=['POST'])
def apply_kit():
    """Apply kit to experiment with specified positioning"""
    try:
        logger.debug("Kit apply endpoint called")
        
        data = request.json
        materials = data.get('materials', [])
        design = data.get('design', {})
        position = data.get('position', '')
        kit_size = data.get('kit_size', {})
        destination_plate = data.get('destination_plate', '96')
        
        if not materials or not design or not position:
            return jsonify({'error': 'Missing required data: materials, design, or position'}), 400
        
        logger.debug(f"Applying kit with position: {position} on {destination_plate}-well plate")
        
        # Get current experiment data
        current_materials = current_experiment.get('materials', [])
        current_procedure = current_experiment.get('procedure', [])

        # Determine the next kit number by counting existing kits
        # Count materials with role_id starting with "kit_"
        existing_kit_numbers = set()
        for mat in current_materials:
            role_id = mat.get('role_id', '')
            if role_id and role_id.startswith('kit_'):
                # Extract number from kit_XX format
                try:
                    kit_num = int(role_id.split('_')[1])
                    existing_kit_numbers.add(kit_num)
                except (IndexError, ValueError):
                    pass

        # Find next available kit number
        next_kit_num = 1
        while next_kit_num in existing_kit_numbers:
            next_kit_num += 1

        # Format kit ID as kit_01, kit_02, etc.
        kit_id = f"kit_{str(next_kit_num).zfill(2)}"
        logger.debug(f"Assigning kit ID: {kit_id}")

        # ── Step 1: Deduplicate within the kit's own Materials list ─────────────────
        # Two materials in the same kit that share a name or real CAS are treated
        # as duplicates.  We keep the first occurrence and inform the user about any
        # that were dropped.  The Design sheet is NOT affected – the same material can
        # legitimately appear in many wells.
        # NOTE: SMILES alone is NOT used for dedup because different materials can
        # share a SMILES representation.  SMILES-only matches are surfaced as
        # warnings instead (see Step 1b below).
        PLACEHOLDER_CAS = {'na', 'n/a', 'unknown', 'none', ''}

        def is_same_material(a, b):
            if a.get('name') and b.get('name') and a['name'].strip().lower() == b['name'].strip().lower():
                return True
            cas_a = (a.get('cas') or '').strip().lower()
            cas_b = (b.get('cas') or '').strip().lower()
            if cas_a and cas_b and cas_a not in PLACEHOLDER_CAS and cas_b not in PLACEHOLDER_CAS and cas_a == cas_b:
                return True
            return False

        unique_kit_materials = []
        skipped_in_kit = []          # duplicates within the kit file itself
        for material in materials:
            if any(is_same_material(material, seen) for seen in unique_kit_materials):
                label = material.get('alias') or material.get('name', 'Unknown')
                skipped_in_kit.append(label)
                logger.debug(f"Intra-kit duplicate dropped: '{label}' (same name/CAS as an earlier entry)")
            else:
                unique_kit_materials.append(material)

        # ── Step 1b: Detect SMILES-only matches (warn but keep both) ────────────────
        smiles_warnings = []
        for i, mat_a in enumerate(unique_kit_materials):
            smiles_a = (mat_a.get('smiles') or '').strip()
            if not smiles_a:
                continue
            for mat_b in unique_kit_materials[i + 1:]:
                smiles_b = (mat_b.get('smiles') or '').strip()
                if smiles_a == smiles_b:
                    alias_a = mat_a.get('alias') or mat_a.get('name', 'Unknown')
                    alias_b = mat_b.get('alias') or mat_b.get('name', 'Unknown')
                    smiles_warnings.append({
                        'alias_a': alias_a,
                        'alias_b': alias_b,
                        'smiles': smiles_a[:80]
                    })
                    logger.debug(f"SMILES-only match (kept both): '{alias_a}' and '{alias_b}'")

        # ── Step 2: Check deduplicated kit list against pre-existing experiment materials
        added_materials = []
        skipped_already_in_experiment = []  # already present before this kit upload

        for material in unique_kit_materials:
            already_present = any(
                is_same_material(material, existing)
                for existing in current_materials
            )
            if already_present:
                label = material.get('alias') or material.get('name', 'Unknown')
                skipped_already_in_experiment.append(label)
            else:
                # Assign Reagent role and kit_XX role_id to all materials from this kit
                material['role'] = 'Reagent'
                material['role_id'] = kit_id
                added_materials.append(material)
                current_materials.append(material)

        # Combined list for backward-compat response field
        all_skipped = skipped_in_kit + skipped_already_in_experiment

        # Update design materials with kit_id before applying to procedure
        for well, well_materials in design.items():
            for mat in well_materials:
                mat['role_id'] = kit_id

        # Apply design to procedure based on position
        new_procedure_data = apply_kit_design_to_procedure(design, position, kit_size, current_procedure, destination_plate)
        
        # Update experiment
        current_experiment['materials'] = current_materials
        current_experiment['procedure'] = new_procedure_data
        
        return jsonify({
            'message': f'Kit applied successfully with ID: {kit_id}',
            'kit_id': kit_id,
            'added_materials': len(added_materials),
            'skipped_materials': len(all_skipped),
            'skipped_in_kit': skipped_in_kit,
            'skipped_already_in_experiment': skipped_already_in_experiment,
            'smiles_warnings': smiles_warnings,
            'procedure_wells_updated': len([w for w in new_procedure_data if any(m.get('source') == 'kit_upload' for m in w.get('materials', []))])
        }), 200
        
    except Exception as e:
        logger.error(f"Unexpected error in kit application: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Kit application failed: {str(e)}'}), 500
