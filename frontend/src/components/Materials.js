import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useToast } from "./ToastContext";
import MaterialTable from "./MaterialTable";
import MaterialForm from "./MaterialForm";
import InventorySearch from "./InventorySearch";
import KitPositioning from "./KitPositioning";

const Materials = () => {
  // Core material state
  const [materials, setMaterials] = useState([]);
  const [editMaterialIndex, setEditMaterialIndex] = useState(null);
  const [personalInventoryStatus, setPersonalInventoryStatus] = useState({});
  const [personalInventoryLoading, setPersonalInventoryLoading] = useState(false);

  // Ref to track if we've already checked personal inventory for current materials
  const materialsHashRef = useRef('');

  // Modal visibility state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showMoleculeModal, setShowMoleculeModal] = useState(false);

  const [showSolventModal, setShowSolventModal] = useState(false);
  const [showKitPositionModal, setShowKitPositionModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Molecule visualization state
  const [currentMolecule, setCurrentMolecule] = useState({ smiles: "", name: "" });
  const [moleculeImage, setMoleculeImage] = useState(null);
  const [moleculeLoading, setMoleculeLoading] = useState(false);

  // Kit upload state
  const [kitData, setKitData] = useState(null);
  const [kitSize, setKitSize] = useState(null);
  const [destinationPlateType, setDestinationPlateType] = useState("96");
  const [smilesWarningAliases, setSmilesWarningAliases] = useState(new Set());

  // File upload state - Materials from previous experiment
  const [selectedUploadFile, setSelectedUploadFile] = useState(null);
  const [uploadingMaterials, setUploadingMaterials] = useState(false);

  // Kit upload state - Kit with materials AND design
  const [showKitUploadModal, setShowKitUploadModal] = useState(false);
  const [selectedKitFile, setSelectedKitFile] = useState(null);
  const [uploadingKit, setUploadingKit] = useState(false);
  const [kitAmountOverride, setKitAmountOverride] = useState("");

  // Solvent search state
  const [solventSearchQuery, setSolventSearchQuery] = useState("");
  const [solventSearchResults, setSolventSearchResults] = useState([]);
  const [solventSearchLoading, setSolventSearchLoading] = useState(false);
  const [selectedSolvents, setSelectedSolvents] = useState([]);
  const [selectedSolventClass, setSelectedSolventClass] = useState("");
  const [boilingPointFilter, setBoilingPointFilter] = useState("");
  const [availableSolventClasses, setAvailableSolventClasses] = useState([]);
  const [selectedTier, setSelectedTier] = useState("");
  const [availableTiers, setAvailableTiers] = useState([]);

  // Selection and batch assignment state
  const [selectedMaterialIndices, setSelectedMaterialIndices] = useState(new Set());
  const [batchRole, setBatchRole] = useState("");
  const [batchRoleId, setBatchRoleId] = useState(""); // State for batch role_id input
  const [lastClickedIndex, setLastClickedIndex] = useState(null);

  // Filter and view state
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [roleIdFilter, setRoleIdFilter] = useState("All");
  const collapseKits = true; // Always collapse kits by default
  const [expandedKits, setExpandedKits] = useState(new Set());

  // Custom confirmation modal state
  const [confirmModal, setConfirmModal] = useState({ visible: false, message: '', onConfirm: null });
  const openConfirm = (message, onConfirm) => setConfirmModal({ visible: true, message, onConfirm });
  const closeConfirm = () => setConfirmModal({ visible: false, message: '', onConfirm: null });

  const roleOptions = [
    "Reactant",
    "Target product",
    "Product",
    "Solvent",
    "Reagent",
    "Internal standard",
  ];

  const { showSuccess, showError, showValidationError } = useToast();

  // Helper function to check if a material is a duplicate
  const isMaterialDuplicate = (newMaterial, existingMaterials) => {
    return existingMaterials.some(existingMaterial => {
      // Check if any of the identifying fields match (name, alias, or CAS)
      // Only check if both values exist and are not empty
      const nameMatch = existingMaterial.name && newMaterial.name &&
        existingMaterial.name.toLowerCase().trim() === newMaterial.name.toLowerCase().trim();
      const aliasMatch = existingMaterial.alias && newMaterial.alias &&
        existingMaterial.alias.toLowerCase().trim() === newMaterial.alias.toLowerCase().trim();
      const casMatch = existingMaterial.cas && newMaterial.cas &&
        existingMaterial.cas.toLowerCase().trim() === newMaterial.cas.toLowerCase().trim();

      return nameMatch || aliasMatch || casMatch;
    });
  };

  useEffect(() => {
    loadMaterials();

    const handleReset = () => {
      setMaterials([]);
      materialsHashRef.current = '';
      loadMaterials();
    };
    window.addEventListener('materialsCleared', handleReset);
    return () => window.removeEventListener('materialsCleared', handleReset);
  }, []);

  useEffect(() => {
    loadSolventClasses();
  }, []);

  useEffect(() => {
    loadSolventTiers();
  }, []);

  useEffect(() => {
    if (materials.length > 0) {
      // Create a hash of the current materials to check if we need to update
      const materialsHash = materials.map(m => `${m.name}_${m.alias || ''}_${m.cas || ''}`).sort().join('|');

      // Only update if the materials have actually changed
      if (materialsHash !== materialsHashRef.current) {
        materialsHashRef.current = materialsHash;

        // Add a small delay to prevent excessive updates when switching tabs
        const timeoutId = setTimeout(() => {
          updatePersonalInventoryStatus();
        }, 100);

        return () => clearTimeout(timeoutId);
      }
    }
  }, [materials]);

  useEffect(() => {
    // ESC key support for closing modals
    const handleEscKey = (e) => {
      if (e.key === 'Escape') {
        if (showMoleculeModal) setShowMoleculeModal(false);
        else if (showSolventModal) setShowSolventModal(false);
        else if (showUploadModal) setShowUploadModal(false);
        else if (showKitUploadModal) setShowKitUploadModal(false);
      }
    };

    document.addEventListener('keydown', handleEscKey);

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [showMoleculeModal, showSolventModal, showUploadModal, showKitUploadModal]);

  // Core CRUD operations
  const loadMaterials = async () => {
    try {
      const response = await axios.get("/api/experiment/materials");
      setMaterials(Array.isArray(response.data) ? response.data : []);

      setTimeout(() => {
        updatePersonalInventoryStatus();
      }, 100);
    } catch (error) {
      console.error("Error loading materials:", error);
      setMaterials([]);
    }
  };

  const saveMaterials = async (updatedMaterials) => {
    try {
      await axios.post("/api/experiment/materials", updatedMaterials);
      setMaterials(updatedMaterials);
    } catch (error) {
      console.error("Error saving materials:", error);
      // Check if it's a validation error from backend
      if (error.response?.data?.details) {
        showValidationError(error.response.data);
      } else {
        showError("Error saving materials: " + (error.response?.data?.error || error.message));
      }
    }
  };

  const addNewMaterial = async (materialData) => {
    try {
      // Check for duplicates before adding
      if (isMaterialDuplicate(materialData, materials)) {
        showError("This material already exists. Please check the name, alias, or CAS number.");
        return;
      }

      const updatedMaterials = [...materials, materialData];
      await saveMaterials(updatedMaterials);
      setShowAddModal(false);
      showSuccess("Material added successfully!");
    } catch (error) {
      showError("Error adding material: " + error.message);
    }
  };

  const handleRoleIdUpdate = (index, value) => {
    // Value is free-text (e.g. "kit1", "Lig") from the table component
    const updatedMaterials = [...materials];
    updatedMaterials[index] = { ...updatedMaterials[index], role_id: value };
    saveMaterials(updatedMaterials);
  };


  const updateMaterial = async (materialData) => {
    try {
      const updatedMaterials = materials.map((material, index) =>
        index === editMaterialIndex ? materialData : material
      );
      await saveMaterials(updatedMaterials);
      setShowAddModal(false);
      setEditMaterialIndex(null);
      showSuccess("Material updated successfully!");
    } catch (error) {
      showError("Error updating material: " + error.message);
    }
  };

  // Helper function to create a unique identifier for materials (matches Procedure.js logic)
  const getMaterialId = (material) => {
    const name = (material.name || '').trim();
    const alias = (material.alias || '').trim();
    const cas = (material.cas || '').trim();

    // Normalize Unicode characters
    const normalizedName = name.normalize('NFKD').replace(/[\u200B-\u200D\uFEFF]/g, '');
    const normalizedAlias = alias.normalize('NFKD').replace(/[\u200B-\u200D\uFEFF]/g, '');
    const normalizedCas = cas.normalize('NFKD').replace(/[\u200B-\u200D\uFEFF]/g, '');

    return `${normalizedName}_${normalizedAlias}_${normalizedCas}`;
  };

  // Helper function to create a name-based key for fallback matching
  const getMaterialNameKey = (material) => {
    const name = (material.name || '').trim().normalize('NFKD').replace(/[\u200B-\u200D\uFEFF]/g, '').toLowerCase();
    const alias = (material.alias || '').trim().normalize('NFKD').replace(/[\u200B-\u200D\uFEFF]/g, '').toLowerCase();
    return alias || name;
  };

  // Helper function to check if two materials match (with fallback to name/alias matching)
  const materialsMatch = (material1, material2) => {
    if (!material1 || !material2) return false;

    // First try exact ID match
    if (getMaterialId(material1) === getMaterialId(material2)) {
      return true;
    }

    // Fallback: match by name key (alias or name)
    const nameKey1 = getMaterialNameKey(material1);
    const nameKey2 = getMaterialNameKey(material2);
    return nameKey1 && nameKey2 && nameKey1 === nameKey2;
  };

  // Helper function to clean procedure data by removing deleted materials from all wells
  const cleanProcedureData = async (materialsToDelete) => {
    try {
      // Load current procedure data
      const procedureResponse = await axios.get('/api/experiment/procedure');
      const procedureData = procedureResponse.data || [];

      // Filter out deleted materials from all wells
      const cleanedProcedure = procedureData.map(wellData => ({
        ...wellData,
        materials: wellData.materials.filter(wellMaterial => {
          // Check if this well material matches any of the materials being deleted
          return !materialsToDelete.some(deletedMaterial =>
            materialsMatch(wellMaterial, deletedMaterial)
          );
        })
      }));

      // Save the cleaned procedure data back
      await axios.post('/api/experiment/procedure', cleanedProcedure);
    } catch (error) {
      console.error('Error cleaning procedure data:', error);
      // Don't throw - we still want material deletion to succeed even if procedure cleanup fails
    }
  };

  const removeMaterial = async (index) => {
    openConfirm('Are you sure you want to remove this material?', async () => {
      try {
        const materialToDelete = materials[index];
        const updatedMaterials = materials.filter((_, i) => i !== index);
        await cleanProcedureData([materialToDelete]);
        await saveMaterials(updatedMaterials);
        showSuccess('Material removed successfully!');
      } catch (error) {
        showError('Error removing material: ' + error.message);
      }
    });
  };

  const moveMaterialUp = async (index) => {
    if (index === 0) return; // Can't move first item up

    try {
      const updatedMaterials = [...materials];
      // Swap with the item above
      [updatedMaterials[index], updatedMaterials[index - 1]] = [updatedMaterials[index - 1], updatedMaterials[index]];
      await saveMaterials(updatedMaterials);
    } catch (error) {
      showError("Error moving material: " + error.message);
    }
  };

  const moveMaterialDown = async (index) => {
    if (index === materials.length - 1) return; // Can't move last item down

    try {
      const updatedMaterials = [...materials];
      // Swap with the item below
      [updatedMaterials[index], updatedMaterials[index + 1]] = [updatedMaterials[index + 1], updatedMaterials[index]];
      await saveMaterials(updatedMaterials);
    } catch (error) {
      showError("Error moving material: " + error.message);
    }
  };

  const updateMaterialRole = async (index, role) => {
    try {
      const updatedMaterials = materials.map((material, i) =>
        i === index ? { ...material, role } : material
      );
      await saveMaterials(updatedMaterials);
    } catch (error) {
      showError("Error updating material role: " + error.message);
    }
  };

  // Selection handlers
  const handleSelectionChange = (index, event) => {
    const newSelection = new Set(selectedMaterialIndices);

    // Access shiftKey from the native event (React SyntheticEvent wraps the native event)
    const shiftPressed = event?.nativeEvent?.shiftKey || event?.shiftKey || false;

    // Shift+Click range selection
    if (shiftPressed && lastClickedIndex !== null) {
      const start = Math.min(lastClickedIndex, index);
      const end = Math.max(lastClickedIndex, index);

      // Select all items in range
      for (let i = start; i <= end; i++) {
        newSelection.add(i);
      }
    } else {
      // Regular toggle behavior
      if (newSelection.has(index)) {
        newSelection.delete(index);
      } else {
        newSelection.add(index);
      }
    }

    setSelectedMaterialIndices(newSelection);
    setLastClickedIndex(index);
  };

  const handleSelectAll = () => {
    if (selectedMaterialIndices.size === materials.length) {
      setSelectedMaterialIndices(new Set());
    } else {
      setSelectedMaterialIndices(new Set(materials.map((_, i) => i)));
    }
  };

  const handleClearSelection = () => {
    setSelectedMaterialIndices(new Set());
    setBatchRole("");
    setBatchRoleId(""); // Reset batch role_id
    setLastClickedIndex(null);
  };

  const handleBatchRoleAssignment = async () => {
    if (!batchRole) {
      showError("Please select a role first");
      return;
    }

    if (selectedMaterialIndices.size === 0) {
      showError("No materials selected");
      return;
    }

    try {
      // Trim whitespace from role_id
      const trimmedRoleId = batchRoleId.trim();

      const updatedMaterials = materials.map((material, index) => {
        if (selectedMaterialIndices.has(index)) {
          const update = { ...material, role: batchRole };

          // If a role_id is provided, apply it
          if (trimmedRoleId) {
            update.role_id = trimmedRoleId;
          } else if (material.role !== batchRole) {
            // If role changed and no new role_id provided, clear the old role_id
            update.role_id = null;
          }
          return update;
        }
        return material;
      });

      await saveMaterials(updatedMaterials);

      const count = selectedMaterialIndices.size;

      // Clear selection and reset batch role
      setSelectedMaterialIndices(new Set());
      setBatchRole("");
      setBatchRoleId("");

      showSuccess(`Role "${batchRole}" assigned to ${count} material(s)${trimmedRoleId ? ` with Role_ID "${trimmedRoleId}"` : ''}`);
    } catch (error) {
      showError("Error assigning roles: " + error.message);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedMaterialIndices.size === 0) {
      showError("No materials selected");
      return;
    }

    const count = selectedMaterialIndices.size;
    openConfirm(
      `Are you sure you want to delete ${count} selected material(s)? This action cannot be undone.`,
      async () => {
        try {
          // Collect materials to delete
          const materialsToDelete = materials.filter((_, index) =>
            selectedMaterialIndices.has(index)
          );

          // Filter out selected materials
          const updatedMaterials = materials.filter((_, index) =>
            !selectedMaterialIndices.has(index)
          );

          // Clean up procedure data (remove from all wells)
          await cleanProcedureData(materialsToDelete);

          // Save updated materials list
          await saveMaterials(updatedMaterials);

          // Clear selection and reset state
          setSelectedMaterialIndices(new Set());
          setLastClickedIndex(null);
          setBatchRole("");

          showSuccess(`Successfully deleted ${count} material(s)`);
        } catch (error) {
          showError("Error deleting materials: " + error.message);
        }
      }
    );
  };

  // Personal inventory operations
  const updatePersonalInventoryStatus = async () => {
    // Prevent multiple simultaneous updates
    if (personalInventoryLoading) return;

    try {
      setPersonalInventoryLoading(true);
      const statusMap = {};

      // Filter out materials that don't need checking
      const materialsToCheck = materials.filter(material => {
        // Skip materials that are already known to be in personal inventory
        const key = `${material.name}_${material.alias || ''}_${material.cas || ''}`;
        if (personalInventoryStatus[key] === true) {
          statusMap[key] = true; // Keep existing status
          return false;
        }
        return true;
      });

      if (materialsToCheck.length === 0) {
        setPersonalInventoryLoading(false);
        return;
      }

      // Process remaining materials in batches
      const batchSize = 5;
      for (let i = 0; i < materialsToCheck.length; i += batchSize) {
        const batch = materialsToCheck.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (material) => {
            const exists = await checkPersonalInventoryStatus(material);
            const key = `${material.name}_${material.alias || ''}_${material.cas || ''}`;
            statusMap[key] = exists;
          })
        );
      }

      // Update state once with all results
      setPersonalInventoryStatus(prev => ({
        ...prev,
        ...statusMap
      }));
    } catch (error) {
      console.error("Error updating personal inventory status:", error);
    } finally {
      setPersonalInventoryLoading(false);
    }
  };

  const checkPersonalInventoryStatus = async (material) => {
    try {
      const response = await axios.post("/api/inventory/private/check", {
        name: material.name,
        alias: material.alias,
        cas: material.cas,
        smiles: material.smiles
      });
      return response.data.exists;
    } catch (error) {
      console.error("Error checking personal inventory:", error);
      return false;
    }
  };

  const addToPersonalInventory = async (material) => {
    try {
      await axios.post("/api/inventory/private/add", material);
      showSuccess(`${material.name} added to personal inventory!`);

      // Immediately update the status for this specific material
      const key = `${material.name}_${material.alias || ''}_${material.cas || ''}`;
      setPersonalInventoryStatus(prev => ({
        ...prev,
        [key]: true
      }));
    } catch (error) {
      showError("Error adding to personal inventory: " + error.message);
    }
  };

  // Molecule visualization
  const generateMoleculeImage = async (smiles, name, alias, cas) => {
    setMoleculeLoading(true);
    setCurrentMolecule({ smiles, name });

    try {
      const response = await axios.post("/api/molecule/image", {
        smiles: smiles,
        width: 400,
        height: 400,
      });

      setMoleculeImage(`data:image/png;base64,${response.data.image}`);
      setCurrentMolecule({ smiles, name, alias, cas });
      setShowMoleculeModal(true);
    } catch (error) {
      console.error("Error generating molecule image:", error);
      showError("Error generating molecule image: " + error.message);
    } finally {
      setMoleculeLoading(false);
    }
  };

  // Event handlers
  const handleAddFromInventory = (material) => {
    // Check for duplicates before adding
    if (isMaterialDuplicate(material, materials)) {
      showError(`${material.name} already exists in your materials list.`);
      return;
    }

    const updatedMaterials = [...materials, material];
    saveMaterials(updatedMaterials);
    // Success message will be shown by InventorySearch component
  };

  const handleAddMultipleMaterials = async (materialsToAdd) => {
    try {
      // Filter out duplicates before adding
      const newMaterials = materialsToAdd.filter(materialToAdd =>
        !isMaterialDuplicate(materialToAdd, materials)
      );

      if (newMaterials.length === 0) {
        showError("All selected materials already exist in your list.");
        return;
      }

      if (newMaterials.length < materialsToAdd.length) {
        const skippedCount = materialsToAdd.length - newMaterials.length;
        showSuccess(`${newMaterials.length} material(s) added. ${skippedCount} material(s) were skipped (already exist).`);
      }

      const updatedMaterials = [...materials, ...newMaterials];
      // Save without showing the default success message
      await axios.post("/api/experiment/materials", updatedMaterials);
      setMaterials(updatedMaterials);
      // Success message will be shown by InventorySearch component
    } catch (error) {
      console.error("Error adding materials:", error);
      showError("Error adding materials: " + error.message);
    }
  };

  const handleEditMaterial = (index) => {
    setEditMaterialIndex(index);
    setShowAddModal(true);
  };

  const handleMaterialFormSave = (materialData) => {
    if (editMaterialIndex !== null) {
      updateMaterial(materialData);
    } else {
      addNewMaterial(materialData);
    }
  };

  const handleMaterialFormCancel = () => {
    setShowAddModal(false);
    setEditMaterialIndex(null);
  };

  const handleKitPositionSelect = (positionData) => {
    // Apply kit positioning logic here
    setShowKitPositionModal(false);
    showSuccess("Kit applied successfully!");
  };

  // Solvent search functions
  const loadSolventClasses = async () => {
    try {
      const response = await axios.get('/api/solvent/classes');
      const classes = response.data || [];
      // Sort classes alphabetically
      setAvailableSolventClasses(classes.sort());
    } catch (error) {
      console.error("Error loading solvent classes:", error);
      // If API fails, show empty list instead of incorrect fallback classes
      setAvailableSolventClasses([]);
    }
  };

  const loadSolventTiers = async () => {
    try {
      const response = await axios.get('/api/solvent/tiers');
      setAvailableTiers(response.data || []);
    } catch (error) {
      console.error("Error loading solvent tiers:", error);
      // Fallback to default tiers if API fails
      setAvailableTiers(["1", "2", "3", "4"]);
    }
  };

  const searchSolvents = async () => {
    setSolventSearchLoading(true);
    try {
      const params = new URLSearchParams();
      // Always include the search query, even if empty, to ensure proper filtering
      params.append('q', solventSearchQuery.trim());
      if (selectedSolventClass) params.append('class_filter', selectedSolventClass);
      if (boilingPointFilter) params.append('bp_filter', boilingPointFilter);
      if (selectedTier) params.append('tier_filter', selectedTier);


      const response = await axios.get(`/api/solvent/search?${params.toString()}`);
      setSolventSearchResults(response.data || []);
    } catch (error) {
      console.error("Error searching solvents:", error);
      showError("Error searching solvents: " + error.message);
      setSolventSearchResults([]);
    } finally {
      setSolventSearchLoading(false);
    }
  };

  // File upload functions - Materials from previous experiment
  const handleUploadMaterials = async () => {
    if (!selectedUploadFile) {
      showError("Please select a file first");
      return;
    }

    setUploadingMaterials(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedUploadFile);

      const response = await axios.post('/api/experiment/materials/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Reload materials to get the updated list
      await loadMaterials();

      // Show success message with details
      const { added_materials, skipped_materials, inventory_matches, excel_uploads } = response.data;

      let message = `Successfully uploaded ${added_materials} material(s) from Excel file.`;
      if (inventory_matches > 0) {
        message += ` ${inventory_matches} material(s) matched inventory data (using inventory information).`;
      }
      if (excel_uploads > 0) {
        message += ` ${excel_uploads} material(s) used uploaded data.`;
      }
      if (skipped_materials > 0) {
        message += ` ${skipped_materials} material(s) were skipped (already exist in current experiment).`;
      }

      showSuccess(message);
      setShowUploadModal(false);
      setSelectedUploadFile(null);

      // Clear the file input
      const fileInput = document.getElementById('materials-upload-input');
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (error) {
      console.error("Error uploading materials:", error);
      showError("Error uploading materials: " + (error.response?.data?.error || error.message));
    } finally {
      setUploadingMaterials(false);
    }
  };

  // Kit upload functions - Kit with materials AND design
  const handleKitFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedKitFile(file);
    }
  };

  const handleUploadKit = async () => {
    if (!selectedKitFile) {
      showError("Please select a kit file to upload");
      return;
    }

    // Validate amount if provided
    if (kitAmountOverride && (isNaN(kitAmountOverride) || parseFloat(kitAmountOverride) <= 0)) {
      showError("Please enter a valid positive number for amount");
      return;
    }

    setUploadingKit(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedKitFile);

      // Add amount override if provided
      if (kitAmountOverride && kitAmountOverride.trim() !== "") {
        formData.append('amount_override', kitAmountOverride.trim());
      }

      const response = await axios.post("/api/experiment/kit/analyze", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const { materials, design, kit_size } = response.data;
      setKitData({ materials, design });
      setKitSize(kit_size);

      // Close kit upload modal and show positioning modal
      setShowKitUploadModal(false);
      setShowKitPositionModal(true);

    } catch (error) {
      console.error("Error analyzing kit:", error);
      showError("Error analyzing kit: " + (error.response?.data?.error || error.message));
    } finally {
      setUploadingKit(false);
    }
  };

  const closeKitUploadModal = () => {
    setShowKitUploadModal(false);
    setSelectedKitFile(null);
    setKitAmountOverride("");
    // Clear the file input
    const fileInput = document.getElementById('kit-upload-input');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const closeKitPositionModal = () => {
    setShowKitPositionModal(false);
    setKitData(null);
    setKitSize(null);
    setDestinationPlateType("96");
  };

  const handleApplyKit = async (smilesWarnings = []) => {
    // Reload materials to get the updated list
    await loadMaterials();
    closeKitPositionModal();

    // Populate SMILES warning aliases for highlighting in the table
    if (smilesWarnings.length > 0) {
      setSmilesWarningAliases(prev => {
        const newSet = new Set(prev);
        smilesWarnings.forEach(w => {
          if (w.alias_a) newSet.add(w.alias_a);
          if (w.alias_b) newSet.add(w.alias_b);
        });
        return newSet;
      });
    }
  };

  const handleRemoveAllMaterials = async () => {
    openConfirm('Are you sure you want to remove all materials from your list?', async () => {
      try {
        await cleanProcedureData(materials);
        await saveMaterials([]);
        showSuccess('All materials removed successfully!');
      } catch (error) {
        showError('Error removing all materials: ' + error.message);
      }
    });
  };

  // Helper: Get unique role_ids from materials
  const getUniqueRoleIds = () => {
    const roleIds = new Set();
    materials.forEach(mat => {
      if (mat.role_id) {
        roleIds.add(mat.role_id);
      }
    });
    return Array.from(roleIds).sort();
  };

  // Helper: Group materials by role_id for kit grouping
  const groupMaterialsByKit = () => {
    const groups = {
      kits: {},
      manual: []
    };

    materials.forEach((mat, index) => {
      if (mat.role_id && mat.role_id.startsWith('kit_')) {
        if (!groups.kits[mat.role_id]) {
          groups.kits[mat.role_id] = [];
        }
        groups.kits[mat.role_id].push({ ...mat, originalIndex: index });
      } else {
        groups.manual.push({ ...mat, originalIndex: index });
      }
    });

    return groups;
  };

  // Helper: Filter materials based on search and filters
  const getFilteredMaterials = () => {
    return materials.filter((mat, index) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          (mat.name && mat.name.toLowerCase().includes(query)) ||
          (mat.alias && mat.alias.toLowerCase().includes(query)) ||
          (mat.cas && mat.cas.toLowerCase().includes(query)) ||
          (mat.smiles && mat.smiles.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      // Role filter
      if (roleFilter !== "All" && mat.role !== roleFilter) {
        return false;
      }

      // Role_ID filter
      if (roleIdFilter !== "All") {
        if (roleIdFilter === "undefined") {
          // Show only materials without role_id
          if (mat.role_id) return false;
        } else {
          // Show only materials with the specific role_id
          if (mat.role_id !== roleIdFilter) return false;
        }
      }

      return true;
    });
  };

  // Helper: Handle kit group selection
  const handleKitGroupToggle = (kitId) => {
    const kitMaterials = materials
      .map((mat, index) => ({ mat, index }))
      .filter(({ mat }) => mat.role_id === kitId)
      .map(({ index }) => index);

    const allSelected = kitMaterials.every(idx => selectedMaterialIndices.has(idx));

    setSelectedMaterialIndices(prev => {
      const newSet = new Set(prev);
      if (allSelected) {
        // Deselect all kit materials
        kitMaterials.forEach(idx => newSet.delete(idx));
      } else {
        // Select all kit materials
        kitMaterials.forEach(idx => newSet.add(idx));
      }
      return newSet;
    });
  };

  // Helper: Remove all materials in a kit
  const handleRemoveKit = async (kitId) => {
    openConfirm(`Remove all materials from ${kitId}?`, async () => {
      try {
        const kitMaterials = materials.filter(mat => mat.role_id === kitId);
        const updatedMaterials = materials.filter(mat => mat.role_id !== kitId);
        await cleanProcedureData(kitMaterials);
        await saveMaterials(updatedMaterials);
        showSuccess(`All materials from ${kitId} removed successfully!`);
        setSelectedMaterialIndices(new Set());
      } catch (error) {
        showError(`Error removing ${kitId}: ` + error.message);
      }
    });
  };

  const filteredMaterials = getFilteredMaterials();
  const groupedMaterials = groupMaterialsByKit();
  const uniqueRoleIds = getUniqueRoleIds();

  return (
    <div className="card">
      {/* Action buttons */}
      <div className="materials-actions-bar" style={{
        marginBottom: "24px",
        padding: "20px",
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border-light)",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)"
      }}>
        <div style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "flex-start"
        }}>
          <button
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            ➕ Add New Material
          </button>
          <button
            className="btn btn-success"
            onClick={() => setShowInventoryModal(true)}
          >
            🔍 Search Inventory
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowSolventModal(true)}
          >
            🧪 Add Solvent
          </button>
          <button
            className="btn btn-success"
            onClick={() => setShowUploadModal(true)}
          >
            📁 Upload Materials
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowKitUploadModal(true)}
          >
            📦 Upload Kit
          </button>
          {materials.length > 0 && (
            <button
              className="btn btn-warning"
              onClick={handleRemoveAllMaterials}
              style={{ marginLeft: "auto" }}
            >
              🗑️ Clear Table
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{
        marginBottom: "16px",
        padding: "16px",
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "8px",
        display: "flex",
        gap: "12px",
        flexWrap: "wrap",
        alignItems: "center"
      }}>
        {/* Search */}
        <div style={{ flex: "1 1 250px", minWidth: "200px" }}>
          <input
            type="text"
            className="form-control"
            placeholder="🔍 Search materials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ fontSize: "14px" }}
          />
        </div>

        {/* Role Filter */}
        <div style={{ flex: "0 0 auto" }}>
          <select
            className="form-control"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ fontSize: "14px", minWidth: "140px" }}
          >
            <option value="All">All Roles</option>
            {roleOptions.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>

        {/* Role_ID/Kit Filter */}
        <div style={{ flex: "0 0 auto" }}>
          <select
            className="form-control"
            value={roleIdFilter}
            onChange={(e) => setRoleIdFilter(e.target.value)}
            style={{ fontSize: "14px", minWidth: "140px" }}
          >
            <option value="All">All Role_ID</option>
            <option value="undefined">undefined</option>
            {uniqueRoleIds.map(roleId => (
              <option key={roleId} value={roleId}>{roleId}</option>
            ))}
          </select>
        </div>

        {/* Results count */}
        <div style={{
          marginLeft: "auto",
          fontSize: "13px",
          color: "var(--color-text-secondary)",
          whiteSpace: "nowrap"
        }}>
          Showing {filteredMaterials.length} of {materials.length} materials
        </div>
      </div>

      {/* Batch Actions Toolbar - appears when materials are selected */}
      {selectedMaterialIndices.size > 0 && (
        <div style={{
          marginBottom: "16px",
          padding: "12px 16px",
          backgroundColor: "rgba(74, 144, 226, 0.05)",
          border: "2px solid #4a90e2",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          flexWrap: "nowrap",
          overflow: "auto"
        }}>
          <span style={{
            fontWeight: "600",
            color: "#4a90e2",
            fontSize: "14px",
            whiteSpace: "nowrap",
            minWidth: "fit-content"
          }}>
            ✓ {selectedMaterialIndices.size} selected
          </span>
          <select
            className="form-control"
            value={batchRole}
            onChange={(e) => setBatchRole(e.target.value)}
            style={{ width: "150px", fontSize: "14px", flexShrink: 0 }}
          >
            <option value="">Select Role</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>

          {/* Batch Role_ID Input - Optional */}
          <input
            type="text"
            className="form-control"
            placeholder="Role_ID"
            value={batchRoleId}
            onChange={(e) => setBatchRoleId(e.target.value)}
            style={{ width: "100px", fontSize: "14px", padding: "4px 8px", flexShrink: 0 }}
          />
          <button
            className="btn btn-primary"
            onClick={handleBatchRoleAssignment}
            disabled={!batchRole}
            style={{ fontSize: "14px", padding: "6px 12px", whiteSpace: "nowrap", flexShrink: 0 }}
          >
            Assign
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleClearSelection}
            style={{ fontSize: "14px", padding: "6px 12px", whiteSpace: "nowrap", flexShrink: 0 }}
          >
            Clear
          </button>
          <button
            className="btn btn-warning"
            onClick={handleBatchDelete}
            style={{ fontSize: "14px", padding: "6px 12px", whiteSpace: "nowrap", marginLeft: "auto", flexShrink: 0 }}
          >
            Delete
          </button>
        </div>
      )}

      {/* Materials table */}
      <MaterialTable
        materials={materials}
        filteredMaterials={filteredMaterials}
        groupedMaterials={groupedMaterials}
        collapseKits={collapseKits}
        expandedKits={expandedKits}
        onToggleKit={(kitId) => {
          setExpandedKits(prev => {
            const newSet = new Set(prev);
            if (newSet.has(kitId)) {
              newSet.delete(kitId);
            } else {
              newSet.add(kitId);
            }
            return newSet;
          });
        }}
        onKitGroupSelect={handleKitGroupToggle}
        onRemoveKit={handleRemoveKit}
        roleOptions={roleOptions}
        personalInventoryStatus={personalInventoryStatus}
        personalInventoryLoading={personalInventoryLoading}
        onMoleculeView={generateMoleculeImage}
        onRoleUpdate={updateMaterialRole}
        onRoleIdUpdate={handleRoleIdUpdate}
        onRemove={removeMaterial}
        onEdit={handleEditMaterial}
        onAddToPersonalInventory={addToPersonalInventory}
        onMoveUp={moveMaterialUp}
        onMoveDown={moveMaterialDown}
        moleculeLoading={moleculeLoading}
        currentMolecule={currentMolecule}
        selectedIndices={selectedMaterialIndices}
        onSelectionChange={handleSelectionChange}
        onSelectAll={handleSelectAll}
        smilesWarningAliases={smilesWarningAliases}
      />

      {/* Material Form Modal */}
      <MaterialForm
        material={editMaterialIndex !== null ? materials[editMaterialIndex] : null}
        isEdit={editMaterialIndex !== null}
        roleOptions={roleOptions}
        onSave={handleMaterialFormSave}
        onCancel={handleMaterialFormCancel}
        visible={showAddModal}
      />

      {/* Inventory Search Modal */}
      <InventorySearch
        onAddMaterial={handleAddFromInventory}
        onAddMultipleMaterials={handleAddMultipleMaterials}
        visible={showInventoryModal}
        onClose={() => setShowInventoryModal(false)}
        showSuccess={showSuccess}
        showError={showError}
        materials={materials}
      />

      {/* Kit Positioning Modal */}
      <KitPositioning
        kitSize={kitSize}
        destinationPlateType={destinationPlateType}
        onPositionSelect={handleKitPositionSelect}
        onCancel={() => setShowKitPositionModal(false)}
        visible={showKitPositionModal}
      />

      {/* Molecule Modal */}
      {showMoleculeModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Molecule Structure</h3>
              <button className="modal-close" onClick={() => setShowMoleculeModal(false)}>×</button>
            </div>
            <div className="modal-body" style={{ textAlign: "center" }}>
              <h4>{currentMolecule.alias || currentMolecule.name}</h4>
              {currentMolecule.cas && <p>CAS: {currentMolecule.cas}</p>}
              {moleculeImage && (
                <img
                  src={moleculeImage}
                  alt="Molecule structure"
                  style={{ maxWidth: "100%", maxHeight: "400px" }}
                />
              )}
            </div>

          </div>
        </div>
      )}



      {/* Solvent Search Modal */}
      {showSolventModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "800px" }}>
            <div className="modal-header">
              <h3>Add Solvent</h3>
              <button className="modal-close" onClick={() => setShowSolventModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: "15px" }}>
                <div style={{ display: "flex", gap: "10px", marginBottom: "10px", alignItems: "center" }}>
                  <input
                    type="text"
                    placeholder="Search solvents by name, alias, or CAS..."
                    value={solventSearchQuery}
                    onChange={(e) => setSolventSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        searchSolvents();
                      }
                    }}
                    className="form-control"
                    style={{ flex: 1 }}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={searchSolvents}
                    disabled={solventSearchLoading}
                  >
                    {solventSearchLoading ? "Searching..." : "Search"}
                  </button>
                </div>
                <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                  <select
                    className="form-control"
                    value={selectedSolventClass}
                    onChange={(e) => setSelectedSolventClass(e.target.value)}
                    style={{ flex: 1 }}
                  >
                    <option value="">All Classes</option>
                    {availableSolventClasses.map((className) => (
                      <option key={className} value={className}>
                        {className.charAt(0).toUpperCase() + className.slice(1)}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Boiling point filter (e.g., >100, <200)"
                    value={boilingPointFilter}
                    onChange={(e) => setBoilingPointFilter(e.target.value)}
                    className="form-control"
                    style={{ flex: 1 }}
                  />
                  <select
                    className="form-control"
                    value={selectedTier}
                    onChange={(e) => setSelectedTier(e.target.value)}
                    style={{ flex: 1 }}
                  >
                    <option value="">All Tiers</option>
                    {availableTiers.map((tier) => (
                      <option key={tier} value={tier}>
                        Max Tier {tier}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {solventSearchResults.length > 0 && (
                <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                  {solventSearchResults.map((solvent, index) => {
                    // Check if this solvent is already in the materials list
                    const isAlreadyAdded = isMaterialDuplicate({
                      name: solvent.name,
                      alias: solvent.alias || "",
                      cas: solvent.cas || ""
                    }, materials);

                    return (
                      <div key={index} style={{
                        padding: "10px",
                        borderBottom: "1px solid var(--color-border)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}>
                        <div style={{ flex: 1, marginRight: "10px" }}>
                          <div style={{ fontSize: "14px", lineHeight: "1.4" }}>
                            <span style={{ fontWeight: "500" }}>{solvent.name}</span>
                            {solvent.alias && <span style={{ color: "var(--color-text-secondary)" }}> | {solvent.alias}</span>}
                            <span style={{ color: "var(--color-text-secondary)" }}> | CAS: {solvent.cas || "N/A"}</span>
                            <span style={{ color: "var(--color-text-secondary)" }}> | BP: {solvent.boiling_point}°C</span>
                            <span style={{ color: "var(--color-text-secondary)" }}> | {solvent.tier || "N/A"}</span>
                          </div>
                        </div>
                        <button
                          className="btn btn-primary"
                          onClick={() => {
                            const material = {
                              name: solvent.name,
                              alias: solvent.alias || "",
                              cas: solvent.cas || "",
                              molecular_weight: solvent.molecular_weight || "",
                              smiles: solvent.smiles || "",
                              barcode: "",
                              role: "Solvent",
                              source: "solvent_database"
                            };
                            handleAddFromInventory(material);
                          }}
                          disabled={isAlreadyAdded}
                          style={{
                            fontSize: "12px",
                            padding: "6px 12px",
                            flexShrink: 0,
                            opacity: isAlreadyAdded ? 0.5 : 1
                          }}
                        >
                          {isAlreadyAdded ? 'Added' : 'Add'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Upload Materials Modal */}
      {showUploadModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "600px", width: "95%" }}>
            <div className="modal-header">
              <h3>Upload Materials</h3>
              <button className="modal-close" onClick={() => setShowUploadModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <input
                    type="file"
                    className="form-control"
                    accept=".xlsx,.xls"
                    onChange={(e) => setSelectedUploadFile(e.target.files[0])}
                    id="materials-upload-input"
                    style={{ width: "400px" }}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={handleUploadMaterials}
                    disabled={!selectedUploadFile || uploadingMaterials}
                  >
                    {uploadingMaterials ? "Uploading..." : "Upload Materials"}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Kit Upload Modal */}
      {showKitUploadModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "600px", width: "95%" }}>
            <div className="modal-header">
              <h3>Upload Kit</h3>
              <button className="modal-close" onClick={closeKitUploadModal}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: "20px" }}>
                <div style={{ marginBottom: "15px" }}>
                  <input
                    type="file"
                    className="form-control"
                    accept=".xlsx,.xls"
                    onChange={handleKitFileSelect}
                    id="kit-upload-input"
                  />
                </div>

                <div style={{ marginBottom: "15px", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                  <label style={{ fontWeight: "normal", fontSize: "14px", whiteSpace: "nowrap", margin: 0 }}>
                    Amount (in µmol):
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Optional"
                    value={kitAmountOverride}
                    onChange={(e) => setKitAmountOverride(e.target.value)}
                    min="0"
                    step="any"
                    style={{ width: "150px", fontSize: "14px" }}
                  />
                </div>

                <button
                  className="btn btn-primary"
                  onClick={handleUploadKit}
                  disabled={!selectedKitFile || uploadingKit}
                  style={{ width: "100%" }}
                >
                  {uploadingKit ? "Analyzing..." : "Upload Kit"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Kit Position Modal */}
      <KitPositioning
        kitData={kitData}
        kitSize={kitSize}
        destinationPlateType={destinationPlateType}
        setDestinationPlateType={setDestinationPlateType}
        onApplyKit={handleApplyKit}
        onCancel={closeKitPositionModal}
        visible={showKitPositionModal}
        showSuccess={showSuccess}
        showError={showError}
      />

      {/* Custom confirmation modal */}
      {confirmModal.visible && (
        <div className="modal-overlay" onClick={closeConfirm}>
          <div className="modal-content" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Action</h3>
              <button className="modal-close" onClick={closeConfirm}>×</button>
            </div>
            <div className="modal-body" style={{ padding: '20px', textAlign: 'left' }}>
              <p style={{ margin: 0 }}>{confirmModal.message}</p>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={closeConfirm}>Cancel</button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  closeConfirm();
                  if (confirmModal.onConfirm) confirmModal.onConfirm();
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Materials;
