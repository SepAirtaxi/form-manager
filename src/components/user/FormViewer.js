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
  AppBar,
  Toolbar,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  makeStyles
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import {
  ArrowBack as ArrowBackIcon,
  Send as SendIcon,
  Save as SaveIcon
} from '@material-ui/icons';

const useStyles = makeStyles((theme) => ({
  appBarSpacer: theme.mixins.toolbar,
  title: {
    flexGrow: 1,
  },
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
  }
}));

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
        
        // Initialize form data structure
        let initialFormData = {};
        formData.blocks.forEach(block => {
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
              default:
                initialFormData[block.title] = '';
            }
          } else if (block.type === 'signature') {
            initialFormData[block.title] = '';
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
  
  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, checked, type } = e.target;
    
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
    
    // Clear validation error when field is changed
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };
  
  // Validate form before submission
  const validateForm = () => {
    const newErrors = {};
    let isValid = true;
    
    // Check each required field
    form.blocks.forEach(block => {
      if (block.type === 'field' && block.required) {
        const value = formData[block.title];
        
        if (value === '' || value === null || value === undefined) {
          newErrors[block.title] = 'This field is required';
          isValid = false;
        }
      } else if (block.type === 'signature') {
        const value = formData[block.title];
        
        if (!value) {
          newErrors[block.title] = 'Signature is required';
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

  // Render a form block based on its type
  const renderBlock = (block, index) => {
    switch (block.type) {
      case 'group':
        return (
          <div key={index} className={classes.groupBlock}>
            <Typography variant="h6" gutterBottom>
              {block.title}
            </Typography>
            
            {block.description && (
              <Typography variant="body2" gutterBottom>
                {block.description}
              </Typography>
            )}
            
            <Divider className={classes.divider} />
            
            {/* Here you would render nested blocks within the group */}
          </div>
        );
        
      case 'field':
        return (
          <div key={index} className={classes.field}>
            {renderField(block)}
          </div>
        );
        
      case 'signature':
        return (
          <div key={index} className={classes.field}>
            {renderSignatureBlock(block)}
          </div>
        );
        
      default:
        return null;
    }
  };
  
  if (loading) {
    return (
      <Container>
        <div className={classes.appBarSpacer} />
        <Typography variant="h6">Loading form...</Typography>
      </Container>
    );
  }
  
  if (error) {
    return (
      <Container>
        <div className={classes.appBarSpacer} />
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
    <>
      <AppBar position="fixed">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" className={classes.title}>
            Form Completion
            {isDraft && (
              <span className={classes.draftLabel}>DRAFT</span>
            )}
          </Typography>
        </Toolbar>
      </AppBar>

      <div className={classes.appBarSpacer} />
      
      <Container className={classes.container}>
        <Paper className={classes.paper}>
          <div className={classes.formHeader}>
            <Typography variant="h4" gutterBottom>
              {form.title}
            </Typography>
            
            {form.description && (
              <Typography variant="body1">
                {form.description}
              </Typography>
            )}
            
            <Typography variant="subtitle2" color="textSecondary">
              Revision: {form.revision || '1.0'}
            </Typography>
          </div>
          
          <Divider />
          
          <div>
            {form.blocks.map((block, index) => renderBlock(block, index))}
          </div>
          
          <div className={classes.buttonsContainer}>
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
        </Paper>
      </Container>
      
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
    </>
  );
}

export default FormViewer;