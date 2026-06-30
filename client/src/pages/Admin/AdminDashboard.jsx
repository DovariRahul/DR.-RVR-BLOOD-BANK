import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { BarChart3, Users, HeartPulse, Activity, Droplet, Clock, TrendingUp, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import './Admin.css';

const CHART_COLORS = ['#DC2626', '#F97316', '#EAB308', '#16A34A', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4'];

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [activeRequests, setActiveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [analyticsRes, activeRes] = await Promise.all([
        adminAPI.getAnalytics(),
        adminAPI.getActiveRequests()
      ]);
      setAnalytics(analyticsRes.data.data);
      setActiveRequests(activeRes.data.data.requests);
    } catch {
      // Fallback for dev without DB
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-overlay"><div className="spinner spinner-lg"></div><p>Loading dashboard...</p></div>;
  }

  const a = analytics || {};

  return (
    <div className="page admin-page">
      <div className="container">
        <div className="admin-header">
          <h1><BarChart3 size={28} /> Admin Dashboard</h1>
          <p className="text-muted">Real-time overview of RVR Blood Bank operations</p>
        </div>

        <div className="admin-nav">
          <Link to="/admin" className="admin-nav-link active">
            <BarChart3 size={16} /> Dashboard
          </Link>
          <Link to="/admin/users" className="admin-nav-link">
            <Users size={16} /> User Management
          </Link>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-4 mt-6">
          <div className="card stat-card">
            <div className="stat-value">{a.total_requests || 0}</div>
            <div className="stat-label"><HeartPulse size={14} /> Total Requests</div>
          </div>
          <div className="card stat-card stat-secondary">
            <div className="stat-value">{a.active_requests || 0}</div>
            <div className="stat-label"><Activity size={14} /> Active Requests</div>
          </div>
          <div className="card stat-card stat-success">
            <div className="stat-value">{a.total_donors || 0}</div>
            <div className="stat-label"><Users size={14} /> Total Donors</div>
          </div>
          <div className="card stat-card stat-info">
            <div className="stat-value">{a.available_donors || 0}</div>
            <div className="stat-label"><CheckCircle size={14} /> Available Donors</div>
          </div>
        </div>

        <div className="grid grid-3 mt-6">
          <div className="card stat-card">
            <div className="stat-value">{a.match_success_rate || 0}%</div>
            <div className="stat-label"><TrendingUp size={14} /> Match Success Rate</div>
          </div>
          <div className="card stat-card stat-warning">
            <div className="stat-value">{a.avg_response_time_minutes || 0} min</div>
            <div className="stat-label"><Clock size={14} /> Avg Response Time</div>
          </div>
          <div className="card stat-card stat-secondary">
            <div className="stat-value">{a.requests_this_month || 0}</div>
            <div className="stat-label"><Droplet size={14} /> This Month</div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-2 mt-6">
          {/* Blood Group Demand */}
          <div className="card">
            <h3 className="card-title mb-4">Blood Group Demand</h3>
            {a.blood_group_demand?.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={a.blood_group_demand}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="blood_group" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#DC2626" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state"><p>No data yet</p></div>
            )}
          </div>

          {/* City Distribution */}
          <div className="card">
            <h3 className="card-title mb-4">Donor Distribution</h3>
            {a.city_distribution?.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={a.city_distribution} dataKey="donors" nameKey="city" cx="50%" cy="50%" outerRadius={100} label={({ city, donors }) => `${city}: ${donors}`}>
                    {a.city_distribution.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state"><p>No data yet</p></div>
            )}
          </div>
        </div>

        {/* Monthly Trend */}
        {a.monthly_trend?.length > 0 && (
          <div className="card mt-6">
            <h3 className="card-title mb-4">Monthly Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={a.monthly_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="requests" stroke="#DC2626" strokeWidth={2} dot={{ r: 4 }} name="Requests" />
                <Line type="monotone" dataKey="fulfilled" stroke="#16A34A" strokeWidth={2} dot={{ r: 4 }} name="Fulfilled" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Active Requests Table */}
        <div className="card mt-6">
          <h3 className="card-title mb-4"><HeartPulse size={18} /> Active Requests</h3>
          {activeRequests.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Patient</th>
                    <th>Blood Group</th>
                    <th>Units</th>
                    <th>Urgency</th>
                    <th>Hospital</th>
                    <th>Notified</th>
                    <th>Accepted</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRequests.map(r => (
                    <tr key={r.id}>
                      <td data-label="ID" className="font-semibold">RVR-{r.id}</td>
                      <td data-label="Patient">{r.patient_name}</td>
                      <td data-label="Blood"><span className="badge badge-blood">{r.blood_group_needed}</span></td>
                      <td data-label="Units">{r.units_needed}</td>
                      <td data-label="Urgency"><span className={`badge badge-${r.urgency}`}>{r.urgency}</span></td>
                      <td data-label="Hospital">{r.hospital_name}</td>
                      <td data-label="Notified">{r.donors_notified}</td>
                      <td data-label="Accepted">{r.donors_accepted}</td>
                      <td data-label="Status"><span className={`badge badge-${r.status === 'matched' ? 'active' : 'urgent'}`}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <CheckCircle size={48} />
              <h3>All clear!</h3>
              <p>No active blood requests at the moment.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
