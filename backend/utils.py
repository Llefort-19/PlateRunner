# Standard library imports
import io
import base64
import re
from datetime import datetime

# Third-party imports
import pandas as pd
from PIL import Image

# Chemical informatics imports
try:
    from rdkit import Chem
    from rdkit.Chem import Draw, AllChem
    RDKIT_AVAILABLE = True
except ImportError:
    print("Warning: RDKit not available. Molecule rendering will be disabled.")
    RDKIT_AVAILABLE = False

def image_to_base64(img_or_bytes):
    """Convert PIL.Image or PNG bytes to base64 string."""
    try:
        if hasattr(img_or_bytes, 'save'):
            buffer = io.BytesIO()
            img_or_bytes.save(buffer, format='PNG')
            img_bytes = buffer.getvalue()
        else:
            img_bytes = img_or_bytes
        return base64.b64encode(img_bytes).decode()
    except Exception as e:
        print(f"[image_to_base64] Error: {e}")
        return None

def blank_png_base64(size=(300, 300)):
    """Generate a blank PNG image as base64 string."""
    img = Image.new("RGBA", size, (255, 255, 255, 0))
    return image_to_base64(img)

def normalize_2d_coordinates(mol):
    """Normalize 2D coordinates for consistent rendering."""
    if not RDKIT_AVAILABLE:
        return mol
    
    try:
        AllChem.Compute2DCoords(mol)
        return mol
    except Exception as e:
        print(f"[normalize_2d_coordinates] Error: {e}")
        return mol

def prepare_molecule(smiles_string):
    """Prepare molecule from SMILES string."""
    if not RDKIT_AVAILABLE:
        return None
    
    try:
        mol = Chem.MolFromSmiles(smiles_string.strip())
        if mol is None:
            print(f"[prepare_molecule] Invalid SMILES: {smiles_string}")
            return None
        
        mol = normalize_2d_coordinates(mol)
        return mol
    except Exception as e:
        print(f"[prepare_molecule] Error: {e}")
        return None

def render_molecule_png(mol, image_size=(300, 300)):
    """Render molecule as PNG bytes using RDKit's built-in PIL renderer."""
    if not RDKIT_AVAILABLE or mol is None:
        return None
    
    try:
        # Use RDKit's PIL-based PNG drawer (no cairosvg needed)
        img = Draw.MolToImage(mol, size=image_size)
        
        # Convert PIL image to PNG bytes
        img_buffer = io.BytesIO()
        img.save(img_buffer, format='PNG')
        png_bytes = img_buffer.getvalue()
        
        return png_bytes
    except Exception as e:
        print(f"[render_molecule_png] Error: {e}")
        return None

def generate_molecule_image(smiles_string, image_size=(300, 300)):
    """
    Generate a 2D molecule image from a SMILES string.
    Returns: base64 encoded PNG image or None if error.
    """
    if not RDKIT_AVAILABLE:
        print("[generate_molecule_image] RDKit not available")
        return blank_png_base64(image_size)
    
    try:
        mol = prepare_molecule(smiles_string)
        if mol is None:
            print(f"[generate_molecule_image] Could not prepare molecule from: {smiles_string}")
            return blank_png_base64(image_size)
        
        png_bytes = render_molecule_png(mol, image_size)
        if png_bytes:
            return image_to_base64(png_bytes)
        else:
            print(f"[generate_molecule_image] Could not render PNG for: {smiles_string}")
            return blank_png_base64(image_size)
    except Exception as e:
        print(f"[generate_molecule_image] Error with {smiles_string}: {e}")
        return blank_png_base64(image_size)

