// /context/AuthContext.tsx
import {
  getLoggedInUser,
  logOutFromGoogle,
} from "@/services/googleAuth/googleAuth";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

export type UserType = {
  name: string | null;
  email: string;
  photo: string | null; // always defined, not optional
};

interface AuthContextType {
  user: UserType | null;
  setUser: (user: UserType | null) => void;
  login: (user: UserType) => void;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  login: () => {},
  logout: async () => {},
  loading: false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState<boolean>(true); // true initially while fetching user

  // Fetch user on app start
  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        const info = await getLoggedInUser();
        if (info) {
          setUser({
            name: info.name ?? null,
            email: info.email,
            photo: info.photo ?? null,
          });
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Error fetching logged-in user:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const login = (userData: UserType) => {
    setLoading(true);
    try {
      setUser({
        name: userData.name ?? null,
        email: userData.email,
        photo: userData.photo ?? null,
      });
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await logOutFromGoogle();
      setUser(null);
    } catch (err) {
      console.log("Logout error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
