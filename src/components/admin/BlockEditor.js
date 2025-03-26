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
  }
}));

// Field type options
const fieldTypes = [
  { value: 'short_text', label: 'Short text field' },
  { value: 'long_text', label: 'Long text area' },
  { value: 'number', label: 'Number field' },
  { value: 'date', label: 'Date picker' },
  { value: 'checkbox', label: 'Checkbox (Yes/No)' },
  { value: 'radio', label: 'Multiple choice (radio buttons)' },
  { value: 'dropdown', label: 'Dropdown menu' }
];

function BlockEditor({ open, block, onSave, onClose }) {
  const classes = useStyles();
  const [formData, setFormData] = useState({
    type: 'field', // Default type
    title: '',
    description: '',
    fieldType: 'short_text',
    required: false,
    options: [], // For multiple choice/dropdown
    validation: {
      minLength: '',
      maxLength: '',
      pattern: '',
      minValue: '',
      maxValue: '',
      units: ''
    },
    newOption: '', // Temporary state for adding options
    id: '' // Unique ID for the block
  });
  
  // Update form when block changes
  useEffect(() => {
    if (block) {
      setFormData({
        type: block.type || 'field',
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
        newOption: '',
        id: block.id || ''
      });
    }
  }, [block]);
  
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
      id: formData.id,
      type: formData.type,
      title: formData.title,
      description: formData.description
    };
    
    // Add type-specific properties
    if (formData.type === 'field') {
      blockToSave.fieldType = formData.fieldType;
      blockToSave.required = formData.required;
      
      // Add options for multiple choice/dropdown
      if (['radio', 'dropdown'].includes(formData.fieldType)) {
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
    } else if (formData.type === 'group') {
      // For group blocks, initialize an empty children array if it doesn't exist
      blockToSave.children = block && block.children ? block.children : [];
    } else if (formData.type === 'signature') {
      blockToSave.includeDate = true; // Default behavior
    }
    
    onSave(blockToSave);
  };
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {formData.type === 'group' ? 'Section' : 
         formData.type === 'signature' ? 'Signature Field' : 'Form Field'}
      </DialogTitle>
      
      <DialogContent dividers>
        {/* Block Type Selection */}
        <FormControl className={classes.formSection} fullWidth margin="normal">
          <InputLabel>Block Type</InputLabel>
          <Select
            name="type"
            value={formData.type}
            onChange={handleInputChange}
          >
            <MenuItem value="group">Group Block (Section)</MenuItem>
            <MenuItem value="field">Field Block (Question/Data Field)</MenuItem>
            <MenuItem value="signature">Signature Block</MenuItem>
          </Select>
        </FormControl>
        
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
        </div>
        
        <Divider className={classes.divider} />
        
        {/* Field-specific options */}
        {formData.type === 'field' && (
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
                    helperText="e.g. kg, cm, etc."
                  />
                </>
              )}
              
              {/* Multiple choice/dropdown options */}
              {(formData.fieldType === 'radio' || formData.fieldType === 'dropdown') && (
                <div className={classes.formSection}>
                  <Typography variant="subtitle2" gutterBottom>
                    Options
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
                    <IconButton 
                      color="primary" 
                      onClick={handleAddOption}
                      style={{ alignSelf: 'center', marginLeft: '8px' }}
                    >
                      <AddIcon />
                    </IconButton>
                  </div>
                  
                  {formData.options.length > 0 && (
                    <List className={classes.optionsList}>
                      {formData.options.map((option, index) => (
                        <ListItem key={index} dense>
                          <ListItemText primary={option} />
                          <ListItemSecondaryAction>
                            <IconButton edge="end" onClick={() => handleRemoveOption(index)}>
                              <DeleteIcon />
                            </IconButton>
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
        
        {/* Group Block Options */}
        {formData.type === 'group' && (
          <div className={classes.formSection}>
            <Typography variant="subtitle2" gutterBottom>
              This group will act as a container for related fields. You can add fields to this group after creating it.
            </Typography>
          </div>
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
          </div>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} color="default">
          Cancel
        </Button>
        <Button onClick={handleSave} color="primary" disabled={!formData.title}>
          Save Block
        </Button>
      </DialogActions>
    </Dialog>
  );
}

BlockEditor.propTypes = {
  open: PropTypes.bool.isRequired,
  block: PropTypes.object,
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired
};

export default BlockEditor;