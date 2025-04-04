// src/components/admin/BlockEditor.js
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

// Material UI imports
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Typography,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
  makeStyles
} from '@material-ui/core';
import {
  Add as AddIcon,
  Delete as DeleteIcon
} from '@material-ui/icons';

const useStyles = makeStyles((theme) => ({
  formSection: {
    marginBottom: theme.spacing(3),
  },
  optionsList: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(2),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    maxHeight: '200px',
    overflow: 'auto',
  },
  fieldPropertiesContainer: {
    marginTop: theme.spacing(2),
  },
  divider: {
    margin: theme.spacing(2, 0),
  },
  modeLabel: {
    color: theme.palette.text.secondary,
    fontStyle: 'italic',
    marginBottom: theme.spacing(2),
  },
  helpText: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(2),
    color: theme.palette.text.secondary,
    fontSize: '0.875rem',
  }
}));

// Field type options
const fieldTypes = [
  { value: 'short_text', label: 'Short text field' },
  { value: 'long_text', label: 'Long text area' },
  { value: 'number', label: 'Number field' },
  { value: 'date', label: 'Date picker' },
  { value: 'checkbox', label: 'Checkbox (Yes/No)' },
  { value: 'radio', label: 'Single Choice (radio buttons)' },
  { value: 'multi_choice', label: 'Multiple Choice (checkboxes)' },
  { value: 'dropdown', label: 'Dropdown menu' }
];

