import { useEffect } from 'react';
import { useBuildingStore, useTenantStore, useTemplateStore } from '../store';
import { Building2, Users, MessageSquare, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export default function Dashboard() {
  const { buildings, fetchBuildings } = useBuildingStore();
  const { tenants, fetchTenants } = useTenantStore();
  const { templates, fetchTemplates } = useTemplateStore();

  useEffect(() => {
    fetchBuildings();
    fetchTenants();
    fetchTemplates();
  }, []);

  const activeTenants = tenants.filter((t) => t.isActive);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Buildings"
          value={buildings.length}
          icon={Building2}
          color="bg-blue-500"
        />
        <StatCard
          title="Active Tenants"
          value={activeTenants.length}
          icon={Users}
          color="bg-green-500"
        />
        <StatCard
          title="Templates"
          value={templates.length}
          icon={MessageSquare}
          color="bg-purple-500"
        />
        <StatCard
          title="Total Rooms"
          value={tenants.length}
          icon={TrendingUp}
          color="bg-orange-500"
        />
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-lg font-semibold mb-4">Buildings Overview</h2>
          {buildings.length === 0 ? (
            <p className="text-slate-500">No buildings added yet.</p>
          ) : (
            <div className="space-y-3">
              {buildings.slice(0, 5).map((building) => (
                <div key={building.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium">{building.name}</p>
                    <p className="text-sm text-slate-500">{building.address || 'No address'}</p>
                  </div>
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                    {building._count?.tenants || 0} tenants
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-lg font-semibold mb-4">Recent Tenants</h2>
          {activeTenants.length === 0 ? (
            <p className="text-slate-500">No tenants added yet.</p>
          ) : (
            <div className="space-y-3">
              {activeTenants.slice(0, 5).map((tenant) => (
                <div key={tenant.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium">{tenant.name}</p>
                    <p className="text-sm text-slate-500">Room {tenant.roomNumber} - {tenant.building?.name}</p>
                  </div>
                  <span className="text-sm text-slate-500">Floor {tenant.floor}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: { title: string; value: number; icon: LucideIcon; color: string }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow">
      <div className="flex items-center gap-4">
        <div className={`${color} p-3 rounded-lg`}>
          <Icon className="text-white" size={24} />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-slate-500">{title}</p>
        </div>
      </div>
    </div>
  );
}