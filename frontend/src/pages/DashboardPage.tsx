import React, { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import debounce from "lodash.debounce";
import { useAuthStore, canDelete } from "../stores/authStore";
import { useDataStore } from "../stores/dataStore";
import { ToastContainer, toast } from "react-toastify";

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { clients, trash, deleteClient, loadData, saveData } = useDataStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [darkMode, setDarkMode] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
    toast.info("تم تسجيل الخروج");
  };

  const handleDeleteClient = async (clientId: string) => {
    if (confirm("هل أنت متأكد من حذف هذا العميل؟")) {
      await deleteClient(clientId);
      toast.success("تم نقل العميل إلى سلة المهملات");
      await saveData();
    }
  };

  // Debounced search
  const debouncedSearch = useMemo(
    () =>
      debounce((term: string) => {
        setSearchTerm(term);
      }, 300),
    [],
  );

  const filteredClients = useMemo(() => {
    return clients.filter(
      (c) =>
        c.name.includes(searchTerm) ||
        c.plot.includes(searchTerm) ||
        c.phone.includes(searchTerm),
    );
  }, [clients, searchTerm]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? "dark" : ""}`}>
      <div className="dash-bg p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-10 flex-wrap gap-5 pb-6 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-4">
              <img
                src="/images/Eldelta-main-logo.jpg"
                alt="Logo"
                className="w-16 h-16 object-contain rounded-lg"
              />
              <div>
                <h1 className="text-4xl font-black text-dash-primary dark:text-white">
                  بوابة الدلتا للمقاولات
                </h1>
                <p className="text-xl font-bold text-dash-accent mt-1">
                  أهلاً بك يا{" "}
                  <span className="text-white bg-dash-primary px-2 py-1 rounded">
                    {user?.name}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-center flex-wrap">
              <button
                onClick={toggleDarkMode}
                className="bg-gray-100 dark:bg-slate-700 w-14 h-14 rounded-2xl flex items-center justify-center text-2xl hover:bg-gray-200 dark:hover:bg-slate-600 transition"
              >
                <i className={`fas ${darkMode ? "fa-sun" : "fa-moon"}`}></i>
              </button>

              <button
                onClick={() => navigate("/dashboard")}
                className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-6 py-4 rounded-2xl font-bold flex items-center gap-3 hover:bg-blue-100 transition"
              >
                <i className="fas fa-file-archive"></i> نسخة احتياطية
              </button>

              <button
                onClick={() => navigate("/dashboard")}
                className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-6 py-4 rounded-2xl font-bold flex items-center gap-3 hover:bg-green-100 transition"
              >
                <i className="fas fa-file-import"></i> استعادة
              </button>

              <button
                onClick={() => navigate("/dashboard")}
                className="bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 px-6 py-4 rounded-2xl font-bold flex items-center gap-3 hover:bg-red-100 transition"
              >
                <i className="fas fa-trash-can"></i> المهملات
              </button>

              <button
                onClick={() => navigate("/client/new")}
                className="bg-dash-accent text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 hover:bg-yellow-600 transition"
              >
                + إنشاء عميل
              </button>

              <button
                onClick={handleLogout}
                className="bg-gray-400 dark:bg-gray-600 text-white px-6 py-4 rounded-2xl font-bold flex items-center gap-3 hover:bg-gray-500 transition"
              >
                <i className="fas fa-sign-out-alt"></i> خروج
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-8 max-w-2xl mx-auto">
            <i className="fas fa-search absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input
              type="text"
              onChange={(e) => debouncedSearch(e.target.value)}
              className="dash-input pr-12 w-full"
              placeholder="ابحث عن عميل، قطعة، أو رقم هاتف..."
            />
          </div>

          {/* Clients Table */}
          <div className="bg-gray-50 dark:bg-slate-900 rounded-3xl p-6 border border-gray-100 dark:border-slate-700 overflow-x-auto fade-in">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200 dark:border-slate-700">
                  <th className="p-4 font-bold text-gray-700 dark:text-gray-300">
                    اسم العميل
                  </th>
                  <th className="p-4 font-bold text-gray-700 dark:text-gray-300">
                    قطعة الأرض
                  </th>
                  <th className="p-4 font-bold text-gray-700 dark:text-gray-300">
                    المتبقي
                  </th>
                  <th className="p-4 font-bold text-gray-700 dark:text-gray-300">
                    الهاتف
                  </th>
                  <th className="p-4 font-bold text-gray-700 dark:text-gray-300">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => {
                  const owed =
                    client.paid -
                    (client.expenses?.reduce(
                      (acc, e) => acc + (e.amount || 0),
                      0,
                    ) || 0);
                  const totalTips =
                    client.tips?.reduce((acc, t) => acc + (t.amount || 0), 0) ||
                    0;
                  return (
                    <tr
                      key={client.id}
                      className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                    >
                      <td className="p-4 font-bold dark:text-white">
                        {client.name}
                      </td>
                      <td className="p-4 text-gray-600 dark:text-gray-300">
                        {client.plot}
                      </td>
                      <td className="p-4 text-red-600 dark:text-red-400 font-bold">
                        {owed.toLocaleString()} ج.م
                      </td>
                      <td
                        className="p-4 text-gray-600 dark:text-gray-300"
                        dir="ltr"
                      >
                        {client.phone || "---"}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2 justify-start">
                          <button
                            onClick={() => navigate(`/client/${client.id}`)}
                            className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-lg font-bold hover:bg-blue-100 transition text-xs"
                          >
                            <i className="fas fa-eye"></i> عرض
                          </button>
                          {canDelete(user?.role!) && (
                            <button
                              onClick={() => handleDeleteClient(client.id)}
                              className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-3 py-2 rounded-lg font-bold hover:bg-red-100 transition text-xs"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredClients.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <i className="fas fa-inbox text-3xl mb-2"></i>
                <p className="font-bold">لا توجد نتائج مطابقة</p>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border-l-4 border-blue-500">
              <p className="text-gray-500 dark:text-gray-400 font-bold">
                إجمالي العملاء
              </p>
              <p className="text-4xl font-black text-blue-600 dark:text-blue-400 mt-2">
                {clients.length}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border-l-4 border-red-500">
              <p className="text-gray-500 dark:text-gray-400 font-bold">
                في سلة المهملات
              </p>
              <p className="text-4xl font-black text-red-600 dark:text-red-400 mt-2">
                {trash.length}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border-l-4 border-green-500">
              <p className="text-gray-500 dark:text-gray-400 font-bold">دورك</p>
              <p className="text-2xl font-black text-green-600 dark:text-green-400 mt-2">
                {user?.role}
              </p>
            </div>
          </div>
        </div>
      </div>

      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar
        newestOnTop
        rtl
      />
    </div>
  );
};
