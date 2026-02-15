"""Test PDF generation with new 3-part layout."""
import sys
import os
import io
import importlib
sys.path.insert(0, os.path.dirname(__file__))

from xhtml2pdf import pisa

test_protocol = {
    'plate_type': '96',
    'context': {'eln': 'TEST-001', 'author': 'Test User', 'date': '2026-02-14'},
    'materials': [
        {
            'name': 'DtBuPB.HBF4',
            'alias': 'DtBuPB',
            'molecular_weight': 450.2,
            'dispensing_method': 'stock',
            'stock_solution': {
                'solvent_name': 'Toluene',
                'amount_per_well_value': 10,
                'amount_per_well_unit': 'uL',
                'excess': 10,
                'concentration_value': 1.0,
                'concentration_unit': 'M',
                'total_volume_value': 0.132,
                'total_volume_unit': 'mL'
            },
            'well_amounts': {
                'A1': {'value': 10}, 'A2': {'value': 10}, 'A3': {'value': 10},
                'A4': {'value': 10}, 'A5': {'value': 10}, 'A6': {'value': 10},
            },
            'calculated_mass_value': 68.9
        }
    ],
    'operations': [
        {'type': 'dispense', 'materialIndex': 0},
        {'type': 'wait', 'duration': 5, 'unit': 'min'},
    ]
}

try:
    # Force reload of module to get latest changes
    from routes import pdf_export
    importlib.reload(pdf_export)

    print(f"[OK] Testing new 3-part PDF layout")
    print(f"[OK] Protocol has {len(test_protocol['materials'])} materials, {len(test_protocol['operations'])} operations")

    # Use the main export function which implements 3-part layout
    plate_cfg = pdf_export._get_plate_config('96')
    context = test_protocol['context']
    materials = test_protocol['materials']
    operations = test_protocol['operations']

    # Build HTML using the 3-part format
    html_parts = [pdf_export._build_head(), '<body>']
    html_parts.append(pdf_export._build_header(context, '96'))

    # Part 1: Compact stock table
    stock_mats = [m for m in materials if m.get('dispensing_method') == 'stock']
    if stock_mats:
        html_parts.append(pdf_export._build_compact_stock_table(stock_mats))
        print(f"[OK] Part 1: Compact stock table built ({len(stock_mats)} materials)")

    # Part 2: Master checklist
    html_parts.append(pdf_export._build_master_checklist(operations, materials))
    print(f"[OK] Part 2: Master checklist built ({len(operations)} steps)")

    # Part 3: Plate maps section
    html_parts.append(pdf_export._build_plate_maps_section(operations, materials, plate_cfg))
    dispense_count = len([op for op in operations if op.get('type') == 'dispense'])
    print(f"[OK] Part 3: Plate maps section built ({dispense_count} maps)")

    html_parts.append('</body></html>')
    html_string = '\n'.join(html_parts)

    # Convert to PDF
    pdf_buffer = io.BytesIO()
    pisa_status = pisa.CreatePDF(io.StringIO(html_string), dest=pdf_buffer)

    if pisa_status.err:
        print(f"[FAIL] PDF generation failed with {pisa_status.err} errors")
    else:
        pdf_size = len(pdf_buffer.getvalue())
        print(f"[OK] PDF generated successfully ({pdf_size:,} bytes)")

        # Save to test output file
        with open('test_output.pdf', 'wb') as f:
            f.write(pdf_buffer.getvalue())
        print(f"[OK] PDF saved to test_output.pdf")

        print("\n[SUCCESS] New 3-part PDF layout test PASSED!")

except Exception as e:
    import traceback
    print(f"\n[ERROR] {e}")
    traceback.print_exc()
