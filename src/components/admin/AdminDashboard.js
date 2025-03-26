// src/components/admin/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Toolbar,
  AppBar,
  makeStyles,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@material-ui/core';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileCopy as DuplicateIcon,
  ExitToApp as LogoutIcon
} from '@material-ui/icons';

const useStyles = makeStyles((theme) => ({
  title: {
    flexGrow: 1,
  },
  appBarSpacer: theme.mixins.toolbar,
  content: {
    flexGrow: 1,
    padding: theme.spacing(3),
  },
  button: {
    margin: theme.spacing(1),
  },
  tableContainer: {
    marginTop: theme.spacing(3),
  }
}));

function AdminDashboard() {
  const classes = useStyles();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState(null);
  const { logout } = useAuth();
  const navigate = useNavigate();

  // Load forms on component mount
  useEffect(() => {
    async function loadForms() {
      try {
        // For initial testing, use sample data
        const sampleForms = [
          {
            id: '1',
            title: 'Engine Inspection Form',
            revision: '1.0',
            updatedAt: new Date(),
            published: true
          },
          {
            id: '2',
            title: 'Airframe Inspection Form',
            revision: '2.1',
            updatedAt: new Date(),
            published: true
          },
          {
            id: '3',
            title: 'Avionics Check Form',
            revision: '1.3',
            updatedAt: new Date(),
            published: false
          }
        ];
        
        setForms(sampleForms);
        
        // Uncomment this code when you have Firebase set up
        /*
        const formsQuery = query(collection(db, 'forms'), orderBy('updatedAt', 'desc'));
        const querySnapshot = await getDocs(formsQuery);
        
        const formsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setForms(formsData);
        */
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
      // Uncomment this code when you have Firebase set up
      /*
      await deleteDoc(doc(db, 'forms', formToDelete.id));
      */
      
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

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      setError('Failed to log out');
      console.error(err);
    }
  };

  return (
    <>
      <AppBar position="fixed">
        <Toolbar>
          <Typography variant="h6" className={classes.title}>
            Copenhagen AirTaxi - Form Manager
          </Typography>
          <Button
            color="inherit"
            component={Link}
            to="/admin/signatures"
          >
            Manage Signatures
          </Button>
          <Button
            color="inherit"
            component={Link}
            to="/admin/company-settings"
          >
            Company Settings
          </Button>
          <Button
            color="inherit"
            onClick={handleLogout}
            startIcon={<LogoutIcon />}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <div className={classes.appBarSpacer} />

      <Container className={classes.content}>
        <Typography variant="h4" component="h1" gutterBottom>
          Form Management Dashboard
        </Typography>

        {error && (
          <Typography color="error">
            {error}
          </Typography>
        )}

        <Button
          variant="contained"
          color="primary"
          className={classes.button}
          startIcon={<AddIcon />}
          component={Link}
          to="/admin/form/new"
        >
          Create New Form
        </Button>

        <TableContainer component={Paper} className={classes.tableContainer}>
          <Table aria-label="forms table">
            <TableHead>
              <TableRow>
                <TableCell>Form Title</TableCell>
                <TableCell>Revision</TableCell>
                <TableCell>Last Modified</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : forms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No forms found. Create your first form!
                  </TableCell>
                </TableRow>
              ) : (
                forms.map((form) => (
                  <TableRow key={form.id}>
                    <TableCell component="th" scope="row">
                      {form.title}
                    </TableCell>
                    <TableCell>{form.revision || '1.0'}</TableCell>
                    <TableCell>
                      {form.updatedAt ? new Date(form.updatedAt instanceof Date ? form.updatedAt : form.updatedAt.toDate()).toLocaleDateString() : 'N/A'}
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
      </Container>

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
    </>
  );
}

export default AdminDashboard;