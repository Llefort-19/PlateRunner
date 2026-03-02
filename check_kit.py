
import pandas as pd

xl = pd.ExcelFile(r'c:/Cursor/HTE App/MonoPhosphine kit 2umol.xlsx')
df = pd.read_excel(xl, sheet_name='Materials')
print('Total rows:', len(df))
print('Columns:', list(df.columns))

# Check which rows pass the backend filter (iloc[0] not NaN and not empty)
# iloc[0] is 'Nr' column
passed_first_filter = df[~(df.iloc[:, 0].isna() | (df.iloc[:, 0].astype(str).str.strip() == ''))]
print('Rows passing first filter (Nr not empty):', len(passed_first_filter))

# Now simulate the clean_field logic and name/alias check
def clean_field(value):
    if pd.isna(value):
        return ''
    str_value = str(value).strip()
    if str_value.lower() in ['nan', 'null', 'none', '']:
        return ''
    return str_value

count_added = 0
count_skipped = 0
skipped_rows = []

for index, row in df.iterrows():
    if pd.isna(row.iloc[0]) or str(row.iloc[0]).strip() == '':
        continue

    name = clean_field(row.get('chemical_name', row.get('Chemical_Name', row.get('Name', row.iloc[1] if len(row) > 1 else ''))))
    alias = clean_field(row.get('alias', row.get('Alias', '')))

    if (name and name != 'nan') or (alias and alias != 'nan'):
        count_added += 1
    else:
        count_skipped += 1
        skipped_rows.append({'index': index, 'Nr': row.iloc[0], 'name': name, 'alias': alias})

print(f'Would be added: {count_added}')
print(f'Would be skipped: {count_skipped}')
if skipped_rows:
    print('Skipped rows:')
    for r in skipped_rows:
        print(f"  Index={r['index']}, Nr={r['Nr']}, name='{r['name']}', alias='{r['alias']}'")

# Check isMaterialDuplicate logic -- does any row have same name, alias, or CAS as another?
names = [clean_field(row.get('chemical_name', '')) for _, row in df.iterrows() if not pd.isna(row.iloc[0])]
aliases = [clean_field(row.get('alias', '')) for _, row in df.iterrows() if not pd.isna(row.iloc[0])]
print('\nDuplicate names:', [n for n in names if n and names.count(n) > 1])
print('Duplicate aliases:', [a for a in aliases if a and aliases.count(a) > 1])
