import React, { useState, useEffect } from "react";
import { useToast } from "./ToastContext";
import axios from 'axios';

const Header = ({ activeTab, onTabChange, onReset, onShowHelp }) => {
  const { showSuccess, showError } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedImportFile, setSelectedImportFile] = useState(null);
  const [isPortableMode, setIsPortableMode] = useState(false);
  const [showShutdownConfirm, setShowShutdownConfirm] = useState(false);
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  const [experimentContext, setExperimentContext] = useState({ eln: '', project: '' });

  // Check server status and load experiment context on mount
  useEffect(() => {
    const initializeHeader = async () => {
      try {
        // Check server status
        const serverResponse = await axios.get('/api/server/status');
        setIsPortableMode(serverResponse.data.shutdown_available);
      } catch (error) {
        setIsPortableMode(false);
      }

      try {
        // Fetch experiment context for header display
        const contextResponse = await axios.get('/api/experiment/context');
        setExperimentContext({
          eln: contextResponse.data.eln || '',
          project: contextResponse.data.project || ''
        });
      } catch (error) {
        console.log('Could not fetch experiment context');
      }
    };
    initializeHeader();

    // Listen for context updates
    const handleContextUpdate = () => {
      axios.get('/api/experiment/context')
        .then(response => {
          setExperimentContext({
            eln: response.data.eln || '',
            project: response.data.project || ''
          });
        })
        .catch(() => { });
    };

    window.addEventListener('experimentContextUpdated', handleContextUpdate);
    return () => window.removeEventListener('experimentContextUpdated', handleContextUpdate);
  }, []);

  const tabs = [
    { id: "context", label: "Experiment Context" },
    { id: "materials", label: "Materials" },
    { id: "procedure", label: "Design" },
    { id: "procedure-settings", label: "Procedure" },
    { id: "analytical", label: "Analytical Data" },
    { id: "results", label: "Results" },
    { id: "heatmap", label: "Heatmap" },
  ];

  const handleReset = async () => {
    if (window.confirm("Are you sure you want to reset all experiment data? This action cannot be undone.")) {
      try {
        await onReset();
        showSuccess("Experiment data has been reset successfully!");
      } catch (error) {
        showError("Error resetting experiment data: " + error.message);
      }
    }
  };

  const handleHelp = () => {
    onShowHelp(activeTab);
  };

  const handleShutdown = async () => {
    setIsShuttingDown(true);
    try {
      await axios.post('/api/server/shutdown');
      // Show success message briefly before server shuts down
      showSuccess("Server is shutting down. You can close this browser tab.");
      setShowShutdownConfirm(false);
    } catch (error) {
      if (error.response?.status === 403) {
        showError("Shutdown is only available when running as a portable app.");
      } else {
        showError("Failed to shutdown server: " + error.message);
      }
      setIsShuttingDown(false);
    }
  };

  const handleImportClick = () => {
    setShowImportModal(true);
  };

  const handleImportFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImportFile(file);
    }
  };

  const handleImportExperiment = async () => {
    if (!selectedImportFile) {
      showError("Please select a file first");
      return;
    }

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedImportFile);

      const response = await axios.post('/api/experiment/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      showSuccess(response.data.message);
      setShowImportModal(false);
      setSelectedImportFile(null);

      // Clear the file input
      const fileInput = document.getElementById('import-file-input');
      if (fileInput) {
        fileInput.value = '';
      }

      // Force page reload to refresh all components with new data
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error("Error importing experiment:", error);
      showError("Error importing experiment: " + (error.response?.data?.error || error.message));
    } finally {
      setIsImporting(false);
    }
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setSelectedImportFile(null);
    // Clear the file input
    const fileInput = document.getElementById('import-file-input');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      // Import XLSX only when needed
      const XLSX = await import('xlsx');

      // Create a new workbook
      const wb = XLSX.utils.book_new();

      // Export Experiment Context
      await exportExperimentContext(wb, XLSX);

      // Export Materials
      await exportMaterials(wb, XLSX);

      // Export Procedure (96-Well Plate)
      await exportProcedure(wb, XLSX);

      // Export Procedure Settings
      await exportProcedureSettings(wb, XLSX);

      // Export Analytical Data
      await exportAnalyticalData(wb, XLSX);

      // Export Heatmap Data
      await exportHeatmapData(wb, XLSX);

      // Add Summary Sheet
      await exportSummarySheet(wb, XLSX);

      // Generate filename based on ELN number or timestamp
      let filename;
      try {
        // Try to get ELN number from context
        const contextResponse = await axios.get('/api/experiment/context');
        const context = contextResponse.data;
        const elnNumber = context.eln;

        if (elnNumber && elnNumber.trim() !== '') {
          // Use ELN number + date (YYYY-MM-DD format)
          const dateOnly = new Date().toISOString().split('T')[0]; // Gets YYYY-MM-DD
          filename = `${elnNumber.trim()}_${dateOnly}.xlsx`;
        } else {
          // Fallback to original timestamp format
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
          filename = `HTE_Experiment_${timestamp}.xlsx`;
        }
      } catch (error) {
        console.warn('Could not fetch ELN number, using timestamp:', error);
        // Fallback to original timestamp format
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        filename = `HTE_Experiment_${timestamp}.xlsx`;
      }

      // Save the workbook
      XLSX.writeFile(wb, filename);

      showSuccess('Excel file exported successfully! Check your downloads folder.');
    } catch (error) {
      console.error('Export error:', error);
      showError('Failed to export Excel file: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const exportExperimentContext = async (wb, XLSX) => {
    try {
      const response = await axios.get('/api/experiment/context');
      const context = response.data;

      const data = [
        ['Experiment Context'],
        [''],
        ['Author', context.author || ''],
        ['Date', context.date || ''],
        ['Project', context.project || ''],
        ['ELN Number', context.eln || ''],
        ['Objective', context.objective || ''],
        [''],
        ['SDF Reaction Data'],
        ['Name', 'Role', 'SMILES']
      ];

      // Add SDF data if available
      const sdfData = localStorage.getItem('experimentSdfData');
      if (sdfData) {
        const parsedSdfData = JSON.parse(sdfData);
        if (parsedSdfData.molecules) {
          parsedSdfData.molecules.forEach((mol, index) => {
            data.push([
              mol.name || `ID-${String(index + 1).padStart(2, '0')}`,
              mol.role || '',
              mol.smiles || ''
            ]);
          });
        }
      }

      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Experiment Context');
    } catch (error) {
      console.error('Error exporting context:', error);
    }
  };

  const exportMaterials = async (wb, XLSX) => {
    try {
      const response = await axios.get('/api/experiment/materials');
      const materials = response.data;

      if (materials && materials.length > 0) {
        const headers = [
          'Nr',
          'chemical_name',
          'alias',
          'cas_number',
          'molecular_weight',
          'smiles',
          'barcode',
          'role',
          'source',
          'supplier'
        ];

        const data = [headers];
        materials.forEach((material, index) => {
          data.push([
            index + 1,
            material.name || '',
            material.alias || '',
            material.cas || '',
            material.molecular_weight || '',
            material.smiles || '',
            material.barcode || '',
            material.role || '',
            material.source || '',
            material.supplier || ''
          ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Materials');
      } else {
        // Create empty sheet with headers
        const headers = [
          'Nr',
          'chemical_name',
          'alias',
          'cas_number',
          'molecular_weight',
          'smiles',
          'barcode',
          'role',
          'source',
          'supplier'
        ];
        const ws = XLSX.utils.aoa_to_sheet([headers]);
        XLSX.utils.book_append_sheet(wb, ws, 'Materials');
      }
    } catch (error) {
      console.error('Error exporting materials:', error);
    }
  };

  // Helper function to create a unique identifier for materials (same as in Procedure.js)
  const getMaterialId = (material) => {
    return `${material.name || ''}_${material.alias || ''}_${material.cas || ''}`;
  };

  const exportProcedure = async (wb, XLSX) => {
    try {
      const [procedureRes, contextRes] = await Promise.all([
        axios.get('/api/experiment/procedure'),
        axios.get('/api/experiment/context')
      ]);

      const procedure = procedureRes.data;
      const context = contextRes.data;

      // Determine plate type based on existing wells
      let rows, columns;

      if (procedure && procedure.length > 0) {
        // Check if we have wells beyond 24-well plate
        const maxRow = Math.max(...procedure.map(p => p.well.charAt(0).charCodeAt(0)));
        const maxCol = Math.max(...procedure.map(p => parseInt(p.well.slice(1))));

        if (maxRow <= 'D'.charCodeAt(0) && maxCol <= 6) {
          rows = ['A', 'B', 'C', 'D'];
          columns = ['1', '2', '3', '4', '5', '6'];
        } else if (maxRow <= 'F'.charCodeAt(0) && maxCol <= 8) {
          rows = ['A', 'B', 'C', 'D', 'E', 'F'];
          columns = ['1', '2', '3', '4', '5', '6', '7', '8'];
        } else {
          rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
          columns = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
        }
      } else {
        // No procedure data, use 96-well as default
        rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        columns = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
      }

      // Generate all wells for the determined plate type
      const wells = [];
      for (let row of rows) {
        for (let col of columns) {
          wells.push(`${row}${col}`);
        }
      }

      // Collect all unique materials across all wells using unique identifiers
      // We need to track: 1) unique materials, 2) which wells they appear in, 3) first appearance order, 4) if solvent
      const allMaterials = new Map(); // Use Map to store both ID and material data
      const materialWellCount = new Map(); // Track how many wells each material appears in
      const materialFirstAppearance = new Map(); // Track the order of first appearance in plate order
      let materialOrder = 0;

      // Helper to check if a material is a solvent
      const isSolvent = (material) => {
        return material.source === 'solvent_database' ||
          (material.role && material.role.toLowerCase().includes('solvent'));
      };

      if (procedure && procedure.length > 0) {
        // Sort procedure by well position to ensure plate order (A1, A2, ..., H12)
        const sortedProcedure = [...procedure].sort((a, b) => {
          const wellA = a.well || '';
          const wellB = b.well || '';
          const rowA = wellA.charAt(0);
          const rowB = wellB.charAt(0);
          const colA = parseInt(wellA.slice(1)) || 0;
          const colB = parseInt(wellB.slice(1)) || 0;

          if (rowA !== rowB) {
            return rowA.localeCompare(rowB);
          }
          return colA - colB;
        });

        // First pass: collect materials and count well appearances
        sortedProcedure.forEach(wellData => {
          if (wellData.materials) {
            const seenInThisWell = new Set(); // Track materials already counted for this well
            wellData.materials.forEach(material => {
              const materialId = getMaterialId(material);
              if (materialId) {
                // Only count each material once per well
                if (!seenInThisWell.has(materialId)) {
                  seenInThisWell.add(materialId);
                  materialWellCount.set(materialId, (materialWellCount.get(materialId) || 0) + 1);
                }

                // Track first appearance and material data
                if (!allMaterials.has(materialId)) {
                  allMaterials.set(materialId, material);
                  materialFirstAppearance.set(materialId, materialOrder++);
                }
              }
            });
          }
        });
      }

      // Separate compounds and solvents
      const compounds = [];
      const solvents = [];

      allMaterials.forEach((material, materialId) => {
        if (isSolvent(material)) {
          solvents.push([materialId, material]);
        } else {
          compounds.push([materialId, material]);
        }
      });

      // Sort compounds by:
      // 1. Number of wells they appear in (DESCENDING) - common materials first (Pd precursor, substrate)
      // 2. First appearance order (ascending) - maintains plate order within same frequency
      compounds.sort(([idA], [idB]) => {
        const countA = materialWellCount.get(idA) || 0;
        const countB = materialWellCount.get(idB) || 0;

        // First sort by well count DESCENDING (common materials first)
        if (countA !== countB) {
          return countB - countA; // Note: DESCENDING order
        }

        // Then by first appearance order (plate order)
        return materialFirstAppearance.get(idA) - materialFirstAppearance.get(idB);
      });

      // Sort solvents by frequency (descending), then first appearance
      solvents.sort(([idA], [idB]) => {
        const countA = materialWellCount.get(idA) || 0;
        const countB = materialWellCount.get(idB) || 0;

        if (countA !== countB) {
          return countB - countA;
        }
        return materialFirstAppearance.get(idA) - materialFirstAppearance.get(idB);
      });

      // Create compound to column mapping
      const materialToCompoundMap = {};
      compounds.forEach(([materialId], index) => {
        materialToCompoundMap[materialId] = { type: 'compound', number: index + 1 };
      });
      solvents.forEach(([materialId], index) => {
        materialToCompoundMap[materialId] = { type: 'solvent', number: index + 1 };
      });

      // Create headers for Design sheet
      const headers = ['Well', 'ID'];
      // Add compound headers
      for (let i = 1; i <= compounds.length; i++) {
        headers.push(`Compound ${i} Name`, `Compound ${i} Amount`);
      }
      // Add solvent headers
      for (let i = 1; i <= solvents.length; i++) {
        headers.push(`Solvent ${i} Name`, `Solvent ${i} Amount`);
      }

      const data = [headers];

      const totalColumns = compounds.length + solvents.length;

      // Process each well in order for the determined plate type
      wells.forEach(wellId => {
        const wellData = procedure.find(p => p.well === wellId);
        const elnNumber = context.eln || '';
        const wellIdWithEln = elnNumber ? `${elnNumber}_${wellId}` : wellId;

        const row = [wellId, wellIdWithEln];

        // Initialize all columns with empty values (compounds + solvents)
        for (let i = 0; i < totalColumns; i++) {
          row.push('', '');
        }

        if (wellData && wellData.materials && wellData.materials.length > 0) {
          // Fill in names and amounts based on the consistent mapping
          wellData.materials.forEach(material => {
            const materialId = getMaterialId(material);
            const mapping = materialToCompoundMap[materialId];
            if (mapping) {
              let columnOffset;
              if (mapping.type === 'compound') {
                // Compound columns start at index 2 (after Well and ID)
                columnOffset = (mapping.number - 1) * 2 + 2;
              } else {
                // Solvent columns start after all compound columns
                columnOffset = compounds.length * 2 + (mapping.number - 1) * 2 + 2;
              }
              row[columnOffset] = material.alias || material.name || '';
              row[columnOffset + 1] = material.amount || '';
            }
          });
        }

        data.push(row);
      });

      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Design');
    } catch (error) {
      console.error('Error exporting procedure:', error);
    }
  };

  const exportProcedureSettings = async (wb, XLSX) => {
    try {
      const response = await axios.get('/api/experiment/procedure-settings');
      const procedureSettings = response.data;

      const data = [
        ['Procedure Settings'],
        [''],
        ['Reaction Conditions'],
        ['Parameter', 'Value', 'Unit'],
        ['Temperature', procedureSettings.reactionConditions?.temperature || '', 'degC'],
        ['Time', procedureSettings.reactionConditions?.time || '', 'h'],
        ['Pressure', procedureSettings.reactionConditions?.pressure || '', 'bar'],
        ['Wavelength', procedureSettings.reactionConditions?.wavelength || '', 'nm'],
        [''],
        ['Remarks'],
        [procedureSettings.reactionConditions?.remarks || ''],
        [''],
        ['Analytical Details'],
        ['Parameter', 'Value', 'Unit'],
        ['UPLC #', procedureSettings.analyticalDetails?.uplcNumber || '', ''],
        ['Method', procedureSettings.analyticalDetails?.method || '', ''],
        ['Duration', procedureSettings.analyticalDetails?.duration || '', 'min'],
        ['Wavelength', procedureSettings.analyticalDetails?.wavelength || '', 'nm'],
        [''],
        ['Remarks'],
        [procedureSettings.analyticalDetails?.remarks || '']
      ];

      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Procedure');
    } catch (error) {
      console.error('Error exporting procedure settings:', error);
    }
  };

  const exportAnalyticalData = async (wb, XLSX) => {
    try {
      const response = await axios.get('/api/experiment/analytical');
      const analyticalData = response.data;

      // Check if there are uploaded files
      if (analyticalData && analyticalData.uploadedFiles && analyticalData.uploadedFiles.length > 0) {
        // Get the most recent uploaded file data
        const mostRecentUpload = analyticalData.uploadedFiles[analyticalData.uploadedFiles.length - 1];

        if (mostRecentUpload && mostRecentUpload.data && mostRecentUpload.data.length > 0) {
          // Create the correct column order: Nr, Well, ID, Name_1, Area_1, Name_2, Area_2, etc.
          const orderedColumns = ['Well', 'Sample ID'];

          // Find all Name_X and Area_X columns and sort them by number
          const nameColumns = [];
          const areaColumns = [];

          Object.keys(mostRecentUpload.data[0]).forEach(key => {
            if (key.startsWith('Name_')) {
              nameColumns.push(key);
            } else if (key.startsWith('Area_')) {
              areaColumns.push(key);
            }
          });

          // Sort by the number after the underscore
          nameColumns.sort((a, b) => {
            const numA = parseInt(a.split('_')[1]);
            const numB = parseInt(b.split('_')[1]);
            return numA - numB;
          });

          areaColumns.sort((a, b) => {
            const numA = parseInt(a.split('_')[1]);
            const numB = parseInt(b.split('_')[1]);
            return numA - numB;
          });

          // Add Name_X and Area_X columns in alternating order
          const maxCompounds = Math.max(nameColumns.length, areaColumns.length);
          for (let i = 0; i < maxCompounds; i++) {
            if (nameColumns[i]) orderedColumns.push(nameColumns[i]);
            if (areaColumns[i]) orderedColumns.push(areaColumns[i]);
          }

          // Only include standard columns - do NOT add any extra columns from the uploaded file

          // Create headers with correct order
          const headers = orderedColumns;
          const data = [headers];

          // Add data rows with correct column order
          mostRecentUpload.data.forEach((row, index) => {
            const rowData = [];
            orderedColumns.forEach(column => {
              rowData.push(row[column] || '');
            });
            data.push(rowData);
          });

          const ws = XLSX.utils.aoa_to_sheet(data);
          XLSX.utils.book_append_sheet(wb, ws, 'Analytical Data');
        } else {
          // Create analytical template even when no data in upload
          await createAnalyticalTemplate(wb, XLSX);
        }
      } else {
        // Create analytical template when no uploaded files
        await createAnalyticalTemplate(wb, XLSX);
      }
    } catch (error) {
      console.error('Error exporting analytical data:', error);
      // Fallback to empty sheet
      const ws = XLSX.utils.aoa_to_sheet([['Error loading analytical data']]);
      XLSX.utils.book_append_sheet(wb, ws, 'Analytical Data');
    }
  };

  const createAnalyticalTemplate = async (wb, XLSX) => {
    try {
      // Get ELN number from context
      const contextResponse = await axios.get('/api/experiment/context');
      const context = contextResponse.data;
      const elnNumber = context.eln || 'ELN';

      // Get materials to determine compounds for template
      let selectedCompounds = [];
      try {
        const materialsResponse = await axios.get('/api/experiment/materials');
        const materials = materialsResponse.data || [];

        // Get materials that are typically analyzed (reactants, products, internal standards)
        const analyticalRoles = ['reactant', 'product', 'target product', 'internal standard'];
        materials.forEach(material => {
          const role = (material.role || '').toLowerCase();
          if (analyticalRoles.some(analyticalRole => role.includes(analyticalRole))) {
            selectedCompounds.push({
              name: material.alias || material.name || '',
              selected: true
            });
          }
        });
      } catch (error) {
        console.warn('Could not fetch materials for analytical template:', error);
      }

      // If no compounds from materials, create default set
      if (selectedCompounds.length === 0) {
        selectedCompounds = [
          { name: 'Compound_1', selected: true },
          { name: 'Compound_2', selected: true },
          { name: 'Compound_3', selected: true },
          { name: 'Compound_4', selected: true }
        ];
      }

      // Limit to reasonable number of compounds (template shows 4)
      selectedCompounds = selectedCompounds.slice(0, 4);

      // Create headers in the exact format: Nr, Well, ID, Name_1, Area_1, Name_2, Area_2, etc.
      const headers = ['Well', 'Sample ID'];
      selectedCompounds.forEach((compound, i) => {
        headers.push(`Name_${i + 1}`, `Area_${i + 1}`);
      });

      const data = [headers];

      // Get plate type from context to generate appropriate number of wells
      const plateType = context.plate_type || '96';

      // Get plate configuration based on type
      const getPlateConfig = (plateType) => {
        if (plateType === "24") {
          return {
            rows: ['A', 'B', 'C', 'D'],
            columns: [1, 2, 3, 4, 5, 6]
          };
        } else if (plateType === "48") {
          return {
            rows: ['A', 'B', 'C', 'D', 'E', 'F'],
            columns: [1, 2, 3, 4, 5, 6, 7, 8]
          };
        } else { // Default to 96-well
          return {
            rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
            columns: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
          };
        }
      };

      const plateConfig = getPlateConfig(plateType);

      // Generate wells based on plate type
      for (const col of plateConfig.rows) {
        for (const row of plateConfig.columns) {
          const well = `${col}${row}`;
          const wellId = `${elnNumber}_${well}`;

          // Create row with Well, Sample ID
          const rowData = [well, wellId];

          // Add compound name and empty area placeholders for template
          selectedCompounds.forEach(compound => {
            const compoundName = compound.name || '';
            rowData.push(compoundName, ''); // Empty area for template
          });

          data.push(rowData);
        }
      }

      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Analytical Data');
    } catch (error) {
      console.error('Error creating analytical template:', error);
      // Fallback to basic template
      const data = [
        ['Nr', 'Well', 'ID', 'Name_1', 'Area_1'],
        [1, 'A1', 'ELN_A1', 'Compound_1', '']
      ];
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Analytical Data');
    }
  };

  const exportHeatmapData = async (wb, XLSX) => {
    try {
      const response = await axios.get('/api/experiment/heatmap');
      const heatmapData = response.data;

      // Check if heatmapData is an object with heatmaps array or empty object
      if (heatmapData && heatmapData.heatmaps && heatmapData.heatmaps.length > 0) {
        for (let index = 0; index < heatmapData.heatmaps.length; index++) {
          const heatmap = heatmapData.heatmaps[index];
          const sheetName = `Heatmap_${index + 1}`;

          // Create heatmap data
          const data = [
            [`Heatmap ${index + 1}: ${heatmap.title || 'Untitled'}`],
            [''],
            ['Formula:', heatmap.formula || 'No formula'],
            ['Color Scheme:', heatmap.colorScheme || 'blue'],
            ['Min Value:', heatmap.min || 0],
            ['Max Value:', heatmap.max || 0],
            ['']
          ];

          // Add column headers
          const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
          const rows = ['1', '2', '3', '4', '5', '6', '7', '8'];

          const headerRow = ['', ...cols];
          data.push(headerRow);

          // Add data rows
          if (heatmap.data) {
            heatmap.data.forEach((row, rowIndex) => {
              const dataRow = [rows[rowIndex]];
              row.forEach((cell, colIndex) => {
                dataRow.push(cell || '');
              });
              data.push(dataRow);
            });
          }

          const ws = XLSX.utils.aoa_to_sheet(data);

          XLSX.utils.book_append_sheet(wb, ws, sheetName);
        }
      } else {
        // Create empty heatmap sheet
        const data = [
          ['Heatmap Data'],
          [''],
          ['No heatmaps generated yet.']
        ];
        const ws = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Heatmap Data');
      }
    } catch (error) {
      console.error('Error exporting heatmap data:', error);
    }
  };

  const exportSummarySheet = async (wb, XLSX) => {
    try {
      // Get all data for summary
      const [contextRes, materialsRes, procedureRes, analyticalRes, heatmapRes] = await Promise.all([
        axios.get('/api/experiment/context'),
        axios.get('/api/experiment/materials'),
        axios.get('/api/experiment/procedure'),
        axios.get('/api/experiment/analytical'),
        axios.get('/api/experiment/heatmap')
      ]);

      const context = contextRes.data;
      const materials = materialsRes.data;
      const procedure = procedureRes.data;
      const analytical = analyticalRes.data;
      const heatmapData = heatmapRes.data;

      const data = [
        ['HTE Experiment Summary'],
        [''],
        ['Experiment Information'],
        ['Author:', context.author || 'Not specified'],
        ['Date:', context.date || 'Not specified'],
        ['Project:', context.project || 'Not specified'],
        ['ELN Number:', context.eln || 'Not specified'],
        ['Objective:', context.objective || 'Not specified'],
        [''],
        ['Data Summary'],
        ['Materials Count:', materials ? materials.length : 0],
        ['Wells with Data:', procedure ? procedure.filter(w => w.well).length : 0],
        ['Analytical Data Rows:', analytical ? analytical.length : 0],
        ['Heatmaps Generated:', heatmapData && heatmapData.heatmaps ? heatmapData.heatmaps.length : 0],
        [''],
        ['Sheet Contents'],
        ['1. Experiment Context - Basic experiment information and SDF reaction data'],
        ['2. Materials - All chemical materials with properties and roles'],
        ['3. Design - Complete 96-well plate design with materials and amounts for all wells (A1-H12)'],
        ['4. Analytical Data - Exact copy of uploaded analytical results table'],
        ['5. Heatmap Data - All generated heatmaps with formulas and color schemes'],
        ['6. Summary - This overview sheet'],
        [''],
        ['Export Information'],
        ['Export Date:', new Date().toLocaleString()],
        ['Export Version:', '1.0'],
        ['File Format:', 'Excel (.xlsx)']
      ];

      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Summary');
    } catch (error) {
      console.error('Error exporting summary:', error);
    }
  };

  return (
    <>
      <header className="clean-header">
        <div className="header-single-row">
          {/* Brand Section - Left */}
          <div className="header-brand">
            <img
              src="/logo-hte-d2d.png"
              alt="HTE D2D"
              className="brand-logo"
            />
          </div>

          {/* Navigation Section - Center */}
          <nav className="header-navigation">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`nav-pill ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => onTabChange(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Action Buttons - Right (Compact Icon style) */}
          <div className="header-actions">
            <button
              className="action-btn-icon"
              onClick={handleImportClick}
              title="Import experiment from Excel file"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
            <button
              className="action-btn-icon"
              onClick={exportToExcel}
              disabled={isExporting}
              title="Export all experiment data to Excel"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </button>
            <button
              className="action-btn-icon"
              onClick={handleHelp}
              title={`Help for ${activeTab} tab`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </button>
            <button
              className="action-btn-icon action-btn-warning"
              onClick={handleReset}
              title="Reset all experiment data"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
            {isPortableMode && (
              <button
                className="action-btn-icon action-btn-danger"
                onClick={() => setShowShutdownConfirm(true)}
                title="Exit the application"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Shutdown Confirmation Modal */}
      {showShutdownConfirm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "400px", width: "90%" }}>
            <div className="modal-header">
              <h3>Exit Application</h3>
              <button className="modal-close" onClick={() => setShowShutdownConfirm(false)}>×</button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center', padding: '20px' }}>
              <p style={{ marginBottom: '15px', fontSize: '16px' }}>
                Are you sure you want to exit the HTE App?
              </p>
              <p style={{ marginBottom: '20px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                Make sure you have exported your experiment data before exiting.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowShutdownConfirm(false)}
                  disabled={isShuttingDown}
                >
                  Cancel
                </button>
                <button
                  className="btn"
                  onClick={handleShutdown}
                  disabled={isShuttingDown}
                  style={{
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: isShuttingDown ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isShuttingDown ? 'Shutting down...' : 'Exit Application'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "600px", width: "95%" }}>
            <div className="modal-header">
              <h3>Import Experiment</h3>
              <button className="modal-close" onClick={closeImportModal}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: "20px" }}>
                <p style={{ marginBottom: "15px", color: "var(--color-text-secondary)" }}>
                  Select an Excel file to import experiment data.
                </p>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <input
                    type="file"
                    className="form-control"
                    accept=".xlsx,.xls"
                    onChange={handleImportFileSelect}
                    id="import-file-input"
                    style={{ width: "400px" }}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={handleImportExperiment}
                    disabled={!selectedImportFile || isImporting}
                  >
                    {isImporting ? "Importing..." : "Import Experiment"}
                  </button>
                </div>
                {selectedImportFile && (
                  <div style={{ marginTop: "10px", padding: "10px", backgroundColor: "var(--color-surface)", borderRadius: "4px" }}>
                    <strong>Selected file:</strong> {selectedImportFile.name}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
