// src/components/admin/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, deleteDoc, query, orderBy, where, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import PdfTestButton from './PdfTestButton';
import PdfViewer from './PdfViewer';
import { generatePdf } from '../../services/pdfService';

// Material UI imports
import {
  Container,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  useMediaQuery,
  makeStyles,
  useTheme,
  Tooltip,
  CircularProgress
} from '@material-ui/core';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileCopy as DuplicateIcon,
  Person as UserIcon,
  Settings as SettingsIcon,
  Create as CreateIcon,
  PanTool as SignatureIcon,
  Visibility as ViewIcon,
  GetApp as DownloadIcon
} from '@material-ui/icons';

const useStyles = makeStyles((theme) => ({
  title: {
    marginBottom: theme.spacing(3),
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing(3),
  },
  button: {
    margin: theme.spacing(1),
  },
  tableContainer: {
    marginTop: theme.spacing(3),
  },
  card: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  cardContent: {
    flexGrow: 1,
  },
  cardTitle: {
    fontSize: 18,
  },
  cardIcon: {
    fontSize: 40,
    marginBottom: theme.spacing(2),
  },
  draftChip: {
    backgroundColor: theme.palette.warning.main,
    marginLeft: theme.spacing(1),
  },
  mobileWarning: {
    padding: theme.spacing(3),
    marginBottom: theme.spacing(3),
    backgroundColor: theme.palette.warning.light,
    color: theme.palette.warning.contrastText,
  },
  testPdfSection: {
    marginTop: theme.spacing(4),
    marginBottom: theme.spacing(4),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.default,
    borderRadius: theme.shape.borderRadius,
    border: `1px dashed ${theme.palette.primary.main}`,
  },
  submissionsSection: {
    marginTop: theme.spacing(4),
  },
  actionButton: {
    marginRight: theme.spacing(1),
  }
}));

