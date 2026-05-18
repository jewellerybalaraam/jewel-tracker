import {
createContext,
useContext,
useEffect,
useState,
} from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {

const [loggedIn, setLoggedIn] =
useState(false);

useEffect(() => {

const auth =
  localStorage.getItem(
    "jewel-auth"
  );

setLoggedIn(auth === "true");

}, []);

const login = () => {

localStorage.setItem(
  "jewel-auth",
  "true"
);

setLoggedIn(true);

};

const logout = () => {

localStorage.removeItem(
  "jewel-auth"
);

setLoggedIn(false);

};

return (

<AuthContext.Provider
  value={{
    loggedIn,
    login,
    logout,
  }}
>

  {children}

</AuthContext.Provider>

);
}

export function useAuth() {
return useContext(AuthContext);
}