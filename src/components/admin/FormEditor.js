// src/components/admin/FormEditor.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection } from 'firebase/firestore';
import { db } from '../../firebase';
import BlockEditor from './BlockEditor';
import { useTheme, useMediaQuery } from '@material-ui/core';

// Material UI imports
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
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
  Box,
  Tooltip,
  makeStyles
} from '@material-ui/core';
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  Save as SaveIcon,
  Publish as PublishIcon,
  CreateNewFolder as CreateNewFolderIcon
} from '@material-ui/icons';

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
  },
  title: {
    textAlign: 'center',
    marginBottom: theme.spacing(3),
  },
  paper: {
    padding: theme.spacing(3),
    marginBottom: theme.spacing(3),
    maxWidth: '900px',
    margin: '0 auto',
  },
  formSection: {
    marginBottom: theme.spacing(3),
  },
  buttonsContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(3),
  },
  blockList: {
    marginTop: theme.spacing(2),
    width: '100%'
  },
  blockItemContainer: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column'
  },
  blockItem: {
    border: `1px solid ${theme.palette.divider}`,
    marginBottom: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    width: '100%',
    boxSizing: 'border-box'
  },
  nestedSection: {
    marginLeft: theme.spacing(4),
    width: 'calc(100% - 32px)'
  },
  nestedNestedSection: {
    marginLeft: theme.spacing(8),
    width: 'calc(100% - 64px)'
  },
  actionButton: {
    marginRight: theme.spacing(1),
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
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    '& .MuiTypography-root': {
      marginRight: theme.spacing(1),
    },
  },
  sectionLevel: {
    color: theme.palette.text.secondary,
    marginRight: theme.spacing(1),
  },
  actionButtons: {
    display: 'flex',
    '& > *': {
      marginLeft: theme.spacing(0.5),
    },
  },
  mobileWarning: {
    padding: theme.spacing(3),
    marginBottom: theme.spacing(3),
    backgroundColor: theme.palette.warning.light,
    color: theme.palette.warning.contrastText,
  },
  fieldBlock: {
    backgroundColor: theme.palette.background.default,
  },
  signatureBlock: {
    backgroundColor: theme.palette.background.default,
    border: `1px dashed ${theme.palette.primary.main}`
  }
}));

