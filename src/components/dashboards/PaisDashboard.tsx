import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableHeadCell } from '../ui/Table';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { Clock, CheckCircle, User, Calendar } from 'lucide-react';
import { formatHours, formatDateBR, calculateHours } from '../../utils/formatters';

export const PaisDashboard: React.FC = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        console.log('🔄 [PAIS DASHBOARD] Carregando dados...');
        console.log('👤 [PAIS DASHBOARD] Usuário logado:', {
          id: user?.id,
          email: user?.email,
          name: user?.name,
          type: user?.type
        });

       const [patientsData, sessionsData] = await Promise.all([
  apiService.getPatients(),
  apiService.getSessions()
]);


        console.log('📋 [PAIS DASHBOARD] Pacientes carregados:', patientsData);
        console.log('📅 [PAIS DASHBOARD] Sessões carregadas:', sessionsData);
        console.log('👨‍⚕️ [PAIS DASHBOARD] ATs incluídos nas sessões');


        setPatients(patientsData);
        setSessions(sessionsData);
        
      } catch (error) {
        console.error('❌ [PAIS DASHBOARD] Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const myChildren = patients.filter(patient => {
    const isMainParent = patient.parent_email === user?.email;
    const isSecondParent = patient.parent_email2 === user?.email;

    console.log(`🔍 [PAIS DASHBOARD] Verificando paciente ${patient.name}:`, {
      parentEmail: patient.parent_email,
      parentEmail2: patient.parent_email2,
      userEmail: user?.email,
      isMainParent,
      isSecondParent
    });

    return isMainParent || isSecondParent;
  });

  console.log('👶 [PAIS DASHBOARD] Meus filhos encontrados:', myChildren);
  const myChildrenIds = myChildren.map(c => c.id);
  console.log('🆔 [PAIS DASHBOARD] IDs dos meus filhos:', myChildrenIds);

  const myChildrenSessions = sessions.filter(session => 
    myChildrenIds.includes(session.patient_id)
  );

  console.log('📋 [PAIS DASHBOARD] Sessões dos meus filhos (aprovadas):', myChildrenSessions);

  const handleConfirmSession = async (sessionId: string) => {
    try {
      await apiService.confirmSession(sessionId);
      const sessionsData = await apiService.getSessions();
      setSessions(sessionsData);
    } catch (error) {
      console.error('Erro ao confirmar sessão:', error);
      alert('Erro ao confirmar atendimento');
    }
  };

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const thisMonthSessions = myChildrenSessions.filter(s => {
    const sessionDate = new Date(s.date + 'T00:00:00'); // CORREÇÃO: Adicionar timezone
    return sessionDate.getMonth() === currentMonth && sessionDate.getFullYear() === currentYear;
  });

  const totalHoursThisMonth = thisMonthSessions.reduce((sum, s) => sum + calculateHours(s.start_time, s.end_time), 0);
  const confirmedSessions = thisMonthSessions.filter(s => s.is_confirmed).length;
  const pendingSessions = thisMonthSessions.filter(s => !s.is_confirmed).length;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center">
          <p className="text-lg text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center space-x-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <User className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Filhos</p>
              <p className="text-2xl font-bold text-purple-700">{myChildren.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center space-x-4">
            <div className="p-3 bg-teal-100 rounded-lg">
              <Clock className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Horas do Mês</p>
              <p className="text-2xl font-bold text-purple-700">{totalHoursThisMonth.toFixed(1)}h</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center space-x-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Confirmados</p>
              <p className="text-2xl font-bold text-purple-700">{confirmedSessions}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center space-x-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Calendar className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pendentes</p>
              <p className="text-2xl font-bold text-purple-700">{pendingSessions}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Meus Filhos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myChildren.map(child => {
              const at = child.at || {};
              const childSessions = thisMonthSessions.filter(s => s.patient_id === child.id);
              const childHours = childSessions.reduce((sum, s) => sum + calculateHours(s.start_time, s.end_time), 0);

              return (
                <div key={child.id} className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border-l-4 border-purple-500">
                  <h3 className="font-semibold text-purple-800 text-lg">{child.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">Setor: {child.sector?.toUpperCase() || 'N/A'}</p>
                  <p className="text-sm text-gray-600 mb-2">AT: {at?.name || 'N/A'}</p>
                  <p className="text-sm text-gray-600 mb-2">Horas do mês: {formatHours(childHours)}</p>
                  <p className="text-sm text-gray-600">Carga semanal: {formatHours(child.weekly_hours)}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Atendimentos do Mês - {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeadCell>Paciente</TableHeadCell>
                <TableHeadCell>AT</TableHeadCell>
                <TableHeadCell>Data</TableHeadCell>
                <TableHeadCell>Início</TableHeadCell>
                <TableHeadCell>Fim</TableHeadCell>
                <TableHeadCell>Horas</TableHeadCell>
                <TableHeadCell>Observações</TableHeadCell>
                <TableHeadCell>Status</TableHeadCell>
                <TableHeadCell>Ação</TableHeadCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {thisMonthSessions.map(session => {
                const patient = patients.find(p => p.id === session.patient_id) || session.patient;
                const at = session.at || {};

                return (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">{patient?.name || 'N/A'}</TableCell>
                    <TableCell>
                      {at?.name || 'N/A'}
                      <div className="text-xs text-gray-500">{at?.sector?.toUpperCase() || ''}</div>
                    </TableCell>
                    <TableCell>{formatDateBR(session.date)}</TableCell>
                    <TableCell>{session.start_time}</TableCell>
                    <TableCell>{session.end_time}</TableCell>
                    <TableCell>{formatHours(calculateHours(session.start_time, session.end_time))}</TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={session.observations}>
                        {session.observations || 'Sem observações'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        session.is_confirmed 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {session.is_confirmed ? 'Confirmado' : 'Pendente'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {!session.is_confirmed && (
                        <Button
                          onClick={() => handleConfirmSession(session.id)}
                          variant="success"
                          size="sm"
                          className="flex items-center space-x-1"
                        >
                          <CheckCircle size={16} />
                          <span>Confirmar</span>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {thisMonthSessions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Nenhum atendimento encontrado para este mês.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};