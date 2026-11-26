import { useCallback, useEffect, useState } from 'react';
import { Ban, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { getUsersPage, toggleUserStatus } from '../../../services/adminService';
export default function Users() {
  const [users,setUsers]=useState([]); const [pagination,setPagination]=useState(null); const [loading,setLoading]=useState(true); const [error,setError]=useState('');
  const [page,setPage]=useState(1); const [status,setStatus]=useState(''); const [role,setRole]=useState(''); const [search,setSearch]=useState(''); const [searchTerm,setSearchTerm]=useState('');
  const load=useCallback(async()=>{setLoading(true);try{const result=await getUsersPage({page,limit:10,status,role,search:searchTerm});setUsers(result.users);setPagination(result.pagination);setError('');}catch(e){setError(e.message);}finally{setLoading(false);}},[page,status,role,searchTerm]);
  useEffect(()=>{
    let active=true;
    getUsersPage({page,limit:10,status,role,search:searchTerm})
      .then((result)=>{if(active){setUsers(result.users);setPagination(result.pagination);setError('');}})
      .catch((e)=>{if(active)setError(e.message);})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[page,status,role,searchTerm]);
  const changeStatus=async(user)=>{const next=user.status==='Suspended'?'Active':'Suspended';if(!window.confirm(`Change ${user.name} status to ${next}?`))return;try{await toggleUserStatus(user.userId,next);await load();}catch(e){setError(e.message);}};
  const applySearch=(e)=>{e.preventDefault();setPage(1);setSearchTerm(search.trim());};
  return <><div className="page-header"><div className="header-titles"><h1>User management</h1><p>Search, filter and manage platform accounts.</p></div></div>
    <div className="chart-card" style={{padding:16,marginBottom:16}}><form onSubmit={applySearch} style={{display:'flex',gap:10,flexWrap:'wrap'}}><div style={{display:'flex',flex:1,minWidth:220,gap:8}}><input aria-label="Search users" placeholder="Name, email, username or phone" value={search} onChange={e=>setSearch(e.target.value)} style={{width:'100%',padding:10,border:'1px solid #dce5e7',borderRadius:8}}/><button className="action-btn" type="submit"><Search size={15}/> Search</button></div><select value={role} onChange={e=>{setPage(1);setRole(e.target.value);}}><option value="">All roles</option><option value="patient">Patient</option><option value="provider">Provider</option><option value="organization">Organization</option><option value="admin">Admin</option></select><select value={status} onChange={e=>{setPage(1);setStatus(e.target.value);}}><option value="">All statuses</option><option value="Active">Active</option><option value="Inactive">Inactive</option><option value="Suspended">Suspended</option></select></form></div>
    {error&&<p className="alert error">{error}</p>}<div className="chart-card"><table className="data-table"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Action</th></tr></thead><tbody>{loading?<tr><td colSpan="6">Loading…</td></tr>:users.length?users.map(user=><tr key={user.userId}><td className="td-medium">{user.name}</td><td>{user.email}</td><td>{user.phone}</td><td>{user.role}</td><td><span className={`status-badge ${user.status==='Active'?'status-active':'status-suspended'}`}>{user.status}</span></td><td><button disabled={user.role==='admin'} onClick={()=>changeStatus(user)} className={`action-btn ${user.status==='Active'?'btn-suspend':'btn-activate'}`}><Ban size={14}/>{user.status==='Active'?'Suspend':'Activate'}</button></td></tr>):<tr><td colSpan="6" className="empty-state">No users match these filters.</td></tr>}</tbody></table></div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 2px'}}><small>{pagination?`${pagination.total} users · Page ${pagination.page} of ${Math.max(pagination.totalPages,1)}`:' '}</small><div style={{display:'flex',gap:8}}><button className="action-btn" disabled={loading||page<=1} onClick={()=>setPage(v=>Math.max(1,v-1))}><ChevronLeft size={15}/> Previous</button><button className="action-btn" disabled={loading||!pagination||!pagination.hasNextPage} onClick={()=>setPage(v=>v+1)}>Next <ChevronRight size={15}/></button></div></div>
  </>;
}