function BlockEditor({ open, block, onSave, onClose, mode }) {
  const classes = useStyles();
  const [formData, setFormData] = useState({
    type: 'field',
    title: '',
    description: '',
    fieldType: 'short_text',
    required: false,
    options: [],
    validation: {
      minLength: '',
      maxLength: '',
      pattern: '',
      minValue: '',
      maxValue: '',
      units: ''
    },
    newOption: '',
    children: []
  });
  
  // Determine dialog title and mode label based on mode
  const getDialogTitle = () => {
    switch (mode) {
      case 'section':
        return 'Top-Level Section';
      case 'subsection':
        return 'Subsection (Level 2)';
      case 'subsubsection':
        return 'Sub-subsection (Level 3)';
      case 'field-or-signature':
        return formData.type === 'signature' ? 'Signature Field' : 'Form Field';
      default:
        return 'Block';
    }
  };
  
  const getModeLabel = () => {
    switch (mode) {
      case 'section':
        return 'Creating a top-level section that will appear as "1." in your form';
      case 'subsection':
        return 'Creating a subsection that will appear as "1.1." in your form';
      case 'subsubsection':
        return 'Creating a sub-subsection that will appear as "1.1.1." in your form';
      case 'field-or-signature':
        return 'Adding a field or signature to collect data from users';
      default:
        return '';
    }
  };
  
  // Update form when block changes
  useEffect(() => {
    if (block) {
      // Set defaults based on the mode
      let blockType = block.type || 'field';
      
      // Force type to 'group' for section modes
      if (['section', 'subsection', 'subsubsection'].includes(mode)) {
        blockType = 'group';
      }
      
      setFormData({
        ...formData,
        id: block.id || null,
        type: blockType,
        title: block.title || '',
        description: block.description || '',
        fieldType: block.fieldType || 'short_text',
        required: block.required || false,
        options: block.options || [],
        validation: block.validation || {
          minLength: '',
          maxLength: '',
          pattern: '',
          minValue: '',
          maxValue: '',
          units: ''
        },
        children: block.children || [],
        newOption: ''
      });
    }
  }, [block, mode]);
  
  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, checked, type } = e.target;
    
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  // Handle validation input changes
  const handleValidationChange = (e) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      validation: {
        ...formData.validation,
        [name]: value
      }
    });
  };
  
  // Add option for multiple choice/dropdown
  const handleAddOption = () => {
    if (!formData.newOption.trim()) return;
    
    setFormData({
      ...formData,
      options: [...formData.options, formData.newOption.trim()],
      newOption: '' // Clear input
    });
  };
  
  // Remove option
  const handleRemoveOption = (index) => {
    const updatedOptions = [...formData.options];
    updatedOptions.splice(index, 1);
    
    setFormData({
      ...formData,
      options: updatedOptions
    });
  };
  
  // Save block
  const handleSave = () => {
    // Create a clean block object to save
    const blockToSave = {
      id: formData.id, // Preserve ID if it exists
      type: formData.type,
      title: formData.title,
      description: formData.description
    };
    
    // Add type-specific properties
    if (formData.type === 'group') {
      blockToSave.children = formData.children || [];
    } else if (formData.type === 'field') {
      blockToSave.fieldType = formData.fieldType;
      blockToSave.required = formData.required;
      
      // Add options for multiple choice/dropdown
      if (['radio', 'dropdown', 'multi_choice'].includes(formData.fieldType)) {
        blockToSave.options = formData.options;
      }
      
      // Add validation for appropriate field types
      if (['short_text', 'long_text', 'number'].includes(formData.fieldType)) {
        blockToSave.validation = {};
        
        if (formData.fieldType === 'short_text' || formData.fieldType === 'long_text') {
          if (formData.validation.minLength) {
            blockToSave.validation.minLength = parseInt(formData.validation.minLength);
          }
          if (formData.validation.maxLength) {
            blockToSave.validation.maxLength = parseInt(formData.validation.maxLength);
          }
          if (formData.validation.pattern) {
            blockToSave.validation.pattern = formData.validation.pattern;
          }
        }
        
        if (formData.fieldType === 'number') {
          if (formData.validation.minValue) {
            blockToSave.validation.minValue = parseFloat(formData.validation.minValue);
          }
          if (formData.validation.maxValue) {
            blockToSave.validation.maxValue = parseFloat(formData.validation.maxValue);
          }
          if (formData.validation.units) {
            blockToSave.validation.units = formData.validation.units;
          }
        }
      }
    } else if (formData.type === 'signature') {
      blockToSave.includeDate = true; // Default behavior
    }
    
    onSave(blockToSave);
  };
  
  // Disable type selection for certain modes
  const isTypeSelectionDisabled = ['section', 'subsection', 'subsubsection'].includes(mode);
  
  // Helper to determine if field type options should be shown
  const showFieldTypeOptions = formData.type === 'field';
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {getDialogTitle()}
      </DialogTitle>
      
      <DialogContent dividers>
        <Typography className={classes.modeLabel}>
          {getModeLabel()}
        </Typography>
        
        {/* Block Type Selection - Only for field-or-signature mode */}
        {mode === 'field-or-signature' && (
          <FormControl className={classes.formSection} fullWidth margin="normal">
            <InputLabel>Block Type</InputLabel>
            <Select
              name="type"
              value={formData.type}
              onChange={handleInputChange}
            >
              <MenuItem value="field">Field Block (Question/Data Field)</MenuItem>
              <MenuItem value="signature">Signature Block</MenuItem>
            </Select>
            <Typography className={classes.helpText}>
              Choose "Field Block" for collecting data or "Signature Block" to add a signature field.
            </Typography>
          </FormControl>
        )}
        
        {/* Common Fields */}
        <div className={classes.formSection}>
          <TextField
            fullWidth
            required
            margin="normal"
            label="Title/Label"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
          />
          <Typography className={classes.helpText}>
            {formData.type === 'group' 
              ? 'Section title that will appear in the form (e.g., "Engine Information")' 
              : 'Field label that will appear next to the input (e.g., "Serial Number")'}
          </Typography>
          
          <TextField
            fullWidth
            margin="normal"
            label="Description/Instructions"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            multiline
            rows={2}
          />
          <Typography className={classes.helpText}>
            Optional text that provides more details or instructions about this {formData.type === 'group' ? 'section' : 'field'}.
          </Typography>
        </div>
        
        <Divider className={classes.divider} />
        
        {/* Field-specific options */}
        {showFieldTypeOptions && (
          <>
            <div className={classes.formSection}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Field Type</InputLabel>
                <Select
                  name="fieldType"
                  value={formData.fieldType}
                  onChange={handleInputChange}
                >
                  {fieldTypes.map(type => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
                <Typography className={classes.helpText}>
                  Select the type of data this field will collect.
                </Typography>
              </FormControl>
              
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.required}
                    onChange={handleInputChange}
                    name="required"
                    color="primary"
                  />
                }
                label="Required Field"
              />
              <Typography className={classes.helpText}>
                If checked, users must complete this field before submitting the form.
              </Typography>
            </div>
            
            {/* Field Properties based on selected field type */}
            <div className={classes.fieldPropertiesContainer}>
              <Typography variant="subtitle1" gutterBottom>
                Field Properties
              </Typography>
              
              {/* Text field validation */}
              {(formData.fieldType === 'short_text' || formData.fieldType === 'long_text') && (
                <>
                  <TextField
                    label="Minimum Length"
                    name="minLength"
                    type="number"
                    value={formData.validation.minLength}
                    onChange={handleValidationChange}
                    margin="normal"
                  />
                  <TextField
                    label="Maximum Length"
                    name="maxLength"
                    type="number"
                    value={formData.validation.maxLength}
                    onChange={handleValidationChange}
                    margin="normal"
                    style={{ marginLeft: '16px' }}
                  />
                  <Typography className={classes.helpText}>
                    Optional: Set minimum and maximum character limits for text input.
                  </Typography>
                  
                  <TextField
                    fullWidth
                    label="Validation Pattern (RegEx)"
                    name="pattern"
                    value={formData.validation.pattern}
                    onChange={handleValidationChange}
                    margin="normal"
                    helperText="Optional: Enter a regular expression pattern for validation"
                  />
                </>
              )}
              
              {/* Number field validation */}
              {formData.fieldType === 'number' && (
                <>
                  <TextField
                    label="Minimum Value"
                    name="minValue"
                    type="number"
                    value={formData.validation.minValue}
                    onChange={handleValidationChange}
                    margin="normal"
                  />
                  <TextField
                    label="Maximum Value"
                    name="maxValue"
                    type="number"
                    value={formData.validation.maxValue}
                    onChange={handleValidationChange}
                    margin="normal"
                    style={{ marginLeft: '16px' }}
                  />
                  <TextField
                    label="Units"
                    name="units"
                    value={formData.validation.units}
                    onChange={handleValidationChange}
                    margin="normal"
                    style={{ marginLeft: '16px' }}
                    helperText="e.g. kg, cm, hours, etc."
                  />
                  <Typography className={classes.helpText}>
                    Optional: Set minimum and maximum values, and specify units of measurement.
                  </Typography>
                </>
              )}
              
              {/* Multiple choice/dropdown options */}
              {(['radio', 'dropdown', 'multi_choice'].includes(formData.fieldType)) && (
                <div className={classes.formSection}>
                  <Typography variant="subtitle2" gutterBottom>
                    Options
                  </Typography>
                  <Typography className={classes.helpText}>
                    Add the choices that will be available to the user.
                  </Typography>
                  
                  <div style={{ display: 'flex' }}>
                    <TextField
                      fullWidth
                      label="Add Option"
                      name="newOption"
                      value={formData.newOption}
                      onChange={handleInputChange}
                      margin="normal"
                    />
                    <Tooltip title="Add this option" arrow>
                      <IconButton 
                        color="primary" 
                        onClick={handleAddOption}
                        style={{ alignSelf: 'center', marginLeft: '8px' }}
                      >
                        <AddIcon />
                      </IconButton>
                    </Tooltip>
                  </div>
                  
                  {formData.options.length > 0 && (
                    <List className={classes.optionsList}>
                      {formData.options.map((option, index) => (
                        <ListItem key={index} dense>
                          <ListItemText primary={option} />
                          <ListItemSecondaryAction>
                            <Tooltip title="Remove this option" arrow>
                              <IconButton edge="end" onClick={() => handleRemoveOption(index)}>
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  )}
                </div>
              )}
            </div>
          </>
        )}
        
        {/* Signature Block Options */}
        {formData.type === 'signature' && (
          <div className={classes.formSection}>
            <Typography variant="subtitle2" gutterBottom>
              The signature block will allow users to select a signatory from 
              the authorized list and automatically insert their signature.
            </Typography>
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={true}
                  disabled
                  color="primary"
                />
              }
              label="Auto-insert date when signed"
            />
            <Typography className={classes.helpText}>
              When a signature is applied, the current date will be automatically included.
            </Typography>
          </div>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} color="default">
          Cancel
        </Button>
        <Button onClick={handleSave} color="primary" disabled={!formData.title}>
          Save {formData.type === 'group' ? 'Section' : formData.type === 'signature' ? 'Signature Field' : 'Field'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

BlockEditor.propTypes = {
  open: PropTypes.bool.isRequired,
  block: PropTypes.object,
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  mode: PropTypes.oneOf(['section', 'subsection', 'subsubsection', 'field-or-signature']).isRequired
};

export default BlockEditor;