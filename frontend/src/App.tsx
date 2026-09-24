import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';

// Импорт готовых страниц
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Operations from './pages/Operations';
import Settings from './pages/Settings'; // Временная заглушка для последней страни

// Защитник маршрутов (перекидывает на логин, если нет токена)
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const token = useStore((state) => state.token);
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  const theme = useStore((state) => state.theme);
  const token = useStore((state) => state.token);

  // Динамическое переключение светлой/темной темы
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-900 dark:text-slate-100">
        <Routes>
          {/* Если есть токен на странице логина - кидаем в дашборд */}
          <Route path="/login" element={token ? <Navigate to="/dashboard" replace /> : <Login />} />
          
          {/* Защищенные маршруты */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><Operations /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          
          {/* Ловим все несуществующие ссылки */}
          <Route path="*" element={<Navigate to={token ? "/dashboard" : "/login"} replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;