// src/components/user/FormViewer.js
import React, { useState, useEffect, useRef } from 'react';
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
  Tabs,
  Tab,
  Box,
  Drawer,
  ListItem,
  ListItemText,
  List,
  ListItemIcon,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Hidden,
  makeStyles
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import {
  Send as SendIcon,
  Save as SaveIcon,
  CheckCircle as CompleteIcon,
  RadioButtonUnchecked as IncompleteIcon,
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon
} from '@material-ui/icons';

const useStyles = makeStyles((theme) => ({
  container: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
  },
  paper: {
    padding: theme.spacing(3),
    marginBottom: theme.spacing(3),
  },
  formHeader: {
    marginBottom: theme.spacing(3),
  },
  field: {
    marginBottom: theme.spacing(3),
  },
  divider: {
    margin: theme.spacing(2, 0),
  },
  groupBlock: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(3),
    backgroundColor: theme.palette.background.default,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
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
  buttonsContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: theme.spacing(3),
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
  },
  navigationDrawer: {
    width: 280,
    flexShrink: 0,
  },
  drawer: {
    width: 280,
    flexShrink: 0,
  },
  drawerPaper: {
    width: 280,
    paddingTop: theme.spacing(2),
  },
  content: {
    flexGrow: 1,
    marginLeft: 0,
    [theme.breakpoints.up('md')]: {
      marginLeft: 280,
    },
  },
  tabPanel: {
    padding: theme.spacing(3),
  },
  completeIcon: {
    color: theme.palette.success.main,
  },
  incompleteIcon: {
    color: theme.palette.text.disabled,
  },
  activeTab: {
    borderLeft: `4px solid ${theme.palette.primary.main}`,
    backgroundColor: theme.palette.action.selected,
  },
  navigationButtons: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: theme.spacing(4),
  },
  bottomButtons: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: theme.spacing(3),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[1],
    position: 'sticky',
    bottom: 0,
    zIndex: 10,
  },
  stepperContainer: {
    padding: theme.spacing(2, 0),
    marginBottom: theme.spacing(2),
  }
}));

