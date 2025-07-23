import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Footer } from '../ui/Footer';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHeadCell } from '../ui/Table';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { UserPlus, Users, Calendar, AlertTriangle, CheckCircle, X, Edit2, Trash2, Plus, Clock, Search } from 'lucide-react';
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

// Função para garantir precisão nas horas das sessões
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
  const [activeTab, setActiveTab] = useState('confirmacao'); // 'confirmacao', 'ats', 'pacientes', 'atendimentos'
  
  // Estados para busca e filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const [showATForm, setShowATForm] = useState(false);
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [editingAT, setEditingAT] = useState<string | null>(null);
  const [editingPatient, setEditingPatient] = useState<string | null>(null);

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

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [patientsData, sessionsData, atsData] = await Promise.all([
          apiService.getPatients(),
          apiService.getSessions({ month: selectedMonth, year: selectedYear }),
          apiService.getATs()
        ]);
        
        setPatients(patientsData);
        setSessions(sessionsData);
        setAts(atsData);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedMonth, selectedYear]);

  const userSector = user?.sector;
  const sectorSessions = sessions.filter(s => {
    const patient = patients.find(p => p.id === s.patient_id);
    return patient?.sector === userSector;
  });

  const sectorPatients = patients.filter(p => p.sector === userSector);
  const sectorAts = ats.filter(a => a.sector === userSector);

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

  // ✅ CORREÇÃO PRINCIPAL: Função de confirmação de atendimentos
  const handleConfirmSession = async (sessionId: string) => {
    try {
      console.log('✅ [ADMIN] Confirmando sessão:', sessionId);
      console.log('🔍 Sessão antes da confirmação:', sessions.find(s => s.id === sessionId));
      
      // Chamar API para confirmar
      const response = await apiService.confirmSession(sessionId);
      console.log('📤 Resposta da API:', response);
      
      // ✅ CORREÇÃO: Recarregar dados após confirmação
      console.log('🔄 Recarregando dados após confirmação...');
      const [updatedSessions, updatedPatients] = await Promise.all([
        apiService.getSessions({ month: selectedMonth, year: selectedYear }),
        apiService.getPatients() // Recarregar pacientes também
      ]);
      
      console.log('📊 Sessões atualizadas:', updatedSessions.length);
      console.log('🔍 Sessão confirmada:', updatedSessions.find(s => s.id === sessionId));
      
      setSessions(updatedSessions);
      setPatients(updatedPatients);
      
      console.log('✅ Sessão confirmada com sucesso');
      alert('✅ Atendimento confirmado com sucesso! Agora estará visível para os pais.');
      
    } catch (error) {
      console.error('❌ Erro ao confirmar sessão:', error);
      
      // Mensagem de erro mais específica
      let errorMessage = 'Erro ao confirmar atendimento';
      if (error instanceof Error) {
        if (error.message.includes('404')) {
          errorMessage = 'Atendimento não encontrado';
        } else if (error.message.includes('403') || error.message.includes('401')) {
          errorMessage = 'Você não tem permissão para confirmar este atendimento';
        } else if (error.message.includes('500')) {
          errorMessage = 'Erro interno do servidor. Tente novamente';
        } else {
          errorMessage = `Erro: ${error.message}`;
        }
      }
      
      alert(`❌ ${errorMessage}`);
    }
  };

  const handleRejectSession = async (sessionId: string) => {
    if (window.confirm('❓ Tem certeza que deseja rejeitar este atendimento? Esta ação não pode ser desfeita.')) {
      try {
        console.log('🗑️ [ADMIN] Rejeitando (deletando) sessão:', sessionId);
        
        await apiService.deleteSession(sessionId);
        
        // Recarregar dados
        const updatedSessions = await apiService.getSessions({ month: selectedMonth, year: selectedYear });
        setSessions(updatedSessions);
        
        console.log('✅ Atendimento rejeitado com sucesso');
        alert('✅ Atendimento rejeitado com sucesso!');
        
      } catch (error) {
        console.error('❌ Erro ao rejeitar sessão:', error);
        alert('❌ Erro ao rejeitar atendimento');
      }
    }
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
      alert('Por favor, preencha todos os campos obrigatórios');
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
      
      const [patientsData, atsData] = await Promise.all([
        apiService.getPatients(),
        apiService.getATs()
      ]);
      setPatients(patientsData);
      setAts(atsData);
      
      setNewATForm({
        name: '',
        email: '',
        sector: (user?.sector || 'aba') as 'aba' | 'denver' | 'grupo' | 'escolar',
        hourly_rate: 35,
        assignedPatients: []
      });
      setEditingAT(null);
      setShowATForm(false);
      
      alert(`AT ${editingAT ? 'atualizado' : 'cadastrado'} com sucesso!`);
      
    } catch (error) {
      console.error(`Erro ao ${editingAT ? 'atualizar' : 'criar'} AT:`, error);
      const errorMessage = (error instanceof Error) ? error.message : String(error);
      alert(`Erro ao ${editingAT ? 'atualizar' : 'cadastrar'} AT: ${errorMessage}`);
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
      alert('Por favor, preencha todos os campos obrigatórios');
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

      const patientsData = await apiService.getPatients();
      setPatients(patientsData);

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
      alert(`Paciente ${editingPatient ? 'atualizado' : 'cadastrado'} com sucesso!`);
    } catch (error) {
      console.error(`Erro ao ${editingPatient ? 'atualizar' : 'criar'} paciente:`, error);
      const errorMessage = (error instanceof Error) ? error.message : String(error);
      alert(`Erro ao ${editingPatient ? 'atualizar' : 'cadastrar'} paciente: ${errorMessage}`);
    }
  };

  const handleDeleteAT = async (atId: string) => {
    const atToDelete = ats.find(at => at.id === atId);
    if (!atToDelete) return;

    if (window.confirm(`Tem certeza que deseja excluir o AT "${atToDelete.name}"?`)) {
      try {
        await apiService.deleteUser(atId);
        const [patientsData, atsData] = await Promise.all([
          apiService.getPatients(),
          apiService.getATs()
        ]);
        setPatients(patientsData);
        setAts(atsData);
        alert('AT excluído com sucesso!');
      } catch (error) {
        console.error('Erro ao excluir AT:', error);
        alert('Erro ao excluir AT.');
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
        const patientsData = await apiService.getPatients();
        setPatients(patientsData);
        alert('Paciente excluído com sucesso!');
      } catch (error) {
        console.error('Erro ao excluir paciente:', error);
        alert('Erro ao excluir paciente.');
      }
    }
  };

  const handleApproveSession = async (sessionId: string) => {
    try {
      await apiService.approveSession(sessionId);
      const sessionsData = await apiService.getSessions({ month: selectedMonth, year: selectedYear });
      setSessions(sessionsData);
    } catch (error) {
      console.error('Erro ao aprovar sessão:', error);
      alert('Erro ao aprovar sessão');
    }
  };

  const handleLaunchSession = async (sessionId: string) => {
    try {
      await apiService.launchSession(sessionId);
      const sessionsData = await apiService.getSessions({ month: selectedMonth, year: selectedYear });
      setSessions(sessionsData);
    } catch (error) {
      console.error('Erro ao lançar sessão:', error);
      alert('Erro ao lançar sessão');
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
          <p className="text-lg text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Cabeçalho */}
      <Card>
        <CardHeader>
          <CardTitle>Administração {userSector?.toUpperCase()} - Recepção</CardTitle>
          <p className="text-gray-600">
            Gerencie atendimentos, ATs e pacientes do setor {userSector?.toUpperCase()}.
          </p>
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
              <span>Confirmar Atendimentos</span>
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

      {/* ABA: Confirmar Atendimentos - CORRIGIDA */}
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
                          <div className="text-xs text-orange-600 font-medium">Substituição</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {session.start_time} - {session.end_time}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{formatHours(hours)}</TableCell>
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
                            title="Confirmar atendimento - Ficará visível para os pais"
                          >
                            <CheckCircle size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleRejectSession(session.id)}
                            title="Rejeitar atendimento - Será removido do sistema"
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            
            {pendingSessions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p>Nenhum atendimento pendente de confirmação</p>
                {searchTerm && (
                  <p className="text-sm mt-2">
                    Filtrado por: "{searchTerm}"
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Resto das abas permanecem iguais... */}
      {/* ... aqui iria o resto do código das outras abas ... */}
      
      <Footer />
    </div>
  );
};
