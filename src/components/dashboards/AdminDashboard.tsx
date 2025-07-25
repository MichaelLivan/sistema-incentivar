import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Footer } from '../ui/Footer';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHeadCell } from '../ui/Table';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { UserPlus, Users, Calendar, AlertTriangle, CheckCircle, X, Edit2, Trash2, Plus, Clock, Search, RefreshCw } from 'lucide-react';
import { formatHours, parseTimeToHours, hoursToTimeInput, formatDateBR, sumHoursSafely, calculateHours } from '../../utils/formatters';

interface NewATForm {
  name: string;
  email: string;
  sector: 'aba' | 'denver' | 'grupo' | 'escolar';
  hourly_rate: number;
  assignedPatients: string[];
}

interface NewPatientForm {
  name: string;
  email: string;
  sector: 'aba' | 'denver' | 'grupo' | 'escolar';
  weeklyHours: number;
  hourly_rate: number;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  parentName2: string;
  parentEmail2: string;
  parentPhone2: string;
  assignedATId: string;
}

const formatSessionHours = (hours: number | string): string => {
  const numHours = typeof hours === 'string' ? parseFloat(hours) : hours;
  
  if (isNaN(numHours) || numHours === null || numHours === undefined) {
    return '00:00';
  }
  
  const totalMinutes = Math.round(numHours * 60);
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  return `${wholeHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

const formatPreciseDecimalHours = (hours: number | string): string => {
  const numHours = typeof hours === 'string' ? parseFloat(hours) : hours;
  
  if (isNaN(numHours) || numHours === null || numHours === undefined) {
    return '0h';
  }
  
  const totalMinutes = Math.round(numHours * 60);
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (minutes === 0) {
    return `${wholeHours}h`;
  } else if (wholeHours === 0) {
    return `${minutes}min`;
  } else {
    return `${wholeHours}h${minutes}min`;
  }
};

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [ats, setAts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('confirmacao');
  
  // Estados para busca e filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Estados para confirmação
  const [confirmingSession, setConfirmingSession] = useState<string | null>(null);
  const [rejectingSession, setRejectingSession] = useState<string | null>(null);
  
  // Estados para formulários
  const [showATForm, setShowATForm] = useState(false);
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [editingAT, setEditingAT] = useState<string | null>(null);
  const [editingPatient, setEditingPatient] = useState<string | null>(null);
  const [operationStatus, setOperationStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [newATForm, setNewATForm] = useState<NewATForm>({
    name: '',
    email: '',
    sector: user?.sector as 'aba' | 'denver' | 'grupo' | 'escolar' || 'aba',
    hourly_rate: 35,
    assignedPatients: []
  });

  const [newPatientForm, setNewPatientForm] = useState<NewPatientForm>({
    name: '',
    email: '',
    sector: user?.sector as 'aba' | 'denver' | 'grupo' | 'escolar' || 'aba',
    weeklyHours: 20,
    hourly_rate: 60,
    parentName: '',
    parentEmail: '',
    parentPhone: '',
    parentName2: '',
    parentEmail2: '',
    parentPhone2: '',
    assignedATId: ''
  });

  // Verificação de acesso melhorada
  const isAdminSetorial = user?.type?.startsWith('adm-') && user?.type !== 'adm-geral';
  const isAdminGeral = user?.type === 'adm-geral';
  const hasAdminAccess = isAdminSetorial || isAdminGeral;

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

  // Função para mostrar status das operações
  const showOperationStatus = (type: 'success' | 'error', message: string, duration = 4000) => {
    setOperationStatus({ type, message });
    setTimeout(() => setOperationStatus(null), duration);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        console.log('🔄 [ADMIN] Carregando dados...');
        
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
  }, [selectedMonth, selectedYear]);

  // Função de recarregamento de dados
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

  const userSector = user?.sector;
  const sectorSessions = sessions.filter(s => {
    const patient = patients.find(p => p.id === s.patient_id);
    return isAdminGeral || patient?.sector === userSector;
  });

  const sectorPatients = patients.filter(p => isAdminGeral || p.sector === userSector);
  const sectorAts = ats.filter(a => isAdminGeral || a.sector === userSector);

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

  // ✅ FUNÇÃO DE CONFIRMAÇÃO MELHORADA COM DEBUG COMPLETO
  const handleConfirmSession = async (sessionId: string) => {
    // Prevenir múltiplas confirmações simultâneas
    if (confirmingSession || rejectingSession) {
      console.log('⚠️ [ADMIN] Já processando outra sessão, aguarde...');
      showOperationStatus('error', '⚠️ Aguarde, já processando outra confirmação...');
      return;
    }

    try {
      setConfirmingSession(sessionId);
      console.log('✅ [ADMIN] Iniciando confirmação da sessão:', sessionId);
      
      // ✅ DEBUG: Informações do usuário atual
      console.log('👤 [ADMIN] Usuário confirmando:', {
        name: user?.name,
        email: user?.email,
        type: user?.type,
        sector: user?.sector,
        isAdminSetorial: user?.type?.startsWith('adm-') && user?.type !== 'adm-geral',
        isAdminGeral: user?.type === 'adm-geral'
      });
      
      // Buscar dados da sessão para logs e validação
      const sessionToConfirm = sessions.find(s => s.id === sessionId);
      if (!sessionToConfirm) {
        throw new Error('Sessão não encontrada na lista local');
      }

      if (sessionToConfirm.is_confirmed) {
        showOperationStatus('error', '⚠️ Esta sessão já foi confirmada!');
        return;
      }

      console.log('🔍 [ADMIN] Confirmando sessão:', {
        id: sessionToConfirm.id,
        patient_id: sessionToConfirm.patient_id,
        at_id: sessionToConfirm.at_id,
        date: sessionToConfirm.date,
        start_time: sessionToConfirm.start_time,
        end_time: sessionToConfirm.end_time
      });
      
      // ✅ MELHORADO: Chamar API de confirmação com tratamento de erro detalhado
      console.log('📤 [ADMIN] Enviando requisição de confirmação...');
      const response = await apiService.confirmSession(sessionId);
      console.log('📥 [ADMIN] Resposta da confirmação:', response);
      
      // ✅ RECARREGAR DADOS IMEDIATAMENTE APÓS CONFIRMAÇÃO
      console.log('🔄 [ADMIN] Recarregando dados após confirmação...');
      await reloadData();
      
      // Verificar se a confirmação foi bem-sucedida
      const patient = patients.find(p => p.id === sessionToConfirm.patient_id);
      const patientName = patient?.name || 'Paciente não identificado';
      
      console.log('✅ [ADMIN] Confirmação bem-sucedida!');
      showOperationStatus('success', 
        `✅ Atendimento de ${patientName} confirmado com sucesso!\n\n` +
        `📱 Agora está visível para os pais no painel deles.\n` +
        `👤 Confirmado por: ${user?.name} (${user?.type})`,
        5000
      );
      
    } catch (error) {
      console.error('❌ [ADMIN] Erro ao confirmar sessão:', error);
      
      // ✅ MELHORADO: Tratamento de erro mais detalhado
      let errorMessage = 'Erro ao confirmar atendimento';
      let debugInfo = '';
      
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        
        if (message.includes('404') || message.includes('not found')) {
          errorMessage = '❌ Atendimento não encontrado no servidor';
          debugInfo = 'Verifique se o atendimento ainda existe no sistema.';
        } else if (message.includes('403') || message.includes('access denied') || message.includes('permission')) {
          errorMessage = '❌ Você não tem permissão para confirmar este atendimento';
          debugInfo = `Seu tipo de usuário: ${user?.type}\nSetor: ${user?.sector || 'N/A'}\nContate o administrador se acha que isso é um erro.`;
        } else if (message.includes('401') || message.includes('unauthorized')) {
          errorMessage = '❌ Sessão expirada. Faça login novamente';
          debugInfo = 'Sua sessão pode ter expirado. Tente fazer logout e login novamente.';
        } else if (message.includes('500') || message.includes('internal server error')) {
          errorMessage = '❌ Erro no servidor. Contate o suporte técnico';
          debugInfo = 'Erro interno do servidor. Tente novamente em alguns minutos.';
        } else if (message.includes('failed to fetch') || message.includes('err_connection_refused')) {
          errorMessage = '❌ Não foi possível conectar ao servidor';
          debugInfo = 'Verifique se o backend está rodando na porta 3001.\nURL atual: ' + window.location.origin;
        } else if (message.includes('timeout') || message.includes('aborted')) {
          errorMessage = '❌ Timeout na conexão';
          debugInfo = 'A conexão demorou muito para responder. Verifique sua internet.';
        } else {
          errorMessage = `❌ ${error.message}`;
          debugInfo = `Erro técnico: ${error.name || 'Desconhecido'}`;
        }
      }
      
      // ✅ Mostrar erro detalhado em desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        showOperationStatus('error', 
          `${errorMessage}\n\n` +
          `🐛 DEBUG INFO:\n${debugInfo}\n\n` +
          `👤 Usuário: ${user?.name} (${user?.type})\n` +
          `🏢 Setor: ${user?.sector || 'N/A'}\n` +
          `📱 Sessão ID: ${sessionId}`,
          8000
        );
      } else {
        showOperationStatus('error', errorMessage);
      }
      
      // Tentar recarregar dados mesmo com erro
      try {
        await reloadData();
      } catch (reloadError) {
        console.error('❌ [ADMIN] Erro ao recarregar dados:', reloadError);
      }
    } finally {
      setConfirmingSession(null);
    }
  };

  // ✅ FUNÇÃO DE REJEIÇÃO MELHORADA
  const handleRejectSession = async (sessionId: string) => {
    const sessionToReject = sessions.find(s => s.id === sessionId);
    const patient = patients.find(p => p.id === sessionToReject?.patient_id);
    const patientName = patient?.name || 'Paciente não identificado';
    
    if (!window.confirm(`❓ Tem certeza que deseja rejeitar o atendimento de ${patientName}?\n\n⚠️ Esta ação irá EXCLUIR permanentemente o atendimento do sistema e não pode ser desfeita.`)) {
      return;
    }

    try {
      setRejectingSession(sessionId);
      console.log('🗑️ [ADMIN] Rejeitando (deletando) sessão:', sessionId);
      
      await apiService.deleteSession(sessionId);
      
      // Recarregar dados
      console.log('🔄 [ADMIN] Recarregando dados após rejeição...');
      await reloadData();
      
      console.log('✅ [ADMIN] Atendimento rejeitado com sucesso');
      showOperationStatus('success', `✅ Atendimento de ${patientName} rejeitado e removido do sistema.`);
      
    } catch (error) {
      console.error('❌ [ADMIN] Erro ao rejeitar sessão:', error);
      showOperationStatus('error', 'Erro ao rejeitar atendimento. Tente novamente.');
    } finally {
      setRejectingSession(null);
    }
  };

  // ✅ ADICIONADO: Função para testar permissões do usuário
  const testUserPermissions = () => {
    console.log('🧪 [ADMIN] Testando permissões do usuário atual...');
    
    const permissions = {
      isLoggedIn: !!user,
      userName: user?.name || 'N/A',
      userEmail: user?.email || 'N/A',
      userType: user?.type || 'N/A',
      userSector: user?.sector || 'N/A',
      isAdminGeral: user?.type === 'adm-geral',
      isAdminSetorial: user?.type?.startsWith('adm-') && user?.type !== 'adm-geral',
      hasAdminAccess: (user?.type?.startsWith('adm-') || user?.type === 'adm-geral'),
      canConfirmSessions: ['adm-geral', 'adm-aba', 'adm-denver', 'adm-grupo', 'adm-escolar'].includes(user?.type || ''),
      currentUrl: window.location.href,
      apiBaseUrl: process.env.NODE_ENV === 'development' ? 'http://localhost:3001/api' : '/api'
    };
    
    console.table(permissions);
    
    // Mostrar informações para o usuário
    const permissionInfo = Object.entries(permissions)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
      
    showOperationStatus('success', 
      `🧪 TESTE DE PERMISSÕES:\n\n${permissionInfo}`, 
      10000
    );
    
    return permissions;
  };

  // Handlers para AT
  const handleATInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setNewATForm(prev => {
      const newForm = {
        ...prev,
        [name]: name === 'hourly_rate' ? (value === '' ? 0 : Number(value)) : value
      };
      
      return newForm;
    });
  };

  const handleATSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newATForm.name || !newATForm.email) {
      showOperationStatus('error', 'Por favor, preencha todos os campos obrigatórios');
      return;
    }

    try {
      if (editingAT) {
        await apiService.updateUser(editingAT, {
          name: newATForm.name,
          sector: newATForm.sector,
          hourly_rate: newATForm.hourly_rate
        });
      } else {
        await apiService.createUser({
          name: newATForm.name,
          email: newATForm.email,
          type: `at-${newATForm.sector}`,
          sector: newATForm.sector,
          hourly_rate: newATForm.hourly_rate
        });
      }
      
      await reloadData();
      
      setNewATForm({
        name: '',
        email: '',
        sector: (user?.sector || 'aba') as 'aba' | 'denver' | 'grupo' | 'escolar',
        hourly_rate: 35,
        assignedPatients: []
      });
      setEditingAT(null);
      setShowATForm(false);
      
      showOperationStatus('success', `AT ${editingAT ? 'atualizado' : 'cadastrado'} com sucesso!`);
      
    } catch (error) {
      console.error(`❌ [ADMIN] Erro ao ${editingAT ? 'atualizar' : 'criar'} AT:`, error);
      const errorMessage = (error instanceof Error) ? error.message : String(error);
      showOperationStatus('error', `Erro ao ${editingAT ? 'atualizar' : 'cadastrar'} AT: ${errorMessage}`);
    }
  };

  // Handlers para Paciente
  const handlePatientInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewPatientForm(prev => ({
      ...prev,
      [name]: name === 'hourly_rate' ? Number(value) : value
    }));
  };

  const handleTimeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const decimalValue = parseTimeToHours(value);
    setNewPatientForm(prev => ({
      ...prev,
      [name]: decimalValue
    }));
  };

  const handlePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPatientForm.name || !newPatientForm.parentEmail) {
      showOperationStatus('error', 'Por favor, preencha todos os campos obrigatórios');
      return;
    }

    try {
      const patientData = {
        name: newPatientForm.name,
        at_id: newPatientForm.assignedATId || null,
        sector: newPatientForm.sector,
        weekly_hours: newPatientForm.weeklyHours,
        hourly_rate: newPatientForm.hourly_rate,
        parent_email: newPatientForm.parentEmail,
        parent_name: newPatientForm.parentName,
        parent_phone: newPatientForm.parentPhone || null,
        parent_email2: newPatientForm.parentEmail2 || null,
        parent_name2: newPatientForm.parentName2 || null,
        parent_phone2: newPatientForm.parentPhone2 || null
      };

      if (editingPatient) {
        await apiService.updatePatient(editingPatient, patientData);
      } else {
        await apiService.createPatient(patientData);
      }

      await reloadData();

      setNewPatientForm({
        name: '',
        email: '',
        sector: (user?.sector || 'aba') as 'aba' | 'denver' | 'grupo' | 'escolar',
        weeklyHours: 20,
        hourly_rate: 60,
        parentName: '',
        parentEmail: '',
        parentPhone: '',
        parentName2: '',
        parentEmail2: '',
        parentPhone2: '',
        assignedATId: ''
      });
      setEditingPatient(null);
      setShowPatientForm(false);
      showOperationStatus('success', `Paciente ${editingPatient ? 'atualizado' : 'cadastrado'} com sucesso!`);
    } catch (error) {
      console.error(`❌ [ADMIN] Erro ao ${editingPatient ? 'atualizar' : 'criar'} paciente:`, error);
      const errorMessage = (error instanceof Error) ? error.message : String(error);
      showOperationStatus('error', `Erro ao ${editingPatient ? 'atualizar' : 'cadastrar'} paciente: ${errorMessage}`);
    }
  };

  const handleDeleteAT = async (atId: string) => {
    const atToDelete = ats.find(at => at.id === atId);
    if (!atToDelete) return;

    if (window.confirm(`Tem certeza que deseja excluir o AT "${atToDelete.name}"?`)) {
      try {
        await apiService.deleteUser(atId);
        await reloadData();
        showOperationStatus('success', 'AT excluído com sucesso!');
      } catch (error) {
        console.error('❌ [ADMIN] Erro ao excluir AT:', error);
        showOperationStatus('error', 'Erro ao excluir AT.');
      }
    }
  };

  const handleEditAT = (atId: string) => {
    const at = ats.find(a => a.id === atId);
    if (at) {
      setNewATForm({
        name: at.name,
        email: at.email,
        sector: at.sector,
        hourly_rate: at.hourly_rate || 35,
        assignedPatients: []
      });
      setEditingAT(atId);
      setShowATForm(true);
    }
  };

  const handleEditPatient = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (patient) {
      setNewPatientForm({
        name: patient.name,
        email: '',
        sector: patient.sector,
        weeklyHours: patient.weekly_hours,
        hourly_rate: patient.hourly_rate,
        parentName: patient.parent_name || patient.parent?.name || '',
        parentEmail: patient.parent_email || patient.parent?.email || '',
        parentPhone: patient.parent_phone || '',
        parentName2: patient.parent_name2 || '',
        parentEmail2: patient.parent_email2 || '',
        parentPhone2: patient.parent_phone2 || '',
        assignedATId: patient.at_id || ''
      });
      setEditingPatient(patientId);
      setShowPatientForm(true);
    }
  };

  const handleDeletePatient = async (patientId: string) => {
    const patientToDelete = patients.find(p => p.id === patientId);
    if (!patientToDelete) return;

    if (window.confirm(`Tem certeza que deseja excluir o paciente "${patientToDelete.name}"?`)) {
      try {
        await apiService.deletePatient(patientId);
        await reloadData();
        showOperationStatus('success', 'Paciente excluído com sucesso!');
      } catch (error) {
        console.error('❌ [ADMIN] Erro ao excluir paciente:', error);
        showOperationStatus('error', 'Erro ao excluir paciente.');
      }
    }
  };

  const handleApproveSession = async (sessionId: string) => {
    try {
      await apiService.approveSession(sessionId);
      await reloadData();
      showOperationStatus('success', 'Atendimento aprovado com sucesso!');
    } catch (error) {
      console.error('❌ [ADMIN] Erro ao aprovar sessão:', error);
      showOperationStatus('error', 'Erro ao aprovar sessão');
    }
  };

  const handleLaunchSession = async (sessionId: string) => {
    try {
      await apiService.launchSession(sessionId);
      await reloadData();
      showOperationStatus('success', 'Atendimento lançado com sucesso!');
    } catch (error) {
      console.error('❌ [ADMIN] Erro ao lançar sessão:', error);
      showOperationStatus('error', 'Erro ao lançar sessão');
    }
  };

  const pendingSessions = filteredSessions.filter(s => !s.is_confirmed);
  const confirmedSessions = filteredSessions.filter(s => s.is_confirmed && !s.is_approved);
  const approvedSessions = filteredSessions.filter(s => s.is_approved && !s.is_launched);
  const totalHours = filteredSessions.reduce((sum, s) => sum + calculateHours(s.start_time, s.end_time), 0);

  // Verificar alertas de carga horária
  const hourlyAlerts = sectorPatients.map(patient => {
    const patientSessions = sectorSessions.filter(s => s.patient_id === patient.id);
    
    const today = new Date();
    const currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() - today.getDay());
    currentWeekStart.setHours(0, 0, 0, 0);
    
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
    currentWeekEnd.setHours(23, 59, 59, 999);
    
    const currentWeekHours = sumHoursSafely(
      patientSessions
        .filter(s => {
          const sessionDate = new Date(s.date);
          return sessionDate >= currentWeekStart && sessionDate <= currentWeekEnd;
        })
        .map(s => Number(s.hours) || 0)
    );
      
    const maxWeekHours = Number(patient.weekly_hours) || 0;
    const tolerance = maxWeekHours * 0.1;
    const isOverLimit = currentWeekHours > (maxWeekHours + tolerance) && maxWeekHours > 0;
    
    return {
      patient,
      currentWeekHours,
      maxWeekHours,
      isOverLimit,
      excess: Math.max(0, currentWeekHours - maxWeekHours)
    };
  }).filter(alert => alert.isOverLimit);

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

      {/* Cabeçalho */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                Administração {userSector?.toUpperCase()} - Recepção
                {isAdminGeral && <span className="text-sm font-normal text-purple-600 ml-2">(Admin Geral)</span>}
              </CardTitle>
              <p className="text-gray-600">
                Gerencie atendimentos, ATs e pacientes {isAdminGeral ? 'de todos os setores' : `do setor ${userSector?.toUpperCase()}`}.
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

          {/* ✅ ADICIONADO: Botão de debug (apenas em desenvolvimento) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-semibold text-yellow-800 mb-2">🐛 Ferramentas de Debug</h4>
              <div className="flex space-x-2">
                <Button
                  onClick={testUserPermissions}
                  variant="secondary"
                  size="sm"
                  className="text-xs"
                >
                  🧪 Testar Permissões
                </Button>
                <Button
                  onClick={() => {
                    console.log('📊 Estado atual:', {
                      user,
                      hasAdminAccess,
                      isAdminSetorial,
                      isAdminGeral,
                      pendingSessions: pendingSessions.length,
                      confirmedSessions: confirmedSessions.length
                    });
                  }}
                  variant="secondary"
                  size="sm"
                  className="text-xs"
                >
                  📊 Estado do Sistema
                </Button>
              </div>
            </div>
          )}
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
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar paciente, AT ou observação..."
                  className="pl-10 w-64"
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
              <UserPlus className="w-6 h-6 text-green-600" />
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
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Alertas</p>
              <p className="text-2xl font-bold text-purple-700">{hourlyAlerts.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Abas */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setActiveTab('confirmacao')}
              variant={activeTab === 'confirmacao' ? 'primary' : 'secondary'}
              size="sm"
              className="flex items-center space-x-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Confirmar Atendimentos ({pendingSessions.length})</span>
            </Button>
            <Button
              onClick={() => setActiveTab('ats')}
              variant={activeTab === 'ats' ? 'primary' : 'secondary'}
              size="sm"
              className="flex items-center space-x-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Gerenciar ATs</span>
            </Button>
            <Button
              onClick={() => setActiveTab('pacientes')}
              variant={activeTab === 'pacientes' ? 'primary' : 'secondary'}
              size="sm"
              className="flex items-center space-x-2"
            >
              <Users className="w-4 h-4" />
              <span>Gerenciar Pacientes</span>
            </Button>
            <Button
              onClick={() => setActiveTab('atendimentos')}
              variant={activeTab === 'atendimentos' ? 'primary' : 'secondary'}
              size="sm"
              className="flex items-center space-x-2"
            >
              <Calendar className="w-4 h-4" />
              <span>Gerenciar Atendimentos</span>
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Alertas de Carga Horária */}
      {hourlyAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5" />
              <span>Alertas de Carga Horária Excedida</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {hourlyAlerts.map(alert => (
                <div key={alert.patient.id} className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-red-800">{alert.patient.name}</h4>
                      <p className="text-sm text-red-600">
                        Horas da semana: {formatPreciseDecimalHours(alert.currentWeekHours)} / {formatPreciseDecimalHours(alert.maxWeekHours)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-red-600 font-bold">
                        Excesso: {formatPreciseDecimalHours(alert.excess)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ABA: Confirmar Atendimentos - CORRIGIDA PARA ADMIN SETORIAL */}
      {activeTab === 'confirmacao' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-orange-600">
              <Clock className="inline w-5 h-5 mr-2" />
              Atendimentos Pendentes de Confirmação (Recepção)
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
              {pendingSessions.length > 0 && hasAdminAccess && (
                <p className="text-xs text-yellow-700 mt-1">
                  Confirme os atendimentos para que os pais possam visualizá-los no sistema.
                </p>
              )}
            </div>

            {/* ✅ MELHORADO: Indicador de status da confirmação mais visual */}
            {confirmedSessions.length > 0 && hasAdminAccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-800">
                    ✅ {confirmedSessions.length} atendimento(s) confirmado(s) aguardando próximas etapas
                  </span>
                </div>
                <p className="text-xs text-green-700 mt-1">
                  Os atendimentos confirmados já estão visíveis para os pais e podem ser aprovados pela coordenação.
                </p>
              </div>
            )}
            
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
      )}

      {/* Aqui você pode adicionar as outras abas (ATs, Pacientes, Atendimentos) se necessário */}
      {/* Por brevidade, estou omitindo o resto do código das outras abas */}
      {/* Elas permanecem iguais ao código original */}

      {/* ABA: Gerenciar ATs */}
      {activeTab === 'ats' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Gerenciar ATs - {userSector?.toUpperCase()}</CardTitle>
              <Button 
                onClick={() => {
                  setShowATForm(!showATForm);
                  setEditingAT(null);
                }}
                disabled={submitting}
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo AT
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Formulário de AT */}
            {showATForm && (
              <form onSubmit={handleATSubmit} className="space-y-4 mb-6 p-6 bg-gray-50 rounded-lg border-2 border-purple-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-purple-800">
                    {editingAT ? '📝 Editar AT' : '➕ Cadastrar Novo AT'}
                  </h3>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setShowATForm(false);
                      setEditingAT(null);
                    }}
                  >
                    ✕ Cancelar
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-purple-800 mb-2">
                      Nome Completo *
                    </label>
                    <Input
                      name="name"
                      value={newATForm.name}
                      onChange={handleATInputChange}
                      placeholder="Nome completo do AT"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-purple-800 mb-2">
                      Email *
                    </label>
                    <Input
                      type="email"
                      name="email"
                      value={newATForm.email}
                      onChange={handleATInputChange}
                      placeholder="email@exemplo.com"
                      required
                      disabled={!!editingAT}
                    />
                    {editingAT && (
                      <p className="text-xs text-gray-500 mt-1">Email não pode ser alterado</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-purple-800 mb-2">
                      Setor *
                    </label>
                    <Select
                      name="sector"
                      value={newATForm.sector}
                      onChange={handleATInputChange}
                      required
                      disabled={!isAdminGeral}
                    >
                      <option value="aba">ABA</option>
                      <option value="denver">Denver</option>
                      <option value="grupo">Grupo</option>
                      <option value="escolar">Escolar</option>
                    </Select>
                    {!isAdminGeral && (
                      <p className="text-xs text-gray-500 mt-1">Setor fixo: {userSector?.toUpperCase()}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-purple-800 mb-2">
                      Valor por Hora (R$) *
                    </label>
                    <Input
                      type="number"
                      name="hourly_rate"
                      value={newATForm.hourly_rate}
                      onChange={handleATInputChange}
                      placeholder="35.00"
                      required
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => {
                      setShowATForm(false);
                      setEditingAT(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingAT ? '📝 Atualizar' : '➕ Cadastrar'} AT
                  </Button>
                </div>
              </form>
            )}
            
            {/* Lista de ATs */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHeadCell>Nome</TableHeadCell>
                  <TableHeadCell>Email</TableHeadCell>
                  <TableHeadCell>Setor</TableHeadCell>
                  <TableHeadCell>Valor/Hora</TableHeadCell>
                  <TableHeadCell>Pacientes</TableHeadCell>
                  <TableHeadCell>Ações</TableHeadCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sectorAts.map(at => {
                  const atPatients = sectorPatients.filter(p => p.at_id === at.id);
                  return (
                    <TableRow key={at.id}>
                      <TableCell className="font-medium">{at.name}</TableCell>
                      <TableCell>{at.email}</TableCell>
                      <TableCell className="uppercase">{at.sector}</TableCell>
                      <TableCell>R$ {(at.hourly_rate || 0).toFixed(2)}</TableCell>
                      <TableCell>{atPatients.length}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleEditAT(at.id)}
                            title="Editar AT"
                          >
                            <Edit2 size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDeleteAT(at.id)}
                            title="Excluir AT"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {sectorAts.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <UserPlus className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p>Nenhum AT cadastrado no setor {userSector?.toUpperCase()}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ABA: Gerenciar Pacientes */}
      {activeTab === 'pacientes' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Gerenciar Pacientes - {userSector?.toUpperCase()}</CardTitle>
              <Button 
                onClick={() => {
                  setShowPatientForm(!showPatientForm);
                  setEditingPatient(null);
                }}
                disabled={submitting}
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Paciente
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Formulário de Paciente */}
            {showPatientForm && (
              <form onSubmit={handlePatientSubmit} className="space-y-4 mb-6 p-6 bg-gray-50 rounded-lg border-2 border-purple-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-purple-800">
                    {editingPatient ? '📝 Editar Paciente' : '➕ Cadastrar Novo Paciente'}
                  </h3>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setShowPatientForm(false);
                      setEditingPatient(null);
                    }}
                  >
                    ✕ Cancelar
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-purple-800 mb-2">
                      Nome do Paciente *
                    </label>
                    <Input
                      name="name"
                      value={newPatientForm.name}
                      onChange={handlePatientInputChange}
                      placeholder="Nome completo do paciente"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-purple-800 mb-2">
                      Setor *
                    </label>
                    <Select
                      name="sector"
                      value={newPatientForm.sector}
                      onChange={handlePatientInputChange}
                      required
                      disabled={!isAdminGeral}
                    >
                      <option value="aba">ABA</option>
                      <option value="denver">Denver</option>
                      <option value="grupo">Grupo</option>
                      <option value="escolar">Escolar</option>
                    </Select>
                    {!isAdminGeral && (
                      <p className="text-xs text-gray-500 mt-1">Setor fixo: {userSector?.toUpperCase()}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-purple-800 mb-2">
                      AT Responsável
                    </label>
                    <Select
                      name="assignedATId"
                      value={newPatientForm.assignedATId}
                      onChange={handlePatientInputChange}
                    >
                      <option value="">Selecione um AT</option>
                      {sectorAts.map(at => (
                        <option key={at.id} value={at.id}>
                          {at.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-purple-800 mb-2">
                      Carga Horária Semanal
                    </label>
                    <Input
                      type="number"
                      name="weeklyHours"
                      value={newPatientForm.weeklyHours}
                      onChange={handlePatientInputChange}
                      placeholder="20"
                      step="0.5"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-purple-800 mb-2">
                      Valor por Hora (R$)
                    </label>
                    <Input
                      type="number"
                      name="hourly_rate"
                      value={newPatientForm.hourly_rate}
                      onChange={handlePatientInputChange}
                      placeholder="60.00"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <h4 className="text-md font-semibold text-purple-800 mb-3">Dados do Responsável Principal</h4>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-purple-800 mb-2">
                      Nome do Responsável *
                    </label>
                    <Input
                      name="parentName"
                      value={newPatientForm.parentName}
                      onChange={handlePatientInputChange}
                      placeholder="Nome completo"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-purple-800 mb-2">
                      Email do Responsável *
                    </label>
                    <Input
                      type="email"
                      name="parentEmail"
                      value={newPatientForm.parentEmail}
                      onChange={handlePatientInputChange}
                      placeholder="email@exemplo.com"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <h4 className="text-md font-semibold text-purple-800 mb-3">Segundo Responsável (Opcional)</h4>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-purple-800 mb-2">
                      Nome do 2º Responsável
                    </label>
                    <Input
                      name="parentName2"
                      value={newPatientForm.parentName2}
                      onChange={handlePatientInputChange}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-purple-800 mb-2">
                      Email do 2º Responsável
                    </label>
                    <Input
                      type="email"
                      name="parentEmail2"
                      value={newPatientForm.parentEmail2}
                      onChange={handlePatientInputChange}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => {
                      setShowPatientForm(false);
                      setEditingPatient(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingPatient ? '📝 Atualizar' : '➕ Cadastrar'} Paciente
                  </Button>
                </div>
              </form>
            )}
            
            {/* Lista de Pacientes */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHeadCell>Nome</TableHeadCell>
                  <TableHeadCell>Responsável</TableHeadCell>
                  <TableHeadCell>AT</TableHeadCell>
                  <TableHeadCell>Setor</TableHeadCell>
                  <TableHeadCell>Carga Semanal</TableHeadCell>
                  <TableHeadCell>Ações</TableHeadCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sectorPatients.map(patient => {
                  const at = sectorAts.find(a => a.id === patient.at_id);
                  return (
                    <TableRow key={patient.id}>
                      <TableCell className="font-medium">{patient.name}</TableCell>
                      <TableCell>
                        {patient.parent_name || patient.parent?.name || 'N/A'}
                        <div className="text-xs text-gray-500">{patient.parent_email}</div>
                      </TableCell>
                      <TableCell>{at?.name || 'Não atribuído'}</TableCell>
                      <TableCell className="uppercase">{patient.sector}</TableCell>
                      <TableCell>{formatHours(patient.weekly_hours || 0)}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleEditPatient(patient.id)}
                            title="Editar paciente"
                          >
                            <Edit2 size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDeletePatient(patient.id)}
                            title="Excluir paciente"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            
            {sectorPatients.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p>Nenhum paciente cadastrado no setor {userSector?.toUpperCase()}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ABA: Gerenciar Atendimentos */}
      {activeTab === 'atendimentos' && (
        <Card>
          <CardHeader>
            <CardTitle>Gerenciar Atendimentos - {userSector?.toUpperCase()}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHeadCell>Data</TableHeadCell>
                  <TableHeadCell>Paciente</TableHeadCell>
                  <TableHeadCell>AT</TableHeadCell>
                  <TableHeadCell>Horário</TableHeadCell>
                  <TableHeadCell>Horas</TableHeadCell>
                  <TableHeadCell>Status</TableHeadCell>
                  <TableHeadCell>Ações</TableHeadCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSessions.map(session => {
                  const patient = patients.find(p => p.id === session.patient_id);
                  const at = ats.find(a => a.id === session.at_id);
                  const hours = calculateHours(session.start_time, session.end_time);
                  
                  return (
                    <TableRow key={session.id}>
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
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          session.is_launched 
                            ? 'bg-green-100 text-green-800' 
                            : session.is_approved 
                              ? 'bg-blue-100 text-blue-800'
                              : session.is_confirmed
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                        }`}>
                          {session.is_launched ? 'Lançado' : 
                           session.is_approved ? 'Aprovado' : 
                           session.is_confirmed ? 'Confirmado' : 'Pendente'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          {!session.is_confirmed && (
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => handleConfirmSession(session.id)}
                              title="Confirmar atendimento"
                            >
                              <CheckCircle size={12} />
                            </Button>
                          )}
                          {session.is_confirmed && !session.is_approved && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleApproveSession(session.id)}
                              title="Aprovar atendimento"
                            >
                              ✓
                            </Button>
                          )}
                          {session.is_approved && !session.is_launched && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleLaunchSession(session.id)}
                              title="Lançar atendimento"
                            >
                              🚀
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            
            {filteredSessions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p>Nenhum atendimento encontrado para o período selecionado</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      <Footer />
    </div>
  );
};