function AdminDashboard() {
  const classes = useStyles();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [forms, setForms] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState(null);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [downloadLoading, setDownloadLoading] = useState({});
  const { currentUser, userRole, hasRole } = useAuth();
  const navigate = useNavigate();

  // Load forms on component mount
  useEffect(() => {
    async function loadForms() {
      try {
        const formsQuery = query(collection(db, 'forms'), orderBy('updatedAt', 'desc'));
        const querySnapshot = await getDocs(formsQuery);
        
        const formsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setForms(formsData);
        
        // Load recent submissions
        if (currentUser) {
          const submissionsQuery = query(
            collection(db, 'submissions'),
            where('status', '==', 'submitted'),
            orderBy('submittedAt', 'desc')
          );
          
          try {
            const submissionsSnap = await getDocs(submissionsQuery);
            
            const submissionsData = submissionsSnap.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            })).slice(0, 10); // Get only the 10 most recent
            
            setSubmissions(submissionsData);
          } catch (subError) {
            console.error("Error loading submissions:", subError);
          }
        }
      } catch (err) {
        setError('Error loading forms: ' + err.message);
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    loadForms();
  }, [currentUser]);

  // Handle form deletion
  const handleDeleteClick = (form) => {
    setFormToDelete(form);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!formToDelete) return;
    
    try {
      await deleteDoc(doc(db, 'forms', formToDelete.id));
      setForms(forms.filter(form => form.id !== formToDelete.id));
      setDeleteDialogOpen(false);
      setFormToDelete(null);
    } catch (err) {
      setError('Error deleting form: ' + err.message);
      console.error(err);
    }
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setFormToDelete(null);
  };

  // Handle form duplication
  const handleDuplicate = (form) => {
    // To be implemented
    console.log('Duplicate form', form.id);
  };

  // Handle PDF viewing
  const handleViewPdf = (submission) => {
    setSelectedSubmission(submission.id);
    setPdfViewerOpen(true);
  };

  // Handle PDF download
  const handleDownloadPdf = async (submission) => {
    setDownloadLoading({ ...downloadLoading, [submission.id]: true });
    
    try {
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
      
      // Download the PDF
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      const filename = `${submission.formTitle.replace(/\s+/g, '_')}_${new Date(submission.submittedAt.toDate()).toISOString().split('T')[0]}.pdf`;
      
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('Error downloading PDF:', err);
      setError(`Error downloading PDF: ${err.message}`);
    } finally {
      setDownloadLoading({ ...downloadLoading, [submission.id]: false });
    }
  };

  // If on mobile, show warning
  if (isMobile) {
    return (
      <Container className={classes.content}>
        <Paper className={classes.mobileWarning}>
          <Typography variant="h5" gutterBottom>
            Desktop Recommended
          </Typography>
          <Typography variant="body1">
            Please open Form Manager on a desktop or laptop device to utilize the admin functions.
            The admin interface is optimized for larger screens.
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container className={classes.content}>
      <Typography variant="h4" className={classes.title}>
        Admin Dashboard
      </Typography>
      
      {error && (
        <Typography color="error">
          {error}
        </Typography>
      )}
      
      {/* PDF Testing Section */}
      <Paper className={classes.testPdfSection}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={8}>
            <Typography variant="h6" gutterBottom>
              Test PDF Generation
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Generate a sample PDF with test data to check formatting and layout.
              This feature is for testing purposes only.
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4} style={{ textAlign: 'right' }}>
            <PdfTestButton />
          </Grid>
        </Grid>
      </Paper>

      {/* Admin Tools Section */}
      <Typography variant="h5" gutterBottom style={{ marginTop: '24px' }}>
        Admin Tools
      </Typography>
      
      <Grid container spacing={3} style={{ marginBottom: '32px' }}>
        {/* Form Creation Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card className={classes.card}>
            <CardContent className={classes.cardContent}>
              <CreateIcon className={classes.cardIcon} color="primary" />
              <Typography className={classes.cardTitle} gutterBottom>
                Form Creator
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Create new forms for your organization.
              </Typography>
            </CardContent>
            <CardActions>
              <Button 
                size="small" 
                color="primary"
                component={Link}
                to="/admin/form/new"
                startIcon={<AddIcon />}
              >
                Create New Form
              </Button>
            </CardActions>
          </Card>
        </Grid>
        
        {/* Signature Manager Card - only for manager and admin */}
        {hasRole(['manager', 'admin']) && (
          <Grid item xs={12} sm={6} md={3}>
            <Card className={classes.card}>
              <CardContent className={classes.cardContent}>
                <SignatureIcon className={classes.cardIcon} color="primary" />
                <Typography className={classes.cardTitle} gutterBottom>
                  Signature Manager
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Manage authorized signatories.
                </Typography>
              </CardContent>
              <CardActions>
                <Button 
                  size="small" 
                  color="primary"
                  component={Link}
                  to="/admin/signatures"
                >
                  Manage Signatures
                </Button>
              </CardActions>
            </Card>
          </Grid>
        )}
        
        {/* Company Settings Card - only for manager and admin */}
        {hasRole(['manager', 'admin']) && (
          <Grid item xs={12} sm={6} md={3}>
            <Card className={classes.card}>
              <CardContent className={classes.cardContent}>
                <SettingsIcon className={classes.cardIcon} color="primary" />
                <Typography className={classes.cardTitle} gutterBottom>
                  Company Settings
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Configure company information.
                </Typography>
              </CardContent>
              <CardActions>
                <Button 
                  size="small" 
                  color="primary"
                  component={Link}
                  to="/admin/company-settings"
                >
                  Company Settings
                </Button>
              </CardActions>
            </Card>
          </Grid>
        )}
        
        {/* User Management Card - only for admin */}
        {hasRole(['admin']) && (
          <Grid item xs={12} sm={6} md={3}>
            <Card className={classes.card}>
              <CardContent className={classes.cardContent}>
                <UserIcon className={classes.cardIcon} color="primary" />
                <Typography className={classes.cardTitle} gutterBottom>
                  User Management
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Manage users and access control.
                </Typography>
              </CardContent>
              <CardActions>
                <Button 
                  size="small" 
                  color="primary"
                  component={Link}
                  to="/admin/users"
                >
                  Manage Users
                </Button>
              </CardActions>
            </Card>
          </Grid>
        )}
      </Grid>

      <Typography variant="h5" gutterBottom>
        Form Management
      </Typography>

      <TableContainer component={Paper} className={classes.tableContainer}>
        <Table aria-label="forms table">
          <TableHead>
            <TableRow>
              <TableCell>Form Title</TableCell>
              <TableCell>Revision</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Last Modified</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : forms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No forms found. Create your first form!
                </TableCell>
              </TableRow>
            ) : (
              forms.map((form) => (
                <TableRow key={form.id}>
                  <TableCell component="th" scope="row">
                    {form.title}
                    {form.hasDraft && (
                      <Chip size="small" label="DRAFT" className={classes.draftChip} />
                    )}
                  </TableCell>
                  <TableCell>{form.revision || '1.0'}</TableCell>
                  <TableCell>{form.department || 'General'}</TableCell>
                  <TableCell>
                    {form.updatedAt ? new Date(form.updatedAt.toDate()).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {form.published ? 'Published' : 'Draft'}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      aria-label="edit"
                      component={Link}
                      to={`/admin/form/edit/${form.id}`}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      aria-label="duplicate"
                      onClick={() => handleDuplicate(form)}
                    >
                      <DuplicateIcon />
                    </IconButton>
                    <IconButton
                      aria-label="delete"
                      onClick={() => handleDeleteClick(form)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Recent Submissions Section */}
      {submissions.length > 0 && (
        <div className={classes.submissionsSection}>
          <Typography variant="h5" gutterBottom>
            Recent Form Submissions
          </Typography>
          
          <TableContainer component={Paper}>
            <Table aria-label="submissions table">
              <TableHead>
                <TableRow>
                  <TableCell>Form</TableCell>
                  <TableCell>Submitted By</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {submissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell>{submission.formTitle}</TableCell>
                    <TableCell>{submission.userName || 'Anonymous'}</TableCell>
                    <TableCell>
                      {submission.submittedAt 
                        ? new Date(submission.submittedAt.toDate()).toLocaleString() 
                        : 'Unknown'}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View PDF">
                        <IconButton
                          className={classes.actionButton}
                          color="primary"
                          onClick={() => handleViewPdf(submission)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Download PDF">
                        <IconButton
                          className={classes.actionButton}
                          color="primary"
                          onClick={() => handleDownloadPdf(submission)}
                          disabled={downloadLoading[submission.id]}
                        >
                          {downloadLoading[submission.id] ? 
                            <CircularProgress size={24} /> : 
                            <DownloadIcon />
                          }
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={cancelDelete}
        aria-labelledby="alert-dialog-title"
      >
        <DialogTitle id="alert-dialog-title">
          Confirm Deletion
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the form "{formToDelete?.title}"? 
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete} color="default">
            Cancel
          </Button>
          <Button onClick={confirmDelete} color="secondary" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* PDF Viewer Dialog */}
      <PdfViewer 
        open={pdfViewerOpen}
        onClose={() => setPdfViewerOpen(false)}
        submissionId={selectedSubmission}
      />
    </Container>
  );
}

export default AdminDashboard;