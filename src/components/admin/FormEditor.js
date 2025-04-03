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
  IconButton,
  Box,
  useMediaQuery,
  makeStyles,
  useTheme
} from '@material-ui/core';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  Save as SaveIcon,
  Publish as PublishIcon,
  Cancel as CancelIcon
} from '@material-ui/icons';

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
  },
  content: {
    padding: theme.spacing(3),
    maxWidth: '900px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: theme.spacing(3),
  },
  title: {
    marginBottom: theme.spacing(2),
  },
  actionButtons: {
    display: 'flex',
    justifyContent: 'center',
    gap: theme.spacing(2),
    marginBottom: theme.spacing(3),
  },
  paper: {
    padding: theme.spacing(3),
    marginBottom: theme.spacing(3),
  },
  formSection: {
    marginBottom: theme.spacing(3),
  },
  blockList: {
    marginTop: theme.spacing(2),
  },
  blockItem: {
    border: `1px solid ${theme.palette.divider}`,
    marginBottom: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
  },
  nestedBlock: {
    marginLeft: theme.spacing(4),
  },
  blockActions: {
    display: 'flex',
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
  mobileWarning: {
    padding: theme.spacing(3),
    margin: theme.spacing(2),
    backgroundColor: theme.palette.warning.light,
    borderRadius: theme.shape.borderRadius,
    textAlign: 'center',
  },
}));

