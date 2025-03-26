// src/components/admin/FormEditor.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection } from 'firebase/firestore';
import { db } from '../../firebase';
import BlockEditor from './BlockEditor';

// Material UI imports
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  makeStyles
} from '@material-ui/core';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  Save as SaveIcon,
  Publish as PublishIcon
} from '@material-ui/icons';

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
  },
  container: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
  },
  paper: {
    padding: theme.spacing(3),
    marginBottom: theme.spacing(3),
  },
  formSection: {
    marginBottom: theme.spacing(3),
  },
  buttonsContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: theme.spacing(3),
  },
  blockList: {
    marginTop: theme.spacing(2),
  },
  blockItem: {
    border: `1px solid ${theme.palette.divider}`,
    marginBottom: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
  },
  dragHandle: {
    cursor: 'move',
  },
  nestedBlock: {
    paddingLeft: theme.spacing(4),
  },
  addBlockButton: {
    marginTop: theme.spacing(1),
  },
  revisionControl: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.default,
    borderRadius: theme.shape.borderRadius,
  },
  formTitle: {
    marginBottom: theme.spacing(3),
  },
  actionButtons: {
    marginBottom: theme.spacing(3),
    display: 'flex',
    gap: theme.spacing(2),
  }
}));

function FormEditor() {
  const classes = useStyles();
  const { formId } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(formId);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    blocks: [],
    revision: '1.0',
    published: false,
    hasDraft: false
  });
  
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState('');
  const [blockEditorOpen, setBlockEditorOpen] = useState(false);
  const [currentBlock, setCurrentBlock] = useState(null);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(-1);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [revisionType, setRevisionType] = useState('minor');
  
  // Load form data if in edit mode
  useEffect(() => {
    async function loadFormData() {
      try {
        if (!formId) return;
        
        const formRef = doc(db, 'forms', formId);
        const formSnap = await getDoc(formRef);
        
        if (formSnap.exists()) {
          setFormData(formSnap.data());
        } else {
          setError('Form not found');
          navigate('/admin');
        }
      } catch (err) {
        setError('Error loading form: ' + err.message);
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    if (isEditMode) {
      loadFormData();
    }
  }, [formId, isEditMode, navigate]);
  
  // Helper function to calculate next revision number
  const getNextRevision = (type) => {
    const currentRevision = formData.revision || '1.0';
    const [major, minor] = currentRevision.split('.').map(Number);
    
    if (type === 'major') {
      return `${major + 1}.0`;
    } else {
      return `${major}.${minor + 1}`;
    }
  };
  
  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  // Open block editor
  const handleAddBlock = (parentIndex = -1) => {
    setCurrentBlock({
      type: 'field',
      title: '',
      parentIndex
    });
    setCurrentBlockIndex(-1);
    setBlockEditorOpen(true);
  };
  
  // Edit existing block
  const handleEditBlock = (block, index) => {
    setCurrentBlock({...block});
    setCurrentBlockIndex(index);
    setBlockEditorOpen(true);
  };
  
  // Save block from editor
  const handleSaveBlock = (blockData) => {
    let updatedBlocks = [...formData.blocks];
    
    if (currentBlockIndex === -1) {
      // Add new block
      updatedBlocks.push(blockData);
    } else {
      // Update existing block
      updatedBlocks[currentBlockIndex] = blockData;
    }
    
    setFormData({
      ...formData,
      blocks: updatedBlocks
    });
    
    setBlockEditorOpen(false);
    setCurrentBlock(null);
    setCurrentBlockIndex(-1);
  };
  
  // Delete block
  const handleDeleteBlock = (index) => {
    const updatedBlocks = formData.blocks.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      blocks: updatedBlocks
    });
  };
  
  // Save form as draft
  const handleSaveDraft = async () => {
    try {
      if (!formData.title) {
        setError('Form title is required');
        return;
      }
      
      const formToSave = {
        ...formData,
        hasDraft: true,
        draftUpdatedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      if (isEditMode) {
        // Update existing form
        const formRef = doc(db, 'forms', formId);
        await updateDoc(formRef, formToSave);
        // Show success message
        setError(''); // Clear any existing errors
        alert('Form draft saved successfully!');
      } else {
        // Create new form
        const formsCollectionRef = collection(db, 'forms');
        const newFormRef = doc(formsCollectionRef);
        await setDoc(newFormRef, formToSave);
        alert('Form draft created successfully!');
        navigate(`/admin/form/edit/${newFormRef.id}`);
      }
      
    } catch (err) {
      setError('Error saving form: ' + err.message);
      console.error(err);
    }
  };
  
  // Open publish dialog
  const handlePublishClick = () => {
    setPublishDialogOpen(true);
  };
  
  // Publish form
  const handlePublishForm = async () => {
    try {
      if (!formData.title) {
        setError('Form title is required');
        setPublishDialogOpen(false);
        return;
      }
      
      // Calculate new revision number
      let newRevision = formData.revision || '1.0';
      if (formData.published) {
        // If already published, increment version based on selection
        newRevision = getNextRevision(revisionType);
      }
      
      const formToPublish = {
        ...formData,
        revision: newRevision,
        published: true,
        hasDraft: false, // Clear draft flag when publishing
        updatedAt: serverTimestamp()
      };
      
      if (isEditMode) {
        // Update existing form
        const formRef = doc(db, 'forms', formId);
        await updateDoc(formRef, formToPublish);
      } else {
        // Create new form
        const formsCollectionRef = collection(db, 'forms');
        const newFormRef = doc(formsCollectionRef);
        await setDoc(newFormRef, formToPublish);
        navigate(`/admin/form/edit/${newFormRef.id}`);
      }
      
      setFormData(formToPublish);
      setPublishDialogOpen(false);
      alert('Form published successfully!');
      
    } catch (err) {
      setError('Error publishing form: ' + err.message);
      console.error(err);
      setPublishDialogOpen(false);
    }
  };
  
  // Cancel publish
  const handleCancelPublish = () => {
    setPublishDialogOpen(false);
  };
  
  if (loading) {
    return (
      <Container className={classes.container}>
        <Typography variant="h6">Loading...</Typography>
      </Container>
    );
  }
  
  return (
    <div className={classes.root}>
      <Container className={classes.container}>
        <Typography variant="h4" className={classes.formTitle}>
          {isEditMode ? 'Edit Form' : 'Create New Form'}
        </Typography>
        
        <div className={classes.actionButtons}>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<SaveIcon />}
            onClick={handleSaveDraft}
          >
            Save Draft
          </Button>
          <Button 
            variant="contained" 
            color="secondary" 
            startIcon={<PublishIcon />}
            onClick={handlePublishClick}
          >
            Publish
          </Button>
          <Button 
            variant="outlined"
            onClick={() => navigate('/admin/dashboard')}
          >
            Cancel
          </Button>
        </div>

        {error && (
          <Typography color="error" component="div" className={classes.formSection}>
            {error}
          </Typography>
        )}
        
        {/* Form Header Section */}
        <Paper className={classes.paper}>
          <Typography variant="h5" gutterBottom>
            Form Details
          </Typography>
          
          <TextField
            fullWidth
            required
            margin="normal"
            label="Form Title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            variant="outlined"
          />
          
          <TextField
            fullWidth
            margin="normal"
            label="Form Description/Instructions"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            variant="outlined"
            multiline
            rows={3}
          />
          
          {formData.published && (
            <div className={classes.revisionControl}>
              <Typography variant="subtitle2" gutterBottom>
                Current Revision: {formData.revision || '1.0'}
              </Typography>
              
              <FormControl component="fieldset" className={classes.formSection}>
                <FormLabel component="legend">Revision Type for Next Save</FormLabel>
                <RadioGroup 
                  row 
                  value={revisionType} 
                  onChange={(e) => setRevisionType(e.target.value)}
                >
                  <FormControlLabel 
                    value="minor" 
                    control={<Radio color="primary" />} 
                    label={`Minor Revision (Next: ${getNextRevision('minor')})`} 
                  />
                  <FormControlLabel 
                    value="major" 
                    control={<Radio color="primary" />} 
                    label={`Major Revision (Next: ${getNextRevision('major')})`} 
                  />
                </RadioGroup>
              </FormControl>
            </div>
          )}
        </Paper>
        
        {/* Blocks Section */}
        <Paper className={classes.paper}>
          <div className={classes.formSection}>
            <Typography variant="h5" gutterBottom>
              Form Structure
            </Typography>
            
            <Typography variant="subtitle2" gutterBottom>
              Add blocks to create the structure of your form. Blocks can be fields, groups, or signature areas.
            </Typography>
          </div>
          
          <List className={classes.blockList}>
            {formData.blocks.length === 0 ? (
              <Typography align="center" color="textSecondary">
                No blocks added yet. Click the "Add Block" button to start building your form.
              </Typography>
            ) : (
              formData.blocks.map((block, index) => (
                <ListItem 
                  key={index}
                  className={classes.blockItem}
                  button
                  onClick={() => handleEditBlock(block, index)}
                >
                  <IconButton className={classes.dragHandle} size="small">
                    <DragIcon />
                  </IconButton>
                  
                  <ListItemText
                    primary={`${block.title || 'Untitled Block'} (${block.type})`}
                    secondary={block.description || ''}
                  />
                  
                  <ListItemSecondaryAction>
                    <IconButton edge="end" onClick={(e) => {
                      e.stopPropagation();
                      handleEditBlock(block, index);
                    }}>
                      <EditIcon />
                    </IconButton>
                    <IconButton edge="end" onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteBlock(index);
                    }}>
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))
            )}
          </List>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            className={classes.addBlockButton}
            onClick={() => handleAddBlock()}
          >
            Add Block
          </Button>
        </Paper>
      </Container>
      
      {/* Block Editor Dialog */}
      <BlockEditor
        open={blockEditorOpen}
        block={currentBlock}
        onSave={handleSaveBlock}
        onClose={() => setBlockEditorOpen(false)}
      />
      
      {/* Publish Confirmation Dialog */}
      <Dialog open={publishDialogOpen} onClose={handleCancelPublish}>
        <DialogTitle>Publish Form</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Publishing will make this form available to users and create a new revision.
          </DialogContentText>
          
          {formData.published && (
            <FormControl fullWidth margin="normal">
              <InputLabel>Revision Type</InputLabel>
              <Select
                value={revisionType}
                onChange={(e) => setRevisionType(e.target.value)}
              >
                <MenuItem value="minor">Minor Revision (Next: {getNextRevision('minor')})</MenuItem>
                <MenuItem value="major">Major Revision (Next: {getNextRevision('major')})</MenuItem>
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelPublish} color="default">
            Cancel
          </Button>
          <Button onClick={handlePublishForm} color="primary" autoFocus>
            Publish
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default FormEditor;