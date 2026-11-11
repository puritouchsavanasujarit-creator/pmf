import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Edit3, 
  Check, 
  Phone, 
  MessageCircle, 
  Shield, 
  RotateCcw,
  AlertTriangle,
  Award
} from 'lucide-react';
import { AdminUser, CustomerDeal } from '../types';
import { DEFAULT_ADMINS } from '../services/lineService';

interface AdminManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  admins: AdminUser[];
  onAddAdmin: (newAdmin: AdminUser) => void;
  onUpdateAdmin: (updatedAdmin: AdminUser) => void;
  onDeleteAdmin: (adminId: string, reassignToName?: string) => void;
  onResetAdmins: () => void;
  deals: CustomerDeal[];
}

export const AdminManagementModal: React.FC<AdminManagementModalProps> = ({
  isOpen,
  onClose,
  admins,
  onAddAdmin,
  onUpdateAdmin,
  onDeleteAdmin,
  onResetAdmins,
  deals,
}) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState('เจ้าหน้าที่ฝ่ายขาย (Sales Rep)');
  const [phone, setPhone] = useState('');
  const [lineId, setLineId] = useState('');
  const [color, setColor] = useState('emerald');

  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLineId, setEditLineId] = useState('');

  // Deletion prompt state
  const [deletingAdmin, setDeletingAdmin] = useState<AdminUser | null>(null);
  const [reassignTarget, setReassignTarget] = useState<string>('');

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (admins.some((a) => a.name.trim().toLowerCase() === name.trim().toLowerCase())) {
      alert(`มีแอดมินชื่อ "${name.trim()}" ในระบบแล้ว`);
      return;
    }

    const created: AdminUser = {
      id: 'admin-' + Date.now(),
      name: name.trim(),
      role: role.trim() || 'เจ้าหน้าที่ฝ่ายขาย',
      phone: phone.trim() || undefined,
      lineId: lineId.trim() || undefined,
      color,
    };

    onAddAdmin(created);
    setName('');
    setPhone('');
    setLineId('');
  };

  const handleStartEdit = (admin: AdminUser) => {
    setEditingAdminId(admin.id);
    setEditName(admin.name);
    setEditRole(admin.role);
    setEditPhone(admin.phone || '');
    setEditLineId(admin.lineId || '');
  };

  const handleSaveEdit = (adminId: string) => {
    if (!editName.trim()) return;
    const existing = admins.find((a) => a.id === adminId);
    if (!existing) return;

    onUpdateAdmin({
      ...existing,
      name: editName.trim(),
      role: editRole.trim(),
      phone: editPhone.trim() || undefined,
      lineId: editLineId.trim() || undefined,
    });
    setEditingAdminId(null);
  };

  const handleConfirmDelete = () => {
    if (!deletingAdmin) return;
    onDeleteAdmin(deletingAdmin.id, reassignTarget || undefined);
    setDeletingAdmin(null);
    setReassignTarget('');
  };

  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/40' },
    sky: { bg: 'bg-sky-500/20', text: 'text-sky-400', border: 'border-sky-500/40' },
    purple: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/40' },
    amber: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/40' },
    rose: { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/40' },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                จัดการรายชื่อแอดมิน (Admin Management)
                <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {admins.length} คน
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                เพิ่ม ลบ หรือแก้ไขแอดมินผู้รับผิดชอบการดูแลลูกค้าและการปิดการขายใน LINE OA
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Form: Add New Admin */}
        <form onSubmit={handleCreate} className="mt-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3 text-xs">
          <span className="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
            <UserPlus className="w-4 h-4 text-emerald-400" />
            <span>เพิ่มแอดมินใหม่ (Add Sales Rep)</span>
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">ชื่อแอดมิน / ชื่อเล่น *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น แอดมินมิว, แอดมินบิว"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">บทบาท / หน้าที่</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="เช่น เจ้าหน้าที่ฝ่ายขาย, ผู้ดูแลลูกค้า VIP"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">เบอร์โทรศัพท์</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="เช่น 081-xxx-xxxx"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">LINE ID</label>
              <input
                type="text"
                value={lineId}
                onChange={(e) => setLineId(e.target.value)}
                placeholder="เช่น mew_sales"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">สีประจำตัวแอดมิน</label>
              <select
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="emerald">🟢 เขียว (Emerald)</option>
                <option value="sky">🔵 ฟ้า (Sky)</option>
                <option value="purple">🟣 ม่วง (Purple)</option>
                <option value="amber">🟠 ส้มทอง (Amber)</option>
                <option value="rose">🔴 แดงชมพู (Rose)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-sm flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>บันทึกเพิ่มแอดมิน</span>
            </button>
          </div>
        </form>

        {/* Admin List */}
        <div className="mt-5 space-y-3">
          <span className="text-xs font-bold text-slate-300 block">
            รายชื่อแอดมินทั้งหมดในระบบ ({admins.length} คน):
          </span>

          {admins.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              ยังไม่มีรายชื่อแอดมิน กรุณากดเพิ่มแอดมินใหม่ด้านบน
            </div>
          ) : (
            <div className="space-y-2">
              {admins.map((admin) => {
                const isEditing = editingAdminId === admin.id;
                const assignedDeals = deals.filter((d) => d.adminName === admin.name);
                const wonDeals = assignedDeals.filter((d) => d.status === 'WON');
                const totalRevenue = wonDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
                const theme = colorClasses[admin.color || 'emerald'] || colorClasses.emerald;

                return (
                  <div
                    key={admin.id}
                    className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                  >
                    {isEditing ? (
                      /* Inline Edit Form */
                      <div className="flex-1 w-full space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="ชื่อแอดมิน"
                            className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-white text-xs"
                          />
                          <input
                            type="text"
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value)}
                            placeholder="ตำแหน่ง/หน้าที่"
                            className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-white text-xs"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            placeholder="เบอร์โทร"
                            className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-white text-xs"
                          />
                          <input
                            type="text"
                            value={editLineId}
                            onChange={(e) => setEditLineId(e.target.value)}
                            placeholder="LINE ID"
                            className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-white text-xs"
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingAdminId(null)}
                            className="px-2.5 py-1 text-slate-400 hover:text-white"
                          >
                            ยกเลิก
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(admin.id)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            <span>บันทึก</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Display Row */
                      <>
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold ${theme.bg} ${theme.text} border ${theme.border} shrink-0`}>
                            {admin.name.replace('แอดมิน', '').trim()[0] || admin.name[0]}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-white text-sm">{admin.name}</h4>
                              <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                                {admin.role}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                              {admin.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-slate-500" /> {admin.phone}
                                </span>
                              )}
                              {admin.lineId && (
                                <span className="flex items-center gap-1">
                                  <MessageCircle className="w-3 h-3 text-emerald-500" /> LINE: {admin.lineId}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Performance & Action Buttons */}
                        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                          <div className="text-left sm:text-right">
                            <span className="text-[11px] text-slate-400 block">
                              ดูแล {assignedDeals.length} เคส (ปิดได้ {wonDeals.length})
                            </span>
                            <span className="font-bold text-emerald-400 text-xs">
                              ฿{totalRevenue.toLocaleString('th-TH')}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* Edit Button */}
                            <button
                              onClick={() => handleStartEdit(admin)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-slate-800 transition-colors"
                              title="แก้ไขข้อมูลแอดมิน"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            {/* Delete Button (ปุ่มลบแอดมิน) */}
                            <button
                              onClick={() => {
                                setDeletingAdmin(admin);
                                const otherAdmins = admins.filter((a) => a.id !== admin.id);
                                setReassignTarget(otherAdmins[0]?.name || 'ยังไม่มีแอดมินรับเรื่อง');
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="ลบแอดมินคนนี้"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal Overlay */}
        {deletingAdmin && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-slate-200">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">
                    ยืนยันการลบ "{deletingAdmin.name}"?
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    การลบแอดมินจะนำชื่อออกจากระบบ หากมีลูกค้าที่อยู่ในการดูแลของแอดมินคนนี้ คุณสามารถโอนเคสให้แอดมินคนอื่นได้
                  </p>
                </div>
              </div>

              {/* Reassignment Dropdown */}
              <div className="mt-4 p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                <label className="block text-slate-300 font-medium mb-1.5">
                  โอนลูกค้าที่ค้างอยู่ให้แอดมินคนอื่น:
                </label>
                <select
                  value={reassignTarget}
                  onChange={(e) => setReassignTarget(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="ยังไม่มีแอดมินรับเรื่อง">-- ยังไม่มีแอดมินรับเรื่อง --</option>
                  {admins
                    .filter((a) => a.id !== deletingAdmin.id)
                    .map((a) => (
                      <option key={a.id} value={a.name}>
                        {a.name} ({a.role})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setDeletingAdmin(null)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 rounded-lg"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm"
                >
                  ยืนยันลบแอดมิน
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 mt-6 border-t border-slate-800">
          <button
            type="button"
            onClick={() => {
              if (confirm('คุณต้องการรีเซ็ตรายชื่อแอดมินกลับเป็นค่าเริ่มต้นหรือไม่?')) {
                onResetAdmins();
              }
            }}
            className="text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>คืนค่าแอดมินเริ่มต้น</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg"
          >
            ปิด
          </button>
        </div>

      </div>
    </div>
  );
};
