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
  AppBar,
  Toolbar,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
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
  ArrowBack as ArrowBackIcon,
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
  appBarSpacer: theme.mixins.toolbar,
  title: {
    flexGrow: 1,
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
    published: false
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
          navigate('/admin/dashboard');
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
        updatedAt: serverTimestamp()
      };
      
      if (isEditMode) {
        // Update existing form
        const formRef = doc(db, 'forms', formId);
        await updateDoc(formRef, formToSave);
      } else {
        // Create new form
        const formRef = doc(collection(db, 'forms'));
        await setDoc(formRef, formToSave);
        navigate(`/admin/form/edit/${formRef.id}`);
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
        // If already published, increment version
        const [major, minor] = newRevision.split('.').map(Number);
        if (revisionType === 'major') {
          newRevision = `${major + 1}.0`;
        } else {
          newRevision = `${major}.${minor + 1}`;
        }
      }
      
      const formToPublish = {
        ...formData,
        revision: newRevision,
        published: true,
        updatedAt: serverTimestamp()
      };
      
      if (isEditMode) {
        // Update existing form
        const formRef = doc(db, 'forms', formId);
        await updateDoc(formRef, formToPublish);
      } else {
        // Create new form
        const formRef = doc(collection(db, 'forms'));
        await setDoc(formRef, formToPublish);
        navigate(`/admin/form/edit/${formRef.id}`);
      }
      
      setFormData(formToPublish);
      setPublishDialogOpen(false);
      
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
      <Container>
        <div className={classes.appBarSpacer} />
        <Typography variant="h6">Loading...</Typography>
      </Container>
    );
  }
  
  return (
    <div className={classes.root}>
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
            {isEditMode ? 'Edit Form' : 'Create New Form'}
          </Typography>
          <Button 
            color="inherit" 
            startIcon={<SaveIcon />}
            onClick={handleSaveDraft}
          >
            Save Draft
          </Button>
          <Button 
            color="inherit" 
            startIcon={<PublishIcon />}
            onClick={handlePublishClick}
          >
            Publish
          </Button>
        </Toolbar>
      </AppBar>

      <div className={classes.appBarSpacer} />
      
      <Container>
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
            <Typography variant="subtitle2" gutterBottom>
              Current Revision: {formData.revision || '1.0'}
            </Typography>
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
                <MenuItem value="minor">Minor Revision (1.0 → 1.1)</MenuItem>
                <MenuItem value="major">Major Revision (1.0 → 2.0)</MenuItem>
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