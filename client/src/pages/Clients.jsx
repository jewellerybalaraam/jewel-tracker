import { useEffect, useState } from "react";
import axios from "axios";

function Clients() {

  const [clients, setClients] =
    useState([]);

  const [form, setForm] =
    useState({
      name: "",
      mobile: "",
      whatsapp: "",
      storeName: "",
      address: "",
      gstNo: "",
      notes: "",
    });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {

    try {

      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/clients`
      );

      setClients(res.data);

    } catch (error) {

      console.log(error);
    }
  };

  const handleSubmit = async () => {

    try {

      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/clients`,
        form
      );

      setForm({
        name: "",
        mobile: "",
        whatsapp: "",
        storeName: "",
        address: "",
        gstNo: "",
        notes: "",
      });

      fetchClients();

    } catch (error) {

      console.log(error);
    }
  };

  return (

    <div className="p-6">

      <div className="bg-white/5 p-6 rounded-3xl border border-white/10 mb-8">

        <h1 className="text-3xl font-bold text-pink-400 mb-6">
          Clients
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <input
            placeholder="Client Name"
            value={form.name}
            onChange={(e) =>
              setForm({
                ...form,
                name: e.target.value,
              })
            }
            className="p-4 rounded-2xl bg-black/20"
          />

          <input
            placeholder="Mobile Number"
            value={form.mobile}
            onChange={(e) =>
              setForm({
                ...form,
                mobile: e.target.value,
              })
            }
            className="p-4 rounded-2xl bg-black/20"
          />

          <input
            placeholder="WhatsApp Number"
            value={form.whatsapp}
            onChange={(e) =>
              setForm({
                ...form,
                whatsapp: e.target.value,
              })
            }
            className="p-4 rounded-2xl bg-black/20"
          />

          <input
            placeholder="Store Name"
            value={form.storeName}
            onChange={(e) =>
              setForm({
                ...form,
                storeName: e.target.value,
              })
            }
            className="p-4 rounded-2xl bg-black/20"
          />

          <input
            placeholder="Address"
            value={form.address}
            onChange={(e) =>
              setForm({
                ...form,
                address: e.target.value,
              })
            }
            className="p-4 rounded-2xl bg-black/20"
          />

          <input
            placeholder="GST Number"
            value={form.gstNo}
            onChange={(e) =>
              setForm({
                ...form,
                gstNo: e.target.value,
              })
            }
            className="p-4 rounded-2xl bg-black/20"
          />

          <textarea
            placeholder="Notes"
            value={form.notes}
            onChange={(e) =>
              setForm({
                ...form,
                notes: e.target.value,
              })
            }
            className="p-4 rounded-2xl bg-black/20 md:col-span-2"
            rows={4}
          />

        </div>

        <button
          onClick={handleSubmit}
          className="mt-6 bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-3 rounded-2xl font-bold"
        >
          Add Client
        </button>

      </div>

      <div className="space-y-4">

        {clients.map((client) => (

          <div
            key={client._id}
            className="bg-white/5 p-5 rounded-3xl border border-white/10"
          >

            <h2 className="text-2xl font-bold text-pink-300">
              {client.name}
            </h2>

            <p className="text-gray-300">
              {client.storeName}
            </p>

            <p className="text-gray-400">
              {client.mobile}
            </p>

          </div>

        ))}

      </div>

    </div>
  );
}

export default Clients;