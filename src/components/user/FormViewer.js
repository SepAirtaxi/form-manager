// src/components/user/FormViewer.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, addDoc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { generatePdf } from '../../services/pdfService';
import { sendFormEmail } from '../../services/emailService';
import { useAuth } from '../../contexts/AuthContext';

// Material UI imports
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  Radio,
  RadioGroup,
  FormLabel,
  FormGroup,
  FormHelperText,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  IconButton,
  Box,
  Stepper,
  Step,
  StepLabel,
  StepButton,
  Grid,
  Card,
  CardContent,
  Menu,
  makeStyles,
  useTheme,
  useMediaQuery
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import {
  ArrowDropDown as ArrowDropDownIcon,
  Send as SendIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon
} from '@material-ui/icons';

const useStyles = makeStyles((theme) => ({
  header: {
    // Removed background color as requested
    color: theme.palette.text.primary,
    padding: theme.spacing(2),
    borderBottom: `1px solid ${theme.palette.divider}`,
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  formMetaHeader: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  formTitle: {
    fontWeight: 500,
  },
  formDescription: {
    marginTop: theme.spacing(1),
  },
  formMeta: {
    display: 'flex',
    alignItems: 'center',
    marginTop: theme.spacing(1),
    '& > *': {
      marginRight: theme.spacing(2),
    },
  },
  subHeader: {
    backgroundColor: theme.palette.background.default,
    padding: theme.spacing(2),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: `1px solid ${theme.palette.divider}`,
    position: 'sticky',
    top: 64, // Height of the main header
    zIndex: 9,
  },
  dropdownButton: {
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(1, 2),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 500,
    boxShadow: theme.shadows[1],
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  dropdownMenu: {
    maxHeight: 300,
    overflowY: 'auto',
  },
  groupItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  completedIcon: {
    color: theme.palette.success.main,
    marginLeft: theme.spacing(1),
  },
  formContainer: {
    padding: theme.spacing(3),
    marginBottom: theme.spacing(3),
  },
  field: {
    marginBottom: theme.spacing(3),
  },
  signatureBlock: {
    marginTop: theme.spacing(3),
    padding: theme.spacing(2),
    border: `1px solid ${theme.palette.primary.main}`,
    borderRadius: theme.shape.borderRadius,
  },
  signatureImage: {
    maxWidth: '200px',
    marginTop: theme.spacing(1),
  },
  navigationButtons: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(3),
  },
  sectionTitle: {
    marginBottom: theme.spacing(2),
    fontWeight: 500,
  },
  sectionDescription: {
    marginBottom: theme.spacing(2),
    color: theme.palette.text.secondary,
  },
  progressStepper: {
    padding: theme.spacing(2, 0),
    overflow: 'auto',
    '& .MuiStepLabel-label': {
      fontSize: '0.85rem',
    },
  },
  actionButtons: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: theme.spacing(4),
    borderTop: `1px solid ${theme.palette.divider}`,
    paddingTop: theme.spacing(2),
  },
  draftLabel: {
    backgroundColor: theme.palette.warning.main,
    color: theme.palette.warning.contrastText,
    padding: theme.spacing(0.5, 1),
    borderRadius: theme.shape.borderRadius,
    fontSize: '0.75rem',
    fontWeight: 'bold',
    display: 'inline-block',
    marginLeft: theme.spacing(1),
  }
}));

