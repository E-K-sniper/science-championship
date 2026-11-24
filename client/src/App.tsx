import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import StationDetail from './pages/StationDetail';
import AssessmentTake from './pages/AssessmentTake';
import AssessmentResult from './pages/AssessmentResult';
import Games from './pages/Games';
import GamePlay from './pages/GamePlay';
import VirtualLab from './pages/VirtualLab';
import Competitions from './pages/Competitions';
import Achievements from './pages/Achievements';
import Certificates from './pages/Certificates';
import Leaderboard from './pages/Leaderboard';
import AssessmentsList from './pages/AssessmentsList';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TeacherStudents from './pages/teacher/TeacherStudents';
import TeacherQuestions from './pages/teacher/TeacherQuestions';
import TeacherAssessments from './pages/teacher/TeacherAssessments';
import TeacherCompetitions from './pages/teacher/TeacherCompetitions';
import TeacherAnalytics from './pages/teacher/TeacherAnalytics';
import TeacherReports from './pages/teacher/TeacherReports';
import TeacherSettings from './pages/teacher/TeacherSettings';
import TeacherCertificates from './pages/teacher/TeacherCertificates';

function Protected({ children, role }: { children: React.ReactNode; role?: 'student' | 'teacher' }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-turquoise text-2xl">جاري التحميل...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === 'teacher' ? '/teacher' : '/dashboard'} replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Protected role="student"><StudentDashboard /></Protected>} />
            <Route path="/stations/:id" element={<Protected role="student"><StationDetail /></Protected>} />
            <Route path="/assessments" element={<Protected role="student"><AssessmentsList /></Protected>} />
            <Route path="/assessments/:id/take" element={<Protected role="student"><AssessmentTake /></Protected>} />
            <Route path="/attempts/:id/result" element={<Protected role="student"><AssessmentResult /></Protected>} />
            <Route path="/games" element={<Protected role="student"><Games /></Protected>} />
            <Route path="/games/:slug" element={<Protected role="student"><GamePlay /></Protected>} />
            <Route path="/lab" element={<Protected role="student"><VirtualLab /></Protected>} />
            <Route path="/competitions" element={<Protected><Competitions /></Protected>} />
            <Route path="/achievements" element={<Protected role="student"><Achievements /></Protected>} />
            <Route path="/certificates" element={<Protected role="student"><Certificates /></Protected>} />
            <Route path="/leaderboard" element={<Protected><Leaderboard /></Protected>} />
            <Route path="/teacher" element={<Protected role="teacher"><TeacherDashboard /></Protected>} />
            <Route path="/teacher/students" element={<Protected role="teacher"><TeacherStudents /></Protected>} />
            <Route path="/teacher/questions" element={<Protected role="teacher"><TeacherQuestions /></Protected>} />
            <Route path="/teacher/assessments" element={<Protected role="teacher"><TeacherAssessments /></Protected>} />
            <Route path="/teacher/competitions" element={<Protected role="teacher"><TeacherCompetitions /></Protected>} />
            <Route path="/teacher/analytics" element={<Protected role="teacher"><TeacherAnalytics /></Protected>} />
            <Route path="/teacher/reports" element={<Protected role="teacher"><TeacherReports /></Protected>} />
            <Route path="/teacher/certificates" element={<Protected role="teacher"><TeacherCertificates /></Protected>} />
            <Route path="/teacher/settings" element={<Protected role="teacher"><TeacherSettings /></Protected>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
