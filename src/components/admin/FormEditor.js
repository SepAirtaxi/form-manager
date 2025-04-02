// src/components/admin/FormEditor.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection } from 'firebase/firestore';
import { db } from '../../firebase';
import BlockEditor from './BlockEditor';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

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
  Card,
  CardContent,
  makeStyles
} from '@material-ui/core';
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  Save as SaveIcon,
  Publish as PublishIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@material-ui/icons';

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
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
  groupBlock: {
    border: `1px solid ${theme.palette.primary.main}`,
    marginBottom: theme.spacing(2),
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.default,
  },
  groupHeader: {
    padding: theme.spacing(1, 2),
    backgroundColor: theme.palette.primary.light,
    color: theme.palette.primary.contrastText,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
  },
  groupContent: {
    padding: theme.spacing(2),
  },
  blockItem: {
    border: `1px solid ${theme.palette.divider}`,
    marginBottom: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.paper,
  },
  dragHandle: {
    cursor: 'grab',
    marginRight: theme.spacing(1),
  },
  nestedBlock: {
    marginLeft: theme.spacing(4),
  },
  addBlockButton: {
    marginTop: theme.spacing(1),
  },
  addGroupButton: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  revisionControl: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.default,
    borderRadius: theme.shape.borderRadius,
  },
  dragging: {
    opacity: 0.5,
  },
  dropTarget: {
    backgroundColor: theme.palette.action.hover,
  },
  actionButtons: {
    display: 'flex',
    gap: theme.spacing(2),
    marginBottom: theme.spacing(3),
  },
  fieldTypeChip: {
    marginLeft: theme.spacing(1),
    fontSize: '0.7rem',
    padding: theme.spacing(0.25, 1),
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.grey[300],
    color: theme.palette.text.secondary,
  }
}));

// Draggable Block Item Component
const DraggableBlockItem = ({ block, index, groupId, moveBlock, onEdit, onDelete }) => {
  const classes = useStyles();
  const ref = React.useRef(null);
  
  // Set up drag
  const [{ isDragging }, drag] = useDrag({
    type: groupId ? 'GROUP_ITEM' : 'BLOCK',
    item: { id: block.id, index, groupId },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging()
    }),
  });
  
  // Set up drop
  const [{ isOver }, drop] = useDrop({
    accept: groupId ? 'GROUP_ITEM' : 'BLOCK',
    hover(item, monitor) {
      if (!ref.current) {
        return;
      }
      
      // Only move if it's a different position
      if (item.groupId !== groupId || item.index !== index) {
        moveBlock(item.index, index, item.groupId, groupId);
        // Update the item's index for future drags
        item.index = index;
        item.groupId = groupId;
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isDragging() && !!monitor.isOver()
    }),
  });
  
  // Connect drag and drop refs
  drag(drop(ref));
  
  // Get field type label
  const getFieldTypeLabel = (block) => {
    if (block.type === 'field') {
      switch (block.fieldType) {
        case 'short_text': return 'Text';
        case 'long_text': return 'Textarea';
        case 'number': return 'Number';
        case 'date': return 'Date';
        case 'checkbox': return 'Checkbox';
        case 'radio': return 'Single Choice';
        case 'multi_choice': return 'Multiple Choice';
        case 'dropdown': return 'Dropdown';
        default: return block.fieldType;
      }
    }
    return block.type;
  };
  
  return (
    <ListItem 
      ref={ref}
      className={`${classes.blockItem} ${isDragging ? classes.dragging : ''} ${isOver ? classes.dropTarget : ''}`}
      button
      onClick={() => onEdit(block, index, groupId)}
    >
      <DragIcon className={classes.dragHandle} />
      
      <ListItemText
        primary={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {block.title || 'Untitled Block'}
            <span className={classes.fieldTypeChip}>{getFieldTypeLabel(block)}</span>
          </div>
        }
        secondary={block.description || ''}
      />
      
      <ListItemSecondaryAction>
        <IconButton edge="end" onClick={(e) => {
          e.stopPropagation();
          onEdit(block, index, groupId);
        }}>
          <EditIcon />
        </IconButton>
        <IconButton edge="end" onClick={(e) => {
		  e.stopPropagation();
          onDelete(index, groupId);
        }}>
          <DeleteIcon />
        </IconButton>
      </ListItemSecondaryAction>
    </ListItem>
  );
};