def parse_sdf_file(sdf_content):
    """
    Parse SDF file content and extract molecules with images.
    
    Args:
        sdf_content (str): The content of the SDF file
    
    Returns:
        list: List of molecule dictionaries with name, smiles, and image
    """
    if not RDKIT_AVAILABLE:
        print("[parse_sdf_file] RDKit not available")
        return []
    
    molecules = []
    
    try:
        print(f"[parse_sdf_file] Processing SDF content, length: {len(sdf_content)}")
        
        # Use RDKit to parse SDF
        mol_supplier = Chem.SDMolSupplier()
        mol_supplier.SetData(sdf_content)
        
        for i, mol in enumerate(mol_supplier):
            if mol is None:
                print(f"[parse_sdf_file] Skipping invalid molecule at index {i}")
                continue
            
            try:
                # Get molecule name from SDF properties or generate one
                mol_name = mol.GetProp('_Name') if mol.HasProp('_Name') else f"Molecule_{i+1}"
                
                # Generate SMILES
                smiles = Chem.MolToSmiles(mol)
                
                # Generate molecule image
                image_size = (200, 200)  # Smaller size for table display
                mol_2d = normalize_2d_coordinates(mol)
                png_bytes = render_molecule_png(mol_2d, image_size)
                
                image_base64 = None
                if png_bytes:
                    image_base64 = image_to_base64(png_bytes)
                
                molecule_data = {
                    'name': mol_name,
                    'smiles': smiles,
                    'image': image_base64,
                    'role': ''  # Will be set by user
                }
                
                molecules.append(molecule_data)
                print(f"[parse_sdf_file] Processed molecule {i+1}: {mol_name}")
                
            except Exception as e:
                print(f"[parse_sdf_file] Error processing molecule {i+1}: {e}")
                continue
        
        print(f"[parse_sdf_file] Successfully processed {len(molecules)} molecules")
        return molecules
        
    except Exception as e:
        print(f"[parse_sdf_file] Error parsing SDF: {e}")
        return []

def apply_kit_design_to_procedure(design, position, kit_size, current_procedure, destination_plate='96'):
    """Apply kit design to procedure data with position mapping"""
    
    # Create a dictionary for easier lookup of existing procedure data
    procedure_dict = {item['well']: item for item in current_procedure}
    
    # Calculate position mappings based on position parameter
    well_mappings = calculate_well_mappings(position, kit_size, destination_plate)
    
    # Apply design to mapped wells
    for kit_well, materials in design.items():
        if kit_well in well_mappings:
            target_wells = well_mappings[kit_well]
            
            for target_well in target_wells:
                # Get or create procedure entry for target well
                if target_well not in procedure_dict:
                    procedure_dict[target_well] = {
                        'well': target_well,
                        'materials': []
                    }
                
                # Add materials to the well
                for material in materials:
                    # Mark materials as coming from kit
                    kit_material = material.copy()
                    kit_material['source'] = 'kit_upload'
                    
                    # Check if this material already exists in this well
                    existing_material = next(
                        (m for m in procedure_dict[target_well]['materials'] 
                         if m.get('name') == kit_material.get('name')),
                        None
                    )
                    
                    if existing_material:
                        # Add amounts if material already exists
                        try:
                            existing_amount = float(existing_material.get('amount', 0))
                            new_amount = float(kit_material.get('amount', 0))
                            existing_material['amount'] = str(existing_amount + new_amount)
                        except:
                            existing_material['amount'] = kit_material.get('amount', '0')
                    else:
                        # Add new material to well
                        procedure_dict[target_well]['materials'].append(kit_material)
    
    # Convert back to list format
    return list(procedure_dict.values())

