// src/components/common/NavigationMenu.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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
  Hidden,
  Badge,
  makeStyles
} from '@material-ui/core';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Assignment as FormIcon,
  Create as CreateIcon,
  Settings as SettingsIcon,
  PanTool as SignatureIcon,
  Person as UserIcon,
  ExitToApp as LogoutIcon,
  AssignmentLate as DraftIcon,
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { currentUser, userRole, logout, hasRole } = useAuth();
  
  const toggleDrawer = (open) => (event) => {
    if (event && event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setDrawerOpen(open);
  };
  
  const handleLogout = async () => {
    try {
      await logout();
      setDrawerOpen(false);
      // Navigate back to login page handled by auth context
    } catch (error) {
      console.error("Logout error:", error);
    }
  };
  
  const menuItems = [
    // All users see this
    {
      text: 'User Dashboard',
      icon: <DashboardIcon className={classes.icon} />,
      link: '/dashboard',
      roles: ['employee', 'manager', 'admin'],
    },
    {
      text: 'Available Forms',
      icon: <FormIcon className={classes.icon} />,
      link: '/forms',
      roles: ['employee', 'manager', 'admin'],
    },
    // Divider for admin items
    {
      type: 'divider',
      roles: ['manager', 'admin'],
    },
    // Admin items
    {
      text: 'Admin Dashboard',
      icon: <DashboardIcon className={classes.icon} />,
      link: '/admin/dashboard',
      roles: ['manager', 'admin'],
    },
    {
      text: 'Create New Form',
      icon: <CreateIcon className={classes.icon} />,
      link: '/admin/form/new',
      roles: ['manager', 'admin'],
    },
    {
      text: 'Signature Manager',
      icon: <SignatureIcon className={classes.icon} />,
      link: '/admin/signatures',
      roles: ['manager', 'admin'],
    },
    {
      text: 'Company Settings',
      icon: <SettingsIcon className={classes.icon} />,
      link: '/admin/company-settings',
      roles: ['manager', 'admin'],
    },
    // Admin-only items
    {
      text: 'User Management',
      icon: <UserIcon className={classes.icon} />,
      link: '/admin/users',
      roles: ['admin'],
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
  
  const drawerContent = (
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
              {item.text === 'User Dashboard' && draftCount > 0 && (
                <Badge badgeContent={draftCount} color="error" />
              )}
            </ListItem>
          );
        })}
      </List>
    </div>
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
            Copenhagen AirTaxi - Form Manager
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
        {drawerContent}
      </Drawer>
      {/* Spacer to push content below app bar */}
      <div className={classes.toolbar} />
    </>
  );
}

export default NavigationMenu;