// src/components/common/NavigationMenu.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Material UI imports
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Badge,
  makeStyles
} from '@material-ui/core';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Assignment as FormIcon,
  ExitToApp as LogoutIcon,
  Notifications as NotificationIcon
} from '@material-ui/icons';

const useStyles = makeStyles((theme) => ({
  title: {
    flexGrow: 1,
  },
  menuButton: {
    marginRight: theme.spacing(2),
  },
  drawer: {
    width: 250,
  },
  fullList: {
    width: 'auto',
  },
  toolbar: theme.mixins.toolbar,
  icon: {
    color: theme.palette.primary.main,
  },
  nested: {
    paddingLeft: theme.spacing(4),
  },
  userInfo: {
    padding: theme.spacing(2),
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
  },
  userName: {
    fontWeight: 'bold',
  },
  userRole: {
    textTransform: 'capitalize',
    fontSize: '0.9rem',
    opacity: 0.9,
  }
}));

function NavigationMenu({ draftCount = 0 }) {
  const classes = useStyles();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { currentUser, userRole, logout, hasRole } = useAuth();
  
  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setDrawerOpen(open);
  };
  
  const handleLogout = async () => {
    try {
      await logout();
      setDrawerOpen(false);
      navigate('/login');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };
  
  // Simplified menu items - removed admin submenu items, renamed "Available Forms" to "Forms"
  const menuItems = [
    // Employee menu items
    {
      text: 'Forms',
      icon: <FormIcon className={classes.icon} />,
      link: '/forms',
      roles: ['employee', 'manager', 'admin'],
    },
    // Admin Dashboard (only for managers and admins)
    {
      text: 'Admin Dashboard',
      icon: <DashboardIcon className={classes.icon} />,
      link: '/admin/dashboard',
      roles: ['manager', 'admin'],
    },
    // Logout (always at bottom)
    {
      type: 'divider',
      roles: ['employee', 'manager', 'admin'],
    },
    {
      text: 'Logout',
      icon: <LogoutIcon className={classes.icon} />,
      onClick: handleLogout,
      roles: ['employee', 'manager', 'admin'],
    }
  ];
  
  const filteredMenuItems = menuItems.filter(item => 
    item.roles && hasRole(item.roles)
  );
  
  return (
    <>
      <AppBar position="fixed">
        <Toolbar>
          <IconButton
            edge="start"
            className={classes.menuButton}
            color="inherit"
            aria-label="menu"
            onClick={toggleDrawer(true)}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" className={classes.title}>
            Form Manager
          </Typography>
          {draftCount > 0 && (
            <IconButton color="inherit">
              <Badge badgeContent={draftCount} color="error">
                <NotificationIcon />
              </Badge>
            </IconButton>
          )}
        </Toolbar>
      </AppBar>
      <Drawer anchor="left" open={drawerOpen} onClose={toggleDrawer(false)}>
        <div className={classes.drawer} role="presentation">
          {/* User info header */}
          <div className={classes.userInfo}>
            <Typography variant="h6" className={classes.userName}>
              {currentUser?.displayName || 'User'}
            </Typography>
            <Typography variant="body2" className={classes.userRole}>
              Role: {userRole || 'Unknown'}
            </Typography>
          </div>
          
          <List>
            {filteredMenuItems.map((item, index) => {
              if (item.type === 'divider') {
                return <Divider key={`divider-${index}`} />;
              }
              
              return (
                <ListItem 
                  button 
                  key={item.text} 
                  component={item.link ? Link : 'button'} 
                  to={item.link}
                  onClick={item.onClick || toggleDrawer(false)}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                  {item.text === 'Forms' && draftCount > 0 && (
                    <Badge badgeContent={draftCount} color="error" />
                  )}
                </ListItem>
              );
            })}
          </List>
        </div>
      </Drawer>
      {/* Spacer to push content below app bar */}
      <div className={classes.toolbar} />
    </>
  );
}

export default NavigationMenu;