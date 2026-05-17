import { useEffect, useState } from 'react';
import { useCustomFieldStore, useAuthStore, useSettingsStore } from '../store';
import { Plus, Pencil, Trash2, X, Database, Gauge } from 'lucide-react';

export default function Settings() {
  const { fields, fetchFields, createField, updateField, deleteField } = useCustomFieldStore();
  const { user } = useAuthStore();
  const { messageLimit, fetchMessageLimit, updateMessageLimit } = useSettingsStore();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fieldName: '',
    fieldType: 'TEXT' as 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT',
    fieldOptions: '',
    isRequired: false,
  });
  const [limitForm, setLimitForm] = useState({ maxPerMinute: 3, maxPerHour: 20, maxPerDay: 100 });
  const [limitSaving, setLimitSaving] = useState(false);

  useEffect(() => {
    fetchFields();
    fetchMessageLimit();
  }, []);

  useEffect(() => {
    if (messageLimit) {
      setLimitForm({
        maxPerMinute: messageLimit.maxPerMinute,
        maxPerHour: messageLimit.maxPerHour,
        maxPerDay: messageLimit.maxPerDay,
      });
    }
  }, [messageLimit]);

  const openCreate = () => {
    setFormData({ fieldName: '', fieldType: 'TEXT', fieldOptions: '', isRequired: false });
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (field: typeof fields[0]) => {
    setFormData({
      fieldName: field.fieldName,
      fieldType: field.fieldType,
      fieldOptions: field.fieldOptions?.join(', ') || '',
      isRequired: field.isRequired,
    });
    setEditingId(field.id);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        fieldOptions: formData.fieldType === 'SELECT' ? formData.fieldOptions.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      };
      if (editingId) {
        await updateField(editingId, data);
      } else {
        await createField(data);
      }
      setShowModal(false);
    } catch {
      alert('Failed to save field');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this custom field? Tenant data for this field will be preserved.')) {
      try {
        await deleteField(id);
      } catch {
        alert('Failed to delete field');
      }
    }
  };

  const handleSaveLimits = async () => {
    setLimitSaving(true);
    try {
      await updateMessageLimit(limitForm);
      alert('Message limits saved');
    } catch {
      alert('Failed to save message limits');
    }
    setLimitSaving(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Database size={20} className="text-slate-600" />
              <h2 className="text-lg font-semibold">Custom Fields</h2>
            </div>
            <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm">
              <Plus size={16} /> Add Field
            </button>
          </div>
          <p className="text-sm text-slate-500 mb-4">Custom fields appear when adding/editing tenants. Use them to store additional info like deposit, emergency contact, etc.</p>

          {fields.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No custom fields yet</p>
          ) : (
            <div className="space-y-2">
              {fields.map((field) => (
                <div key={field.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium">{field.fieldName}</p>
                    <p className="text-xs text-slate-500">
                      Type: {field.fieldType} {field.isRequired && '(Required)'}
                      {field.fieldOptions?.length ? ` - Options: ${field.fieldOptions.join(', ')}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(field)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(field.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-lg font-semibold mb-4">Account</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-500">Name</label>
                <p className="font-medium">{user?.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500">Email</label>
                <p className="font-medium">{user?.email}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow">
            <div className="flex items-center gap-2 mb-4">
              <Gauge size={20} className="text-slate-600" />
              <h2 className="text-lg font-semibold">Message Limits</h2>
            </div>
            <p className="text-sm text-slate-500 mb-4">WhatsApp rate limits to prevent being blocked. Follows safe defaults: 3/min, 20/hr, 100/day.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Max Per Minute</label>
                <input
                  type="number"
                  value={limitForm.maxPerMinute}
                  onChange={(e) => setLimitForm({ ...limitForm, maxPerMinute: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border rounded-lg"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Max Per Hour</label>
                <input
                  type="number"
                  value={limitForm.maxPerHour}
                  onChange={(e) => setLimitForm({ ...limitForm, maxPerHour: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border rounded-lg"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Max Per Day</label>
                <input
                  type="number"
                  value={limitForm.maxPerDay}
                  onChange={(e) => setLimitForm({ ...limitForm, maxPerDay: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border rounded-lg"
                  min="1"
                />
              </div>
              <button
                onClick={handleSaveLimits}
                disabled={limitSaving}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-slate-300"
              >
                {limitSaving ? 'Saving...' : 'Save Limits'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-lg mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">{editingId ? 'Edit Field' : 'Add Custom Field'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Field Name</label>
                <input
                  type="text"
                  value={formData.fieldName}
                  onChange={(e) => setFormData({ ...formData, fieldName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., Deposit Amount"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Field Type</label>
                <select value={formData.fieldType} onChange={(e) => setFormData({ ...formData, fieldType: e.target.value as 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' })} className="w-full px-3 py-2 border rounded-lg">
                  <option value="TEXT">Text</option>
                  <option value="NUMBER">Number</option>
                  <option value="DATE">Date</option>
                  <option value="SELECT">Dropdown</option>
                </select>
              </div>
              {formData.fieldType === 'SELECT' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Options (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.fieldOptions}
                    onChange={(e) => setFormData({ ...formData, fieldOptions: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Option 1, Option 2, Option 3"
                  />
                </div>
              )}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isRequired}
                  onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Required field</span>
              </label>
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
