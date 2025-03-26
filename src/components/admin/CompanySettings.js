// src/components/admin/CompanySettings.js
import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

// Material UI imports
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Divider,
  Snackbar,
  makeStyles
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import {
  Save as SaveIcon,
  CloudUpload as UploadIcon
} from '@material-ui/icons';

const useStyles = makeStyles((theme) => ({
  container: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
  },
  paper: {
    padding: theme.spacing(3),
  },
  section: {
    marginBottom: theme.spacing(3),
  },
  logoPreview: {
    maxWidth: '200px',
    maxHeight: '100px',
    marginTop: theme.spacing(2),
  },
  uploadButton: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
  saveButton: {
    marginTop: theme.spacing(3),
  }
}));

function CompanySettings() {
  const classes = useStyles();
  
  const [formData, setFormData] = useState({
    name: 'Copenhagen AirTaxi / CAT Flyservice',
    address: '',
    phone: '',
    email: '',
    website: '',
    vatEori: '',
    easaApprovalNo: '',
    legalText: '',
    logoFile: null
  });
  
  const [logoPreview, setLogoPreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  
  // Load company settings on component mount
  useEffect(() => {
    async function loadSettings() {
      try {
        console.log('Attempting to load company settings');
        const settingsRef = doc(db, 'settings', 'company');
        const settingsSnap = await getDoc(settingsRef);
        
        if (settingsSnap.exists()) {
          console.log('Settings document exists');
          const data = settingsSnap.data();
          setFormData({
            name: data.name || 'Copenhagen AirTaxi / CAT Flyservice',
            address: data.address || '',
            phone: data.phone || '',
            email: data.email || '',
            website: data.website || '',
            vatEori: data.vatEori || '',
            easaApprovalNo: data.easaApprovalNo || '',
            legalText: data.legalText || '',
            logoFile: null
          });
          
          if (data.logoBase64) {
            console.log('Logo found in settings');
            setLogoPreview(data.logoBase64);
          }
        } else {
          console.log('No settings document found - using defaults');
        }
      } catch (err) {
        console.error('Error loading company settings:', err);
        setError('Error loading company settings: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    
    loadSettings();
  }, []);
  
  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  // Handle logo file upload with Base64 conversion
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    
    if (file) {
      console.log('Logo file selected:', file.name);
      // Convert to Base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setLogoPreview(base64String);
      };
      reader.readAsDataURL(file);
      
      setFormData({
        ...formData,
        logoFile: file
      });
    }
  };
  
  // Save company settings
  const handleSave = async () => {
    try {
      console.log('Attempting to save company settings');
      
      // Store the base64 string directly in Firestore
      const logoBase64 = logoPreview;
      
      // Save to Firestore
      const settingsRef = doc(db, 'settings', 'company');
      await setDoc(settingsRef, {
        name: formData.name,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        website: formData.website,
        vatEori: formData.vatEori,
        easaApprovalNo: formData.easaApprovalNo,
        legalText: formData.legalText,
        logoBase64
      });
      
      console.log('Company settings saved successfully');
      
      // Show saved message
      setSaved(true);
      
    } catch (err) {
      console.error('Error saving company settings:', err);
      setError('Error saving company settings: ' + err.message);
    }
  };
  
  // Close success message
  const handleCloseSnackbar = () => {
    setSaved(false);
  };
  
  if (loading) {
    return (
      <Container className={classes.container}>
        <Typography>Loading company settings...</Typography>
      </Container>
    );
  }
  
  return (
    <Container className={classes.container}>
      <Typography variant="h4" gutterBottom>
        Company Settings
      </Typography>
      
      <Paper className={classes.paper}>
        {error && (
          <Alert severity="error" style={{ marginBottom: '16px' }}>
            {error}
          </Alert>
        )}
        
        <div className={classes.section}>
          <Typography variant="h5" gutterBottom>
            Company Information
          </Typography>
          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
            This information will appear on all form PDFs.
          </Typography>
          
          <TextField
            fullWidth
            margin="normal"
            label="Company Name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
          />
          
          <TextField
            fullWidth
            margin="normal"
            label="Address"
            name="address"
            value={formData.address}
            onChange={handleInputChange}
          />
          
          <TextField
            fullWidth
            margin="normal"
            label="Phone"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
          />
          
          <TextField
            fullWidth
            margin="normal"
            label="Email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
          />
          
          <TextField
            fullWidth
            margin="normal"
            label="Website"
            name="website"
            value={formData.website}
            onChange={handleInputChange}
          />
          
          <TextField
            fullWidth
            margin="normal"
            label="VAT/EORI Number"
            name="vatEori"
            value={formData.vatEori}
            onChange={handleInputChange}
          />
          
          <TextField
            fullWidth
            margin="normal"
            label="EASA Approval Number"
            name="easaApprovalNo"
            value={formData.easaApprovalNo}
            onChange={handleInputChange}
          />
        </div>
        
        <Divider />
        
        <div className={classes.section} style={{ marginTop: '24px' }}>
          <Typography variant="h5" gutterBottom>
            Company Logo
          </Typography>
          
          <input
            accept="image/*"
            style={{ display: 'none' }}
            id="logo-file"
            type="file"
            onChange={handleFileChange}
          />
          <label htmlFor="logo-file">
            <Button
              variant="contained"
              component="span"
              color="primary"
              startIcon={<UploadIcon />}
              className={classes.uploadButton}
            >
              {logoPreview ? 'Change Logo' : 'Upload Logo'}
            </Button>
          </label>
          
          {logoPreview && (
            <div>
              <Typography variant="subtitle2" gutterBottom>
                Logo Preview:
              </Typography>
              <img 
                src={logoPreview} 
                alt="Company Logo" 
                className={classes.logoPreview}
              />
            </div>
          )}
        </div>
        
        <Divider />
        
        <div className={classes.section} style={{ marginTop: '24px' }}>
          <Typography variant="h5" gutterBottom>
            Legal Text
          </Typography>
          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
            This text will appear at the bottom of all form PDFs.
          </Typography>
          
          <TextField
            fullWidth
            margin="normal"
            label="Legal Disclaimer / Footer Text"
            name="legalText"
            value={formData.legalText}
            onChange={handleInputChange}
            multiline
            rows={4}
            variant="outlined"
          />
        </div>
        
        <Button
          variant="contained"
          color="primary"
          size="large"
          className={classes.saveButton}
          startIcon={<SaveIcon />}
          onClick={handleSave}
        >
          Save All Settings
        </Button>
      </Paper>
      
      <Snackbar 
        open={saved} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity="success">
          Company settings saved successfully!
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default CompanySettings;