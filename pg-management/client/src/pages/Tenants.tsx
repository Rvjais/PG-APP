import { useEffect, useState, useRef } from 'react';
import { useTenantStore, useBuildingStore, useCustomFieldStore } from '../store';
import { Plus, Pencil, Trash2, X, Users, Search, Upload, FileText, Check, AlertCircle } from 'lucide-react';
import api from '../services/api';

export default function Tenants() {
  const { tenants, loading, fetchTenants, createTenant, updateTenant, deleteTenant } = useTenantStore();
  const { buildings, fetchBuildings } = useBuildingStore();
  const { fields, fetchFields } = useCustomFieldStore();
  const [search, setSearch] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importBuildingId, setImportBuildingId] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    total: number;
    imported: number;
    failed: number;
    errors: { row: number; field: string; value: string; message: string }[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    buildingId: '',
    name: '',
    phone: '',
    roomNumber: '',
    floor: 1,
    rentAmount: '',
    joinDate: '',
    customFieldValues: {} as Record<string, string>,
  });

  useEffect(() => {
    fetchTenants();
    fetchBuildings();
    fetchFields();
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [showActiveOnly]);

  const openCreate = () => {
    setFormData({
      buildingId: buildings[0]?.id || '',
      name: '',
      phone: '',
      roomNumber: '',
      floor: 1,
      rentAmount: '',
      joinDate: '',
      customFieldValues: {},
    });
    setEditingId(null);
    setShowModal(true);
  };

  const openImportModal = () => {
    setImportBuildingId(buildings[0]?.id || '');
    setImportFile(null);
    setImportResult(null);
    setShowImportModal(true);
  };

  const downloadTemplate = async () => {
    try {
      const response = await api.get('/tenants/template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'tenant_import_template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      // BUG FIX: revoke the URL to prevent memory leak
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download template');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.match(/\.(csv|txt)$/i)) {
        alert('Please select a CSV file');
        return;
      }
      setImportFile(file);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!importFile || !importBuildingId) {
      alert('Please select a file and building');
      return;
    }
    setImportLoading(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('buildingId', importBuildingId);
      const { data } = await api.post('/tenants/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(data);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to import tenants');
    }
    setImportLoading(false);
  };

  const closeImportModal = () => {
    const currentResult = importResult;
    setShowImportModal(false);
    setImportFile(null);
    setImportResult(null);
    if (currentResult && currentResult.imported > 0) {
      fetchTenants();
    }
  };

  const openEdit = (tenant: typeof tenants[0]) => {
    setFormData({
      buildingId: tenant.buildingId,
      name: tenant.name,
      phone: tenant.phone,
      roomNumber: tenant.roomNumber,
      floor: tenant.floor,
      rentAmount: tenant.rentAmount?.toString() || '',
      joinDate: tenant.joinDate?.split('T')[0] || '',
      customFieldValues: tenant.customFieldValues || {},
    });
    setEditingId(tenant.id);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        rentAmount: formData.rentAmount ? (() => { const v = parseFloat(formData.rentAmount); return isNaN(v) ? undefined : v; })() : undefined,
        joinDate: formData.joinDate || undefined,
      };
      if (editingId) {
        await updateTenant(editingId, data);
      } else {
        await createTenant(data);
      }
      setShowModal(false);
    } catch {
      alert('Failed to save tenant');
    }
  };

  const filteredTenants = tenants.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.roomNumber.toLowerCase().includes(q) ||
      (t.building?.name || '').toLowerCase().includes(q) ||
      (t.rentAmount?.toString() || '').includes(q)
    );
  });

  const handleDelete = async (id: string) => {
    if (confirm('Delete this tenant?')) {
      try {
        await deleteTenant(id);
      } catch {
        alert('Failed to delete tenant');
      }
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tenants</h1>
        <div className="flex gap-2">
          <button onClick={openImportModal} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
            <Upload size={20} /> Import CSV
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            <Plus size={20} /> Add Tenant
          </button>
        </div>
      </div>

      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, room, building, or rent..."
          className="w-full pl-10 pr-4 py-2 border rounded-lg"
        />
      </div>

      <div className="flex items-center gap-4 mb-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showActiveOnly}
            onChange={(e) => setShowActiveOnly(e.target.checked)}
            className="w-4 h-4 rounded"
          />
          <span>Show active tenants only</span>
        </label>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : filteredTenants.length === 0 ? (
        <div className="bg-white p-8 rounded-xl shadow text-center">
          <Users size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">No tenants yet. Add your first tenant to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 md:px-6 py-3 font-medium text-sm">Name</th>
                  <th className="text-left px-4 md:px-6 py-3 font-medium text-sm">Building</th>
                  <th className="text-left px-4 md:px-6 py-3 font-medium text-sm">Room</th>
                  <th className="text-left px-4 md:px-6 py-3 font-medium text-sm">Floor</th>
                  <th className="text-left px-4 md:px-6 py-3 font-medium text-sm">Phone</th>
                  <th className="text-left px-4 md:px-6 py-3 font-medium text-sm">Rent</th>
                  <th className="text-left px-4 md:px-6 py-3 font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.map((tenant) => (
                  <tr key={tenant.id} className={`border-t ${tenant.isActive ? '' : 'bg-slate-50 text-slate-400'}`}>
                    <td className="px-4 md:px-6 py-3 md:py-4 font-medium text-sm">
                      <div className="flex items-center gap-2">
                        {!tenant.isActive && <span className="w-2 h-2 rounded-full bg-slate-300" title="Inactive" />}
                        {tenant.name}
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4 text-slate-600 text-sm">{tenant.building?.name || '-'}</td>
                    <td className="px-4 md:px-6 py-3 md:py-4 text-sm">{tenant.roomNumber}</td>
                    <td className="px-4 md:px-6 py-3 md:py-4 text-sm">{tenant.floor}</td>
                    <td className="px-4 md:px-6 py-3 md:py-4 text-slate-600 text-sm">{tenant.phone}</td>
                    <td className="px-4 md:px-6 py-3 md:py-4 text-sm">₹{tenant.rentAmount || '-'}</td>
                    <td className="px-4 md:px-6 py-3 md:py-4">
                      <button onClick={() => openEdit(tenant)} className="p-1.5 md:p-2 text-blue-600 hover:bg-blue-50 rounded">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleDelete(tenant.id)} className="p-1.5 md:p-2 text-red-600 hover:bg-red-50 rounded">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white p-6 rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">{editingId ? 'Edit Tenant' : 'Add Tenant'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Building</label>
                  <select
                    value={formData.buildingId}
                    onChange={(e) => setFormData({ ...formData, buildingId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  >
                    <option value="">Select Building</option>
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="9876543210"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Room Number</label>
                  <input
                    type="text"
                    value={formData.roomNumber}
                    onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Floor</label>
                  <input
                    type="number"
                    value={formData.floor}
                    onChange={(e) => { const v = parseInt(e.target.value, 10); setFormData({ ...formData, floor: isNaN(v) ? 1 : v }); }}
                    className="w-full px-3 py-2 border rounded-lg"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Rent Amount</label>
                  <input
                    type="number"
                    value={formData.rentAmount}
                    onChange={(e) => setFormData({ ...formData, rentAmount: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="5000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Join Date</label>
                  <input
                    type="date"
                    value={formData.joinDate}
                    onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              {fields.length > 0 && (
                <>
                  <h3 className="font-medium pt-4 border-t">Custom Fields</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {fields.map((field) => (
                      <div key={field.id}>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{field.fieldName}</label>
                        {field.fieldType === 'SELECT' ? (
                          <select
                            value={formData.customFieldValues[field.fieldName] || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              customFieldValues: { ...formData.customFieldValues, [field.fieldName]: e.target.value }
                            })}
                            className="w-full px-3 py-2 border rounded-lg"
                          >
                            <option value="">Select</option>
                            {field.fieldOptions?.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={field.fieldType === 'DATE' ? 'date' : field.fieldType === 'NUMBER' ? 'number' : 'text'}
                            value={formData.customFieldValues[field.fieldName] || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              customFieldValues: { ...formData.customFieldValues, [field.fieldName]: e.target.value }
                            })}
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="flex gap-2 justify-end pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">{editingId ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white p-6 rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Import Tenants from CSV</h2>
              <button onClick={closeImportModal} className="p-1 hover:bg-slate-100 rounded">
                <X size={20} />
              </button>
            </div>

            {/* Download Template */}
            <div className="mb-4">
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 text-blue-600 hover:underline text-sm"
              >
                <FileText size={16} /> Download CSV Template
              </button>
            </div>

            {/* Building Select */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Building</label>
              <select
                value={importBuildingId}
                onChange={(e) => setImportBuildingId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                required
              >
                <option value="">Select Building</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* File Upload */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">CSV File</label>
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-slate-50"
              >
                {importFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText size={20} className="text-blue-600" />
                    <span className="text-sm">{importFile.name}</span>
                  </div>
                ) : (
                  <div className="text-slate-400">
                    <Upload size={24} className="mx-auto mb-2" />
                    <p className="text-sm">Click to select a CSV file</p>
                  </div>
                )}
              </div>
            </div>

            {/* Import Results */}
            {importResult && (
              <div className={`mb-4 p-4 rounded-lg ${importResult.success ? 'bg-green-50' : importResult.failed > 0 ? 'bg-yellow-50' : 'bg-red-50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {importResult.success ? (
                    <Check size={20} className="text-green-600" />
                  ) : (
                    <AlertCircle size={20} className="text-yellow-600" />
                  )}
                  <span className={`font-medium ${importResult.success ? 'text-green-700' : 'text-yellow-700'}`}>
                    {importResult.success ? 'Import Successful!' : 'Import Completed with Errors'}
                  </span>
                </div>
                <div className="text-sm space-y-1">
                  <p className="text-green-700">Imported: {importResult.imported} tenants</p>
                  {importResult.failed > 0 && (
                    <p className="text-red-600">Failed: {importResult.failed} rows</p>
                  )}
                </div>
                {importResult.errors.length > 0 && (
                  <div className="mt-3 max-h-40 overflow-y-auto">
                    <p className="text-sm font-medium text-slate-700 mb-1">Errors:</p>
                    {importResult.errors.slice(0, 10).map((err, idx) => (
                      <p key={idx} className="text-xs text-red-600">
                        Row {err.row}: {err.message}
                      </p>
                    ))}
                    {importResult.errors.length > 10 && (
                      <p className="text-xs text-slate-500">
                        ...and {importResult.errors.length - 10} more errors
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 justify-end pt-4">
              <button type="button" onClick={closeImportModal} className="px-4 py-2 border rounded-lg">
                {(importResult && importResult.imported > 0) ? 'Done' : 'Cancel'}
              </button>
              {(!importResult || importResult.failed > 0) && (
                <button
                  onClick={handleImport}
                  disabled={!importFile || !importBuildingId || importLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-slate-300"
                >
                  {importLoading ? 'Importing...' : 'Import Tenants'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}