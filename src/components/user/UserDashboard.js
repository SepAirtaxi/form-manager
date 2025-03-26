// src/components/user/UserDashboard.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useDraftCount } from '../../App';

// Material UI imports
import {
  Container,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  CardActions,
  Button,
  Divider,
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
  paper: {
    padding: theme.spacing(3),
    marginBottom: theme.spacing(3),
  },
  welcomeSection: {
    marginBottom: theme.spacing(4),
    padding: theme.spacing(3),
    backgroundColor: theme.palette.primary.light,
    color: theme.palette.primary.contrastText,
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
  },
  errorMessage: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
    backgroundColor: theme.palette.error.light,
    color: theme.palette.error.dark,
    borderRadius: theme.shape.borderRadius,
  }
}));

function UserDashboard() {
  const classes = useStyles();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { setDraftCount } = useDraftCount();
  
  const [forms, setForms] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({
    forms: '',
    drafts: '',
    submissions: ''
  });
  
  // Load forms and user's drafts on component mount
  useEffect(() => {
    async function loadData() {
      if (!currentUser) return;
      
      // Load published forms with proper error handling
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
        setErrors(prev => ({
          ...prev,
          forms: `Error loading forms: ${formError.message}`
        }));
      }
      
      // Load user's draft submissions
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
        
        // Update draft count in context
        setDraftCount(draftsData.length);
      } catch (draftError) {
        console.error("Error loading drafts:", draftError);
        setErrors(prev => ({
          ...prev,
          drafts: `Error loading drafts: ${draftError.message}`
        }));
      }
      
      // Load user's recent submissions
      try {
        const submissionsQuery = query(
          collection(db, 'submissions'),
          where('userId', '==', currentUser.uid),
          where('status', '==', 'submitted'),
          orderBy('submittedAt', 'desc')
        );
        
        const submissionsSnap = await getDocs(submissionsQuery);
        
        const submissionsData = submissionsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).slice(0, 5); // Get only the 5 most recent
        
        setRecentSubmissions(submissionsData);
      } catch (submissionError) {
        console.error("Error loading submissions:", submissionError);
        setErrors(prev => ({
          ...prev,
          submissions: `Error loading submissions: ${submissionError.message}`
        }));
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
    
    // Cleanup function to reset draft count when component unmounts
    return () => {
      setDraftCount(0);
    };
  }, [currentUser, setDraftCount]);
  
  return (
    <Container className={classes.container}>
      <Paper className={classes.welcomeSection}>
        <Typography variant="h4" gutterBottom>
          Welcome, {currentUser?.displayName || 'User'}!
        </Typography>
        <Typography variant="body1">
          This is your dashboard for managing forms. Here you can see your draft forms, recent submissions, and available forms to fill out.
        </Typography>
      </Paper>
      
      {/* Error messages */}
      {Object.values(errors).some(error => error) && (
        <Paper className={classes.errorMessage}>
          <Typography variant="h6">Some data could not be loaded:</Typography>
          {Object.entries(errors).map(([key, error]) => 
            error ? (
              <Typography key={key} variant="body2">{error}</Typography>
            ) : null
          )}
          <Typography variant="body2" style={{ marginTop: '8px' }}>
            Try refreshing the page. If the problem persists, please check the console for error details or contact an administrator.
          </Typography>
        </Paper>
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
      
      {loading && !errors.forms ? (
        <Typography>Loading forms...</Typography>
      ) : forms.length === 0 && !errors.forms ? (
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
      
      {/* Recent Submissions Section */}
      {recentSubmissions.length > 0 && (
        <>
          <Typography variant="h5" className={classes.sectionTitle}>
            Recent Submissions
          </Typography>
          
          <Paper>
            {recentSubmissions.map((submission, index) => (
              <div key={submission.id}>
                <Grid container spacing={2} style={{ padding: '16px' }}>
                  <Grid item xs={8}>
                    <Typography variant="subtitle1">
                      {submission.formTitle}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Submitted: {submission.submittedAt ? new Date(submission.submittedAt.toDate()).toLocaleString() : 'Unknown'}
                    </Typography>
                  </Grid>
                  <Grid item xs={4} style={{ textAlign: 'right' }}>
                    <Button
                      size="small"
                      variant="outlined"
                      color="primary"
                      component={Link}
                      to={`/submission/${submission.id}`}
                    >
                      View Details
                    </Button>
                  </Grid>
                </Grid>
                {index < recentSubmissions.length - 1 && <Divider />}
              </div>
            ))}
          </Paper>
        </>
      )}
    </Container>
  );
}

export default UserDashboard;