import { useEffect, useRef, useState } from 'react';
import { useTenantStore, useTemplateStore, useBuildingStore, useCustomFieldStore } from '../store';
import { Send, History, MessageSquare, Image, X, GripVertical } from 'lucide-react';
import api from '../services/api';
import type { MessageLog } from '../types';

const STANDARD_VARIABLES = [
  '{{name}}', '{{phone}}', '{{room_number}}', '{{floor}}',
  '{{rent_amount}}', '{{join_date}}', '{{building_name}}', '{{owner_name}}'
];

export default function Messages() {
  const { tenants, fetchTenants } = useTenantStore();
  const { templates, fetchTemplates } = useTemplateStore();
  const { buildings, fetchBuildings } = useBuildingStore();
  const { fields, fetchFields } = useCustomFieldStore();
  const [tab, setTab] = useState<'compose' | 'history'>('compose');
  const [message, setMessage] = useState('');
  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);
  const [buildingFilter, setBuildingFilter] = useState('');
  const [floorFilter, setFloorFilter] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ successful: number; failed: number } | null>(null);
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPagination, setLogsPagination] = useState<{ hasMore: boolean; nextCursor: string | null }>({ hasMore: false, nextCursor: null });
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageName, setImageName] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTenants();
    fetchTemplates();
    fetchBuildings();
    fetchFields();
  }, []);

  useEffect(() => {
    if (tab === 'history') {
      refreshLogs();
    }
  }, [tab]);

  const fetchLogs = async (cursor?: string, append = false) => {
    setLogsLoading(true);
    try {
      const params: Record<string, string | number> = { limit: 50 };
      if (cursor) params.cursor = cursor;
      const { data } = await api.get('/messages/logs', { params });
      setLogs((prev) => append ? [...prev, ...data.logs] : data.logs);
      setLogsPagination({ hasMore: data.pagination.hasMore, nextCursor: data.pagination.nextCursor });
    } catch {
      console.error('Failed to fetch logs');
    }
    setLogsLoading(false);
  };

  const loadMoreLogs = () => {
    if (logsPagination.nextCursor) {
      fetchLogs(logsPagination.nextCursor, true);
    }
  };

  const refreshLogs = () => {
    setLogs([]);
    setLogsPagination({ hasMore: false, nextCursor: null });
    fetchLogs();
  };

  const filteredTenants = tenants.filter((t) => {
    if (buildingFilter && t.buildingId !== buildingFilter) return false;
    if (floorFilter) { const f = parseInt(floorFilter, 10); if (!isNaN(f) && t.floor !== f) return false; }
    return true;
  });

  const toggleTenant = (id: string) => {
    setSelectedTenants((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedTenants(filteredTenants.map((t) => t.id));
  };

  const selectNone = () => {
    setSelectedTenants([]);
  };

  const applyTemplate = (id: string) => {
    const template = templates.find((t) => t.id === id);
    if (template) {
      setMessage(template.templateText);
    }
  };

  const insertAtCursor = (text: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      setMessage((prev) => prev + text);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = message.substring(0, start);
    const after = message.substring(end);
    setMessage(before + text + after);
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = start + text.length;
      ta.focus();
    });
  };

  const handleDragStart = (e: React.DragEvent, variable: string) => {
    e.dataTransfer.setData('text/plain', variable);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const text = e.dataTransfer.getData('text/plain');
    if (text) {
      insertAtCursor(text);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      setImageBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImageBase64(null);
    setImageName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async () => {
    if (!message || selectedTenants.length === 0) return;
    setSending(true);
    setResult(null);
    try {
      const { data } = await api.post('/messages/bulk', {
        tenantIds: selectedTenants,
        message,
        imageBase64,
      });
      setResult({ successful: data.successful, failed: data.failed });
      setSelectedTenants([]);
      if (data.successful > 0) {
        setMessage('');
        clearImage();
      }
    } catch {
      setResult({ successful: 0, failed: selectedTenants.length });
    }
    setSending(false);
  };

  const allVariables = [
    ...STANDARD_VARIABLES,
    ...fields.map((f) => `{{custom:${f.fieldName}}}`),
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Messages</h1>

      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab('compose')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium ${tab === 'compose' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:text-slate-800'}`}
        >
          <MessageSquare size={16} /> Compose
        </button>
        <button
          onClick={() => setTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium ${tab === 'history' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:text-slate-800'}`}
        >
          <History size={16} /> History
        </button>
      </div>

      {tab === 'compose' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-lg font-semibold mb-4">Compose Message</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Use Template</label>
              <select value={templateId} onChange={(e) => { const id = e.target.value; setTemplateId(id); applyTemplate(id); }} className="w-full px-3 py-2 border rounded-lg">
                <option value="">Select a template (optional)</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Variables <span className="text-xs text-slate-400">(click or drag into message)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {allVariables.map((v) => (
                  <button
                    type="button"
                    key={v}
                    draggable
                    onDragStart={(e) => handleDragStart(e, v)}
                    onClick={() => insertAtCursor(v)}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-xs rounded hover:bg-slate-200 cursor-grab active:cursor-grabbing"
                  >
                    <GripVertical size={10} className="text-slate-400" />
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Attach Image <span className="text-xs text-slate-400">(QR code, receipt, etc.)</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-slate-50"
                >
                  <Image size={16} /> {imageName || 'Choose image'}
                </button>
                {imageBase64 && (
                  <button type="button" onClick={clearImage} className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                    <X size={16} />
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              {imageBase64 && (
                <div className="mt-2 relative inline-block">
                  <img
                    src={`data:image/jpeg;base64,${imageBase64}`}
                    alt="Preview"
                    className="h-24 w-24 object-cover rounded-lg border"
                  />
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full h-40 px-3 py-2 border rounded-lg resize-none"
                  placeholder="Dear {{name}}, your rent of ₹{{rent_amount}} is due..."
                />
              </div>
            </div>

            <button
              onClick={handleSend}
              disabled={!message || selectedTenants.length === 0 || sending}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              <Send size={20} />
              {sending ? 'Sending...' : `Send to ${selectedTenants.length} tenant(s)`}
              {imageBase64 && ' (with image)'}
            </button>

            {result && (
              <div className={`mt-4 p-3 rounded-lg ${result.failed === 0 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                Sent to {result.successful} tenants. {result.failed > 0 && `Failed: ${result.failed}`}
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Select Recipients</h2>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-sm text-blue-600 hover:underline">Select All</button>
                <button onClick={selectNone} className="text-sm text-slate-500 hover:underline">Clear</button>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <select value={buildingFilter} onChange={(e) => setBuildingFilter(e.target.value)} className="px-3 py-2 border rounded-lg flex-1">
                <option value="">All Buildings</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <input
                type="number"
                value={floorFilter}
                onChange={(e) => setFloorFilter(e.target.value)}
                placeholder="Floor"
                className="w-24 px-3 py-2 border rounded-lg"
              />
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredTenants.map((tenant) => (
                <label key={tenant.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100">
                  <input
                    type="checkbox"
                    checked={selectedTenants.includes(tenant.id)}
                    onChange={() => toggleTenant(tenant.id)}
                    className="w-5 h-5"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{tenant.name}</p>
                    <p className="text-sm text-slate-500">
                      Room {tenant.roomNumber} - {tenant.building?.name} (Floor {tenant.floor})
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold">Message History</h2>
            <button onClick={refreshLogs} className="text-sm text-blue-600 hover:underline">Refresh</button>
          </div>
          {logsLoading ? (
            <p className="p-6 text-slate-500 text-center">Loading...</p>
          ) : logs.length === 0 ? (
            <p className="p-6 text-slate-500 text-center">No messages sent yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-4 md:px-6 py-3 font-medium text-sm">Date/Time</th>
                    <th className="text-left px-4 md:px-6 py-3 font-medium text-sm">Tenant</th>
                    <th className="text-left px-4 md:px-6 py-3 font-medium text-sm">Room</th>
                    <th className="text-left px-4 md:px-6 py-3 font-medium text-sm">Message</th>
                    <th className="text-left px-4 md:px-6 py-3 font-medium text-sm">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-t">
                      <td className="px-4 md:px-6 py-3 text-sm text-slate-600 whitespace-nowrap">
                        {new Date(log.sentAt).toLocaleString()}
                      </td>
                      <td className="px-4 md:px-6 py-3 text-sm font-medium">{log.tenant?.name || 'Unknown'}</td>
                      <td className="px-4 md:px-6 py-3 text-sm">{log.tenant?.roomNumber || '-'}</td>
                      <td className="px-4 md:px-6 py-3 text-sm text-slate-600 max-w-xs truncate">
                        {log.imageData && <span className="text-xs text-blue-500 mr-1">[Image]</span>}
                        {log.messageContent}
                      </td>
                      <td className="px-4 md:px-6 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded ${
                          log.status === 'SENT' ? 'bg-green-100 text-green-700' :
                          log.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {logsPagination.hasMore && (
                <div className="p-4 border-t text-center">
                  <button
                    onClick={loadMoreLogs}
                    disabled={logsLoading}
                    className="px-4 py-2 text-sm text-blue-600 hover:underline disabled:text-slate-400"
                  >
                    {logsLoading ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