function FormViewer() {
  const classes = useStyles();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { formId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const draftId = searchParams.get('draft');
  const { currentUser } = useAuth();
  
  const [form, setForm] = useState(null);
  const [signatures, setSignatures] = useState([]);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [isDraft, setIsDraft] = useState(Boolean(draftId));
  
  // Group navigation state
  const [groups, setGroups] = useState([]);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [groupCompletionStatus, setGroupCompletionStatus] = useState({});
  const [anchorEl, setAnchorEl] = useState(null);
  
  // Load form, draft (if exists), and signatures on component mount
  useEffect(() => {
    async function loadData() {
      try {
        // Load form
        const formRef = doc(db, 'forms', formId);
        const formSnap = await getDoc(formRef);
        
        if (!formSnap.exists()) {
          setError('Form not found');
          return;
        }
        
        const formData = formSnap.data();
        
        // Check if form is published
        if (!formData.published) {
          setError('This form is not available');
          return;
        }
        
        setForm(formData);
        
        // Extract groups only - we no longer handle ungrouped blocks
        const extractedGroups = [];
        
        // Process all blocks
        formData.blocks.forEach(block => {
          if (block.type === 'group') {
            // Get or create children array
            const children = block.children || [];
            extractedGroups.push({
              id: block.id || `group-${extractedGroups.length}`,
              title: block.title,
              description: block.description,
              blocks: children
            });
          }
        });
        
        // If no groups, show error
        if (extractedGroups.length === 0) {
          setError('This form has no sections to display');
          return;
        }
        
        setGroups(extractedGroups);
        
        // Initialize form data structure
        let initialFormData = {};
        
        // Initialize from all blocks in all groups
        extractedGroups.forEach(group => {
          group.blocks.forEach(block => {
            if (block.type === 'field') {
              // Set default values based on field type
              switch (block.fieldType) {
                case 'checkbox':
                  initialFormData[block.title] = false;
                  break;
                case 'radio':
                case 'dropdown':
                  initialFormData[block.title] = '';
                  break;
                case 'multi_choice':
                  initialFormData[block.title] = {}; // Object to store multiple selections
                  break;
                default:
                  initialFormData[block.title] = '';
              }
            } else if (block.type === 'signature') {
              initialFormData[block.title] = '';
            }
          });
        });
        
        // If we have a draft ID, load the draft data
        if (draftId) {
          const draftRef = doc(db, 'submissions', draftId);
          const draftSnap = await getDoc(draftRef);
          
          if (draftSnap.exists()) {
            const draftData = draftSnap.data();
            
            // Make sure this draft belongs to the current user
            if (draftData.userId !== currentUser.uid) {
              setError('You do not have permission to view this draft');
              return;
            }
            
            // Make sure this draft is for the correct form
            if (draftData.formId !== formId) {
              setError('This draft is for a different form');
              return;
            }
            
            // Use the draft data
            initialFormData = draftData.data || initialFormData;
            setIsDraft(true);
          } else {
            setError('Draft not found');
          }
        }
        
        setFormData(initialFormData);
        
        // Initialize group completion status
        initializeGroupCompletionStatus(extractedGroups, initialFormData);
        
        // Load signatures
        const signaturesQuery = collection(db, 'signatures');
        const signaturesSnap = await getDocs(signaturesQuery);
        
        const signaturesData = signaturesSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setSignatures(signaturesData);
      } catch (err) {
        setError('Error loading form: ' + err.message);
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    if (currentUser) {
      loadData();
    } else {
      setError('You must be logged in to view forms');
      setLoading(false);
    }
  }, [formId, draftId, currentUser]);
  
  // Initialize and update group completion status
  const initializeGroupCompletionStatus = (groups, formData) => {
    const status = {};
    
    groups.forEach((group, index) => {
      status[index] = checkGroupCompletion(group, formData);
    });
    
    setGroupCompletionStatus(status);
  };
  
  // Check if a group is complete (all required fields filled)
  // Updated to ensure signature blocks are always checked whether required or not
  const checkGroupCompletion = (group, data) => {
    if (!group || !group.blocks || group.blocks.length === 0) return true;
    
    for (const block of group.blocks) {
      if (block.type === 'field' && block.required) {
        const value = data[block.title];
        
        if (value === undefined || value === null || value === '') {
          return false;
        }
        
        // For multi_choice, check if at least one option is selected
        if (block.fieldType === 'multi_choice') {
          const hasSelection = Object.values(value).some(v => v === true);
          if (!hasSelection) return false;
        }
      } else if (block.type === 'signature') {
        // Always check signature blocks whether required or not
        const value = data[block.title];
        
        if (!value) {
          return false;
        }
      }
    }
    
    return true;
  };
  
  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, checked, type } = e.target;
    
    const newFormData = {
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    };
    
    setFormData(newFormData);
    
    // Clear validation error when field is changed
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
    
    // Update group completion status
    const updatedStatus = { ...groupCompletionStatus };
    
    groups.forEach((group, index) => {
      updatedStatus[index] = checkGroupCompletion(group, newFormData);
    });
    
    setGroupCompletionStatus(updatedStatus);
  };
  
  // Handle dropdown menu opening
  const handleOpenDropdown = (event) => {
    setAnchorEl(event.currentTarget);
    setDropdownOpen(true);
  };
  
  // Handle dropdown menu closing
  const handleCloseDropdown = () => {
    setAnchorEl(null);
    setDropdownOpen(false);
  };
  
  // Navigate to a specific group
  const handleGroupChange = (index) => {
    setCurrentGroupIndex(index);
    handleCloseDropdown();
  };
  
  // Navigate to next group
  const handleNextGroup = () => {
    if (currentGroupIndex < groups.length - 1) {
      setCurrentGroupIndex(currentGroupIndex + 1);
    }
  };
  
  // Navigate to previous group
  const handlePrevGroup = () => {
    if (currentGroupIndex > 0) {
      setCurrentGroupIndex(currentGroupIndex - 1);
    }
  };
  
  // Validate form before submission
  const validateForm = () => {
    const newErrors = {};
    let isValid = true;
    
    // Check each required field in all groups
    groups.forEach(group => {
      group.blocks.forEach(block => {
        if (block.type === 'field' && block.required) {
          const value = formData[block.title];
          
          if (value === '' || value === null || value === undefined) {
            newErrors[block.title] = 'This field is required';
            isValid = false;
          }
          
          // For multi_choice, check if at least one option is selected
          if (block.fieldType === 'multi_choice') {
            const hasSelection = Object.values(value).some(v => v === true);
            if (!hasSelection) {
              newErrors[block.title] = 'Please select at least one option';
              isValid = false;
            }
          }
        } else if (block.type === 'signature') {
          const value = formData[block.title];
          
          if (!value) {
            newErrors[block.title] = 'Signature is required';
            isValid = false;
          }
        }
      });
    });
    
    setErrors(newErrors);
    return isValid;
  };
  
  // Save form as draft
  const handleSaveDraft = async () => {
    if (!currentUser) {
      setError('You must be logged in to save drafts');
      return;
    }
    
    setSavingDraft(true);
    
    try {
      // Prepare submission data
      const submissionData = {
        formId,
        formTitle: form.title,
        formRevision: form.revision,
        userId: currentUser.uid,
        data: formData,
        status: 'draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      if (isDraft && draftId) {
        // Update existing draft
        const draftRef = doc(db, 'submissions', draftId);
        await updateDoc(draftRef, {
          data: formData,
          updatedAt: serverTimestamp()
        });
      } else {
        // Create new draft
        const submissionRef = await addDoc(collection(db, 'submissions'), submissionData);
        // Update URL with draft ID for bookmarking/sharing
        navigate(`/form/${formId}?draft=${submissionRef.id}`, { replace: true });
        setIsDraft(true);
      }
      
      setDraftSaved(true);
    } catch (err) {
      setError('Error saving draft: ' + err.message);
      console.error(err);
    } finally {
      setSavingDraft(false);
    }
  };
  
  // Open submission confirmation dialog
  const handleSubmitClick = () => {
    if (validateForm()) {
      setConfirmDialogOpen(true);
    } else {
      // Find the first group with errors and navigate to it
      let groupWithError = -1;
      
      for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        for (const block of group.blocks) {
          if (errors[block.title]) {
            groupWithError = i;
            break;
          }
        }
        if (groupWithError !== -1) break;
      }
      
      if (groupWithError !== -1) {
        setCurrentGroupIndex(groupWithError);
      }
    }
  };
  
  // Submit form
  const handleSubmitForm = async () => {
    setConfirmDialogOpen(false);
    setSubmitting(true);
    
    try {
      // Create submission document
      const submissionData = {
        formId,
        formTitle: form.title,
        formRevision: form.revision,
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email,
        data: formData,
        status: 'submitted',
        submittedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // If this was a draft, include the draft ID
      if (isDraft && draftId) {
        submissionData.draftId = draftId;
      }
      
      // Add to Firestore
      const submissionRef = await addDoc(collection(db, 'submissions'), submissionData);
      
      // Generate PDF
      const pdfBlob = await generatePdf(form, formData, signatures);
      
      // Send email with PDF
      await sendFormEmail(form.title, pdfBlob);
      
      // If this was a draft, delete the draft (it's now submitted)
      if (isDraft && draftId) {
        try {
          await deleteDoc(doc(db, 'submissions', draftId));
        } catch (error) {
          console.error('Error deleting draft after submission:', error);
          // Non-critical error, don't need to show to user
        }
      }
      
      // Show success dialog
      setSuccessDialogOpen(true);
      
    } catch (err) {
      setError('Error submitting form: ' + err.message);
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };
  
  // Close confirmation dialog
  const handleCancelSubmit = () => {
    setConfirmDialogOpen(false);
  };
  
  // Navigate back to form list after successful submission
  const handleSuccessClose = () => {
    setSuccessDialogOpen(false);
    navigate('/dashboard');
  };
  
  // Close draft saved message
  const handleDraftSavedClose = () => {
    setDraftSaved(false);
  };
  
  // Render a field based on its type
  const renderField = (block) => {
    switch (block.fieldType) {
      case 'short_text':
        return (
          <TextField
            fullWidth
            label={block.title}
            name={block.title}
            value={formData[block.title] || ''}
            onChange={handleInputChange}
            variant="outlined"
            required={block.required}
            error={Boolean(errors[block.title])}
            helperText={errors[block.title] || block.description || ''}
            InputProps={{
              inputProps: {
                minLength: block.validation?.minLength,
                maxLength: block.validation?.maxLength,
                pattern: block.validation?.pattern
              }
            }}
          />
        );
        
      case 'long_text':
        return (
          <TextField
            fullWidth
            label={block.title}
            name={block.title}
            value={formData[block.title] || ''}
            onChange={handleInputChange}
            variant="outlined"
            multiline
            rows={4}
            required={block.required}
            error={Boolean(errors[block.title])}
            helperText={errors[block.title] || block.description || ''}
            InputProps={{
              inputProps: {
                minLength: block.validation?.minLength,
                maxLength: block.validation?.maxLength
              }
            }}
          />
        );
        
      case 'number':
        return (
          <TextField
            fullWidth
            type="number"
            label={`${block.title}${block.validation?.units ? ` (${block.validation.units})` : ''}`}
            name={block.title}
            value={formData[block.title] || ''}
            onChange={handleInputChange}
            variant="outlined"
            required={block.required}
            error={Boolean(errors[block.title])}
            helperText={errors[block.title] || block.description || ''}
            InputProps={{
              inputProps: {
                min: block.validation?.minValue,
                max: block.validation?.maxValue
              }
            }}
          />
        );
        
      case 'date':
        return (
          <TextField
            fullWidth
            type="date"
            label={block.title}
            name={block.title}
            value={formData[block.title] || ''}
            onChange={handleInputChange}
            variant="outlined"
            required={block.required}
            error={Boolean(errors[block.title])}
            helperText={errors[block.title] || block.description || ''}
            InputLabelProps={{
              shrink: true,
            }}
          />
        );
        
      case 'checkbox':
        return (
          <FormControl 
            component="fieldset" 
            error={Boolean(errors[block.title])}
            required={block.required}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={Boolean(formData[block.title])}
                  onChange={handleInputChange}
                  name={block.title}
                  color="primary"
                />
              }
              label={block.title}
            />
            {(errors[block.title] || block.description) && (
              <FormHelperText>{errors[block.title] || block.description}</FormHelperText>
            )}
          </FormControl>
        );
        
      case 'radio':
        return (
          <FormControl 
            component="fieldset" 
            error={Boolean(errors[block.title])}
            required={block.required}
            className={classes.field}
          >
            <FormLabel component="legend">{block.title}</FormLabel>
            <RadioGroup
              name={block.title}
              value={formData[block.title] || ''}
              onChange={handleInputChange}
            >
              {(block.options || []).map((option, index) => (
                <FormControlLabel
                  key={index}
                  value={option}
                  control={<Radio />}
                  label={option}
                />
              ))}
            </RadioGroup>
            {(errors[block.title] || block.description) && (
              <FormHelperText>{errors[block.title] || block.description}</FormHelperText>
            )}
          </FormControl>
        );
        
      case 'multi_choice':
        // New field type for multiple choice with checkboxes
        return (
          <FormControl 
            component="fieldset" 
            error={Boolean(errors[block.title])}
            required={block.required}
            className={classes.field}
          >
            <FormLabel component="legend">{block.title}</FormLabel>
            <FormGroup>
              {(block.options || []).map((option, index) => (
                <FormControlLabel
                  key={index}
                  control={
                    <Checkbox
                      checked={Boolean(formData[block.title]?.[option])}
                      onChange={(e) => {
                        const newValue = {
                          ...(formData[block.title] || {}),
                          [option]: e.target.checked
                        };
                        handleInputChange({
                          target: {
                            name: block.title,
                            value: newValue
                          }
                        });
                      }}
                      name={`${block.title}.${option}`}
                      color="primary"
                    />
                  }
                  label={option}
                />
              ))}
            </FormGroup>
            {(errors[block.title] || block.description) && (
              <FormHelperText>{errors[block.title] || block.description}</FormHelperText>
            )}
          </FormControl>
        );
        
      case 'dropdown':
        return (
          <FormControl 
            fullWidth 
            variant="outlined"
            error={Boolean(errors[block.title])}
            required={block.required}
            className={classes.field}
          >
            <InputLabel>{block.title}</InputLabel>
            <Select
              name={block.title}
              value={formData[block.title] || ''}
              onChange={handleInputChange}
              label={block.title}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {(block.options || []).map((option, index) => (
                <MenuItem key={index} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
            {(errors[block.title] || block.description) && (
              <FormHelperText>{errors[block.title] || block.description}</FormHelperText>
            )}
          </FormControl>
        );
        
      default:
        return null;
    }
  };
  
  // Render a signature block
  const renderSignatureBlock = (block) => {
    const selectedSignature = signatures.find(
      sig => sig.id === formData[block.title]
    );
    
    return (
      <div className={classes.signatureBlock}>
        <Typography variant="h6" gutterBottom>
          {block.title}
        </Typography>
        
        {block.description && (
          <Typography variant="body2" gutterBottom>
            {block.description}
          </Typography>
        )}
        
        <FormControl 
          fullWidth
          variant="outlined"
          error={Boolean(errors[block.title])}
          required
        >
          <InputLabel>Select Signatory</InputLabel>
          <Select
            name={block.title}
            value={formData[block.title] || ''}
            onChange={handleInputChange}
            label="Select Signatory"
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {signatures.map((signature) => (
              <MenuItem key={signature.id} value={signature.id}>
                {signature.name} - {signature.title}
              </MenuItem>
            ))}
          </Select>
          {errors[block.title] && (
            <FormHelperText>{errors[block.title]}</FormHelperText>
          )}
        </FormControl>
        
        {selectedSignature && (
          <div>
            <Typography variant="subtitle2" style={{ marginTop: '8px' }}>
              Signature preview:
            </Typography>
            
            {selectedSignature.signatureBase64 ? (
              <img 
                src={selectedSignature.signatureBase64} 
                alt={`${selectedSignature.name}'s signature`}
                className={classes.signatureImage}
              />
            ) : (
              <Typography variant="body2" color="textSecondary">
                No signature image available
              </Typography>
            )}
            
            <Typography variant="body2">
              Date: {new Date().toLocaleDateString()}
            </Typography>
          </div>
        )}
      </div>
    );
  };

  // Render form meta information
  const renderFormMetaInfo = () => {
    if (!form) return null;
    
    return (
      <div className={classes.formMetaHeader}>
        <Typography variant="h5" className={classes.formTitle}>
          {form.title}
          {isDraft && (
            <span className={classes.draftLabel}>DRAFT</span>
          )}
        </Typography>
        
        {form.description && (
          <Typography variant="body1" className={classes.formDescription}>
            {form.description}
          </Typography>
        )}
        
        <div className={classes.formMeta}>
          <Typography variant="caption">
            Revision: {form.revision || '1.0'}
          </Typography>
          
          {form.department && (
            <Typography variant="caption">
              Department: {form.department}
            </Typography>
          )}
        </div>
      </div>
    );
  };

  // Render the current group
  const renderCurrentGroup = () => {
    if (!groups || groups.length === 0 || currentGroupIndex >= groups.length) {
      return (
        <Typography>No form sections available</Typography>
      );
    }
    
    const currentGroup = groups[currentGroupIndex];
    
    return (
      <div>
        <Typography variant="h5" className={classes.sectionTitle}>
          {currentGroup.title}
        </Typography>
        
        {currentGroup.description && (
          <Typography variant="body2" className={classes.sectionDescription}>
            {currentGroup.description}
          </Typography>
        )}
        
        <Divider style={{ marginBottom: '24px' }} />
        
        {currentGroup.blocks.map((block, index) => (
          <div key={index} className={classes.field}>
            {block.type === 'field' && renderField(block)}
            {block.type === 'signature' && renderSignatureBlock(block)}
          </div>
        ))}
      </div>
    );
  };
  
  // Render a stepper for group navigation (alternative to dropdown on larger screens)
  const renderStepper = () => {
    if (!groups || groups.length <= 1) return null;
    
    return (
      <Box className={classes.progressStepper}>
        <Stepper activeStep={currentGroupIndex} nonLinear alternativeLabel>
          {groups.map((group, index) => (
            <Step key={index}>
              <StepButton 
                onClick={() => handleGroupChange(index)}
                completed={groupCompletionStatus[index]}
              >
                {group.title}
              </StepButton>
            </Step>
          ))}
        </Stepper>
      </Box>
    );
  };
  
  if (loading) {
    return (
      <Container>
        <Box mt={8} display="flex" justifyContent="center">
          <Typography variant="h6">Loading form...</Typography>
        </Box>
      </Container>
    );
  }
  
  if (error) {
    return (
      <Container>
        <Box mt={8}>
          <Typography color="error" variant="h6">{error}</Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/dashboard')}
            style={{ marginTop: '16px' }}
          >
            Back to Dashboard
          </Button>
        </Box>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg">
      <Card>
        {/* Form Meta Information - Always visible */}
        {renderFormMetaInfo()}
        
        {/* Section Navigation */}
        <div className={classes.subHeader}>
          <Box width="100%">
            {/* Group dropdown for mobile and desktop */}
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <div style={{ flex: 1 }}>
                <Button
                  id="section-dropdown-button"
                  className={classes.dropdownButton}
                  onClick={handleOpenDropdown}
                  aria-haspopup="true"
                  aria-expanded={dropdownOpen ? 'true' : 'false'}
                  fullWidth
                >
                  <Box display="flex" alignItems="center" width="100%">
                    <Typography variant="subtitle1" noWrap style={{ flex: 1, textAlign: 'left' }}>
                      {currentGroupIndex >= 0 && groups[currentGroupIndex] 
                        ? groups[currentGroupIndex].title 
                        : 'Select section'}
                    </Typography>
                    {groupCompletionStatus[currentGroupIndex] && (
                      <CheckCircleIcon className={classes.completedIcon} fontSize="small" />
                    )}
                    <ArrowDropDownIcon />
                  </Box>
                </Button>
                
                <Menu
                  id="section-menu"
                  anchorEl={anchorEl}
                  keepMounted
                  open={dropdownOpen}
                  onClose={handleCloseDropdown}
                  getContentAnchorEl={null}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                  }}
                  PaperProps={{
                    className: classes.dropdownMenu
                  }}
                >
                  {groups.map((group, index) => (
                    <MenuItem 
                      key={index} 
                      onClick={() => handleGroupChange(index)}
                      selected={index === currentGroupIndex}
                    >
                      <div className={classes.groupItem}>
                        <Typography variant="body1">{group.title}</Typography>
                        {groupCompletionStatus[index] && (
                          <CheckCircleIcon className={classes.completedIcon} fontSize="small" />
                        )}
                      </div>
                    </MenuItem>
                  ))}
                </Menu>
              </div>
            </Box>
          </Box>
        </div>
        
        {/* Form Content */}
        <CardContent className={classes.formContainer}>
          {/* Render only on larger screens */}
          {!isMobile && groups.length > 1 && renderStepper()}
          
          {/* Current Group Content */}
          {renderCurrentGroup()}
          
          {/* Group Navigation Buttons */}
          {groups.length > 1 && (
            <div className={classes.navigationButtons}>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<ArrowBackIcon />}
                onClick={handlePrevGroup}
                disabled={currentGroupIndex === 0}
              >
                Previous Section
              </Button>
              
              <Button
                variant="outlined"
                color="primary"
                endIcon={<ArrowForwardIcon />}
                onClick={handleNextGroup}
                disabled={currentGroupIndex === groups.length - 1}
              >
                Next Section
              </Button>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className={classes.actionButtons}>
            <Button
              variant="outlined"
              color="primary"
              size="large"
              startIcon={<SaveIcon />}
              onClick={handleSaveDraft}
              disabled={savingDraft}
            >
              {savingDraft ? 'Saving...' : (isDraft ? 'Update Draft' : 'Save as Draft')}
            </Button>
            
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<SendIcon />}
              onClick={handleSubmitClick}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Form'}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={handleCancelSubmit}
      >
        <DialogTitle>Confirm Submission</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to submit this form? Once submitted, you won't be able to make changes.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelSubmit} color="default">
            Cancel
          </Button>
          <Button onClick={handleSubmitForm} color="primary" autoFocus>
            Submit
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Success Dialog */}
      <Dialog
        open={successDialogOpen}
        onClose={handleSuccessClose}
      >
        <DialogTitle>Form Submitted Successfully</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Your form has been submitted successfully. A PDF copy has been emailed to management.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSuccessClose} color="primary" autoFocus>
            Return to Dashboard
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Draft Saved Snackbar */}
      <Snackbar
        open={draftSaved}
        autoHideDuration={6000}
        onClose={handleDraftSavedClose}
      >
        <Alert onClose={handleDraftSavedClose} severity="success">
          Form draft saved successfully. You can continue editing later.
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default FormViewer;