// Group Component with expand/collapse and drag-drop for contained blocks
const GroupBlock = ({ group, index, moveBlock, moveGroup, onEdit, onDelete, onAddBlock }) => {
  const classes = useStyles();
  const [expanded, setExpanded] = useState(true);
  const ref = React.useRef(null);
  
  // Set up drag for the group
  const [{ isDragging }, drag] = useDrag({
    type: 'BLOCK',
    item: { id: group.id, index, type: 'group' },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging()
    }),
  });
  
  // Set up drop for the group
  const [{ isOver }, drop] = useDrop({
    accept: 'BLOCK',
    hover(item, monitor) {
      if (!ref.current) {
        return;
      }
      
      // Only move groups, not blocks into group position
      if (item.type === 'group' && item.index !== index) {
        moveGroup(item.index, index);
        // Update the item's index for future drags
        item.index = index;
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isDragging() && !!monitor.isOver()
    }),
  });
  
  // Connect drag and drop refs for the group
  drag(drop(ref));
  
  // Set up drop for children
  const [, dropChildren] = useDrop({
    accept: 'GROUP_ITEM',
  });
  
  // Toggle expanded state
  const toggleExpanded = (e) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };
  
  // Move a block within this group
  const moveBlockWithinGroup = (fromIndex, toIndex) => {
    moveBlock(fromIndex, toIndex, group.id, group.id);
  };
  
  return (
    <div 
      ref={ref} 
      className={`${classes.groupBlock} ${isDragging ? classes.dragging : ''} ${isOver ? classes.dropTarget : ''}`}
    >
      <div 
        className={classes.groupHeader}
        onClick={() => onEdit(group, index)}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <DragIcon className={classes.dragHandle} />
          <Typography variant="subtitle1">{group.title || 'Untitled Section'}</Typography>
        </div>
        <div>
          <IconButton size="small" onClick={toggleExpanded}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
          <IconButton size="small" onClick={(e) => {
            e.stopPropagation();
            onEdit(group, index);
          }}>
            <EditIcon />
          </IconButton>
          {/* Only allow deleting if this isn't the last group */}
          <IconButton 
            size="small" 
            onClick={(e) => {
              e.stopPropagation();
              onDelete(index);
            }}
            disabled={false} // Will be disabled in parent if this is the last group
          >
            <DeleteIcon />
          </IconButton>
        </div>
      </div>
      
      {expanded && (
        <div className={classes.groupContent} ref={dropChildren}>
          {group.children && group.children.length > 0 ? (
            <List className={classes.blockList}>
              {group.children.map((block, blockIndex) => (
                <DraggableBlockItem
                  key={block.id || blockIndex}
                  block={block}
                  index={blockIndex}
                  groupId={group.id}
                  moveBlock={moveBlock}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </List>
          ) : (
            <Typography color="textSecondary" align="center" style={{ padding: '16px' }}>
              No fields in this section. Click "Add Field" to add content.
            </Typography>
          )}
          
          <Button
            variant="outlined"
            color="primary"
            startIcon={<AddIcon />}
            className={classes.addBlockButton}
            onClick={(e) => {
              e.stopPropagation();
              onAddBlock(group.id);
            }}
          >
            Add Field
          </Button>
        </div>
      )}
    </div>
  );
};

function FormEditor() {
  const classes = useStyles();
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
  const [currentBlockIndex, setCurrentBlockIndex] = useState(-1);
  const [currentGroupId, setCurrentGroupId] = useState(null);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [revisionType, setRevisionType] = useState('minor');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  
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
      // For new forms, start with at least one group
      setFormData({
        ...formData,
        blocks: [{
          id: `group-${Date.now()}`,
          type: 'group',
          title: 'Section 1',
          description: 'Enter section description here',
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
  
  // Handle moving blocks
  const moveBlock = useCallback((fromIndex, toIndex, fromGroupId, toGroupId) => {
    setFormData(prevForm => {
      const newForm = { ...prevForm };
      
      // Moving a top-level block (group)
      if (!fromGroupId && !toGroupId) {
        const blocks = [...newForm.blocks];
        const [movedBlock] = blocks.splice(fromIndex, 1);
        blocks.splice(toIndex, 0, movedBlock);
        return { ...newForm, blocks };
      }
      
      // Moving within the same group
      if (fromGroupId && fromGroupId === toGroupId) {
        const blocks = [...newForm.blocks];
        const groupIndex = blocks.findIndex(block => block.id === fromGroupId);
        
        if (groupIndex !== -1) {
          const children = [...blocks[groupIndex].children];
          const [movedBlock] = children.splice(fromIndex, 1);
          children.splice(toIndex, 0, movedBlock);
          
          blocks[groupIndex] = {
            ...blocks[groupIndex],
            children
          };
          
          return { ...newForm, blocks };
        }
      }
      
      // Moving between different groups
      if (fromGroupId && toGroupId && fromGroupId !== toGroupId) {
        const blocks = [...newForm.blocks];
        const fromGroupIndex = blocks.findIndex(block => block.id === fromGroupId);
        const toGroupIndex = blocks.findIndex(block => block.id === toGroupId);
        
        if (fromGroupIndex !== -1 && toGroupIndex !== -1) {
          const fromChildren = [...blocks[fromGroupIndex].children];
          const toChildren = [...blocks[toGroupIndex].children];
          
          const [movedBlock] = fromChildren.splice(fromIndex, 1);
          toChildren.splice(toIndex, 0, movedBlock);
          
          blocks[fromGroupIndex] = {
            ...blocks[fromGroupIndex],
            children: fromChildren
          };
          
          blocks[toGroupIndex] = {
            ...blocks[toGroupIndex],
            children: toChildren
          };
          
          return { ...newForm, blocks };
        }
      }
      
      return prevForm;
    });
  }, []);
  
  // Handle moving groups
  const moveGroup = useCallback((fromIndex, toIndex) => {
    setFormData(prevForm => {
      const blocks = [...prevForm.blocks];
      const [movedGroup] = blocks.splice(fromIndex, 1);
      blocks.splice(toIndex, 0, movedGroup);
      return { ...prevForm, blocks };
    });
  }, []);
  
  // Open block editor to add a new block
  const handleAddBlock = (groupId = null) => {
    setCurrentBlock({
      type: 'field',
      title: '',
      parentId: groupId
    });
    setCurrentBlockIndex(-1);
    setCurrentGroupId(groupId);
    setBlockEditorOpen(true);
  };
  
  // Add a new group
  const handleAddGroup = () => {
    setCurrentBlock({
      type: 'group',
      title: '',
      description: '',
      children: []
    });
    setCurrentBlockIndex(-1);
    setCurrentGroupId(null);
    setBlockEditorOpen(true);
  };
  
  // Edit existing block
  const handleEditBlock = (block, index, groupId = null) => {
    setCurrentBlock({...block});
    setCurrentBlockIndex(index);
    setCurrentGroupId(groupId);
    setBlockEditorOpen(true);
  };
  
  // Save block from editor
  const handleSaveBlock = (blockData) => {
    setFormData(prevForm => {
      const newForm = { ...prevForm };
      
      // If this is a group (top-level block)
      if (blockData.type === 'group' && !blockData.parentId) {
        // New group
        if (currentBlockIndex === -1) {
          newForm.blocks = [...newForm.blocks, blockData];
        }
        // Update existing group
        else {
          const blocks = [...newForm.blocks];
          // Preserve children when updating
          if (blocks[currentBlockIndex].children) {
            blockData.children = blocks[currentBlockIndex].children;
          }
          blocks[currentBlockIndex] = blockData;
          newForm.blocks = blocks;
        }
      }
      // If this is a block inside a group
      else if (blockData.parentId) {
        const blocks = [...newForm.blocks];
        const groupIndex = blocks.findIndex(block => block.id === blockData.parentId);
        
        if (groupIndex !== -1) {
          const children = [...(blocks[groupIndex].children || [])];
          
          if (currentBlockIndex === -1) {
            // Add new block to group
            children.push(blockData);
          } else {
            // Update existing block in group
            children[currentBlockIndex] = blockData;
          }
          
          blocks[groupIndex] = {
            ...blocks[groupIndex],
            children
          };
          
          newForm.blocks = blocks;
        }
      }
      
      return newForm;
    });
    
    setBlockEditorOpen(false);
    setCurrentBlock(null);
    setCurrentBlockIndex(-1);
    setCurrentGroupId(null);
  };
  
  // Delete block
  const handleDeleteBlock = (index, groupId = null) => {
    // For groups, check if this is the last group
    if (!groupId && formData.blocks.length <= 1) {
      setError("Cannot delete the last section. Forms must have at least one section.");
      return;
    }
    
    setFormData(prevForm => {
      const newForm = { ...prevForm };
      
      // Deleting a group
      if (!groupId) {
        const blocks = [...newForm.blocks];
        blocks.splice(index, 1);
        newForm.blocks = blocks;
      }
      // Deleting a block inside a group
      else {
        const blocks = [...newForm.blocks];
        const groupIndex = blocks.findIndex(block => block.id === groupId);
        
        if (groupIndex !== -1) {
          const children = [...blocks[groupIndex].children];
          children.splice(index, 1);
          
          blocks[groupIndex] = {
            ...blocks[groupIndex],
            children
          };
          
          newForm.blocks = blocks;
        }
      }
      
      return newForm;
    });
  };
  
  // Save form as draft
  const handleSaveDraft = async () => {
    try {
      // Validate form
      if (!formData.title) {
        setError('Form title is required');
        return;
      }
      
      // Validate that there's at least one group
      if (formData.blocks.length === 0) {
        setError('Form must have at least one section');
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
    // Validate form before opening dialog
    if (!formData.title) {
      setError('Form title is required');
      return;
    }
    
    // Validate that there's at least one group
    if (formData.blocks.length === 0) {
      setError('Form must have at least one section');
      return;
    }
    
    setPublishDialogOpen(true);
  };
  
  // Publish form
  const handlePublishForm = async () => {
    try {
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
  
  // Confirm cancel editing
  const handleCancelClick = () => {
    setCancelDialogOpen(true);
  };
  
  // Confirm cancel and navigate away
  const confirmCancel = () => {
    setCancelDialogOpen(false);
    navigate('/admin/dashboard');
  };
  
  // Close cancel dialog
  const closeCancel = () => {
    setCancelDialogOpen(false);
  };
  
  if (loading) {
    return (
      <div className={classes.root}>
        <Typography variant="h6">Loading...</Typography>
      </div>
    );
  }
  
  return (
    <DndProvider backend={HTML5Backend}>
      <div className={classes.root}>
        <Card className={classes.paper}>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              {isEditMode ? 'Edit Form' : 'Create New Form'}
            </Typography>
            
            {error && (
              <Typography color="error" component="div" className={classes.formSection}>
                {error}
              </Typography>
            )}
            
            <div className={classes.actionButtons}>
              <Button 
                variant="outlined"
                color="default"
                onClick={handleCancelClick}
              >
                Cancel
              </Button>
              
              <Button 
                variant="outlined"
                color="primary"
                startIcon={<SaveIcon />}
                onClick={handleSaveDraft}
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
            
            {/* Form Header Section */}
            <Paper className={classes.paper}>
              <Typography variant="h6" gutterBottom>
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
            
            {/* Form Sections */}
            <Box mt={4} mb={2}>
              <Typography variant="h6" gutterBottom>
                Form Structure
              </Typography>
              
              <Typography variant="body2" color="textSecondary" paragraph>
                Add sections to organize your form. Each section can contain fields and signature blocks.
              </Typography>
              
              {/* Group Blocks */}
              {formData.blocks.map((block, index) => (
                block.type === 'group' && (
                  <GroupBlock
                    key={block.id || index}
                    group={block}
                    index={index}
                    moveBlock={moveBlock}
                    moveGroup={moveGroup}
                    onEdit={handleEditBlock}
                    onDelete={handleDeleteBlock}
                    onAddBlock={handleAddBlock}
                  />
                )
              ))}
              
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                className={classes.addGroupButton}
                onClick={handleAddGroup}
              >
                Add Section
              </Button>
            </Box>
          </CardContent>
        </Card>
        
        {/* Block Editor Dialog */}
        <BlockEditor
          open={blockEditorOpen}
          block={currentBlock}
          onSave={handleSaveBlock}
          onClose={() => setBlockEditorOpen(false)}
          parentId={currentGroupId}
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
        
        {/* Cancel Confirmation Dialog */}
        <Dialog open={cancelDialogOpen} onClose={closeCancel}>
          <DialogTitle>Discard Changes?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to cancel? Any unsaved changes will be lost.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeCancel} color="primary">
              Continue Editing
            </Button>
            <Button onClick={confirmCancel} color="secondary">
              Discard Changes
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </DndProvider>
  );
}

export default FormEditor;