// src/components/user/FormList.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';

// Material UI imports
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  InputAdornment,
  AppBar,
  Toolbar,
  makeStyles
} from '@material-ui/core';
import SearchIcon from '@material-ui/icons/Search';
import AssignmentIcon from '@material-ui/icons/Assignment';

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
  cardContent: {
    flexGrow: 1,
  },
  formRevision: {
    marginTop: theme.spacing(1),
    fontSize: '0.875rem',
    color: theme.palette.text.secondary,
  },
  searchContainer: {
    marginBottom: theme.spacing(4),
  },
  noFormsMessage: {
    textAlign: 'center',
    marginTop: theme.spacing(4),
  }
}));

function FormList() {
  const classes = useStyles();
  const [forms, setForms] = useState([]);
  const [filteredForms, setFilteredForms] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load forms on component mount
  useEffect(() => {
    async function loadForms() {
      try {
        // For initial testing, use sample data
        const sampleForms = [
          {
            id: '1',
            title: 'Engine Inspection Form',
            description: 'Complete inspection for aircraft engines',
            revision: '1.0'
          },
          {
            id: '2',
            title: 'Airframe Inspection Form',
            description: 'Structural inspection for aircraft frame components',
            revision: '2.1'
          },
          {
            id: '3',
            title: 'Avionics Check Form',
            description: 'Verification of all electronic systems',
            revision: '1.3'
          }
        ];
        
        setForms(sampleForms);
        setFilteredForms(sampleForms);
        
        // Uncomment this code when you have Firebase set up
        /*
        // Query only published forms
        const formsQuery = query(
          collection(db, 'forms'),
          where('published', '==', true),
          orderBy('title')
        );
        
        const querySnapshot = await getDocs(formsQuery);
        
        const formsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setForms(formsData);
        setFilteredForms(formsData);
        */
      } catch (err) {
        setError('Error loading forms: ' + err.message);
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    loadForms();
  }, []);

  // Handle search input
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (!value.trim()) {
      setFilteredForms(forms);
    } else {
      const filtered = forms.filter(form => 
        form.title.toLowerCase().includes(value.toLowerCase()) ||
        (form.description && form.description.toLowerCase().includes(value.toLowerCase()))
      );
      setFilteredForms(filtered);
    }
  };

  return (
    <>
      <AppBar position="fixed">
        <Toolbar>
          <Typography variant="h6" className={classes.title}>
            Copenhagen AirTaxi - Form System
          </Typography>
          <Button color="inherit" component={Link} to="/login">
            Admin Login
          </Button>
        </Toolbar>
      </AppBar>

      <div className={classes.appBarSpacer} />

      <Container className={classes.container}>
        <Typography variant="h4" component="h1" gutterBottom>
          Available Forms
        </Typography>

        {error && (
          <Typography color="error" gutterBottom>
            {error}
          </Typography>
        )}

        <div className={classes.searchContainer}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search forms..."
            value={searchTerm}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </div>

        {loading ? (
          <Typography>Loading...</Typography>
        ) : filteredForms.length === 0 ? (
          <Typography className={classes.noFormsMessage}>
            {searchTerm ? "No forms match your search" : "No forms available"}
          </Typography>
        ) : (
          <Grid container spacing={4}>
            {filteredForms.map((form) => (
              <Grid item key={form.id} xs={12} sm={6} md={4}>
                <Card className={classes.card}>
                  <CardContent className={classes.cardContent}>
                    <Typography variant="h5" component="h2" gutterBottom>
                      {form.title}
                    </Typography>
                    
                    <Typography variant="body2" color="textSecondary" component="p">
                      {form.description || "No description provided."}
                    </Typography>
                    
                    <Typography className={classes.formRevision}>
                      Revision: {form.revision || '1.0'}
                    </Typography>
                  </CardContent>
                  
                  <CardActions>
                    <Button
                      size="small"
                      color="primary"
                      startIcon={<AssignmentIcon />}
                      component={Link}
                      to={`/form/${form.id}`}
                    >
                      Open Form
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </>
  );
}

export default FormList;