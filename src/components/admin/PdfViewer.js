// src/components/admin/PdfViewer.js
import React, { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { generatePdf } from '../../services/pdfService';

// Material UI imports
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Typography,
  IconButton,
  makeStyles
} from '@material-ui/core';
import {
  Close as CloseIcon,
  GetApp as DownloadIcon
} from '@material-ui/icons';

const useStyles = makeStyles((theme) => ({
  dialogTitle: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(1, 2),
  },
  dialogContent: {
    padding: 0,
    height: '80vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  loader: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  pdfFrame: {
    width: '100%',
    height: '100%',
    border: 'none',
  },
  error: {
    padding: theme.spacing(3),
    color: theme.palette.error.main,
  },
  downloadButton: {
    margin: theme.spacing(1),
  }
}));

function PdfViewer({ open, onClose, submissionId }) {
  const classes = useStyles();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [formTitle, setFormTitle] = useState('Form Submission');

  useEffect(() => {
    async function loadPdf() {
      if (!submissionId || !open) return;
      
      setLoading(true);
      setError('');
      setPdfUrl('');
      
      try {
        // Fetch the submission data
        const submissionRef = doc(db, 'submissions', submissionId);
        const submissionSnap = await getDoc(submissionRef);
        
        if (!submissionSnap.exists()) {
          throw new Error('Submission not found');
        }
        
        const submission = submissionSnap.data();
        setFormTitle(submission.formTitle || 'Form Submission');
        
        // Fetch the form template
        const formRef = doc(db, 'forms', submission.formId);
        const formSnap = await getDoc(formRef);
        
        if (!formSnap.exists()) {
          throw new Error('Form template not found');
        }
        
        const form = formSnap.data();
        
        // Fetch signatures
        const signaturesQuery = query(collection(db, 'signatures'));
        const signaturesSnap = await getDocs(signaturesQuery);
        
        const signatures = signaturesSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Fetch company settings
        let companySettings = null;
        const settingsRef = doc(db, 'settings', 'company');
        const settingsSnap = await getDoc(settingsRef);
        
        if (settingsSnap.exists()) {
          companySettings = settingsSnap.data();
        }
        
        // Generate the PDF
        const pdfBlob = await generatePdf(form, submission.data, signatures, companySettings);
        
        // Create a URL for the blob
        const url = URL.createObjectURL(pdfBlob);
        setPdfUrl(url);
        
        // Store the blob for download
        window.submissionPdfBlob = pdfBlob;
      } catch (err) {
        console.error('Error generating PDF:', err);
        setError(`Error generating PDF: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
    
    loadPdf();
    
    // Cleanup URL when dialog is closed
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [submissionId, open]);
  
  const handleDownload = () => {
    if (window.submissionPdfBlob) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `${formTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };
  
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      aria-labelledby="pdf-viewer-dialog-title"
    >
      <div className={classes.dialogTitle}>
        <DialogTitle id="pdf-viewer-dialog-title">
          {formTitle}
        </DialogTitle>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </div>
      
      <DialogContent className={classes.dialogContent}>
        {loading ? (
          <div className={classes.loader}>
            <CircularProgress />
          </div>
        ) : error ? (
          <Typography className={classes.error}>
            {error}
          </Typography>
        ) : (
          <iframe
            src={pdfUrl}
            className={classes.pdfFrame}
            title="PDF Viewer"
          />
        )}
      </DialogContent>
      
      <DialogActions>
        <Button
          onClick={handleDownload}
          color="primary"
          disabled={loading || !!error}
          startIcon={<DownloadIcon />}
          className={classes.downloadButton}
        >
          Download PDF
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default PdfViewer;