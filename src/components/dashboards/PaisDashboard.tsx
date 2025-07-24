import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHeadCell } from '../ui/Table';
import { Footer } from '../ui/Footer';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { Clock, User, Calendar, Eye, Info, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { formatHours, formatDateBR, calculateHours } from '../../utils/formatters';

export const PaisDashboard: React.FC = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Função para carregar dados
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 [PAIS] Carregando dados para usuário:', user?.email);
      
      const [patientsData, sessionsData] = await Promise.all([
        apiService.getPatients(),
        apiService.getSessions()
      ]);

      console.log('📊 [PAIS] Dados carregados:');
      console.log('- Total pacientes:', patientsData.length);
      console.log('- Total sessões:', sessionsData.length);

      setPatients(patientsData);
      setSessions(sessionsData);
      
    } catch (error) {
      console.error('❌ [PAIS] Erro ao carregar dados:', error);
      setError('Erro ao carregar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.email) {
      loadData();
    }
  }, [user]);

  // ✅ FILTRAR MEUS FILHOS COM LÓGICA CORRIGIDA
  const myChildren = patients.filter(patient => {
    const isMainParent = patient.parent_email === user?.email;
    const isSecondParent = patient.parent_email2 === user?.email;
    const isLinked = isMainParent || isSecondParent;
    
    if (isLinked) {
      console.log('👶 [PAIS] Filho encontrado:', {
        nome: patient.name,
        parentEmail: patient.parent_email,
        parentEmail2: patient.parent_email2,
        userEmail: user?.email,
        isMainParent,
        isSecondParent
      });
    }
    
    return isLinked;
  });

  console.log('👨‍👩‍👧‍👦 [PAIS] Meus filhos:', myChildren.length);

  const myChildrenIds = myChildren.map(c => c.id);

  // ✅ FILTRAR APENAS SESSÕES CONFIRMADAS DOS MEUS FILHOS
  const myChildrenSessions = sessions.filter(session => {
    const isMyChild = myChildrenIds.includes(session.patient_id);
    const isConfirmed = session.is_confirmed === true;
    
    if (isMyChild) {
      console.log('📅 [PAIS] Sessão encontrada:', {
        id: session.id.substring(0, 8),
        patient_id: session.patient_id,
        is_confirmed: session.is_confirmed,
        date: session.date,
        incluirNaLista: isConfirmed
      });
    }
    
    return isMyChild && isConfirmed;
  });

  console.log('📋 [PAIS] Sessões confirmadas dos meus filhos:', myChildrenSessions.length);

  // Calcular estatísticas do mês atual
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const thisMonthSessions = myChildrenSessions.filter(s => {
    const sessionDate = new Date(s.date + 'T00:00:00');
    return sessionDate.getMonth() === currentMonth && sessionDate.getFullYear() === currentYear;
  });

  const totalHoursThisMonth = thisMonthSessions.reduce((sum, s) => sum + calculateHours(s.start_time, s.end_time), 0);
  const confirmedSessions = thisMonthSessions.filter(s => s.is_confirmed).length;
  const pendingSessions = sessions.filter(s => 
    myChildrenIds.includes(s.patient_id) && !s.is_confirmed
  ).length;

  console.log('📊 [PAIS] Estatísticas do mês:', {
    totalSessions: thisMonthSessions.length,
    totalHours: totalHoursThisMonth,
    confirmedSessions,
    pendingSessions
  });

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Carregando seus dados...</p>
          <p className="text-sm text-gray-500 mt-2">Buscando atendimentos confirmados...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Card>
          <CardContent className="text-center py-8">
            <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-bold text-red-600 mb-2">Erro ao Carregar Dados</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={loadData}
              className="flex items-center space-x-2 mx-auto px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <RefreshCw size={16} />
              <span>Tentar Novamente</span>
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* ✅ BANNER INFORMATIVO MELHORADO */}
      <Card>
        <CardContent className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-800 mb-1">
                👨‍👩‍👧‍👦 Painel de Visualização dos Pais
              </h3>
              <p className="text-sm text-blue-700 mb-2">
                Visualize os atendimentos <strong>confirmados pela recepção</strong> dos seus filhos.
              </p>
              <div className="bg-blue-100 p-2 rounded text-xs text-blue-800">
                <p><strong>ℹ️ Como funciona:</strong></p>
                <p>• Os ATs registram os atendimentos no sistema</p>
                <p>• A recepção confirma os atendimentos realizados</p>
                <p>• <strong>Apenas atendimentos confirmados aparecem aqui</strong></p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center space-x-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <User className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Meus Filhos</p>
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
              <p className="text-2xl font-bold text-purple-700">{formatHours(totalHoursThisMonth)}</p>
              <p className="text-xs text-gray-500">Confirmadas</p>
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
              <p className="text-xs text-gray-500">Este mês</p>
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
              <p className="text-xs text-gray-500">Confirmação</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ✅ INFORMAÇÕES DOS FILHOS MELHORADA */}
      <Card>
        <CardHeader>
          <CardTitle>Informações dos Meus Filhos</CardTitle>
        </CardHeader>
        <CardContent>
          {myChildren.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myChildren.map(child => {
                const at = child.at || {};
                const childSessions = thisMonthSessions.filter(s => s.patient_id === child.id);
                const childHours = childSessions.reduce((sum, s) => sum + calculateHours(s.start_time, s.end_time), 0);

                return (
                  <div key={child.id} className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border-l-4 border-purple-500">
                    <h3 className="font-semibold text-purple-800 text-lg">{child.name}</h3>
                    <div className="mt-2 space-y-1 text-sm">
                      <p className="text-gray-600">
                        <strong>Setor:</strong> {child.sector?.toUpperCase() || 'N/A'}
                      </p>
                      <p className="text-gray-600">
                        <strong>AT Responsável:</strong> {at?.name || 'Não atribuído'}
                      </p>
                      <p className="text-gray-600">
                        <strong>Horas confirmadas este mês:</strong> {formatHours(childHours)}
                      </p>
                      <p className="text-gray-600">
                        <strong>Carga semanal:</strong> {formatHours(child.weekly_hours || 0)}
                      </p>
                      <p className="text-gray-600">
                        <strong>Atendimentos confirmados:</strong> {childSessions.length}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <User className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Nenhum filho encontrado
              </h3>
              <p className="text-gray-500 mb-2">
                Não encontramos pacientes vinculados ao seu email: <strong>{user?.email}</strong>
              </p>
              <div className="bg-yellow-50 p-4 rounded-lg mt-4 text-left">
                <h4 className="font-semibold text-yellow-800 mb-2">💡 Possíveis soluções:</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Verifique se seu email está correto no cadastro do paciente</li>
                  <li>• Entre em contato com a recepção para verificar o vínculo</li>
                  <li>• Confirme se você está usando o email correto para login</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ✅ HISTÓRICO DE ATENDIMENTOS MELHORADO */}
      <Card>
        <CardHeader>
          <CardTitle>
            Atendimentos Confirmados - {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </CardTitle>
          <div className="bg-green-50 p-3 rounded-lg mt-3">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-sm text-green-800 font-medium">
                ✅ Visualização de atendimentos confirmados pela recepção
              </p>
            </div>
            <p className="text-xs text-green-700 mt-1">
              Apenas atendimentos confirmados pela recepção da clínica são exibidos aqui.
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
                      <div>
                        {at?.name || 'N/A'}
                        <div className="text-xs text-gray-500">{at?.sector?.toUpperCase() || ''}</div>
                        {session.is_substitution && (
                          <div className="text-xs text-orange-600 font-medium">
                            🔄 Substituição
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatDateBR(session.date)}</TableCell>
                    <TableCell className="font-mono text-sm">{session.start_time}</TableCell>
                    <TableCell className="font-mono text-sm">{session.end_time}</TableCell>
                    <TableCell className="font-medium text-purple-600">
                      {formatHours(calculateHours(session.start_time, session.end_time))}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={session.observations}>
                        {session.observations || 'Sem observações'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✅ Confirmado
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {thisMonthSessions.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Eye className="w-20 h-20 mx-auto text-gray-300 mb-6" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Nenhum atendimento confirmado este mês
              </h3>
              {pendingSessions > 0 ? (
                <div className="bg-orange-50 p-4 rounded-lg mt-4">
                  <p className="text-orange-800 font-medium">
                    📅 Há {pendingSessions} atendimento(s) aguardando confirmação da recepção
                  </p>
                  <p className="text-xs text-orange-700 mt-1">
                    Os atendimentos aparecerão aqui após serem confirmados pela recepção.
                  </p>
                </div>
              ) : (
                <p className="text-gray-500">
                  Os atendimentos aparecerão aqui assim que forem realizados e confirmados.
                </p>
              )}
            </div>
          )}

          {/* ✅ INFORMAÇÕES ADICIONAIS */}
          {thisMonthSessions.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">📊 Resumo do Mês</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-blue-600 font-medium">Total de Atendimentos:</p>
                  <p className="text-blue-800 font-bold">{thisMonthSessions.length}</p>
                </div>
                <div>
                  <p className="text-blue-600 font-medium">Total de Horas:</p>
                  <p className="text-blue-800 font-bold">{formatHours(totalHoursThisMonth)}</p>
                </div>
                <div>
                  <p className="text-blue-600 font-medium">Média por Atendimento:</p>
                  <p className="text-blue-800 font-bold">
                    {formatHours(totalHoursThisMonth / thisMonthSessions.length)}
                  </p>
                </div>
                <div>
                  <p className="text-blue-600 font-medium">Status:</p>
                  <p className="text-green-800 font-bold">Todos Confirmados</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Footer />
    </div>
  );
};