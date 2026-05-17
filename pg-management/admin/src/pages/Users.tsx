import { useEffect, useState } from 'react';
import { useUserStore } from '../store';
import { Plus, Pencil, Trash2, X, Search, Mail, Shield, ShieldOff } from 'lucide-react';

export default function Users() {
  const { users, loading, fetchUsers, createUser, updateUser, deleteUser } = useUserStore();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ email: '', name: '', isAdmin: false });

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreate = () => {
    setForm({ email: '', name: '', isAdmin: false });
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (user: typeof users[0]) => {
    setForm({ email: user.email, name: user.name, isAdmin: user.isAdmin });
    setEditingId(user.id);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateUser(editingId, form);
      } else {
        await createUser(form.email, form.name, form.isAdmin);
      }
      setShowModal(false);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to save user');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this user? Their data will also be removed.')) {
      try {
        await deleteUser(id);
      } catch (err: any) {
        alert(err?.response?.data?.error || 'Failed to delete user');
      }
    }
  };

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        <button onClick={openCreate} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700">
          <Plus size={20} /> Add User
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email or name..."
          className="w-full pl-10 pr-4 py-2 border rounded-lg"
        />
      </div>

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white p-8 rounded-xl shadow text-center">
          <Mail size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">{search ? 'No matching users' : 'No users yet. Add the first user.'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-6 py-3 font-medium text-sm">Email</th>
                  <th className="text-left px-6 py-3 font-medium text-sm">Name</th>
                  <th className="text-left px-6 py-3 font-medium text-sm">Role</th>
                  <th className="text-left px-6 py-3 font-medium text-sm">Created</th>
                  <th className="text-left px-6 py-3 font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id} className="border-t">
                    <td className="px-6 py-4 text-sm font-medium">{user.email}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{user.name || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium px-2 py-1 rounded ${user.isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                        {user.isAdmin ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => openEdit(user)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleDelete(user.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">{editingId ? 'Edit User' : 'Add User'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name (optional)</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isAdmin}
                  onChange={(e) => setForm({ ...form, isAdmin: e.target.checked })}
                  className="w-4 h-4"
                />
                {form.isAdmin ? <Shield size={16} className="text-purple-600" /> : <ShieldOff size={16} className="text-slate-400" />}
                <span className="text-sm">Admin access</span>
              </label>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700">
                  {editingId ? 'Update' : 'Add User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
