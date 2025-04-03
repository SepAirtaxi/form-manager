// src/components/user/UserDashboard.js
import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

// Material UI imports
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Paper,
  Badge,
  makeStyles
} from '@material-ui/core';
import {
  Assignment as FormIcon,
  AssignmentLate as DraftIcon
} from '@material-ui/icons';

const useStyles = makeStyles((theme) => ({
  container: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
  },
  pageTitle: {
    marginBottom: theme.spacing(4),
  },
  card: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  cardContent: {
    flexGrow: 1,
  },
  gridContainer: {
    marginTop: theme.spacing(3),
  },
  sectionTitle: {
    marginBottom: theme.spacing(2),
    marginTop: theme.spacing(4),
  },
  draftBadge: {
    backgroundColor: theme.palette.warning.main,
    color: theme.palette.warning.contrastText,
    fontWeight: 'bold',
    padding: theme.spacing(1, 2),
    borderRadius: theme.shape.borderRadius,
    display: 'inline-block',
    marginRight: theme.spacing(1),
  },
  draftCard: {
    borderLeft: `5px solid ${theme.palette.warning.main}`,
  }
}));

function UserDashboard() {
  const classes = useStyles();
  const { currentUser } = useAuth();
  const { updateDraftCount } = useOutletContext() || {};
  
  const [forms, setForms] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Load forms and user's drafts on component mount
  useEffect(() => {
    async function loadData() {
      try {
        // First attempt to load published forms
        try {
          const formsQuery = query(
            collection(db, 'forms'),
            where('published', '==', true),
            orderBy('title')
          );
          
          const formsSnap = await getDocs(formsQuery);
          
          const formsData = formsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          setForms(formsData);
        } catch (formError) {
          console.error("Error loading forms:", formError);
        }
        
        // Then attempt to load drafts
        if (currentUser) {
          try {
            const draftsQuery = query(
              collection(db, 'submissions'),
              where('userId', '==', currentUser.uid),
              where('status', '==', 'draft'),
              orderBy('updatedAt', 'desc')
            );
            
            const draftsSnap = await getDocs(draftsQuery);
            
            const draftsData = draftsSnap.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            
            setDrafts(draftsData);
            
            // Update draft count
            if (updateDraftCount) {
              updateDraftCount(draftsData.length);
            }
          } catch (draftError) {
            console.error("Error loading drafts:", draftError);
          }
        }
      } catch (err) {
        setError('Error loading data: ' + err.message);
        console.error('Main error:', err);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [currentUser, updateDraftCount]);
  
  return (
    <Container className={classes.container}>
      <Typography variant="h4" className={classes.pageTitle}>
        Dashboard
      </Typography>
      
      {error && (
        <Typography color="error" gutterBottom>
          {error}
        </Typography>
      )}
      
      {/* Draft Forms Section */}
      {drafts.length > 0 && (
        <>
          <Typography variant="h5" className={classes.sectionTitle}>
            <DraftIcon style={{ verticalAlign: 'middle', marginRight: '8px' }} />
            Your Draft Forms
          </Typography>
          
          <Grid container spacing={3}>
            {drafts.map((draft) => (
              <Grid item key={draft.id} xs={12} sm={6} md={4}>
                <Card className={`${classes.card} ${classes.draftCard}`}>
                  <CardContent className={classes.cardContent}>
                    <div className={classes.draftBadge}>DRAFT</div>
                    <Typography variant="h6" component="h2" gutterBottom>
                      {draft.formTitle}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Last modified: {draft.updatedAt ? new Date(draft.updatedAt.toDate()).toLocaleString() : 'Unknown'}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      color="primary"
                      component={Link}
                      to={`/form/${draft.formId}?draft=${draft.id}`}
                    >
                      Continue Editing
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}
      
      {/* Available Forms Section */}
      <Typography variant="h5" className={classes.sectionTitle}>
        <FormIcon style={{ verticalAlign: 'middle', marginRight: '8px' }} />
        Available Forms
      </Typography>
      
      {loading ? (
        <Typography>Loading...</Typography>
      ) : forms.length === 0 ? (
        <Typography>No forms available at this time.</Typography>
      ) : (
        <Grid container spacing={3}>
          {forms.map((form) => (
            <Grid item key={form.id} xs={12} sm={6} md={4}>
              <Card className={classes.card}>
                <CardContent className={classes.cardContent}>
                  <Typography variant="h6" component="h2" gutterBottom>
                    {form.title}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" component="p">
                    {form.description || "No description provided."}
                  </Typography>
                  <Typography variant="body2" style={{ marginTop: '8px' }}>
                    Revision: {form.revision || '1.0'}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    color="primary"
                    component={Link}
                    to={`/form/${form.id}`}
                  >
                    Fill Out Form
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}

export default UserDashboard;