import { useState } from "react";

import { useNavigate }
from "react-router-dom";

import { useAuth }
from "../context/AuthContext";

function Login() {

const navigate =
useNavigate();

const { login } =
useAuth();

const [password, setPassword] =
useState("");

const handleLogin = () => {

if (password === "1234") {

  login();

  navigate("/");

} else {

  alert("Wrong Password");
}

};

return (

<div className="min-h-screen flex items-center justify-center bg-black px-4">

  <div className="w-full max-w-md bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-8">

    <h1 className="text-5xl font-black bg-gradient-to-r from-pink-400 via-orange-400 to-purple-500 bg-clip-text text-transparent mb-10 text-center">

      Jewel ERP

    </h1>

    <input
      type="password"
      placeholder="Enter Password"
      value={password}
      onChange={(e) =>
        setPassword(
          e.target.value
        )
      }
      className="w-full p-4 rounded-2xl bg-white/10 border border-white/10 outline-none mb-6"
    />

    <button
      onClick={handleLogin}
      className="w-full py-4 rounded-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500"
    >

      Login

    </button>

  </div>

</div>

);
}

export default Login;