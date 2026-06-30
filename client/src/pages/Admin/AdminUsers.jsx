import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  Users, Search, Filter, Eye, ShieldCheck, ShieldOff, ChevronLeft, ChevronRight,
  Mail, Phone, Calendar, Droplet, MapPin, Heart, Activity, Clock, Weight, X, User,
  Crown, UserCheck, AlertCircle, BarChart3
} from 'lucide-react';
import './AdminUsers.css';
import './Admin.css';

const ROLE_CONFIG = {
  admin:   { label: 'Admin',   color: 'badge-critical', icon: Crown },
  donor:   { label: 'Donor',   color: 'badge-active',   icon: Heart },
  patient: { label: 'Patient', color: 'badge-standard',  icon: User }
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetail, setUserDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const toast = useToast();

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.is_active = statusFilter;
      const { data } = await adminAPI.getUsers(params);
      setUsers(data.data.users);
      setPagination(data.data.pagination);
    } catch {
      toast.error('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers(1);
  }, [fetchUsers]);

  const openUserDetail = async (userId) => {
    setSelectedUser(userId);
    setDetailLoading(true);
    setUserDetail(null);
    try {
      const { data } = await adminAPI.getUserById(userId);
      setUserDetail(data.data);
    } catch {
      toast.error('Failed to load user details.');
      setSelectedUser(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedUser(null);
    setUserDetail(null);
  };

  const handleToggleActive = async (userId, currentStatus) => {
    setActionLoading(userId);
    try {
      await adminAPI.updateUser(userId, { is_active: !currentStatus });
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully.`);
      fetchUsers(pagination.page);
      if (userDetail?.user?.id === userId) {
        setUserDetail(prev => ({
          ...prev,
          user: { ...prev.user, is_active: !currentStatus ? 1 : 0 }
        }));
      }
    } catch {
      toast.error('Failed to update user status.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers(1);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="page admin-page">
      <div className="container">
        {/* Header */}
        <div className="admin-header">
          <h1><Users size={28} /> User Management</h1>
          <p className="text-muted">View and manage all registered users, donors, and admins</p>
        </div>

        <div className="admin-nav">
          <Link to="/admin" className="admin-nav-link">
            <BarChart3 size={16} /> Dashboard
          </Link>
          <Link to="/admin/users" className="admin-nav-link active">
            <Users size={16} /> User Management
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-3 mt-6">
          <div className="card stat-card">
            <div className="stat-value">{pagination.total}</div>
            <div className="stat-label"><Users size={14} /> Total Users</div>
          </div>
          <div className="card stat-card stat-success">
            <div className="stat-value">{users.filter(u => u.role === 'donor').length}</div>
            <div className="stat-label"><Heart size={14} /> Donors on Page</div>
          </div>
          <div className="card stat-card stat-info">
            <div className="stat-value">{users.filter(u => u.is_active).length}</div>
            <div className="stat-label"><ShieldCheck size={14} /> Active on Page</div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="card mt-6">
          <div className="users-toolbar">
            <form onSubmit={handleSearchSubmit} className="users-search">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                className="form-input"
                placeholder="Search by name, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="submit" className="btn btn-primary btn-sm">Search</button>
            </form>
            <div className="users-filters">
              <div className="filter-group">
                <Filter size={14} />
                <select className="form-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                  <option value="">All Roles</option>
                  <option value="patient">Patient</option>
                  <option value="donor">Donor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="filter-group">
                <Activity size={14} />
                <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">All Status</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="card mt-6">
          <h3 className="card-title mb-4"><Users size={18} /> Registered Users</h3>
          {loading ? (
            <div className="loading-overlay"><div className="spinner spinner-lg"></div><p>Loading users...</p></div>
          ) : users.length > 0 ? (
            <>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>User</th>
                      <th>Contact</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => {
                      const roleCfg = ROLE_CONFIG[u.role] || ROLE_CONFIG.patient;
                      const RoleIcon = roleCfg.icon;
                      return (
                        <tr key={u.id} className={!u.is_active ? 'row-inactive' : ''}>
                          <td data-label="ID" className="font-semibold">#{u.id}</td>
                          <td data-label="User">
                            <div className="user-cell">
                              <div className="user-avatar-sm">{u.full_name?.charAt(0) || '?'}</div>
                              <div>
                                <div className="user-name">{u.full_name}</div>
                                <div className="user-email">{u.email}</div>
                              </div>
                            </div>
                          </td>
                          <td data-label="Contact"><span className="text-muted text-sm">{u.phone}</span></td>
                          <td data-label="Role">
                            <span className={`badge ${roleCfg.color}`}>
                              <RoleIcon size={11} /> {roleCfg.label}
                            </span>
                          </td>
                          <td data-label="Status">
                            {u.is_active ? (
                              <span className="badge badge-active">Active</span>
                            ) : (
                              <span className="badge badge-inactive">Inactive</span>
                            )}
                          </td>
                          <td data-label="Joined" className="text-muted text-sm">{formatDate(u.created_at)}</td>
                          <td data-label="Actions">
                            <div className="action-btns">
                              <button
                                className="btn btn-sm btn-ghost"
                                title="View Details"
                                onClick={() => openUserDetail(u.id)}
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-success'}`}
                                title={u.is_active ? 'Deactivate' : 'Activate'}
                                onClick={() => handleToggleActive(u.id, u.is_active)}
                                disabled={actionLoading === u.id}
                              >
                                {actionLoading === u.id ? (
                                  <div className="spinner"></div>
                                ) : u.is_active ? (
                                  <ShieldOff size={15} />
                                ) : (
                                  <ShieldCheck size={15} />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.total_pages > 1 && (
                <div className="pagination">
                  <button
                    disabled={pagination.page <= 1}
                    onClick={() => fetchUsers(pagination.page - 1)}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: Math.min(pagination.total_pages, 7) }, (_, i) => {
                    let pageNum;
                    if (pagination.total_pages <= 7) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 4) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.total_pages - 3) {
                      pageNum = pagination.total_pages - 6 + i;
                    } else {
                      pageNum = pagination.page - 3 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        className={pagination.page === pageNum ? 'active' : ''}
                        onClick={() => fetchUsers(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    disabled={pagination.page >= pagination.total_pages}
                    onClick={() => fetchUsers(pagination.page + 1)}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <Users size={48} />
              <h3>No users found</h3>
              <p>Try adjusting your search or filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeDetail(); }}>
          <div className="modal user-detail-modal">
            <div className="modal-header">
              <h3 className="modal-title"><Eye size={18} /> User Profile</h3>
              <button className="btn-icon" onClick={closeDetail}><X size={20} /></button>
            </div>
            <div className="modal-body">
              {detailLoading ? (
                <div className="loading-overlay" style={{ padding: '40px 0' }}>
                  <div className="spinner spinner-lg"></div>
                  <p>Loading profile...</p>
                </div>
              ) : userDetail ? (
                <div className="user-detail-content">
                  {/* Profile Header */}
                  <div className="detail-profile-header">
                    <div className="detail-avatar">
                      {userDetail.user.full_name?.charAt(0) || '?'}
                    </div>
                    <div className="detail-info">
                      <h2>{userDetail.user.full_name}</h2>
                      <div className="detail-badges">
                        <span className={`badge ${ROLE_CONFIG[userDetail.user.role]?.color || 'badge-standard'}`}>
                          {userDetail.user.role?.charAt(0).toUpperCase() + userDetail.user.role?.slice(1)}
                        </span>
                        {userDetail.user.is_active ? (
                          <span className="badge badge-active">Active</span>
                        ) : (
                          <span className="badge badge-inactive">Inactive</span>
                        )}
                        {userDetail.user.is_verified ? (
                          <span className="badge badge-active"><UserCheck size={11} /> Verified</span>
                        ) : (
                          <span className="badge badge-inactive"><AlertCircle size={11} /> Unverified</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="detail-section">
                    <h4 className="detail-section-title"><User size={16} /> Account Information</h4>
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="info-label"><Mail size={13} /> Email</span>
                        <span className="info-value">{userDetail.user.email}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label"><Phone size={13} /> Phone</span>
                        <span className="info-value">{userDetail.user.phone}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label"><Calendar size={13} /> Joined</span>
                        <span className="info-value">{formatDateTime(userDetail.user.created_at)}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label"><Clock size={13} /> Last Updated</span>
                        <span className="info-value">{formatDateTime(userDetail.user.updated_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Donor Details */}
                  {userDetail.donor && (
                    <div className="detail-section">
                      <h4 className="detail-section-title"><Droplet size={16} /> Donor Information</h4>
                      <div className="info-grid">
                        <div className="info-item">
                          <span className="info-label">Blood Group</span>
                          <span className="info-value"><span className="badge badge-blood">{userDetail.donor.blood_group}</span></span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Gender</span>
                          <span className="info-value" style={{ textTransform: 'capitalize' }}>{userDetail.donor.gender}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label"><Weight size={13} /> Weight</span>
                          <span className="info-value">{userDetail.donor.weight_kg} kg</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Availability</span>
                          <span className="info-value">
                            {userDetail.donor.is_available ? (
                              <span className="badge badge-active">Available</span>
                            ) : (
                              <span className="badge badge-inactive">Unavailable</span>
                            )}
                          </span>
                        </div>
                        <div className="info-item">
                          <span className="info-label"><Heart size={13} /> Total Donations</span>
                          <span className="info-value">{userDetail.donor.total_donations}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label"><Calendar size={13} /> Last Donation</span>
                          <span className="info-value">{formatDate(userDetail.donor.last_donation_date)}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label"><Clock size={13} /> Days Until Eligible</span>
                          <span className="info-value">
                            {userDetail.donor.days_until_eligible !== null && userDetail.donor.days_until_eligible !== undefined
                              ? `${userDetail.donor.days_until_eligible} days`
                              : 'Eligible now'}
                          </span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">SMS Notifications</span>
                          <span className="info-value">{userDetail.donor.notification_opt_in ? '✅ Enabled' : '❌ Disabled'}</span>
                        </div>
                        <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                          <span className="info-label"><MapPin size={13} /> Address</span>
                          <span className="info-value">
                            {userDetail.donor.address_line}, {userDetail.donor.city}, {userDetail.donor.state} - {userDetail.donor.pincode}
                          </span>
                        </div>
                        {userDetail.donor.medical_conditions && (
                          <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                            <span className="info-label"><AlertCircle size={13} /> Medical Conditions</span>
                            <span className="info-value">{userDetail.donor.medical_conditions}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Blood Requests */}
                  {userDetail.requests?.length > 0 && (
                    <div className="detail-section">
                      <h4 className="detail-section-title"><Activity size={16} /> Blood Requests ({userDetail.requests.length})</h4>
                      <div className="table-container">
                        <table className="table">
                          <thead>
                            <tr>
                              <th>Patient</th>
                              <th>Blood</th>
                              <th>Urgency</th>
                              <th>Hospital</th>
                              <th>Status</th>
                              <th>Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {userDetail.requests.map(r => (
                              <tr key={r.id}>
                                <td data-label="Patient">{r.patient_name}</td>
                                <td data-label="Blood Group"><span className="badge badge-blood">{r.blood_group_needed}</span></td>
                                <td data-label="Urgency"><span className={`badge badge-${r.urgency}`}>{r.urgency}</span></td>
                                <td data-label="Hospital">{r.hospital_name}</td>
                                <td data-label="Status"><span className={`badge badge-${r.status === 'fulfilled' ? 'active' : r.status === 'cancelled' ? 'inactive' : 'standard'}`}>{r.status}</span></td>
                                <td data-label="Date" className="text-muted text-sm">{formatDate(r.created_at)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Donor Responses */}
                  {userDetail.donor_responses?.length > 0 && (
                    <div className="detail-section">
                      <h4 className="detail-section-title"><Heart size={16} /> Donation Responses ({userDetail.donor_responses.length})</h4>
                      <div className="table-container">
                        <table className="table">
                          <thead>
                            <tr>
                              <th>Patient</th>
                              <th>Blood</th>
                              <th>Urgency</th>
                              <th>Response</th>
                              <th>Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {userDetail.donor_responses.map((r, i) => (
                              <tr key={i}>
                                <td data-label="Patient">{r.patient_name}</td>
                                <td data-label="Blood Group"><span className="badge badge-blood">{r.blood_group_needed}</span></td>
                                <td data-label="Urgency"><span className={`badge badge-${r.urgency}`}>{r.urgency}</span></td>
                                <td data-label="Response">
                                  <span className={`badge ${r.response === 'accepted' ? 'badge-active' : r.response === 'declined' ? 'badge-critical' : 'badge-inactive'}`}>
                                    {r.response === 'no_response' ? 'No Response' : r.response}
                                  </span>
                                </td>
                                <td data-label="Date" className="text-muted text-sm">{formatDate(r.created_at)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* No activity */}
                  {(!userDetail.requests || userDetail.requests.length === 0) && (!userDetail.donor_responses || userDetail.donor_responses.length === 0) && !userDetail.donor && (
                    <div className="detail-section">
                      <div className="empty-state" style={{ padding: '24px 0' }}>
                        <Activity size={36} />
                        <h3>No activity</h3>
                        <p>This user hasn't made any requests or donations yet.</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty-state"><p>Failed to load user details.</p></div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
