import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User as FirebaseUser, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'admin' | 'employee' | 'client';
  phone?: string;
  location?: string;
  createdAt: any;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setUser(user);
        if (user) {
          // 1. Try to fetch profile by real UID first
          const docRef = doc(db, 'profiles', user.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            // Always ensure the Super Admin has the admin role
            const isSuperAdmin = data.email?.toLowerCase() === 'hassanimhoma2019@gmail.com';
            if (isSuperAdmin && data.role !== 'admin') {
              const updatedProfile = { ...data, role: 'admin' as const };
              await setDoc(docRef, updatedProfile, { merge: true });
              setProfile(updatedProfile);
            } else {
              setProfile(data);
            }
          } else {
            // 2. Profile doesn't exist by UID - check if it was pre-provisioned by email
            const normalizedEmail = user.email?.toLowerCase();
            const q = query(collection(db, 'profiles'), where('email', '==', normalizedEmail));
            const querySnap = await getDocs(q);

            if (!querySnap.empty) {
              // Found a pre-provisioned profile!
              const provisionedDoc = querySnap.docs[0];
              const provisionedData = provisionedDoc.data();
              
              // Claim the profile: move data to UID-based document and delete placeholder
              const batch = writeBatch(db);
              const isSuperAdmin = user.email?.toLowerCase() === 'hassanimhoma2019@gmail.com';
              const newProfile: UserProfile = {
                ...provisionedData as any,
                uid: user.uid, // Update to real UID
                photoURL: user.photoURL, // Add photo from Google
                displayName: user.displayName || provisionedData.displayName,
                role: isSuperAdmin ? 'admin' : (provisionedData.role || 'employee'),
              };
              
              batch.set(docRef, newProfile);
              // Only delete if it's not the same doc (unlikely if snap didn't exist at start)
              if (provisionedDoc.id !== user.uid) {
                batch.delete(provisionedDoc.ref);
              }
              
              await batch.commit();
              setProfile(newProfile);
            } else {
              // 3. First login and no invitation - create default profile
              const isSuperAdmin = user.email?.toLowerCase() === 'hassanimhoma2019@gmail.com';
              const newProfile: UserProfile = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                role: isSuperAdmin ? 'admin' : 'employee',
                createdAt: serverTimestamp(),
              };
              await setDoc(docRef, newProfile);
              setProfile(newProfile);
            }
          }
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signInWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), pass);
  };

  const signUpWithEmail = async (email: string, pass: string, name: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    const u = userCredential.user;
    
    // Check if there is a pre-provisioned profile for this email
    const normalizedEmail = email.trim().toLowerCase();
    const q = query(collection(db, 'profiles'), where('email', '==', normalizedEmail));
    const querySnap = await getDocs(q);

    let finalRole: 'admin' | 'employee' | 'client' = 'employee';
    let finalPhone = '';
    let finalLocation = '';
    let placeholderIdToDelete: string | null = null;

    if (!querySnap.empty) {
      const provisionedDoc = querySnap.docs[0];
      const provisionedData = provisionedDoc.data();
      finalRole = provisionedData.role || 'employee';
      finalPhone = provisionedData.phone || '';
      finalLocation = provisionedData.location || '';
      if (provisionedDoc.id !== u.uid) {
        placeholderIdToDelete = provisionedDoc.id;
      }
    }

    const isSuperAdmin = normalizedEmail === 'hassanimhoma2019@gmail.com';
    const newProfile: UserProfile = {
      uid: u.uid,
      email: normalizedEmail,
      displayName: name,
      photoURL: null,
      role: isSuperAdmin ? 'admin' : finalRole,
      phone: finalPhone || undefined,
      location: finalLocation || undefined,
      createdAt: serverTimestamp(),
    };

    const batch = writeBatch(db);
    batch.set(doc(db, 'profiles', u.uid), newProfile);
    if (placeholderIdToDelete) {
      batch.delete(doc(db, 'profiles', placeholderIdToDelete));
    }
    await batch.commit();
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
