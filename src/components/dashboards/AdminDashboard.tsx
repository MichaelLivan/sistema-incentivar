import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Footer } from '../ui/Footer';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHeadCell } from '../ui/Table';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { UserPlus, Users, Calendar, AlertTriangle, CheckCircle, X, Edit2, Trash2, Plus } from 'lucide-react';
import { formatHours, parseTimeToHours, hoursToTimeInput, formatDateBR, sumHoursSafely } from '../../utils/formatters';

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
  parentName2: string;
  parentEmail2: string;
  assignedATId: string;
}

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [ats, setAts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
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
    parentName2: '',
    parentEmail2: '',
    assignedATId: ''
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [patientsData, sessionsData, atsData] = await Promise.all([
          apiService.getPatients(),
          apiService.getSessions(),
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
  }, []);

  const userSector = user?.sector;
  const sectorSessions = sessions.filter(s => {
    const patient = patients.find(p => p.id === s.patient_id);
    return patient?.sector === userSector;
  });

  const sectorPatients = patients.filter(p => p.sector === userSector);
  const sectorAts = ats.filter(a => a.sector === userSector);

  // Handlers para AT
  const handleATInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    console.log(`🔧 Campo alterado: ${name} = "${value}" (tipo: ${typeof value})`);
    
    setNewATForm(prev => {
      const newForm = {
        ...prev,
        [name]: name === 'hourly_rate' ? (value === '' ? 0 : Number(value)) : value
      };
      
      console.log('📋 Form atualizado:', newForm);
      return newForm;
    });
  };

  const handlePatientAssignment = (patientId: string, isAssigned: boolean) => {
    setNewATForm(prev => ({
      ...prev,
      assignedPatients: isAssigned 
        ? [...prev.assignedPatients, patientId]
        : prev.assignedPatients.filter(id => id !== patientId)
    }));
  };

  const handleATSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newATForm.name || !newATForm.email) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    try {
      if (editingAT) {
        console.log('📝 Atualizando AT:', editingAT, {
          name: newATForm.name,
          sector: newATForm.sector,
          hourly_rate: newATForm.hourly_rate
        });
        
        await apiService.updateUser(editingAT, {
          name: newATForm.name,
          sector: newATForm.sector,
          hourly_rate: newATForm.hourly_rate
        });
        
        console.log('✅ AT atualizado no banco de dados');
      } else {
        console.log('📤 Criando AT com dados:', {
          name: newATForm.name,
          email: newATForm.email,
          type: `at-${newATForm.sector}`,
          sector: newATForm.sector,
          hourly_rate: newATForm.hourly_rate
        });
        
        await apiService.createUser({
          name: newATForm.name,
          email: newATForm.email,
          type: `at-${newATForm.sector}`,
          sector: newATForm.sector,
          hourly_rate: newATForm.hourly_rate
        });
        
        console.log('✅ AT criado no banco de dados');
      }
      
      // Recarregar dados do banco
      const [patientsData, atsData] = await Promise.all([
        apiService.getPatients(),
        apiService.getATs()
      ]);
      setPatients(patientsData);
      setAts(atsData);
      
      // Limpar formulário
      setNewATForm({
        name: '',
        email: '',
        sector: (user?.sector || 'aba') as 'aba' | 'denver' | 'grupo' | 'escolar',
        hourly_rate: 35,
        assignedPatients: []
      });
      setEditingAT(null);
      setShowATForm(false);
      
      alert(`AT ${editingAT ? 'atualizado' : 'cadastrado'} com sucesso no banco de dados!`);
      
    } catch (error) {
      console.error(`❌ Erro ao ${editingAT ? 'atualizar' : 'criar'} AT:`, error);
      const errorMessage = (error instanceof Error) ? error.message : String(error);
      alert(`Erro ao ${editingAT ? 'atualizar' : 'cadastrar'} AT no banco de dados: ${errorMessage}`);
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

  // Handler específico para input de tempo (00:00)
  const handleTimeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Converter de HH:MM para decimal
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

    let isNewParent1 = false;
    try {
      isNewParent1 = await apiService.checkEmailNotRegistered(newPatientForm.parentEmail);
      if (isNewParent1 && !newPatientForm.parentName.trim()) {
        alert('Nome do 1º responsável é obrigatório para novo e-mail');
        return;
      }
    } catch (err) {
      console.error('Erro ao verificar e-mail do 1º responsável:', err);
      alert('Erro ao verificar e-mail do 1º responsável. Tente novamente.');
      return;
    }

    let isNewParent2 = false;
    if (newPatientForm.parentEmail2) {
      try {
        isNewParent2 = await apiService.checkEmailNotRegistered(newPatientForm.parentEmail2);
        if (isNewParent2 && !newPatientForm.parentName2.trim()) {
          alert('Nome do 2º responsável é obrigatório para novo e-mail');
          return;
        }
      } catch (err) {
        console.error('Erro ao verificar e-mail do 2º responsável:', err);
        alert('Erro ao verificar e-mail do 2º responsável. Tente novamente.');
        return;
      }
    }

    try {
      console.log(`📝 ${editingPatient ? 'Atualizando' : 'Criando'} paciente no banco de dados...`);
      
      if (!editingPatient && isNewParent1) {
        console.log('📤 Criando 1º responsável no banco...');
        await apiService.createUser({
          name: newPatientForm.parentName,
          email: newPatientForm.parentEmail,
          type: 'pais'
        });
        console.log('✅ 1º responsável criado no banco');
      }

      if (newPatientForm.parentEmail2 && isNewParent2) {
        console.log('📤 Criando 2º responsável no banco...');
        await apiService.createUser({
          name: newPatientForm.parentName2,
          email: newPatientForm.parentEmail2,
          type: 'pais'
        });
        console.log('✅ 2º responsável criado no banco');
      }

      const patientData = {
        name: newPatientForm.name,
        at_id: newPatientForm.assignedATId || null,
        sector: newPatientForm.sector,
        weekly_hours: newPatientForm.weeklyHours,
        hourly_rate: newPatientForm.hourly_rate,
        parent_email: newPatientForm.parentEmail,
        parent_name: isNewParent1 ? newPatientForm.parentName : '',
        parent_email2: newPatientForm.parentEmail2 || null,
        parent_name2: isNewParent2 ? newPatientForm.parentName2 : ''
      };

      if (editingPatient) {
        console.log('📝 Atualizando paciente no banco:', editingPatient, patientData);
        await apiService.updatePatient(editingPatient, patientData);
        console.log('✅ Paciente atualizado no banco de dados');
      } else {
        console.log('📤 Criando paciente no banco:', patientData);
        await apiService.createPatient(patientData);
        console.log('✅ Paciente criado no banco de dados');
      }

      // Recarregar dados do banco para garantir sincronização
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
        parentName2: '',
        parentEmail2: '',
        assignedATId: ''
      });
      setEditingPatient(null);
      setShowPatientForm(false);
      alert(`Paciente ${editingPatient ? 'atualizado' : 'cadastrado'} com sucesso no banco de dados!`);
    } catch (error) {
      console.error(`❌ Erro ao ${editingPatient ? 'atualizar' : 'criar'} paciente no banco:`, error);
      const errorMessage = (error instanceof Error) ? error.message : String(error);
      alert(`Erro ao ${editingPatient ? 'atualizar' : 'cadastrar'} paciente no banco de dados: ${errorMessage}`);
    }
  };

  const handleDeleteAT = async (atId: string) => {
    const atToDelete = ats.find(at => at.id === atId);
    if (!atToDelete) {
      alert('AT não encontrado');
      return;
    }

    if (window.confirm(`Tem certeza que deseja excluir o AT "${atToDelete.name}"? Os pacientes ficarão sem AT atribuído.`)) {
      try {
        console.log('🗑️ Iniciando exclusão do AT no banco:', atId);
        
        // Primeiro, remover a atribuição do AT dos pacientes no banco
        const patientsWithThisAT = patients.filter(p => p.at_id === atId);
        console.log(`📋 Encontrados ${patientsWithThisAT.length} pacientes com este AT`);
        
        // Atualizar cada paciente no banco para remover a atribuição do AT
        for (const patient of patientsWithThisAT) {
          await apiService.updatePatient(patient.id, { at_id: null });
          console.log(`✅ Paciente ${patient.name} desvinculado do AT no banco`);
        }
        
        // Agora excluir o AT do banco
        await apiService.deleteUser(atId);
        console.log('✅ AT excluído do banco de dados com sucesso');
        
        // Recarregar dados do banco para garantir sincronização
        const [patientsData, atsData] = await Promise.all([
          apiService.getPatients(),
          apiService.getATs()
        ]);
        setPatients(patientsData);
        setAts(atsData);
        
        alert('AT excluído com sucesso do banco de dados!');
      } catch (error) {
        console.error('❌ Erro ao excluir AT do banco:', error);
        alert('Erro ao excluir AT do banco de dados. Tente novamente.');
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
        parentName2: patient.parent_name2 || '',
        parentEmail2: patient.parent_email2 || '',
        assignedATId: patient.at_id || ''
      });
      setEditingPatient(patientId);
      setShowPatientForm(true);
    }
  };

  const handleDeletePatient = async (patientId: string) => {
    const patientToDelete = patients.find(p => p.id === patientId);
    if (!patientToDelete) {
      alert('Paciente não encontrado');
      return;
    }

    if (window.confirm(`Tem certeza que deseja excluir o paciente "${patientToDelete.name}"? Esta ação não pode ser desfeita.`)) {
      try {
        console.log('🗑️ Iniciando exclusão do paciente no banco:', patientId);
        
        // Excluir paciente do banco de dados
        await apiService.deletePatient(patientId);
        console.log('✅ Paciente excluído do banco de dados com sucesso');
        
        // Recarregar dados do banco para garantir sincronização
        const patientsData = await apiService.getPatients();
        setPatients(patientsData);
        
        alert('Paciente excluído com sucesso do banco de dados!');
      } catch (error) {
        console.error('❌ Erro ao excluir paciente do banco:', error);
        alert('Erro ao excluir paciente do banco de dados. Tente novamente.');
      }
    }
  };

  const handleApproveSession = async (sessionId: string) => {
    try {
      await apiService.approveSession(sessionId);
      const sessionsData = await apiService.getSessions();
      setSessions(sessionsData);
    } catch (error) {
      console.error('Erro ao aprovar sessão:', error);
      alert('Erro ao aprovar sessão');
    }
  };

  const handleLaunchSession = async (sessionId: string) => {
    try {
      await apiService.launchSession(sessionId);
      const sessionsData = await apiService.getSessions();
      setSessions(sessionsData);
    } catch (error) {
      console.error('Erro ao lançar sessão:', error);
      alert('Erro ao lançar sessão');
    }
  };

  const handleRejectSession = async (sessionId: string) => {
    if (window.confirm('Tem certeza que deseja rejeitar este atendimento?')) {
      try {
        await apiService.deleteSession(sessionId);
        const sessionsData = await apiService.getSessions();
        setSessions(sessionsData);
      } catch (error) {
        console.error('Erro ao rejeitar sessão:', error);
        alert('Erro ao rejeitar sessão');
      }
    }
  };

  const pendingSessions = sectorSessions.filter(s => !s.is_approved && !s.is_launched);
  const approvedSessions = sectorSessions.filter(s => s.is_approved && !s.is_launched);

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
                        Horas da semana: {formatHours(alert.currentWeekHours)}h / {formatHours(alert.maxWeekHours)}h
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-red-600 font-bold">
                        Excesso: {formatHours(alert.excess)}h
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cadastro de ATs */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
            <CardTitle className="text-base sm:text-lg">Gerenciar Acompanhantes Terapêuticos</CardTitle>
            <Button onClick={() => setShowATForm(!showATForm)} className="text-sm px-3 py-2">
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Novo AT</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showATForm && (
            <form onSubmit={handleATSubmit} className="space-y-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-800">
                {editingAT ? 'Editar AT' : 'Cadastrar Novo AT'}
              </h3>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                    placeholder="email@incentivar.com"
                    required
                    disabled={!!editingAT}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-purple-800 mb-2">
                    Setor
                  </label>
                  <Select
                    name="sector"
                    value={newATForm.sector}
                    onChange={handleATInputChange}
                  >
                    <option value="aba">ABA</option>
                    <option value="denver">Denver</option>
                    <option value="grupo">Grupo</option>
                    <option value="escolar">Escolar</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-purple-800 mb-2">
                    Valor por Hora de Atendimento (R$)
                  </label>
                  <Input
                    type="number"
                    name="hourly_rate"
                    value={newATForm.hourly_rate === 0 ? '' : String(newATForm.hourly_rate)}
                    onChange={handleATInputChange}
                    placeholder="35.00"
                    step="0.01"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Este valor será usado para calcular pagamentos de atendimentos
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button type="button" variant="secondary" onClick={() => {
                  setShowATForm(false);
                  setEditingAT(null);
                }}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingAT ? 'Atualizar' : 'Cadastrar'} AT
                </Button>
              </div>
            </form>
          )}

          {/* Lista de ATs */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-purple-800 mb-4">ATs Cadastrados</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHeadCell>Nome</TableHeadCell>
                    <TableHeadCell>Email</TableHeadCell>
                    <TableHeadCell>Setor</TableHeadCell>
                    <TableHeadCell>Valor/Hora</TableHeadCell>
                    <TableHeadCell>Ações</TableHeadCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sectorAts.map(at => (
                    <TableRow key={at.id}>
                      <TableCell className="font-medium">{at.name}</TableCell>
                      <TableCell>{at.email}</TableCell>
                      <TableCell className="capitalize">{at.sector}</TableCell>
                      <TableCell>R$ {(at.hourly_rate || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleEditAT(at.id)}
                            className="text-xs px-2 py-1"
                            title="Editar AT"
                          >
                            <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="sm:hidden ml-1">Editar</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDeleteAT(at.id)}
                            className="text-xs px-2 py-1"
                            title="Excluir AT"
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="sm:hidden ml-1">Excluir</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    
      {/* Cadastro de Pacientes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Gerenciar Pacientes</CardTitle>
            <Button onClick={() => setShowPatientForm(!showPatientForm)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Paciente
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showPatientForm && (
            <form onSubmit={handlePatientSubmit} className="space-y-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-800">
                {editingPatient ? 'Editar Paciente' : 'Cadastrar Novo Paciente'}
              </h3>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-purple-800 mb-2">
                    Nome Completo do Paciente *
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
                    Email do Paciente
                  </label>
                  <Input
                    type="email"
                    name="email"
                    value={newPatientForm.email}
                    onChange={handlePatientInputChange}
                    placeholder="paciente@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-purple-800 mb-2">
                    Setor
                  </label>
                  <Select
                    name="sector"
                    value={newPatientForm.sector}
                    onChange={handlePatientInputChange}
                  >
                    <option value="aba">ABA</option>
                    <option value="denver">Denver</option>
                    <option value="grupo">Grupo</option>
                    <option value="escolar">Escolar</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-purple-800 mb-2">
                    Carga Horária Semanal *
                  </label>
                  <Input
                    type="time"
                    name="weeklyHours"
                    value={hoursToTimeInput(newPatientForm.weeklyHours)}
                    onChange={handleTimeInputChange}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Formato: 06:45 para 6 horas e 45 minutos
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-purple-800 mb-2">
                    Nome do 1º Responsável *
                  </label>
                  <Input
                    name="parentName"
                    value={newPatientForm.parentName}
                    onChange={handlePatientInputChange}
                    placeholder="Nome do primeiro responsável"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Só obrigatório se for um novo e-mail de responsável
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-purple-800 mb-2">
                    Email do 1º Responsável *
                  </label>
                  <Input
                    type="email"
                    name="parentEmail"
                    value={newPatientForm.parentEmail}
                    onChange={handlePatientInputChange}
                    placeholder="responsavel1@email.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-purple-800 mb-2">
                    Nome do 2º Responsável (Opcional)
                  </label>
                  <Input
                    name="parentName2"
                    value={newPatientForm.parentName2}
                    onChange={handlePatientInputChange}
                    placeholder="Nome do segundo responsável"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-purple-800 mb-2">
                    Email do 2º Responsável (Opcional)
                  </label>
                  <Input
                    type="email"
                    name="parentEmail2"
                    value={newPatientForm.parentEmail2}
                    onChange={handlePatientInputChange}
                    placeholder="responsavel2@email.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Se preencher o nome do 2º responsável, o email também é obrigatório
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-purple-800 mb-2">
                    Valor por Hora (R$)
                  </label>
                  <Input
                    type="number"
                    name="hourly_rate"
                    value={String(newPatientForm.hourly_rate)}
                    onChange={handlePatientInputChange}
                    placeholder="60.00"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-purple-800 mb-2">
                    AT Responsável (Opcional)
                  </label>
                  <Select
                    name="assignedATId"
                    value={newPatientForm.assignedATId}
                    onChange={handlePatientInputChange}
                  >
                    <option value="">Nenhum AT atribuído</option>
                    {sectorAts.map(at => (
                      <option key={at.id} value={at.id}>
                        {at.name}
                      </option>
                    ))}
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    O AT pode ser atribuído posteriormente ao cadastrar o AT
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button type="button" variant="secondary" onClick={() => {
                  setShowPatientForm(false);
                  setEditingPatient(null);
                }}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingPatient ? 'Atualizar' : 'Cadastrar'} Paciente
                </Button>
              </div>
            </form>
          )}

          {/* Lista de Pacientes */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHeadCell>Nome</TableHeadCell>
                  <TableHeadCell>Setor</TableHeadCell>
                  <TableHeadCell>AT Responsável</TableHeadCell>
                  <TableHeadCell>Carga Semanal</TableHeadCell>
                  <TableHeadCell>Valor/Hora</TableHeadCell>
                  <TableHeadCell>Ações</TableHeadCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sectorPatients.map(patient => {
                  const at = ats.find(a => a.id === patient.at_id);
                  return (
                    <TableRow key={patient.id}>
                      <TableCell className="font-medium">{patient.name}</TableCell>
                      <TableCell>{patient.sector.toUpperCase()}</TableCell>
                      <TableCell>{at?.name || 'Não atribuído'}</TableCell>
                      <TableCell>{formatHours(patient.weekly_hours)}</TableCell>
                      <TableCell>R$ {patient.hourly_rate.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleEditPatient(patient.id)}
                          >
                            <Edit2 size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDeletePatient(patient.id)}
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
          </div>
        </CardContent>
      </Card>

      {/* Gerenciar Atendimentos */}
      <Card>
        <CardHeader>
          <CardTitle>Gerenciar Atendimentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Atendimentos Pendentes */}
            <div>
              <h3 className="text-lg font-semibold text-purple-800 mb-3">Atendimentos Pendentes de Aprovação</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHeadCell>Paciente</TableHeadCell>
                      <TableHeadCell>AT</TableHeadCell>
                      <TableHeadCell>Data</TableHeadCell>
                      <TableHeadCell>Horas</TableHeadCell>
                      <TableHeadCell>Observações</TableHeadCell>
                      <TableHeadCell>Ações</TableHeadCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingSessions.map(session => {
                      const patient = patients.find(p => p.id === session.patient_id);
                      const at = ats.find(a => a.id === session.at_id);
                      
                      return (
                        <TableRow key={session.id}>
                          <TableCell>{patient?.name || 'N/A'}</TableCell>
                          <TableCell>{at?.name || 'N/A'}</TableCell>
                          <TableCell>{formatDateBR(session.date)}</TableCell>
                          <TableCell>{formatHours(session.hours)}</TableCell>
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
                                onClick={() => handleApproveSession(session.id)}
                              >
                                <CheckCircle size={14} />
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => handleRejectSession(session.id)}
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
              </div>
              
              {pendingSessions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>Nenhum atendimento pendente de aprovação</p>
                </div>
              )}
            </div>

            {/* Atendimentos Aprovados */}
            <div>
              <h3 className="text-lg font-semibold text-purple-800 mb-3">Atendimentos Aprovados para Lançamento</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHeadCell>Paciente</TableHeadCell>
                      <TableHeadCell>AT</TableHeadCell>
                      <TableHeadCell>Data</TableHeadCell>
                      <TableHeadCell>Horas</TableHeadCell>
                      <TableHeadCell>Confirmado pelos Pais</TableHeadCell>
                      <TableHeadCell>Ações</TableHeadCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedSessions.map(session => {
                      const patient = patients.find(p => p.id === session.patient_id);
                      const at = ats.find(a => a.id === session.at_id);
                      
                      return (
                        <TableRow key={session.id}>
                          <TableCell>{patient?.name || 'N/A'}</TableCell>
                          <TableCell>{at?.name || 'N/A'}</TableCell>
                          <TableCell>{formatDateBR(session.date)}</TableCell>
                          <TableCell>{formatHours(session.hours)}</TableCell>
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
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleLaunchSession(session.id)}
                              disabled={!session.is_confirmed}
                            >
                              Lançar
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              
              {approvedSessions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>Nenhum atendimento aprovado aguardando lançamento</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Footer />
    </div>
  );
};
