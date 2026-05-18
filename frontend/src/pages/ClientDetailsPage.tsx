import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuthStore, canEdit, canViewFinancials } from "../stores/authStore";
import { useDataStore } from "../stores/dataStore";
import { ToastContainer, toast } from "react-toastify";
import type { Client } from "../types";

export const ClientDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const { clientId } = useParams<{ clientId: string }>();
  const { user } = useAuthStore();
  const { clients, updateClient, saveData } = useDataStore();
  const [client, setClient] = useState<Client | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    const found = clients.find((c) => c.id === clientId);
    if (found) {
      setClient(found);
    } else {
      navigate("/dashboard");
    }
  }, [clientId, clients, navigate]);

  if (!client) {
    return <div className="text-center py-20">جاري التحميل...</div>;
  }

  const handleEditSave = async (field: string, value: any) => {
    const updates: Partial<Client> = {};
    if (field === "phone") updates.phone = value;
    else if (field === "paid") updates.paid = parseFloat(value);

    await updateClient(client.id, updates);
    setClient({ ...client, ...updates });
    await saveData();
    setEditingField(null);
    toast.success("تم الحفظ بنجاح");
  };

  const addExpense = () => {
    const reason = prompt("البيان:");
    const amount = prompt("المبلغ:");
    if (reason && amount) {
      const newExpenses = [
        ...(client.expenses || []),
        {
          reason,
          amount: parseFloat(amount),
          date: new Date().toLocaleDateString("ar-EG"),
        },
      ];
      updateClient(client.id, { expenses: newExpenses });
      setClient({ ...client, expenses: newExpenses });
      saveData();
      toast.success("تم إضافة المصروف");
    }
  };

  const totalPaid = client.paid || 0;
  const totalExpenses = (client.expenses || []).reduce(
    (acc, e) => acc + (e.amount || 0),
    0,
  );
  const totalTips = (client.tips || []).reduce(
    (acc, t) => acc + (t.amount || 0),
    0,
  );
  const effectivePaid = totalPaid - totalExpenses;

  return (
    <div className="min-h-screen bg-brand-bg dark:bg-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-brand-dark dark:bg-slate-800 text-white px-5 py-2 rounded-xl font-bold hover:bg-black transition flex items-center gap-2"
          >
            <i className="fas fa-arrow-right"></i> العودة
          </button>
          <h1 className="text-3xl font-black text-brand-dark dark:text-white">
            لوحة تحكم العميل - {client.name}
          </h1>
        </div>

        {/* Sidebar & Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <aside className="lg:col-span-1 bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-lg h-fit border border-gray-100 dark:border-slate-700">
            <div className="bg-brand-dark dark:bg-slate-900 text-center -m-6 mb-6 p-6 rounded-t-3xl border-b-4 border-brand-gold">
              <h2 className="text-xl font-black text-white">{client.name}</h2>
              <p className="text-brand-gold text-sm font-bold mt-1">
                قطعة: {client.plot}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-400 font-bold mb-2">
                  رقم الجوال
                </p>
                <div
                  className="flex items-center gap-2 bg-gray-50 dark:bg-slate-700 p-3 rounded-xl border border-gray-100 dark:border-slate-600 editable-item cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600"
                  onClick={() => {
                    setEditingField("phone");
                    setEditValue(client.phone);
                  }}
                >
                  <i className="fas fa-phone text-brand-gold"></i>
                  <span className="font-bold dark:text-white">
                    {client.phone || "اضغط للإضافة"}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-400 font-bold mb-2">
                  أصل مبلغ التعاقد
                </p>
                {canEdit(user?.role!) ? (
                  <div
                    className="flex items-center gap-2 bg-gray-50 dark:bg-slate-700 p-3 rounded-xl border border-gray-100 dark:border-slate-600 editable-item cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600"
                    onClick={() => {
                      setEditingField("paid");
                      setEditValue(client.paid.toString());
                    }}
                  >
                    <i className="fas fa-money-bill text-brand-gold"></i>
                    <span className="font-bold dark:text-white">
                      {client.paid.toLocaleString()} ج.م
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-700 p-3 rounded-xl border border-gray-100 dark:border-slate-600">
                    <i className="fas fa-money-bill text-brand-gold"></i>
                    <span className="font-bold dark:text-white">
                      {client.paid.toLocaleString()} ج.م
                    </span>
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* Edit Modal */}
          {editingField && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 slide-in-right">
              <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl w-96">
                <h3 className="font-black text-2xl mb-6 dark:text-white text-center">
                  تعديل
                </h3>
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="dash-input"
                  placeholder="القيمة الجديدة"
                />
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => handleEditSave(editingField, editValue)}
                    className="flex-1 bg-green-500 text-white py-3 rounded-xl font-black hover:bg-green-600 transition"
                  >
                    حفظ
                  </button>
                  <button
                    onClick={() => setEditingField(null)}
                    className="flex-1 bg-gray-400 text-white py-3 rounded-xl font-black hover:bg-gray-500 transition"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <main className="lg:col-span-3">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border-b-8 border-green-500">
                <p className="text-gray-400 font-bold text-sm mb-2">
                  المدفوع (صافي)
                </p>
                <h3 className="text-3xl font-black text-green-600 dark:text-green-400">
                  {effectivePaid.toLocaleString()}
                  <span className="text-lg">ج.م</span>
                </h3>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border-b-8 border-red-500">
                <p className="text-gray-400 font-bold text-sm mb-2">
                  المتبقي (دين)
                </p>
                <h3 className="text-3xl font-black text-red-600 dark:text-red-400">
                  {totalTips.toLocaleString()}
                  <span className="text-lg">ج.م</span>
                </h3>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border-b-8 border-blue-500">
                <p className="text-gray-400 font-bold text-sm mb-2">
                  المصروفات
                </p>
                <h3 className="text-3xl font-black text-blue-600 dark:text-blue-400">
                  {totalExpenses.toLocaleString()}
                  <span className="text-lg">ج.م</span>
                </h3>
              </div>
            </div>

            {/* Financial Tables */}
            {canViewFinancials(user?.role!) && (
              <div className="space-y-6">
                {/* Expenses */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-black text-xl text-brand-dark dark:text-white flex items-center gap-2">
                      <i className="fas fa-receipt text-brand-gold"></i>{" "}
                      المصروفات
                    </h3>
                    {canEdit(user?.role!) && (
                      <button
                        onClick={addExpense}
                        className="text-sm bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-200 px-3 py-1 rounded-lg font-bold hover:bg-gray-200 transition"
                      >
                        إضافة +
                      </button>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                      <thead className="bg-gray-50 dark:bg-slate-700">
                        <tr>
                          <th className="p-3 font-bold text-gray-600 dark:text-gray-300">
                            البيان
                          </th>
                          <th className="p-3 font-bold text-gray-600 dark:text-gray-300">
                            التاريخ
                          </th>
                          <th className="p-3 font-bold text-gray-600 dark:text-gray-300">
                            المبلغ
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(client.expenses || []).map((exp, idx) => (
                          <tr
                            key={idx}
                            className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700"
                          >
                            <td className="p-3 font-bold dark:text-white">
                              {exp.reason}
                            </td>
                            <td className="p-3 text-gray-500 dark:text-gray-400 text-xs">
                              {exp.date}
                            </td>
                            <td className="p-3 text-red-600 dark:text-red-400 font-bold">
                              -{exp.amount} ج.م
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(client.expenses || []).length === 0 && (
                      <div className="text-center py-4 text-gray-400">
                        لا توجد مصروفات
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Documents */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 mt-6">
              <h3 className="font-black text-xl text-brand-dark dark:text-white flex items-center gap-2 mb-4">
                <i className="fas fa-file-export text-blue-500"></i> تتبع حركة
                الورق
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-700">
                    <tr>
                      <th className="p-3 font-bold">المستلم</th>
                      <th className="p-3 font-bold">اسم الورقة</th>
                      <th className="p-3 font-bold">الغرض</th>
                      <th className="p-3 font-bold">المكان</th>
                      <th className="p-3 font-bold">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(client.docs || []).map((doc, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700"
                      >
                        <td className="p-3 font-bold dark:text-white">
                          {doc.person}
                        </td>
                        <td className="p-3 dark:text-white">{doc.name}</td>
                        <td className="p-3 text-gray-600 dark:text-gray-300">
                          {doc.purpose}
                        </td>
                        <td className="p-3 dark:text-white">{doc.place}</td>
                        <td className="p-3 text-gray-500 dark:text-gray-400 text-xs">
                          {doc.date}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(client.docs || []).length === 0 && (
                  <div className="text-center py-4 text-gray-400">
                    لا توجد حركات ورق
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>

      <ToastContainer position="bottom-right" autoClose={3000} rtl />
    </div>
  );
};
