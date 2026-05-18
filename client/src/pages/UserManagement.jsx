import { useState } from "react";

import axios from "axios";

function UserManagement() {

  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [role, setRole] =
    useState("user");

  const handleCreateUser =
    async () => {

      try {

        await axios.post(
          `${import.meta.env.VITE_API_URL}/api/auth/register`,
          {
            username,
            password,
            role,
          }
        );

        alert(
          `${role} Created`
        );

        setUsername("");
        setPassword("");
        setRole("user");

      } catch (error) {

        console.log(error);

        alert(
          "Failed To Create User"
        );
      }
    };

  return (

    <div className="p-6">

      <div className="bg-white/5 p-6 rounded-3xl border border-white/10 max-w-xl mx-auto">

        <h1 className="text-3xl font-bold text-pink-400 mb-6">
          User Management
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

          <select
            value={role}
            onChange={(e) =>
              setRole(
                e.target.value
              )
            }
            className="w-full p-4 rounded-2xl bg-black/20"
          >

            <option value="user">
              User
            </option>

            <option value="admin">
              Admin
            </option>

          </select>

          <button
            onClick={
              handleCreateUser
            }
            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 py-4 rounded-2xl font-bold"
          >
            Create Account
          </button>

        </div>

      </div>

    </div>
  );
}

export default UserManagement;