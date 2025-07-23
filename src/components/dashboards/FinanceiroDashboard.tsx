import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHeadCell,    
  TableHeader,      
  TableRow 
} from '../ui/Table';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Footer } from '../ui/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { Edit2, Trash2, DollarSign, Clock, Users, CheckCircle, AlertCircle, XCircle, Eye, Download, BarChart3, Settings } from 'lucide-react';
import { formatDateBR, formatHours, formatCurrency, safeNumber, calculateHours } from '../../utils/formatters';

// Interfaces para tipagem
interface Session {
  id: string;
  patient_id: string;
  at_id: string;
  date: string;
  start_time: string;
  end_time: string;
  hours: number;
  is_confirmed: boolean;
  observations?: string;
  hourly_rate?: number;
  at_name?: string;
  at_sector?: string;
}

interface AT {
  id: string;
  name: string;
  hourly_rate: number;
  sector: string;
}

interface Patient {
  id: string;
  name: string;
  hourly_rate: number;
  sector: string;
  at_id: string | null;
}

interface Supervision {
  id: string;
  at_id: string;
  date: string;
  start_time: string;
  end_time: string;
  hours: number;
  sector: string;
  observations?: string;
}

interface PatientFinancialReport {
  id: string;
  name: string;
  sector: string;
  at_name: string;
  totalHours: number;
  confirmedHours: number;
  pendingHours: number;
  hourly_rate: number;
  confirmedValue: number;
  pendingValue: number;
  totalValue: number;
  sessionCount: number;
  confirmationRate: number;
}

interface ATFinancialReport {
  id: string;
  name: string;
  sector: string;
  sessionHours: number;
  supervisionHours: number;
  totalHours: number;
  session_rate: number;
  supervision_rate: number;
  sessionPayment: number;
  supervisionPayment: number;
  totalPayment: number;
}

interface SupervisionRates {
  aba: number;
  denver: number;
  grupo: number;
  escolar: number;
}

