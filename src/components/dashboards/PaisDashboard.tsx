import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHeadCell } from '../ui/Table';
import { Footer } from '../ui/Footer';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { Clock, User, Calendar, Eye, Info, CheckCircle, AlertCircle } from 'lucide-react';
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
        console.log('🔄 [PAIS DASHBOARD] Carregando dados para:', user?.email);
        
        const [patientsData, sessionsData] = await Promise.all([
          apiService.getPatients(),
          apiService.getSessions()
        ]);

        console.log('📊 [PAIS DASHBOARD] Dados recebidos:', {
          patients: patientsData?.length || 0,
          sessions: sessionsData?.length || 0
        });

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
    // ✅ CORREÇÃO: Comparação case-insensitive para emails
    const userEmail = user?.email?.toLowerCase();
    const isMainParent = patient.parent_email?.toLowerCase() === userEmail;
    const isSecondParent = patient.parent_email2?.toLowerCase() === userEmail;
    const isLinked = isMainParent || isSecondParent;
    
    console.log('👨‍👩‍👧‍👦 [PAIS DASHBOARD] Verificando vínculo:', {
      patient: patient.name,
      userEmail,
      parentEmail: patient.parent_email?.toLowerCase(),
      parentEmail2: patient.parent_email2?.toLowerCase(),
      isMainParent,
      isSecondParent,
      isLinked
    });
    
    return isLinked;
  });

  const myChildrenIds = myChildren.map(c => c.id);
  
  // ✅ CORREÇÃO PRINCIPAL: Filtrar apenas sessões confirmadas (is_confirmed = true)
  const myChildrenSessions = sessions.filter(session => {
    const isMyChild = myChildrenIds.includes(session.patient_id);
    const isConfirmed = session.is_confirmed === true;
    
    console.log('🔍 [PAIS DASHBOARD] Verificando sessão:', {
      sessionId: session.id,
      patientId: session.patient_id,
      isMyChild,
      isConfirmed,
      shouldShow: isMyChild && isConfirmed
    });
    
    return isMyChild && isConfirmed; // ← CORREÇÃO: Só mostrar sessões confirmadas
  });

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const thisMonthSessions = myChildrenSessions.filter(s => {
    const sessionDate = new Date(s.date + 'T00:00:00');
    return sessionDate.getMonth() === currentMonth && sessionDate.getFullYear() === currentYear;
  });

  // ✅ Separar estatísticas por status de confirmação
  const totalHoursThisMonth = thisMonthSessions.reduce((sum, s) => sum + calculateHours(s.start_time, s.end_time), 0);
  const confirmedSessions = thisMonthSessions.filter(s => s.is_confirmed).length;
  
  // ✅ NOVO: Contar sessões pendentes que ainda não apareceram para os pais
  const allMyChildrenSessions = sessions.filter(session => myChildrenIds.includes(session.patient_id));
  const pendingSessions = allMyChildrenSessions.filter(s => !s.is_confirmed).length;

  console.log('📊 [PAIS DASHBOARD] Estatísticas calculadas:', {
    myChildren: myChildren.length,
    totalSessions: allMyChildrenSessions.length,
    confirmedSessions: thisMonthSessions.length,
    pendingSessions,
    totalHoursThisMonth
  });

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
      <Card>
        <CardContent className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-800 mb-1">
                👨‍👩‍👧‍👦 Bem-vindo(a), {user?.name}!
              </h3>
              <p className="text-sm text-blue-700">
                Aqui você pode acompanhar os atendimentos <strong>confirmados</strong> dos seus filhos em tempo real.
              </p>
              <p className="text-xs text-blue-600 mt-1">
                📧 Logado como: {user?.email} | 🔐 Senha padrão: 123456 (altere nas configurações)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ✅ NOVO: Card de informação sobre sessões pendentes */}
      {pendingSessions > 0 && (
        <Card>
          <CardContent className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-orange-800 mb-1">
                  ⏳ Atendimentos Aguardando Confirmação
                </h4>
                <p className="text-sm text-orange-700">
                  Há <strong>{pendingSessions} atendimento(s)</strong> registrado(s) que ainda não foram confirmados pela recepção.
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  ℹ️ Os atendimentos aparecerão aqui assim que forem confirmados pela recepção da clínica.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
              <p className="text-sm text-gray-600">Horas Confirmadas</p>
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
              <p className="text-sm text-gray-600">Atendimentos</p>
              <p className="text-2xl font-bold text-purple-700">{confirmedSessions}</p>
              <p className="text-xs text-green-600">Realizado!</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center space-x-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Aguardando</p>
              <p className="text-2xl font-bold text-purple-700">{pendingSessions}</p>
              <p className="text-xs text-orange-600">Confirmação da recepção</p>
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
                  <p className="text-sm text-gray-600 mb-2">Horas confirmadas no mês: {formatHours(childHours)}</p>
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
              <div className="mt-4 p-3 bg-gray-100 rounded-lg text-xs text-gray-600">
                <p><strong>Seu email:</strong> {user?.email}</p>
                <p><strong>Total de pacientes no sistema:</strong> {patients.length}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span>Atendimentos Confirmados - {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
          </CardTitle>
          <div className="bg-green-50 p-3 rounded-lg mt-3">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-sm text-green-800 font-medium">
                ✅ Visualização apenas de atendimentos confirmados pela recepção
              </p>
            </div>
            <p className="text-xs text-green-700 mt-1">
              Os atendimentos aparecem aqui automaticamente após confirmação da recepção da clínica.
            </p>
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
                        <div className="text-xs text-orange-600 font-medium">🔄 Substituição</div>
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
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✅ Confirmado pela Recepção
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {thisMonthSessions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Nenhum atendimento confirmado ainda
              </h3>
              <p className="text-gray-500 mb-2">
                Os atendimentos aparecerão aqui assim que forem confirmados pela recepção.
              </p>
              {pendingSessions > 0 && (
                <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-sm text-orange-700">
                    💡 <strong>{pendingSessions} atendimento(s)</strong> foram registrados pelos ATs e estão aguardando confirmação da recepção.
                  </p>
                </div>
              )}
              <p className="text-sm mt-2 text-gray-400">
                Em caso de dúvidas, entre em contato com a recepção da clínica.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Footer />
    </div>
  );
};