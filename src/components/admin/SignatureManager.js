// src/components/admin/SignatureManager.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, deleteDoc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';

// Material UI imports
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  AppBar,
  Toolbar,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  makeStyles
} from '@material-ui/core';
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
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
  form: {
    '& > *': {
      margin: theme.spacing(1),
    },
  },
  signaturePreview: {
    maxWidth: '100%',
    maxHeight: '150px',
    marginTop: theme.spacing(2),
  }
}));

function SignatureManager() {
  const classes = useStyles();
  const navigate = useNavigate();
  
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
    setPreviewUrl(signature.signatureUrl || '');
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
  
  // Handle file upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    
    if (file) {
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
      
      setFormData({
        ...formData,
        signatureFile: file
      });
    }
  };
  
  // Save signature
  const handleSave = async () => {
    try {
      // Validate form
      if (!formData.name || !formData.title) {
        setError('Name and Title are required');
        return;
      }
      
      let signatureUrl = previewUrl;
      
      // Upload new signature image if provided
      if (formData.signatureFile) {
        const fileRef = ref(storage, `signatures/${formData.name.replace(/\s+/g, '_')}_${Date.now()}.png`);
        await uploadBytes(fileRef, formData.signatureFile);
        signatureUrl = await getDownloadURL(fileRef);
      }
      
      if (editMode && currentSignature) {
        // Update existing signature
        const signatureRef = doc(db, 'signatures', currentSignature.id);
        await updateDoc(signatureRef, {
          name: formData.name,
          title: formData.title,
          signatureUrl: signatureUrl || currentSignature.signatureUrl,
          updatedAt: serverTimestamp()
        });
        
        // Update in state
        setSignatures(signatures.map(sig => 
          sig.id === currentSignature.id 
            ? { 
                ...sig, 
                name: formData.name, 
                title: formData.title, 
                signatureUrl: signatureUrl || sig.signatureUrl 
              } 
            : sig
        ));
      } else {
        // Add new signature
        const newSignature = {
          name: formData.name,
          title: formData.title,
          signatureUrl,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        const docRef = await addDoc(collection(db, 'signatures'), newSignature);
        
        // Add to state
        setSignatures([...signatures, { id: docRef.id, ...newSignature }]);
      }
      
      // Close dialog
      setDialogOpen(false);
      setFormData({
        name: '',
        title: '',
        signatureFile: null
      });
      setPreviewUrl('');
      setCurrentSignature(null);
    } catch (err) {
      setError('Error saving signature: ' + err.message);
      console.error(err);
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