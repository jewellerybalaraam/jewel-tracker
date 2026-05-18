import { useState } from "react";

import axios from "axios";

import { useNavigate } from "react-router-dom";

function Login() {

  const navigate =
    useNavigate();

  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");

  const getDeviceId = () => {

    let deviceId =
      localStorage.getItem(
        "deviceId"
      );

    if (!deviceId) {

      deviceId =
        crypto.randomUUID();

      localStorage.setItem(
        "deviceId",
        deviceId
      );
    }

    return deviceId;
  };

  const handleLogin =
    async () => {

      try {

        const deviceId =
          getDeviceId();

        const res =
          await axios.post(
            `${import.meta.env.VITE_API_URL}/api/auth/login`,
            {
              username,
              password,
              deviceId,
            }
          );

        localStorage.setItem(
          "token",
          res.data.token
        );

        localStorage.setItem(
          "user",
          JSON.stringify(
            res.data.user
          )
        );

        navigate("/");

      } catch (error) {

        console.log(error);

        alert(
          error?.response?.data
            ?.message ||
            "Login Failed"
        );
      }
    };

  return (

    <div className="min-h-screen flex items-center justify-center p-6">

      <div className="bg-white/5 p-8 rounded-3xl border border-white/10 w-full max-w-md">

        <h1 className="text-4xl font-bold text-pink-400 mb-8 text-center">
          Jewel ERP Login
        </h1>

        <div className="space-y-4">

          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) =>
              setUsername(
                e.target.value
              )
            }
            className="w-full p-4 rounded-2xl bg-black/20"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
            className="w-full p-4 rounded-2xl bg-black/20"
          />

          <button
            onClick={
              handleLogin
            }
            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 py-4 rounded-2xl font-bold"
          >
            Login
          </button>

        </div>

      </div>

    </div>
  );
}

export default Login;