"use client";

import { useState, useEffect } from "react";
import type { SavedClient, ClientDetails } from "@/lib/types";
import { loadClients, saveClient, deleteClient } from "@/lib/storage";

interface Props {
  onSelect: (client: ClientDetails) => void;
  currentClient?: ClientDetails;
}

export default function ClientBook({ onSelect, currentClient }: Props) {
  const [clients, setClients] = useState<SavedClient[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setClients(loadClients());
  }, []);

  function refresh() {
    setClients(loadClients());
  }

  function handleSaveCurrent() {
    if (!currentClient?.name) return;
    const client: SavedClient = {
      id: crypto.randomUUID(),
      name: currentClient.name,
      address: currentClient.address,
      email: currentClient.email,
    };
    saveClient(client);
    refresh();
    setSaving(false);
  }

  function handleDelete(id: string) {
    if (!confirm("Remove this client from your address book?")) return;
    deleteClient(id);
    refresh();
  }

  return (
    <div className="space-y-3 p-1">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-800">Client Address Book</h2>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
          {clients.length} clients
        </span>
      </div>

      {currentClient?.name && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-4">
          <p className="text-xs font-semibold text-indigo-700 mb-1">Current client in editor</p>
          <p className="text-sm font-medium text-gray-800">{currentClient.name}</p>
          {currentClient.email && <p className="text-xs text-gray-500">{currentClient.email}</p>}
          <button
            onClick={handleSaveCurrent}
            className="mt-2 text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors"
          >
            Save to Address Book
          </button>
        </div>
      )}

      {clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
          <div className="text-4xl mb-3">👥</div>
          <p className="font-medium text-gray-500">No saved clients yet</p>
          <p className="text-sm mt-1 text-center">Fill in a client in the editor, then save them here</p>
        </div>
      ) : (
        clients.map((client) => (
          <div
            key={client.id}
            className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:border-indigo-200 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm">{client.name}</p>
                {client.email && <p className="text-xs text-gray-500 mt-0.5">{client.email}</p>}
                {client.address && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{client.address}</p>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() =>
                    onSelect({ name: client.name, address: client.address, email: client.email })
                  }
                  className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 font-medium transition-colors"
                >
                  Use
                </button>
                <button
                  onClick={() => handleDelete(client.id)}
                  className="text-xs px-3 py-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 font-medium transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
