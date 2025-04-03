// src/components/admin/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, doc, deleteDoc, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

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
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Divider,
  Hidden,
  useMediaQuery,
  makeStyles,
  useTheme
} from '@material-ui/core';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileCopy as DuplicateIcon,
  Create as CreateIcon,
  PanTool as SignatureIcon,
  Settings as SettingsIcon,
  Person as UserIcon
} from '@material-ui/icons';

const useStyles = makeStyles((theme) => ({
  content: {
    flexGrow: 1,
    padding: theme.spacing(3),
  },
  pageTitle: {
    marginBottom: theme.spacing(4),
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
    margin: theme.spacing(2),
    backgroundColor: theme.palette.warning.light,
    borderRadius: theme.shape.borderRadius,
    textAlign: 'center',
  },
  submissionsSection: {
    marginTop: theme.spacing(4),
    marginBottom: theme.spacing(4),
  },
  submissionItem: {
    padding: theme.spacing(2),
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
  const { currentUser, hasRole } = useAuth();

  // Load forms and recent submissions on component mount
  useEffect(() => {
    async function loadData() {
      try {
        // Load forms
        const formsQuery = query(collection(db, 'forms'), orderBy('updatedAt', 'desc'));
        const formsSnapshot = await getDocs(formsQuery);
        
        const formsData = formsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setForms(formsData);
        
        // Load recent submissions
        const submissionsQuery = query(
          collection(db, 'submissions'),
          where('status', '==', 'submitted'),
          orderBy('submittedAt', 'desc')
        );
        
        const submissionsSnapshot = await getDocs(submissionsQuery);
        
        const submissionsData = submissionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).slice(0, 10); // Get only the 10 most recent
        
        setSubmissions(submissionsData);
        
      } catch (err) {
        setError('Error loading data: ' + err.message);
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, []);

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

  // Mobile warning for admin functions
  if (isMobile) {
    return (
      <Container className={classes.content}>
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

  return (
    <Container className={classes.content}>
      <Typography variant="h4" className={classes.pageTitle}>
        Admin Dashboard
      </Typography>

      {error && (
        <Typography color="error">
          {error}
        </Typography>
      )}

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

      {/* Recent Submissions Section */}
      {submissions.length > 0 && (
        <div className={classes.submissionsSection}>
          <Typography variant="h5" gutterBottom>
            Recent Submissions
          </Typography>
          
          <Paper>
            {submissions.map((submission, index) => (
              <div key={submission.id}>
                <Grid container spacing={2} className={classes.submissionItem}>
                  <Grid item xs={8}>
                    <Typography variant="subtitle1">
                      {submission.formTitle}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Submitted by: {submission.userName || 'Unknown user'}
                      <br />
                      Date: {submission.submittedAt ? new Date(submission.submittedAt.toDate()).toLocaleString() : 'Unknown'}
                    </Typography>
                  </Grid>
                  <Grid item xs={4} style={{ textAlign: 'right' }}>
                    <Button
                      size="small"
                      variant="outlined"
                      color="primary"
                      component={Link}
                      to={`/submission/${submission.id}`}
                    >
                      View Details
                    </Button>
                  </Grid>
                </Grid>
                {index < submissions.length - 1 && <Divider />}
              </div>
            ))}
          </Paper>
        </div>
      )}

      {/* Form Management Section */}
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
          <Button onClick={cancelDelete} color="primary">
            Cancel
          </Button>
          <Button onClick={confirmDelete} color="secondary" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default AdminDashboard;