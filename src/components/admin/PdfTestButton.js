// src/components/admin/PdfTestButton.js
import React, { useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { generateTestPdf } from '../../services/pdfService';

// Material UI imports
import {
  Button,
  CircularProgress,
  Snackbar,
  makeStyles
} from '@material-ui/core';
import {
  PictureAsPdf as PdfIcon
} from '@material-ui/icons';
import { Alert } from '@material-ui/lab';

const useStyles = makeStyles((theme) => ({
  button: {
    margin: theme.spacing(1),
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    '&:hover': {
      backgroundColor: theme.palette.primary.dark,
    }
  },
  buttonProgress: {
    marginRight: theme.spacing(1),
    color: theme.palette.primary.contrastText
  }
}));

/**
 * A button component that generates and downloads a test PDF
 */
function PdfTestButton() {
  const classes = useStyles();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleGeneratePdf = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Fetch company settings if available
      let companySettings = null;
      try {
        const settingsRef = doc(db, 'settings', 'company');
        const settingsSnap = await getDoc(settingsRef);
        
        if (settingsSnap.exists()) {
          companySettings = settingsSnap.data();
        }
      } catch (settingsError) {
        console.warn('Could not load company settings:', settingsError);
        // Continue without company settings
      }
      
      // Generate the test PDF
      const pdfBlob = await generateTestPdf(companySettings);
      
      // Create a download link and trigger the download
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Test_Form_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setSuccess(true);
    } catch (err) {
      console.error('Error generating test PDF:', err);
      setError(`Error generating PDF: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="contained"
        className={classes.button}
        startIcon={loading ? <CircularProgress size={24} className={classes.buttonProgress} /> : <PdfIcon />}
        onClick={handleGeneratePdf}
        disabled={loading}
      >
        {loading ? 'Generating...' : 'Generate Test PDF'}
      </Button>
      
      {/* Success message */}
      <Snackbar
        open={success}
        autoHideDuration={3000}
        onClose={() => setSuccess(false)}
      >
        <Alert onClose={() => setSuccess(false)} severity="success">
          Test PDF generated successfully!
        </Alert>
      </Snackbar>
      
      {/* Error message */}
      <Snackbar
        open={Boolean(error)}
        autoHideDuration={5000}
        onClose={() => setError('')}
      >
        <Alert onClose={() => setError('')} severity="error">
          {error}
        </Alert>
      </Snackbar>
    </>
  );
}

export default PdfTestButton;