function FormEditor() {
  const classes = useStyles();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { formId } = useParams();
  const navigate = useNavigate();
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
  const [currentBlock, setCurrentBlock] = useState(null);
  const [currentBlockPath, setCurrentBlockPath] = useState(null);
  const [blockEditorMode, setBlockEditorMode] = useState('section'); // 'section', 'subsection', 'subsubsection', 'field-or-signature'
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
          let formDataFromDB = formSnap.data();
          
          // Ensure all blocks have proper structure for new nested hierarchy
          if (formDataFromDB.blocks) {
            formDataFromDB.blocks = ensureBlockHierarchy(formDataFromDB.blocks);
          }
          
          setFormData(formDataFromDB);
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
    
    // New form initialization
    if (!isEditMode && formData.blocks.length === 0) {
      // Start with a default section
      setFormData({
        ...formData,
        blocks: [{
          id: `section-${Date.now()}`,
          type: 'group',
          title: 'Section 1',
          description: '',
          children: []
        }]
      });
      setLoading(false);
    } else if (isEditMode) {
      loadFormData();
    } else {
      setLoading(false);
    }
  }, [formId, isEditMode, navigate]);
  
  // Ensure all blocks have the proper structure for the nested hierarchy
  const ensureBlockHierarchy = (blocks) => {
    return blocks.map(block => {
      // Make sure all blocks have an id
      if (!block.id) {
        block.id = `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
      
      // Make sure all groups have a children array
      if (block.type === 'group' && !block.children) {
        block.children = [];
      }
      
      // Recursively ensure children have proper structure
      if (block.type === 'group' && block.children) {
        block.children = ensureBlockHierarchy(block.children);
      }
      
      return block;
    });
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
  
  // Open block editor for a new section
  const handleAddSection = () => {
    setCurrentBlock({
      type: 'group',
      title: '',
      description: '',
      children: []
    });
    setCurrentBlockPath(null);
    setBlockEditorMode('section');
    setBlockEditorOpen(true);
  };
  
  // Open block editor for a new subsection
  const handleAddSubsection = (parentIndex) => {
    setCurrentBlock({
      type: 'group',
      title: '',
      description: '',
      children: []
    });
    setCurrentBlockPath([parentIndex]);
    setBlockEditorMode('subsection');
    setBlockEditorOpen(true);
  };
  
  // Open block editor for a new sub-subsection
  const handleAddSubSubsection = (parentIndex, childIndex) => {
    setCurrentBlock({
      type: 'group',
      title: '',
      description: '',
      children: []
    });
    setCurrentBlockPath([parentIndex, childIndex]);
    setBlockEditorMode('subsubsection');
    setBlockEditorOpen(true);
  };
  
  // Open block editor for a new field or signature block
  const handleAddBlockToGroup = (path) => {
    setCurrentBlock({
      type: 'field',
      title: '',
      fieldType: 'short_text'
    });
    setCurrentBlockPath(path);
    setBlockEditorMode('field-or-signature');
    setBlockEditorOpen(true);
  };
  
  // Helper function to find a block by path and update it
  const updateBlockAtPath = (blocks, path, newBlock, isDelete = false) => {
    // If no path, it's a top-level block
    if (!path || path.length === 0) {
      return isDelete 
        ? blocks.filter(block => block.id !== newBlock.id)
        : blocks.map(block => block.id === newBlock.id ? newBlock : block);
    }
    
    // We need to navigate to the proper location in the hierarchy
    const [currentIndex, ...restPath] = path;
    
    return blocks.map((block, index) => {
      if (index !== currentIndex) return block;
      
      // If we're at the parent of the target
      if (restPath.length === 0) {
        const children = isDelete
          ? block.children.filter(child => child.id !== newBlock.id)
          : block.children.map(child => child.id === newBlock.id ? newBlock : child);
        
        return { ...block, children };
      }
      
      // We need to go deeper
      if (block.type === 'group' && block.children) {
        return {
          ...block,
          children: updateBlockAtPath(block.children, restPath, newBlock, isDelete)
        };
      }
      
      return block;
    });
  };
  
  // Helper function to add a block at a specific path
  const addBlockAtPath = (blocks, path, newBlock) => {
    // If no path, it's a top-level block
    if (!path || path.length === 0) {
      return [...blocks, newBlock];
    }
    
    // We need to navigate to the proper location in the hierarchy
    const [currentIndex, ...restPath] = path;
    
    return blocks.map((block, index) => {
      if (index !== currentIndex) return block;
      
      // If we're at the parent of the target
      if (restPath.length === 0) {
        return { 
          ...block, 
          children: [...(block.children || []), newBlock] 
        };
      }
      
      // We need to go deeper
      if (block.type === 'group' && block.children) {
        return {
          ...block,
          children: addBlockAtPath(block.children, restPath, newBlock)
        };
      }
      
      return block;
    });
  };
  
  // Helper function to move a block up or down within its parent
  const moveBlock = (path, direction) => {
    if (!path) return;
    
    const updatedFormData = { ...formData };
    let blocks = [...updatedFormData.blocks];
    
    // If it's a top-level block
    if (path.length === 1) {
      const index = path[0];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      
      // Check boundaries
      if (newIndex < 0 || newIndex >= blocks.length) return;
      
      // Swap blocks
      [blocks[index], blocks[newIndex]] = [blocks[newIndex], blocks[index]];
      
      updatedFormData.blocks = blocks;
      setFormData(updatedFormData);
      return;
    }
    
    // For nested blocks, we need to navigate to the parent
    let parentBlocks = blocks;
    let currentPath = [];
    let targetArray, targetIndex;
    
    for (let i = 0; i < path.length - 1; i++) {
      currentPath.push(path[i]);
      if (i === path.length - 2) {
        targetArray = parentBlocks[path[i]].children;
        targetIndex = path[path.length - 1];
      } else {
        parentBlocks = parentBlocks[path[i]].children;
      }
    }
    
    // Now swap the block with its neighbor
    const newIndex = direction === 'up' ? targetIndex - 1 : targetIndex + 1;
    
    // Check boundaries
    if (newIndex < 0 || newIndex >= targetArray.length) return;
    
    // Swap blocks
    [targetArray[targetIndex], targetArray[newIndex]] = [targetArray[newIndex], targetArray[targetIndex]];
    
    setFormData(updatedFormData);
  };
  
  // Edit existing block
  const handleEditBlock = (block, path) => {
    setCurrentBlock({...block});
    setCurrentBlockPath(path);
    
    // Determine the mode based on the block type and path depth
    if (block.type === 'group') {
      if (!path || path.length === 0) {
        setBlockEditorMode('section');
      } else if (path.length === 1) {
        setBlockEditorMode('subsection');
      } else {
        setBlockEditorMode('subsubsection');
      }
    } else {
      setBlockEditorMode('field-or-signature');
    }
    
    setBlockEditorOpen(true);
  };
  
  // Save block from editor
  const handleSaveBlock = (blockData) => {
    // Add a unique ID if it's a new block
    if (!blockData.id) {
      blockData.id = `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    let updatedBlocks = [...formData.blocks];
    
    // If it's a block being edited (not a new one)
    if (currentBlock.id) {
      updatedBlocks = updateBlockAtPath(updatedBlocks, currentBlockPath, blockData);
    } else {
      // It's a new block, add it to the appropriate location
      updatedBlocks = addBlockAtPath(updatedBlocks, currentBlockPath, blockData);
    }
    
    setFormData({
      ...formData,
      blocks: updatedBlocks
    });
    
    setBlockEditorOpen(false);
    setCurrentBlock(null);
    setCurrentBlockPath(null);
  };
  
  // Delete block
  const handleDeleteBlock = (block, path) => {
    // Don't allow deleting when it would leave the form with no sections
    if (formData.blocks.length <= 1 && (!path || path.length === 0)) {
      alert("Forms must have at least one section. You cannot delete the last remaining section.");
      return;
    }
    
    let updatedBlocks = [...formData.blocks];
    
    if (!path || path.length === 0) {
      // It's a top-level block
      updatedBlocks = updatedBlocks.filter(b => b.id !== block.id);
    } else {
      // It's a nested block
      updatedBlocks = updateBlockAtPath(updatedBlocks, path, block, true);
    }
    
    setFormData({
      ...formData,
      blocks: updatedBlocks
    });
  };
  
  // Move block up
  const handleMoveUp = (path) => {
    moveBlock(path, 'up');
  };
  
  // Move block down
  const handleMoveDown = (path) => {
    moveBlock(path, 'down');
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
  
  // Cancel editing and return to dashboard
  const handleCancel = () => {
    navigate('/admin/dashboard');
  };
  
  // Generate section number based on path and index
  const generateSectionNumber = (path, index) => {
    if (!path || path.length === 0) {
      return `${index + 1}.`;
    } else if (path.length === 1) {
      return `${path[0] + 1}.${index + 1}.`;
    } else if (path.length === 2) {
      return `${path[0] + 1}.${path[1] + 1}.${index + 1}.`;
    }
    return '';
  };
  
  // Get the class for the block item based on its type and level
  const getBlockClass = (block, level) => {
    let baseClass = classes.blockItem;
    
    if (block.type === 'field') {
      baseClass = `${baseClass} ${classes.fieldBlock}`;
    } else if (block.type === 'signature') {
      baseClass = `${baseClass} ${classes.signatureBlock}`;
    }
    
    return baseClass;
  };
  
  // Render block based on its type and depth
  const renderBlock = (block, path = [], level = 0, sectionNumber = '') => {
    const isGroup = block.type === 'group';
    const blockClass = getBlockClass(block, level);
    const containerClass = level === 1 
      ? classes.nestedSection 
      : level === 2 
        ? classes.nestedNestedSection 
        : '';
    
    return (
      <div key={block.id} className={`${classes.blockItemContainer} ${containerClass}`}>
        <ListItem 
          className={blockClass}
          button
          onClick={() => handleEditBlock(block, path)}
        >
          <div className={classes.sectionTitle}>
            <Typography className={classes.sectionLevel} variant="body2">
              {sectionNumber}
            </Typography>
            <ListItemText
              primary={block.title || 'Untitled Block'}
              secondary={
                block.type === 'group' 
                  ? 'Section' 
                  : block.type === 'field' 
                    ? `Field (${block.fieldType})` 
                    : 'Signature'
              }
            />
          </div>
          
          <ListItemSecondaryAction className={classes.actionButtons}>
            {/* Show up/down arrows for reordering */}
            <Tooltip title="Move Up" arrow>
              <span>
                <IconButton 
                  edge="end" 
                  className={classes.actionButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveUp(path);
                  }}
                  disabled={path.length > 0 ? path[path.length - 1] === 0 : path[0] === 0}
                >
                  <ArrowUpIcon />
                </IconButton>
              </span>
            </Tooltip>
            
            <Tooltip title="Move Down" arrow>
              <span>
                <IconButton 
                  edge="end" 
                  className={classes.actionButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveDown(path);
                  }}
                  disabled={
                    path.length === 0 
                      ? path[0] === formData.blocks.length - 1 
                      : path.length === 1 
                        ? path[0] >= formData.blocks.length || 
                          !formData.blocks[path[0]].children || 
                          path[1] === formData.blocks[path[0]].children.length - 1
                        : path.length === 2
                          ? path[0] >= formData.blocks.length ||
                            path[1] >= formData.blocks[path[0]].children.length ||
                            !formData.blocks[path[0]].children[path[1]].children ||
                            path[2] === formData.blocks[path[0]].children[path[1]].children.length - 1
                          : false
                  }
                >
                  <ArrowDownIcon />
                </IconButton>
              </span>
            </Tooltip>
            
            {/* Group-specific actions for adding sub-items */}
            {isGroup && (
              <>
                {level === 0 && (
                  <Tooltip title="Add Subsection" arrow>
                    <IconButton 
                      edge="end" 
                      className={classes.actionButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddSubsection(path[0]);
                      }}
                    >
                      <CreateNewFolderIcon />
                    </IconButton>
                  </Tooltip>
                )}
                
                {level === 1 && (
                  <Tooltip title="Add Sub-subsection" arrow>
                    <IconButton 
                      edge="end" 
                      className={classes.actionButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddSubSubsection(path[0], path[1]);
                      }}
                    >
                      <CreateNewFolderIcon />
                    </IconButton>
                  </Tooltip>
                )}
                
                <Tooltip title="Add Field or Signature" arrow>
                  <IconButton 
                    edge="end" 
                    className={classes.actionButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddBlockToGroup(path);
                    }}
                  >
                    <AddIcon />
                  </IconButton>
                </Tooltip>
              </>
            )}
            
            {/* Edit and delete buttons */}
            <Tooltip title="Edit" arrow>
              <IconButton 
                edge="end" 
                className={classes.actionButton}
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditBlock(block, path);
                }}
              >
                <EditIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Delete" arrow>
              <span>
                <IconButton 
                  edge="end"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteBlock(block, path);
                  }}
                  disabled={formData.blocks.length <= 1 && (!path || path.length === 0)}
                >
                  <DeleteIcon />
                </IconButton>
              </span>
            </Tooltip>
          </ListItemSecondaryAction>
        </ListItem>
        
        {/* Recursively render children if this is a group */}
        {isGroup && block.children && block.children.length > 0 && (
          <div style={{ width: '100%' }}>
            {block.children.map((childBlock, childIndex) => {
              const childPath = [...path, childIndex];
              const childSectionNumber = generateSectionNumber(path, childIndex);
              return renderBlock(childBlock, childPath, level + 1, childSectionNumber);
            })}
          </div>
        )}
      </div>
    );
  };

  // If on mobile, show warning
  if (isMobile) {
    return (
      <Container>
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
  
  if (loading) {
    return (
      <Container>
        <Typography variant="h6">Loading...</Typography>
      </Container>
    );
  }
  
  return (
    <div className={classes.root}>
      <Container>
        <Typography variant="h4" className={classes.title}>
          {isEditMode ? 'Edit Form' : 'Create New Form'}
        </Typography>
        
        <div className={classes.buttonsContainer}>
          <Button 
            variant="outlined"
            color="default"
            onClick={handleCancel}
            className={classes.actionButton}
          >
            Cancel
          </Button>
          
          <Button 
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={handleSaveDraft}
            className={classes.actionButton}
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
        
        {/* Blocks Section */}
        <Paper className={classes.paper}>
          <div className={classes.formSection}>
            <Typography variant="h5" gutterBottom>
              Form Structure
            </Typography>
            
            <Typography variant="subtitle2" gutterBottom>
              Add sections and fields to create the structure of your form. Sections can contain subsections and fields.
            </Typography>
          </div>
          
          <List className={classes.blockList}>
            {formData.blocks.length === 0 ? (
              <Typography align="center" color="textSecondary">
                No sections added yet. Click the "Add Section" button to start building your form.
              </Typography>
            ) : (
              formData.blocks.map((block, index) => {
                return renderBlock(block, [index], 0, `${index + 1}.`);
              })
            )}
          </List>
          
          <Tooltip title="Add a new top-level section to your form" arrow>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              className={classes.addBlockButton}
              onClick={handleAddSection}
            >
              Add Section
            </Button>
          </Tooltip>
        </Paper>
      </Container>
      
      {/* Block Editor Dialog */}
      <BlockEditor
        open={blockEditorOpen}
        block={currentBlock}
        onSave={handleSaveBlock}
        onClose={() => setBlockEditorOpen(false)}
        mode={blockEditorMode}
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