def calculate_well_mappings(position, kit_size, destination_plate='96'):
    """Calculate well mappings based on position and kit size"""
    kit_wells = kit_size.get('wells', [])
    mappings = {}
    
    print(f"Calculating well mappings for position: {position}")
    print(f"Destination plate: {destination_plate}")
    print(f"Kit size: {kit_size}")
    print(f"Kit wells: {kit_wells}")
    
    if not kit_wells:
        return mappings
    
    # Handle new flexible positioning format
    if isinstance(position, dict):
        return calculate_flexible_well_mappings(position, kit_size, destination_plate)
    
    # Parse kit wells to understand the layout
    kit_rows = set()
    kit_cols = set()
    
    for well in kit_wells:
        if len(well) >= 2:
            row_letter = well[0]
            col_number = int(well[1:])
            kit_rows.add(row_letter)
            kit_cols.add(col_number)
    
    kit_rows = sorted(list(kit_rows))
    kit_cols = sorted(list(kit_cols))
    
    print(f"Parsed kit rows: {kit_rows}")
    print(f"Parsed kit cols: {kit_cols}")
    
    # Handle different position types
    if position == "top-left":
        # Map to A1-D6 region
        for well in kit_wells:
            row_letter = well[0]
            col_number = int(well[1:])
            
            # Calculate offset within kit
            row_offset = kit_rows.index(row_letter)
            col_offset = kit_cols.index(col_number)
            
            # Map to target position
            target_row = chr(ord('A') + row_offset)
            target_col = 1 + col_offset
            
            mappings[well] = [f"{target_row}{target_col}"]
    
    elif position == "top-right":
        # Map to A7-D12 region
        for well in kit_wells:
            row_letter = well[0]
            col_number = int(well[1:])
            
            row_offset = kit_rows.index(row_letter)
            col_offset = kit_cols.index(col_number)
            
            target_row = chr(ord('A') + row_offset)
            target_col = 7 + col_offset
            
            mappings[well] = [f"{target_row}{target_col}"]
    
    elif position == "bottom-left":
        # Map to E1-H6 region
        for well in kit_wells:
            row_letter = well[0]
            col_number = int(well[1:])
            
            row_offset = kit_rows.index(row_letter)
            col_offset = kit_cols.index(col_number)
            
            target_row = chr(ord('E') + row_offset)
            target_col = 1 + col_offset
            
            mappings[well] = [f"{target_row}{target_col}"]
    
    elif position == "bottom-right":
        # Map to E7-H12 region
        for well in kit_wells:
            row_letter = well[0]
            col_number = int(well[1:])
            
            row_offset = kit_rows.index(row_letter)
            col_offset = kit_cols.index(col_number)
            
            target_row = chr(ord('E') + row_offset)
            target_col = 7 + col_offset
            
            mappings[well] = [f"{target_row}{target_col}"]
    
    elif position == "all-quadrants":
        # Map to all 4 quadrants
        for well in kit_wells:
            row_letter = well[0]
            col_number = int(well[1:])
            
            row_offset = kit_rows.index(row_letter)
            col_offset = kit_cols.index(col_number)
            
            target_wells = []
            # Top-left
            target_wells.append(f"{chr(ord('A') + row_offset)}{1 + col_offset}")
            # Top-right
            target_wells.append(f"{chr(ord('A') + row_offset)}{7 + col_offset}")
            # Bottom-left
            target_wells.append(f"{chr(ord('E') + row_offset)}{1 + col_offset}")
            # Bottom-right
            target_wells.append(f"{chr(ord('E') + row_offset)}{7 + col_offset}")
            
            mappings[well] = target_wells
    
    elif position.startswith("row-"):
        # Full row positioning
        target_row = position.split("-")[1]
        print(f"Row positioning: target_row = {target_row}")
        
        for well in kit_wells:
            # Extract column number from well (e.g., "A1" -> 1, "A12" -> 12)
            col_number = int(well[1:])
            # Find the position of this column in the sorted kit columns
            col_offset = kit_cols.index(col_number)
            # Map to the target position starting from column 1
            target_col = 1 + col_offset
            print(f"Mapping well {well} (col {col_number}, offset {col_offset}) -> {target_row}{target_col}")
            mappings[well] = [f"{target_row}{target_col}"]
    
    elif position.startswith("col-"):
        # Full column positioning
        target_col = int(position.split("-")[1])
        for well in kit_wells:
            row_letter = well[0]
            row_offset = kit_rows.index(row_letter)
            target_row = chr(ord('A') + row_offset)
            mappings[well] = [f"{target_row}{target_col}"]
    
    elif position == "top-quadrants":
        # Map to top 2 quadrants (A1-D6 and A7-D12)
        for well in kit_wells:
            row_letter = well[0]
            col_number = int(well[1:])
            
            row_offset = kit_rows.index(row_letter)
            col_offset = kit_cols.index(col_number)
            
            target_wells = []
            # Top-left
            target_wells.append(f"{chr(ord('A') + row_offset)}{1 + col_offset}")
            # Top-right
            target_wells.append(f"{chr(ord('A') + row_offset)}{7 + col_offset}")
            
            mappings[well] = target_wells
    
    elif position == "bottom-quadrants":
        # Map to bottom 2 quadrants (E1-H6 and E7-H12)
        for well in kit_wells:
            row_letter = well[0]
            col_number = int(well[1:])
            
            row_offset = kit_rows.index(row_letter)
            col_offset = kit_cols.index(col_number)
            
            target_wells = []
            # Bottom-left
            target_wells.append(f"{chr(ord('E') + row_offset)}{1 + col_offset}")
            # Bottom-right
            target_wells.append(f"{chr(ord('E') + row_offset)}{7 + col_offset}")
            
            mappings[well] = target_wells
    
    elif position == "left-quadrants":
        # Map to left 2 quadrants (A1-D6 and E1-H6)
        for well in kit_wells:
            row_letter = well[0]
            col_number = int(well[1:])
            
            row_offset = kit_rows.index(row_letter)
            col_offset = kit_cols.index(col_number)
            
            target_wells = []
            # Top-left
            target_wells.append(f"{chr(ord('A') + row_offset)}{1 + col_offset}")
            # Bottom-left
            target_wells.append(f"{chr(ord('E') + row_offset)}{1 + col_offset}")
            
            mappings[well] = target_wells
    
    elif position == "right-quadrants":
        # Map to right 2 quadrants (A7-D12 and E7-H12)
        for well in kit_wells:
            row_letter = well[0]
            col_number = int(well[1:])
            
            row_offset = kit_rows.index(row_letter)
            col_offset = kit_cols.index(col_number)
            
            target_wells = []
            # Top-right
            target_wells.append(f"{chr(ord('A') + row_offset)}{7 + col_offset}")
            # Bottom-right
            target_wells.append(f"{chr(ord('E') + row_offset)}{7 + col_offset}")
            
            mappings[well] = target_wells
    
    elif position.startswith("rows-"):
        # Multiple row positioning (e.g., "rows-A-D")
        parts = position.split("-")
        if len(parts) >= 3:
            start_row = parts[1]
            end_row = parts[2]
            start_row_idx = ord(start_row) - ord('A')
            
            for well in kit_wells:
                row_letter = well[0]
                col_number = int(well[1:])
                
                row_offset = kit_rows.index(row_letter)
                col_offset = kit_cols.index(col_number)
                
                target_row = chr(ord('A') + start_row_idx + row_offset)
                target_col = 1 + col_offset
                
                mappings[well] = [f"{target_row}{target_col}"]
    
    elif position.startswith("cols-"):
        # Multiple column positioning (e.g., "cols-1-6")
        parts = position.split("-")
        if len(parts) >= 3:
            start_col = int(parts[1])
            
            for well in kit_wells:
                row_letter = well[0]
                col_number = int(well[1:])
                
                row_offset = kit_rows.index(row_letter)
                col_offset = kit_cols.index(col_number)
                
                target_row = chr(ord('A') + row_offset)
                target_col = start_col + col_offset
                
                mappings[well] = [f"{target_row}{target_col}"]
    
    print(f"Final mappings: {mappings}")
    return mappings

