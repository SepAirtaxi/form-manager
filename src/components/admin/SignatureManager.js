// src/components/admin/SignatureManager.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, deleteDoc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

// Material UI imports
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  useMediaQuery,
  makeStyles,
  useTheme
} from '@material-ui/core';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@material-ui/icons';

const useStyles = makeStyles((theme) => ({
  container: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
    maxWidth: '1000px',
  },
  pageTitle: {
    marginBottom: theme.spacing(4),
  },
  card: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  cardMedia: {
    paddingTop: '56.25%', // 16:9
    backgroundSize: 'contain',
  },
  cardContent: {
    flexGrow: 1,
  },
  signatureTitle: {
    fontWeight: 'bold',
  },
  addButton: {
    marginBottom: theme.spacing(3),
  },
  form: {
    '& > *': {
      margin: theme.spacing(1),
    },
  },
  signaturePreview: {
    maxWidth: '100%',
    maxHeight: '150px',
    marginTop: theme.spacing(2),
  },
  mobileWarning: {
    padding: theme.spacing(3),
    margin: theme.spacing(2),
    backgroundColor: theme.palette.warning.light,
    borderRadius: theme.shape.borderRadius,
    textAlign: 'center',
  }
}));

function SignatureManager() {
  const classes = useStyles();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [signatures, setSignatures] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentSignature, setCurrentSignature] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    signatureFile: null
  });
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [signatureToDelete, setSignatureToDelete] = useState(null);
  
  // Load signatures on component mount
  useEffect(() => {
    loadSignatures();
  }, []);
  
  // Load signatures from Firestore
  const loadSignatures = async () => {
    try {
      const signaturesCollection = collection(db, 'signatures');
      const signaturesSnapshot = await getDocs(signaturesCollection);
      
      const signaturesData = signaturesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setSignatures(signaturesData);
    } catch (err) {
      setError('Error loading signatures: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Open dialog to add a new signature
  const handleAddClick = () => {
    setFormData({
      name: '',
      title: '',
      signatureFile: null
    });
    setPreviewUrl('');
    setEditMode(false);
    setDialogOpen(true);
  };
  
  // Open dialog to edit an existing signature
  const handleEditClick = (signature) => {
    setFormData({
      name: signature.name,
      title: signature.title,
      signatureFile: null
    });
    setPreviewUrl(signature.signatureBase64 || '');
    setCurrentSignature(signature);
    setEditMode(true);
    setDialogOpen(true);
  };
  
  // Handle delete confirmation dialog
  const handleDeleteClick = (signature) => {
    setSignatureToDelete(signature);
    setDeleteDialogOpen(true);
  };
  
  // Delete a signature
  const confirmDelete = async () => {
    if (!signatureToDelete) return;
    
    try {
      await deleteDoc(doc(db, 'signatures', signatureToDelete.id));
      
      // Remove from state
      setSignatures(signatures.filter(sig => sig.id !== signatureToDelete.id));
      
      // Close dialog
      setDeleteDialogOpen(false);
      setSignatureToDelete(null);
    } catch (err) {
      setError('Error deleting signature: ' + err.message);
      console.error(err);
    }
  };
  
  // Cancel delete
  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setSignatureToDelete(null);
  };
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  // Handle file upload - Convert to Base64
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    
    if (file) {
      // Create a preview URL and also store as base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setPreviewUrl(base64String);
      };
      reader.readAsDataURL(file);
      
      setFormData({
        ...formData,
        signatureFile: file
      });
    }
  };
  
  // Save signature - Using Base64 encoding instead of Firebase Storage
  const handleSave = async () => {
    try {
      console.log('Save button clicked');
      
      // Validate form
      if (!formData.name || !formData.title) {
        setError('Name and Title are required');
        return;
      }
      
      console.log('Form data is valid');
      
      // Check if we have a base64 image
      if (!previewUrl && !editMode) {
        setError('Please upload a signature image');
        return;
      }
      
      // Store the base64 string directly in Firestore
      const signatureBase64 = previewUrl;
      
      if (editMode && currentSignature) {
        // Update existing signature
        console.log('Updating existing signature:', currentSignature.id);
        
        try {
          const signatureRef = doc(db, 'signatures', currentSignature.id);
          await updateDoc(signatureRef, {
            name: formData.name,
            title: formData.title,
            signatureBase64: signatureBase64 || currentSignature.signatureBase64,
            updatedAt: serverTimestamp()
          });
          console.log('Signature updated successfully');
          
          // Update in state
          setSignatures(signatures.map(sig => 
            sig.id === currentSignature.id 
              ? { 
                  ...sig, 
                  name: formData.name, 
                  title: formData.title, 
                  signatureBase64: signatureBase64 || sig.signatureBase64 
                } 
              : sig
          ));
        } catch (updateError) {
          console.error('Error updating signature in Firestore:', updateError);
          setError('Error updating signature: ' + updateError.message);
          return;
        }
      } else {
        // Add new signature
        console.log('Adding new signature');
        
        const newSignature = {
          name: formData.name,
          title: formData.title,
          signatureBase64,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        try {
          console.log('Attempting to add document to Firestore');
          const docRef = await addDoc(collection(db, 'signatures'), newSignature);
          console.log('Document added with ID:', docRef.id);
          
          // Add to state
          setSignatures([...signatures, { id: docRef.id, ...newSignature }]);
        } catch (addError) {
          console.error('Error adding signature to Firestore:', addError);
          setError('Error saving signature: ' + addError.message);
          return;
        }
      }
      
      // Close dialog
      console.log('Operation completed successfully, closing dialog');
      setDialogOpen(false);
      setFormData({
        name: '',
        title: '',
        signatureFile: null
      });
      setPreviewUrl('');
      setCurrentSignature(null);
    } catch (err) {
      console.error('Unexpected error in handleSave:', err);
      setError('Error saving signature: ' + err.message);
    }
  };
  
  // Close dialog
  const handleClose = () => {
    setDialogOpen(false);
    setFormData({
      name: '',
      title: '',
      signatureFile: null
    });
    setPreviewUrl('');
    setCurrentSignature(null);
    setError('');
  };

  // Mobile warning for admin functions
  if (isMobile) {
    return (
      <Container className={classes.container}>
        <Paper className={classes.mobileWarning}>
          <Typography variant="h6" gutterBottom>
            Desktop Required
          </Typography>
          <Typography variant="body1">
            Please open Form Manager on a desktop or laptop device to utilize the admin functions.
          </Typography>
        </Paper>
      </Container>
    );
  }

  // Render function
  return (
    <Container className={classes.container}>
      <Typography variant="h4" className={classes.pageTitle}>
        Signature Management
      </Typography>
      
      <Button 
        variant="contained" 
        color="primary" 
        startIcon={<AddIcon />}
        onClick={handleAddClick}
        className={classes.addButton}
      >
        Add Signature
      </Button>
      
      <Typography variant="body1" paragraph>
        Manage the list of personnel authorized to sign forms. Signatures will be available for selection when completing forms.
      </Typography>
      
      {error && (
        <Typography color="error" paragraph>
          {error}
        </Typography>
      )}
      
      {loading ? (
        <Typography>Loading signatures...</Typography>
      ) : (
        <Grid container spacing={3}>
          {signatures.length === 0 ? (
            <Grid item xs={12}>
              <Paper style={{ padding: '16px', textAlign: 'center' }}>
                <Typography color="textSecondary">
                  No signatures found. Click "Add Signature" to create one.
                </Typography>
              </Paper>
            </Grid>
          ) : (
            signatures.map((signature) => (
              <Grid item key={signature.id} xs={12} sm={6} md={4}>
                <Card className={classes.card}>
                  {signature.signatureBase64 && (
                    <CardMedia
                      className={classes.cardMedia}
                      image={signature.signatureBase64}
                      title={`${signature.name}'s signature`}
                    />
                  )}
                  <CardContent className={classes.cardContent}>
                    <Typography variant="h6" className={classes.signatureTitle}>
                      {signature.name}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {signature.title}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button 
                      size="small" 
                      color="primary"
                      startIcon={<EditIcon />}
                      onClick={() => handleEditClick(signature)}
                    >
                      Edit
                    </Button>
                    <Button 
                      size="small" 
                      color="secondary"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleDeleteClick(signature)}
                    >
                      Delete
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}
      
      {/* Add/Edit Signature Dialog */}
      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editMode ? 'Edit Signature' : 'Add New Signature'}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Typography color="error" paragraph>
              {error}
            </Typography>
          )}
          
          <form className={classes.form} noValidate>
            <TextField
              autoFocus
              margin="dense"
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              fullWidth
              required
            />
            
            <TextField
              margin="dense"
              label="Title/Position"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              fullWidth
              required
            />
            
            <input
              accept="image/*"
              style={{ display: 'none' }}
              id="signature-upload"
              type="file"
              onChange={handleFileChange}
            />
            <label htmlFor="signature-upload">
              <Button
                variant="contained"
                component="span"
                color="primary"
                style={{ marginTop: '16px' }}
              >
                {editMode ? 'Change Signature Image' : 'Upload Signature Image'}
              </Button>
            </label>
            
            {previewUrl && (
              <div style={{ marginTop: '16px' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Signature Preview:
                </Typography>
                <img 
                  src={previewUrl} 
                  alt="Signature Preview" 
                  className={classes.signaturePreview}
                />
              </div>
            )}
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="default">
            Cancel
          </Button>
          <Button onClick={handleSave} color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={cancelDelete}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the signature for {signatureToDelete?.name}?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete} color="primary">
            Cancel
          </Button>
          <Button onClick={confirmDelete} color="secondary">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default SignatureManager;