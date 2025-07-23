import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHeadCell } from '../ui/Table';
import { Footer } from '../ui/Footer';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { Clock, User, Calendar, Eye, Info } from 'lucide-react';
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
        const [patientsData, sessionsData] = await Promise.all([
          apiService.getPatients(),
          apiService.getSessions()
        ]);

        setPatients(patientsData);
        setSessions(sessionsData);
        
      } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const myChildren = patients.filter(patient => {
    const isMainParent = patient.parent_email === user?.email;
    const isSecondParent = patient.parent_email2 === user?.email;
    return isMainParent || isSecondParent;
  });

  const myChildrenIds = myChildren.map(c => c.id);
  const myChildrenSessions = sessions.filter(session => 
    myChildrenIds.includes(session.patient_id)
  );

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const thisMonthSessions = myChildrenSessions.filter(s => {
    const sessionDate = new Date(s.date + 'T00:00:00');
    return sessionDate.getMonth() === currentMonth && sessionDate.getFullYear() === currentYear;
  });

  const totalHoursThisMonth = thisMonthSessions.reduce((sum, s) => sum + calculateHours(s.start_time, s.end_time), 0);
  const confirmedSessions = thisMonthSessions.filter(s => s.is_confirmed).length;
  const pendingSessions = thisMonthSessions.filter(s => !s.is_confirmed).length;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Aviso sobre visualização */}
      <Card>
        <CardContent className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-800 mb-1">
                ℹ️ Painel de Visualização
              </h3>
              <p className="text-sm text-blue-700">
                Agora você pode visualizar os atendimentos dos seus filhos!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Estatísticas */}
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
              <Eye className="w-6 h-6 text-green-600" />
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
              <p className="text-sm text-gray-600">Aguardando</p>
              <p className="text-2xl font-bold text-purple-700">{pendingSessions}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Informações dos Filhos */}
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

          {myChildren.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <User className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p>Nenhum filho encontrado vinculado ao seu email.</p>
              <p className="text-sm mt-2">Entre em contato com a recepção se precisar de ajuda.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Atendimentos - APENAS VISUALIZAÇÃO */}
      <Card>
        <CardHeader>
          <CardTitle>
            Atendimentos do Mês - {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </CardTitle>
          <div className="bg-blue-50 p-3 rounded-lg mt-3">
            <div className="flex items-center space-x-2">
              <Eye className="w-5 h-5 text-blue-600" />
              <p className="text-sm text-blue-800 font-medium">
{/*                 📋 Visualização dos atendimentos realizados */}
              </p>
{/*             </div>
            <p className="text-xs text-blue-700 mt-1">
              A confirmação dos atendimentos é feita automaticamente pela recepção da clínica.
            </p> */}
          </div>
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
                      {session.is_substitution && (
                        <div className="text-xs text-orange-600 font-medium">Substituição</div>
                      )}
                    </TableCell>
                    <TableCell>{formatDateBR(session.date)}</TableCell>
                    <TableCell>{session.start_time}</TableCell>
                    <TableCell>{session.end_time}</TableCell>
                    <TableCell className="font-medium">{formatHours(calculateHours(session.start_time, session.end_time))}</TableCell>
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
                        {session.is_confirmed ? '✅ Confirmado' : '⏳ Aguardando Confirmação'}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {thisMonthSessions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Eye className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p>Nenhum atendimento encontrado para este mês.</p>
              <p className="text-sm mt-2">Os atendimentos aparecerão aqui assim que forem registrados pelos ATs.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Footer />
    </div>
  );
};
