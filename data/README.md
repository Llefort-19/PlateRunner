# HTE App Data Folder

This folder contains the Excel data files used by the HTE App.

## Required Files

Place the following Excel files in this folder:

### 1. `Inventory.xlsx` (Required)
The main chemical inventory database. This file should contain columns:
- chemical_name
- alias
- cas_number
- molecular_weight
- smiles
- barcode

### 2. `Private_Inventory.xlsx` (Optional)
Your private/custom chemical inventory. The app will create this file automatically when you add chemicals to your private inventory.

Required columns (same as main inventory):
- chemical_name
- alias
- cas_number
- molecular_weight
- smiles
- barcode

### 3. `Solvent.xlsx` (Required for solvent features)
The solvent database. Required columns:
- Name
- Alias
- CAS Number
- Molecular_weight
- SMILES
- Boiling point
- Chemical Class
- Density (g/mL)
- Tier

## Notes

- The app will NOT work properly without at least `Inventory.xlsx`
- File names are case-sensitive on some systems
- If files are missing, the app will display a warning on startup
