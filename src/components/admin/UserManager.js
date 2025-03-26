// src/components/admin/UserManager.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, updateDoc, query, orderBy, deleteDoc } from 'firebase/firestore';
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
  Toolbar,
  AppBar,
  makeStyles,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon
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
  },
  roleCell: {
    textTransform: 'capitalize',
  },
  form: {
    '& > *': {
      margin: theme.spacing(1),
    },
  },
}));

function UserManager() {
  const classes = useStyles();
  const navigate = useNavigate();
  const { createUser, userRole, updateUserRole } = useAuth();
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    role: 'employee'
  });
  
  const [currentUser, setCurrentUser] = useState(null);
  
  // Load users on component mount
  useEffect(() => {
    async function loadUsers() {
      try {
        const usersQuery = query(collection(db, 'users'), orderBy('displayName'));
        const querySnapshot = await getDocs(usersQuery);
        
        const usersData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setUsers(usersData);
      } catch (err) {
        setError('Error loading users: ' + err.message);
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    loadUsers();
  }, []);
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  // Open add user dialog
  const handleAddClick = () => {
    setFormData({
      email: '',
      password: '',
      displayName: '',
      role: 'employee'
    });
    setAddDialogOpen(true);
  };
  
  // Create new user
  const handleAddUser = async () => {
    try {
      if (!formData.email || !formData.password || !formData.displayName) {
        setError('All fields are required');
        return;
      }
      
      await createUser(
        formData.email,
        formData.password,
        formData.displayName,
        formData.role
      );
      
      // Refresh user list
      const usersQuery = query(collection(db, 'users'), orderBy('displayName'));
      const querySnapshot = await getDocs(usersQuery);
      
      const usersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setUsers(usersData);
      setAddDialogOpen(false);
      setSuccess('User created successfully');
    } catch (err) {
      setError('Error creating user: ' + err.message);
      console.error(err);
    }
  };
  
  // Open edit user dialog
  const handleEditClick = (user) => {
    setCurrentUser(user);
    setFormData({
      displayName: user.displayName || '',
      role: user.role || 'employee'
    });
    setEditDialogOpen(true);
  };
  
  // Update user
  const handleUpdateUser = async () => {
    try {
      if (!currentUser || !formData.displayName) {
        setError('All fields are required');
        return;
      }
      
      // Update user data in Firestore
      const userRef = doc(db, 'users', currentUser.id);
      await updateDoc(userRef, {
        displayName: formData.displayName,
        role: formData.role
      });
      
      // If role was changed, update the role through auth context
      if (currentUser.role !== formData.role) {
        await updateUserRole(currentUser.id, formData.role);
      }
      
      // Refresh user list
      const usersQuery = query(collection(db, 'users'), orderBy('displayName'));
      const querySnapshot = await getDocs(usersQuery);
      
      const usersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setUsers(usersData);
      setEditDialogOpen(false);
      setSuccess('User updated successfully');
    } catch (err) {
      setError('Error updating user: ' + err.message);
      console.error(err);
    }
  };
  
  // Open delete confirmation dialog
  const handleDeleteClick = (user) => {
    setCurrentUser(user);
    setDeleteDialogOpen(true);
  };
  
  // Delete user
  const handleDeleteUser = async () => {
    try {
      if (!currentUser) return;
      
      // Delete user data from Firestore
      await deleteDoc(doc(db, 'users', currentUser.id));
      
      // Note: This does not delete the user from Firebase Authentication
      // This would require a Firebase Cloud Function
      
      // Remove from state
      setUsers(users.filter(user => user.id !== currentUser.id));
      
      // Close dialog
      setDeleteDialogOpen(false);
      setCurrentUser(null);
      setSuccess('User deleted from database successfully. Note: The user account still exists in Firebase Authentication.');
    } catch (err) {
      setError('Error deleting user: ' + err.message);
      console.error(err);
    }
  };
  
  // Handle close success message
  const handleSuccessClose = () => {
    setSuccess('');
  };
  
  // Handle close error message
  const handleErrorClose = () => {
    setError('');
  };
  
  return (
    <>
      <AppBar position="fixed">
        <Toolbar>
          <IconButton 
            edge="start" 
            color="inherit" 
            onClick={() => navigate('/admin/dashboard')}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" className={classes.title}>
            User Management
          </Typography>
          <Button
            color="inherit"
            startIcon={<AddIcon />}
            onClick={handleAddClick}
          >
            Add User
          </Button>
        </Toolbar>
      </AppBar>

      <div className={classes.appBarSpacer} />
      
      <Container className={classes.content}>
        <Typography variant="h4" component="h1" gutterBottom>
          User Management
        </Typography>
        
        <Paper className={classes.tableContainer}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.displayName}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell className={classes.roleCell}>{user.role}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          aria-label="edit"
                          onClick={() => handleEditClick(user)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          aria-label="delete"
                          onClick={() => handleDeleteClick(user)}
                          disabled={userRole !== 'admin'}
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
        </Paper>
      </Container>
      
      {/* Add User Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)}>
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Enter the details for the new user. They will receive an email with login instructions.
          </DialogContentText>
          <form className={classes.form}>
            <TextField
              fullWidth
              margin="normal"
              label="Display Name"
              name="displayName"
              value={formData.displayName}
              onChange={handleInputChange}
              required
            />
            <TextField
              fullWidth
              margin="normal"
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
            <TextField
              fullWidth
              margin="normal"
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              required
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Role</InputLabel>
              <Select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
              >
                <MenuItem value="employee">Employee</MenuItem>
                <MenuItem value="manager">Manager</MenuItem>
                {userRole === 'admin' && (
                  <MenuItem value="admin">Admin</MenuItem>
                )}
              </Select>
            </FormControl>
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)} color="default">
            Cancel
          </Button>
          <Button onClick={handleAddUser} color="primary" startIcon={<SaveIcon />}>
            Add User
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <form className={classes.form}>
            <TextField
              fullWidth
              margin="normal"
              label="Display Name"
              name="displayName"
              value={formData.displayName}
              onChange={handleInputChange}
              required
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Role</InputLabel>
              <Select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
              >
                <MenuItem value="employee">Employee</MenuItem>
                <MenuItem value="manager">Manager</MenuItem>
                {userRole === 'admin' && (
                  <MenuItem value="admin">Admin</MenuItem>
                )}
              </Select>
            </FormControl>
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} color="default">
            Cancel
          </Button>
          <Button onClick={handleUpdateUser} color="primary" startIcon={<SaveIcon />}>
            Update User
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the user {currentUser?.displayName}? 
            This will only remove them from the database, not from Firebase Authentication.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="default">
            Cancel
          </Button>
          <Button onClick={handleDeleteUser} color="secondary">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Success Snackbar */}
      <Snackbar 
        open={Boolean(success)} 
        autoHideDuration={6000} 
        onClose={handleSuccessClose}
      >
        <Alert onClose={handleSuccessClose} severity="success">
          {success}
        </Alert>
      </Snackbar>
      
      {/* Error Snackbar */}
      <Snackbar 
        open={Boolean(error)} 
        autoHideDuration={6000} 
        onClose={handleErrorClose}
      >
        <Alert onClose={handleErrorClose} severity="error">
          {error}
        </Alert>
      </Snackbar>
    </>
  );
}

export default UserManager;