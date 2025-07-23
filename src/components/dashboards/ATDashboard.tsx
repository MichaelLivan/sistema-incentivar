import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Footer } from '../ui/Footer';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHeadCell } from '../ui/Table';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { Clock, Calendar, User, AlertCircle, X, Search, BookOpen, Users } from 'lucide-react';
import { formatHours } from '../../utils/formatters';

export const ATDashboard: React.FC = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [allSectorPatients, setAllSectorPatients] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [supervisions, setSupervisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('atendimentos'); // 'atendimentos' ou 'supervisoes'
  
  // Estados para atendimentos
  const [sessionForm, setSessionForm] = useState({
    patientId: '',
    startTime: '',
    endTime: '',
    date: (() => {
      const today = new Date();
      return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    })(),
    observations: '',
    isSubstitution: false,
  });

  // Estados para supervisões
  const [supervisionForm, setSupervisionForm] = useState({
    startTime: '',
    endTime: '',
    date: (() => {
      const today = new Date();
      return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    })(),
    observations: '',
  });

  const [showSubstitutionModal, setShowSubstitutionModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [supervisionSubmitting, setSupervisionSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        console.log('🔍 CARREGANDO DADOS...');
        const [myPatientsData, allSectorPatientsData, sessionsData, supervisionsData] = await Promise.all([
          apiService.getPatients(), // Meus pacientes
          apiService.getPatientsForSubstitution(), // Todos do setor
          apiService.getSessions(),
          apiService.getSupervisions()
        ]);
        
        console.log('📊 DADOS CARREGADOS:');
        console.log('- Meus pacientes:', myPatientsData.length);
        console.log('- Todos do setor:', allSectorPatientsData.length);
        console.log('- Supervisões:', supervisionsData.length);
        
        setPatients(myPatientsData);
        setAllSectorPatients(allSectorPatientsData);
        setSessions(sessionsData);
        setSupervisions(supervisionsData);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const myPatients = patients;
  const sectorPatients = allSectorPatients;

  // Filtrar pacientes baseado na pesquisa
  const filteredSectorPatients = sectorPatients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.sector.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calculateHours = (start, end) => {
    if (!start || !end) return 0;
    const startParts = start.split(':');
    const endParts = end.split(':');
    const startHour = parseInt(startParts[0]) || 0;
    const startMin = parseInt(startParts[1]) || 0;
    const endHour = parseInt(endParts[0]) || 0;
    const endMin = parseInt(endParts[1]) || 0;
    const startTotalMinutes = startHour * 60 + startMin;
    const endTotalMinutes = endHour * 60 + endMin;
    const diffMinutes = Math.max(0, endTotalMinutes - startTotalMinutes);
    return diffMinutes / 60;
  };

  // Handlers para Atendimentos
  const handleSessionInputChange = (e) => {
    const { name, value, type } = e.target;
    const checked = e.target.checked;
    
    setSessionForm(prev => {
      const newForm = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };

      if (name === 'isSubstitution' && checked) {
        setShowSubstitutionModal(true);
        setSearchTerm('');
        newForm.patientId = '';
      }
      
      if (name === 'isSubstitution' && !checked) {
        setShowSubstitutionModal(false);
        setSearchTerm('');
        newForm.patientId = '';
      }

      return newForm;
    });
  };

  const handleSubstitutionPatientSelect = (patientId) => {
    setSessionForm(prev => ({ ...prev, patientId }));
    setShowSubstitutionModal(false);
    setSearchTerm('');
  };

  const handleSessionSubmit = (e) => {
    e.preventDefault();
    
    if (!sessionForm.patientId) {
      alert('Por favor, selecione um paciente');
      return;
    }

    const createSession = async () => {
      try {
        await apiService.createSession({
          patient_id: sessionForm.patientId,
          start_time: sessionForm.startTime,
          end_time: sessionForm.endTime,
          date: sessionForm.date,
          observations: sessionForm.observations,
          is_substitution: sessionForm.isSubstitution
        });
        
        const sessionsData = await apiService.getSessions();
        setSessions(sessionsData);
        
        setSessionForm({
          patientId: '',
          startTime: '',
          endTime: '',
          date: new Date().toISOString().split('T')[0],
          observations: '',
          isSubstitution: false,
        });

        alert('Atendimento registrado com sucesso!');
      } catch (error) {
        console.error('Erro ao criar sessão:', error);
        alert('Erro ao registrar atendimento');
      }
    };

    createSession();
  };

  // Handlers para Supervisões - CORRIGIDO
  const handleSupervisionInputChange = (e) => {
    const { name, value } = e.target;
    setSupervisionForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSupervisionSubmit = async (e) => {
    e.preventDefault();
    
    if (!supervisionForm.startTime || !supervisionForm.endTime || !supervisionForm.date) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    const hours = calculateHours(supervisionForm.startTime, supervisionForm.endTime);
    if (hours <= 0) {
      alert('Horário de fim deve ser posterior ao horário de início');
      return;
    }

    setSupervisionSubmitting(true);
    
    try {
      console.log('📤 Enviando supervisão para o banco:', {
        at_id: user.id,
        start_time: supervisionForm.startTime,
        end_time: supervisionForm.endTime,
        date: supervisionForm.date,
        observations: supervisionForm.observations
      });

      await apiService.createSupervision({
        at_id: user.id, // O próprio AT lança sua supervisão
        start_time: supervisionForm.startTime,
        end_time: supervisionForm.endTime,
        date: supervisionForm.date,
        observations: supervisionForm.observations
      });
      
      // Recarregar supervisões
      const supervisionsData = await apiService.getSupervisions();
      setSupervisions(supervisionsData);
      
      // Limpar formulário
      setSupervisionForm({
        startTime: '',
        endTime: '',
        date: new Date().toISOString().split('T')[0],
        observations: '',
      });
      
      alert('✅ Supervisão lançada com sucesso! Vai automaticamente para o financeiro.');
      
    } catch (error) {
      console.error('❌ Erro ao criar supervisão:', error);
      
      // Mensagem de erro mais detalhada
      let errorMessage = 'Erro ao lançar supervisão';
      if (error.message) {
        errorMessage += ': ' + error.message;
      }
      
      alert(errorMessage);
    } finally {
      setSupervisionSubmitting(false);
    }
  };

  // Estatísticas
  const currentHours = calculateHours(
    activeTab === 'atendimentos' ? sessionForm.startTime : supervisionForm.startTime,
    activeTab === 'atendimentos' ? sessionForm.endTime : supervisionForm.endTime
  );

  const mySessionsThisMonth = sessions.filter(s => 
    s.at_id === user?.id && 
    new Date(s.date).getMonth() === new Date().getMonth()
  );

  const mySupervisions = supervisions.filter(s => s.at_id === user?.id);
  const totalHoursThisMonth = mySessionsThisMonth.reduce((sum, s) => sum + s.hours, 0);
  const selectedPatient = allSectorPatients.find(p => p.id === sessionForm.patientId);

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
      {/* Modal de Substituição */}
      {showSubstitutionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-purple-800">
                Selecionar Paciente para Substituição - Setor {user?.sector?.toUpperCase()}
              </h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowSubstitutionModal(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Buscar paciente por nome..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="overflow-y-auto max-h-[50vh]">
                {filteredSectorPatients.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {filteredSectorPatients.map(patient => {
                      const isMyPatient = myPatients.some(p => p.id === patient.id);
                      return (
                        <div
                          key={patient.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                            isMyPatient 
                              ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' 
                              : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                          }`}
                          onClick={() => handleSubstitutionPatientSelect(patient.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-purple-800">
                                {patient.name}
                                {isMyPatient && (
                                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                    Meu Paciente
                                  </span>
                                )}
                              </h4>
                              <p className="text-sm text-gray-600">
                                Setor: {patient.sector.toUpperCase()}
                              </p>
                            </div>
                            <Button size="sm" variant="primary">
                              Selecionar
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    {searchTerm ? (
                      <div>
                        <p>Nenhum paciente encontrado para "{searchTerm}"</p>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSearchTerm('')}
                          className="mt-2"
                        >
                          Limpar busca
                        </Button>
                      </div>
                    ) : (
                      'Nenhum paciente disponível no setor'
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center space-x-4">
            <div className="p-3 bg-teal-100 rounded-lg">
              <Clock className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Horas do Mês</p>
              <p className="text-2xl font-bold text-purple-700">{totalHoursThisMonth}h</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center space-x-4">
            <div className="p-3 bg-pink-100 rounded-lg">
              <User className="w-6 h-6 text-pink-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pacientes</p>
              <p className="text-2xl font-bold text-purple-700">{myPatients.length}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center space-x-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Atendimentos</p>
              <p className="text-2xl font-bold text-purple-700">{mySessionsThisMonth.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center space-x-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <BookOpen className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Supervisões</p>
              <p className="text-2xl font-bold text-purple-700">{mySupervisions.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Abas */}
      <Card>
        <CardHeader>
          <div className="flex space-x-4">
            <Button
              onClick={() => setActiveTab('atendimentos')}
              variant={activeTab === 'atendimentos' ? 'primary' : 'secondary'}
              className="flex items-center space-x-2"
            >
              <Users className="w-4 h-4" />
              <span>Atendimentos</span>
            </Button>
            <Button
              onClick={() => setActiveTab('supervisoes')}
              variant={activeTab === 'supervisoes' ? 'primary' : 'secondary'}
              className="flex items-center space-x-2"
            >
              <BookOpen className="w-4 h-4" />
              <span>Supervisões</span>
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Formulário de Atendimento */}
      {activeTab === 'atendimentos' && (
        <Card>
          <CardHeader>
            <CardTitle>Registrar Atendimento</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSessionSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-purple-800 mb-2">
                    Paciente
                  </label>
                  {sessionForm.isSubstitution ? (
                    <div className="space-y-2">
                      <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <AlertCircle className="w-5 h-5 text-orange-600" />
                          <span className="text-orange-800 font-medium">Modo Substituição</span>
                        </div>
                        {selectedPatient ? (
                          <div className="mt-2">
                            <p className="text-sm text-orange-700">
                              Paciente selecionado: <strong>{selectedPatient.name}</strong>
                            </p>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => setShowSubstitutionModal(true)}
                              className="mt-2"
                            >
                              Trocar Paciente
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="primary"
                            onClick={() => setShowSubstitutionModal(true)}
                            className="mt-2"
                          >
                            Selecionar Paciente
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <Select
                      name="patientId"
                      value={sessionForm.patientId}
                      onChange={handleSessionInputChange}
                      required
                    >
                      <option value="">Selecione o paciente</option>
                      {myPatients.map(patient => (
                        <option key={patient.id} value={patient.id}>
                          {patient.name}
                        </option>
                      ))}
                    </Select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-purple-800 mb-2">
                    Data
                  </label>
                  <Input
                    type="date"
                    name="date"
                    value={sessionForm.date}
                    onChange={handleSessionInputChange}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-purple-800 mb-2">
                    Hora Início
                  </label>
                  <Input
                    type="time"
                    name="startTime"
                    value={sessionForm.startTime}
                    onChange={handleSessionInputChange}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-purple-800 mb-2">
                    Hora Fim
                  </label>
                  <Input
                    type="time"
                    name="endTime"
                    value={sessionForm.endTime}
                    onChange={handleSessionInputChange}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-purple-800 mb-2">
                  Observações
                </label>
                <textarea
                  name="observations"
                  value={sessionForm.observations}
                  onChange={handleSessionInputChange}
                  rows={3}
                  placeholder="Observações sobre o atendimento..."
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all duration-200 bg-white/90"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isSubstitution"
                  name="isSubstitution"
                  checked={sessionForm.isSubstitution}
                  onChange={handleSessionInputChange}
                  className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
                />
                <label htmlFor="isSubstitution" className="text-sm font-medium text-purple-800">
                  Atendimento de Substituição
                </label>
              </div>

              {currentHours > 0 && activeTab === 'atendimentos' && (
                <div className="bg-teal-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-teal-600" />
                    <span className="font-semibold text-teal-800">
                      Carga Horária: {formatHours(currentHours)}
                    </span>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full">
                Registrar Atendimento
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Formulário de Supervisão - CORRIGIDO */}
      {activeTab === 'supervisoes' && (
        <Card>
          <CardHeader>
            <CardTitle>Lançar Supervisão</CardTitle>
            <div className="bg-green-50 p-3 rounded-lg mt-3">
              <p className="text-sm text-green-800 font-medium">
                🚀 Registre suas horas de supervisão que serão automaticamente enviadas ao financeiro.
              </p>
              <p className="text-xs text-green-700 mt-1">
                Não precisa mais de coordenador - você lança diretamente!
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSupervisionSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-purple-800 mb-2">
                    Data *
                  </label>
                  <Input
                    type="date"
                    name="date"
                    value={supervisionForm.date}
                    onChange={handleSupervisionInputChange}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-purple-800 mb-2">
                    Hora Início *
                  </label>
                  <Input
                    type="time"
                    name="startTime"
                    value={supervisionForm.startTime}
                    onChange={handleSupervisionInputChange}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-purple-800 mb-2">
                    Hora Fim *
                  </label>
                  <Input
                    type="time"
                    name="endTime"
                    value={supervisionForm.endTime}
                    onChange={handleSupervisionInputChange}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-purple-800 mb-2">
                  Observações
                </label>
                <textarea
                  name="observations"
                  value={supervisionForm.observations}
                  onChange={handleSupervisionInputChange}
                  rows={3}
                  placeholder="Observações sobre a supervisão..."
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all duration-200 bg-white/90"
                />
              </div>

              {currentHours > 0 && activeTab === 'supervisoes' && (
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="w-5 h-5 text-orange-600" />
                    <span className="font-semibold text-orange-800">
                      Duração da Supervisão: {formatHours(currentHours)}
                    </span>
                  </div>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full"
                disabled={supervisionSubmitting}
              >
                {supervisionSubmitting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Lançando...</span>
                  </div>
                ) : (
                  'Lançar Supervisão'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Histórico */}
      <Card>
        <CardHeader>
          <CardTitle>
            {activeTab === 'atendimentos' ? 'Histórico de Atendimentos' : 'Histórico de Supervisões'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {activeTab === 'atendimentos' ? (
                  <>
                    <TableHeadCell>Paciente</TableHeadCell>
                    <TableHeadCell>Data</TableHeadCell>
                    <TableHeadCell>Início</TableHeadCell>
                    <TableHeadCell>Fim</TableHeadCell>
                    <TableHeadCell>Horas</TableHeadCell>
                    <TableHeadCell>Status</TableHeadCell>
                    <TableHeadCell>Substituição</TableHeadCell>
                  </>
                ) : (
                  <>
                    <TableHeadCell>Data</TableHeadCell>
                    <TableHeadCell>Início</TableHeadCell>
                    <TableHeadCell>Fim</TableHeadCell>
                    <TableHeadCell>Horas</TableHeadCell>
                    <TableHeadCell>Setor</TableHeadCell>
                    <TableHeadCell>Observações</TableHeadCell>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeTab === 'atendimentos' ? (
                mySessionsThisMonth.map(session => {
                  const patient = patients.find(p => p.id === session.patient_id) || 
                                 allSectorPatients.find(p => p.id === session.patient_id);
                  return (
                    <TableRow key={session.id}>
                      <TableCell>{patient?.name || 'N/A'}</TableCell>
                      <TableCell>{new Date(session.date + 'T00:00:00').toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>{session.start_time}</TableCell>
                      <TableCell>{session.end_time}</TableCell>
                      <TableCell>{formatHours(session.hours)}</TableCell>
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
                        {session.is_substitution && (
                          <span className="text-orange-600 font-medium">
                            <AlertCircle className="inline w-4 h-4 mr-1" />
                            Sim
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                mySupervisions.map(supervision => (
                  <TableRow key={supervision.id}>
                    <TableCell>{new Date(supervision.date + 'T00:00:00').toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>{supervision.start_time}</TableCell>
                    <TableCell>{supervision.end_time}</TableCell>
                    <TableCell>{formatHours(supervision.hours)}</TableCell>
                    <TableCell>{supervision.sector?.toUpperCase()}</TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={supervision.observations}>
                        {supervision.observations || 'Sem observações'}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {((activeTab === 'atendimentos' && mySessionsThisMonth.length === 0) || 
            (activeTab === 'supervisoes' && mySupervisions.length === 0)) && (
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p>Nenhum {activeTab === 'atendimentos' ? 'atendimento' : 'supervisão'} registrado para este mês.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Footer />
    </div>
  );
};
