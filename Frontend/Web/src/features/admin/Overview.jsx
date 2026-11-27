export default function Overview({ stats }) {
  return (
    <>
      <div className="page-header">
        <div className="header-titles">
          <h1>Platform Overview</h1>
          <p>Real-time clinical operations statistics.</p>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card"><div className="kpi-body"><p className="kpi-label">Total Platform Users</p><h3>{stats.totalUsers}</h3></div></div>
        <div className="kpi-card"><div className="kpi-body"><p className="kpi-label">Hospitals</p><h3>{stats.totalHospitals}</h3></div></div>
        <div className="kpi-card"><div className="kpi-body"><p className="kpi-label">Clinics</p><h3>{stats.totalClinics}</h3></div></div>
        <div className="kpi-card"><div className="kpi-body"><p className="kpi-label">Labs</p><h3>{stats.totalLabs}</h3></div></div>
        <div className="kpi-card"><div className="kpi-body"><p className="kpi-label">Physio Centers</p><h3>{stats.totalPhysio}</h3></div></div>
      </div>
    </>
  );
}