def calculate_flexible_well_mappings(position_data, kit_size, destination_plate='96'):
    """Calculate well mappings for the new flexible positioning system"""
    kit_wells = kit_size.get('wells', [])
    mappings = {}
    
    if not kit_wells:
        return mappings
    
    strategy = position_data.get('strategy', 'exact_placement')
    positions = position_data.get('positions', [])
    kit_rows = position_data.get('kit_size', {}).get('rows', 1)
    kit_cols = position_data.get('kit_size', {}).get('cols', 1)
    
    print(f"Flexible positioning - Strategy: {strategy}")
    print(f"Positions: {positions}")
    print(f"Kit dimensions: {kit_rows}x{kit_cols}")
    
    # Get destination plate config
    plate_configs = {
        '24': {'rows': 4, 'cols': 6},
        '48': {'rows': 6, 'cols': 8}, 
        '96': {'rows': 8, 'cols': 12}
    }
    plate_config = plate_configs.get(destination_plate, plate_configs['96'])
    
    if strategy == 'exact_placement':
        # Kit matches plate exactly or default A1 placement
        start_row = 'A'
        start_col = 1
        
        for well in kit_wells:
            if len(well) >= 2:
                kit_row_letter = well[0]
                kit_col_number = int(well[1:])
                
                # Calculate offset from kit origin
                kit_row_offset = ord(kit_row_letter) - ord('A')
                kit_col_offset = kit_col_number - 1
                
                # Map to destination
                dest_row = chr(ord(start_row) + kit_row_offset)
                dest_col = start_col + kit_col_offset
                
                if dest_row <= chr(ord('A') + plate_config['rows'] - 1) and dest_col <= plate_config['cols']:
                    mappings[well] = [f"{dest_row}{dest_col}"]
    
    elif strategy == 'row_placement':
        # Map kit to specific rows
        for position_id in positions:
            if position_id.startswith('row-'):
                target_start_row = position_id.split('-')[1]
                
                for well in kit_wells:
                    if len(well) >= 2:
                        kit_row_letter = well[0]
                        kit_col_number = int(well[1:])
                        
                        # Calculate kit row offset from kit's starting row
                        kit_row_offset = ord(kit_row_letter) - ord('A')
                        
                        # Map to destination starting from target_start_row
                        dest_row = chr(ord(target_start_row) + kit_row_offset)
                        dest_col = kit_col_number
                        
                        if ord(dest_row) <= ord('A') + plate_config['rows'] - 1 and dest_col <= plate_config['cols']:
                            if well not in mappings:
                                mappings[well] = []
                            mappings[well].append(f"{dest_row}{dest_col}")
    
    elif strategy == 'col_placement':
        # Map kit to specific columns
        for position_id in positions:
            if position_id.startswith('col-'):
                target_start_col = int(position_id.split('-')[1])
                
                for well in kit_wells:
                    if len(well) >= 2:
                        kit_row_letter = well[0]
                        kit_col_number = int(well[1:])
                        
                        # Calculate kit column offset from kit's starting column
                        kit_col_offset = kit_col_number - 1
                        
                        # Map to destination starting from target_start_col
                        dest_row = kit_row_letter
                        dest_col = target_start_col + kit_col_offset
                        
                        if ord(dest_row) <= ord('A') + plate_config['rows'] - 1 and dest_col <= plate_config['cols']:
                            if well not in mappings:
                                mappings[well] = []
                            mappings[well].append(f"{dest_row}{dest_col}")
    
    elif strategy == 'quadrant_placement':
        # Map kit to specific quadrants (adjust based on destination plate)
        if destination_plate == '48':
            # 48-well plate (6x8) - 4x6 kit can fit in two positions
            quadrant_offsets = {
                'top-left': (0, 0),      # A1 starting position (A1-D6)
                'top-right': (2, 0),     # C1 starting position (C1-F6) - shifted down 2 rows
            }
        else:  # 96-well plate
            quadrant_offsets = {
                'top-left': (0, 0),      # A1 starting position
                'top-right': (0, 6),     # A7 starting position  
                'bottom-left': (4, 0),   # E1 starting position
                'bottom-right': (4, 6)   # E7 starting position
            }
        
        for position_id in positions:
            if position_id in quadrant_offsets:
                row_offset, col_offset = quadrant_offsets[position_id]
                
                for well in kit_wells:
                    if len(well) >= 2:
                        kit_row_letter = well[0]
                        kit_col_number = int(well[1:])
                        
                        # Calculate offset from kit origin
                        kit_row_offset = ord(kit_row_letter) - ord('A')
                        kit_col_offset = kit_col_number - 1
                        
                        # Map to destination quadrant
                        dest_row = chr(ord('A') + row_offset + kit_row_offset)
                        dest_col = 1 + col_offset + kit_col_offset
                        
                        if ord(dest_row) <= ord('A') + plate_config['rows'] - 1 and dest_col <= plate_config['cols']:
                            if well not in mappings:
                                mappings[well] = []
                            mappings[well].append(f"{dest_row}{dest_col}")
    
    elif strategy == 'row_pair_placement':
        # Map kit to specific row pairs (for 2x12 kits)
        row_pair_offsets = {
            'AB': 0,  # Start at row A
            'CD': 2,  # Start at row C  
            'EF': 4,  # Start at row E
            'GH': 6   # Start at row G
        }
        
        for position_id in positions:
            if position_id in row_pair_offsets:
                row_offset = row_pair_offsets[position_id]
                
                for well in kit_wells:
                    if len(well) >= 2:
                        kit_row_letter = well[0]
                        kit_col_number = int(well[1:])
                        
                        # Calculate offset from kit origin
                        kit_row_offset = ord(kit_row_letter) - ord('A')
                        
                        # Map to destination row pair
                        dest_row = chr(ord('A') + row_offset + kit_row_offset)
                        dest_col = kit_col_number
                        
                        if ord(dest_row) <= ord('A') + plate_config['rows'] - 1 and dest_col <= plate_config['cols']:
                            if well not in mappings:
                                mappings[well] = []
                            mappings[well].append(f"{dest_row}{dest_col}")
    
    elif strategy == 'half_placement':
        # Map kit to upper or lower half (for 4x12 kits)
        half_offsets = {
            'upper': 0,  # Start at row A
            'lower': 4   # Start at row E
        }
        
        for position_id in positions:
            if position_id in half_offsets:
                row_offset = half_offsets[position_id]
                
                for well in kit_wells:
                    if len(well) >= 2:
                        kit_row_letter = well[0]
                        kit_col_number = int(well[1:])
                        
                        # Calculate offset from kit origin
                        kit_row_offset = ord(kit_row_letter) - ord('A')
                        
                        # Map to destination half
                        dest_row = chr(ord('A') + row_offset + kit_row_offset)
                        dest_col = kit_col_number
                        
                        if ord(dest_row) <= ord('A') + plate_config['rows'] - 1 and dest_col <= plate_config['cols']:
                            if well not in mappings:
                                mappings[well] = []
                            mappings[well].append(f"{dest_row}{dest_col}")

    elif strategy == 'block_placement':
        # Map kit to specific blocks/quadrants
        blocks = position_data.get('blocks', [])
        
        for block in blocks:
            start_row = block.get('startRow', 'A')
            start_col = block.get('startCol', 1)
            
            for well in kit_wells:
                if len(well) >= 2:
                    kit_row_letter = well[0]
                    kit_col_number = int(well[1:])
                    
                    # Calculate offset from kit origin
                    kit_row_offset = ord(kit_row_letter) - ord('A')
                    kit_col_offset = kit_col_number - 1
                    
                    # Map to destination block
                    dest_row = chr(ord(start_row) + kit_row_offset)
                    dest_col = start_col + kit_col_offset
                    
                    if ord(dest_row) <= ord('A') + plate_config['rows'] - 1 and dest_col <= plate_config['cols']:
                        if well not in mappings:
                            mappings[well] = []
                        mappings[well].append(f"{dest_row}{dest_col}")
    
    print(f"Flexible mappings result: {mappings}")
    return mappings
