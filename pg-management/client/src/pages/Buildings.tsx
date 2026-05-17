import { useEffect, useState } from 'react';
import { useBuildingStore } from '../store';
import { Building2, Plus, Pencil, Trash2, X } from 'lucide-react';

export default function Buildings() {
  const { buildings, loading, fetchBuildings, createBuilding, updateBuilding, deleteBuilding } = useBuildingStore();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', address: '' });

  useEffect(() => {
    fetchBuildings();
  }, []);

  const openCreate = () => {
    setFormData({ name: '', address: '' });
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (building: typeof buildings[0]) => {
    setFormData({ name: building.name, address: building.address || '' });
    setEditingId(building.id);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateBuilding(editingId, formData.name, formData.address);
      } else {
        await createBuilding(formData.name, formData.address);
      }
      setShowModal(false);
    } catch {
      alert('Failed to save building');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this building and all its tenants?')) {
      try {
        await deleteBuilding(id);
      } catch {
        alert('Failed to delete building');
      }
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Buildings</h1>
        <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus size={20} /> Add Building
        </button>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : buildings.length === 0 ? (
        <div className="bg-white p-8 rounded-xl shadow text-center">
          <Building2 size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">No buildings yet. Add your first building to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {buildings.map((building) => (
            <div key={building.id} className="bg-white p-6 rounded-xl shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{building.name}</h3>
                  <p className="text-sm text-slate-500">{building.address || 'No address'}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(building)} className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => handleDelete(building.id)} className="p-2 text-red-600 hover:bg-red-50 rounded">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center pt-4 border-t">
                <span className="text-sm text-slate-500">Tenants</span>
                <span className="font-semibold">{building._count?.tenants || 0}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-lg mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">{editingId ? 'Edit Building' : 'Add Building'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">{editingId ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}