// Tab Panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`form-tabpanel-${index}`}
      aria-labelledby={`form-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box p={3}>
          {children}
        </Box>
      )}
    </div>
  );
}

function FormViewer() {
  const classes = useStyles();
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
  
  // Tab navigation state
  const [activeTab, setActiveTab] = useState(0);
  const [tabGroups, setTabGroups] = useState([]);
  const [groupCompletionStatus, setGroupCompletionStatus] = useState({});
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  
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
        
        // Process the form blocks to extract group structure
        const { processedGroups, flatBlocks } = processFormStructure(formData.blocks);
        const formWithProcessedBlocks = {
          ...formData,
          processedGroups,
          flatBlocks
        };
        
        setForm(formWithProcessedBlocks);
        setTabGroups(processedGroups);
        
        // Initialize form data structure
        let initialFormData = {};
        flatBlocks.forEach(block => {
          if (block.type === 'field') {
            // Set default values based on field type
            switch (block.fieldType) {
              case 'checkbox':
                initialFormData[block.id] = false;
                break;
              case 'radio':
              case 'dropdown':
                initialFormData[block.id] = '';
                break;
              default:
                initialFormData[block.id] = '';
            }
          } else if (block.type === 'signature') {
            initialFormData[block.id] = '';
          }
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
        updateGroupCompletionStatus(initialFormData, processedGroups, flatBlocks);
        
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
  
  // Process form blocks to extract group structure
  const processFormStructure = (blocks) => {
    // Start with a default 'General' group for ungrouped fields
    const processedGroups = [
      {
        id: 'general',
        title: 'General',
        description: 'General form fields',
        index: 0,
        blocks: []
      }
    ];
    
    // Flatten all blocks for easier validation
    const flatBlocks = [];
    
    // Function to process blocks recursively
    const processBlocks = (blockList, parentGroupId = 'general') => {
      blockList.forEach(block => {
        // Add ID if missing
        if (!block.id) {
          block.id = `block_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        }
        
        // Add the block to the flat list
        flatBlocks.push(block);
        
        if (block.type === 'group') {
          // Create a new group
          const groupIndex = processedGroups.length;
          processedGroups.push({
            ...block,
            index: groupIndex,
            blocks: []
          });
          
          // Process children if any
          if (block.children && block.children.length > 0) {
            processBlocks(block.children, block.id);
          }
        } else {
          // Add this block to its parent group's blocks
          const parentGroup = processedGroups.find(g => g.id === parentGroupId);
          if (parentGroup) {
            parentGroup.blocks.push(block);
          } else {
            // Fallback to general group
            processedGroups[0].blocks.push(block);
          }
        }
      });
    };
    
    // Process the blocks
    processBlocks(blocks);
    
    // If General group has no blocks, remove it
    if (processedGroups[0].blocks.length === 0 && processedGroups.length > 1) {
      processedGroups.shift();
      // Update indices
      processedGroups.forEach((group, index) => {
        group.index = index;
      });
    }
    
    return { processedGroups, flatBlocks };
  };
  
  // Update group completion status
  const updateGroupCompletionStatus = (data, groups, blocks) => {
    const newCompletionStatus = {};
    
    groups.forEach(group => {
      // Find all required fields in this group
      const requiredFields = group.blocks.filter(
        blockId => {
          const block = blocks.find(b => b.id === blockId || b.id === blockId.id);
          return block && block.type === 'field' && block.required;
        }
      );
      
      // Check if all required fields are filled
      const allRequiredFieldsFilled = requiredFields.every(field => {
        const block = blocks.find(b => b.id === field.id);
        const value = data[block.id];
        return value !== '' && value !== null && value !== undefined;
      });
      
      newCompletionStatus[group.id] = allRequiredFieldsFilled;
    });
    
    setGroupCompletionStatus(newCompletionStatus);
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
    if (form) {
      updateGroupCompletionStatus(newFormData, form.processedGroups, form.flatBlocks);
    }
  };
  
  // Change tab
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setMobileDrawerOpen(false);
  };
  
  // Handle next group
  const handleNextGroup = () => {
    if (activeTab < tabGroups.length - 1) {
      setActiveTab(activeTab + 1);
    }
  };
  
  // Handle previous group
  const handlePrevGroup = () => {
    if (activeTab > 0) {
      setActiveTab(activeTab - 1);
    }
  };
  
  // Toggle mobile drawer
  const toggleMobileDrawer = () => {
    setMobileDrawerOpen(!mobileDrawerOpen);
  };
  
  // Validate form before submission
  const validateForm = () => {
    const newErrors = {};
    let isValid = true;
    
    // Check each required field
    form.flatBlocks.forEach(block => {
      if (block.type === 'field' && block.required) {
        const value = formData[block.id];
        
        if (value === '' || value === null || value === undefined) {
          newErrors[block.id] = 'This field is required';
          isValid = false;
        }
      } else if (block.type === 'signature') {
        const value = formData[block.id];
        
        if (!value) {
          newErrors[block.id] = 'Signature is required';
          isValid = false;
        }
      }
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
        userName: currentUser.displayName || currentUser.email,
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
      // Find the first group with errors
      const groupWithErrors = tabGroups.findIndex(group => 
        group.blocks.some(block => errors[block.id])
      );
      
      if (groupWithErrors !== -1) {
        setActiveTab(groupWithErrors);
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
            name={block.id}
            value={formData[block.id] || ''}
            onChange={handleInputChange}
            variant="outlined"
            required={block.required}
            error={Boolean(errors[block.id])}
            helperText={errors[block.id] || block.description || ''}
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
            name={block.id}
            value={formData[block.id] || ''}
            onChange={handleInputChange}
            variant="outlined"
            multiline
            rows={4}
            required={block.required}
            error={Boolean(errors[block.id])}
            helperText={errors[block.id] || block.description || ''}
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
            name={block.id}
            value={formData[block.id] || ''}
            onChange={handleInputChange}
            variant="outlined"
            required={block.required}
            error={Boolean(errors[block.id])}
            helperText={errors[block.id] || block.description || ''}
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
            name={block.id}
            value={formData[block.id] || ''}
            onChange={handleInputChange}
            variant="outlined"
            required={block.required}
            error={Boolean(errors[block.id])}
            helperText={errors[block.id] || block.description || ''}
            InputLabelProps={{
              shrink: true,
            }}
          />
        );
        
      case 'checkbox':
        return (
          <FormControl 
            component="fieldset" 
            error={Boolean(errors[block.id])}
            required={block.required}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={Boolean(formData[block.id])}
                  onChange={handleInputChange}
                  name={block.id}
                  color="primary"
                />
              }
              label={block.title}
            />
            {(errors[block.id] || block.description) && (
              <FormHelperText>{errors[block.id] || block.description}</FormHelperText>
            )}
          </FormControl>
        );
        
      case 'radio':
        return (
          <FormControl 
            component="fieldset" 
            error={Boolean(errors[block.id])}
            required={block.required}
            className={classes.field}
          >
            <FormLabel component="legend">{block.title}</FormLabel>
            <RadioGroup
              name={block.id}
              value={formData[block.id] || ''}
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
            {(errors[block.id] || block.description) && (
              <FormHelperText>{errors[block.id] || block.description}</FormHelperText>
            )}
          </FormControl>
        );
        
      case 'dropdown':
        return (
          <FormControl 
            fullWidth 
            variant="outlined"
            error={Boolean(errors[block.id])}
            required={block.required}
            className={classes.field}
          >
            <InputLabel>{block.title}</InputLabel>
            <Select
              name={block.id}
              value={formData[block.id] || ''}
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
            {(errors[block.id] || block.description) && (
              <FormHelperText>{errors[block.id] || block.description}</FormHelperText>
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
      sig => sig.id === formData[block.id]
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
          error={Boolean(errors[block.id])}
          required
        >
          <InputLabel>Select Signatory</InputLabel>
          <Select
            name={block.id}
            value={formData[block.id] || ''}
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
          {errors[block.id] && (
            <FormHelperText>{errors[block.id]}</FormHelperText>
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

  // Mobile drawer content with group navigation
  const navigationDrawerContent = (
    <div>
      <List>
        {tabGroups.map((group, index) => (
          <ListItem
            button
            key={group.id}
            onClick={() => handleTabChange(null, index)}
            className={activeTab === index ? classes.activeTab : ''}
          >
            <ListItemIcon>
              {groupCompletionStatus[group.id] ? (
                <CompleteIcon className={classes.completeIcon} />
              ) : (
                <IncompleteIcon className={classes.incompleteIcon} />
              )}
            </ListItemIcon>
            <ListItemText primary={group.title} />
          </ListItem>
        ))}
      </List>
    </div>
  );
  
  // Render the form content
  const renderFormContent = () => {
    if (!form || !tabGroups || tabGroups.length === 0) {
      return <Typography>No form content available.</Typography>;
    }
    
    return (
      <div>
        {/* Mobile Stepper */}
        <Hidden mdUp>
          <div className={classes.stepperContainer}>
            <Stepper activeStep={activeTab} alternativeLabel>
              {tabGroups.map((group) => (
                <Step key={group.id}>
                  <StepLabel>{group.title}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </div>
        </Hidden>
        
        {/* Tab Content */}
        {tabGroups.map((group, index) => (
          <TabPanel value={activeTab} index={index} key={group.id} className={classes.tabPanel}>
            <Typography variant="h5" gutterBottom>
              {group.title}
            </Typography>
            
            {group.description && (
              <Typography variant="body2" paragraph>
                {group.description}
              </Typography>
            )}
            
            <Divider className={classes.divider} />
            
            {/* Render blocks in this group */}
            {group.blocks.map((block) => (
              <div key={block.id} className={classes.field}>
                {block.type === 'field' && renderField(block)}
                {block.type === 'signature' && renderSignatureBlock(block)}
              </div>
            ))}
            
            {/* Navigation buttons */}
            <div className={classes.navigationButtons}>
              <Button
                color="primary"
                startIcon={<PrevIcon />}
                onClick={handlePrevGroup}
                disabled={index === 0}
              >
                Previous
              </Button>
              <Button
                color="primary"
                endIcon={<NextIcon />}
                onClick={handleNextGroup}
                disabled={index === tabGroups.length - 1}
              >
                Next
              </Button>
            </div>
          </TabPanel>
        ))}
      </div>
    );
  };
  
  if (loading) {
    return (
      <Container className={classes.container} style={{ textAlign: 'center', paddingTop: '40px' }}>
        <CircularProgress />
        <Typography variant="h6" style={{ marginTop: '20px' }}>Loading form...</Typography>
      </Container>
    );
  }
  
  if (error) {
    return (
      <Container className={classes.container}>
        <Typography color="error" variant="h6">{error}</Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate('/dashboard')}
          style={{ marginTop: '16px' }}
        >
          Back to Dashboard
        </Button>
      </Container>
    );
  }
  
  return (
    <div>
      {/* Form Header */}
      <Paper className={classes.paper}>
        <div className={classes.formHeader}>
          <Typography variant="h4" gutterBottom>
            {form?.title}
            {isDraft && (
              <span className={classes.draftLabel}>DRAFT</span>
            )}
          </Typography>
          
          {form?.description && (
            <Typography variant="body1">
              {form.description}
            </Typography>
          )}
          
          <Typography variant="subtitle2" color="textSecondary">
            Revision: {form?.revision || '1.0'}
          </Typography>
        </div>
      </Paper>

      {/* Main Content with Navigation */}
      <div style={{ display: 'flex' }}>
        {/* Desktop Navigation Drawer */}
        <Hidden smDown>
          <Drawer
            className={classes.drawer}
            variant="permanent"
            classes={{
              paper: classes.drawerPaper,
            }}
            anchor="left"
          >
            {navigationDrawerContent}
          </Drawer>
        </Hidden>
        
        {/* Mobile Navigation Drawer */}
        <Hidden mdUp>
          <Drawer
            variant="temporary"
            open={mobileDrawerOpen}
            onClose={toggleMobileDrawer}
            classes={{
              paper: classes.drawerPaper,
            }}
            ModalProps={{
              keepMounted: true, // Better mobile performance
            }}
          >
            {navigationDrawerContent}
          </Drawer>
        </Hidden>
        
        {/* Main Content */}
        <Container className={classes.content}>
          {renderFormContent()}
          
          {/* Bottom Actions */}
          <Paper className={classes.bottomButtons}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<SaveIcon />}
              onClick={handleSaveDraft}
              disabled={savingDraft}
            >
              {savingDraft ? 'Saving...' : (isDraft ? 'Update Draft' : 'Save as Draft')}
            </Button>
            
            <Button
              variant="contained"
              color="primary"
              startIcon={<SendIcon />}
              onClick={handleSubmitClick}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Form'}
            </Button>
          </Paper>
        </Container>
      </div>
      
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
    </div>
  );
}

export default FormViewer;