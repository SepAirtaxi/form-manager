// src/components/admin/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, deleteDoc, query, orderBy } from 'firebase/firestore';
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
  makeStyles
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
  button: {
    margin: theme.spacing(1),
  },
  tableContainer: {
    marginTop: theme.spacing(3),
  },
  welcomeSection: {
    marginBottom: theme.spacing(4),
    padding: theme.spacing(3),
    backgroundColor: theme.palette.primary.light,
    color: theme.palette.primary.contrastText,
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
  }
}));

function AdminDashboard() {
  const classes = useStyles();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState(null);
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
      } catch (err) {
        setError('Error loading forms: ' + err.message);
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    loadForms();
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

  return (
    <Container className={classes.content}>
      <Paper className={classes.welcomeSection}>
        <Typography variant="h4" gutterBottom>
          Admin Dashboard
        </Typography>
        <Typography variant="body1">
          Welcome to the administrative dashboard, {currentUser?.displayName || 'User'}. 
          Your role is: <strong style={{ textTransform: 'capitalize' }}>{userRole}</strong>
        </Typography>
      </Paper>

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