export const FinanceiroDashboard: React.FC = () => {
  const { user } = useAuth();
  const isFinanceiroPct = user?.type === 'financeiro-pct';
  const isFinanceiroAts = user?.type === 'financeiro-ats';

  // Verificação de acesso
  if (!user || (!isFinanceiroPct && !isFinanceiroAts)) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Acesso Negado</h2>
          <p className="text-gray-600">Esta página é restrita aos usuários do financeiro.</p>
          <p className="text-sm text-gray-500 mt-2">Tipo atual: {user?.type || 'Não definido'}</p>
        </div>
      </div>
    );
  }

  const [sessions, setSessions] = useState<Session[]>([]);
  const [ats, setAts] = useState<AT[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [supervisions, setSupervisions] = useState<Supervision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para supervisão rates
  const [supervisionRates, setSupervisionRates] = useState<SupervisionRates>({
    aba: 35,
    denver: 35,
    grupo: 35,
    escolar: 35
  });
  const [showSupervisionRatesModal, setShowSupervisionRatesModal] = useState(false);

  // Estados para filtros e busca
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Estados para modais e edição
  const [selectedPatientDetails, setSelectedPatientDetails] = useState<string | null>(null);
  const [selectedATDetails, setSelectedATDetails] = useState<string | null>(null);
  const [editingRates, setEditingRates] = useState<{ [key: string]: number }>({});
  const [showCharts, setShowCharts] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🔄 [FINANCEIRO] Carregando dados...');
        
        const [sessionsData, atsData, patientsData, supervisionsData] = await Promise.all([
          apiService.getSessions({ month: selectedMonth, year: selectedYear }).catch(err => {
            console.error('❌ Erro ao carregar sessões:', err);
            return [];
          }),
          apiService.getATs().catch(err => {
            console.error('❌ Erro ao carregar ATs:', err);
            return [];
          }),
          apiService.getPatients().catch(err => {
            console.error('❌ Erro ao carregar pacientes:', err);
            return [];
          }),
          apiService.getSupervisions({ month: selectedMonth, year: selectedYear }).catch(err => {
            console.error('❌ Erro ao carregar supervisões:', err);
            return [];
          })
        ]);
        
        setSessions(sessionsData || []);
        setAts(atsData || []);
        setPatients(patientsData || []);
        setSupervisions(supervisionsData || []);

        // Carregar taxas de supervisão do banco primeiro, depois localmente
        try {
          const savedRates = await apiService.getSupervisionRates();
          setSupervisionRates(savedRates);
        } catch (error) {
          console.error('❌ Erro ao carregar taxas do banco, usando valores locais:', error);
          const localRates = localStorage.getItem('supervisionRates');
          if (localRates) {
            setSupervisionRates(JSON.parse(localRates));
          }
        }
      } catch (error) {
        console.error('❌ [FINANCEIRO] Erro ao carregar dados:', error);
        setError('Erro ao carregar dados. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedMonth, selectedYear]);

  // Filtrar dados do mês selecionado
  const thisMonthSessions = Array.isArray(sessions) ? sessions.filter(s => {
    const sessionDate = new Date(s.date + 'T00:00:00');
    return sessionDate.getMonth() === selectedMonth - 1 && 
           sessionDate.getFullYear() === selectedYear;
  }) : [];

  const thisMonthSupervisions = Array.isArray(supervisions) ? supervisions.filter(s => {
    const supervisionDate = new Date(s.date + 'T00:00:00');
    return supervisionDate.getMonth() === selectedMonth - 1 && 
           supervisionDate.getFullYear() === selectedYear;
  }) : [];

  // Relatório financeiro para PACIENTES (financeiro-pct) - CORRIGIDO
  const getPatientFinancialReport = (): PatientFinancialReport[] => {
    if (!isFinanceiroPct || !Array.isArray(thisMonthSessions) || !Array.isArray(patients) || !Array.isArray(ats)) {
      return [];
    }

    const patientSessions = thisMonthSessions.reduce((acc, session) => {
      if (!acc[session.patient_id]) {
        acc[session.patient_id] = [];
      }
      acc[session.patient_id].push(session);
      return acc;
    }, {} as { [key: string]: Session[] });

    return Object.entries(patientSessions).map(([patientId, sessions]) => {
      const patient = patients.find(p => p.id === patientId) || {
        id: patientId,
        name: 'Paciente Desconhecido',
        hourly_rate: 0,
        sector: 'N/A',
        at_id: null
      };

      const at = ats.find(a => a.id === patient.at_id);
      
      // ✅ CORREÇÃO: Financeiro PCT não espera confirmação dos pais
      // Apenas considera se foi confirmado pela recepção (is_confirmed = true)
      const confirmedSessions = sessions.filter(s => s.is_confirmed);
      const pendingSessions = sessions.filter(s => !s.is_confirmed);

      const confirmedHours = confirmedSessions.reduce((sum, s) => sum + calculateHours(s.start_time, s.end_time), 0);
      const pendingHours = pendingSessions.reduce((sum, s) => sum + calculateHours(s.start_time, s.end_time), 0);
      const totalHours = confirmedHours + pendingHours;

      const hourlyRate = safeNumber(patient.hourly_rate);
      const confirmedValue = confirmedHours * hourlyRate;
      const pendingValue = pendingHours * hourlyRate;
      const totalValue = totalHours * hourlyRate;

      // Taxa de confirmação baseada na recepção, não nos pais
      const confirmationRate = sessions.length > 0 ? (confirmedSessions.length / sessions.length) * 100 : 0;

      return {
        id: patient.id,
        name: patient.name,
        sector: patient.sector,
        at_name: at?.name || 'N/A',
        totalHours,
        confirmedHours,
        pendingHours,
        hourly_rate: hourlyRate,
        confirmedValue,
        pendingValue,
        totalValue,
        sessionCount: sessions.length,
        confirmationRate
      };
    }).filter(report => report.totalHours > 0);
  };

  // Relatório financeiro para ATs (financeiro-ats)
  const getATFinancialReport = (): ATFinancialReport[] => {
    if (!isFinanceiroAts || !Array.isArray(ats) || !Array.isArray(thisMonthSessions) || !Array.isArray(thisMonthSupervisions)) {
      return [];
    }

    return ats.map(at => {
      const atConfirmedSessions = thisMonthSessions.filter(s => s.at_id === at.id && s.is_confirmed);
      const atSupervisions = thisMonthSupervisions.filter(s => s.at_id === at.id);

      const sessionHours = atConfirmedSessions.reduce((sum, s) => sum + calculateHours(s.start_time, s.end_time), 0);
      const supervisionHours = atSupervisions.reduce((sum, s) => sum + safeNumber(s.hours), 0);
      const totalHours = sessionHours + supervisionHours;

      const session_rate = safeNumber(at.hourly_rate);
      const supervision_rate = supervisionRates[at.sector as keyof SupervisionRates] || 35;
      
      const sessionPayment = sessionHours * session_rate;
      const supervisionPayment = supervisionHours * supervision_rate;
      const totalPayment = sessionPayment + supervisionPayment;

      return {
        id: at.id,
        name: at.name,
        sector: at.sector,
        sessionHours,
        supervisionHours,
        totalHours,
        session_rate,
        supervision_rate,
        sessionPayment,
        supervisionPayment,
        totalPayment
      };
    }).filter(report => report.totalHours > 0);
  };

  const handleUpdatePatientRate = async (patientId: string, newRate: number) => {
    try {
      if (!patientId || isNaN(newRate) || newRate < 0) {
        alert('Dados inválidos para atualização');
        return;
      }
      
      await apiService.updatePatient(patientId, { hourly_rate: newRate });
      const patientsData = await apiService.getPatients();
      setPatients(patientsData || []);
      setEditingRates(prev => ({ ...prev, [patientId]: newRate }));
    } catch (error) {
      console.error('Erro ao atualizar valor:', error);
      alert('Erro ao atualizar valor por hora do paciente');
    }
  };

  const handleUpdateATRate = async (atId: string, newRate: number) => {
    try {
      if (!atId || isNaN(newRate) || newRate < 0) {
        alert('Dados inválidos para atualização');
        return;
      }
      
      await apiService.updateUser(atId, { hourly_rate: newRate });
      const atsData = await apiService.getATs();
      setAts(atsData || []);
      setEditingRates(prev => ({ ...prev, [atId]: newRate }));
    } catch (error) {
      console.error('Erro ao atualizar valor:', error);
      alert('Erro ao atualizar valor por hora do AT');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!sessionId) return;
    
    if (window.confirm('Tem certeza que deseja excluir este atendimento?')) {
      try {
        await apiService.deleteSession(sessionId);
        const sessionsData = await apiService.getSessions({ month: selectedMonth, year: selectedYear });
        setSessions(sessionsData || []);
      } catch (error) {
        console.error('Erro ao excluir sessão:', error);
        alert('Erro ao excluir sessão');
      }
    }
  };

  const handleDeleteSupervision = async (supervisionId: string) => {
    if (!supervisionId) return;
    
    if (window.confirm('Tem certeza que deseja excluir esta supervisão?')) {
      try {
        await apiService.deleteSupervision(supervisionId);
        const supervisionsData = await apiService.getSupervisions({ month: selectedMonth, year: selectedYear });
        setSupervisions(supervisionsData || []);
      } catch (error) {
        console.error('Erro ao excluir supervisão:', error);
        alert('Erro ao excluir supervisão');
      }
    }
  };

  const handleSaveSupervisionRates = async () => {
    try {
      // Salvar no banco de dados via API
      await apiService.saveSupervisionRates(supervisionRates);
      
      // Salvar localmente como backup
      localStorage.setItem('supervisionRates', JSON.stringify(supervisionRates));
      
      setShowSupervisionRatesModal(false);
      alert('Valores de supervisão atualizados com sucesso no banco de dados!');
    } catch (error) {
      console.error('❌ Erro ao salvar valores de supervisão:', error);
      
      // Em caso de erro na API, salvar pelo menos localmente
      localStorage.setItem('supervisionRates', JSON.stringify(supervisionRates));
      setShowSupervisionRatesModal(false);
      
      alert('Valores salvos localmente. Erro ao sincronizar com o banco de dados.');
    }
  };

  const generatePDF = () => {
    const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    
    if (isFinanceiroPct) {
      const patientData = filteredPatientReport.map(p => ({
        'Paciente': p.name,
        'Setor': p.sector.toUpperCase(),
        'AT': p.at_name,
        'Horas Confirmadas': formatHours(p.confirmedHours),
        'Horas Pendentes': formatHours(p.pendingHours),
        'Total Horas': formatHours(p.totalHours),
        'Valor/Hora': formatCurrency(p.hourly_rate),
        'Valor Confirmado': formatCurrency(p.confirmedValue),
        'Valor Pendente': formatCurrency(p.pendingValue),
        'Total a Cobrar': formatCurrency(p.totalValue),
        'Taxa Confirmação': `${p.confirmationRate.toFixed(1)}%`
      }));
      
      const csvContent = [
        ['RELATÓRIO DE COBRANÇA AOS PAIS - ' + monthName.toUpperCase()],
        [''],
        ['RESUMO:'],
        ['Total Confirmado:', formatCurrency(totalConfirmedRevenue)],
        ['Total Pendente:', formatCurrency(totalPendingRevenue)],
        ['TOTAL GERAL A COBRAR:', formatCurrency(totalRevenue)],
        ['Total de Horas:', formatHours(totalHours)],
        [''],
        ['DETALHAMENTO:'],
        Object.keys(patientData[0] || {}),
        ...patientData.map(row => Object.values(row))
      ].map(row => Array.isArray(row) ? row.join(',') : row).join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `relatorio-cobranca-${selectedMonth}-${selectedYear}.csv`;
      link.click();
    } else {
      const atData = filteredATReport.map(at => ({
        'AT': at.name,
        'Setor': at.sector.toUpperCase(),
        'Horas Atendimento': formatHours(at.sessionHours),
        'Horas Supervisão': formatHours(at.supervisionHours),
        'Total Horas': formatHours(at.totalHours),
        'Valor/Hora Atendimento': formatCurrency(at.session_rate),
        'Valor/Hora Supervisão': formatCurrency(at.supervision_rate),
        'Pagamento Atendimento': formatCurrency(at.sessionPayment),
        'Pagamento Supervisão': formatCurrency(at.supervisionPayment),
        'TOTAL A PAGAR': formatCurrency(at.totalPayment)
      }));
      
      const csvContent = [
        ['RELATÓRIO DE PAGAMENTO AOS ATS - ' + monthName.toUpperCase()],
        [''],
        ['RESUMO:'],
        ['Total Pagamentos:', formatCurrency(totalATPayments)],
        ['Total Horas:', formatHours(totalATHours)],
        [''],
        ['DETALHAMENTO:'],
        Object.keys(atData[0] || {}),
        ...atData.map(row => Object.values(row))
      ].map(row => Array.isArray(row) ? row.join(',') : row).join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `relatorio-pagamento-ats-${selectedMonth}-${selectedYear}.csv`;
      link.click();
    }
  };

  const patientReport = getPatientFinancialReport();
  const atReport = getATFinancialReport();

  // Filtros - com verificação de segurança
  const filteredPatientReport = patientReport.filter(p =>
    p?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false
  );

  const filteredATReport = atReport.filter(at =>
    at?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false
  );

  // Estatísticas
  const totalConfirmedRevenue = filteredPatientReport.reduce((sum, p) => sum + safeNumber(p.confirmedValue), 0);
  const totalPendingRevenue = filteredPatientReport.reduce((sum, p) => sum + safeNumber(p.pendingValue), 0);
  const totalRevenue = totalConfirmedRevenue + totalPendingRevenue;
  const totalHours = filteredPatientReport.reduce((sum, p) => sum + safeNumber(p.totalHours), 0);
  
  const totalATPayments = filteredATReport.reduce((sum, at) => sum + safeNumber(at.totalPayment), 0);
  const totalConfirmedHours = filteredPatientReport.reduce((sum, p) => sum + safeNumber(p.confirmedHours), 0);
  const totalPendingHours = filteredPatientReport.reduce((sum, p) => sum + safeNumber(p.pendingHours), 0);
  const totalATHours = filteredATReport.reduce((sum, at) => sum + safeNumber(at.totalHours), 0);
  const riskPatients = filteredPatientReport.filter(p => (p.pendingHours || 0) > 10 || (p.confirmationRate || 0) < 50).length;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Carregando dados financeiros...</p>
          <p className="text-sm text-gray-500">
            {isFinanceiroPct ? 'Preparando relatórios de cobrança' : 'Preparando relatórios de pagamento'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="text-center">
          <p className="text-lg text-red-600">{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Filtros de Período */}
      <Card>
        <CardHeader>
          <CardTitle>
            {isFinanceiroPct ? 'Financeiro - Cobrança aos Pais' : 'Financeiro - Pagamento aos ATs'}
          </CardTitle>
          {isFinanceiroPct && (
//             <div className="bg-blue-50 p-3 rounded-lg mt-3">
// {/*               <p className="text-sm text-blue-800 font-medium">
//                 ✅ <strong>Aguarda apenas confirmação da recepção</strong> - Os pais apenas visualizam os atendimentos.
//               </p> */}
//             </div>
          )}
        </CardHeader>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar {isFinanceiroPct ? 'Paciente' : 'AT'}
              </label>
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Digite o nome do ${isFinanceiroPct ? 'paciente' : 'AT'}...`}
                className="w-64"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ações</label>
              <div className="flex space-x-2">
                {isFinanceiroAts && (
                  <Button
                    onClick={() => setShowSupervisionRatesModal(true)}
                    variant="secondary"
                    className="flex items-center space-x-2"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Config. Supervisão</span>
                  </Button>
                )}
                <Button
                  onClick={() => setShowCharts(!showCharts)}
                  variant="secondary"
                  className="flex items-center space-x-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>{showCharts ? 'Ocultar' : 'Mostrar'} Gráficos</span>
                </Button>
                <Button
                  onClick={generatePDF}
                  variant="secondary"
                  className="flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Exportar CSV</span>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center space-x-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">
                {isFinanceiroPct ? 'Total a Cobrar' : 'Total a Pagar'}
              </p>
              <p className="text-2xl font-bold text-purple-700">
                {formatCurrency(isFinanceiroPct ? totalRevenue : totalATPayments)}
              </p>
              {isFinanceiroPct && (
                <p className="text-xs text-gray-500">
                  Confirmado: {formatCurrency(totalConfirmedRevenue)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Horas Totais</p>
              <p className="text-2xl font-bold text-purple-700">
                {formatHours(isFinanceiroPct ? totalHours : totalATHours)}
              </p>
              {isFinanceiroPct && (
                <p className="text-xs text-gray-500">
                  Pendentes: {formatHours(totalPendingHours)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center space-x-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">
                {isFinanceiroPct ? 'Pacientes' : 'ATs Ativos'}
              </p>
              <p className="text-2xl font-bold text-purple-700">
                {isFinanceiroPct ? filteredPatientReport.length : filteredATReport.length}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center space-x-4">
            <div className={`p-3 rounded-lg ${isFinanceiroPct && riskPatients > 0 ? 'bg-red-100' : 'bg-teal-100'}`}>
              {isFinanceiroPct && riskPatients > 0 ? (
                <AlertCircle className="w-6 h-6 text-red-600" />
              ) : (
                <CheckCircle className="w-6 h-6 text-teal-600" />
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600">
                {isFinanceiroPct ? 'Pacientes Risco' : 'Sessões Mês'}
              </p>
              <p className="text-2xl font-bold text-purple-700">
                {isFinanceiroPct ? riskPatients : thisMonthSessions.length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Configuração de Valores de Supervisão */}
      {showSupervisionRatesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-purple-800">
                Configurar Valores de Supervisão
              </h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowSupervisionRatesModal(false)}
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ABA - Valor por hora de supervisão
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={supervisionRates.aba}
                  onChange={(e) => setSupervisionRates(prev => ({ ...prev, aba: Number(e.target.value) }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Denver - Valor por hora de supervisão
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={supervisionRates.denver}
                  onChange={(e) => setSupervisionRates(prev => ({ ...prev, denver: Number(e.target.value) }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grupo - Valor por hora de supervisão
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={supervisionRates.grupo}
                  onChange={(e) => setSupervisionRates(prev => ({ ...prev, grupo: Number(e.target.value) }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Escolar - Valor por hora de supervisão
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={supervisionRates.escolar}
                  onChange={(e) => setSupervisionRates(prev => ({ ...prev, escolar: Number(e.target.value) }))}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 p-6 border-t">
              <Button
                variant="secondary"
                onClick={() => setShowSupervisionRatesModal(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleSaveSupervisionRates}>
                Salvar Configurações
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Gráficos Simples */}
      {showCharts && (
        <Card>
          <CardHeader>
            <CardTitle>Visualizações</CardTitle>
          </CardHeader>
          <CardContent>
            {isFinanceiroPct ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Gráfico de Receitas */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-4">Receitas por Status</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-green-500 rounded"></div>
                        <span className="text-sm">Confirmado (Recepção)</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(totalConfirmedRevenue)}</div>
                        <div className="text-xs text-gray-500">{formatHours(totalConfirmedHours)}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-orange-500 rounded"></div>
                        <span className="text-sm">Pendente (Recepção)</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(totalPendingRevenue)}</div>
                        <div className="text-xs text-gray-500">{formatHours(totalPendingHours)}</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div 
                        className="bg-green-500 h-4 rounded-l-full" 
                        style={{ 
                          width: `${((totalConfirmedRevenue / (totalConfirmedRevenue + totalPendingRevenue)) * 100) || 0}%` 
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 text-center">
                      {(((totalConfirmedRevenue / (totalConfirmedRevenue + totalPendingRevenue)) * 100) || 0).toFixed(1)}% Confirmado
                    </div>
                  </div>
                </div>

                {/* Top 5 Pacientes */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-4">Top 5 Pacientes (Valor Total)</h4>
                  <div className="space-y-3">
                    {filteredPatientReport
                      .sort((a, b) => (b.confirmedValue + b.pendingValue) - (a.confirmedValue + a.pendingValue))
                      .slice(0, 5)
                      .map((patient, index) => (
                        <div key={patient.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </div>
                            <span className="text-sm font-medium">{patient.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-sm">{formatCurrency(patient.confirmedValue + patient.pendingValue)}</div>
                            <div className="text-xs text-gray-500">{formatHours(patient.totalHours)}</div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Gráfico de Pagamentos */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-4">Pagamentos por Tipo</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-blue-500 rounded"></div>
                        <span className="text-sm">Atendimentos</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(filteredATReport.reduce((sum, at) => sum + at.sessionPayment, 0))}</div>
                        <div className="text-xs text-gray-500">{formatHours(filteredATReport.reduce((sum, at) => sum + at.sessionHours, 0))}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-purple-500 rounded"></div>
                        <span className="text-sm">Supervisões</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(filteredATReport.reduce((sum, at) => sum + at.supervisionPayment, 0))}</div>
                        <div className="text-xs text-gray-500">{formatHours(filteredATReport.reduce((sum, at) => sum + at.supervisionHours, 0))}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top 5 ATs */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-4">Top 5 ATs (Total Pagamento)</h4>
                  <div className="space-y-3">
                    {filteredATReport
                      .sort((a, b) => b.totalPayment - a.totalPayment)
                      .slice(0, 5)
                      .map((at, index) => (
                        <div key={at.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </div>
                            <span className="text-sm font-medium">{at.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-sm">{formatCurrency(at.totalPayment)}</div>
                            <div className="text-xs text-gray-500">{formatHours(at.totalHours)}</div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* RELATÓRIO PARA FINANCEIRO PCT (Cobrança aos Pais) */}
      {isFinanceiroPct && (
        <>
          {/* Resumo Total */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo de Cobrança - {new Date(selectedYear, selectedMonth - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">💰 Total a Cobrar (Confirmado)</h4>
                  <p className="text-3xl font-bold text-green-600">{formatCurrency(totalConfirmedRevenue)}</p>
                  <p className="text-sm text-green-700">{formatHours(totalConfirmedHours)} confirmadas pela recepção</p>
                </div>
                
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-800 mb-2">⏳ Aguardando Recepção</h4>
                  <p className="text-3xl font-bold text-orange-600">{formatCurrency(totalPendingRevenue)}</p>
                  <p className="text-sm text-orange-700">{formatHours(totalPendingHours)} pendentes</p>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">📊 Total Geral a Cobrar</h4>
                  <p className="text-3xl font-bold text-blue-600">{formatCurrency(totalRevenue)}</p>
                  <p className="text-sm text-blue-700">{formatHours(totalHours)} totais</p>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-800 mb-2">🕒 Total de Horas</h4>
                  <p className="text-3xl font-bold text-purple-600">{formatHours(totalHours)}</p>
                  <p className="text-sm text-purple-700">
                    Confirmadas: {formatHours(totalConfirmedHours)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {riskPatients > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600 flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5" />
                  <span>Pacientes em Situação de Risco</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800">
                    <strong>{riskPatients} paciente(s)</strong> com muitas horas pendentes (&gt;10h) ou baixa taxa de confirmação (&lt;50%).
                    É necessário entrar em contato com a recepção.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Detalhamento por Paciente</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHeadCell>Paciente</TableHeadCell>
                    <TableHeadCell>Setor</TableHeadCell>
                    <TableHeadCell>AT</TableHeadCell>
                    <TableHeadCell>H. Confirmadas</TableHeadCell>
                    <TableHeadCell>H. Pendentes</TableHeadCell>
                    <TableHeadCell>Total Horas</TableHeadCell>
                    <TableHeadCell>Valor/Hora</TableHeadCell>
                    <TableHeadCell>Valor Confirmado</TableHeadCell>
                    <TableHeadCell>Valor Pendente</TableHeadCell>
                    <TableHeadCell>Total a Cobrar</TableHeadCell>
                    <TableHeadCell>Taxa Confirm.</TableHeadCell>
                    <TableHeadCell>Status</TableHeadCell>
                    <TableHeadCell>Ações</TableHeadCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatientReport.map(patient => {
                    const isRisk = safeNumber(patient.pendingHours) > 10 || safeNumber(patient.confirmationRate) < 50;
                    
                    return (
                      <TableRow key={patient.id} className={isRisk ? 'bg-red-50' : ''}>
                        <TableCell className="font-medium">{patient.name}</TableCell>
                        <TableCell className="uppercase text-sm">{patient.sector}</TableCell>
                        <TableCell>{patient.at_name}</TableCell>
                        <TableCell className="text-green-600 font-medium">
                          {formatHours(patient.confirmedHours)}
                        </TableCell>
                        <TableCell className="text-orange-600 font-medium">
                          {formatHours(patient.pendingHours)}
                        </TableCell>
                        <TableCell className="font-bold text-purple-600">
                          {formatHours(patient.totalHours)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span>{formatCurrency(patient.hourly_rate)}</span>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                const newRate = prompt('Novo valor por hora:', patient.hourly_rate.toString());
                                if (newRate && !isNaN(Number(newRate))) {
                                  handleUpdatePatientRate(patient.id, Number(newRate));
                                }
                              }}
                            >
                              <Edit2 size={12} />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="font-bold text-green-600">
                          {formatCurrency(patient.confirmedValue)}
                        </TableCell>
                        <TableCell className="text-orange-600">
                          {formatCurrency(patient.pendingValue)}
                        </TableCell>
                        <TableCell className="font-bold text-blue-600 text-lg">
                          {formatCurrency(patient.totalValue)}
                        </TableCell>
                        <TableCell>
                          <span className={`font-medium ${
                            safeNumber(patient.confirmationRate) >= 80 ? 'text-green-600' :
                            safeNumber(patient.confirmationRate) >= 50 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {safeNumber(patient.confirmationRate).toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            safeNumber(patient.pendingHours) === 0 
                              ? 'bg-green-100 text-green-800' 
                              : safeNumber(patient.pendingHours) > 10
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {safeNumber(patient.pendingHours) === 0 ? 'OK' : 
                             safeNumber(patient.pendingHours) > 10 ? 'Crítico' : 'Atenção'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setSelectedPatientDetails(patient.id)}
                            title="Ver detalhes das sessões"
                          >
                            <Eye size={14} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* RELATÓRIO PARA FINANCEIRO ATS (Pagamento aos ATs) */}
      {isFinanceiroAts && (
        <>
          {/* Resumo Total */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo de Pagamento - {new Date(selectedYear, selectedMonth - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">💼 Total Atendimentos</h4>
                  <p className="text-3xl font-bold text-blue-600">
                    {formatCurrency(filteredATReport.reduce((sum, at) => sum + safeNumber(at.sessionPayment), 0))}
                  </p>
                  <p className="text-sm text-blue-700">
                    {formatHours(filteredATReport.reduce((sum, at) => sum + safeNumber(at.sessionHours), 0))} de atendimento
                  </p>
                </div>
                
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-800 mb-2">👨‍🏫 Total Supervisões</h4>
                  <p className="text-3xl font-bold text-purple-600">
                    {formatCurrency(filteredATReport.reduce((sum, at) => sum + safeNumber(at.supervisionPayment), 0))}
                  </p>
                  <p className="text-sm text-purple-700">
                    {formatHours(filteredATReport.reduce((sum, at) => sum + safeNumber(at.supervisionHours), 0))} de supervisão
                  </p>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">💰 Total Geral a Pagar</h4>
                  <p className="text-3xl font-bold text-green-600">{formatCurrency(totalATPayments)}</p>
                  <p className="text-sm text-green-700">{formatHours(totalATHours)} totais</p>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-800 mb-2">🕒 Total de Horas</h4>
                  <p className="text-3xl font-bold text-orange-600">{formatHours(totalATHours)}</p>
                  <p className="text-sm text-orange-700">
                    Atend: {formatHours(filteredATReport.reduce((sum, at) => sum + safeNumber(at.sessionHours), 0))} | 
                    Superv: {formatHours(filteredATReport.reduce((sum, at) => sum + safeNumber(at.supervisionHours), 0))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detalhamento por AT</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHeadCell>AT</TableHeadCell>
                    <TableHeadCell>Setor</TableHeadCell>
                    <TableHeadCell>H. Atendimento</TableHeadCell>
                    <TableHeadCell>H. Supervisão</TableHeadCell>
                    <TableHeadCell>Total Horas</TableHeadCell>
                    <TableHeadCell>Valor/H Atend.</TableHeadCell>
                    <TableHeadCell>Valor/H Superv.</TableHeadCell>
                    <TableHeadCell>Pag. Atendimento</TableHeadCell>
                    <TableHeadCell>Pag. Supervisão</TableHeadCell>
                    <TableHeadCell>Total a Pagar</TableHeadCell>
                    <TableHeadCell>Ações</TableHeadCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredATReport.map(at => (
                    <TableRow key={at.id}>
                      <TableCell className="font-medium">{at.name}</TableCell>
                      <TableCell className="uppercase text-sm">{at.sector}</TableCell>
                      <TableCell className="text-blue-600">
                        {formatHours(at.sessionHours)}
                      </TableCell>
                      <TableCell className="text-purple-600">
                        {formatHours(at.supervisionHours)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatHours(at.totalHours)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span>{formatCurrency(at.session_rate)}</span>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              const newRate = prompt('Novo valor por hora de atendimento:', at.session_rate.toString());
                              if (newRate && !isNaN(Number(newRate))) {
                                handleUpdateATRate(at.id, Number(newRate));
                              }
                            }}
                          >
                            <Edit2 size={12} />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(at.supervision_rate)}
                      </TableCell>
                      <TableCell className="text-blue-600">
                        {formatCurrency(at.sessionPayment)}
                      </TableCell>
                      <TableCell className="text-purple-600">
                        {formatCurrency(at.supervisionPayment)}
                      </TableCell>
                      <TableCell className="font-bold text-green-600 text-lg">
                        {formatCurrency(at.totalPayment)}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setSelectedATDetails(at.id)}
                          title="Ver detalhes das sessões do AT"
                        >
                          <Eye size={14} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Detalhamento dos Atendimentos */}
      <Card>
        <CardHeader>
          <CardTitle>
            Detalhamento dos Atendimentos - {new Date(selectedYear, selectedMonth - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeadCell>Data</TableHeadCell>
                <TableHeadCell>Paciente</TableHeadCell>
                <TableHeadCell>AT</TableHeadCell>
                <TableHeadCell>Setor</TableHeadCell>
                <TableHeadCell>Início</TableHeadCell>
                <TableHeadCell>Fim</TableHeadCell>
                <TableHeadCell>Horas</TableHeadCell>
                <TableHeadCell>Valor Total</TableHeadCell>
                <TableHeadCell>Status</TableHeadCell>
                <TableHeadCell>Observações</TableHeadCell>
                <TableHeadCell>Ações</TableHeadCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {thisMonthSessions
                .filter(session => {
                  const patient = patients.find(p => p.id === session.patient_id);
                  const at = ats.find(a => a.id === session.at_id);
                  const searchTarget = isFinanceiroPct ? patient?.name : at?.name;
                  return searchTarget?.toLowerCase().includes(searchTerm.toLowerCase()) || searchTerm === '';
                })
                .map(session => {
                  const patient = patients.find(p => p.id === session.patient_id);
                  const at = ats.find(a => a.id === session.at_id);
                  const rate = isFinanceiroPct ? safeNumber(patient?.hourly_rate) : safeNumber(at?.hourly_rate);
                  const hours = calculateHours(session.start_time, session.end_time);
                  const total = hours * rate;
                  
                  return (
                    <TableRow key={session.id}>
                      <TableCell>{formatDateBR(session.date)}</TableCell>
                      <TableCell className="font-medium">{patient?.name || 'N/A'}</TableCell>
                      <TableCell>{at?.name || 'N/A'}</TableCell>
                      <TableCell className="uppercase text-sm">{patient?.sector || at?.sector || 'N/A'}</TableCell>
                      <TableCell>{session.start_time}</TableCell>
                      <TableCell>{session.end_time}</TableCell>
                      <TableCell>{formatHours(hours)}</TableCell>
                      <TableCell className="font-semibold text-green-600">
                        {formatCurrency(total)}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          session.is_confirmed 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {session.is_confirmed ? '✅ Confirmado' : '⏳ Pendente'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate" title={session.observations}>
                          {session.observations || 'Sem observações'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDeleteSession(session.id)}
                          title="Excluir sessão"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detalhamento das Supervisões - APENAS para Financeiro ATS */}
      {isFinanceiroAts && (
        <Card>
          <CardHeader>
            <CardTitle>
              Detalhamento das Supervisões - {new Date(selectedYear, selectedMonth - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHeadCell>Data</TableHeadCell>
                  <TableHeadCell>AT</TableHeadCell>
                  <TableHeadCell>Setor</TableHeadCell>
                  <TableHeadCell>Início</TableHeadCell>
                  <TableHeadCell>Fim</TableHeadCell>
                  <TableHeadCell>Horas</TableHeadCell>
                  <TableHeadCell>Valor/Hora</TableHeadCell>
                  <TableHeadCell>Total</TableHeadCell>
                  <TableHeadCell>Ações</TableHeadCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {thisMonthSupervisions
                  .filter(supervision => {
                    const at = ats.find(a => a.id === supervision.at_id);
                    return at?.name.toLowerCase().includes(searchTerm.toLowerCase()) || searchTerm === '';
                  })
                  .map(supervision => {
                    const at = ats.find(a => a.id === supervision.at_id);
                    const supervision_rate = supervisionRates[supervision.sector as keyof SupervisionRates] || 35;
                    const hours = safeNumber(supervision.hours);
                    const total = hours * supervision_rate;
                    
                    return (
                      <TableRow key={supervision.id}>
                        <TableCell>{formatDateBR(supervision.date)}</TableCell>
                        <TableCell className="font-medium">{at?.name || 'N/A'}</TableCell>
                        <TableCell className="uppercase text-sm">{supervision.sector}</TableCell>
                        <TableCell>{supervision.start_time}</TableCell>
                        <TableCell>{supervision.end_time}</TableCell>
                        <TableCell>{formatHours(hours)}</TableCell>
                        <TableCell>{formatCurrency(supervision_rate)}</TableCell>
                        <TableCell className="font-bold text-green-600">
                          {formatCurrency(total)}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDeleteSupervision(supervision.id)}
                            title="Excluir supervisão"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
            
            {thisMonthSupervisions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>Nenhuma supervisão registrada neste período</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal de Detalhes do Paciente */}
      {selectedPatientDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-purple-800">
                Detalhes das Sessões - {patients.find(p => p.id === selectedPatientDetails)?.name}
              </h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedPatientDetails(null)}
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHeadCell>Data</TableHeadCell>
                    <TableHeadCell>AT</TableHeadCell>
                    <TableHeadCell>Início</TableHeadCell>
                    <TableHeadCell>Fim</TableHeadCell>
                    <TableHeadCell>Horas</TableHeadCell>
                    <TableHeadCell>Valor</TableHeadCell>
                    <TableHeadCell>Status</TableHeadCell>
                    <TableHeadCell>Observações</TableHeadCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {thisMonthSessions
                    .filter(s => s.patient_id === selectedPatientDetails)
                    .map(session => {
                      const at = ats.find(a => a.id === session.at_id);
                      const patient = patients.find(p => p.id === selectedPatientDetails);
                      const hours = calculateHours(session.start_time, session.end_time);
                      const value = hours * safeNumber(patient?.hourly_rate);
                      
                      return (
                        <TableRow key={session.id}>
                          <TableCell>{formatDateBR(session.date)}</TableCell>
                          <TableCell>{at?.name || 'N/A'}</TableCell>
                          <TableCell>{session.start_time}</TableCell>
                          <TableCell>{session.end_time}</TableCell>
                          <TableCell>{formatHours(hours)}</TableCell>
                          <TableCell>{formatCurrency(value)}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              session.is_confirmed 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-orange-100 text-orange-800'
                            }`}>
                             {session.is_confirmed ? '✅ Confirmado' : '⏳ Pendente'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs truncate" title={session.observations}>
                              {session.observations || 'Sem observações'}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes do AT */}
      {selectedATDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-purple-800">
                Detalhes das Sessões - {ats.find(a => a.id === selectedATDetails)?.name}
              </h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedATDetails(null)}
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHeadCell>Data</TableHeadCell>
                    <TableHeadCell>Paciente</TableHeadCell>
                    <TableHeadCell>Início</TableHeadCell>
                    <TableHeadCell>Fim</TableHeadCell>
                    <TableHeadCell>Horas</TableHeadCell>
                    <TableHeadCell>Valor</TableHeadCell>
                    <TableHeadCell>Status</TableHeadCell>
                    <TableHeadCell>Observações</TableHeadCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {thisMonthSessions
                    .filter(s => s.at_id === selectedATDetails)
                    .map(session => {
                      const patient = patients.find(p => p.id === session.patient_id);
                      const at = ats.find(a => a.id === selectedATDetails);
                      const hours = calculateHours(session.start_time, session.end_time);
                      const value = hours * safeNumber(at?.hourly_rate);
                      
                      return (
                        <TableRow key={session.id}>
                          <TableCell>{formatDateBR(session.date)}</TableCell>
                          <TableCell>{patient?.name || 'N/A'}</TableCell>
                          <TableCell>{session.start_time}</TableCell>
                          <TableCell>{session.end_time}</TableCell>
                          <TableCell>{formatHours(hours)}</TableCell>
                          <TableCell>{formatCurrency(value)}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              session.is_confirmed 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-orange-100 text-orange-800'
                            }`}>
                             {session.is_confirmed ? '✅ Confirmado' : '⏳ Pendente'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs truncate" title={session.observations}>
                              {session.observations || 'Sem observações'}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};
