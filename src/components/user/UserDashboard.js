// src/components/user/UserDashboard.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

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
  AppBar,
  Toolbar,
  IconButton,
  Divider,
  Badge,
  makeStyles
} from '@material-ui/core';
import {
  ExitToApp as LogoutIcon,
  Assignment as FormIcon,
  AssignmentLate as DraftIcon,
  Notifications as NotificationIcon
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
  }
}));

function UserDashboard() {
  const classes = useStyles();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  
  const [forms, setForms] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Load forms and user's drafts on component mount
  useEffect(() => {
    async function loadData() {
      try {
        // Get published forms
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
        
        // Get user's draft submissions
        if (currentUser) {
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
          
          // Get user's recent submissions
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
        }
      } catch (err) {
        setError('Error loading data: ' + err.message);
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [currentUser]);
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      setError('Failed to log out');
      console.error(err);
    }
  };
  
  return (
    <>
      <AppBar position="fixed">
        <Toolbar>
          <Typography variant="h6" className={classes.title}>
            Copenhagen AirTaxi - Form System
          </Typography>
          <IconButton color="inherit">
            <Badge badgeContent={drafts.length} color="error">
              <NotificationIcon />
            </Badge>
          </IconButton>
          <Button
            color="inherit"
            onClick={handleLogout}
            startIcon={<LogoutIcon />}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <div className={classes.appBarSpacer} />
      
      <Container className={classes.container}>
        <Paper className={classes.welcomeSection}>
          <Typography variant="h4" gutterBottom>
            Welcome, {currentUser?.displayName || 'User'}!
          </Typography>
          <Typography variant="body1">
            This is your dashboard for managing forms. Here you can see your draft forms, recent submissions, and available forms to fill out.
          </Typography>
        </Paper>
        
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
    </>
  );
}

export default UserDashboard;