import { useEffect, useState } from 'react';
import { useReminderStore, useTemplateStore, useBuildingStore } from '../store';
import { Plus, Pencil, Trash2, X, Calendar, Play } from 'lucide-react';
import api from '../services/api';

export default function Scheduler() {
  const { reminders, fetchReminders, createReminder, updateReminder, deleteReminder } = useReminderStore();
  const { templates, fetchTemplates } = useTemplateStore();
  const { buildings, fetchBuildings } = useBuildingStore();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    templateId: '',
    buildingId: '',
    triggerType: 'FIXED_DATE' as 'FIXED_DATE' | 'RELATIVE_TO_JOIN',
    triggerValue: '',
    sendFrom: '',
    sendUntil: '',
  });

  useEffect(() => {
    fetchReminders();
    fetchTemplates();
    fetchBuildings();
  }, []);

  const openCreate = () => {
    setFormData({
      templateId: templates[0]?.id || '',
      buildingId: '',
      triggerType: 'FIXED_DATE',
      triggerValue: '',
      sendFrom: '',
      sendUntil: '',
    });
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (reminder: typeof reminders[0]) => {
    setFormData({
      templateId: reminder.templateId,
      buildingId: reminder.buildingId || '',
      triggerType: reminder.triggerType,
      triggerValue: reminder.triggerValue,
      sendFrom: reminder.sendFrom || '',
      sendUntil: reminder.sendUntil || '',
    });
    setEditingId(reminder.id);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        buildingId: formData.buildingId || undefined,
      };
      if (editingId) {
        await updateReminder(editingId, data);
      } else {
        await createReminder(data);
      }
      setShowModal(false);
    } catch {
      alert('Failed to save reminder');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this reminder?')) {
      try {
        await deleteReminder(id);
      } catch {
        alert('Failed to delete reminder');
      }
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      await updateReminder(id, { isActive: !isActive });
    } catch {
      alert('Failed to toggle reminder');
    }
  };

  const triggerNow = async (id: string) => {
    if (!confirm('Send reminder to all eligible tenants now?')) return;
    try {
      await api.post(`/scheduler/reminders/${id}/trigger`);
      alert('Reminder triggered successfully');
    } catch {
      alert('Failed to trigger reminder');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Scheduled Reminders</h1>
        <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus size={20} /> Add Reminder
        </button>
      </div>

      {reminders.length === 0 ? (
        <div className="bg-white p-8 rounded-xl shadow text-center">
          <Calendar size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">No scheduled reminders yet. Create one to automate rent reminders.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reminders.map((reminder) => (
            <div key={reminder.id} className="bg-white p-6 rounded-xl shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{reminder.template?.name}</h3>
                    <span className={`px-2 py-1 text-xs rounded ${reminder.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                      {reminder.isActive ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mb-2">
                    {reminder.triggerType === 'FIXED_DATE'
                      ? `Monthly on day ${reminder.triggerValue}`
                      : `${Number(reminder.triggerValue) > 0 ? '+' : ''}${reminder.triggerValue} days from join date`}
                  </p>
                  <p className="text-sm text-slate-400">
                    Building: {reminder.building?.name || 'All Buildings'}
                  </p>
                  {(reminder as any).sendFrom || (reminder as any).sendUntil ? (
                    <p className="text-sm text-blue-500 mt-1">
                      Send window: {reminder.sendFrom || '00:00'} - {reminder.sendUntil || '23:59'}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400 mt-1">Send window: Anytime</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => triggerNow(reminder.id)} className="p-2 text-green-600 hover:bg-green-50 rounded" title="Send now">
                    <Play size={16} />
                  </button>
                  <button onClick={() => toggleActive(reminder.id, reminder.isActive ?? true)} className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                    {reminder.isActive ? 'Pause' : 'Resume'}
                  </button>
                  <button onClick={() => openEdit(reminder)} className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => handleDelete(reminder.id)} className="p-2 text-red-600 hover:bg-red-50 rounded">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-lg mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">{editingId ? 'Edit Reminder' : 'Add Reminder'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Template</label>
                <select value={formData.templateId} onChange={(e) => setFormData({ ...formData, templateId: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required>
                  <option value="">Select Template</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Building</label>
                <select value={formData.buildingId} onChange={(e) => setFormData({ ...formData, buildingId: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                  <option value="">All Buildings</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Trigger Type</label>
                <select value={formData.triggerType} onChange={(e) => setFormData({ ...formData, triggerType: e.target.value as 'FIXED_DATE' | 'RELATIVE_TO_JOIN' })} className="w-full px-3 py-2 border rounded-lg">
                  <option value="FIXED_DATE">Fixed Day of Month</option>
                  <option value="RELATIVE_TO_JOIN">Relative to Join Date</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {formData.triggerType === 'FIXED_DATE' ? 'Day of Month (1-28)' : 'Days Offset (e.g., -3 for 3 days before)'}
                </label>
                <input
                  type="number"
                  value={formData.triggerValue}
                  onChange={(e) => setFormData({ ...formData, triggerValue: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Send From (optional)</label>
                <input
                  type="time"
                  value={formData.sendFrom}
                  onChange={(e) => setFormData({ ...formData, sendFrom: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Send Until (optional)</label>
                <input
                  type="time"
                  value={formData.sendUntil}
                  onChange={(e) => setFormData({ ...formData, sendUntil: e.target.value })}
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