import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { ToastContainer, toast } from "react-toastify";

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!username || !password) {
      toast.error("يرجى ملء جميع الحقول");
      return;
    }

    try {
      await login(username, password);
      const user = useAuthStore.getState().user;
      if (user) {
        toast.success(`مرحباً يا ${user.name}!`);
        navigate("/dashboard");
      }
    } catch (err) {
      toast.error("خطأ في تسجيل الدخول");
    }
  };

  return (
    <div className="dash-bg flex justify-center items-center min-h-screen p-5">
      <div className="bg-white dark:bg-slate-800 p-12 rounded-[30px] shadow-2xl w-full max-w-md text-center border border-gray-100 dark:border-slate-700 slide-in">
        <img
          src="/images/Eldelta-main-logo.jpg"
          alt="Logo"
          className="w-24 h-24 mx-auto mb-4 object-contain rounded-lg"
        />
        <h2 className="text-[#2c3e50] dark:text-white font-black text-3xl mb-2">
          بوابة الدلتا
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          للمقاولات العامة
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <i className="fas fa-user absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="dash-input pl-4"
              placeholder="اسم المستخدم"
              disabled={isLoading}
            />
          </div>

          <div className="relative">
            <i className="fas fa-lock absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="dash-input pl-4"
              placeholder="كلمة السر"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className="dash-btn text-lg mt-6 flex items-center justify-center gap-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> جاري الدخول...
              </>
            ) : (
              <>
                <i className="fas fa-sign-in-alt"></i> دخول النظام
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-red-600 dark:text-red-400 font-bold text-sm">
              {error}
            </p>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700 text-xs text-gray-500 dark:text-gray-400">
          <p>🔐 كلمة السر الافتراضية: 123456</p>
        </div>
      </div>

      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar
        newestOnTop
        closeOnClick
        rtl
      />
    </div>
  );
};