function FormEditor() {
  const classes = useStyles();
  const { formId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const isEditMode = Boolean(formId);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    department: '',
    blocks: [],
    revision: '1.0',
    published: false,
    hasDraft: false
  });
  
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState('');
  const [blockEditorOpen, setBlockEditorOpen] = useState(false);
  const [blockEditorMode, setBlockEditorMode] = useState('section');
  const [currentBlock, setCurrentBlock] = useState(null);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(-1);
  const [parentBlockIndex, setParentBlockIndex] = useState(-1);
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
    } else {
      // If it's a new form, add a default group
      setFormData({
        ...formData,
        blocks: [{
          id: `group-${Date.now()}`,
          type: 'group',
          title: 'Section 1',
          description: '',
          children: []
        }]
      });
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
  
  // Open section editor (add group)
  const handleAddSection = () => {
    setBlockEditorMode('section');
    setCurrentBlock({
      type: 'group',
      title: '',
    });
    setCurrentBlockIndex(-1);
    setParentBlockIndex(-1);
    setBlockEditorOpen(true);
  };
  
  // Open block editor for adding a field or signature within a group
  const handleAddBlockToGroup = (parentIndex) => {
    setBlockEditorMode('field-or-signature');
    setCurrentBlock({
      type: 'field',
      title: '',
    });
    setCurrentBlockIndex(-1);
    setParentBlockIndex(parentIndex);
    setBlockEditorOpen(true);
  };
  
  // Edit existing block
  const handleEditBlock = (block, blockIndex, parentIndex = -1) => {
    setBlockEditorMode(block.type === 'group' ? 'section' : 'field');
    setCurrentBlock({...block});
    setCurrentBlockIndex(blockIndex);
    setParentBlockIndex(parentIndex);
    setBlockEditorOpen(true);
  };
  
  // Save block from editor
  const handleSaveBlock = (blockData) => {
    let updatedBlocks = [...formData.blocks];
    
    if (parentBlockIndex === -1) {
      // We're dealing with a top-level block (section/group)
      if (currentBlockIndex === -1) {
        // Add new section
        updatedBlocks.push({
          ...blockData,
          id: `group-${Date.now()}`,
          children: []
        });
      } else {
        // Update existing section
        updatedBlocks[currentBlockIndex] = {
          ...updatedBlocks[currentBlockIndex],
          ...blockData
        };
      }
    } else {
      // We're dealing with a child block (field/signature)
      const parentBlock = {...updatedBlocks[parentBlockIndex]};
      const children = [...(parentBlock.children || [])];
      
      if (currentBlockIndex === -1) {
        // Add new field to section
        children.push({
          ...blockData,
          id: `block-${Date.now()}`
        });
      } else {
        // Update existing field
        children[currentBlockIndex] = {
          ...children[currentBlockIndex],
          ...blockData
        };
      }
      
      parentBlock.children = children;
      updatedBlocks[parentBlockIndex] = parentBlock;
    }
    
    setFormData({
      ...formData,
      blocks: updatedBlocks
    });
    
    setBlockEditorOpen(false);
    setCurrentBlock(null);
    setCurrentBlockIndex(-1);
    setParentBlockIndex(-1);
  };
  
  // Delete block
  const handleDeleteBlock = (blockIndex, parentIndex = -1) => {
    let updatedBlocks = [...formData.blocks];
    
    if (parentIndex === -1) {
      // Don't allow deleting the last section
      if (updatedBlocks.length <= 1) {
        setError('Forms must have at least one section');
        return;
      }
      
      // Delete section
      updatedBlocks = updatedBlocks.filter((_, i) => i !== blockIndex);
    } else {
      // Delete field from section
      const parentBlock = {...updatedBlocks[parentIndex]};
      const children = parentBlock.children.filter((_, i) => i !== blockIndex);
      parentBlock.children = children;
      updatedBlocks[parentIndex] = parentBlock;
    }
    
    setFormData({
      ...formData,
      blocks: updatedBlocks
    });
  };
  
  // Move block up
  const handleMoveBlockUp = (blockIndex, parentIndex = -1) => {
    if (blockIndex === 0) return; // Already at the top
    
    let updatedBlocks = [...formData.blocks];
    
    if (parentIndex === -1) {
      // Swap sections
      [updatedBlocks[blockIndex - 1], updatedBlocks[blockIndex]] = 
      [updatedBlocks[blockIndex], updatedBlocks[blockIndex - 1]];
    } else {
      // Swap fields within a section
      const parentBlock = {...updatedBlocks[parentIndex]};
      const children = [...parentBlock.children];
      
      [children[blockIndex - 1], children[blockIndex]] = 
      [children[blockIndex], children[blockIndex - 1]];
      
      parentBlock.children = children;
      updatedBlocks[parentIndex] = parentBlock;
    }
    
    setFormData({
      ...formData,
      blocks: updatedBlocks
    });
  };
  
  // Move block down
  const handleMoveBlockDown = (blockIndex, parentIndex = -1) => {
    let updatedBlocks = [...formData.blocks];
    
    if (parentIndex === -1) {
      // Can't move past the end
      if (blockIndex >= updatedBlocks.length - 1) return;
      
      // Swap sections
      [updatedBlocks[blockIndex], updatedBlocks[blockIndex + 1]] = 
      [updatedBlocks[blockIndex + 1], updatedBlocks[blockIndex]];
    } else {
      // Swap fields within a section
      const parentBlock = {...updatedBlocks[parentIndex]};
      const children = [...parentBlock.children];
      
      // Can't move past the end
      if (blockIndex >= children.length - 1) return;
      
      [children[blockIndex], children[blockIndex + 1]] = 
      [children[blockIndex + 1], children[blockIndex]];
      
      parentBlock.children = children;
      updatedBlocks[parentIndex] = parentBlock;
    }
    
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
        {/* Form Header */}
        <div className={classes.header}>
          <Typography variant="h4" className={classes.title}>
            {isEditMode ? 'Edit Form' : 'Create New Form'}
          </Typography>
          
          <div className={classes.actionButtons}>
            <Button 
              variant="outlined"
              color="default"
              size="large"
              startIcon={<CancelIcon />}
              onClick={() => navigate('/admin/dashboard')}
            >
              Cancel
            </Button>
            
            <Button 
              variant="outlined"
              color="primary"
              size="large"
              startIcon={<SaveIcon />}
              onClick={handleSaveDraft}
            >
              Save Draft
            </Button>
            
            <Button 
              variant="contained"
              color="primary"
              size="large"
              startIcon={<PublishIcon />}
              onClick={handlePublishClick}
            >
              Publish
            </Button>
          </div>
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
          
          <TextField
            fullWidth
            margin="normal"
            label="Department"
            name="department"
            value={formData.department}
            onChange={handleInputChange}
            variant="outlined"
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
        
        {/* Sections Section */}
        <Paper className={classes.paper}>
          <div className={classes.formSection}>
            <Typography variant="h5" gutterBottom>
              Form Structure
            </Typography>
            
            <Typography variant="subtitle2" gutterBottom>
              Add sections to organize your form, then add fields within each section.
            </Typography>
          </div>
          
          <List className={classes.blockList}>
            {formData.blocks.map((block, blockIndex) => (
              <React.Fragment key={block.id || blockIndex}>
                {/* Section (Group) */}
                <ListItem 
                  className={classes.blockItem}
                  button
                  onClick={() => handleEditBlock(block, blockIndex)}
                >
                  <ListItemText
                    primary={
                      <Typography variant="subtitle1">
                        <b>Section {blockIndex + 1}:</b> {block.title || 'Untitled Section'}
                      </Typography>
                    }
                    secondary={block.description || ''}
                  />
                  
                  <ListItemSecondaryAction className={classes.blockActions}>
                    <IconButton 
                      edge="end" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveBlockUp(blockIndex);
                      }}
                      disabled={blockIndex === 0}
                    >
                      <ArrowUpIcon />
                    </IconButton>
                    
                    <IconButton 
                      edge="end" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveBlockDown(blockIndex);
                      }}
                      disabled={blockIndex === formData.blocks.length - 1}
                    >
                      <ArrowDownIcon />
                    </IconButton>
                    
                    <IconButton 
                      edge="end" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditBlock(block, blockIndex);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                    
                    <IconButton 
                      edge="end" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBlock(blockIndex);
                      }}
                      disabled={formData.blocks.length <= 1}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                
                {/* Fields within Section */}
                {block.children && block.children.map((childBlock, childIndex) => (
                  <ListItem 
                    key={childBlock.id || `${blockIndex}-${childIndex}`}
                    className={`${classes.blockItem} ${classes.nestedBlock}`}
                    button
                    onClick={() => handleEditBlock(childBlock, childIndex, blockIndex)}
                  >
                    <ListItemText
                      primary={
                        <Typography variant="body1">
                          {childBlock.title || 'Untitled Field'} ({childBlock.type})
                        </Typography>
                      }
                      secondary={childBlock.description || ''}
                    />
                    
                    <ListItemSecondaryAction>
                      <IconButton 
                        edge="end" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveBlockUp(childIndex, blockIndex);
                        }}
                        disabled={childIndex === 0}
                      >
                        <ArrowUpIcon />
                      </IconButton>
                      
                      <IconButton 
                        edge="end" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveBlockDown(childIndex, blockIndex);
                        }}
                        disabled={childIndex === (block.children?.length || 0) - 1}
                      >
                        <ArrowDownIcon />
                      </IconButton>
                      
                      <IconButton 
                        edge="end" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditBlock(childBlock, childIndex, blockIndex);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                      
                      <IconButton 
                        edge="end" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBlock(childIndex, blockIndex);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
                
                {/* Add Field/Signature Button */}
                <Box ml={4} mb={2}>
                  <Button
                    variant="outlined"
                    color="primary"
                    size="small"
                    startIcon={<AddIcon />}
                    className={classes.addBlockButton}
                    onClick={() => handleAddBlockToGroup(blockIndex)}
                  >
                    Add Field or Signature
                  </Button>
                </Box>
              </React.Fragment>
            ))}
          </List>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            className={classes.addBlockButton}
            onClick={handleAddSection}
          >
            Add Section
          </Button>
        </Paper>
      </Container>
      
      {/* Block Editor Dialog */}
      <BlockEditor
        open={blockEditorOpen}
        block={currentBlock}
        mode={blockEditorMode}
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