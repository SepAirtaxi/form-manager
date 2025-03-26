// src/contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  auth, 
  db 
} from '../firebase';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';

// Create Auth Context
const AuthContext = createContext();

// Context Provider component
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sign in function
  const login = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential;
  };

  // Sign out function
  const logout = () => {
    return signOut(auth);
  };

  // Create user function (for admin user management)
  const createUser = async (email, password, displayName, role) => {
    try {
      // Create the user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update the user's display name
      await updateProfile(user, { displayName });
      
      // Create a user document in Firestore with the role
      await setDoc(doc(db, 'users', user.uid), {
        email,
        displayName,
        role,
        createdAt: new Date().toISOString()
      });

      // Sign out after creating user (since this would be done by an admin)
      // Only sign out if the current user is different from the one being created
      if (currentUser && currentUser.email !== email) {
        await signOut(auth);
        // Sign back in as the current admin user
        // This would require saving admin credentials, which is not recommended
        // Better to just notify the admin that they need to log back in
      }

      return user;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  };

  // Update user role function
  const updateUserRole = async (userId, newRole) => {
    try {
      await setDoc(doc(db, 'users', userId), { role: newRole }, { merge: true });
    } catch (error) {
      console.error("Error updating user role:", error);
      throw error;
    }
  };

  // Get user role from Firestore
  const getUserRole = async (user) => {
    if (!user) return null;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        return userDoc.data().role;
      } else {
        // If user exists in Auth but not in Firestore, create a record with default role
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          displayName: user.displayName || '',
          role: 'employee', // Default role
          createdAt: new Date().toISOString()
        });
        return 'employee';
      }
    } catch (error) {
      console.error("Error getting user role:", error);
      return null;
    }
  };

  // Check if user has required role
  const hasRole = (requiredRoles) => {
    if (!requiredRoles || requiredRoles.length === 0) return true;
    if (!userRole) return false;
    
    if (Array.isArray(requiredRoles)) {
      return requiredRoles.includes(userRole);
    } else {
      return requiredRoles === userRole;
    }
  };

  // Set up auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        const role = await getUserRole(user);
        setUserRole(role);
      } else {
        setUserRole(null);
      }
      
      setLoading(false);
    });

    // Clean up subscription
    return unsubscribe;
  }, []);

  // Context value
  const value = {
    currentUser,
    userRole,
    login,
    logout,
    createUser,
    updateUserRole,
    hasRole
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// Custom hook for using the auth context
export function useAuth() {
  return useContext(AuthContext);
}