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
  ListItemIcon,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  makeStyles
} from '@material-ui/core';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  Save as SaveIcon,
  Publish as PublishIcon,
  ArrowBack as ArrowBackIcon,
  ChevronRight as ExpandIcon
} from '@material-ui/icons';

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
  },
  content: {
    padding: theme.spacing(3),
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
  nestedBlockItem: {
    marginLeft: theme.spacing(4),
    border: `1px solid ${theme.palette.divider}`,
    marginBottom: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
  },
  groupBlock: {
    backgroundColor: theme.palette.background.default,
  },
  dragHandle: {
    cursor: 'move',
  },
  addBlockButton: {
    marginTop: theme.spacing(1),
  },
  addNestedBlockButton: {
    marginLeft: theme.spacing(4),
    marginTop: theme.spacing(1),
  },
  revisionControl: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.default,
    borderRadius: theme.shape.borderRadius,
  },
  headerButtons: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(3),
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
    hasDraft: false,
    department: '',
    tags: [],
    owner: ''
  });
  
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState('');
  const [blockEditorOpen, setBlockEditorOpen] = useState(false);
  const [currentBlock, setCurrentBlock] = useState(null);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(-1);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [revisionType, setRevisionType] = useState('minor');
  const [parentBlockId, setParentBlockId] = useState(null);
  
  // Flattened blocks for rendering purpose
  const [flattenedBlocks, setFlattenedBlocks] = useState([]);
  
  // Load form data if in edit mode
  useEffect(() => {
    async function loadFormData() {
      try {
        if (!formId) return;
        
        const formRef = doc(db, 'forms', formId);
        const formSnap = await getDoc(formRef);
        
        if (formSnap.exists()) {
          const data = formSnap.data();
          setFormData(data);
          // Flatten the blocks for rendering
          flattenBlocksForDisplay(data.blocks);
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
    } else {
      // Initialize flattenedBlocks for new form
      setFlattenedBlocks([]);
    }
  }, [formId, isEditMode, navigate]);
  
  // Helper function to flatten the hierarchical blocks for display
  const flattenBlocksForDisplay = (blocks, level = 0, parentId = null) => {
    let flattened = [];
    
    blocks.forEach((block, index) => {
      // Add the current block with its level and index info
      flattened.push({
        ...block,
        level,
        index,
        parentId,
        flatIndex: flattened.length
      });
      
      // If it's a group block with children, recursively flatten those too
      if (block.type === 'group' && block.children && block.children.length > 0) {
        const childBlocks = flattenBlocksForDisplay(block.children, level + 1, block.id);
        flattened = flattened.concat(childBlocks);
      }
    });
    
    setFlattenedBlocks(flattened);
    return flattened;
  };
  
  // Helper function to create a unique block ID
  const generateBlockId = () => {
    return 'block_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
  };
  
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
  
  // Open block editor to add a new block
  const handleAddBlock = (parentId = null) => {
    setCurrentBlock({
      type: 'field',
      title: '',
      id: generateBlockId()
    });
    setCurrentBlockIndex(-1);
    setParentBlockId(parentId);
    setBlockEditorOpen(true);
  };
  
  // Edit existing block
  const handleEditBlock = (block, index) => {
    setCurrentBlock({...block});
    setCurrentBlockIndex(index);
    setParentBlockId(block.parentId);
    setBlockEditorOpen(true);
  };
  
  // Save block from editor
  const handleSaveBlock = (blockData) => {
    const updatedFormData = {...formData};
    
    // If this is a new block
    if (currentBlockIndex === -1) {
      // If there's a parent block ID, add it to that group's children
      if (parentBlockId) {
        // Find the parent block in the hierarchy
        const findAndAddToParent = (blocks) => {
          for (let i = 0; i < blocks.length; i++) {
            if (blocks[i].id === parentBlockId) {
              // Initialize children array if it doesn't exist
              if (!blocks[i].children) {
                blocks[i].children = [];
              }
              // Add the new block to children
              blocks[i].children.push({
                ...blockData,
                id: blockData.id || generateBlockId()
              });
              return true;
            }
            // If this is a group block, search its children
            if (blocks[i].type === 'group' && blocks[i].children) {
              if (findAndAddToParent(blocks[i].children)) {
                return true;
              }
            }
          }
          return false;
        };
        
        findAndAddToParent(updatedFormData.blocks);
      } else {
        // Add to root level
        updatedFormData.blocks.push({
          ...blockData,
          id: blockData.id || generateBlockId()
        });
      }
    } else {
      // Update existing block
      const targetBlock = flattenedBlocks[currentBlockIndex];
      
      // Function to find and update the block in the hierarchy
      const findAndUpdateBlock = (blocks) => {
        for (let i = 0; i < blocks.length; i++) {
          if (blocks[i].id === targetBlock.id) {
            // Update this block with new data, preserving its ID and children
            const children = blocks[i].children;
            blocks[i] = {
              ...blockData,
              id: targetBlock.id
            };
            if (children) {
              blocks[i].children = children;
            }
            return true;
          }
          // If this is a group block, search its children
          if (blocks[i].type === 'group' && blocks[i].children) {
            if (findAndUpdateBlock(blocks[i].children)) {
              return true;
            }
          }
        }
        return false;
      };
      
      findAndUpdateBlock(updatedFormData.blocks);
    }
    
    setFormData(updatedFormData);
    flattenBlocksForDisplay(updatedFormData.blocks);
    
    setBlockEditorOpen(false);
    setCurrentBlock(null);
    setCurrentBlockIndex(-1);
    setParentBlockId(null);
  };
  
  // Delete block
  const handleDeleteBlock = (index) => {
    const targetBlock = flattenedBlocks[index];
    const updatedFormData = {...formData};
    
    // Function to find and remove the block from the hierarchy
    const findAndRemoveBlock = (blocks) => {
      for (let i = 0; i < blocks.length; i++) {
        if (blocks[i].id === targetBlock.id) {
          // Remove this block
          blocks.splice(i, 1);
          return true;
        }
        // If this is a group block, search its children
        if (blocks[i].type === 'group' && blocks[i].children) {
          if (findAndRemoveBlock(blocks[i].children)) {
            return true;
          }
        }
      }
      return false;
    };
    
    findAndRemoveBlock(updatedFormData.blocks);
    setFormData(updatedFormData);
    flattenBlocksForDisplay(updatedFormData.blocks);
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
  
  // Cancel form editing
  const handleCancel = () => {
    navigate('/admin/dashboard');
  };
  
  // Render a block in the list
  const renderBlockItem = (block, index) => {
    const isGroupBlock = block.type === 'group';
    const isNested = block.level > 0;
    
    return (
      <React.Fragment key={block.id || index}>
        <ListItem 
          className={`${isNested ? classes.nestedBlockItem : classes.blockItem} ${isGroupBlock ? classes.groupBlock : ''}`}
          button
          onClick={() => handleEditBlock(block, block.flatIndex)}
          style={{ paddingLeft: `${(block.level + 1) * 16}px` }}
        >
          <ListItemIcon>
            <DragIcon className={classes.dragHandle} />
          </ListItemIcon>
          
          <ListItemText
            primary={
              <Typography style={{ fontWeight: isGroupBlock ? 'bold' : 'normal' }}>
                {block.title || 'Untitled Block'} ({block.type})
              </Typography>
            }
            secondary={block.description || ''}
          />
          
          <ListItemSecondaryAction>
            {isGroupBlock && (
              <IconButton 
                edge="end" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddBlock(block.id);
                }}
              >
                <AddIcon />
              </IconButton>
            )}
            <IconButton edge="end" onClick={(e) => {
              e.stopPropagation();
              handleEditBlock(block, block.flatIndex);
            }}>
              <EditIcon />
            </IconButton>
            <IconButton edge="end" onClick={(e) => {
              e.stopPropagation();
              handleDeleteBlock(block.flatIndex);
            }}>
              <DeleteIcon />
            </IconButton>
          </ListItemSecondaryAction>
        </ListItem>
      </React.Fragment>
    );
  };
  
  if (loading) {
    return (
      <Container className={classes.content}>
        <Typography variant="h6">Loading...</Typography>
      </Container>
    );
  }
  
  return (
    <div className={classes.root}>
      <Container className={classes.content}>
        <div className={classes.headerButtons}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <div>
            <Button 
              variant="outlined" 
              color="primary"
              startIcon={<SaveIcon />}
              onClick={handleSaveDraft}
              style={{ marginRight: '8px' }}
            >
              Save Draft
            </Button>
            <Button 
              variant="contained"
              color="primary"
              startIcon={<PublishIcon />}
              onClick={handlePublishClick}
            >
              Publish
            </Button>
          </div>
        </div>
        
        <Typography variant="h4" gutterBottom>
          {isEditMode ? 'Edit Form' : 'Create New Form'}
        </Typography>
        
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
          
          {/* Department selection */}
          <FormControl fullWidth margin="normal" variant="outlined">
            <InputLabel>Department</InputLabel>
            <Select
              name="department"
              value={formData.department || ''}
              onChange={handleInputChange}
              label="Department"
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              <MenuItem value="Maintenance">Maintenance</MenuItem>
              <MenuItem value="Operations">Operations</MenuItem>
              <MenuItem value="Engineering">Engineering</MenuItem>
              <MenuItem value="Administration">Administration</MenuItem>
              <MenuItem value="HR">Human Resources</MenuItem>
              <MenuItem value="Training">Training</MenuItem>
            </Select>
          </FormControl>
          
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
              Add blocks to create the structure of your form. Group blocks can contain other blocks.
            </Typography>
          </div>
          
          <List className={classes.blockList}>
            {flattenedBlocks.length === 0 ? (
              <Typography align="center" color="textSecondary">
                No blocks added yet. Click the "Add Block" button to start building your form.
              </Typography>
            ) : (
              flattenedBlocks.map((block, index) => renderBlockItem(block, index))
            )}
          </List>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            className={classes.addBlockButton}
            onClick={() => handleAddBlock(null)}
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