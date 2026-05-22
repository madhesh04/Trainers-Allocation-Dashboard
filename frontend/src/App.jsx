import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { useTheme } from './hooks/useTheme';
import Dashboard from './pages/Dashboard';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Filler, Tooltip, Legend);
ChartJS.defaults.font.family = "'Inter', sans-serif";
ChartJS.defaults.font.size = 11;
ChartJS.defaults.color = 'var(--text-muted)';

export default function App() {
  const theme = useTheme();
  return <Dashboard isDark={theme.isDark} onToggleTheme={theme.toggle} />;
}
