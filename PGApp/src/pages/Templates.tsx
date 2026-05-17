import { useEffect, useState } from 'react';
import { useTemplateStore, useTenantStore, useBuildingStore, useCustomFieldStore } from '../store';
import { Plus, Pencil, Trash2, X, Eye } from 'lucide-react';

const STANDARD_VARIABLES = [
  '{{name}}', '{{phone}}', '{{room_number}}', '{{floor}}',
  '{{rent_amount}}', '{{join_date}}', '{{building_name}}', '{{owner_name}}'
];

export default function Templates() {
  const { templates, fetchTemplates, createTemplate, updateTemplate, deleteTemplate, previewTemplate } = useTemplateStore();
  const { tenants, fetchTenants } = useTenantStore();
  const { fetchBuildings } = useBuildingStore();
  const { fields, fetchFields } = useCustomFieldStore();
  const [showModal, setShowModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewText, setPreviewText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', templateText: '' });
  const [previewTenantId, setPreviewTenantId] = useState('');

  useEffect(() => {
    fetchTemplates();
    fetchTenants();
    fetchBuildings().catch(() => {});
    fetchFields();
  }, []);

  const openCreate = () => {
    setFormData({ name: '', templateText: '' });
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (template: typeof templates[0]) => {
    setFormData({ name: template.name, templateText: template.templateText });
    setEditingId(template.id);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateTemplate(editingId, formData.name, formData.templateText);
      } else {
        await createTemplate(formData.name, formData.templateText);
      }
      setShowModal(false);
    } catch {
      alert('Failed to save template');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this template?')) {
      try {
        await deleteTemplate(id);
      } catch {
        alert('Failed to delete template');
      }
    }
  };

  const handlePreview = async () => {
    if (!previewTenantId || !editingId) return;
    try {
      const preview = await previewTemplate(editingId, previewTenantId);
      setPreviewText(preview);
    } catch {
      setPreviewText('Failed to generate preview');
    }
  };

  const insertVariable = (variable: string) => {
    setFormData({ ...formData, templateText: formData.templateText + variable });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Message Templates</h1>
        <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus size={20} /> Add Template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="bg-white p-8 rounded-xl shadow text-center">
          <p className="text-slate-500">No templates yet. Create your first template with variables like {"{{name}}"} and {"{{rent_amount}}"}.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <div key={template.id} className="bg-white p-6 rounded-xl shadow">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">{template.name}</h3>
                  <p className="text-sm text-slate-500 mt-1 line-clamp-2">{template.templateText}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { openEdit(template); setPreviewTenantId(tenants[0]?.id || ''); setShowPreviewModal(true); }} className="p-2 text-green-600 hover:bg-green-50 rounded">
                    <Eye size={16} />
                  </button>
                  <button onClick={() => openEdit(template)} className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => handleDelete(template.id)} className="p-2 text-red-600 hover:bg-red-50 rounded">
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
          <div className="bg-white p-6 rounded-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">{editingId ? 'Edit Template' : 'Add Template'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Template Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Monthly Rent Reminder"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Message Template</label>
                <div className="border rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-2">Available Variables:</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {STANDARD_VARIABLES.map((v) => (
                      <button type="button" key={v} onClick={() => insertVariable(v)}
                        className="px-2 py-1 bg-slate-100 text-xs rounded hover:bg-slate-200">
                        {v}
                      </button>
                    ))}
                    {fields.map((f) => (
                      <button type="button" key={f.id} onClick={() => insertVariable(`{{custom:${f.fieldName}}}`)}
                        className="px-2 py-1 bg-purple-100 text-xs rounded hover:bg-purple-200">
                        {`{{custom:${f.fieldName}}}`}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={formData.templateText}
                    onChange={(e) => setFormData({ ...formData, templateText: e.target.value })}
                    className="w-full h-40 px-3 py-2 border rounded-lg resize-none"
                    placeholder="Dear {{name}},&#10;This is a reminder for rent of ₹{{rent_amount}} for Room {{room_number}}.&#10;&#10;- {{owner_name}}"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">{editingId ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-lg mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Preview Template</h2>
              <button onClick={() => setShowPreviewModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Tenant</label>
                <select value={previewTenantId} onChange={(e) => setPreviewTenantId(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} - {t.building?.name}</option>
                  ))}
                </select>
              </div>
              <button onClick={handlePreview} className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700">
                Generate Preview
              </button>
              {previewText && (
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{previewText}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}