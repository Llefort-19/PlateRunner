
import pandas as pd

xl = pd.ExcelFile(r'c:/Cursor/HTE App/MonoPhosphine kit 2umol.xlsx')
df = pd.read_excel(xl, sheet_name='Materials')

def clean_field(value):
    if pd.isna(value):
        return ''
    str_value = str(value).strip()
    if str_value.lower() in ['nan', 'null', 'none', '']:
        return ''
    return str_value

# Simulate the kit apply duplicate check
current_materials = []
added = []
skipped = []

for _, row in df.iterrows():
    if pd.isna(row.iloc[0]) or str(row.iloc[0]).strip() == '':
        continue

    material = {
        'name': clean_field(row.get('chemical_name', '')),
        'alias': clean_field(row.get('alias', '')),
        'cas': clean_field(row.get('cas_number', '')),
        'smiles': clean_field(row.get('smiles', '')),
    }

    if not ((material.get('name') and material.get('name') != 'nan') or 
            (material.get('alias') and material.get('alias') != 'nan')):
        print(f"Skipped in analyze: {material}")
        continue

    # Check for duplicate as done in kit/apply
    is_duplicate = any(
        (existing.get('name') and material.get('name') and existing.get('name') == material.get('name')) or
        (existing.get('cas') and material.get('cas') and existing.get('cas') == material.get('cas')) or
        (existing.get('smiles') and material.get('smiles') and existing.get('smiles') == material.get('smiles'))
        for existing in current_materials
    )

    if is_duplicate:
        # Find which existing material caused the duplicate
        for existing in current_materials:
            if (existing.get('name') and material.get('name') and existing.get('name') == material.get('name')):
                print(f"DUPE by name: Nr={row.iloc[0]} '{material['name']}' == '{existing['name']}'")
            if (existing.get('cas') and material.get('cas') and existing.get('cas') == material.get('cas')):
                print(f"DUPE by CAS: Nr={row.iloc[0]} '{material['cas']}' == '{existing['cas']}'")
            if (existing.get('smiles') and material.get('smiles') and existing.get('smiles') == material.get('smiles')):
                print(f"DUPE by SMILES: Nr={row.iloc[0]} '{material['smiles'][:30]}...' == '{existing['smiles'][:30]}...'")
        skipped.append(material)
    else:
        added.append(material)
        current_materials.append(material)

print(f"\nWould be added: {len(added)}")
print(f"Would be skipped as duplicate: {len(skipped)}")

# Also check CAS numbers for leading/special chars
print("\n--- First few CAS numbers ---")
for _, row in df.head(5).iterrows():
    cas = row.get('cas_number', '')
    print(f"Nr {row.iloc[0]}: CAS raw bytes = {repr(str(cas))}")
