// ✅ CORREÇÃO COMPLETA DO AdminDashboard.tsx
// Corrige problemas de confirmação para administradores setoriais

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Footer } from '../ui/Footer';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHeadCell } from '../ui/Table';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { CheckCircle, AlertTriangle, X, RefreshCw, AlertCircle, Clock, Users, Calendar } from 'lucide-react';
import { formatHours, calculateHours, formatDateBR } from '../../utils/formatters';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [ats, setAts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Estados para confirmação melhorados
  const [confirmingSession, setConfirmingSession] = useState<string | null>(null);
  const [rejectingSession, setRejectingSession] = useState<string | null>(null);
  const [operationStatus, setOperationStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);

  // ✅ CORREÇÃO 1: Verificação de acesso melhorada
  const isAdminSetorial = user?.type?.startsWith('adm-') && user?.type !== 'adm-geral';
  const isAdminGeral = user?.type === 'adm-geral';
  const hasAdminAccess = isAdminSetorial || isAdminGeral;

  // ✅ CORREÇÃO 2: Verificação de permissão para confirmação mais robusta
  const canConfirmSessions = () => {
    if (!user) return false;
    
    const allowedTypes = [
      'adm-geral',
      'adm-aba', 
      'adm-denver',
      'adm-grupo',
      'adm-escolar',
      'coordenacao-aba',
      'coordenacao-denver', 
      'coordenacao-grupo',
      'coordenacao-escolar',
      'financeiro-ats',
      'financeiro-pct'
    ];
    
    const canConfirm = allowedTypes.includes(user.type);
    
    console.log('🔍 [ADMIN] Verificação de permissão:', {
      userType: user.type,
      allowedTypes,
      canConfirm,
      isAdminSetorial,
      isAdminGeral,
      userSector: user.sector
    });
    
    return canConfirm;
  };

  if (!hasAdminAccess) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Card>
          <CardContent className="text-center py-8">
            <div className="mb-4">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-red-600 mb-4">Acesso Negado</h2>
            <p className="text-gray-600 mb-2">Esta página é restrita aos administradores.</p>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Usuário atual:</strong> {user?.name || 'Não identificado'}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Email:</strong> {user?.email || 'Não identificado'}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Tipo:</strong> <code className="bg-red-100 px-2 py-1 rounded">{user?.type || 'Não definido'}</code>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const showOperationStatus = (type: 'success' | 'error', message: string, duration = 4000) => {
    setOperationStatus({ type, message });
    setTimeout(() => setOperationStatus(null), duration);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        console.log('🔄 [ADMIN] Carregando dados para usuário:', {
          name: user?.name,
          type: user?.type,
          sector: user?.sector,
          isAdminGeral,
          isAdminSetorial
        });
        
        const [patientsData, sessionsData, atsData] = await Promise.all([
          apiService.getPatients(),
          apiService.getSessions({ month: selectedMonth, year: selectedYear }),
          apiService.getATs()
        ]);
        
        console.log('📊 [ADMIN] Dados carregados:', {
          patients: patientsData?.length || 0,
          sessions: sessionsData?.length || 0,
          ats: atsData?.length || 0
        });
        
        setPatients(patientsData || []);
        setSessions(sessionsData || []);
        setAts(atsData || []);
      } catch (error) {
        console.error('❌ [ADMIN] Erro ao carregar dados:', error);
        showOperationStatus('error', 'Erro ao carregar dados: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedMonth, selectedYear, user]);

  const reloadData = async () => {
    try {
      console.log('🔄 [ADMIN] Recarregando dados...');
      const [patientsData, sessionsData, atsData] = await Promise.all([
        apiService.getPatients(),
        apiService.getSessions({ month: selectedMonth, year: selectedYear }),
        apiService.getATs()
      ]);
      
      setPatients(patientsData || []);
      setSessions(sessionsData || []);
      setAts(atsData || []);
      showOperationStatus('success', 'Dados atualizados com sucesso!');
    } catch (error) {
      console.error('❌ [ADMIN] Erro ao recarregar:', error);
      showOperationStatus('error', 'Erro ao recarregar dados');
    }
  };

  // ✅ CORREÇÃO 3: Filtro de dados por setor mais robusto
  const getUserSectorData = () => {
    const userSector = user?.sector;
    
    if (isAdminGeral) {
      console.log('🔧 [ADMIN] Admin geral - acesso a todos os dados');
      return {
        sectorSessions: sessions,
        sectorPatients: patients,
        sectorAts: ats
      };
    }
    
    // Para administradores setoriais
    console.log('🏢 [ADMIN] Filtrando dados por setor:', userSector);
    
    const sectorSessions = sessions.filter(s => {
      const patient = patients.find(p => p.id === s.patient_id);
      const sessionSector = patient?.sector;
      
      console.log('📋 [ADMIN] Verificando sessão:', {
        sessionId: s.id,
        patientId: s.patient_id,
        patientName: patient?.name,
        sessionSector,
        userSector,
        match: sessionSector === userSector
      });
      
      return sessionSector === userSector;
    });
    
    const sectorPatients = patients.filter(p => {
      const match = p.sector === userSector;
      console.log('👥 [ADMIN] Verificando paciente:', {
        patientId: p.id,
        patientName: p.name,
        patientSector: p.sector,
        userSector,
        match
      });
      return match;
    });
    
    const sectorAts = ats.filter(a => {
      const match = a.sector === userSector;
      console.log('👨‍⚕️ [ADMIN] Verificando AT:', {
        atId: a.id,
        atName: a.name,
        atSector: a.sector,
        userSector,
        match
      });
      return match;
    });
    
    console.log('📊 [ADMIN] Dados filtrados por setor:', {
      userSector,
      sectorSessions: sectorSessions.length,
      sectorPatients: sectorPatients.length,
      sectorAts: sectorAts.length
    });
    
    return { sectorSessions, sectorPatients, sectorAts };
  };

  const { sectorSessions, sectorPatients, sectorAts } = getUserSectorData();

  // Filtrar sessões baseado na pesquisa
  const filteredSessions = sectorSessions.filter(session => {
    const patient = patients.find(p => p.id === session.patient_id);
    const at = ats.find(a => a.id === session.at_id);
    
    return (
      patient?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      at?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.observations?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // ✅ CORREÇÃO 4: Função de confirmação completamente reescrita com debug detalhado
  const handleConfirmSession = async (sessionId: string) => {
    if (confirmingSession || rejectingSession) {
      console.log('⚠️ [ADMIN] Já processando outra sessão');
      showOperationStatus('error', '⚠️ Aguarde, já está processando outra sessão...');
      return;
    }

    // ✅ Verificação prévia de permissão
    if (!canConfirmSessions()) {
      console.error('❌ [ADMIN] Usuário sem permissão para confirmar:', user?.type);
      showOperationStatus('error', `❌ Você não tem permissão para confirmar atendimentos.\n\nTipo de usuário: ${user?.type}\nPermissões necessárias: adm-geral, adm-setorial, coordenacao-*, financeiro-*`);
      return;
    }

    try {
      setConfirmingSession(sessionId);
      
      console.log('✅ [ADMIN] Iniciando confirmação:', {
        sessionId,
        user: {
          name: user?.name,
          email: user?.email,
          type: user?.type,
          sector: user?.sector
        },
        canConfirm: canConfirmSessions()
      });
      
      // Buscar dados da sessão para logs
      const sessionToConfirm = sessions.find(s => s.id === sessionId);
      if (!sessionToConfirm) {
        throw new Error('Sessão não encontrada na lista local');
      }

      if (sessionToConfirm.is_confirmed) {
        showOperationStatus('error', '⚠️ Esta sessão já foi confirmada!');
        return;
      }

      console.log('🔍 [ADMIN] Dados da sessão a confirmar:', {
        id: sessionToConfirm.id,
        patient_id: sessionToConfirm.patient_id,
        at_id: sessionToConfirm.at_id,
        date: sessionToConfirm.date,
        start_time: sessionToConfirm.start_time,
        end_time: sessionToConfirm.end_time,
        is_confirmed: sessionToConfirm.is_confirmed
      });
      
      // ✅ Chamada para API com tratamento de erro melhorado
      console.log('📤 [ADMIN] Enviando requisição de confirmação...');
      
      try {
        const response = await apiService.confirmSession(sessionId);
        console.log('📥 [ADMIN] Resposta recebida:', response);
        
        // ✅ Recarregar dados imediatamente
        console.log('🔄 [ADMIN] Recarregando dados após confirmação...');
        await reloadData();
        
        // Encontrar informações do paciente para mensagem
        const patient = patients.find(p => p.id === sessionToConfirm.patient_id);
        const patientName = patient?.name || 'Paciente não identificado';
        
        console.log('✅ [ADMIN] Confirmação concluída com sucesso!');
        showOperationStatus('success', 
          `✅ Atendimento confirmado com sucesso!\n\n` +
          `📅 Paciente: ${patientName}\n` +
          `📱 Status: Agora visível para os pais\n` +
          `👤 Confirmado por: ${user?.name} (${user?.type})`,
          5000
        );
        
      } catch (apiError) {
        console.error('❌ [ADMIN] Erro na API de confirmação:', apiError);
        
        // Tratamento detalhado de erro da API
        let errorMessage = 'Erro ao confirmar atendimento';
        
        if (apiError instanceof Error) {
          const message = apiError.message.toLowerCase();
          
          if (message.includes('403') || message.includes('forbidden') || message.includes('access denied')) {
            errorMessage = `❌ Acesso negado pelo servidor\n\n` +
                          `Seu tipo de usuário: ${user?.type}\n` +
                          `Setor: ${user?.sector || 'N/A'}\n\n` +
                          `Verifique com o administrador se suas permissões estão corretas.`;
          } else if (message.includes('401') || message.includes('unauthorized')) {
            errorMessage = '❌ Sessão expirada. Faça login novamente';
          } else if (message.includes('404') || message.includes('not found')) {
            errorMessage = '❌ Atendimento não encontrado no servidor';
          } else if (message.includes('500') || message.includes('internal server error')) {
            errorMessage = '❌ Erro interno do servidor. Contate o suporte técnico';
          } else if (message.includes('failed to fetch') || message.includes('connection')) {
            errorMessage = '❌ Erro de conexão. Verifique se o servidor está rodando';
          } else {
            errorMessage = `❌ ${apiError.message}`;
          }
        }
        
        showOperationStatus('error', errorMessage, 8000);
        
        // Tentar recarregar dados mesmo com erro
        try {
          await reloadData();
        } catch (reloadError) {
          console.error('❌ [ADMIN] Erro ao recarregar após falha:', reloadError);
        }
      }
      
    } catch (error) {
      console.error('❌ [ADMIN] Erro geral na confirmação:', error);
      showOperationStatus('error', 'Erro inesperado ao confirmar atendimento');
    } finally {
      setConfirmingSession(null);
    }
  };

  // ✅ CORREÇÃO 5: Função de rejeição melhorada
  const handleRejectSession = async (sessionId: string) => {
    if (confirmingSession || rejectingSession) {
      showOperationStatus('error', '⚠️ Aguarde, já está processando outra sessão...');
      return;
    }

    const sessionToReject = sessions.find(s => s.id === sessionId);
    const patient = patients.find(p => p.id === sessionToReject?.patient_id);
    const patientName = patient?.name || 'Paciente não identificado';
    
    if (!window.confirm(`❓ Tem certeza que deseja rejeitar o atendimento de ${patientName}?\n\n⚠️ Esta ação irá EXCLUIR permanentemente o atendimento e não pode ser desfeita.`)) {
      return;
    }

    try {
      setRejectingSession(sessionId);
      console.log('🗑️ [ADMIN] Rejeitando sessão:', sessionId);
      
      await apiService.deleteSession(sessionId);
      await reloadData();
      
      console.log('✅ [ADMIN] Sessão rejeitada com sucesso');
      showOperationStatus('success', `✅ Atendimento de ${patientName} rejeitado e removido do sistema.`);
      
    } catch (error) {
      console.error('❌ [ADMIN] Erro ao rejeitar sessão:', error);
      showOperationStatus('error', 'Erro ao rejeitar atendimento. Tente novamente.');
    } finally {
      setRejectingSession(null);
    }
  };

  const pendingSessions = filteredSessions.filter(s => !s.is_confirmed);
  const confirmedSessions = filteredSessions.filter(s => s.is_confirmed && !s.is_approved);

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
      {/* Status das Operações */}
      {operationStatus && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-md ${
          operationStatus.type === 'success' 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-start space-x-3">
            {operationStatus.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            )}
            <div>
              <p className={`font-medium text-sm ${
                operationStatus.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {operationStatus.type === 'success' ? 'Sucesso!' : 'Erro!'}
              </p>
              <p className={`text-sm whitespace-pre-line ${
                operationStatus.type === 'success' ? 'text-green-700' : 'text-red-700'
              }`}>
                {operationStatus.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {isAdminGeral ? 'Administração Geral' : `Administração ${user?.sector?.toUpperCase()}`} - Recepção
              </CardTitle>
              <p className="text-gray-600">
                Gerencie atendimentos, ATs e pacientes {isAdminGeral ? 'de todos os setores' : `do setor ${user?.sector?.toUpperCase()}`}.
              </p>
            </div>
            <Button 
              onClick={reloadData}
              variant="secondary"
              size="sm"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>

          {/* ✅ CORREÇÃO 6: Info de debug para administradores */}
          <div className="bg-blue-50 p-3 rounded-lg mt-3">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-blue-800 font-medium">
                  ✅ Permissões: {canConfirmSessions() ? 'Pode confirmar atendimentos' : 'Não pode confirmar atendimentos'}
                </p>
                <p className="text-xs text-blue-700">
                  Usuário: {user?.name} ({user?.type}) | Setor: {user?.sector || 'Não definido'}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filtros */}
      <Card>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mês</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="border border-gray-300 rounded-md px-3 py-2"
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i, 1).toLocaleDateString('pt-BR', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="border border-gray-300 rounded-md px-3 py-2"
              >
                {[2024, 2025, 2026].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
              <div className="relative">
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar paciente, AT ou observação..."
                  className="w-64"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center space-x-2 sm:space-x-4 p-3 sm:p-6">
            <div className="p-2 sm:p-3 bg-blue-100 rounded-lg">
              <Users className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Pacientes</p>
              <p className="text-lg sm:text-2xl font-bold text-purple-700">{sectorPatients.length}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center space-x-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">ATs</p>
              <p className="text-2xl font-bold text-purple-700">{sectorAts.length}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center space-x-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Calendar className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pendentes</p>
              <p className="text-2xl font-bold text-purple-700">{pendingSessions.length}</p>
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
              <p className="text-2xl font-bold text-purple-700">{confirmedSessions.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seção principal: Confirmar Atendimentos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-orange-600">
            <Clock className="inline w-5 h-5 mr-2" />
            Atendimentos Pendentes de Confirmação
          </CardTitle>
          <div className="bg-blue-50 p-3 rounded-lg mt-3">
            <p className="text-sm text-blue-800 font-medium">
              ✅ <strong>Confirme os atendimentos</strong> para que sejam enviados automaticamente ao financeiro.
            </p>
            <p className="text-xs text-blue-700 mt-1">
              ℹ️ Após confirmar, os atendimentos ficam visíveis para os pais e seguem para aprovação administrativa.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {/* Contador de sessões pendentes */}
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <span className="font-semibold text-yellow-800">
                {pendingSessions.length} atendimento(s) aguardando confirmação
              </span>
            </div>
            {pendingSessions.length > 0 && canConfirmSessions() && (
              <p className="text-xs text-yellow-700 mt-1">
                Confirme os atendimentos para que os pais possam visualizá-los no sistema.
              </p>
            )}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHeadCell>Data</TableHeadCell>
                <TableHeadCell>Paciente</TableHeadCell>
                <TableHeadCell>AT</TableHeadCell>
                <TableHeadCell>Horário</TableHeadCell>
                <TableHeadCell>Horas</TableHeadCell>
                <TableHeadCell>Observações</TableHeadCell>
                <TableHeadCell>Ações</TableHeadCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingSessions.map(session => {
                const patient = patients.find(p => p.id === session.patient_id);
                const at = ats.find(a => a.id === session.at_id);
                const hours = calculateHours(session.start_time, session.end_time);
                const isConfirming = confirmingSession === session.id;
                const isRejecting = rejectingSession === session.id;
                const isProcessing = isConfirming || isRejecting;

                return (
                  <TableRow key={session.id} className="hover:bg-yellow-50">
                    <TableCell>{formatDateBR(session.date)}</TableCell>
                    <TableCell className="font-medium">
                      {patient?.name || 'N/A'}
                      <div className="text-xs text-gray-500">{patient?.sector?.toUpperCase()}</div>
                    </TableCell>
                    <TableCell>
                      {at?.name || 'N/A'}
                      {session.is_substitution && (
                        <div className="text-xs text-orange-600 font-medium">
                          🔄 Substituição
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-mono">
                        {session.start_time} - {session.end_time}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-purple-600">
                      {formatHours(hours)}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={session.observations}>
                        {session.observations || 'Sem observações'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {canConfirmSessions() ? (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => handleConfirmSession(session.id)}
                            disabled={isProcessing}
                            title="✅ Confirmar atendimento - Ficará visível para os pais"
                            className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                          >
                            {isConfirming ? (
                              <div className="flex items-center space-x-1">
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Confirmando...</span>
                              </div>
                            ) : (
                              <>
                                <CheckCircle size={14} className="mr-1" />
                                Confirmar
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleRejectSession(session.id)}
                            disabled={isProcessing}
                            title="❌ Rejeitar atendimento - Será removido do sistema"
                            className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                          >
                            {isRejecting ? (
                              <div className="flex items-center space-x-1">
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Rejeitando...</span>
                              </div>
                            ) : (
                              <>
                                <X size={14} className="mr-1" />
                                Rejeitar
                              </>
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            Sem permissão
                          </span>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          
          {pendingSessions.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <CheckCircle className="w-20 h-20 mx-auto text-gray-300 mb-6" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                🎉 Parabéns! Nenhum atendimento pendente
              </h3>
              <p className="text-gray-500">
                Todos os atendimentos do período já foram confirmados.
              </p>
              {searchTerm && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    Filtro aplicado: <strong>"{searchTerm}"</strong>
                  </p>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setSearchTerm('')}
                    className="mt-2"
                  >
                    Limpar filtro
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Footer />
    </div>
  );
};